import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Home, 
  Wallet, 
  Percent, 
  Calendar, 
  Shield, 
  TrendingDown,
  CalendarCheck,
  Repeat,
  ArrowRight,
  Banknote,
  Info,
  MousePointerClick
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FinancingData } from "./FinancingCalculator";

interface CalculationsData {
  principal: number;
  firstPayment: number;
  lastPayment: number;
  totalPaid: number;
  totalInterest: number;
  actualTermMonths: number;
  monthsSaved: number;
  interestSaved: number;
}

interface CalculationSummaryProps {
  financingData: FinancingData;
  calculations: CalculationsData;
  onFieldClick: (field: string) => void;
}

interface SummaryItem {
  field: string;
  icon: React.ElementType;
  label: string;
  value: string;
  secondary?: string;
  tooltip?: string;
  highlight?: boolean;
}

export function CalculationSummary({ financingData, calculations, onFieldClick }: CalculationSummaryProps) {
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatMonths = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years === 0) return `${remainingMonths} meses`;
    if (remainingMonths === 0) return `${years} anos`;
    return `${years}a ${remainingMonths}m`;
  };

  const entryPercentage = financingData.propertyValue > 0 
    ? ((financingData.downPayment / financingData.propertyValue) * 100).toFixed(1) 
    : "0";

  const summaryItems: SummaryItem[] = [
    {
      field: "propertyValue",
      icon: Home,
      label: "Valor do Imóvel",
      value: formatBRL(financingData.propertyValue),
      tooltip: "Valor total do imóvel a ser financiado",
    },
    {
      field: "downPayment",
      icon: Wallet,
      label: "Entrada",
      value: formatBRL(financingData.downPayment),
      secondary: `${entryPercentage}% do valor`,
      tooltip: "Valor pago como entrada no momento da compra",
    },
    {
      field: "downPayment",
      icon: Banknote,
      label: "Valor Financiado",
      value: formatBRL(calculations.principal),
      tooltip: "Valor do imóvel menos a entrada",
      highlight: true,
    },
    {
      field: "interestRate",
      icon: Percent,
      label: "Taxa de Juros",
      value: `${financingData.interestRate}% ${financingData.interestRateType === "annual" ? "a.a." : "a.m."}`,
      tooltip: financingData.interestRateType === "annual" 
        ? "Taxa anual de juros aplicada ao financiamento" 
        : "Taxa mensal de juros aplicada ao financiamento",
    },
    {
      field: "termMonths",
      icon: Calendar,
      label: "Prazo",
      value: formatMonths(financingData.termMonths),
      secondary: calculations.monthsSaved > 0 ? `(${formatMonths(calculations.actualTermMonths)} efetivo)` : undefined,
      tooltip: "Prazo total do financiamento em meses",
    },
    {
      field: "startDate",
      icon: CalendarCheck,
      label: "Data de Início",
      value: format(financingData.startDate, "dd/MM/yyyy", { locale: ptBR }),
      tooltip: "Data de vencimento da primeira parcela",
    },
    {
      field: "amortizationType",
      icon: TrendingDown,
      label: "Sistema",
      value: financingData.amortizationType,
      tooltip: financingData.amortizationType === "SAC" 
        ? "SAC: Amortização constante com parcelas decrescentes" 
        : "PRICE: Parcelas fixas durante todo o financiamento",
    },
    {
      field: "feesInsurance",
      icon: Shield,
      label: "Taxas/Seguros",
      value: formatBRL(financingData.feesInsurance) + "/mês",
      tooltip: "Valor mensal de taxas e seguros obrigatórios",
    },
  ];

  if (financingData.enableExtraAmortization) {
    summaryItems.push({
      field: "extraAmortization",
      icon: TrendingDown,
      label: "Amort. Extra",
      value: formatBRL(financingData.extraAmortization) + "/mês",
      tooltip: "Valor adicional para amortização mensal do saldo devedor",
    });
  }

  if (financingData.enableReinforcements) {
    const frequencyLabels = {
      monthly: "mensal",
      semiannual: "semestral",
      annual: "anual",
    };
    summaryItems.push({
      field: "reinforcement",
      icon: Repeat,
      label: "Reforço",
      value: formatBRL(financingData.reinforcementValue),
      secondary: frequencyLabels[financingData.reinforcementFrequency],
      tooltip: "Pagamento extra programado para reduzir o saldo devedor",
    });
  }

  return (
    <TooltipProvider>
      <Card className="shadow-card border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MousePointerClick className="h-5 w-5 text-primary" />
                Resumo Interativo
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em qualquer card para editar o campo correspondente
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Interactive Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {summaryItems.map((item, index) => (
              <Tooltip key={`${item.field}-${index}`}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-auto p-3 flex flex-col items-start gap-1.5 transition-all duration-200 group
                      ${item.highlight 
                        ? "bg-primary/5 border-primary/30 hover:bg-primary/10 hover:border-primary/50" 
                        : "hover:bg-muted/50 hover:border-primary/30"
                      }`}
                    onClick={() => onFieldClick(item.field)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                        <item.icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </div>
                      <Info className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                    <div className={`font-semibold text-sm ${item.highlight ? "text-primary" : "text-foreground"}`}>
                      {item.value}
                    </div>
                    {item.secondary && (
                      <span className="text-xs text-muted-foreground">
                        {item.secondary}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{item.tooltip}</p>
                  <p className="text-xs text-muted-foreground mt-1">Clique para editar</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Financial Summary Stats */}
          <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Primeira Parcela</p>
              <p className="text-xl font-bold text-primary">{formatBRL(calculations.firstPayment)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Total de Juros</p>
              <p className="text-xl font-bold text-foreground">{formatBRL(calculations.totalInterest)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Total a Pagar</p>
              <p className="text-xl font-bold text-foreground">{formatBRL(calculations.totalPaid)}</p>
            </div>
          </div>

          {/* Savings Highlight */}
          {(calculations.monthsSaved > 0 || calculations.interestSaved > 0) && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">
                  Economia com amortizações extras
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {calculations.monthsSaved > 0 && (
                  <span className="text-foreground">
                    <strong className="text-primary">
                      {formatMonths(calculations.monthsSaved)}
                    </strong>{" "}
                    a menos no prazo
                  </span>
                )}
                {calculations.interestSaved > 0 && (
                  <span className="text-foreground">
                    <strong className="text-primary">
                      {formatBRL(calculations.interestSaved)}
                    </strong>{" "}
                    economizados em juros
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
