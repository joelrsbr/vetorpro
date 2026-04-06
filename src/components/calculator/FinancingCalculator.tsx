import { useState, useMemo, useRef, useContext, useCallback, useEffect } from "react";
import { useSimulation } from "@/contexts/SimulationContext";
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
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Crown, Lock } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

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

export type CorrectionIndexType = "isento" | "tr" | "ipca" | "igpm" | "incc" | "poupanca" | "custom";

export type ReinforcementType = "entrega_chave" | "assinatura_contrato" | "quitacao" | "custom";

export interface ReinforcementEntry {
  id: number;
  type: ReinforcementType;
  value: string;
  monthYear: string; // format: "YYYY-MM"
}

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
  reinforcements: ReinforcementEntry[];
  enableReinforcements: boolean;
  includeMonthlyPayment: boolean;
}

export function FinancingCalculator() {
  // Shared state from context
  const {
    propertyValue, setPropertyValue,
    downPayment, setDownPayment,
    interestRate, setInterestRate,
    termMonths, setTermMonths,
    amortizationType, setAmortizationType,
  } = useSimulation();

  const { user, usageLimits, incrementSimulationCount, refreshUsageLimits } = useAuth();
  const { plan, isActive } = useSubscription();
  const { toast } = useToast();
  const [savingSimulation, setSavingSimulation] = useState(false);
  const [simulationUnlocked, setSimulationUnlocked] = useState(false);
  const [clientName, setClientName] = useState("");
  const [propertyDescription, setPropertyDescription] = useState("");
  const [buyerAge, setBuyerAge] = useState("");
  const [regionalM2Value, setRegionalM2Value] = useState("");
  const location = useLocation();

  // CRM edit tracking: store original values to detect changes
  const [editingSimulationId, setEditingSimulationId] = useState<string | null>(null);
  const [originalFinancialValues, setOriginalFinancialValues] = useState<Record<string, string> | null>(null);

  // Load data from navigation state (CRM edit flow)
  useEffect(() => {
    const state = location.state as Record<string, string> | null;
    if (!state) return;
    if (state.clientName) setClientName(state.clientName);
    if (state.propertyDescription) setPropertyDescription(state.propertyDescription);
    if (state.propertyValue) setPropertyValue(state.propertyValue);
    if (state.downPayment) setDownPayment(state.downPayment);
    if (state.interestRate) setInterestRate(state.interestRate);
    if (state.termMonths) setTermMonths(state.termMonths);
    if (state.amortizationType) setAmortizationType(state.amortizationType as "SAC" | "PRICE");

    // If coming from CRM edit, track original values and auto-unlock
    if (state.fromCRM === "true") {
      setEditingSimulationId(state.simulationId || null);
      setOriginalFinancialValues({
        propertyValue: state.propertyValue || "",
        downPayment: state.downPayment || "",
        interestRate: state.interestRate || "",
        termMonths: state.termMonths || "",
        amortizationType: state.amortizationType || "",
      });
      setSimulationUnlocked(true); // Already paid — free re-view
    }

    // Clear location state to avoid re-loading on re-render
    window.history.replaceState({}, document.title);
  }, []);
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

  // Reactive edit: reset unlock when financial values change from original CRM values
  useEffect(() => {
    if (!originalFinancialValues) return;
    const currentValues = {
      propertyValue,
      downPayment,
      interestRate,
      termMonths,
      amortizationType,
    };
    const hasChanged = Object.keys(originalFinancialValues).some(
      (key) => originalFinancialValues[key] !== (currentValues as Record<string, string>)[key]
    );
    if (hasChanged) {
      setSimulationUnlocked(false);
    }
  }, [propertyValue, downPayment, interestRate, termMonths, amortizationType, originalFinancialValues]);

  const [interestRateType, setInterestRateType] = useState<"annual" | "monthly">("annual");
  const [correctionIndex, setCorrectionIndex] = useState<CorrectionIndexType>("isento");
  const [customCorrectionRate, setCustomCorrectionRate] = useState<string>("6");
  const [startDate, setStartDate] = useState<Date>(addMonths(new Date(), 1));
  const [feesInsurance, setFeesInsurance] = useState<string>("5000");

  // Max affordable payment
  const [enableMaxPayment, setEnableMaxPayment] = useState(false);
  const [maxPaymentValue, setMaxPaymentValue] = useState<string>("300000");

  // Extra amortization
  const [enableExtraAmortization, setEnableExtraAmortization] = useState(false);

  const [extraAmortizationValue, setExtraAmortizationValue] = useState<string>("100000");
  const [extraAmortizationType, setExtraAmortizationType] = useState<"reduce-term" | "reduce-payment">("reduce-term");

  // Structured reinforcements
  const [enableReinforcements, setEnableReinforcements] = useState(false);
  const [reinforcements, setReinforcements] = useState<ReinforcementEntry[]>([]);
  const [nextReinforcementId, setNextReinforcementId] = useState(1);
  const [includeMonthlyPayment, setIncludeMonthlyPayment] = useState(true);

  const addReinforcement = () => {
    const defaultMonth = format(addMonths(startDate, 12), "yyyy-MM");
    setReinforcements(prev => [
      ...prev,
      { id: nextReinforcementId, type: "entrega_chave", value: "500000", monthYear: defaultMonth },
    ]);
    setNextReinforcementId(prev => prev + 1);
  };

  const updateReinforcement = (id: number, field: keyof ReinforcementEntry, val: string) => {
    setReinforcements(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const removeReinforcement = (id: number) => {
    setReinforcements(prev => prev.filter(r => r.id !== id));
  };

  const reinforcementTypeLabels: Record<ReinforcementType, string> = {
    entrega_chave: "Entrega da Chave",
    assinatura_contrato: "Assinatura do Contrato",
    quitacao: "Documento de Quitação",
    custom: "Personalizado",
  };

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

  // Reset unlock state when calculation inputs change
  // Using useEffect to avoid side effects in render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _resetKey = `${propertyValue}-${downPayment}-${interestRate}-${termMonths}-${amortizationType}`;
  const [prevResetKey, setPrevResetKey] = useState(_resetKey);
  if (_resetKey !== prevResetKey) {
    setPrevResetKey(_resetKey);
    setSimulationUnlocked(false);
  }

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
        return 5.00 / 12 / 100;
      case "incc":
        return 6.00 / 12 / 100;
      case "poupanca":
        return (marketData.rates.poupanca?.value ?? 0.63) / 100;
      case "custom":
        return (parseFloat(customCorrectionRate.replace(",", ".")) || 0) / 12 / 100;
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
    const correctionRate = getCorrectionRate(correctionIndex);

    if (principal <= 0 || monthlyRate < 0 || months <= 0) {
      return null;
    }

    // Build a map of month -> reinforcement total based on structured entries
    const reinforcementByMonth = new Map<number, number>();
    if (enableReinforcements) {
      reinforcements.forEach(r => {
        const rVal = (parseInt(r.value.replace(/\D/g, "")) || 0) / 100;
        if (rVal <= 0 || !r.monthYear) return;
        const [year, mon] = r.monthYear.split("-").map(Number);
        const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
        const targetMonth = year * 12 + (mon - 1);
        const diff = targetMonth - startMonth + 1;
        if (diff > 0 && diff <= months) {
          reinforcementByMonth.set(diff, (reinforcementByMonth.get(diff) || 0) + rVal);
        }
      });
    }

    let schedule: ScheduleItem[] = [];
    let balance = principal;
    let totalPaid = 0;
    let totalInterest = 0;
    let totalCorrection = 0;

    const getReinforcementForMonth = (month: number): number => {
      if (!enableReinforcements) return 0;
      return reinforcementByMonth.get(month) || 0;
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
      const fixedPayment = monthlyRate === 0
        ? principal / months
        : principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (
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
  }, [propertyValue, downPayment, interestRate, interestRateType, termMonths, amortizationType, correctionIndex, customCorrectionRate,
  enableExtraAmortization, extraAmortizationValue, extraAmortizationType,
  enableReinforcements, reinforcements, startDate, feesInsurance]);

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
    reinforcements,
    enableReinforcements,
    includeMonthlyPayment
  };

  const canSimulate = usageLimits?.canSimulate ?? false;
  const isUnlimited = (plan === "pro" || plan === "business") && isActive;

  const handleSaveSimulation = useCallback(async (): Promise<boolean> => {
    if (!user || !calculations) return false;

    if (!clientName.trim() || !propertyDescription.trim()) {
      toast({
        title: "Identificação obrigatória",
        description: "Por favor, identifique o cliente e o imóvel para salvar esta simulação no seu histórico.",
        variant: "destructive",
      });
      return false;
    }
    
    if (!isUnlimited && !canSimulate) {
      toast({
        title: "Limite atingido",
        description: `Libere esta análise para o cliente ${clientName.trim() || "atual"} agora. Faça upgrade para o Professional.`,
        variant: "destructive",
      });
      return false;
    }

    setSavingSimulation(true);
    try {
      const simulationData = {
        user_id: user.id,
        property_value: parseCurrency(propertyValue),
        down_payment: parseCurrency(downPayment),
        interest_rate: parseCurrency(interestRate),
        term_months: parseInt(termMonths) || 360,
        amortization_type: amortizationType.toLowerCase() as "sac" | "price",
        monthly_payment: calculations.firstPayment,
        total_paid: calculations.totalPaid,
        total_interest: calculations.totalInterest,
        extra_amortization: enableExtraAmortization ? parseCurrency(extraAmortizationValue) : null,
        extra_amortization_strategy: enableExtraAmortization ? (extraAmortizationType === "reduce-term" ? "reduce_term" : "reduce_payment") as "reduce_term" | "reduce_payment" : null,
        client_name: clientName.trim(),
        property_description: propertyDescription.trim(),
      };

      let error;
      if (editingSimulationId) {
        // Update existing record in the dashboard
        const result = await supabase.from("simulations").update(simulationData).eq("id", editingSimulationId).eq("user_id", user.id);
        error = result.error;
      } else {
        const result = await supabase.from("simulations").insert(simulationData);
        error = result.error;
      }

      if (error) throw error;

      // Update original values so re-viewing remains free
      setOriginalFinancialValues({
        propertyValue,
        downPayment,
        interestRate,
        termMonths,
        amortizationType,
      });

      await incrementSimulationCount();
      await refreshUsageLimits();
      toast({
        title: "Tabela desbloqueada! ✅",
        description: `Simulação ${editingSimulationId ? "atualizada" : "salva"} no histórico. ${isUnlimited ? "" : `Restam ${(usageLimits?.simulationsRemaining ?? 1) - 1} créditos.`}`,
      });
      return true;
    } catch (err) {
      console.error("Error saving simulation:", err);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a simulação.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSavingSimulation(false);
    }
  }, [user, calculations, clientName, propertyDescription, propertyValue, downPayment, interestRate, termMonths, amortizationType, enableExtraAmortization, extraAmortizationValue, extraAmortizationType, isUnlimited, canSimulate, usageLimits, refreshUsageLimits, editingSimulationId]);

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

              {/* Idade do Comprador e Valor m² Regional */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="buyerAge">Idade do Comprador</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">A idade influencia o custo do seguro obrigatório (MIP) e o prazo máximo do financiamento.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="buyerAge"
                    type="number"
                    min="18"
                    max="99"
                    value={buyerAge}
                    onChange={(e) => setBuyerAge(e.target.value)}
                    placeholder="Ex: 35"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="regionalM2">Valor Médio m² Regional (R$)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Insira o valor médio da região para comparar se este imóvel é uma Oportunidade ou um Desafio de venda.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="regionalM2"
                    value={formatCurrency(regionalM2Value)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setRegionalM2Value)}
                    placeholder="8.500,00"
                    className="text-sm"
                  />
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
                    onValueChange={(v) => {
                      const newIndex = v as CorrectionIndexType;
                      if (newIndex !== "custom") {
                        setCustomCorrectionRate("6");
                      }
                      setCorrectionIndex(newIndex);
                    }}>
                    
                    <SelectTrigger className="h-10 text-sm border-primary/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="isento" className="text-sm">Isento (0%)</SelectItem>
                      <SelectItem value="ipca" className="text-sm">
                        IPCA {marketData.rates.ipca ? `(${marketData.rates.ipca.value.toFixed(2).replace(".", ",")}% ${marketData.rates.ipca.period})` : ""}
                      </SelectItem>
                      <SelectItem value="igpm" className="text-sm">IGP-M (~5,00% a.a.)</SelectItem>
                      <SelectItem value="incc" className="text-sm">INCC (~6,00% a.a.)</SelectItem>
                      <SelectItem value="tr" className="text-sm">
                        TR {marketData.rates.tr ? `(${marketData.rates.tr.value.toFixed(2).replace(".", ",")}% ${marketData.rates.tr.period})` : "(estimada)"}
                      </SelectItem>
                      <SelectItem value="poupanca" className="text-sm">
                        Poupança {marketData.rates.poupanca ? `(${marketData.rates.poupanca.value.toFixed(2).replace(".", ",")}% ${marketData.rates.poupanca.period})` : ""}
                      </SelectItem>
                      <SelectItem value="custom" className="text-sm">Digitar Taxa (Personalizado)</SelectItem>
                    </SelectContent>
                  </Select>
                  {correctionIndex !== "custom" && correctionIndex !== "isento" && (
                    <p className="text-xs italic text-muted-foreground mt-1.5">
                      Utilizando taxa oficial de mercado ({(() => {
                        const rateMap: Record<string, string> = {
                          ipca: marketData.rates.ipca ? `${marketData.rates.ipca.value.toFixed(2).replace(".", ",")}% ${marketData.rates.ipca.period}` : "—",
                          igpm: "~5,00% a.a.",
                          incc: "~6,00% a.a.",
                          tr: marketData.rates.tr ? `${marketData.rates.tr.value.toFixed(2).replace(".", ",")}% ${marketData.rates.tr.period}` : "estimada",
                          poupanca: marketData.rates.poupanca ? `${marketData.rates.poupanca.value.toFixed(2).replace(".", ",")}% ${marketData.rates.poupanca.period}` : "—",
                        };
                        return rateMap[correctionIndex] || "—";
                      })()})
                    </p>
                  )}
                  {correctionIndex === "custom" && (
                    <div className="mt-2">
                      <Label className="text-xs text-muted-foreground">Taxa de Correção Anual (%)</Label>
                      <Input
                        value={customCorrectionRate}
                        onChange={(e) => setCustomCorrectionRate(e.target.value)}
                        placeholder="6,00"
                        className="h-9 text-sm mt-1"
                      />
                    </div>
                  )}
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
                    Arquitetura de Reforços Estratégicos
                  </Label>
                </div>
                <Switch
                  id="reinforcements"
                  checked={enableReinforcements}
                  onCheckedChange={setEnableReinforcements} />
                
              </div>
              {enableReinforcements &&
              <div className="space-y-4 animate-slide-up">
                  {reinforcements.map((r, idx) => {
                    // Calculate month number relative to startDate
                    let monthNumber: number | null = null;
                    let realDateLabel = "";
                    if (r.monthYear) {
                      const [year, mon] = r.monthYear.split("-").map(Number);
                      const startMonth = startDate.getFullYear() * 12 + startDate.getMonth();
                      const targetMonth = year * 12 + (mon - 1);
                      monthNumber = targetMonth - startMonth + 1;
                      const targetDate = new Date(year, mon - 1);
                      realDateLabel = format(targetDate, "MMMM/yyyy", { locale: ptBR });
                    }
                    return (
                      <div key={r.id} className="border rounded-lg p-3 bg-background/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary">
                              Reforço {idx + 1}{monthNumber !== null && monthNumber > 0 && realDateLabel ? ` — ` : ""}
                              {monthNumber !== null && monthNumber > 0 && realDateLabel && (
                                <span className="capitalize">{realDateLabel}</span>
                              )}
                            </span>
                            {monthNumber !== null && monthNumber <= 0 && (
                              <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                                Data anterior ao início
                              </span>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeReinforcement(r.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Tipo</Label>
                            <Select value={r.type} onValueChange={(v) => updateReinforcement(r.id, "type", v)}>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="entrega_chave">Entrega da Chave</SelectItem>
                                <SelectItem value="assinatura_contrato">Assinatura do Contrato</SelectItem>
                                <SelectItem value="quitacao">Documento de Quitação</SelectItem>
                                <SelectItem value="custom">Personalizado</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground/70 italic leading-tight">Define o gatilho para a amortização (Chaves, Anual, Contrato, Quitação).</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Valor (R$)</Label>
                            <Input
                              value={formatCurrency(r.value)}
                              onChange={(e) => updateReinforcement(r.id, "value", e.target.value.replace(/\D/g, ""))}
                              placeholder="5.000,00"
                              className="h-9 text-sm" />
                            <p className="text-[10px] text-muted-foreground/70 italic leading-tight">Capital destinado à amortização extraordinária neste cenário.</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Data de Referência</Label>
                            <Input
                              type="month"
                              value={r.monthYear}
                              min={format(startDate, "yyyy-MM")}
                              onChange={(e) => updateReinforcement(r.id, "monthYear", e.target.value)}
                              className="h-9 text-sm" />
                            <p className="text-[10px] text-muted-foreground/70 italic leading-tight">Inteligência de Datas Reais — projeta o mês exato do aporte.</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={addReinforcement} className="gap-1 w-full">
                    <Plus className="h-4 w-4" />
                    Adicionar Reforço
                  </Button>
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

            {/* Client identification fields */}
            <Card className="shadow-card">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Dados do Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="simClientName">Nome do Cliente</Label>
                    <Input
                      id="simClientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="simPropertyDesc">Identificação do Imóvel</Label>
                    <Input
                      id="simPropertyDesc"
                      value={propertyDescription}
                      onChange={(e) => setPropertyDescription(e.target.value)}
                      placeholder="Ex: Apto 120m² - Bairro Centro"
                      className="text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unlock / Save Button */}
            {user ? (
              <div className="flex flex-col gap-3">
                {simulationUnlocked ? (
                  <Button disabled className="gap-2 bg-success text-success-foreground font-medium cursor-default opacity-100">
                    <Save className="h-4 w-4" />
                    Simulação Salva no Histórico ✔️
                  </Button>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={async () => {
                        const success = await handleSaveSimulation();
                        if (success) setSimulationUnlocked(true);
                      }}
                      disabled={savingSimulation || (!isUnlimited && !canSimulate) || !clientName.trim() || !propertyDescription.trim()}
                      variant="hero"
                      className="gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      {savingSimulation ? "Desbloqueando..." : "Liberar Tabela Completa e Gerar Relatório"}
                    </Button>
                    {!isUnlimited && (
                      <span className="text-sm text-muted-foreground">
                        {canSimulate
                          ? `${usageLimits?.simulationsRemaining ?? 0} de 10 restantes`
                          : (
                            <span className="flex items-center gap-1 text-destructive">
                              <Lock className="h-3.5 w-3.5" />
                              Libere esta análise para {clientName.trim() || "o cliente"} — <Link to="/precos" className="underline text-primary">Upgrade para Professional</Link>
                            </span>
                          )}
                      </span>
                    )}
                  </div>
                )}
                {!simulationUnlocked && (!clientName.trim() || !propertyDescription.trim()) && (
                  <p className="text-sm text-muted-foreground italic">
                    Preencha o Nome do Cliente e a Identificação do Imóvel para liberar.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link to="/login" className="text-primary underline">Faça login</Link> para desbloquear a tabela completa e salvar simulações.
              </p>
            )}
          
            <AmortizationSchedule
            schedule={calculations.schedule}
            amortizationType={amortizationType}
            locked={!simulationUnlocked} />
          
            {simulationUnlocked && (
              <ProposalGenerator
              calculations={calculations}
              propertyValue={parseCurrency(propertyValue)}
              downPayment={parseCurrency(downPayment)}
              interestRate={parseCurrency(interestRate)}
              termMonths={parseInt(termMonths) || 360}
              amortizationType={amortizationType}
              clientName={clientName}
              propertyDescription={propertyDescription} />
            )}
          
          </div>
        }
      </div>
    </TooltipProvider>);

}