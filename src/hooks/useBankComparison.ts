import { useState, useMemo } from "react";
import {
  BANK_RATES,
  simulateAllBanks,
  type BankSimulationResult,
} from "@/lib/bank-rates";

/**
 * Hook que encapsula a lógica de comparativo multi-bancos.
 * Usado pelo módulo visual BankComparisonModule e disponível
 * para o simulador principal no plano Business.
 */
export function useBankComparison(
  financedAmount: number,
  termMonths: number,
  system: "SAC" | "PRICE"
) {
  const [customRates, setCustomRates] = useState<Record<string, number>>({});

  const results: BankSimulationResult[] = useMemo(() => {
    return simulateAllBanks(
      { financedAmount, termMonths, system },
      Object.keys(customRates).length > 0 ? customRates : undefined
    );
  }, [financedAmount, termMonths, system, customRates]);

  const setRate = (bankId: string, rate: number) => {
    setCustomRates((prev) => ({ ...prev, [bankId]: rate }));
  };

  const resetRates = () => setCustomRates({});

  const bestRate = results.find((r) => r.isBestRate) ?? null;
  const lowestCost = results.find((r) => r.isLowestCost) ?? null;

  return {
    banks: BANK_RATES,
    results,
    customRates,
    setRate,
    resetRates,
    bestRate,
    lowestCost,
  };
}
