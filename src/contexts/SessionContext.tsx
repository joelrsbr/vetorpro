import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type PlanType = "basic" | "pro" | "business" | null;

export interface SessionData {
  isLoggedIn: boolean;
  consultantName: string;
  teamName: string;
  plan: PlanType;
  loginMethod: string;
}

const defaultSession: SessionData = {
  isLoggedIn: false,
  consultantName: "Joel Farias",
  teamName: "VetorPro Business",
  plan: null,
  loginMethod: "",
};

interface SessionContextType {
  session: SessionData;
  login: (method: string, plan?: PlanType) => void;
  logout: () => void;
  setPlan: (plan: PlanType) => void;
  setConsultantName: (name: string) => void;
  getPlanDetails: () => PlanDetails | null;
}

export interface PlanDetails {
  id: PlanType;
  name: string;
  price: string;
  color: string;
  badgeClass: string;
  features: string[];
}

const planDetailsMap: Record<string, PlanDetails> = {
  basic: {
    id: "basic",
    name: "Basic",
    price: "R$ 69,90/mês",
    color: "hsl(var(--muted-foreground))",
    badgeClass: "bg-muted-foreground text-background",
    features: ["Até 50 Simulações/mês", "Até 20 Propostas IA/mês", "Painel de Cotações", "Calculadora HP12C"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "R$ 139,90/mês",
    color: "hsl(var(--primary))",
    badgeClass: "bg-primary text-primary-foreground",
    features: ["Até 500 Simulações/mês", "Até 100 Propostas IA/mês", "Exportação PDF", "Cotações Live"],
  },
  business: {
    id: "business",
    name: "Business",
    price: "R$ 269,90/mês",
    color: "hsl(var(--success))",
    badgeClass: "bg-success text-success-foreground",
    features: ["Até 2.000 Simulações/mês", "Até 300 Propostas IA/mês", "Relatórios Premium", "Sondagem Estratégica"],
  },
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const STORAGE_KEY = "vetorpro-session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return { ...defaultSession, ...JSON.parse(saved) };
        } catch {
          return defaultSession;
        }
      }
    }
    return defaultSession;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const login = (method: string, plan: PlanType = "pro") => {
    setSession((prev) => ({
      ...prev,
      isLoggedIn: true,
      loginMethod: method,
      plan: plan,
    }));
  };

  const logout = () => {
    setSession(defaultSession);
    localStorage.removeItem(STORAGE_KEY);
  };

  const setPlan = (plan: PlanType) => {
    setSession((prev) => ({ ...prev, plan }));
  };

  const setConsultantName = (name: string) => {
    setSession((prev) => ({ ...prev, consultantName: name }));
  };

  const getPlanDetails = (): PlanDetails | null => {
    if (!session.plan) return null;
    return planDetailsMap[session.plan] || null;
  };

  return (
    <SessionContext.Provider value={{ session, login, logout, setPlan, setConsultantName, getPlanDetails }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
