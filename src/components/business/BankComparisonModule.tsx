import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Trophy, TrendingDown, Edit3, RotateCcw, Calculator, Clock } from "lucide-react";
import { BANK_RATES } from "@/lib/bank-rates";
import { useBankComparison } from "@/hooks/useBankComparison";
import { useMarketData } from "@/hooks/useMarketData";
import { useSimulation } from "@/contexts/SimulationContext";

export function BankComparisonModule() {
  const {
    propertyValue, setPropertyValue,
    downPayment, setDownPayment,
    termMonths, setTermMonths,
    amortizationType: system, setAmortizationType: setSystem,
  } = useSimulation();
  const [editingBank, setEditingBank] = useState<string | null>(null);

  const formatCurrency = (value: string) => {
    const num = parseInt(value.replace(/\D/g, "")) || 0;
    return (num / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (value: string) => {
    return (parseInt(value.replace(/\D/g, "")) || 0) / 100;
  };

  const handleCurrencyInput = (value: string, setter: (v: string) => void) => {
    setter(value.replace(/\D/g, ""));
  };

  const financedAmount = parseCurrency(propertyValue) - parseCurrency(downPayment);
  const term = parseInt(termMonths) || 360;

  const { results, customRates, setRate, resetRates } = useBankComparison(financedAmount, term, system);
  const { lastFetch } = useMarketData();

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Parâmetros da Simulação Comparativa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Valor do Imóvel</Label>
              <Input
                value={`R$ ${formatCurrency(propertyValue)}`}
                onChange={(e) => handleCurrencyInput(e.target.value, setPropertyValue)}
                className="h-[42px] text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Entrada</Label>
              <Input
                value={`R$ ${formatCurrency(downPayment)}`}
                onChange={(e) => handleCurrencyInput(e.target.value, setDownPayment)}
                className="h-[42px] text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Prazo (meses)</Label>
              <Input
                type="number"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                className="h-[42px] text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Sistema</Label>
              <Select value={system} onValueChange={(v) => setSystem(v as "SAC" | "PRICE")}>
                <SelectTrigger className="h-[42px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAC">SAC</SelectItem>
                  <SelectItem value="PRICE">PRICE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {financedAmount > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Valor financiado: <strong className="text-foreground">{fmtBRL(financedAmount)}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results Grid */}
      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Sondagem Estratégica Multi-Bancos
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Referência de Mercado VetorPro
                {lastFetch && (
                  <> · {lastFetch.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</>
                )}
              </span>
              <Button variant="ghost" size="sm" onClick={resetRates} className="text-xs gap-1">
                <RotateCcw className="h-3 w-3" />
                Resetar Taxas
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result) => (
              <Card
                key={result.bankId}
                className="relative overflow-hidden border transition-all duration-200 hover:shadow-md"
              >
                {/* Bank color accent bar */}
                <div className="h-1.5 w-full" style={{ backgroundColor: result.bankColor }} />

                {/* Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-1">
                  {result.isBestRate && (
                    <Badge className="bg-success text-success-foreground text-[10px] px-2 py-0.5 gap-1">
                      <Trophy className="h-3 w-3" />
                      Melhor Taxa
                    </Badge>
                  )}
                  {result.isLowestCost && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Menor Custo
                    </Badge>
                  )}
                </div>

                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: result.bankColor }}
                    >
                      {result.bankName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{result.bankName}</CardTitle>
                      <div className="flex items-center gap-1 mt-0.5">
                        {editingBank === result.bankId ? (
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={customRates[result.bankId] || String(BANK_RATES.find(b => b.id === result.bankId)!.defaultRate)}
                            className="h-6 w-20 text-xs px-1"
                            autoFocus
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) setRate(result.bankId, val);
                              setEditingBank(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                          />
                        ) : (
                          <button
                            onClick={() => setEditingBank(result.bankId)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {result.rate.toFixed(2)}% a.a.
                            <Edit3 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-2 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">1ª Parcela</p>
                      <p className="text-sm font-semibold text-foreground">{fmtBRL(result.firstPayment)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Última Parcela</p>
                      <p className="text-sm font-semibold text-foreground">{fmtBRL(result.lastPayment)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Custo Total Pago</p>
                    <p className="text-base font-bold text-foreground">{fmtBRL(result.totalPaid)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Juros: {fmtBRL(result.totalInterest)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Taxas médias de mercado para referência. Valores sujeitos a análise de crédito individual. Fonte: Referência de Mercado VetorPro.
          </p>
        </>
      )}
    </div>
  );
}
