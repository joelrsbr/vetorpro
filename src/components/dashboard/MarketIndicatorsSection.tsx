import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Lock,
  Crown,
  Lightbulb,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, type SubscriptionPlan } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

/* ─── Types ─── */

interface HistoryPoint {
  key: string;
  value: number;
  recorded_at: string;
}

type Period = "6m" | "12m";

/* ─── Plan hierarchy ─── */

const PLAN_LEVEL: Record<SubscriptionPlan, number> = { basic: 0, pro: 1, business: 2 };

function hasAccess(userPlan: SubscriptionPlan, minPlan: SubscriptionPlan) {
  return PLAN_LEVEL[userPlan] >= PLAN_LEVEL[minPlan];
}

/* ─── Indicator definitions ─── */

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

const chartConfig = {
  rate_selic: { label: "Selic", color: "hsl(210, 80%, 55%)" },
  rate_ipca: { label: "IPCA", color: "hsl(25, 90%, 55%)" },
  currency_usd: { label: "USD/BRL", color: "hsl(150, 60%, 45%)" },
  crypto_btc: { label: "BTC", color: "hsl(45, 90%, 50%)" },
};

/* ─── Locked overlay ─── */

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

/* ─── Insight engine ─── */

interface Insight {
  id: string;
  icon: React.ReactNode;
  text: string;
  type: "opportunity" | "alert" | "info";
}

function computeInsights(history: HistoryPoint[], userPlan: SubscriptionPlan): Insight[] {
  const insights: Insight[] = [];

  // Helper: last N values for a key, ordered chronologically
  const lastN = (key: string, n: number) => {
    const pts = history.filter(h => h.key === key).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    return pts.slice(-n);
  };

  // Rule 1 — Falling Selic
  const selicPts = lastN("rate_selic", 3);
  if (selicPts.length >= 3) {
    const falling = selicPts[2].value < selicPts[1].value && selicPts[1].value < selicPts[0].value;
    if (falling) {
      insights.push({
        id: "selic_falling",
        icon: <ArrowDownRight className="h-4 w-4 text-emerald-600" />,
        text: "Queda de juros detectada — oportunidade para financiamento",
        type: "opportunity",
      });
    }
  }

  // Rule 2 — High real interest
  const lastSelic = lastN("rate_selic", 1)[0];
  const lastIpca = lastN("rate_ipca", 1)[0];
  if (lastSelic && lastIpca) {
    const juroReal = lastSelic.value - lastIpca.value;
    if (juroReal > 5) {
      insights.push({
        id: "juro_real_high",
        icon: <TrendingUp className="h-4 w-4 text-blue-600" />,
        text: "Juro real elevado — ambiente favorável para investimento",
        type: "info",
      });
    }
  }

  // Rule 3 — Falling IPCA
  const ipcaPts = lastN("rate_ipca", 3);
  if (ipcaPts.length >= 3) {
    const falling = ipcaPts[2].value < ipcaPts[1].value && ipcaPts[1].value < ipcaPts[0].value;
    if (falling) {
      insights.push({
        id: "ipca_falling",
        icon: <ArrowDownRight className="h-4 w-4 text-emerald-600" />,
        text: "Inflação em desaceleração — maior previsibilidade de mercado",
        type: "opportunity",
      });
    }
  }

  // Rule 4 — Rising USD (Pro+)
  if (hasAccess(userPlan, "pro")) {
    const usdPts = lastN("currency_usd", 3);
    if (usdPts.length >= 3) {
      const rising = usdPts[2].value > usdPts[1].value && usdPts[1].value > usdPts[0].value;
      if (rising) {
        insights.push({
          id: "usd_rising",
          icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
          text: "Alta do dólar — possível aumento no custo da construção",
          type: "alert",
        });
      }
    }
  }

  return insights;
}

/* ─── Helpers ─── */

function formatValue(key: string, val: number): string {
  if (key.startsWith("currency_")) return `R$ ${val.toFixed(2)}`;
  if (key.startsWith("crypto_")) return `$ ${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `${val.toFixed(2)}%`;
}

function formatAxisValue(key: string, val: number): string {
  if (key.startsWith("currency_")) return `R$${val.toFixed(1)}`;
  if (key.startsWith("crypto_")) return `$${(val / 1000).toFixed(0)}k`;
  return `${val.toFixed(1)}%`;
}

/* ─── Main Component ─── */

export function MarketIndicatorsSection() {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("6m");
  const [enabledIndicators, setEnabledIndicators] = useState<Record<string, boolean>>({
    rate_selic: true,
    rate_ipca: true,
    currency_usd: true,
    crypto_btc: true,
  });
  const { plan, isActive } = useSubscription();
  const navigate = useNavigate();

  const userPlan: SubscriptionPlan = isActive ? plan : "basic";
  const can12m = hasAccess(userPlan, "pro");
  const effectivePeriod = period === "12m" && !can12m ? "6m" : period;

  const accessibleIndicators = useMemo(
    () => INDICATORS.filter(i => hasAccess(userPlan, i.minPlan)),
    [userPlan],
  );
  const lockedIndicators = useMemo(
    () => INDICATORS.filter(i => !hasAccess(userPlan, i.minPlan)),
    [userPlan],
  );

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const months = effectivePeriod === "6m" ? 6 : 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const accessibleKeys = accessibleIndicators.map(i => i.key);
    // Always include selic + ipca for juro real
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
  }, [effectivePeriod, accessibleIndicators]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /* ─── Build unified multi-line chart data ─── */
  const chartData = useMemo(() => {
    // Group by month
    const monthMap: Record<string, Record<string, number>> = {};

    for (const h of history) {
      const monthKey = h.recorded_at.substring(0, 7); // YYYY-MM
      if (!monthMap[monthKey]) monthMap[monthKey] = {};
      // Keep latest value per month per key
      monthMap[monthKey][h.key] = h.value;
    }

    const sortedMonths = Object.keys(monthMap).sort();

    // Forward fill: carry previous value for missing keys
    const allKeys = accessibleIndicators.map(i => i.key);
    const lastKnown: Record<string, number> = {};

    return sortedMonths.map(m => {
      const row: Record<string, string | number | null> = {
        date: new Date(m + "-15").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      };
      for (const k of allKeys) {
        if (monthMap[m][k] !== undefined) {
          lastKnown[k] = monthMap[m][k];
        }
        row[k] = lastKnown[k] ?? null;
      }
      return row;
    });
  }, [history, accessibleIndicators]);

  /* ─── Latest values ─── */
  const latestValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ind of accessibleIndicators) {
      const points = history.filter(h => h.key === ind.key);
      if (points.length > 0) map[ind.key] = points[points.length - 1].value;
    }
    return map;
  }, [history, accessibleIndicators]);

  /* ─── Juro Real ─── */
  const juroReal = useMemo(() => {
    const selicPts = history.filter(h => h.key === "rate_selic");
    const ipcaPts = history.filter(h => h.key === "rate_ipca");
    const lastSelic = selicPts.length > 0 ? selicPts[selicPts.length - 1].value : null;
    const lastIpca = ipcaPts.length > 0 ? ipcaPts[ipcaPts.length - 1].value : null;
    if (lastSelic !== null && lastIpca !== null) {
      return { value: parseFloat((lastSelic - lastIpca).toFixed(2)), selic: lastSelic, ipca: lastIpca };
    }
    return null;
  }, [history]);

  /* ─── Insights ─── */
  const insights = useMemo(() => computeInsights(history, userPlan), [history, userPlan]);

  /* ─── Juro Real Histórico (Business) ─── */
  const juroRealHistoricoLocked = !hasAccess(userPlan, "business");

  /* ─── Toggle handler ─── */
  const toggleIndicator = (key: string) => {
    setEnabledIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Active lines to render
  const activeLines = accessibleIndicators.filter(i => enabledIndicators[i.key]);

  // Check which indicators have any data
  const hasAnyData = chartData.length > 0;

  // Determine if we need dual Y-axis (mixing percent + currency scales)
  const hasPercentLine = activeLines.some(l => l.key.startsWith("rate_"));
  const hasCurrencyLine = activeLines.some(l => l.key.startsWith("currency_") || l.key.startsWith("crypto_"));
  const useDualAxis = hasPercentLine && hasCurrencyLine;

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
        ) : (
          <div className="space-y-6">
            {/* ─── Indicator Toggles ─── */}
            <div className="flex gap-3 flex-wrap items-center">
              {/* Accessible indicators with toggle */}
              {accessibleIndicators.map(ind => {
                const val = latestValues[ind.key];
                return (
                  <button
                    key={ind.key}
                    onClick={() => toggleIndicator(ind.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      enabledIndicators[ind.key]
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border opacity-60 hover:opacity-80"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: enabledIndicators[ind.key] ? ind.color : "hsl(var(--muted-foreground))" }}
                    />
                    <span className="font-medium">{ind.label}</span>
                    {val !== undefined && (
                      <span className="text-muted-foreground text-xs">{formatValue(ind.key, val)}</span>
                    )}
                  </button>
                );
              })}

              {/* Locked indicators */}
              {lockedIndicators.map(ind => (
                <Tooltip key={ind.key}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm opacity-40 cursor-not-allowed">
                      <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="font-medium">{ind.label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Disponível no plano {ind.minPlan === "pro" ? "Pro" : "Business"} ou superior
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* ─── Chart ─── */}
            <div className="relative">
              {hasAnyData && activeLines.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[225px] w-full">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                      hide={!hasPercentLine}
                    />
                    {useDualAxis && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        domain={["auto", "auto"]}
                        tickFormatter={(v) => {
                          const n = Number(v);
                          if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
                          return `R$${n.toFixed(1)}`;
                        }}
                        hide={!hasCurrencyLine}
                      />
                    )}
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => {
                            if (payload && payload[0]) return payload[0].payload.date;
                            return "";
                          }}
                          formatter={(value, name) => {
                            const key = String(name);
                            const ind = INDICATORS.find(i => i.key === key);
                            return [formatValue(key, Number(value)), ind?.label ?? key];
                          }}
                        />
                      }
                    />
                    {activeLines.map(ind => (
                      <Line
                        key={ind.key}
                        yAxisId={ind.key.startsWith("rate_") ? "left" : useDualAxis ? "right" : "left"}
                        type="monotone"
                        dataKey={ind.key}
                        stroke={ind.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        connectNulls
                        name={ind.key}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Info className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    {activeLines.length === 0
                      ? "Selecione ao menos um indicador para exibir o gráfico."
                      : "Dados históricos em construção — exibindo últimos dados disponíveis"}
                  </p>
                </div>
              )}
            </div>

            {/* ─── Insights (rules-based) ─── */}
            {insights.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Lightbulb className="h-4 w-4" />
                  Insights automáticos
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {insights.map(insight => (
                    <div
                      key={insight.id}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${
                        insight.type === "opportunity"
                          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                          : insight.type === "alert"
                            ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
                            : "border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20"
                      }`}
                    >
                      {insight.icon}
                      <span>{insight.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Juro Real Card ─── */}
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

            {/* ─── Juro Real Histórico — Business only ─── */}
            <div className="relative">
              {juroRealHistoricoLocked && <LockedOverlay label="Juro Real Histórico" />}
              <Card className={`border-dashed ${juroRealHistoricoLocked ? "opacity-40" : ""}`}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold text-sm">Juro Real — Linha do Tempo</p>
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      Business
                    </Badge>
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

/* ─── Juro Real Timeline (Business) ─── */

function JuroRealTimeline({ history }: { history: HistoryPoint[] }) {
  const data = useMemo(() => {
    const selicByMonth: Record<string, number> = {};
    const ipcaByMonth: Record<string, number> = {};

    for (const h of history) {
      const monthKey = h.recorded_at.substring(0, 7);
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
            <ChartTooltipContent formatter={(value) => [`${Number(value).toFixed(2)}%`, "Juro Real"]} />
          }
        />
        <Line type="monotone" dataKey="value" stroke="hsl(160, 60%, 45%)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}
