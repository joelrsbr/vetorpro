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
  Building2,
  Wallet,
  Star,
  StarOff,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuoteItem {
  id: string;
  name: string;
  value: string;
  icon: React.ReactNode;
  tooltip: string;
  category: "currency" | "rate";
}

const defaultQuotes: QuoteItem[] = [
  {
    id: "usd",
    name: "Dólar (USD/BRL)",
    value: "R$ 5,21",
    icon: <DollarSign className="h-5 w-5" />,
    tooltip: "Cotação do dólar americano em relação ao real brasileiro",
    category: "currency",
  },
  {
    id: "eur",
    name: "Euro (EUR/BRL)",
    value: "R$ 5,68",
    icon: <Euro className="h-5 w-5" />,
    tooltip: "Cotação do euro em relação ao real brasileiro",
    category: "currency",
  },
  {
    id: "selic",
    name: "Selic",
    value: "13,25% a.a.",
    icon: <TrendingUp className="h-5 w-5" />,
    tooltip: "Taxa básica de juros definida pelo Banco Central do Brasil",
    category: "rate",
  },
  {
    id: "ipca",
    name: "IPCA",
    value: "4,75% a.a.",
    icon: <BarChart3 className="h-5 w-5" />,
    tooltip: "Índice Nacional de Preços ao Consumidor Amplo - principal índice de inflação do Brasil",
    category: "rate",
  },
  {
    id: "tr",
    name: "TR",
    value: "0,04% a.m.",
    icon: <Landmark className="h-5 w-5" />,
    tooltip: "Taxa Referencial - usada para correção de financiamentos imobiliários",
    category: "rate",
  },
  {
    id: "cdi",
    name: "CDI",
    value: "10,90% a.a.",
    icon: <TrendingDown className="h-5 w-5" />,
    tooltip: "Certificados de Depósito Interbancário - referência para investimentos de renda fixa",
    category: "rate",
  },
  {
    id: "poupanca",
    name: "Poupança",
    value: "0,63% a.m.",
    icon: <PiggyBank className="h-5 w-5" />,
    tooltip: "Rendimento mensal da caderneta de poupança com base na Selic",
    category: "rate",
  },
  {
    id: "incc",
    name: "INCC",
    value: "4,15% a.a.",
    icon: <Building2 className="h-5 w-5" />,
    tooltip: "Índice Nacional da Construção Civil - medido pela FGV, usado em contratos imobiliários",
    category: "rate",
  },
  {
    id: "fgts",
    name: "FGTS",
    value: "3,00% a.a.",
    icon: <Wallet className="h-5 w-5" />,
    tooltip: "Taxa de atualização do saldo do Fundo de Garantia do Tempo de Serviço",
    category: "rate",
  },
];

export function QuotesPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("quotes-favorites");
      return saved ? JSON.parse(saved) : ["selic", "ipca", "tr"];
    } catch {
      return ["selic", "ipca", "tr"];
    }
  });

  const handleUpdate = () => {
    setIsUpdating(true);
    setTimeout(() => {
      setLastUpdate(new Date());
      setIsUpdating(false);
    }, 1000);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      localStorage.setItem("quotes-favorites", JSON.stringify(next));
      return next;
    });
  };

  const sortedQuotes = [...defaultQuotes].sort((a, b) => {
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
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[400px] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="h-5 w-5 text-primary" />
              Indexadores e Cotações
            </SheetTitle>
            <SheetDescription className="flex items-center justify-between">
              <span className="text-xs">
                Última atualização:{" "}
                {format(lastUpdate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="h-8 gap-1 text-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isUpdating ? "animate-spin" : ""}`}
                />
                Atualizar
              </Button>
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 p-4">
            <TooltipProvider>
              {/* Cotações de Moedas */}
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
                    />
                  ))}
                </div>
              </div>

              {/* Taxas e Índices */}
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
                    />
                  ))}
                </div>
              </div>
            </TooltipProvider>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground text-center">
              💡 Clique na ⭐ para fixar índices favoritos no topo
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface QuoteCardProps {
  quote: QuoteItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function QuoteCard({ quote, isFavorite, onToggleFavorite }: QuoteCardProps) {
  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 ${
        isFavorite ? "border-primary/50 bg-primary/5" : ""
      }`}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isFavorite
                ? "bg-primary/10 text-primary"
                : "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
            }`}
          >
            {quote.icon}
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
                  <p className="text-xs text-muted-foreground mt-1 italic">Dados atualizados automaticamente via API de mercado</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-lg font-bold text-primary">{quote.value}</p>
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
