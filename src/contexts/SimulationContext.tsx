import { createContext, useContext, useState, ReactNode } from "react";

interface SimulationState {
  propertyValue: string;
  setPropertyValue: (v: string) => void;
  downPayment: string;
  setDownPayment: (v: string) => void;
  interestRate: string;
  setInterestRate: (v: string) => void;
  termMonths: string;
  setTermMonths: (v: string) => void;
  amortizationType: "SAC" | "PRICE";
  setAmortizationType: (v: "SAC" | "PRICE") => void;
}

const SimulationContext = createContext<SimulationState | undefined>(undefined);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [propertyValue, setPropertyValue] = useState("15000000");
  const [downPayment, setDownPayment] = useState("3000000");
  const [interestRate, setInterestRate] = useState("10.5");
  const [termMonths, setTermMonths] = useState("360");
  const [amortizationType, setAmortizationType] = useState<"SAC" | "PRICE">("SAC");

  return (
    <SimulationContext.Provider
      value={{
        propertyValue, setPropertyValue,
        downPayment, setDownPayment,
        interestRate, setInterestRate,
        termMonths, setTermMonths,
        amortizationType, setAmortizationType,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
}
