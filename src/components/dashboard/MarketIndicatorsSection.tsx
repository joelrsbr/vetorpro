import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Loader2, Lock, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, SubscriptionPlan } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

interface HistoryPoint {
  key: string;
  value: number;
  recorded_at: string;
}

type Period = "6m" | "12m";

const PLAN_LEVEL: Record<SubscriptionPlan, number> = { basic: 0, pro: 1, business: 2 };

interface IndicatorDef {
  key: string;
  label: string;
  color: string;
  unit: string;
  minPlan: SubscriptionPlan;
}

const INDICATORS: IndicatorDef[] = [
  { key: "rate_selic", label: "Selic", color: "hsl(210, 80%, 55%)", unit: "% a.a.", minPlan: "basic" },
  { key: "rate_ipca", label: "IPCA", color: "hsl(25, 90%, 55%)", unit: "% a.a.", minPlan: "basic" },
  { key: "currency_usd", label: "USD/BRL", color: "hsl(150, 60%, 45%)", unit: "R$", minPlan: "pro" },
  { key: "crypto_btc", label: "BTC", color: "hsl(45, 90%, 50%)", unit: "USD", minPlan: "business" },
];

const chartConfig = { value: { label: "Valor" } };

function hasAccess(userPlan: SubscriptionPlan, minPlan: SubscriptionPlan) {
  return PLAN_LEVEL[userPlan] >= PLAN_LEVEL[minPlan];
}

function LockedOverlay({ label }: { label: string }) {
  const navigate = useNavigate();
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 backdrop-blur-[2px] rounded-lg">
      <Lock className="h-8 w-8 text-muted-foreground/60 mb-2" />
      <p className="text-sm text-muted-foreground font-medium">Disponível no plano superior</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 text-xs gap-1.5"
        onClick={() => navigate("/precos")}
      >
        <Crown className="h-3.5 w-3.5" />
        Fazer upgrade
      </Button>
    </div>
  );
}

export function MarketIndicatorsSection() {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("6m");
  const [activeIndicator, setActiveIndicator] = useState("rate_selic");
  const { plan, isActive } = useSubscription();
  const navigate = useNavigate();

  const userPlan: SubscriptionPlan = isActive ? plan : "basic";

  // 12m locked for basic
  const can12m = hasAccess(userPlan, "pro");
  // If user tries 12m without access, fall back
  const effectivePeriod = period === "12m" && !can12m ? "6m" : period;

  useEffect(() => {
    fetchHistory();
  }, [effectivePeriod]);

  const fetchHistory = async () => {
    setLoading(true);
    const months = effectivePeriod === "6m" ? 6 : 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    // Only fetch keys accessible to user
    const accessibleKeys = INDICATORS
      .filter(i => hasAccess(userPlan, i.minPlan))
      .map(i => i.key);

    // Always include selic and ipca for juro real
    if (!accessibleKeys.includes("rate_selic")) accessibleKeys.push("rate_selic");
    if (!accessibleKeys.includes("rate_ipca")) accessibleKeys.push("rate_ipca");

    const { data, error } = await supabase
      .from("market_history")
      .select("key, value, recorded_at")
      .in("key", accessibleKeys)
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: true });

    if (!error && data) {
      setHistory(data.map(d => ({ ...d, value: Number(d.value) })));
    }
    setLoading(false);
  };

  const indicator = INDICATORS.find(i => i.key === activeIndicator)!;
  const activeIndicatorLocked = !hasAccess(userPlan, indicator.minPlan);

  const chartData = useMemo(() => {
    if (activeIndicatorLocked) return [];
    return history
      .filter(h => h.key === activeIndicator)
      .map(h => ({
        date: new Date(h.recorded_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        value: h.value,
      }));
  }, [history, activeIndicator, activeIndicatorLocked]);

  const juroReal = useMemo(() => {
    const selicPoints = history.filter(h => h.key === "rate_selic");
    const ipcaPoints = history.filter(h => h.key === "rate_ipca");
    const lastSelic = selicPoints.length > 0 ? selicPoints[selicPoints.length - 1].value : null;
    const lastIpca = ipcaPoints.length > 0 ? ipcaPoints[ipcaPoints.length - 1].value : null;
    if (lastSelic !== null && lastIpca !== null) {
      return { value: parseFloat((lastSelic - lastIpca).toFixed(2)), selic: lastSelic, ipca: lastIpca };
    }
    return null;
  }, [history]);

  const latestValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ind of INDICATORS) {
      if (!hasAccess(userPlan, ind.minPlan)) continue;
      const points = history.filter(h => h.key === ind.key);
      if (points.length > 0) map[ind.key] = points[points.length - 1].value;
    }
    return map;
  }, [history, userPlan]);

  // Juro Real histórico locked for basic/pro
  const juroRealHistoricoLocked = !hasAccess(userPlan, "business");

  return (
    <Card className="shadow-card mb-8">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Indicadores de Mercado
            </CardTitle>
            <CardDescription>Evolução dos principais índices financeiros</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={effectivePeriod === "6m" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("6m")}
              className="text-xs h-7"
            >
              6 meses
            </Button>
            {can12m ? (
              <Button
                variant={effectivePeriod === "12m" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("12m")}
                className="text-xs h-7"
              >
                12 meses
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 opacity-50 cursor-not-allowed gap-1"
                    disabled
                  >
                    <Lock className="h-3 w-3" />
                    12 meses
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Disponível no plano Pro ou superior</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Dados históricos sendo coletados.</p>
            <p className="text-xs mt-1">Os gráficos aparecerão conforme os dados forem registrados.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Indicator Tabs */}
            <div className="flex gap-2 flex-wrap">
              {INDICATORS.map(ind => {
                const val = latestValues[ind.key];
                const isActive = ind.key === activeIndicator;
                const locked = !hasAccess(userPlan, ind.minPlan);

                return (
                  <Tooltip key={ind.key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !locked && setActiveIndicator(ind.key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          locked
                            ? "opacity-50 cursor-not-allowed border-border"
                            : isActive
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/40"
                        }`}
                        disabled={locked}
                      >
                        {locked ? (
                          <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                        ) : (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: ind.color }}
                          />
                        )}
                        <span className="font-medium">{ind.label}</span>
                        {!locked && val !== undefined && (
                          <span className="text-muted-foreground text-xs">
                            {ind.key.startsWith("currency_")
                              ? `R$ ${val.toFixed(2)}`
                              : ind.key.startsWith("crypto_")
                                ? `$ ${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                                : `${val.toFixed(2)}%`}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    {locked && (
                      <TooltipContent>
                        Disponível no plano {ind.minPlan === "pro" ? "Pro" : "Business"} ou superior
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>

            {/* Chart */}
            <div className="relative">
              {activeIndicatorLocked && <LockedOverlay label={indicator.label} />}
              {chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      domain={["auto", "auto"]}
                      tickFormatter={(v) =>
                        indicator.key.startsWith("currency_")
                          ? `R$${v.toFixed(1)}`
                          : indicator.key.startsWith("crypto_")
                            ? `$${(v / 1000).toFixed(0)}k`
                            : `${v.toFixed(1)}%`
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => {
                            if (payload && payload[0]) return payload[0].payload.date;
                            return "";
                          }}
                          formatter={(value) => [
                            indicator.key.startsWith("currency_")
                              ? `R$ ${Number(value).toFixed(4)}`
                              : indicator.key.startsWith("crypto_")
                                ? `$ ${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                                : `${Number(value).toFixed(2)}%`,
                            indicator.label,
                          ]}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={indicator.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : !activeIndicatorLocked ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Sem dados para {indicator.label} neste período.
                </div>
              ) : (
                <div className="h-[280px]" /> // placeholder height for locked overlay
              )}
            </div>

            {/* Juro Real Card */}
            {juroReal && (
              <Card className="border-dashed">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {juroReal.value >= 0 ? (
                      <TrendingUp className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-red-500" />
                    )}
                    <div>
                      <p className="font-semibold text-lg">
                        Juro Real:{" "}
                        <span className={juroReal.value >= 0 ? "text-emerald-600" : "text-red-500"}>
                          {juroReal.value > 0 ? "+" : ""}
                          {juroReal.value.toFixed(2)}% a.a.
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Retorno real acima da inflação · Selic ({juroReal.selic}%) − IPCA ({juroReal.ipca}%)
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Indicador Derivado
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Juro Real Histórico — Business only */}
            <div className="relative">
              {juroRealHistoricoLocked && <LockedOverlay label="Juro Real Histórico" />}
              <Card className={`border-dashed ${juroRealHistoricoLocked ? "opacity-40" : ""}`}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold text-sm">Juro Real — Linha do Tempo</p>
                    <Badge variant="outline" className="text-[10px] ml-auto">Business</Badge>
                  </div>
                  {!juroRealHistoricoLocked ? (
                    <JuroRealTimeline history={history} />
                  ) : (
                    <div className="h-[120px]" />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Mini timeline chart for Juro Real histórico */
function JuroRealTimeline({ history }: { history: HistoryPoint[] }) {
  const data = useMemo(() => {
    const selicByMonth: Record<string, number> = {};
    const ipcaByMonth: Record<string, number> = {};

    for (const h of history) {
      const monthKey = h.recorded_at.substring(0, 7); // YYYY-MM
      if (h.key === "rate_selic") selicByMonth[monthKey] = h.value;
      if (h.key === "rate_ipca") ipcaByMonth[monthKey] = h.value;
    }

    const months = [...new Set([...Object.keys(selicByMonth), ...Object.keys(ipcaByMonth)])].sort();
    return months
      .filter(m => selicByMonth[m] !== undefined && ipcaByMonth[m] !== undefined)
      .map(m => ({
        date: new Date(m + "-15").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        value: parseFloat((selicByMonth[m] - ipcaByMonth[m]).toFixed(2)),
      }));
  }, [history]);

  if (data.length === 0) return <p className="text-xs text-muted-foreground">Dados insuficientes.</p>;

  return (
    <ChartContainer config={{ value: { label: "Juro Real" } }} className="h-[120px] w-full">
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={v => `${v}%`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`${Number(value).toFixed(2)}%`, "Juro Real"]}
            />
          }
        />
        <Line type="monotone" dataKey="value" stroke="hsl(160, 60%, 45%)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}
