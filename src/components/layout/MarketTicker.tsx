import { useMarketData } from "@/hooks/useMarketData";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

interface TickerItem {
  label: string;
  value: string;
  variation?: number;
  isCurrency?: boolean;
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

  // Rates — always visible
  if (data.rates.selic) items.push({ label: "SELIC", value: formatRate(data.rates.selic.value, data.rates.selic.period) });
  if (data.rates.ipca) items.push({ label: "IPCA", value: formatRate(data.rates.ipca.value, data.rates.ipca.period) });
  if (data.rates.igpm) items.push({ label: "IGP-M", value: formatRate(data.rates.igpm.value, data.rates.igpm.period) });
  if (data.rates.incc) items.push({ label: "INCC", value: formatRate(data.rates.incc.value, data.rates.incc.period) });
  if (data.rates.tr) items.push({ label: "TR", value: formatRate(data.rates.tr.value, data.rates.tr.period) });
  if (data.rates.poupanca) items.push({ label: "Poupança", value: formatRate(data.rates.poupanca.value, data.rates.poupanca.period) });
  if (data.rates.cdi) items.push({ label: "CDI", value: formatRate(data.rates.cdi.value, data.rates.cdi.period) });

  // Currencies — hidden for Basic
  if (!isBasic) {
    if (data.currencies.USD) items.push({ label: "USD/BRL", value: formatCurrency(data.currencies.USD.value), variation: data.currencies.USD.variation, isCurrency: true });
    if (data.currencies.EUR) items.push({ label: "EUR/BRL", value: formatCurrency(data.currencies.EUR.value), variation: data.currencies.EUR.variation, isCurrency: true });
  }

  if (items.length === 0) return null;

  // Duplicate items for seamless loop
  const tickerContent = [...items, ...items];

  return (
    <div className="w-full bg-[#0a0a0a] border-t border-border/30 overflow-hidden select-none">
      <div className="flex animate-ticker whitespace-nowrap py-2">
        {tickerContent.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 mx-4 text-xs font-mono shrink-0">
            <span className="text-emerald-400 font-semibold">{item.label}</span>
            <span className="text-white/90">{item.value}</span>
            {item.variation !== undefined && (
              <span className={item.variation >= 0 ? "text-emerald-400" : "text-red-400"}>
                {item.variation >= 0 ? "▲" : "▼"} {Math.abs(item.variation).toFixed(2)}%
              </span>
            )}
            <span className="text-white/20 ml-2">│</span>
          </span>
        ))}
      </div>
    </div>
  );
}
