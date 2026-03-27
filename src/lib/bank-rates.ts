/**
 * Base de dados interna de taxas médias de financiamento imobiliário
 * dos 6 maiores bancos do Brasil.
 * 
 * Taxas médias de mercado para referência (a.a.).
 * Valores sujeitos a análise de crédito individual.
 */

export interface BankRateConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
  /** Taxa média anual (% a.a.) */
  defaultRate: number;
}

export const BANK_RATES: BankRateConfig[] = [
  { id: "caixa", name: "Caixa Econômica", shortName: "CX", color: "hsl(210, 100%, 35%)", defaultRate: 8.99 },
  { id: "itau", name: "Itaú", shortName: "IT", color: "hsl(30, 90%, 45%)", defaultRate: 9.99 },
  { id: "bradesco", name: "Bradesco", shortName: "BR", color: "hsl(0, 80%, 45%)", defaultRate: 9.49 },
  { id: "santander", name: "Santander", shortName: "SA", color: "hsl(0, 90%, 40%)", defaultRate: 9.79 },
  { id: "bb", name: "Banco do Brasil", shortName: "BB", color: "hsl(50, 90%, 45%)", defaultRate: 9.19 },
  { id: "inter", name: "Banco Inter", shortName: "IN", color: "hsl(25, 95%, 50%)", defaultRate: 9.29 },
  { id: "sicredi", name: "Sicredi", shortName: "SI", color: "hsl(120, 60%, 35%)", defaultRate: 9.39 },
  { id: "brb", name: "BRB", shortName: "BR", color: "hsl(210, 80%, 30%)", defaultRate: 9.59 },
  { id: "banrisul", name: "Banrisul", shortName: "BRR", color: "hsl(200, 70%, 35%)", defaultRate: 9.69 },
];

export interface BankSimulationInput {
  financedAmount: number;
  termMonths: number;
  system: "SAC" | "PRICE";
}

export interface BankSimulationResult {
  bankId: string;
  bankName: string;
  bankColor: string;
  shortName: string;
  rate: number;
  firstPayment: number;
  lastPayment: number;
  totalPaid: number;
  totalInterest: number;
  isBestRate: boolean;
  isLowestCost: boolean;
}

/**
 * Calcula simulação de financiamento para um banco específico.
 */
export function calculateBankSimulation(
  financedAmount: number,
  annualRate: number,
  termMonths: number,
  system: "SAC" | "PRICE"
): { firstPayment: number; lastPayment: number; totalPaid: number; totalInterest: number } {
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;

  if (system === "SAC") {
    const amort = financedAmount / termMonths;
    const firstInterest = financedAmount * monthlyRate;
    const firstPayment = amort + firstInterest;
    const lastBalance = financedAmount - amort * (termMonths - 1);
    const lastInterest = lastBalance * monthlyRate;
    const lastPayment = amort + lastInterest;
    let totalPaid = 0;
    for (let i = 0; i < termMonths; i++) {
      const balance = financedAmount - amort * i;
      totalPaid += amort + balance * monthlyRate;
    }
    return { firstPayment, lastPayment, totalPaid, totalInterest: totalPaid - financedAmount };
  } else {
    const pmt =
      financedAmount *
      (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
    const totalPaid = pmt * termMonths;
    return { firstPayment: pmt, lastPayment: pmt, totalPaid, totalInterest: totalPaid - financedAmount };
  }
}

/**
 * Executa simulação comparativa em todos os 6 bancos.
 * Aceita overrides de taxa por banco (customRates).
 */
export function simulateAllBanks(
  input: BankSimulationInput,
  customRates?: Record<string, number>
): BankSimulationResult[] {
  const { financedAmount, termMonths, system } = input;
  if (financedAmount <= 0) return [];

  const results = BANK_RATES.map((bank) => {
    const rate = customRates?.[bank.id] ?? bank.defaultRate;
    const calc = calculateBankSimulation(financedAmount, rate, termMonths, system);
    return {
      bankId: bank.id,
      bankName: bank.name,
      bankColor: bank.color,
      shortName: bank.shortName,
      rate,
      ...calc,
      isBestRate: false,
      isLowestCost: false,
    };
  });

  if (results.length > 0) {
    const minRate = Math.min(...results.map((s) => s.rate));
    const minCost = Math.min(...results.map((s) => s.totalPaid));
    results.forEach((s) => {
      if (s.rate === minRate) s.isBestRate = true;
      if (s.totalPaid === minCost) s.isLowestCost = true;
    });
  }

  return results;
}
