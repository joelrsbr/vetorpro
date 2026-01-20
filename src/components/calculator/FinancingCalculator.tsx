import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Plus, Minus, Wallet } from "lucide-react";
import { CalculationResults } from "./CalculationResults";
import { AmortizationSchedule } from "./AmortizationSchedule";
import { ProposalGenerator } from "./ProposalGenerator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ScheduleItem {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  extraPayment: number;
}

export function FinancingCalculator() {
  const [propertyValue, setPropertyValue] = useState<string>("150000");
  const [downPayment, setDownPayment] = useState<string>("30000");
  const [interestRate, setInterestRate] = useState<string>("10.5");
  const [interestRateType, setInterestRateType] = useState<"annual" | "monthly">("annual");
  const [termMonths, setTermMonths] = useState<string>("360");
  const [amortizationType, setAmortizationType] = useState<"SAC" | "PRICE">("SAC");
  
  // Max affordable payment
  const [enableMaxPayment, setEnableMaxPayment] = useState(false);
  const [maxPaymentValue, setMaxPaymentValue] = useState<string>("3000");
  
  // Extra amortization
  const [enableExtraAmortization, setEnableExtraAmortization] = useState(false);
  const [extraAmortizationValue, setExtraAmortizationValue] = useState<string>("500");
  const [extraAmortizationType, setExtraAmortizationType] = useState<"reduce-term" | "reduce-payment">("reduce-term");
  
  // Scheduled reinforcements
  const [enableReinforcements, setEnableReinforcements] = useState(false);
  const [reinforcementValue, setReinforcementValue] = useState<string>("5000");
  const [reinforcementFrequency, setReinforcementFrequency] = useState<"monthly" | "semiannual" | "annual">("annual");

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    const number = parseInt(numericValue) || 0;
    return number.toLocaleString("pt-BR");
  };

  const parseCurrency = (value: string) => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleCurrencyInput = (value: string, setter: (v: string) => void) => {
    const numericValue = value.replace(/\D/g, "");
    setter(numericValue);
  };

  // Calculate affordability analysis when max payment is enabled
  const affordabilityAnalysis = useMemo(() => {
    if (!enableMaxPayment) return null;
    
    const maxPayment = parseCurrency(maxPaymentValue);
    const property = parseCurrency(propertyValue);
    const down = parseCurrency(downPayment);
    const annualRate = interestRateType === "monthly" 
      ? parseCurrency(interestRate) * 12 
      : parseCurrency(interestRate);
    const rate = annualRate / 100 / 12;
    const months = parseInt(termMonths) || 360;
    
    if (maxPayment <= 0 || rate <= 0) return null;
    
    const principal = property - down;
    
    // Calculate first payment based on amortization type
    let firstPayment: number;
    if (amortizationType === "SAC") {
      const monthlyPrincipal = principal / months;
      firstPayment = monthlyPrincipal + (principal * rate);
    } else {
      firstPayment = principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    }
    
    const isAffordable = firstPayment <= maxPayment;
    const difference = firstPayment - maxPayment;
    
    // Calculate max affordable property value
    let maxAffordableProperty: number;
    if (amortizationType === "PRICE") {
      // For PRICE: PMT = P * r * (1+r)^n / ((1+r)^n - 1)
      // Solving for P: P = PMT * ((1+r)^n - 1) / (r * (1+r)^n)
      const maxPrincipal = maxPayment * (Math.pow(1 + rate, months) - 1) / (rate * Math.pow(1 + rate, months));
      maxAffordableProperty = maxPrincipal + down;
    } else {
      // For SAC: First payment = P/n + P*r = P * (1/n + r)
      // Solving for P: P = PMT / (1/n + r)
      const maxPrincipal = maxPayment / (1/months + rate);
      maxAffordableProperty = maxPrincipal + down;
    }
    
    // Calculate minimum term for current property value
    let minTermMonths: number | null = null;
    if (!isAffordable && principal > 0) {
      if (amortizationType === "PRICE") {
        // PMT = P * r * (1+r)^n / ((1+r)^n - 1)
        // This requires iterative solving
        for (let n = 12; n <= 420; n += 12) {
          const payment = principal * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
          if (payment <= maxPayment) {
            minTermMonths = n;
            break;
          }
        }
      } else {
        // SAC: first payment = P/n + P*r
        // P/n + P*r <= maxPayment
        // P/n <= maxPayment - P*r
        // n >= P / (maxPayment - P*r)
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
      minTermMonths,
    };
  }, [enableMaxPayment, maxPaymentValue, propertyValue, downPayment, interestRate, interestRateType, termMonths, amortizationType]);

  const calculations = useMemo(() => {
    const principal = parseCurrency(propertyValue) - parseCurrency(downPayment);
    const annualRate = interestRateType === "monthly" 
      ? parseCurrency(interestRate) * 12 
      : parseCurrency(interestRate);
    const monthlyRate = annualRate / 100 / 12;
    const months = parseInt(termMonths) || 360;
    const extraAmort = enableExtraAmortization ? parseCurrency(extraAmortizationValue) : 0;
    const reinforcement = enableReinforcements ? parseCurrency(reinforcementValue) : 0;

    if (principal <= 0 || monthlyRate <= 0 || months <= 0) {
      return null;
    }

    let schedule: ScheduleItem[] = [];
    let balance = principal;
    let totalPaid = 0;
    let totalInterest = 0;

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
        const interest = balance * monthlyRate;
        let payment = monthlyPrincipal + interest;
        let extraPayment = extraAmort + getReinforcementForMonth(month);
        
        if (extraPayment > balance - monthlyPrincipal) {
          extraPayment = Math.max(0, balance - monthlyPrincipal);
        }
        
        const actualPrincipal = Math.min(monthlyPrincipal + extraPayment, balance);
        balance = Math.max(0, balance - actualPrincipal);
        
        totalPaid += payment + extraPayment;
        totalInterest += interest;
        
        schedule.push({
          month,
          payment: payment + extraPayment,
          principal: actualPrincipal,
          interest,
          balance,
          extraPayment,
        });
        
        if (balance <= 0) break;
      }
    } else {
      // PRICE system
      const fixedPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                          (Math.pow(1 + monthlyRate, months) - 1);
      
      for (let month = 1; month <= months && balance > 0; month++) {
        const interest = balance * monthlyRate;
        let principalPart = fixedPayment - interest;
        let extraPayment = extraAmort + getReinforcementForMonth(month);
        
        if (extraPayment > balance - principalPart) {
          extraPayment = Math.max(0, balance - principalPart);
        }
        
        const actualPrincipal = Math.min(principalPart + extraPayment, balance);
        balance = Math.max(0, balance - actualPrincipal);
        
        totalPaid += fixedPayment + extraPayment;
        totalInterest += interest;
        
        schedule.push({
          month,
          payment: fixedPayment + extraPayment,
          principal: actualPrincipal,
          interest,
          balance,
          extraPayment,
        });
        
        if (balance <= 0) break;
      }
    }

    const firstPayment = schedule[0]?.payment || 0;
    const lastPayment = schedule[schedule.length - 1]?.payment || 0;
    const actualTermMonths = schedule.length;
    const monthsSaved = months - actualTermMonths;
    const interestSaved = enableExtraAmortization || enableReinforcements 
      ? (principal * monthlyRate * months) - totalInterest
      : 0;

    return {
      principal,
      firstPayment,
      lastPayment,
      totalPaid,
      totalInterest,
      schedule,
      actualTermMonths,
      monthsSaved,
      interestSaved,
    };
  }, [propertyValue, downPayment, interestRate, interestRateType, termMonths, amortizationType, 
      enableExtraAmortization, extraAmortizationValue, extraAmortizationType,
      enableReinforcements, reinforcementValue, reinforcementFrequency]);

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Simulador de Financiamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amortization Type Selection */}
          <div className="space-y-2">
            <Label>Sistema de Amortização</Label>
            <Select
              value={amortizationType}
              onValueChange={(v) => setAmortizationType(v as "SAC" | "PRICE")}
            >
              <SelectTrigger className="text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAC">SAC - Parcelas decrescentes</SelectItem>
                <SelectItem value="PRICE">Price - Parcelas fixas</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {amortizationType === "SAC" 
                ? "SAC: A amortização é constante e os juros diminuem ao longo do tempo, resultando em parcelas decrescentes."
                : "Price: Parcelas fixas durante todo o financiamento. No início, a maior parte é juros; no final, é amortização."}
            </p>
          </div>

          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyValue">Valor do Imóvel (R$)</Label>
              <Input
                id="propertyValue"
                value={formatCurrency(propertyValue)}
                onChange={(e) => handleCurrencyInput(e.target.value, setPropertyValue)}
                placeholder="500.000"
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="downPayment">Valor de Entrada (R$)</Label>
              <Input
                id="downPayment"
                value={formatCurrency(downPayment)}
                onChange={(e) => handleCurrencyInput(e.target.value, setDownPayment)}
                placeholder="100.000"
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interestRate">Taxa de Juros (%)</Label>
              <div className="flex gap-2">
                <Input
                  id="interestRate"
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder={interestRateType === "annual" ? "10.5" : "0.87"}
                  className="text-lg flex-1"
                />
                <Select
                  value={interestRateType}
                  onValueChange={(v) => setInterestRateType(v as "annual" | "monthly")}
                >
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
              <Label htmlFor="termMonths">Prazo (meses)</Label>
              <Input
                id="termMonths"
                type="number"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                placeholder="360"
                className="text-lg"
              />
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
                onCheckedChange={setEnableMaxPayment}
              />
            </div>
            {enableMaxPayment && (
              <div className="space-y-4 animate-slide-up">
                <div className="space-y-2">
                  <Label>Valor Máximo da Parcela (R$)</Label>
                  <Input
                    value={formatCurrency(maxPaymentValue)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setMaxPaymentValue)}
                    placeholder="3.000"
                    className="text-lg"
                  />
                </div>
                
                {affordabilityAnalysis && (
                  <div className="space-y-3">
                    {affordabilityAnalysis.isAffordable ? (
                      <Alert className="bg-success/10 border-success/30">
                        <AlertDescription className="text-success">
                          ✓ <strong>Parcela dentro do orçamento!</strong> A primeira parcela de{" "}
                          <strong>R$ {affordabilityAnalysis.firstPayment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>{" "}
                          está abaixo do limite de R$ {parseCurrency(maxPaymentValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.
                        </AlertDescription>
                      </Alert>
                    ) : (
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
                              {affordabilityAnalysis.minTermMonths && (
                                <li>
                                  Prazo de pelo menos <strong>{affordabilityAnalysis.minTermMonths} meses</strong> ({(affordabilityAnalysis.minTermMonths / 12).toFixed(1)} anos)
                                </li>
                              )}
                              <li>Aumentar o valor da entrada</li>
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
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
                onCheckedChange={setEnableExtraAmortization}
              />
            </div>
            {enableExtraAmortization && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                <div className="space-y-2">
                  <Label>Valor da Amortização Extra (R$)</Label>
                  <Input
                    value={formatCurrency(extraAmortizationValue)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setExtraAmortizationValue)}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Redução</Label>
                  <Select
                    value={extraAmortizationType}
                    onValueChange={(v) => setExtraAmortizationType(v as "reduce-term" | "reduce-payment")}
                  >
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
            )}
          </div>

          {/* Scheduled Reinforcements */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
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
                onCheckedChange={setEnableReinforcements}
              />
            </div>
            {enableReinforcements && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                <div className="space-y-2">
                  <Label>Valor do Reforço (R$)</Label>
                  <Input
                    value={formatCurrency(reinforcementValue)}
                    onChange={(e) => handleCurrencyInput(e.target.value, setReinforcementValue)}
                    placeholder="5.000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={reinforcementFrequency}
                    onValueChange={(v) => setReinforcementFrequency(v as "monthly" | "semiannual" | "annual")}
                  >
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {calculations && (
        <>
          <CalculationResults 
            calculations={calculations} 
            amortizationType={amortizationType}
          />
          <ProposalGenerator
            calculations={calculations}
            propertyValue={parseCurrency(propertyValue)}
            downPayment={parseCurrency(downPayment)}
            interestRate={parseCurrency(interestRate)}
            termMonths={parseInt(termMonths) || 360}
            amortizationType={amortizationType}
          />
          <AmortizationSchedule schedule={calculations.schedule} />
        </>
      )}
    </div>
  );
}
