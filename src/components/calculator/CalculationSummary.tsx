import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Wallet, 
  Percent, 
  Calendar, 
  Shield, 
  TrendingDown,
  CalendarCheck,
  Repeat,
  ArrowRight
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

  const summaryItems = [
    {
      field: "propertyValue",
      icon: Home,
      label: "Valor do Imóvel",
      value: formatBRL(financingData.propertyValue),
    },
    {
      field: "downPayment",
      icon: Wallet,
      label: "Entrada",
      value: formatBRL(financingData.downPayment),
      secondary: `${((financingData.downPayment / financingData.propertyValue) * 100).toFixed(1)}%`,
    },
    {
      field: "interestRate",
      icon: Percent,
      label: "Taxa de Juros",
      value: `${financingData.interestRate}% ${financingData.interestRateType === "annual" ? "a.a." : "a.m."}`,
    },
    {
      field: "termMonths",
      icon: Calendar,
      label: "Prazo",
      value: formatMonths(financingData.termMonths),
      secondary: calculations.monthsSaved > 0 ? `(${formatMonths(calculations.actualTermMonths)} efetivo)` : undefined,
    },
    {
      field: "startDate",
      icon: CalendarCheck,
      label: "Início",
      value: format(financingData.startDate, "dd/MM/yyyy", { locale: ptBR }),
    },
    {
      field: "amortizationType",
      icon: TrendingDown,
      label: "Sistema",
      value: financingData.amortizationType,
    },
    {
      field: "feesInsurance",
      icon: Shield,
      label: "Taxas/Seguros",
      value: formatBRL(financingData.feesInsurance) + "/mês",
    },
  ];

  if (financingData.enableExtraAmortization) {
    summaryItems.push({
      field: "extraAmortization",
      icon: TrendingDown,
      label: "Amort. Extra",
      value: formatBRL(financingData.extraAmortization) + "/mês",
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
    });
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">Resumo do Cálculo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Clique em qualquer item para editar
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {summaryItems.map((item) => (
            <Button
              key={item.field}
              variant="outline"
              className="h-auto p-3 flex flex-col items-start gap-1 hover:bg-primary/5 hover:border-primary/30 transition-colors"
              onClick={() => onFieldClick(item.field)}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <item.icon className="h-4 w-4" />
                <span className="text-xs">{item.label}</span>
              </div>
              <div className="font-semibold text-foreground text-sm">
                {item.value}
              </div>
              {item.secondary && (
                <span className="text-xs text-muted-foreground">
                  {item.secondary}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <p className="text-sm text-muted-foreground">Valor Financiado</p>
            <p className="text-lg font-bold text-primary">{formatBRL(calculations.principal)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Total de Juros</p>
            <p className="text-lg font-bold">{formatBRL(calculations.totalInterest)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Total a Pagar</p>
            <p className="text-lg font-bold">{formatBRL(calculations.totalPaid)}</p>
          </div>
        </div>

        {/* Savings Highlight */}
        {(calculations.monthsSaved > 0 || calculations.interestSaved > 0) && (
          <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/30">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-4 w-4 text-success" />
              <span className="font-semibold text-success">Economia com amortizações</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {calculations.monthsSaved > 0 && (
                <span>
                  <strong className="text-success">{formatMonths(calculations.monthsSaved)}</strong>{" "}
                  a menos no prazo
                </span>
              )}
              {calculations.interestSaved > 0 && (
                <span>
                  <strong className="text-success">{formatBRL(calculations.interestSaved)}</strong>{" "}
                  economizados em juros
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
