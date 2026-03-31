import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  TrendingUp,
  BarChart3,
  Landmark,
  PiggyBank,
  Calculator,
  RefreshCw,
  Loader2,
  Crown,
  ArrowRight,
} from "lucide-react";
import { useMarketData } from "@/hooks/useMarketData";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { HP12CCalculator } from "@/components/calculator/HP12CCalculator";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatRate(val: number, period: string): string {
  return `${val.toFixed(2).replace(".", ",")}% ${period}`;
}

interface IndexCard {
  id: string;
  name: string;
  description: string;
  value: string;
  icon: React.ReactNode;
}

export function ArsenalFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, isLive, lastFetch, refresh } = useMarketData();
  const { plan, isActive } = useSubscription();
  const isMobile = useIsMobile();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const showUpgradeBanner = !isActive || plan === "basic" || plan === "pro";

  const indexes: IndexCard[] = [
    {
      id: "selic",
      name: "SELIC",
      description: "Taxa básica de juros — Banco Central",
      value: data.rates.selic ? formatRate(data.rates.selic.value, data.rates.selic.period) : "—",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      id: "ipca",
      name: "IPCA",
      description: "Índice Nacional de Preços ao Consumidor Amplo",
      value: data.rates.ipca ? formatRate(data.rates.ipca.value, data.rates.ipca.period) : "—",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      id: "igpm",
      name: "IGP-M",
      description: "Índice Geral de Preços — Mercado (FGV)",
      value: data.rates.igpm ? formatRate(data.rates.igpm.value, data.rates.igpm.period) : "—",
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      id: "incc",
      name: "INCC",
      description: "Índice Nacional de Custo da Construção",
      value: data.rates.incc ? formatRate(data.rates.incc.value, data.rates.incc.period) : "—",
      icon: <Landmark className="h-5 w-5" />,
    },
    {
      id: "tr",
      name: "TR",
      description: "Taxa Referencial — correção de financiamentos",
      value: data.rates.tr ? formatRate(data.rates.tr.value, data.rates.tr.period) : "—",
      icon: <Landmark className="h-5 w-5" />,
    },
    {
      id: "poupanca",
      name: "Poupança",
      description: "Rendimento mensal da caderneta de poupança",
      value: data.rates.poupanca ? formatRate(data.rates.poupanca.value, data.rates.poupanca.period) : "—",
      icon: <PiggyBank className="h-5 w-5" />,
    },
  ];

  const panelContent = (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-5 py-4">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/20 border border-emerald-700/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Live
              </span>
            )}
            <span>
              {lastFetch
                ? format(lastFetch, "dd/MM 'às' HH:mm", { locale: ptBR })
                : "Carregando..."}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-7 gap-1 text-xs"
          >
            {isRefreshing || isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Atualizar
          </Button>
        </div>

        {/* Indexadores */}
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Indexadores Oficiais
        </h3>
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {indexes.map((idx) => (
            <Card key={idx.id} className="border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    {idx.icon}
                  </div>
                  <span className="font-bold text-sm">{idx.name}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{idx.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{idx.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* HP12C Section */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Ferramentas
          </h3>
          <HP12CCalculator />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t bg-muted/20 p-4 space-y-2">
        <p className="text-[10px] text-muted-foreground/60 text-center leading-tight">
          Dados oficiais: BCB / AwesomeAPI. Valores para fins informativos.
        </p>
        {showUpgradeBanner && (
          <div className="rounded-lg border border-emerald-700/30 bg-emerald-950/10 p-3 flex items-center gap-3">
            <Crown className="h-5 w-5 text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                Personalize seus relatórios com sua logo e marca
              </p>
              <p className="text-[10px] text-muted-foreground">
                Disponível no Plano Business
              </p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 text-emerald-500 hover:text-emerald-400 h-7 text-xs" asChild>
              <Link to="/precos">
                Conhecer
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const headerTitle = (
    <div className="flex items-center gap-2 text-xl font-semibold">
      <Briefcase className="h-5 w-5 text-primary" />
      Galeria de Indexadores
    </div>
  );

  // ── Mobile: Drawer ──
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all active:scale-95"
          aria-label="Galeria de Indexadores"
        >
          <Briefcase className="h-6 w-6" />
        </button>
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="border-b bg-muted/30 pb-4">
              <DrawerTitle>{headerTitle}</DrawerTitle>
              <DrawerDescription className="sr-only">
                Painel de indexadores e ferramentas financeiras
              </DrawerDescription>
            </DrawerHeader>
            {panelContent}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // ── Desktop: FAB + Sheet ──
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-50 flex items-center gap-2.5 rounded-full bg-primary text-primary-foreground px-5 py-3.5 shadow-lg hover:shadow-xl transition-all hover:scale-[1.03] active:scale-95"
        aria-label="Arsenal de Cotações"
      >
        <Briefcase className="h-5 w-5" />
        <span className="text-sm font-semibold">Arsenal</span>
        {isLive && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
      </button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-[440px] p-0">
          <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
            <SheetTitle>{headerTitle}</SheetTitle>
            <SheetDescription className="sr-only">
              Painel de indexadores e ferramentas financeiras
            </SheetDescription>
          </SheetHeader>
          {panelContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
