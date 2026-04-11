import { useState } from "react";
import { Landmark, Handshake, Users, Info, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Trophy, TrendingDown, Edit3, RotateCcw, Calculator, Clock, ArrowRight, Star } from "lucide-react";
import { BANK_RATES } from "@/lib/bank-rates";
import { useBankComparison } from "@/hooks/useBankComparison";
import { useMarketData } from "@/hooks/useMarketData";
import { useSimulation } from "@/contexts/SimulationContext";
import { useSearchParams } from "react-router-dom";
import { ArsenalPanel } from "./ArsenalPanel";

export function BankComparisonModule() {
  const {
    propertyValue, setPropertyValue,
    downPayment, setDownPayment,
    termMonths, setTermMonths,
    amortizationType: system, setAmortizationType: setSystem,
  } = useSimulation();
  const [, setSearchParams] = useSearchParams();
  const [editingBank, setEditingBank] = useState<string | null>(null);
  const [relationshipBank, setRelationshipBank] = useState<string | null>(null);
  const [expandedCosts, setExpandedCosts] = useState<string | null>(null);

  const formatCurrency = (value: string) => {
    const num = parseInt(value.replace(/\D/g, "")) || 0;
    return (num / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (value: string) => {
    return (parseInt(value.replace(/\D/g, "")) || 0) / 100;
  };

  const financedAmount = parseCurrency(propertyValue) - parseCurrency(downPayment);
  const term = parseInt(termMonths) || 360;

  const { results, customRates, setRate, resetRates } = useBankComparison(financedAmount, term, system);
  const { lastFetch } = useMarketData();

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

  const goToSimulator = () => {
    setSearchParams({ tab: "simulator" });
  };

  // Sort results: relationship bank first as strategic suggestion, then by totalPaid
  const sortedResults = [...results].sort((a, b) => {
    if (relationshipBank) {
      if (a.bankId === relationshipBank && b.bankId !== relationshipBank) return -1;
      if (b.bankId === relationshipBank && a.bankId !== relationshipBank) return 1;
    }
    return a.totalPaid - b.totalPaid;
  });

  const toggleRelationship = (bankId: string) => {
    setRelationshipBank(prev => prev === bankId ? null : bankId);
  };

  return (
    <div className="space-y-6">
      {/* Galeria de Indexadores */}
      <ArsenalPanel />
      {/* Read-only Summary Section */}
      <Card className="border-primary/20 cursor-pointer group" onClick={goToSimulator}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Resumo da Simulação
            </span>
            <span className="text-xs font-normal text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Para alterar, use o Simulador
              <ArrowRight className="h-3 w-3" />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Valor do Imóvel</Label>
              <div className="h-[42px] text-sm flex items-center px-3 rounded-md border bg-muted/50 text-foreground pointer-events-none select-none">
                R$ {formatCurrency(propertyValue)}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Entrada</Label>
              <div className="h-[42px] text-sm flex items-center px-3 rounded-md border bg-muted/50 text-foreground pointer-events-none select-none">
                R$ {formatCurrency(downPayment)}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Prazo (meses)</Label>
              <div className="h-[42px] text-sm flex items-center px-3 rounded-md border bg-muted/50 text-foreground pointer-events-none select-none">
                {termMonths}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Sistema</Label>
              <div className="h-[42px] text-sm flex items-center px-3 rounded-md border bg-muted/50 text-foreground pointer-events-none select-none">
                {system}
              </div>
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

          {/* Relationship Question */}
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-2 w-full">
                  <p className="text-sm font-medium text-foreground">
                    Seu cliente possui relacionamento com algum destes bancos?<br />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Clique no banco para indicar o relacionamento. Ele será priorizado como sugestão estratégica. Além da menor taxa, oriente seu cliente a procurar também o seu Gerente de Relacionamento ou o seu Correspondente Bancário em busca de melhores opções.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {BANK_RATES.map((bank) => (
                      <button
                        key={bank.id}
                        onClick={() => toggleRelationship(bank.id)}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                          transition-all duration-200 border
                          ${relationshipBank === bank.id
                            ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }
                        `}
                      >
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: bank.color }}
                        />
                        {bank.shortName === bank.shortName ? bank.name : bank.shortName}
                        {relationshipBank === bank.id && (
                          <Handshake className="h-3 w-3 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                  {relationshipBank && (
                    <button
                      onClick={() => setRelationshipBank(null)}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-1"
                    >
                      ✕ Limpar seleção
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedResults.map((result) => {
              const isRelationship = relationshipBank === result.bankId;
              const isBanrisul = result.bankId === "banrisul";
              // If relationship bank is not the best rate, tag it as strategic suggestion
              const isStrategicSuggestion = isRelationship && !result.isBestRate && !result.isLowestCost;

              return (
                <Card
                  key={result.bankId}
                  className={`
                    relative overflow-hidden border transition-all duration-300
                    ${isRelationship
                      ? "ring-2 ring-primary/40 border-primary/30 shadow-lg shadow-primary/5 hover:shadow-md"
                      : "border-border/60 hover:shadow-sm"
                    }
                  `}
                >
                  {/* Bank color accent bar */}
                  <div
                    className={`w-full transition-all duration-300 ${isRelationship ? "h-2" : "h-1.5"}`}
                    style={{ backgroundColor: result.bankColor }}
                  />

                  {/* Badges */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1">
                    {isRelationship && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                        <Handshake className="h-3 w-3" />
                        Relacionamento Ativo
                      </Badge>
                    )}
                    {isStrategicSuggestion && (
                      <Badge className="bg-warning text-warning-foreground text-[10px] px-2 py-0.5 gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                        <Star className="h-3 w-3" />
                        Sugestão Estratégica
                      </Badge>
                    )}
                    {result.isBestRate && (
                      <Badge className="bg-success text-success-foreground text-[10px] px-2 py-0.5 gap-1">
                        <Trophy className="h-3 w-3" />
                        Melhor Taxa
                      </Badge>
                    )}
                    {result.isLowestCost && !result.isBestRate && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 gap-1">
                        <TrendingDown className="h-3 w-3" />
                        Menor Custo
                      </Badge>
                    )}
                    {result.isRegional && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400">
                        <MapPin className="h-3 w-3" />
                        Destaque Regional
                      </Badge>
                    )}
                  </div>

                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-8 w-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0 transition-transform duration-200 ${isRelationship ? "scale-110" : ""}`}
                        style={{ backgroundColor: result.bankColor }}
                      >
                        {BANK_RATES.find(b => b.id === result.bankId)?.compeCode ?? result.shortName}
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
                              onClick={(e) => e.stopPropagation()}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBank(result.bankId);
                              }}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {result.rate.toFixed(2)}% a.a.
                              {result.spread > 0 && (
                                <span className="text-[10px] text-muted-foreground ml-1">(+{result.spread.toFixed(2)}% spread = {result.effectiveRate.toFixed(2)}%)</span>
                              )}
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
                    {result.note && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 italic">
                        ℹ {result.note}
                      </p>
                    )}

                    {/* Hidden Costs Section */}
                    {(() => {
                      const bankConfig = BANK_RATES.find(b => b.id === result.bankId);
                      if (!bankConfig) return null;
                      const costs = bankConfig.hiddenCosts;
                      const isExpanded = expandedCosts === result.bankId;
                      const propertyVal = parseCurrency(propertyValue);
                      const estimatedInsurance = propertyVal > 0 ? propertyVal * (costs.insuranceRate / 100) : 0;
                      const totalInitialCosts = costs.engineeringAppraisal + (costs.monthlyAdmin > 0 ? costs.monthlyAdmin : 0);

                      return (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCosts(isExpanded ? null : result.bankId);
                            }}
                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full justify-between"
                          >
                            <span className="flex items-center gap-1 relative">
                              {(result.isBestRate || isRelationship) ? (
                                <>
                                  <span className="relative">
                                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                                  </span>
                                  <span className="font-medium text-foreground">Ver taxas estimadas e custos extras</span>
                                </>
                              ) : (
                                <>
                                  <Info className="h-3 w-3" />
                                  Ver taxas estimadas e custos extras
                                </>
                              )}
                            </span>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-muted-foreground">Avaliação de Engenharia</span>
                                  <span className="font-medium text-foreground">{fmtBRL(costs.engineeringAppraisal)}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-muted-foreground">Taxa Admin. Mensal</span>
                                  <span className="font-medium text-foreground">
                                    {costs.monthlyAdmin > 0 ? fmtBRL(costs.monthlyAdmin) : "Isento"}
                                  </span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-muted-foreground">Seguros (MIP/DFI) est./mês</span>
                                  <span className="font-medium text-foreground">
                                    {estimatedInsurance > 0 ? fmtBRL(estimatedInsurance) : "—"}
                                  </span>
                                </div>
                                <div className="border-t border-border/50 pt-1.5 mt-1.5 flex justify-between text-[11px]">
                                  <span className="text-muted-foreground font-medium">Custos iniciais estimados</span>
                                  <span className="font-semibold text-foreground">≈ {fmtBRL(totalInitialCosts)}</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                Estimativas médias. Antecipar estes custos ao seu cliente gera confiança e evita surpresas no fechamento.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })}

            {/* BNDES - Enterprise teaser */}
            <Card className="relative overflow-hidden border transition-all duration-200 grayscale opacity-50 select-none pointer-events-none">
              <div className="h-1.5 w-full bg-muted-foreground" />
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 whitespace-nowrap">
                  Enterprise (Em Breve)
                </Badge>
              </div>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md flex items-center justify-center bg-muted-foreground text-white text-xs font-bold shrink-0">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">BNDES</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">—% a.a.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">1ª Parcela</p>
                    <p className="text-sm font-semibold text-foreground">—</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Última Parcela</p>
                    <p className="text-sm font-semibold text-foreground">—</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Custo Total Pago</p>
                  <p className="text-base font-bold text-foreground">—</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Juros: —</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Taxas médias de mercado para referência. Valores sujeitos a análise de crédito individual. Fonte: Referência de Mercado VetorPro.
          </p>
        </>
      )}
    </div>
  );
}
