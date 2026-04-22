import { useCallback, useEffect, useMemo, useState } from "react";
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
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserUF } from "@/hooks/useUserUF";
import { getMarketGalleryIndicators, type MarketGalleryIndicatorDefinition } from "./marketGalleryConfig";
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
  return val.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatIndicatorValue(definition: MarketGalleryIndicatorDefinition, value: number | null): string {
  if (value === null) return "—";

  if (definition.valueType === "currency") return formatCurrency(value);
  if (definition.valueType === "crypto") {
    return `BTC ${formatCurrency(value).replace(/,00$/, "")}`;
  }
  if (definition.valueType === "cub") return `${formatCurrency(value)}/m²`;

  return formatRate(value, definition.periodLabel || "");
}

export function ArsenalPanel() {
  const { plan } = useSubscription();
  const { uf } = useUserUF();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [latestValues, setLatestValues] = useState<Record<string, number | null>>({});

  const indexes = useMemo(() => getMarketGalleryIndicators(uf), [uf]);

  const fetchLatestIndicators = useCallback(async () => {
    setIsLoading(true);

    try {
      const keys = indexes.map((item) => item.historyKey);
      const { data, error } = await supabase
        .from("market_history")
        .select("key, value, data_referencia, recorded_at")
        .in("key", keys)
        .order("data_referencia", { ascending: false, nullsFirst: false })
        .order("recorded_at", { ascending: false });

      if (error) throw error;

      const nextValues: Record<string, number | null> = {};
      for (const item of indexes) {
        nextValues[item.historyKey] = null;
      }

      for (const row of data || []) {
        if (nextValues[row.key] === null) {
          nextValues[row.key] = Number(row.value);
        }
      }

      setLatestValues(nextValues);
      setIsLive(true);
      setLastFetch(new Date());
    } catch (error) {
      console.error("Erro ao carregar indicadores da market_history:", error);
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, [indexes]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLatestIndicators();
    setIsRefreshing(false);
  };

  useEffect(() => {
    void fetchLatestIndicators();
  }, [fetchLatestIndicators]);

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
        {indexes.map((idx) => {
          const Icon = idx.icon;
          const value = formatIndicatorValue(idx, latestValues[idx.historyKey] ?? null);

          return (
            <div
              key={idx.id}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2 hover:bg-muted/50 transition-colors"
            >
              <div className="p-1 rounded-md bg-emerald-900/20 text-emerald-500">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground leading-tight truncate">{idx.name}</p>
                {isLoading && value === "—" ? (
                  <div className="h-4 w-16 rounded bg-muted animate-pulse mt-0.5" />
                ) : (
                  <p className="text-sm font-bold text-foreground leading-tight">{value}</p>
                )}
                <p className="text-[9px] text-muted-foreground/80 leading-tight mt-0.5 line-clamp-2">{idx.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-muted-foreground/50 text-center mt-3">
        Fonte exclusiva: market_history. Fins informativos.
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
          aria-label="Galeria de Indexadores"
        >
          <TrendingUp className="h-6 w-6" />
        </button>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="border-b bg-muted/30 pb-3">
              <DrawerTitle>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Galeria de Indexadores
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
              <span className="text-sm font-semibold text-foreground">Galeria de Indexadores</span>
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
