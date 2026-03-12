import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  RefreshCw,
  DollarSign,
  Euro,
  TrendingUp,
  TrendingDown,
  Landmark,
  PiggyBank,
  Wallet,
  Star,
  StarOff,
  Info,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMarketData } from "@/hooks/useMarketData";

interface QuoteDisplayItem {
  id: string;
  name: string;
  value: string;
  icon: React.ReactNode;
  tooltip: string;
  category: "currency" | "rate";
  variation?: number;
}

function formatCurrency(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function formatRate(val: number, period: string): string {
  return `${val.toFixed(2).replace(".", ",")}% ${period}`;
}

export function QuotesPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, isLive, lastFetch, refresh } = useMarketData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("quotes-favorites");
      return saved ? JSON.parse(saved) : ["selic", "ipca", "tr"];
    } catch {
      return ["selic", "ipca", "tr"];
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      localStorage.setItem("quotes-favorites", JSON.stringify(next));
      return next;
    });
  };

  // Build display items from live data
  const quotes: QuoteDisplayItem[] = [
    {
      id: "usd",
      name: "Dólar (USD/BRL)",
      value: data.currencies.usd ? formatCurrency(data.currencies.usd.value) : "—",
      icon: <DollarSign className="h-5 w-5" />,
      tooltip: "Cotação do dólar americano em relação ao real brasileiro",
      category: "currency",
      variation: data.currencies.usd?.variation,
    },
    {
      id: "eur",
      name: "Euro (EUR/BRL)",
      value: data.currencies.eur ? formatCurrency(data.currencies.eur.value) : "—",
      icon: <Euro className="h-5 w-5" />,
      tooltip: "Cotação do euro em relação ao real brasileiro",
      category: "currency",
      variation: data.currencies.eur?.variation,
    },
    {
      id: "selic",
      name: "Selic",
      value: data.rates.selic ? formatRate(data.rates.selic.value, data.rates.selic.period) : "—",
      icon: <TrendingUp className="h-5 w-5" />,
      tooltip: "Taxa básica de juros definida pelo Banco Central do Brasil",
      category: "rate",
    },
    {
      id: "ipca",
      name: "IPCA",
      value: data.rates.ipca ? formatRate(data.rates.ipca.value, data.rates.ipca.period) : "—",
      icon: <BarChart3 className="h-5 w-5" />,
      tooltip: "Índice Nacional de Preços ao Consumidor Amplo",
      category: "rate",
    },
    {
      id: "tr",
      name: "TR",
      value: data.rates.tr ? formatRate(data.rates.tr.value, data.rates.tr.period) : "—",
      icon: <Landmark className="h-5 w-5" />,
      tooltip: "Taxa Referencial — usada para correção de financiamentos imobiliários",
      category: "rate",
    },
    {
      id: "cdi",
      name: "CDI",
      value: data.rates.cdi ? formatRate(data.rates.cdi.value, data.rates.cdi.period) : "—",
      icon: <TrendingDown className="h-5 w-5" />,
      tooltip: "Certificados de Depósito Interbancário — referência para renda fixa",
      category: "rate",
    },
    {
      id: "poupanca",
      name: "Poupança",
      value: data.rates.poupanca ? formatRate(data.rates.poupanca.value, data.rates.poupanca.period) : "—",
      icon: <PiggyBank className="h-5 w-5" />,
      tooltip: "Rendimento mensal da caderneta de poupança",
      category: "rate",
    },
  ];

  const sortedQuotes = [...quotes].sort((a, b) => {
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  const currencyQuotes = sortedQuotes.filter((q) => q.category === "currency");
  const rateQuotes = sortedQuotes.filter((q) => q.category === "rate");

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Cotações</span>
          {isLive && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[420px] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="h-5 w-5 text-primary" />
              Indexadores e Cotações
              {isLive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/20 border border-emerald-700/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Live
                </span>
              )}
            </SheetTitle>
            <SheetDescription className="flex items-center justify-between">
              <span className="text-xs">
                {lastFetch
                  ? `Atualizado: ${format(lastFetch, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
                  : "Carregando dados..."}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="h-8 gap-1 text-xs"
              >
                {isRefreshing || isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Atualizar
              </Button>
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 p-4">
            <TooltipProvider>
              {/* Currency quotes */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cotações Diárias
                </h3>
                <div className="space-y-2">
                  {currencyQuotes.map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      isFavorite={favorites.includes(quote.id)}
                      onToggleFavorite={() => toggleFavorite(quote.id)}
                      isLive={isLive}
                    />
                  ))}
                </div>
              </div>

              {/* Rates */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Taxas e Índices Financeiros
                </h3>
                <div className="space-y-2">
                  {rateQuotes.map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      isFavorite={favorites.includes(quote.id)}
                      onToggleFavorite={() => toggleFavorite(quote.id)}
                      isLive={isLive}
                    />
                  ))}
                </div>
              </div>
            </TooltipProvider>
          </ScrollArea>

          {/* Footer with transparency note */}
          <div className="p-4 border-t bg-muted/20 space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              💡 Clique na ⭐ para fixar índices favoritos no topo
            </p>
            <p className="text-[10px] text-muted-foreground/60 text-center leading-tight">
              Dados oficiais: BCB / AwesomeAPI. Valores para fins informativos.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface QuoteCardProps {
  quote: QuoteDisplayItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isLive: boolean;
}

function QuoteCard({ quote, isFavorite, onToggleFavorite, isLive }: QuoteCardProps) {
  const isCurrency = quote.category === "currency";

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${
        isCurrency
          ? "border-emerald-700/30 bg-emerald-950/20 dark:bg-emerald-950/30"
          : "border-slate-600/20 bg-slate-50/50 dark:bg-slate-900/30"
      } ${isFavorite ? "ring-1 ring-primary/30" : ""}`}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div
            className={`relative p-2 rounded-lg ${
              isCurrency
                ? "bg-emerald-800/20 text-emerald-500"
                : isFavorite
                ? "bg-primary/10 text-primary"
                : "bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400"
            }`}
          >
            {quote.icon}
            {isLive && isCurrency && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm truncate">{quote.name}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">{quote.tooltip}</p>
                  {isLive && (
                    <p className="text-xs text-emerald-400 mt-1 italic">
                      ● Dados atualizados via API oficial
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-lg font-bold ${isCurrency ? "text-emerald-500" : "text-primary"}`}>
                {quote.value}
              </p>
              {quote.variation !== undefined && quote.variation !== 0 && (
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    quote.variation > 0
                      ? "bg-emerald-900/20 text-emerald-400"
                      : "bg-red-900/20 text-red-400"
                  }`}
                >
                  {quote.variation > 0 ? "+" : ""}
                  {quote.variation.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onToggleFavorite}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            {isFavorite ? (
              <Star className="h-4 w-4 fill-warning text-warning" />
            ) : (
              <StarOff className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
