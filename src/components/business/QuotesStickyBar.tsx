import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMarketData } from "@/hooks/useMarketData";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  RefreshCw,
  DollarSign,
  Euro,
  TrendingUp,
  TrendingDown,
  Landmark,
  PiggyBank,
  Star,
  StarOff,
  Info,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

function formatRate(val: number, period: string): string {
  return `${val.toFixed(2).replace(".", ",")}% ${period}`;
}

interface QuoteDisplayItem {
  id: string;
  name: string;
  shortName: string;
  value: string;
  icon: React.ReactNode;
  tooltip: string;
  category: "currency" | "rate";
  variation?: number;
}

/** Compact pill for the sticky bar */
function QuotePill({ label, value, isLive }: { label: string; value: string; isLive: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50 text-sm whitespace-nowrap">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
      {isLive && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
      )}
    </div>
  );
}

export function QuotesStickyBar() {
  const isMobile = useIsMobile();
  const { data, isLoading, isLive, lastFetch, refresh } = useMarketData();
  const [isOpen, setIsOpen] = useState(false);
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

  const quotes: QuoteDisplayItem[] = [
    {
      id: "usd", name: "Dólar (USD/BRL)", shortName: "USD",
      value: data.currencies.usd ? formatCurrency(data.currencies.usd.value) : "—",
      icon: <DollarSign className="h-5 w-5" />, tooltip: "Cotação do dólar americano",
      category: "currency", variation: data.currencies.usd?.variation,
    },
    {
      id: "eur", name: "Euro (EUR/BRL)", shortName: "EUR",
      value: data.currencies.eur ? formatCurrency(data.currencies.eur.value) : "—",
      icon: <Euro className="h-5 w-5" />, tooltip: "Cotação do euro",
      category: "currency", variation: data.currencies.eur?.variation,
    },
    {
      id: "selic", name: "Selic", shortName: "SELIC",
      value: data.rates.selic ? formatRate(data.rates.selic.value, data.rates.selic.period) : "—",
      icon: <TrendingUp className="h-5 w-5" />, tooltip: "Taxa básica de juros do Banco Central",
      category: "rate",
    },
    {
      id: "ipca", name: "IPCA", shortName: "IPCA",
      value: data.rates.ipca ? formatRate(data.rates.ipca.value, data.rates.ipca.period) : "—",
      icon: <BarChart3 className="h-5 w-5" />, tooltip: "Índice Nacional de Preços ao Consumidor Amplo",
      category: "rate",
    },
    {
      id: "tr", name: "TR", shortName: "TR",
      value: data.rates.tr ? formatRate(data.rates.tr.value, data.rates.tr.period) : "—",
      icon: <Landmark className="h-5 w-5" />, tooltip: "Taxa Referencial",
      category: "rate",
    },
    {
      id: "cdi", name: "CDI", shortName: "CDI",
      value: data.rates.cdi ? formatRate(data.rates.cdi.value, data.rates.cdi.period) : "—",
      icon: <TrendingDown className="h-5 w-5" />, tooltip: "Certificados de Depósito Interbancário",
      category: "rate",
    },
    {
      id: "poupanca", name: "Poupança", shortName: "POUP",
      value: data.rates.poupanca ? formatRate(data.rates.poupanca.value, data.rates.poupanca.period) : "—",
      icon: <PiggyBank className="h-5 w-5" />, tooltip: "Rendimento da caderneta de poupança",
      category: "rate",
    },
  ];

  // Key rates for the sticky bar (desktop)
  const keyRates = quotes.filter((q) => ["selic", "ipca", "tr", "cdi"].includes(q.id));

  const sortedQuotes = [...quotes].sort((a, b) => {
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  const currencyQuotes = sortedQuotes.filter((q) => q.category === "currency");
  const rateQuotes = sortedQuotes.filter((q) => q.category === "rate");

  const fullPanelContent = (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <TooltipProvider>
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
      <div className="p-4 border-t bg-muted/20 space-y-2">
        <p className="text-xs text-muted-foreground text-center">
          💡 Clique na ⭐ para fixar índices favoritos no topo
        </p>
        <p className="text-[10px] text-muted-foreground/60 text-center leading-tight">
          Dados oficiais: BCB / AwesomeAPI. Valores para fins informativos.
        </p>
      </div>
    </div>
  );

  const headerContent = (
    <>
      <div className="flex items-center gap-2 text-xl font-semibold">
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
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
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
      </div>
    </>
  );

  // ─── MOBILE: FAB + Bottom Drawer ───
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <button
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-3 shadow-lg hover:shadow-xl transition-all active:scale-95"
            aria-label="Ver cotações"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm font-semibold">Cotações</span>
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b bg-muted/30 pb-4">
            <DrawerTitle>{headerContent}</DrawerTitle>
            <DrawerDescription className="sr-only">
              Painel de cotações e indexadores financeiros
            </DrawerDescription>
          </DrawerHeader>
          {fullPanelContent}
        </DrawerContent>
      </Drawer>
    );
  }

  // ─── DESKTOP / TABLET: Sticky bar + Sheet for full panel ───
  return (
    <>
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Cotações
            {isLive && (
              <span className="relative flex h-1.5 w-1.5 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none">
            {keyRates.map((rate) => (
              <QuotePill key={rate.id} label={rate.shortName} value={rate.value} isLive={isLive} />
            ))}
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs shrink-0">
                Ver tudo
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-[420px] p-0">
              <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
                <SheetTitle>{headerContent}</SheetTitle>
                <SheetDescription className="sr-only">
                  Painel completo de cotações e indexadores financeiros
                </SheetDescription>
              </SheetHeader>
              {fullPanelContent}
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            aria-label="Atualizar cotações"
          >
            {isRefreshing || isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── QuoteCard (reused from original) ───

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
              <TooltipProvider>
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
              </TooltipProvider>
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
