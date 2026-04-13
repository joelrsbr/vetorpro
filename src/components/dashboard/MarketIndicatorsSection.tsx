import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HistoryPoint {
  key: string;
  value: number;
  recorded_at: string;
}

type Period = "6m" | "12m";

const INDICATORS = [
  { key: "rate_selic", label: "Selic", color: "hsl(210, 80%, 55%)", unit: "% a.a." },
  { key: "rate_ipca", label: "IPCA", color: "hsl(25, 90%, 55%)", unit: "% a.a." },
  { key: "currency_usd", label: "USD/BRL", color: "hsl(150, 60%, 45%)", unit: "R$" },
];

const chartConfig = {
  value: { label: "Valor" },
};

export function MarketIndicatorsSection() {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("6m");
  const [activeIndicator, setActiveIndicator] = useState("rate_selic");

  useEffect(() => {
    fetchHistory();
  }, [period]);

  const fetchHistory = async () => {
    setLoading(true);
    const months = period === "6m" ? 6 : 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const { data, error } = await supabase
      .from("market_history")
      .select("key, value, recorded_at")
      .in("key", INDICATORS.map(i => i.key))
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: true });

    if (!error && data) {
      setHistory(data.map(d => ({ ...d, value: Number(d.value) })));
    }
    setLoading(false);
  };

  const indicator = INDICATORS.find(i => i.key === activeIndicator)!;

  const chartData = useMemo(() => {
    return history
      .filter(h => h.key === activeIndicator)
      .map(h => ({
        date: new Date(h.recorded_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        value: h.value,
      }));
  }, [history, activeIndicator]);

  // Compute "Juro Real" = last Selic - last IPCA
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

  // Latest values per indicator
  const latestValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ind of INDICATORS) {
      const points = history.filter(h => h.key === ind.key);
      if (points.length > 0) map[ind.key] = points[points.length - 1].value;
    }
    return map;
  }, [history]);

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
              variant={period === "6m" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("6m")}
              className="text-xs h-7"
            >
              6 meses
            </Button>
            <Button
              variant={period === "12m" ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod("12m")}
              className="text-xs h-7"
            >
              12 meses
            </Button>
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
                return (
                  <button
                    key={ind.key}
                    onClick={() => setActiveIndicator(ind.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ind.color }}
                    />
                    <span className="font-medium">{ind.label}</span>
                    {val !== undefined && (
                      <span className="text-muted-foreground text-xs">
                        {ind.key.startsWith("currency_")
                          ? `R$ ${val.toFixed(2)}`
                          : `${val.toFixed(2)}%`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Chart */}
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
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Sem dados para {indicator.label} neste período.
              </div>
            )}

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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
