import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  TrendingUp,
  BarChart3,
  Landmark,
  PiggyBank,
  DollarSign,
  Euro,
  TrendingDown,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { useMarketData } from "@/hooks/useMarketData";
import { useSubscription, type SubscriptionPlan } from "@/hooks/useSubscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

function formatRate(val: number, period: string): string {
  return `${val.toFixed(2).replace(".", ",")}% ${period}`;
}

function formatCurrency(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

interface IndexItem {
  id: string;
  name: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  minPlan: SubscriptionPlan;
}

const PLAN_LEVEL: Record<SubscriptionPlan, number> = {
  basic: 1,
  pro: 2,
  business: 3,
};

function hasAccess(userPlan: SubscriptionPlan, minPlan: SubscriptionPlan): boolean {
  return PLAN_LEVEL[userPlan] >= PLAN_LEVEL[minPlan];
}

export function ArsenalPanel() {
  const { data, isLoading, isLive, lastFetch, refresh } = useMarketData();
  const { plan } = useSubscription();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const indexes: IndexItem[] = [
    {
      id: "poupanca", name: "Poupança",
      value: data.rates.poupanca ? formatRate(data.rates.poupanca.value, data.rates.poupanca.period) : "—",
      icon: <PiggyBank className="h-4 w-4" />, description: "Rendimento da caderneta",
      minPlan: "basic",
    },
    {
      id: "tr", name: "TR",
      value: data.rates.tr ? formatRate(data.rates.tr.value, data.rates.tr.period) : "—",
      icon: <Landmark className="h-4 w-4" />, description: "Taxa Referencial",
      minPlan: "basic",
    },
    {
      id: "ipca", name: "IPCA",
      value: data.rates.ipca ? formatRate(data.rates.ipca.value, data.rates.ipca.period) : "—",
      icon: <BarChart3 className="h-4 w-4" />, description: "Índice de Preços ao Consumidor",
      minPlan: "basic",
    },
    {
      id: "selic", name: "SELIC",
      value: data.rates.selic ? formatRate(data.rates.selic.value, data.rates.selic.period) : "—",
      icon: <TrendingUp className="h-4 w-4" />, description: "Taxa básica de juros",
      minPlan: "pro",
    },
    {
      id: "igpm", name: "IGP-M",
      value: data.rates.igpm ? formatRate(data.rates.igpm.value, data.rates.igpm.period) : "—",
      icon: <BarChart3 className="h-4 w-4" />, description: "Índice Geral de Preços — Mercado",
      minPlan: "pro",
    },
    {
      id: "cdi", name: "CDI",
      value: data.rates.cdi ? formatRate(data.rates.cdi.value, data.rates.cdi.period) : "—",
      icon: <TrendingDown className="h-4 w-4" />, description: "Certificado de Depósito Interbancário",
      minPlan: "pro",
    },
    {
      id: "incc", name: "INCC",
      value: data.rates.incc ? formatRate(data.rates.incc.value, data.rates.incc.period) : "—",
      icon: <Landmark className="h-4 w-4" />, description: "Índice Nacional de Custo da Construção",
      minPlan: "business",
    },
    {
      id: "usd", name: "Dólar",
      value: data.currencies.usd ? formatCurrency(data.currencies.usd.value) : "—",
      icon: <DollarSign className="h-4 w-4" />, description: "USD/BRL",
      minPlan: "business",
    },
    {
      id: "eur", name: "Euro",
      value: data.currencies.eur ? formatCurrency(data.currencies.eur.value) : "—",
      icon: <Euro className="h-4 w-4" />, description: "EUR/BRL",
      minPlan: "business",
    },
  ];

  const accessibleIndexes = indexes.filter((idx) => hasAccess(plan, idx.minPlan));
  const lockedIndexes = indexes.filter((idx) => !hasAccess(plan, idx.minPlan));

  const panelBody = (
    <>
      {/* Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/20 border border-emerald-700/30 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400 uppercase tracking-wider">
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
          className="h-6 gap-1 text-[10px] px-2"
        >
          {isRefreshing || isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Atualizar
        </Button>
      </div>

      {/* Index grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {accessibleIndexes.map((idx) => (
          <div
            key={idx.id}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2 hover:bg-muted/50 transition-colors"
          >
            <div className="p-1 rounded-md bg-emerald-900/20 text-emerald-500">
              {idx.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-tight truncate">{idx.name}</p>
              <p className="text-sm font-bold text-foreground leading-tight">{idx.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Locked items teaser */}
      {lockedIndexes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2">
            <Lock className="h-3 w-3" />
            Disponível em planos superiores
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {lockedIndexes.map((idx) => (
              <div
                key={idx.id}
                className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/10 px-2.5 py-2 opacity-40 select-none"
              >
                <div className="p-1 rounded-md bg-muted/30 text-muted-foreground">
                  {idx.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">{idx.name}</p>
                  <p className="text-sm font-bold text-muted-foreground leading-tight">—</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[9px] text-muted-foreground/50 text-center mt-3">
        Dados: BCB / AwesomeAPI. Fins informativos.
      </p>
    </>
  );

  // ── Mobile: FAB + Drawer ──
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-95"
          aria-label="Arsenal Técnico"
        >
          <TrendingUp className="h-6 w-6" />
        </button>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="border-b bg-muted/30 pb-3">
              <DrawerTitle>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Arsenal Técnico
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </Badge>
                </div>
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                Painel de indexadores e cotações para consulta rápida
              </DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="p-4 max-h-[70vh]">
              {panelBody}
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // ── Desktop/Tablet: Collapsible card ──
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-emerald-700/20 bg-emerald-950/5 dark:bg-emerald-950/10">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-semibold text-foreground">Arsenal Técnico</span>
              {isLive && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
              )}
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </Badge>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            {panelBody}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
