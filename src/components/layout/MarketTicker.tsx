import { useEffect, useState } from "react";
import { useMarketData } from "@/hooks/useMarketData";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useUserUF } from "@/hooks/useUserUF";
import { supabase } from "@/integrations/supabase/client";

interface TickerItem {
  label: string;
  value: string;
  variation?: number;
  isCurrency?: boolean;
  flag?: string;
  color?: string;
}

export function MarketTicker() {
  const { user } = useAuth();
  const { data, isLive } = useMarketData();
  const { plan, isActive } = useSubscription();

  if (!user || !isActive) return null;

  const isBasic = plan === "basic";

  const formatRate = (val: number, period: string) =>
    `${val.toFixed(2)}% ${period}`;

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const items: TickerItem[] = [];

  // Currencies FIRST for Pro/Business — always visible at the start
  if (!isBasic) {
    const usd = data.currencies.USD || data.currencies.usd || { value: 5.01, variation: 0 };
    const eur = data.currencies.EUR || data.currencies.eur || { value: 5.43, variation: 0 };
    items.push({ label: "USD", value: formatCurrency(usd.value), variation: usd.variation, isCurrency: true, flag: "🇺🇸", color: "text-green-400" });
    items.push({ label: "EUR", value: formatCurrency(eur.value), variation: eur.variation, isCurrency: true, flag: "🇪🇺", color: "text-blue-400" });
  }

  // Rates
  if (data.rates.selic) items.push({ label: "SELIC", value: formatRate(data.rates.selic.value, data.rates.selic.period), color: "text-cyan-400" });
  if (data.rates.ipca) items.push({ label: "IPCA", value: formatRate(data.rates.ipca.value, data.rates.ipca.period), variation: data.rates.ipca.value >= 0 ? data.rates.ipca.value : -data.rates.ipca.value, color: "text-amber-400" });
  if (data.rates.igpm) items.push({ label: "IGP-M", value: formatRate(data.rates.igpm.value, data.rates.igpm.period), color: "text-orange-400" });
  if (data.rates.incc) items.push({ label: "INCC", value: formatRate(data.rates.incc.value, data.rates.incc.period), color: "text-violet-400" });
  if (data.rates.tr) items.push({ label: "TR", value: formatRate(data.rates.tr.value, data.rates.tr.period), color: "text-teal-400" });
  if (data.rates.poupanca) items.push({ label: "Poupança", value: formatRate(data.rates.poupanca.value, data.rates.poupanca.period), color: "text-lime-400" });
  if (data.rates.cdi) items.push({ label: "CDI", value: formatRate(data.rates.cdi.value, data.rates.cdi.period), color: "text-sky-400" });

  // Plan badge
  const planLabel = plan === "business" ? "Business" : plan === "pro" ? "Professional" : "Basic";

  if (items.length === 0) return null;

  // Duplicate items for seamless loop
  const tickerContent = [...items, ...items];

  return (
    <div className="w-full bg-slate-900 border-t border-emerald-500/30 overflow-hidden select-none sticky bottom-0 z-[9999]">
      <div className="flex items-center">
        {/* Terminal label */}
        <div className="shrink-0 px-4 py-3 border-r border-emerald-500/20 bg-slate-900/80">
          <span className="text-emerald-400 font-bold text-xs tracking-wider">Terminal Financeiro</span>
        </div>
        
        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-ticker whitespace-nowrap py-3">
            {tickerContent.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 mx-4 text-sm font-mono shrink-0">
                {item.flag && <span className="text-base">{item.flag}</span>}
                <span className={`font-semibold ${item.color || "text-emerald-400"}`}>{item.label}</span>
                <span className="text-white/90">{item.value}</span>
                {item.variation !== undefined && item.isCurrency && (
                  <span className={item.variation >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {item.variation >= 0 ? "▲" : "▼"} {Math.abs(item.variation).toFixed(2)}%
                  </span>
                )}
                <span className="text-emerald-500/30 ml-2">│</span>
              </span>
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
