import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator, Plus, Minus, Wallet, Info, CalendarIcon, Shield, TrendingUp, Cpu } from "lucide-react";
import { HP12CCalculator } from "./HP12CCalculator";
import { CalculationResults } from "./CalculationResults";
import { AmortizationSchedule } from "./AmortizationSchedule";
import { ProposalGenerator } from "./ProposalGenerator";
import { useMarketData } from "@/hooks/useMarketData";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface ScheduleItem {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  extraPayment: number;
  debt: number;
  correction: number;
  correctedDebt: number;
  fees: number;
  hasReinforcement: boolean;
  date: Date;
}

export type CorrectionIndexType = "isento" | "tr" | "ipca" | "igpm" | "poupanca";

export interface FinancingData {
  propertyValue: number;
  downPayment: number;
  interestRate: number;
  interestRateType: "annual" | "monthly";
  termMonths: number;
  amortizationType: "SAC" | "PRICE";
  correctionIndex: CorrectionIndexType;
  startDate: Date;
  feesInsurance: number;
  extraAmortization: number;
  enableExtraAmortization: boolean;
  reinforcementValue: number;
  enableReinforcements: boolean;
  reinforcementFrequency: "monthly" | "semiannual" | "annual";
  includeMonthlyPayment: boolean;
}

export function FinancingCalculator() {
  // Refs for scrolling
  const propertyValueRef = useRef<HTMLInputElement>(null);
  const downPaymentRef = useRef<HTMLInputElement>(null);
  const interestRateRef = useRef<HTMLInputElement>(null);
  const termMonthsRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLButtonElement>(null);
  const feesRef = useRef<HTMLInputElement>(null);
  const amortizationRef = useRef<HTMLButtonElement>(null);
  const extraAmortRef = useRef<HTMLDivElement>(null);
  const reinforcementRef = useRef<HTMLDivElement>(null);

  const [propertyValue, setPropertyValue] = useState<string>("15000000");
  const [downPayment, setDownPayment] = useState<string>("3000000");
  const [interestRate, setInterestRate] = useState<string>("10.5");
  const [interestRateType, setInterestRateType] = useState<"annual" | "monthly">("annual");
  const [termMonths, setTermMonths] = useState<string>("360");
  const [amortizationType, setAmortizationType] = useState<"SAC" | "PRICE">("SAC");
  const [correctionIndex, setCorrectionIndex] = useState<CorrectionIndexType>("isento");
  const [startDate, setStartDate] = useState<Date>(addMonths(new Date(), 1));
  const [feesInsurance, setFeesInsurance] = useState<string>("5000");

  // Max affordable payment
  const [enableMaxPayment, setEnableMaxPayment] = useState(false);
  const [maxPaymentValue, setMaxPaymentValue] = useState<string>("300000");

  // Extra amortization
  const [enableExtraAmortization, setEnableExtraAmortization] = useState(false);

  const [extraAmortizationValue, setExtraAmortizationValue] = useState<string>("100000");
  const [extraAmortizationType, setExtraAmortizationType] = useState<"reduce-term" | "reduce-payment">("reduce-term");

  // Scheduled reinforcements
  const [enableReinforcements, setEnableReinforcements] = useState(false);
  const [reinforcementValue, setReinforcementValue] = useState<string>("500000");
  const [reinforcementFrequency, setReinforcementFrequency] = useState<"monthly" | "semiannual" | "annual">("annual");
  const [includeMonthlyPayment, setIncludeMonthlyPayment] = useState(true);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const number = parseInt(numericValue) || 0;
    return (number / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    return (parseInt(numericValue) || 0) / 100;
  };

  const handleCurrencyInput = (value: string, setter: (v: string) => void) => {
    const numericValue = value.replace(/\D/g, "");
    setter(numericValue);
  };


  const scrollToField = (field: string) => {
    const refs: Record<string, React.RefObject<any>> = {
      propertyValue: propertyValueRef,
      downPayment: downPaymentRef,
      interestRate: interestRateRef,
      termMonths: termMonthsRef,
      startDate: startDateRef,
      feesInsurance: feesRef,
      amortizationType: amortizationRef,
      extraAmortization: extraAmortRef,
      reinforcement: reinforcementRef
    };

    const ref = refs[field];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      ref.current.focus?.();
    }
  };

  // Calculate affordability analysis when max payment is enabled
  const affordabilityAnalysis = useMemo(() => {
    if (!enableMaxPayment) return null;

    const maxPayment = parseCurrency(maxPaymentValue);
    const property = parseCurrency(propertyValue);
    const down = parseCurrency(downPayment);
    const annualRate = interestRateType === "monthly" ?
    parseCurrency(interestRate) * 12 :
    parseCurrency(interestRate);
    const rate = annualRate / 100 / 12;
    const months = parseInt(termMonths) || 360;

    if (maxPayment <= 0 || rate <= 0) return null;

    const principal = property - down;

    // Calculate first payment based on amortization type
    let firstPayment: number;
    if (amortizationType === "SAC") {
      const monthlyPrincipal = principal / months;
      firstPayment = monthlyPrincipal + principal * rate;
    } else {
      firstPayment = principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    }

    const isAffordable = firstPayment <= maxPayment;
    const difference = firstPayment - maxPayment;

    // Calculate max affordable property value
    let maxAffordableProperty: number;
    if (amortizationType === "PRICE") {
      const maxPrincipal = maxPayment * (Math.pow(1 + rate, months) - 1) / (rate * Math.pow(1 + rate, months));
      maxAffordableProperty = maxPrincipal + down;
    } else {
      const maxPrincipal = maxPayment / (1 / months + rate);
      maxAffordableProperty = maxPrincipal + down;
    }

    // Calculate minimum term for current property value
    let minTermMonths: number | null = null;
    if (!isAffordable && principal > 0) {
      if (amortizationType === "PRICE") {
        for (let n = 12; n <= 420; n += 12) {
          const payment = principal * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
          if (payment <= maxPayment) {
            minTermMonths = n;
            break;
          }
        }
      } else {
        const interestPart = principal * rate;
        if (maxPayment > interestPart) {
          minTermMonths = Math.ceil(principal / (maxPayment - interestPart));
        }
      }
    }

    return {
      isAffordable,
      firstPayment,
      difference,
      maxAffordableProperty,
      minTermMonths
    };
  }, [enableMaxPayment, maxPaymentValue, propertyValue, downPayment, interestRate, interestRateType, termMonths, amortizationType]);

  // Use live market data for correction rates when available
  const { data: marketData, isLive: marketIsLive } = useMarketData();

  const getCorrectionRate = (index: CorrectionIndexType): number => {
    switch (index) {
      case "tr":
        return (marketData.rates.tr?.value ?? 0.10) / 12 / 100;
      case "ipca":
        return (marketData.rates.ipca?.value ?? 4.50) / 12 / 100;
      case "igpm":
        return 5.00 / 12 / 100; // IGP-M not in our API
      default:
        return 0;
    }
  };

  const getLiveRateLabel = (index: string): string => {
    const rate = marketData.rates[index];
    if (!rate) return "—";
    return `${rate.value.toFixed(2).replace(".", ",")}% ${rate.period}`;
  };

  const calculations = useMemo(() => {
    const principal = parseCurrency(propertyValue) - parseCurrency(downPayment);
    const annualRate = interestRateType === "monthly" ?
    parseCurrency(interestRate) * 12 :
    parseCurrency(interestRate);
    const monthlyRate = annualRate / 100 / 12;
    const months = parseInt(termMonths) || 360;
    const fees = parseCurrency(feesInsurance);
    const extraAmort = enableExtraAmortization ? parseCurrency(extraAmortizationValue) : 0;
    const reinforcement = enableReinforcements ? parseCurrency(reinforcementValue) : 0;
    const correctionRate = getCorrectionRate(correctionIndex);

    if (principal <= 0 || monthlyRate <= 0 || months <= 0) {
      return null;
    }

    let schedule: ScheduleItem[] = [];
    let balance = principal;
    let totalPaid = 0;
    let totalInterest = 0;
    let totalCorrection = 0;

    const getReinforcementForMonth = (month: number): number => {
      if (!enableReinforcements) return 0;
      switch (reinforcementFrequency) {
        case "monthly":
          return reinforcement;
        case "semiannual":
          return month % 6 === 0 ? reinforcement : 0;
        case "annual":
          return month % 12 === 0 ? reinforcement : 0;
        default:
          return 0;
      }
    };

    if (amortizationType === "SAC") {
      const monthlyPrincipal = principal / months;

      for (let month = 1; month <= months && balance > 0; month++) {
        const currentDate = addMonths(startDate, month - 1);
        const debt = balance;
        const correction = debt * correctionRate;
        const correctedDebt = debt + correction;
        balance = correctedDebt; // Apply correction to balance
        const interest = correctedDebt * monthlyRate;
        let payment = monthlyPrincipal + interest + fees;
        const reinforcementThisMonth = getReinforcementForMonth(month);
        let extraPayment = extraAmort + reinforcementThisMonth;

        if (extraPayment > balance - monthlyPrincipal) {
          extraPayment = Math.max(0, balance - monthlyPrincipal);
        }

        const actualPrincipal = Math.min(monthlyPrincipal + extraPayment, balance);
        balance = Math.max(0, balance - actualPrincipal);

        totalPaid += payment + extraPayment;
        totalInterest += interest;
        totalCorrection += correction;

        schedule.push({
          month,
          payment: payment + extraPayment,
          principal: actualPrincipal,
          interest,
          balance,
          extraPayment,
          debt,
          correction,
          correctedDebt,
          fees,
          hasReinforcement: reinforcementThisMonth > 0,
          date: currentDate
        });

        if (balance <= 0) break;
      }
    } else {
      // PRICE system
      const fixedPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (
      Math.pow(1 + monthlyRate, months) - 1);

      for (let month = 1; month <= months && balance > 0; month++) {
        const currentDate = addMonths(startDate, month - 1);
        const debt = balance;
        const correction = debt * correctionRate;
        const correctedDebt = debt + correction;
        balance = correctedDebt; // Apply correction to balance
        const interest = correctedDebt * monthlyRate;
        let principalPart = fixedPayment - interest;
        const reinforcementThisMonth = getReinforcementForMonth(month);
        let extraPayment = extraAmort + reinforcementThisMonth;

        if (extraPayment > balance - principalPart) {
          extraPayment = Math.max(0, balance - principalPart);
        }

        const actualPrincipal = Math.min(principalPart + extraPayment, balance);
        balance = Math.max(0, balance - actualPrincipal);

        totalPaid += fixedPayment + fees + extraPayment;
        totalInterest += interest;
        totalCorrection += correction;

        schedule.push({
          month,
          payment: fixedPayment + fees + extraPayment,
          principal: actualPrincipal,
          interest,
          balance,
          extraPayment,
          debt,
          correction,
          correctedDebt,
          fees,
          hasReinforcement: reinforcementThisMonth > 0,
          date: currentDate
        });

        if (balance <= 0) break;
      }
    }

    const firstPayment = schedule[0]?.payment || 0;
    const lastPayment = schedule[schedule.length - 1]?.payment || 0;
    const actualTermMonths = schedule.length;
    const monthsSaved = months - actualTermMonths;
    const interestSaved = enableExtraAmortization || enableReinforcements ?
    principal * monthlyRate * months - totalInterest :
    0;

    return {
      principal,
      firstPayment,
      lastPayment,
      totalPaid,
      totalInterest,
      totalCorrection,
      schedule,
      actualTermMonths,
      monthsSaved,
      interestSaved
    };
  }, [propertyValue, downPayment, interestRate, interestRateType, termMonths, amortizationType, correctionIndex,
  enableExtraAmortization, extraAmortizationValue, extraAmortizationType,
  enableReinforcements, reinforcementValue, reinforcementFrequency, startDate, feesInsurance]);

  const financingData: FinancingData = {
    propertyValue: parseCurrency(propertyValue),
    downPayment: parseCurrency(downPayment),
    interestRate: parseCurrency(interestRate),
    interestRateType,
    termMonths: parseInt(termMonths) || 360,
    amortizationType,
    correctionIndex,
    startDate,
    feesInsurance: parseCurrency(feesInsurance),
    extraAmortization: enableExtraAmortization ? parseCurrency(extraAmortizationValue) : 0,
    enableExtraAmortization,
    reinforcementValue: parseCurrency(reinforcementValue),
    enableReinforcements,
    reinforcementFrequency,
    includeMonthlyPayment
  };

  return (
    <TooltipProvider>
      <div className="space-y-8 pb-16">
        <Card className="shadow-card p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Simulador Financeiro
              <HP12CCalculator />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Dados do Financiamento */}
            <div className="border rounded-lg p-4 space-y-4 bg-card">
              <h3 className="font-semibold text-foreground">
                Dados do Financiamento
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyValue">Valor do Imóvel (R$)</Label>
                  <Input
                    ref={propertyValueRef}
                    id="propertyValue"
                    value={formatCurrency(propertyValue)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setPropertyValue)}
                    placeholder="150.000,00"
                    className="text-sm" />
                  
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downPayment">Valor de Entrada (R$)</Label>
                  <Input
                    ref={downPaymentRef}
                    id="downPayment"
                    value={formatCurrency(downPayment)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setDownPayment)}
                    placeholder="30.000,00"
                    className="text-sm" />
                  
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Taxa de Juros (%)</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={interestRateRef}
                      id="interestRate"
                      type="number"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder={interestRateType === "annual" ? "10.5" : "0.87"}
                      className="text-sm flex-1" />
                    
                    <Select
                      value={interestRateType}
                      onValueChange={(v) => setInterestRateType(v as "annual" | "monthly")}>
                      
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Anual</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Data de Início (1ª Parcela)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        ref={startDateRef}
                        variant="outline"
                        className={cn(
                          "w-full h-[42px] justify-start text-left font-normal text-sm",
                          !startDate && "text-muted-foreground"
                        )}>
                        
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        initialFocus
                        className="p-3 pointer-events-auto" />
                      
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termMonths">Prazo (meses)</Label>
                  <Input
                    ref={termMonthsRef}
                    id="termMonths"
                    type="number"
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value)}
                    placeholder="360"
                    className="text-sm" />
                  
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="feesInsurance">Taxas/Seguros (R$)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Valor mensal de taxas administrativas e seguros obrigatórios (MIP, DFI, etc.)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    ref={feesRef}
                    id="feesInsurance"
                    value={formatCurrency(feesInsurance)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setFeesInsurance)}
                    placeholder="50,00"
                    className="text-sm" />
                  
                </div>
              </div>
              
              {/* Amortization Type and Correction Index Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Sistema de Amortização</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="font-semibold mb-1">SAC (Sistema de Amortização Constante)</p>
                        <p className="text-sm mb-2">A amortização é constante e os juros diminuem ao longo do tempo, resultando em parcelas decrescentes.</p>
                        <p className="font-semibold mb-1">PRICE (Tabela Price)</p>
                        <p className="text-sm">Parcelas fixas durante todo o financiamento. No início, a maior parte é juros; no final, é amortização.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={amortizationType}
                    onValueChange={(v) => setAmortizationType(v as "SAC" | "PRICE")}>
                    
                    <SelectTrigger ref={amortizationRef} className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAC" className="text-sm">SAC - Parcelas decrescentes</SelectItem>
                      <SelectItem value="PRICE" className="text-sm">PRICE - Parcelas fixas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 rounded-lg border-2 border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <Label className="text-primary font-semibold">Indexador de Correção</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-primary/60 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="font-semibold mb-1">Correção Monetária {marketIsLive ? "(Live)" : ""}</p>
                        <p className="text-sm mb-2">O indexador corrige o saldo devedor mensalmente, impactando o valor total pago.</p>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>TR: {getLiveRateLabel("tr")} | IPCA: {getLiveRateLabel("ipca")}</p>
                          <p>CDI: {getLiveRateLabel("cdi")} | Selic: {getLiveRateLabel("selic")}</p>
                          <p>Poupança: {getLiveRateLabel("poupanca")} | IGP-M: ~5,00% a.a.</p>
                        </div>
                        {marketIsLive && <p className="text-[10px] text-emerald-500 mt-1">● Dados via API oficial BCB</p>}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={correctionIndex}
                    onValueChange={(v) => setCorrectionIndex(v as CorrectionIndexType)}>
                    
                    <SelectTrigger className="h-10 text-sm border-primary/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="isento" className="text-sm">Isento (0%)</SelectItem>
                      <SelectItem value="tr" className="text-sm">TR (estimada)</SelectItem>
                      <SelectItem value="ipca" className="text-sm">IPCA</SelectItem>
                      <SelectItem value="igpm" className="text-sm">IGP-M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Max Affordable Payment */}
            <div className="border rounded-lg p-4 space-y-4 bg-accent/30 border-accent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-accent-foreground" />
                  <Label htmlFor="maxPayment" className="font-medium">
                    Parcela Máxima que Posso Pagar
                  </Label>
                </div>
                <Switch
                  id="maxPayment"
                  checked={enableMaxPayment}
                  onCheckedChange={setEnableMaxPayment} />
                
              </div>
              {enableMaxPayment &&
              <div className="space-y-4 animate-slide-up">
                  <div className="space-y-2">
                    <Label>Valor Máximo da Parcela (R$)</Label>
                    <Input
                    value={formatCurrency(maxPaymentValue)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setMaxPaymentValue)}
                    placeholder="3.000,00"
                    className="text-sm" />
                  
                  </div>
                  
                  {affordabilityAnalysis &&
                <div className="space-y-3">
                      {affordabilityAnalysis.isAffordable ?
                  <Alert className="bg-success/10 border-success/30">
                          <AlertDescription className="text-success">
                            ✓ <strong>Parcela dentro do orçamento!</strong> A primeira parcela de{" "}
                            <strong>R$ {affordabilityAnalysis.firstPayment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>{" "}
                            está abaixo do limite de R$ {parseCurrency(maxPaymentValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.
                          </AlertDescription>
                        </Alert> :

                  <Alert className="bg-warning/10 border-warning/30">
                          <AlertDescription className="text-warning space-y-2">
                            <p>
                              ⚠️ <strong>Parcela acima do orçamento.</strong> A primeira parcela seria de{" "}
                              <strong>R$ {affordabilityAnalysis.firstPayment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>{" "}
                              (R$ {affordabilityAnalysis.difference.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} acima do limite).
                            </p>
                            <div className="mt-3 pt-3 border-t border-warning/30 space-y-2">
                              <p className="font-medium">Sugestões para caber no orçamento:</p>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>
                                  Imóvel de até <strong>R$ {affordabilityAnalysis.maxAffordableProperty.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong>
                                </li>
                                {affordabilityAnalysis.minTermMonths &&
                          <li>
                                    Prazo de pelo menos <strong>{affordabilityAnalysis.minTermMonths} meses</strong> ({(affordabilityAnalysis.minTermMonths / 12).toFixed(1)} anos)
                                  </li>
                          }
                                <li>Aumentar o valor da entrada</li>
                              </ul>
                            </div>
                          </AlertDescription>
                        </Alert>
                  }
                    </div>
                }
                </div>
              }
            </div>

            {/* Extra Amortization */}
            <div ref={extraAmortRef} className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-primary" />
                  <Label htmlFor="extraAmortization" className="font-medium">
                    Amortização Extra Mensal
                  </Label>
                </div>
                <Switch
                  id="extraAmortization"
                  checked={enableExtraAmortization}
                  onCheckedChange={setEnableExtraAmortization} />
                
              </div>
              {enableExtraAmortization &&
              <div className="space-y-4 animate-slide-up">
                  <div className="space-y-2">
                    <Label>Valor da Amortização Extra</Label>
                    <Input
                    value={formatCurrency(extraAmortizationValue)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setExtraAmortizationValue)}
                    placeholder="1.000,00" />
                  
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Redução</Label>
                    <Select
                    value={extraAmortizationType}
                    onValueChange={(v) => setExtraAmortizationType(v as "reduce-term" | "reduce-payment")}>
                    
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reduce-term">Reduzir Prazo</SelectItem>
                        <SelectItem value="reduce-payment">Reduzir Parcela</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              }
            </div>

            {/* Scheduled Reinforcements */}
            <div ref={reinforcementRef} className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <Label htmlFor="reinforcements" className="font-medium">
                    Reforços Programados
                  </Label>
                </div>
                <Switch
                  id="reinforcements"
                  checked={enableReinforcements}
                  onCheckedChange={setEnableReinforcements} />
                
              </div>
              {enableReinforcements &&
              <div className="space-y-4 animate-slide-up">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor do Reforço (R$)</Label>
                      <Input
                      value={formatCurrency(reinforcementValue)}
                      onChange={(e) => handleCurrencyInput(e.target.value, setReinforcementValue)}
                      placeholder="5.000" />
                    
                    </div>
                    <div className="space-y-2">
                      <Label>Frequência</Label>
                      <Select
                      value={reinforcementFrequency}
                      onValueChange={(v) => setReinforcementFrequency(v as "monthly" | "semiannual" | "annual")}>
                      
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="semiannual">Semestral</SelectItem>
                          <SelectItem value="annual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                    id="includeMonthlyPayment"
                    checked={includeMonthlyPayment}
                    onCheckedChange={setIncludeMonthlyPayment} />
                  
                    <Label htmlFor="includeMonthlyPayment" className="text-sm">
                      Incluir parcela do mês junto com o reforço
                    </Label>
                  </div>
                </div>
              }
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {calculations &&
        <div className="space-y-8">
            <CalculationResults
            calculations={calculations}
            amortizationType={amortizationType} />
          
            <AmortizationSchedule
            schedule={calculations.schedule}
            amortizationType={amortizationType} />
          
            <ProposalGenerator
            calculations={calculations}
            propertyValue={parseCurrency(propertyValue)}
            downPayment={parseCurrency(downPayment)}
            interestRate={parseCurrency(interestRate)}
            termMonths={parseInt(termMonths) || 360}
            amortizationType={amortizationType} />
          
          </div>
        }
      </div>
    </TooltipProvider>);

}