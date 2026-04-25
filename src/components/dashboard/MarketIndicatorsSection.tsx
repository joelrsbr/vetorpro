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
  HelpCircle,
  ExternalLink,
  Compass,
  BarChart2,
  Hammer,
  Coins,
  X,
} from "lucide-react";

interface GuidedComparison {
  id: string;
  title: string;
  emoji: string;
  icon: typeof BarChart2;
  primary: string;
  compare: string;
  narrative: string;
}

const GUIDED_COMPARISONS: GuidedComparison[] = [
  {
    id: "inflacao_poupanca",
    title: "Inflação vs Poupança",
    emoji: "📊",
    icon: BarChart2,
    primary: "rate_ipca",
    compare: "rate_poupanca",
    narrative: "Compare se a poupança está protegendo o poder de compra do seu cliente contra a inflação.",
  },
  {
    id: "incc_ipca",
    title: "Custo da Construção vs Inflação",
    emoji: "🏗️",
    icon: Hammer,
    primary: "incc",
    compare: "rate_ipca",
    narrative: "Mostre se o custo de construir está subindo mais que a inflação geral — argumento para imóvel na planta.",
  },
  {
    id: "juro_real",
    title: "Juro Real",
    emoji: "💰",
    icon: Coins,
    primary: "rate_selic",
    compare: "rate_ipca",
    narrative: "O juro real mostra o rendimento verdadeiro do dinheiro parado — compare com a valorização histórica do imóvel.",
  },
];
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useMarketData, type IndicatorMeta } from "@/hooks/useMarketData";
import { useSubscription, type SubscriptionPlan } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { getCategoryColor, getCategoryForKey, CATEGORIES, OFFICIAL_SOURCES } from "@/lib/market-sources";
import { ArgumentsMapModal } from "@/components/dashboard/ArgumentsMapModal";
import { useUserUF, AVAILABLE_UFS, type UF } from "@/hooks/useUserUF";

/* ─── Types ─── */

export type Periodicidade = "mensal" | "anual_12m" | "diario";

interface HistoryPoint {
  key: string;
  value: number;
  recorded_at: string;
  data_referencia?: string | null;
  insight?: string | null;
  periodicidade?: Periodicidade | null;
}

/** Discrete label shown under the value in the chart tooltip. */
export function periodicidadeLabel(p?: Periodicidade | null): string {
  if (p === "anual_12m") return "Acumulado 12 meses";
  if (p === "mensal") return "Variação Mensal";
  if (p === "diario") return "Cotação Diária";
  return "";
}

const IBOVESPA_INSIGHT = "A Bolsa como termômetro imobiliário: quando o Ibovespa sobe, investidores buscam diversificação em ativos reais — imóveis tendem a se valorizar. Quando cai, o imóvel se destaca como proteção de patrimônio.";

const INDICATOR_GROUPS = [
  { id: "market", label: "Mercado", keys: ["index_ibovespa"] },
  { id: "currencies", label: "Moedas", keys: ["currency_usd", "currency_eur", "crypto_btc"] },
  { id: "inflation", label: "Inflação e Construção", keys: ["rate_ipca", "rate_igpm", "incc", "cub_dynamic"] },
  { id: "fixed_income", label: "Renda Fixa", keys: ["rate_selic", "rate_cdi", "rate_tr", "rate_poupanca"] },
] as const;

const LEGEND_ITEMS = [
  { id: "inflation", label: "Inflação e Construção", color: "hsl(25, 90%, 55%)" },
  { id: "fixed_income", label: "Renda Fixa", color: "hsl(150, 60%, 42%)" },
  { id: "variable", label: "Moedas e Variáveis", color: "hsl(210, 80%, 55%)" },
  { id: "market", label: "Mercado", color: "hsl(210, 80%, 55%)" },
] as const;

/** For INCC/CUB, the chart should use data_referencia (reference month),
 * not recorded_at (insertion timestamp). */
function effectiveDate(h: HistoryPoint): string {
  if ((h.key === "incc" || h.key.startsWith("cub_")) && h.data_referencia) {
    return h.data_referencia;
  }
  return h.recorded_at;
}

type Period = "6m" | "12m";
type ViewMode = "absolute" | "percent";

/* ─── Plan hierarchy ─── */

const PLAN_LEVEL: Record<string, number> = { basic: 0, pro: 1, business: 2 };

function hasAccess(userPlan: SubscriptionPlan, minPlan: string) {
  return (PLAN_LEVEL[userPlan] ?? 0) >= (PLAN_LEVEL[minPlan] ?? 0);
}

/* ─── Color palette for indicators (category-based) ─── */

function getColor(key: string): string {
  return getCategoryColor(key);
}

/* ─── Insight engine ─── */

interface Insight {
  id: string;
  icon: React.ReactNode;
  text: string;
  type: "opportunity" | "alert" | "info";
  actionText?: string;
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
        actionText: "Use com seu cliente: 'Com a Selic em queda, o custo do financiamento tende a cair. Esse é o momento de travar a taxa antes que o mercado ajuste os preços dos imóveis.'",
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
        actionText: "Use com seu cliente: 'O juro real está elevado, o que significa que o dinheiro parado rende bem — mas imóveis historicamente superam a renda fixa no longo prazo nesse cenário.'",
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
        actionText: "Use com seu cliente: 'Com a inflação desacelerando, o poder de compra se estabiliza. É um sinal positivo para quem está planejando uma compra de médio prazo.'",
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
          actionText: "Use com seu cliente: 'A alta do dólar pressiona o custo da construção civil. Imóveis na planta tendem a sofrer reajuste — quem compra agora se protege desse aumento.'",
        });
      }
    }
  }

  return insights;
}

/* ─── Helpers ─── */

function formatValue(key: string, val: number): string {
  if (key === "index_ibovespa") return `${val.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} pts`;
  if (key.startsWith("currency_")) return `R$ ${val.toFixed(2)}`;
  if (key.startsWith("crypto_")) return `$ ${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (key.startsWith("cub_")) return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/m²`;
  return `${val.toFixed(2)}%`;
}

function formatAxisTick(v: number | string, unit: string, key: string): string {
  const n = Number(v);
  if (key === "index_ibovespa") return `${(n / 1000).toFixed(0)}k`;
  if (key.startsWith("cub_")) return `R$${n.toFixed(0)}`;
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
  const [activeGuidedId, setActiveGuidedId] = useState<string>("");

  const applyGuidedComparison = useCallback((g: GuidedComparison) => {
    setSelectedKey(g.primary);
    setCompareKey(g.compare === g.primary ? "" : g.compare);
    setActiveGuidedId(g.id);
  }, []);

  const activeGuided = GUIDED_COMPARISONS.find((g) => g.id === activeGuidedId) || null;
  const [viewMode, setViewMode] = useState<ViewMode>("absolute");
  const [argumentsMapOpen, setArgumentsMapOpen] = useState(false);
  const { plan, isActive } = useSubscription();
  const { data: marketData } = useMarketData();
  const { uf, setUf } = useUserUF();
  const navigate = useNavigate();

  const userPlan: SubscriptionPlan = isActive ? plan : "basic";
  const can12m = hasAccess(userPlan, "pro");
  const effectivePeriod = period === "12m" && !can12m ? "6m" : period;

  // Dynamic indicators from API
  const allIndicators = useMemo(() => marketData.indicators || [], [marketData.indicators]);

  // Virtual indicators driven by market_history (INCC from BCB + CUB regional)
  const virtualIndicators = useMemo<IndicatorMeta[]>(() => [
    {
      key: "incc",
      display_name: "INCC",
      description: "Índice Nacional de Custo da Construção (BCB Série 192). Variação mensal — referência para correção de contratos na planta.",
      category: "inflation",
      plan_level: "basic",
      unit: "percent",
      status: "ok",
      updated_at: new Date().toISOString(),
      accessible: true,
      value: null,
    },
    {
      key: `cub_${uf.toLowerCase()}`,
      display_name: `CUB-${uf}`,
      description: `Custo Unitário Básico da Construção — ${uf} (SINDUSCON). Referência oficial em R$/m² para reajuste de contratos imobiliários.`,
      category: "inflation",
      plan_level: "pro",
      unit: "currency",
      status: "ok",
      updated_at: new Date().toISOString(),
      accessible: hasAccess(userPlan, "pro"),
      value: null,
    },
  ], [uf, userPlan]);

  // Filter: only show indicators with description (merge real + virtual)
  // Exclude rate_incc from market_cache — INCC is provided by the virtual indicator (BCB Série 192) to avoid duplication.
  const validIndicators = useMemo(() => {
    const indicatorOrder = [
      "index_ibovespa",
      "currency_usd",
      "currency_eur",
      "crypto_btc",
      "rate_ipca",
      "rate_igpm",
      "incc",
      `cub_${uf.toLowerCase()}`,
      "rate_selic",
      "rate_cdi",
      "rate_tr",
      "rate_poupanca",
    ];

    const rank = new Map(indicatorOrder.map((key, index) => [key, index]));

    return [
      ...allIndicators.filter(i => i.description && i.display_name && i.key !== "rate_incc"),
      ...virtualIndicators,
    ].sort((a, b) => (rank.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.key) ?? Number.MAX_SAFE_INTEGER));
  }, [allIndicators, virtualIndicators, uf]);

  const accessibleIndicators = useMemo(
    () => validIndicators.filter(i => hasAccess(userPlan, i.plan_level)),
    [validIndicators, userPlan],
  );

  const lockedIndicators = useMemo(
    () => validIndicators.filter(i => !hasAccess(userPlan, i.plan_level)),
    [validIndicators, userPlan],
  );

  // Auto-select first accessible indicator (only in inline mode — modal opens with no selection)
  useEffect(() => {
    if (expanded) return;
    if (accessibleIndicators.length > 0 && !accessibleIndicators.find(i => i.key === selectedKey)) {
      setSelectedKey(accessibleIndicators[0].key);
    }
  }, [accessibleIndicators, selectedKey, expanded]);

  // Reset compare if invalid
  useEffect(() => {
    if (compareKey && (compareKey === selectedKey || !accessibleIndicators.find(i => i.key === compareKey))) {
      setCompareKey("");
    }
  }, [compareKey, selectedKey, accessibleIndicators]);

  const selectedIndicator = validIndicators.find(i => i.key === selectedKey);
  const compareIndicator = compareKey ? validIndicators.find(i => i.key === compareKey) : null;
  const isIbovespaSelected = selectedKey === "index_ibovespa";

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const months = effectivePeriod === "6m" ? 6 : 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const keysToFetch = accessibleIndicators.map(i => i.key);
    // Always include selic + ipca for insights
    if (!keysToFetch.includes("rate_selic")) keysToFetch.push("rate_selic");
    if (!keysToFetch.includes("rate_ipca")) keysToFetch.push("rate_ipca");
    // Always include INCC + current CUB-uf
    if (!keysToFetch.includes("incc")) keysToFetch.push("incc");
    const cubKey = `cub_${uf.toLowerCase()}`;
    if (!keysToFetch.includes(cubKey)) keysToFetch.push(cubKey);

    const sinceISO = since.toISOString();
    const sinceDate = sinceISO.substring(0, 10);

    // Two queries: standard keys filter by recorded_at; INCC/CUB filter by data_referencia
    const expertKeys = keysToFetch.filter(k => k === "incc" || k.startsWith("cub_"));
    const standardKeys = keysToFetch.filter(k => k !== "incc" && !k.startsWith("cub_"));

    const queries: Promise<{ data: unknown[] | null; error: unknown }>[] = [];
    if (standardKeys.length > 0) {
      queries.push(
        supabase
          .from("market_history")
          .select("key, value, recorded_at, data_referencia, insight, periodicidade")
          .in("key", standardKeys)
          .gte("recorded_at", sinceISO)
          .order("recorded_at", { ascending: true }) as unknown as Promise<{ data: unknown[] | null; error: unknown }>,
      );
    }
    if (expertKeys.length > 0) {
      queries.push(
        supabase
          .from("market_history")
          .select("key, value, recorded_at, data_referencia, insight, periodicidade")
          .in("key", expertKeys)
          .gte("data_referencia", sinceDate)
          .order("data_referencia", { ascending: true }) as unknown as Promise<{ data: unknown[] | null; error: unknown }>,
      );
    }

    const results = await Promise.all(queries);
    const merged: HistoryPoint[] = [];
    for (const r of results) {
      if (!r.error && r.data) {
        for (const d of r.data as Array<{ key: string; value: number; recorded_at: string; data_referencia: string | null; insight: string | null; periodicidade: Periodicidade | null }>) {
          merged.push({
            key: d.key,
            value: Number(d.value),
            recorded_at: d.recorded_at,
            data_referencia: d.data_referencia ?? null,
            insight: d.insight ?? null,
            periodicidade: d.periodicidade ?? null,
          });
        }
      }
    }
    setHistory(merged);
    setLoading(false);
  }, [effectivePeriod, accessibleIndicators, uf]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /* ─── Build chart data ─── */
  const chartDataAbsolute = useMemo(() => {
    const keysToPlot = [selectedKey];
    if (compareKey) keysToPlot.push(compareKey);

    const monthMap: Record<string, Record<string, number>> = {};
    const periodicidadeMap: Record<string, Record<string, Periodicidade | null>> = {};
    for (const h of history) {
      if (!keysToPlot.includes(h.key)) continue;
      const monthKey = effectiveDate(h).substring(0, 7);
      if (!monthMap[monthKey]) monthMap[monthKey] = {};
      if (!periodicidadeMap[monthKey]) periodicidadeMap[monthKey] = {};
      monthMap[monthKey][h.key] = h.value;
      periodicidadeMap[monthKey][h.key] = h.periodicidade ?? null;
    }

    const sortedMonths = Object.keys(monthMap).sort();
    const lastKnown: Record<string, number> = {};
    const lastKnownPeriod: Record<string, Periodicidade | null> = {};

    return sortedMonths.map(m => {
      const row: Record<string, string | number | null> = {
        date: new Date(m + "-15").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      };
      for (const k of keysToPlot) {
        if (monthMap[m]?.[k] !== undefined) {
          lastKnown[k] = monthMap[m][k];
          lastKnownPeriod[k] = periodicidadeMap[m]?.[k] ?? null;
        }
        row[k] = lastKnown[k] ?? null;
        row[`__period_${k}`] = lastKnownPeriod[k] ?? null;
      }
      return row;
    });
  }, [history, selectedKey, compareKey]);

  /* ─── Normalized (percent variation) chart data ─── */
  const chartDataPercent = useMemo(() => {
    if (chartDataAbsolute.length === 0) return [];
    const keysToPlot = [selectedKey];
    if (compareKey) keysToPlot.push(compareKey);

    // Find initial values (first non-null for each key)
    const initials: Record<string, number> = {};
    for (const row of chartDataAbsolute) {
      for (const k of keysToPlot) {
        if (initials[k] === undefined && row[k] != null && Number(row[k]) !== 0) {
          initials[k] = Number(row[k]);
        }
      }
    }

    return chartDataAbsolute.map(row => {
      const newRow: Record<string, string | number | null> = { date: row.date };
      for (const k of keysToPlot) {
        const v = row[k];
        if (v != null && initials[k] !== undefined) {
          newRow[k] = parseFloat((((Number(v) - initials[k]) / initials[k]) * 100).toFixed(2));
        } else {
          newRow[k] = null;
        }
      }
      return newRow;
    });
  }, [chartDataAbsolute, selectedKey, compareKey]);

  /* ─── Base-100 normalized data (for mixed-unit comparisons) ─── */
  const chartDataBase100 = useMemo(() => {
    if (chartDataAbsolute.length === 0) return [];
    const keysToPlot = [selectedKey];
    if (compareKey) keysToPlot.push(compareKey);

    const initials: Record<string, number> = {};
    for (const row of chartDataAbsolute) {
      for (const k of keysToPlot) {
        if (initials[k] === undefined && row[k] != null && Number(row[k]) !== 0) {
          initials[k] = Number(row[k]);
        }
      }
    }

    return chartDataAbsolute.map(row => {
      const newRow: Record<string, string | number | null> = { date: row.date };
      for (const k of keysToPlot) {
        const v = row[k];
        if (v != null && initials[k] !== undefined) {
          newRow[k] = parseFloat(((Number(v) / initials[k]) * 100).toFixed(2));
        } else {
          newRow[k] = null;
        }
        newRow[`__period_${k}`] = row[`__period_${k}`] ?? null;
      }
      return newRow;
    });
  }, [chartDataAbsolute, selectedKey, compareKey]);


  /* ─── Latest values ─── */
  const latestValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ind of validIndicators) {
      const points = history.filter(h => h.key === ind.key);
      if (points.length > 0) map[ind.key] = points[points.length - 1].value;
    }
    return map;
  }, [history, validIndicators]);

  const ibovespaMetrics = useMemo(() => {
    if (selectedKey !== "index_ibovespa" || !selectedIndicator?.value) return null;
    const raw = selectedIndicator.value as Record<string, unknown>;
    return {
      points: typeof raw.value === "number" ? raw.value : Number(raw.value ?? latestValues[selectedKey]),
      variation: typeof raw.variation === "number" ? raw.variation : Number(raw.variation ?? 0),
      volume: raw.volume == null ? null : Number(raw.volume),
    };
  }, [selectedIndicator, selectedKey, latestValues]);

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

  // Unit detection from indicator metadata
  const selectedUnit = selectedIndicator?.unit || (selectedKey.startsWith("rate_") ? "percent" : "currency");
  const compareUnit = compareIndicator?.unit || (compareKey?.startsWith("rate_") ? "percent" : "currency");
  const hasMixedUnits = !!(
    compareKey &&
    compareIndicator &&
    (() => {
      const getUnit = (key: string, ind: IndicatorMeta | null | undefined) => {
        if (ind?.unit) return ind.unit;
        if (key.startsWith("crypto_")) return "crypto";
        if (key.startsWith("currency_")) return "currency";
        if (key.startsWith("rate_") || key.startsWith("index_")) return "percent";
        return "percent";
      };
      const uA = getUnit(selectedKey, selectedIndicator);
      const uB = getUnit(compareKey, compareIndicator);
      return uA !== uB;
    })()
  );
  // Auto-normalize to base-100 when comparing mixed units in absolute mode
  const useBase100 = viewMode === "absolute" && hasMixedUnits;
  const isMixedUnits = false; // dual-axis disabled — replaced by base-100 normalization

  const chartData = useBase100
    ? chartDataBase100
    : viewMode === "percent"
      ? chartDataPercent
      : chartDataAbsolute;
  const hasAnyData = chartData.length > 0;
  const chartHeight = expanded ? 340 : 225;


  // Assign colors based on category
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    validIndicators.forEach((ind) => { map[ind.key] = getColor(ind.key); });
    return map;
  }, [validIndicators]);

  const defaultColor = "hsl(210, 80%, 55%)";
  const chartConfig: Record<string, { label: string; color: string }> = {};
  if (selectedIndicator) {
    chartConfig[selectedKey] = { label: selectedIndicator.display_name, color: colorMap[selectedKey] || defaultColor };
  }
  if (compareIndicator && compareKey) {
    chartConfig[compareKey] = { label: compareIndicator.display_name, color: colorMap[compareKey] || defaultColor };
  }


  // Comparison options: accessible indicators excluding selected
  const compareOptions = accessibleIndicators.filter(i => i.key !== selectedKey);

  const groupedAccessibleIndicators = useMemo(() => {
    const cubKey = `cub_${uf.toLowerCase()}`;

    return INDICATOR_GROUPS.map((group) => ({
      ...group,
      items: accessibleIndicators.filter((indicator) =>
        group.keys.some((key) => (key === "cub_dynamic" ? indicator.key === cubKey : indicator.key === key)),
      ),
    })).filter((group) => group.items.length > 0);
  }, [accessibleIndicators, uf]);

  // Standardized typography
  const modalTypeClasses = {
    title: "text-[14px] font-bold text-foreground",
    value: "text-[13px] font-medium text-foreground",
    body: "text-[11px] font-normal text-muted-foreground",
    groupTitle: "text-[11px] font-semibold uppercase text-muted-foreground tracking-[0.05em]",
    metricValue: "text-[20px] font-bold text-foreground",
    bodyItalic: "text-[11px] font-normal italic text-muted-foreground",
  };

  // Ibovespa: render chart only when there are at least 2 historical points
  const ibovespaHistoryCount = useMemo(
    () => history.filter(h => h.key === "index_ibovespa").length,
    [history],
  );
  const ibovespaHasChart = isIbovespaSelected && ibovespaHistoryCount >= 2 && hasAnyData;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className={`${modalTypeClasses.title} flex items-center gap-2`}>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Indicadores de Mercado
            </CardTitle>
            {selectedIndicator && (
              <CardDescription className={modalTypeClasses.body}>
                {selectedIndicator.description}
                {latestValues[selectedKey] !== undefined && (
                  <span className={`ml-2 ${modalTypeClasses.value}`}>
                    {formatValue(selectedKey, latestValues[selectedKey])}
                  </span>
                )}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-1 items-center">
            {/* UF selector for CUB Regional */}
            {(selectedKey.startsWith("cub_") || compareKey.startsWith("cub_")) && (
              <Select value={uf} onValueChange={(v) => setUf(v as UF)}>
                <SelectTrigger className="h-7 w-[88px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_UFS.map(u => (
                    <SelectItem key={u} value={u} className="text-xs">CUB-{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
              {expanded && (
                <div className="space-y-2">
                  <p className={`${modalTypeClasses.groupTitle} px-1`}>Comparações Guiadas</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {GUIDED_COMPARISONS.map((g) => {
                      const Icon = g.icon;
                      const isActive = activeGuidedId === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => applyGuidedComparison(g)}
                          className={`text-left rounded-lg border p-3 transition-all hover:shadow-sm ${
                            isActive
                              ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm"
                              : "border-border/70 bg-muted/20 hover:border-emerald-500/50 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-muted-foreground"}`} />
                            <span className="text-[13px] font-bold text-foreground">
                              {g.title} <span className="font-normal">{g.emoji}</span>
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                            {g.narrative}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-5">
                {groupedAccessibleIndicators.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <p className={`${modalTypeClasses.groupTitle} px-1`}>{group.label}</p>
                    <div className="flex items-stretch gap-2 w-full">
                      {group.items.map((ind) => {
                        const source = OFFICIAL_SOURCES[ind.key];

                        return (
                          <Tooltip key={ind.key}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => {
                                  setSelectedKey(ind.key);
                                  if (ind.key === compareKey) setCompareKey("");
                                  setActiveGuidedId("");
                                }}
                                className={`flex-1 min-w-0 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                                  selectedKey === ind.key
                                    ? "shadow-sm ring-1 ring-current/20 text-foreground"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                                style={selectedKey === ind.key ? {
                                  backgroundColor: `${colorMap[ind.key]}20`,
                                  color: colorMap[ind.key],
                                } : undefined}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: colorMap[ind.key] }}
                                />
                                <span className="truncate">{ind.display_name}</span>
                                {source && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 opacity-40 hover:opacity-100 transition-opacity shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[280px] text-xs space-y-1">
                                      <p className="font-semibold">{source.officialName}</p>
                                      <p className="text-muted-foreground">{source.organization}</p>
                                      <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-accent hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Fonte oficial <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[250px]">
                              {ind.description}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {lockedIndicators.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap pt-1">
                    {lockedIndicators.map((ind) => (
                      <Tooltip key={ind.key}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] opacity-40 cursor-not-allowed bg-muted/30">
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
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  {!isIbovespaSelected && compareKey && (
                    <>
                      <div className="flex items-center bg-muted/50 rounded-md p-0.5">
                        <button
                          onClick={() => setViewMode("absolute")}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                            viewMode === "absolute"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Absoluto
                        </button>
                        <button
                          onClick={() => setViewMode("percent")}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                            viewMode === "percent"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Variação %
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

            {/* ─── Color Legend + Compare Selector ─── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className={`flex items-center gap-3 flex-wrap ${modalTypeClasses.body}`}>
                {LEGEND_ITEMS.map((item) => (
                  <span key={item.id} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                ))}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setArgumentsMapOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                    >
                      <Compass className="h-3.5 w-3.5" />
                      Mapa de Argumentos
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Argumentos de venda por categoria de indicador</TooltipContent>
                </Tooltip>
              </div>
              {!isIbovespaSelected && selectedKey && compareOptions.length > 0 && (
                <Select value={compareKey || "none"} onValueChange={(v) => { setCompareKey(v === "none" ? "" : v); setActiveGuidedId(""); }}>
                  <SelectTrigger className="h-8 w-[180px] text-xs ml-auto">
                    <SelectValue placeholder="Comparar com..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem comparação</SelectItem>
                    {compareOptions.map((ind) => (
                      <SelectItem key={ind.key} value={ind.key}>
                        {ind.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className={`${modalTypeClasses.body} italic -mt-2`}>
              Dica: Indicadores da mesma cor oferecem comparações mais diretas de mercado.
            </p>

            {/* ─── Chart ─── */}
            <div className="relative">
              {viewMode === "percent" && compareKey && (
                <div className="text-xs text-muted-foreground mb-1 italic">
                  Variação no período (%)
                </div>
              )}
              {!selectedKey ? (
                <div
                  className="flex items-center justify-center text-center text-muted-foreground"
                  style={{ height: chartHeight, fontSize: 13 }}
                >
                  Selecione um indicador acima para visualizar o histórico.
                </div>
              ) : (!isIbovespaSelected || ibovespaHasChart) && hasAnyData ? (
                <>
                <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
                  <LineChart data={chartData} margin={{ top: 5, right: isMixedUnits ? 70 : compareKey ? 20 : 10, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      interval="preserveStartEnd"
                    />
                    {/* Left Y-axis */}
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      domain={["auto", "auto"]}
                      tickFormatter={(v) =>
                        viewMode === "percent"
                          ? `${Number(v).toFixed(1)}%`
                          : formatAxisTick(v, selectedUnit, selectedKey)
                      }
                      label={{
                        value: viewMode === "percent"
                          ? selectedIndicator?.display_name + " (%)"
                          : selectedIndicator?.display_name + (selectedUnit === "currency" ? " (R$)" : " (%)"),
                        angle: -90,
                        position: "insideLeft",
                        offset: 12,
                        style: {
                          fontSize: 10,
                          fill: colorMap[selectedKey] ?? "hsl(210, 80%, 55%)",
                          fontWeight: 500,
                        },
                      }}
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
                        label={{
                          value: compareIndicator?.display_name + (compareUnit === "currency" ? " (R$)" : " (%)"),
                          angle: 90,
                          position: "insideRight",
                          offset: 12,
                          style: {
                            fontSize: 10,
                            fill: colorMap[compareKey] ?? "hsl(25, 90%, 55%)",
                            fontWeight: 500,
                          },
                        }}
                      />
                    )}
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => {
                            if (payload && payload[0]) return payload[0].payload.date;
                            return "";
                          }}
                          formatter={(value, name, item) => {
                            const key = String(name);
                            const ind = validIndicators.find(i => i.key === key);
                            const period = (item?.payload?.[`__period_${key}`] ?? null) as Periodicidade | null;
                            const periodLabel = periodicidadeLabel(period);
                            const valueStr = viewMode === "percent"
                              ? `${Number(value).toFixed(2)}%`
                              : formatValue(key, Number(value));
                            const display = periodLabel ? (
                              <span className="flex flex-col">
                                <span>{valueStr}</span>
                                <span className="text-[10px] text-muted-foreground/80">· {periodLabel}</span>
                              </span>
                            ) : valueStr;
                            return [display, ind?.display_name ?? key];
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
                        stroke={colorMap[selectedKey] || defaultColor}
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
                        stroke={colorMap[compareKey] || defaultColor}
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
                {(selectedIndicator || (compareIndicator && compareKey)) && (
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {selectedIndicator && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className="inline-block rounded"
                          style={{
                            width: 20,
                            height: 2.5,
                            backgroundColor: colorMap[selectedKey],
                          }}
                        />
                        <span>{selectedIndicator.display_name}</span>
                        {viewMode === "absolute" && latestValues[selectedKey] !== undefined && (
                          <span className="font-medium text-foreground">
                            {formatValue(selectedKey, latestValues[selectedKey])}
                          </span>
                        )}
                      </div>
                    )}
                    {compareIndicator && compareKey && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className="inline-block rounded"
                          style={{
                            width: 20,
                            height: 2.5,
                            background: `repeating-linear-gradient(90deg, ${colorMap[compareKey]} 0px, ${colorMap[compareKey]} 5px, transparent 5px, transparent 8px)`,
                          }}
                        />
                        <span>{compareIndicator.display_name}</span>
                        {viewMode === "absolute" && latestValues[compareKey] !== undefined && (
                          <span className="font-medium text-foreground">
                            {formatValue(compareKey, latestValues[compareKey])}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {activeGuided && (
                  <div className="mt-3 rounded-md border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {activeGuided.title} {activeGuided.emoji}
                    </p>
                    <p className="mt-1 text-[13px] leading-snug text-foreground">
                      {activeGuided.narrative}
                    </p>
                  </div>
                )}
                </>
              ) : isIbovespaSelected ? (
                <Card className="border-dashed">
                  <CardContent className="py-5 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                        <p className={modalTypeClasses.groupTitle}>Pontuação atual</p>
                        <p className={`mt-1 ${modalTypeClasses.metricValue}`}>
                          {ibovespaMetrics?.points != null
                            ? `${ibovespaMetrics.points.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} pts`
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                        <p className={modalTypeClasses.groupTitle}>Variação do dia</p>
                        <p className={`mt-1 ${modalTypeClasses.metricValue} ${((ibovespaMetrics?.variation ?? 0) >= 0) ? "text-emerald-600" : "text-red-500"}`}>
                          {ibovespaMetrics?.variation != null
                            ? `${ibovespaMetrics.variation >= 0 ? "+" : ""}${ibovespaMetrics.variation.toFixed(2)}%`
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                        <p className={modalTypeClasses.groupTitle}>Volume negociado</p>
                        <p className={`mt-1 ${modalTypeClasses.metricValue}`}>
                          {ibovespaMetrics?.volume != null
                            ? ibovespaMetrics.volume.toLocaleString("pt-BR")
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <p className={modalTypeClasses.bodyItalic}>
                      Histórico em construção — dado informativo disponível.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Info className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">
                    Dados históricos em construção — exibindo últimos dados disponíveis
                  </p>
                </div>
              )}
            </div>

            {/* ─── Insights do Especialista (INCC / CUB) ─── */}
            {(() => {
              if (selectedKey === "index_ibovespa") {
                return (
                  <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10">
                    <CardContent className="py-3.5 px-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className={modalTypeClasses.value}>Insight de Mercado</p>
                            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-400">
                              Ibovespa
                            </Badge>
                          </div>
                          <p className={`${modalTypeClasses.body} leading-relaxed`}>{IBOVESPA_INSIGHT}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              const isExpertKey = selectedKey === "incc" || selectedKey.startsWith("cub_");
              if (!isExpertKey) return null;
              const points = history
                .filter(h => h.key === selectedKey && h.insight && h.insight.trim().length > 0)
                .sort((a, b) => effectiveDate(a).localeCompare(effectiveDate(b)));
              const latest = points[points.length - 1];
              if (!latest || !latest.insight) return null;
              return (
                <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10">
                  <CardContent className="py-3.5 px-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className={modalTypeClasses.value}>
                            Insights do Especialista
                          </p>
                          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-400">
                            {selectedIndicator?.display_name}
                          </Badge>
                        </div>
                        <p className={`${modalTypeClasses.body} leading-relaxed`}>
                          {latest.insight}
                        </p>
                        <button
                          onClick={() => navigator.clipboard.writeText(latest.insight!)}
                          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors mt-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                          </svg>
                          Copiar argumento
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {insights.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Lightbulb className="h-4 w-4" />
                    Insights automáticos
                  </div>
                  <p className="text-[11px] italic text-muted-foreground pl-6">
                    Use com seu cliente
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {insights.map(insight => {
                    // Extract message between single quotes — that's the copyable client-facing text
                    const match = insight.actionText?.match(/'([^']+)'/);
                    const clientMessage = match ? match[1] : insight.actionText ?? "";
                    return (
                    <div
                      key={insight.id}
                      className={`flex flex-col gap-2 p-3 rounded-lg border text-sm ${
                        insight.type === "opportunity"
                          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                          : insight.type === "alert"
                            ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
                            : "border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {insight.icon}
                        <span>{insight.text}</span>
                      </div>
                      {insight.actionText && (
                        <div className="mt-2 pt-2 border-t border-current/10 w-full">
                          <p className="text-xs text-muted-foreground italic leading-relaxed">
                            “{clientMessage}”
                          </p>
                          <button
                            onClick={() => navigator.clipboard.writeText(clientMessage)}
                            className="mt-1.5 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                            </svg>
                            Copiar para WhatsApp
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })}
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
                          <p className={`${modalTypeClasses.value} cursor-help`}>
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
                      <p className={modalTypeClasses.body}>
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

      {/* Arguments Map Modal */}
      <ArgumentsMapModal
        open={argumentsMapOpen}
        onOpenChange={setArgumentsMapOpen}
        history={history}
      />
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
