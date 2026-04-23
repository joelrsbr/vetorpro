import { useEffect, useMemo, useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useUserUF } from "@/hooks/useUserUF";
import { supabase } from "@/integrations/supabase/client";

type Direction = "up" | "down" | "flat";

interface TickerItem {
  key: string;
  label: string;
  value: string;
  direction: Direction;
  flag?: string;
  color?: string;
}

interface MarketHistoryRow {
  key: string;
  value: number;
  recorded_at: string;
  data_referencia: string | null;
}

interface TickerDefinition {
  key: string;
  label: string;
  color: string;
  flag?: string;
  formatter: (value: number) => string;
}

const getEffectiveDate = (row: MarketHistoryRow) => {
  if ((row.key === "incc" || row.key.startsWith("cub_")) && row.data_referencia) {
    return `${row.data_referencia}T00:00:00.000Z`;
  }
  return row.recorded_at;
};

const getDirection = (current: number, previous: number | null): Direction => {
  if (previous === null || current === previous) return "flat";
  return current > previous ? "up" : "down";
};

const getDirectionPresentation = (direction: Direction) => {
  if (direction === "up") return { symbol: "▲", className: "text-emerald-400" };
  if (direction === "down") return { symbol: "▼", className: "text-red-400" };
  return { symbol: "→", className: "text-muted-foreground" };
};

export function MarketTicker() {
  const { user } = useAuth();
  const { plan, isActive } = useSubscription();
  const { uf } = useUserUF();
  const [historyRows, setHistoryRows] = useState<MarketHistoryRow[]>([]);

  useEffect(() => {
    if (!user || !uf) return;

    let cancelled = false;
    const cubKey = `cub_${uf.toLowerCase()}`;
    const standardKeys = [
      "rate_ipca",
      "rate_igpm",
      "rate_selic",
      "rate_cdi",
      "rate_tr",
      "rate_poupanca",
      "index_ibovespa",
      "currency_usd",
      "currency_eur",
      "crypto_btc",
    ];
    const expertKeys = ["incc", cubKey];

    (async () => {
      const [standardResult, expertResult] = await Promise.all([
        supabase
          .from("market_history")
          .select("key, value, recorded_at, data_referencia")
          .in("key", standardKeys)
          .order("recorded_at", { ascending: false }),
        supabase
          .from("market_history")
          .select("key, value, recorded_at, data_referencia")
          .in("key", expertKeys)
          .order("data_referencia", { ascending: false })
          .order("recorded_at", { ascending: false }),
      ]);

      if (cancelled) return;

      const merged = [
        ...(standardResult.data ?? []),
        ...(expertResult.data ?? []),
      ].map((row) => ({
        key: row.key,
        value: Number(row.value),
        recorded_at: row.recorded_at,
        data_referencia: row.data_referencia,
      }));

      setHistoryRows(merged);
    })();

    return () => { cancelled = true; };
  }, [user, uf]);

  if (!user || !isActive) return null;

  const formatRate = (val: number, period: string) =>
    `${val.toFixed(2)}% ${period}`;

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const definitions = useMemo<TickerDefinition[]>(() => [
    { key: "rate_ipca", label: "IPCA", color: "text-amber-400", formatter: (value) => formatRate(value, "a.a.") },
    { key: "rate_igpm", label: "IGP-M", color: "text-orange-400", formatter: (value) => formatRate(value, "a.a.") },
    { key: "incc", label: "INCC", color: "text-violet-400", formatter: (value) => formatRate(value, "a.m.") },
    { key: `cub_${uf}`, label: `CUB-${uf}`, color: "text-fuchsia-400", formatter: (value) => `${formatCurrency(value)}/m²` },
    { key: "rate_selic", label: "SELIC", color: "text-cyan-400", formatter: (value) => formatRate(value, "a.a.") },
    { key: "rate_cdi", label: "CDI", color: "text-sky-400", formatter: (value) => formatRate(value, "a.a.") },
    { key: "rate_tr", label: "TR", color: "text-teal-400", formatter: (value) => formatRate(value, "a.m.") },
    { key: "rate_poupanca", label: "Poupança", color: "text-lime-400", formatter: (value) => formatRate(value, "a.m.") },
    { key: "index_ibovespa", label: "Ibovespa", color: "text-emerald-400", formatter: (value) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} pts` },
    { key: "currency_usd", label: "USD", color: "text-green-400", flag: "🇺🇸", formatter: (value) => formatCurrency(value) },
    { key: "currency_eur", label: "EUR", color: "text-blue-400", flag: "🇪🇺", formatter: (value) => formatCurrency(value) },
    { key: "crypto_btc", label: "BTC", color: "text-yellow-400", formatter: (value) => `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` },
  ], [uf]);

  const latestByKey = useMemo(() => {
    const grouped = new Map<string, MarketHistoryRow[]>();

    for (const row of historyRows) {
      const existing = grouped.get(row.key) ?? [];
      existing.push(row);
      grouped.set(row.key, existing);
    }

    const snapshots = new Map<string, { current: number; previous: number | null; direction: Direction }>();

    for (const [key, rows] of grouped.entries()) {
      const sorted = [...rows].sort((a, b) => getEffectiveDate(b).localeCompare(getEffectiveDate(a)));
      const current = sorted[0]?.value;
      if (current == null) continue;
      const previous = sorted[1]?.value ?? null;
      snapshots.set(key, { current, previous, direction: getDirection(current, previous) });
    }

    return snapshots;
  }, [historyRows]);

  const items = useMemo<TickerItem[]>(() => {
    return definitions.flatMap((definition) => {
      const snapshot = latestByKey.get(definition.key === `cub_${uf}` ? `cub_${uf.toLowerCase()}` : definition.key);
      if (!snapshot) return [];

      return [{
        key: definition.key,
        label: definition.label,
        value: definition.formatter(snapshot.current),
        direction: snapshot.direction,
        flag: definition.flag,
        color: definition.color,
      }];
    });
  }, [definitions, latestByKey, uf]);

  // Plan badge
  const planLabel = plan === "business" ? "Business" : plan === "pro" ? "Professional" : "Basic";

  if (items.length === 0) return null;

  const loopItems = [{ key: "spacer-start" } as const, ...items, { key: "spacer-end" } as const];
  const tickerContent = [...loopItems, ...loopItems];

  return (
    <div className="w-full bg-slate-900 border-t border-emerald-500/30 overflow-hidden select-none sticky bottom-0 z-[9999]">
      <div className="flex items-center">
        {/* Terminal label */}
        <div className="shrink-0 px-4 py-3 border-r border-emerald-500/20 bg-slate-900/80">
          <span className="text-emerald-400 font-bold text-xs tracking-wider">Terminal Financeiro</span>
        </div>
        
        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden">
          <div className="flex min-w-max animate-ticker whitespace-nowrap py-3">
            {tickerContent.map((item, i) => (
              "direction" in item ? (
                <span key={`${item.key}-${i}`} className="inline-flex items-center gap-1.5 mx-5 text-sm font-mono shrink-0">
                  {item.flag && <span className="text-base">{item.flag}</span>}
                  <span className={`font-semibold ${item.color || "text-emerald-400"}`}>{item.label}</span>
                  <span className="text-white/90">{item.value}</span>
                  <span className={getDirectionPresentation(item.direction).className}>
                    {getDirectionPresentation(item.direction).symbol}
                  </span>
                  <span className="text-emerald-500/30 ml-2">│</span>
                </span>
              ) : (
                <span key={`${item.key}-${i}`} className="block w-12 shrink-0" aria-hidden="true" />
              )
            ))}
          </div>
        </div>

        {/* Plan badge */}
        <div className="shrink-0 px-4 py-3 border-l border-emerald-500/20 bg-slate-900/80">
          <span className="text-emerald-400/70 text-xs font-mono">Plan: <span className="text-emerald-400 font-bold">{planLabel}</span></span>
        </div>
      </div>
    </div>
  );
}
