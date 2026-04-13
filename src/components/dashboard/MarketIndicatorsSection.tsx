import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Lock,
  Crown,
  Lightbulb,
  AlertTriangle,
  ArrowDownRight,
  Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useMarketData, type IndicatorMeta } from "@/hooks/useMarketData";
import { useSubscription, type SubscriptionPlan } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

/* ─── Types ─── */

interface HistoryPoint {
  key: string;
  value: number;
  recorded_at: string;
}

type Period = "6m" | "12m";
type ViewMode = "absolute" | "percent";

/* ─── Plan hierarchy ─── */

const PLAN_LEVEL: Record<string, number> = { basic: 0, pro: 1, business: 2 };

function hasAccess(userPlan: SubscriptionPlan, minPlan: string) {
  return (PLAN_LEVEL[userPlan] ?? 0) >= (PLAN_LEVEL[minPlan] ?? 0);
}

/* ─── Color palette for indicators ─── */

const COLORS = [
  "hsl(210, 80%, 55%)",
  "hsl(25, 90%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(45, 90%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 70%, 50%)",
  "hsl(180, 60%, 40%)",
  "hsl(60, 80%, 45%)",
  "hsl(0, 70%, 55%)",
  "hsl(120, 50%, 45%)",
];

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
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

function formatAxisTick(v: number | string, unit: string, key: string): string {
  const n = Number(v);
  if (unit === "currency") {
    if (key === "crypto_btc") return `$${(n / 1000).toFixed(0)}k`;
    return `R$${n.toFixed(1)}`;
  }
  return `${n.toFixed(1)}%`;
}

/* ─── Exported props for focus modal ─── */
export interface MarketIndicatorsSectionProps {
  expanded?: boolean;
}

/* ─── Main Component ─── */

export function MarketIndicatorsSection({ expanded = false }: MarketIndicatorsSectionProps) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("6m");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [compareKey, setCompareKey] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("absolute");
  const { plan, isActive } = useSubscription();
  const { data: marketData } = useMarketData();
  const navigate = useNavigate();

  const userPlan: SubscriptionPlan = isActive ? plan : "basic";
  const can12m = hasAccess(userPlan, "pro");
  const effectivePeriod = period === "12m" && !can12m ? "6m" : period;

  // Dynamic indicators from API
  const allIndicators = useMemo(() => marketData.indicators || [], [marketData.indicators]);

  // Filter: only show indicators with description
  const validIndicators = useMemo(
    () => allIndicators.filter(i => i.description && i.display_name),
    [allIndicators],
  );

  const accessibleIndicators = useMemo(
    () => validIndicators.filter(i => hasAccess(userPlan, i.plan_level)),
    [validIndicators, userPlan],
  );

  const lockedIndicators = useMemo(
    () => validIndicators.filter(i => !hasAccess(userPlan, i.plan_level)),
    [validIndicators, userPlan],
  );

  // Auto-select first accessible indicator
  useEffect(() => {
    if (accessibleIndicators.length > 0 && !accessibleIndicators.find(i => i.key === selectedKey)) {
      setSelectedKey(accessibleIndicators[0].key);
    }
  }, [accessibleIndicators, selectedKey]);

  // Reset compare if invalid
  useEffect(() => {
    if (compareKey && (compareKey === selectedKey || !accessibleIndicators.find(i => i.key === compareKey))) {
      setCompareKey("");
    }
  }, [compareKey, selectedKey, accessibleIndicators]);

  const selectedIndicator = validIndicators.find(i => i.key === selectedKey);
  const compareIndicator = compareKey ? validIndicators.find(i => i.key === compareKey) : null;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const months = effectivePeriod === "6m" ? 6 : 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const keysToFetch = accessibleIndicators.map(i => i.key);
    // Always include selic + ipca for insights
    if (!keysToFetch.includes("rate_selic")) keysToFetch.push("rate_selic");
    if (!keysToFetch.includes("rate_ipca")) keysToFetch.push("rate_ipca");

    const { data, error } = await supabase
      .from("market_history")
      .select("key, value, recorded_at")
      .in("key", keysToFetch)
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

  /* ─── Build chart data ─── */
  const chartData = useMemo(() => {
    const keysToPlot = [selectedKey];
    if (compareKey) keysToPlot.push(compareKey);

    const monthMap: Record<string, Record<string, number>> = {};
    for (const h of history) {
      if (!keysToPlot.includes(h.key)) continue;
      const monthKey = h.recorded_at.substring(0, 7);
      if (!monthMap[monthKey]) monthMap[monthKey] = {};
      monthMap[monthKey][h.key] = h.value;
    }

    const sortedMonths = Object.keys(monthMap).sort();
    const lastKnown: Record<string, number> = {};

    return sortedMonths.map(m => {
      const row: Record<string, string | number | null> = {
        date: new Date(m + "-15").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      };
      for (const k of keysToPlot) {
        if (monthMap[m]?.[k] !== undefined) {
          lastKnown[k] = monthMap[m][k];
        }
        row[k] = lastKnown[k] ?? null;
      }
      return row;
    });
  }, [history, selectedKey, compareKey]);

  /* ─── Latest values ─── */
  const latestValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ind of validIndicators) {
      const points = history.filter(h => h.key === ind.key);
      if (points.length > 0) map[ind.key] = points[points.length - 1].value;
    }
    return map;
  }, [history, validIndicators]);

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

  const hasAnyData = chartData.length > 0;
  const chartHeight = expanded ? 340 : 225;

  // Unit detection from indicator metadata
  const selectedUnit = selectedIndicator?.unit || (selectedKey.startsWith("rate_") ? "percent" : "currency");
  const compareUnit = compareIndicator?.unit || (compareKey?.startsWith("rate_") ? "percent" : "currency");
  const isMixedUnits = !!(compareKey && compareIndicator && selectedUnit !== compareUnit);

  // Assign colors based on position in validIndicators
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    validIndicators.forEach((ind, i) => { map[ind.key] = getColor(i); });
    return map;
  }, [validIndicators]);

  const chartConfig: Record<string, { label: string; color: string }> = {};
  if (selectedIndicator) {
    chartConfig[selectedKey] = { label: selectedIndicator.display_name, color: colorMap[selectedKey] || COLORS[0] };
  }
  if (compareIndicator && compareKey) {
    chartConfig[compareKey] = { label: compareIndicator.display_name, color: colorMap[compareKey] || COLORS[1] };
  }

  // Debug log for comparison validation
  console.log("[MarketIndicators]", { selectedKey, compareKey, chartDataLength: chartData.length, series: Object.keys(chartConfig) });

  // Comparison options: accessible indicators excluding selected
  const compareOptions = accessibleIndicators.filter(i => i.key !== selectedKey);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Indicadores de Mercado
            </CardTitle>
            {selectedIndicator && (
              <CardDescription className="text-sm">
                {selectedIndicator.description}
                {latestValues[selectedKey] !== undefined && (
                  <span className="ml-2 font-semibold text-foreground">
                    {formatValue(selectedKey, latestValues[selectedKey])}
                  </span>
                )}
              </CardDescription>
            )}
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
        {loading && validIndicators.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* ─── Dynamic Indicator Selector ─── */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Accessible indicators */}
              {accessibleIndicators.map(ind => (
                <Tooltip key={ind.key}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setSelectedKey(ind.key);
                        if (ind.key === compareKey) setCompareKey("");
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        selectedKey === ind.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: colorMap[ind.key] }}
                      />
                      {ind.display_name}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    {ind.description}
                  </TooltipContent>
                </Tooltip>
              ))}

              {/* Locked indicators */}
              {lockedIndicators.map(ind => (
                <Tooltip key={ind.key}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm opacity-40 cursor-not-allowed bg-muted/30">
                      <Lock className="w-3 h-3 text-muted-foreground" />
                      <span>{ind.display_name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[250px]">
                    <p>{ind.description}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Disponível no plano {ind.plan_level === "pro" ? "Pro" : "Business"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}

              {/* Separator + Compare selector */}
              {compareOptions.length > 0 && (
                <>
                  <div className="h-5 w-px bg-border mx-1" />
                  <Select value={compareKey || "none"} onValueChange={(v) => setCompareKey(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue placeholder="Comparar com..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem comparação</SelectItem>
                      {compareOptions.map(ind => (
                        <SelectItem key={ind.key} value={ind.key}>
                          {ind.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* ─── Chart ─── */}
            <div className="relative">
              {hasAnyData ? (
                <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
                  <LineChart data={chartData} margin={{ top: 5, right: isMixedUnits ? 50 : 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      interval="preserveStartEnd"
                    />
                    {/* Left Y-axis — primary indicator */}
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => formatAxisTick(v, selectedUnit, selectedKey)}
                    />
                    {/* Right Y-axis — comparison (only when mixed units) */}
                    {isMixedUnits && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        domain={["auto", "auto"]}
                        tickFormatter={(v) => formatAxisTick(v, compareUnit, compareKey)}
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
                            const ind = validIndicators.find(i => i.key === key);
                            return [formatValue(key, Number(value)), ind?.display_name ?? key];
                          }}
                        />
                      }
                    />
                    {/* Primary line */}
                    {selectedIndicator && (
                      <Line
                        type="monotone"
                        dataKey={selectedKey}
                        yAxisId="left"
                        stroke={colorMap[selectedKey] || COLORS[0]}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        connectNulls
                        name={selectedKey}
                      />
                    )}
                    {/* Comparison line */}
                    {compareIndicator && compareKey && (
                      <Line
                        type="monotone"
                        dataKey={compareKey}
                        yAxisId={isMixedUnits ? "right" : "left"}
                        stroke={colorMap[compareKey] || COLORS[1]}
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 0 }}
                        connectNulls
                        name={compareKey}
                      />
                    )}
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Info className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    Dados históricos em construção — exibindo últimos dados disponíveis
                  </p>
                </div>
              )}
            </div>

            {/* ─── Insights ─── */}
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="font-semibold text-lg cursor-help">
                            Juro Real:{" "}
                            <span className={juroReal.value >= 0 ? "text-emerald-600" : "text-red-500"}>
                              {juroReal.value > 0 ? "+" : ""}
                              {juroReal.value.toFixed(2)}% a.a.
                            </span>
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px]">
                          Diferença entre a taxa Selic e o IPCA. Indica o retorno real acima da inflação.
                        </TooltipContent>
                      </Tooltip>
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
              {juroRealHistoricoLocked && <LockedOverlay />}
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

/* ─── Locked Overlay ─── */

function LockedOverlay() {
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
