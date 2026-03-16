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
  teamName: "VetorPro Business/TEAM",
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
    price: "R$ 29,90/mês",
    color: "hsl(var(--muted-foreground))",
    badgeClass: "bg-muted-foreground text-background",
    features: ["Simulador Financeiro", "Painel de Cotações", "Calculadora HP12C"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "R$ 59,90/mês",
    color: "hsl(var(--primary))",
    badgeClass: "bg-primary text-primary-foreground",
    features: ["Tudo do Basic", "Exportação PDF", "Histórico de simulações", "Personalização de Tema"],
  },
  business: {
    id: "business",
    name: "Business",
    price: "R$ 149,90/mês",
    color: "hsl(var(--success))",
    badgeClass: "bg-success text-success-foreground",
    features: ["Tudo do Pro", "Dashboard corporativo", "Relatórios Premium", "Comparativo Multi-Bancos"],
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
