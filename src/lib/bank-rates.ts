/**
 * ════════════════════════════════════════════════════════════════
 * MOTOR DE INTELIGÊNCIA — TAXAS DE FINANCIAMENTO IMOBILIÁRIO
 * ════════════════════════════════════════════════════════════════
 *
 * INTERFACE DE MANUTENÇÃO:
 * Para atualizar taxas, edite apenas o array BANK_RATES abaixo.
 * Cada banco possui:
 *   - defaultRate: Taxa de juros nominal (% a.a.)
 *   - spread: Spread bancário (% a.a.) — somado à taxa base
 *   - hiddenCosts: Custos extras estimados
 *   - isRegional: true para players regionais (Banrisul, BRB)
 *
 * O motor recalcula tudo instantaneamente ao alterar qualquer valor.
 * ════════════════════════════════════════════════════════════════
 */

export interface BankHiddenCosts {
  /** Taxa de avaliação de engenharia (R$) */
  engineeringAppraisal: number;
  /** Taxa de administração mensal (R$) */
  monthlyAdmin: number;
  /** Alíquota estimada de seguro MIP+DFI sobre valor do imóvel (% mensal) */
  insuranceRate: number;
}

export interface BankRateConfig {
  id: string;
  name: string;
  shortName: string;
  /** Código COMPE (compensação bancária) */
  compeCode: string;
  /** URL do logo do banco (reservado para uso futuro) */
  logoUrl?: string;
  color: string;
  /** Taxa média anual (% a.a.) */
  defaultRate: number;
  /** Spread bancário (% a.a.) */
  spread: number;
  /** Custos extras estimados */
  hiddenCosts: BankHiddenCosts;
  /** Player regional (ex: Banrisul, BRB) — recebe selo "Destaque Regional" */
  isRegional?: boolean;
  /** Observação específica do banco (exibida no card) */
  note?: string;
}

/**
 * ┌─────────────────────────────────────────────────────────┐
 * │  ATUALIZE AQUI AS TAXAS E SPREADS DE CADA BANCO        │
 * │  Na segunda-feira, basta alterar defaultRate e spread.  │
 * │  O motor recalcula ranking e selos automaticamente.     │
 * └─────────────────────────────────────────────────────────┘
 */
export const BANK_RATES: BankRateConfig[] = [
  // ── Federais ──
  { id: "caixa",     name: "Caixa Econômica",  shortName: "CX",  compeCode: "104", color: "hsl(210, 100%, 35%)", defaultRate: 8.99,  spread: 0.00, hiddenCosts: { engineeringAppraisal: 3000, monthlyAdmin: 25, insuranceRate: 0.025 } },
  { id: "bb",        name: "Banco do Brasil",   shortName: "BB",  compeCode: "001", color: "hsl(50, 90%, 45%)",   defaultRate: 9.19,  spread: 0.00, hiddenCosts: { engineeringAppraisal: 3000, monthlyAdmin: 25, insuranceRate: 0.025 } },
  { id: "bndes",     name: "BNDES",             shortName: "BN",  compeCode: "007", color: "hsl(145, 60%, 35%)",  defaultRate: 7.50,  spread: 1.30, hiddenCosts: { engineeringAppraisal: 0, monthlyAdmin: 0, insuranceRate: 0.020 }, note: "Linhas de crédito especiais via agente financeiro. Condições sujeitas a enquadramento." },

  // ── Privados Nacionais ──
  { id: "itau",      name: "Itaú",              shortName: "IT",  compeCode: "341", color: "hsl(30, 90%, 45%)",   defaultRate: 9.99,  spread: 0.00, hiddenCosts: { engineeringAppraisal: 3100, monthlyAdmin: 25, insuranceRate: 0.028 } },
  { id: "bradesco",  name: "Bradesco",          shortName: "BR",  compeCode: "237", color: "hsl(0, 80%, 45%)",    defaultRate: 9.49,  spread: 0.00, hiddenCosts: { engineeringAppraisal: 3500, monthlyAdmin: 25, insuranceRate: 0.027 } },
  { id: "santander", name: "Santander",         shortName: "SA",  compeCode: "033", color: "hsl(0, 90%, 40%)",    defaultRate: 9.79,  spread: 0.00, hiddenCosts: { engineeringAppraisal: 3200, monthlyAdmin: 25, insuranceRate: 0.026 } },

  // ── Digitais ──
  { id: "inter",     name: "Banco Inter",       shortName: "IN",  compeCode: "077", color: "hsl(25, 95%, 50%)",   defaultRate: 9.29,  spread: 0.00, hiddenCosts: { engineeringAppraisal: 2800, monthlyAdmin: 0, insuranceRate: 0.024 } },

  // ── Cooperativos ──
  { id: "sicredi",   name: "Sicredi",           shortName: "SI",  compeCode: "748", color: "hsl(120, 60%, 35%)",  defaultRate: 9.39,  spread: 0.00, hiddenCosts: { engineeringAppraisal: 2900, monthlyAdmin: 25, insuranceRate: 0.026 } },

  // ── Regionais ──
  { id: "brb",       name: "BRB",               shortName: "BRB", compeCode: "070", color: "hsl(210, 80%, 30%)",  defaultRate: 9.59,  spread: 0.00, hiddenCosts: { engineeringAppraisal: 3000, monthlyAdmin: 25, insuranceRate: 0.025 }, isRegional: true, note: "Forte presença no Distrito Federal e entorno." },
  { id: "banrisul",  name: "Banrisul",          shortName: "BRR", compeCode: "041", color: "hsl(200, 70%, 35%)",  defaultRate: 9.69,  spread: 0.00, hiddenCosts: { engineeringAppraisal: 3100, monthlyAdmin: 25, insuranceRate: 0.026 }, isRegional: true, note: "Condições de mesa com o gerente. Forte presença no RS." },
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
  /** Taxa efetiva usada (defaultRate + spread) */
  effectiveRate: number;
  spread: number;
  firstPayment: number;
  lastPayment: number;
  totalPaid: number;
  totalInterest: number;
  isBestRate: boolean;
  isLowestCost: boolean;
  isRegional: boolean;
  note?: string;
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
 * Executa simulação comparativa em todos os 10 bancos.
 * A taxa efetiva = defaultRate + spread (ou customRate se fornecida).
 * Aceita overrides de taxa por banco (customRates).
 */
export function simulateAllBanks(
  input: BankSimulationInput,
  customRates?: Record<string, number>
): BankSimulationResult[] {
  const { financedAmount, termMonths, system } = input;
  if (financedAmount <= 0) return [];

  const results = BANK_RATES.map((bank) => {
    const baseRate = customRates?.[bank.id] ?? bank.defaultRate;
    const effectiveRate = baseRate + bank.spread;
    const calc = calculateBankSimulation(financedAmount, effectiveRate, termMonths, system);
    return {
      bankId: bank.id,
      bankName: bank.name,
      bankColor: bank.color,
      shortName: bank.shortName,
      rate: baseRate,
      effectiveRate,
      spread: bank.spread,
      ...calc,
      isBestRate: false,
      isLowestCost: false,
      isRegional: bank.isRegional ?? false,
      note: bank.note,
    };
  });

  if (results.length > 0) {
    const minRate = Math.min(...results.map((s) => s.effectiveRate));
    const minCost = Math.min(...results.map((s) => s.totalPaid));
    results.forEach((s) => {
      if (s.effectiveRate === minRate) s.isBestRate = true;
      if (s.totalPaid === minCost) s.isLowestCost = true;
    });
  }

  return results;
}
