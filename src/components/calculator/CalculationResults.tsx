import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, Calendar, Sparkles, Clock, PiggyBank } from "lucide-react";
import { Link } from "react-router-dom";

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

interface CalculationResultsProps {
  calculations: CalculationsData;
  amortizationType: "SAC" | "PRICE";
}

export function CalculationResults({ calculations, amortizationType }: CalculationResultsProps) {
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
    return `${years} anos e ${remainingMonths} meses`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <span className="text-sm font-bold text-primary">R$</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {amortizationType === "SAC" ? "Primeira Parcela" : "Parcela Fixa"}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatBRL(calculations.firstPayment)}
                </p>
                {amortizationType === "SAC" && (
                  <p className="text-xs text-muted-foreground">
                    Última: {formatBRL(calculations.lastPayment)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <TrendingDown className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Juros</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatBRL(calculations.totalInterest)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((calculations.totalInterest / calculations.principal) * 100).toFixed(1)}% do valor financiado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatBRL(calculations.totalPaid)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Em {formatMonths(calculations.actualTermMonths)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings Summary */}
      {(calculations.monthsSaved > 0 || calculations.interestSaved > 0) && (
        <Card className="shadow-card border-success/30 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <PiggyBank className="h-5 w-5 text-success" />
              <h3 className="font-semibold text-success">Economia com Amortizações</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calculations.monthsSaved > 0 && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-sm text-muted-foreground">Prazo Reduzido</p>
                    <p className="font-semibold text-success">
                      {formatMonths(calculations.monthsSaved)}
                    </p>
                  </div>
                </div>
              )}
              {calculations.interestSaved > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-success">R$</span>
                  <div>
                    <p className="text-sm text-muted-foreground">Economia em Juros</p>
                    <p className="font-semibold text-success">
                      {formatBRL(calculations.interestSaved)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
