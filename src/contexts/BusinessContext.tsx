import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface BusinessSettings {
  companyName: string;
  companyLogo: string;
  consultantName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

const defaultSettings: BusinessSettings = {
  companyName: "Sua Empresa",
  companyLogo: "",
  consultantName: "",
  primaryColor: "224 76% 30%", // Deep blue (HSL values)
  secondaryColor: "215 20% 95%",
  accentColor: "217 91% 60%",
};

interface BusinessContextType {
  settings: BusinessSettings;
  updateSettings: (newSettings: Partial<BusinessSettings>) => void;
  resetSettings: () => void;
  isCustomized: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const STORAGE_KEY = "imobcalc-business-settings";

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return { ...defaultSettings, ...JSON.parse(saved) };
        } catch {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });

  const isCustomized = 
    settings.companyName !== defaultSettings.companyName ||
    settings.companyLogo !== "" ||
    settings.primaryColor !== defaultSettings.primaryColor;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    
    // Apply custom colors to CSS variables
    document.documentElement.style.setProperty("--primary", settings.primaryColor);
    document.documentElement.style.setProperty("--accent", settings.accentColor);
  }, [settings]);

  const updateSettings = (newSettings: Partial<BusinessSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.style.removeProperty("--primary");
    document.documentElement.style.removeProperty("--accent");
  };

  return (
    <BusinessContext.Provider value={{ settings, updateSettings, resetSettings, isCustomized }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}
