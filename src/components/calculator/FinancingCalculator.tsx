import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingDown, Sparkles, Plus, Minus } from "lucide-react";
import { CalculationResults } from "./CalculationResults";
import { AmortizationSchedule } from "./AmortizationSchedule";

interface ScheduleItem {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  extraPayment: number;
}

export function FinancingCalculator() {
  const [propertyValue, setPropertyValue] = useState<string>("500000");
  const [downPayment, setDownPayment] = useState<string>("100000");
  const [interestRate, setInterestRate] = useState<string>("10.5");
  const [termMonths, setTermMonths] = useState<string>("360");
  const [amortizationType, setAmortizationType] = useState<"SAC" | "PRICE">("SAC");
  
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

  const calculations = useMemo(() => {
    const principal = parseCurrency(propertyValue) - parseCurrency(downPayment);
    const monthlyRate = parseCurrency(interestRate) / 100 / 12;
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
  }, [propertyValue, downPayment, interestRate, termMonths, amortizationType, 
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
          {/* Amortization Type Tabs */}
          <Tabs 
            value={amortizationType} 
            onValueChange={(v) => setAmortizationType(v as "SAC" | "PRICE")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="SAC" className="font-medium">
                Sistema SAC
              </TabsTrigger>
              <TabsTrigger value="PRICE" className="font-medium">
                Sistema PRICE
              </TabsTrigger>
            </TabsList>
            <TabsContent value="SAC" className="mt-4">
              <p className="text-sm text-muted-foreground">
                <strong>SAC (Sistema de Amortização Constante):</strong> Parcelas decrescentes. 
                A amortização é constante e os juros diminuem ao longo do tempo.
              </p>
            </TabsContent>
            <TabsContent value="PRICE" className="mt-4">
              <p className="text-sm text-muted-foreground">
                <strong>PRICE (Tabela Price):</strong> Parcelas fixas durante todo o financiamento. 
                No início, a maior parte é juros; no final, é amortização.
              </p>
            </TabsContent>
          </Tabs>

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
              <Label htmlFor="interestRate">Taxa de Juros Anual (%)</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="10.5"
                className="text-lg"
              />
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

          {/* Extra Amortization */}
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
          <AmortizationSchedule schedule={calculations.schedule} />
        </>
      )}
    </div>
  );
}
