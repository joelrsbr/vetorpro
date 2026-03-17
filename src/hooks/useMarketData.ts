import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CurrencyData {
  value: number;
  variation: number;
}

interface RateData {
  value: number;
  period: string;
}

export interface MarketData {
  currencies: Record<string, CurrencyData>;
  rates: Record<string, RateData>;
  updatedAt: string;
  source: string;
}

// Fallback values in case API is unreachable
const FALLBACK_DATA: MarketData = {
  currencies: {
    usd: { value: 5.21, variation: 0 },
    eur: { value: 5.68, variation: 0 },
  },
  rates: {
    selic: { value: 13.25, period: "a.a." },
    ipca: { value: 4.75, period: "a.a." },
    tr: { value: 0.04, period: "a.m." },
    cdi: { value: 10.9, period: "a.a." },
    poupanca: { value: 0.63, period: "a.m." },
  },
  updatedAt: new Date().toISOString(),
  source: "Dados de referência (offline)",
};

const CACHE_KEY = "vetorpro-market-data";
const CURRENCY_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const RATE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCachedData(): { data: MarketData; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCachedData(data: MarketData) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {}
}

export function useMarketData() {
  // Initialize from localStorage cache to avoid empty fields on load
  const [data, setData] = useState<MarketData>(() => {
    const cached = getCachedData();
    return cached ? cached.data : FALLBACK_DATA;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(() => {
    const cached = getCachedData();
    return cached ? (Date.now() - cached.timestamp) < CURRENCY_CACHE_TTL : false;
  });
  const [lastFetch, setLastFetch] = useState<Date | null>(() => {
    const cached = getCachedData();
    return cached ? new Date(cached.timestamp) : null;
  });

  const fetchData = useCallback(async (force = false) => {
    // Check cache first
    if (!force) {
      const cached = getCachedData();
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < CURRENCY_CACHE_TTL) {
          setData(cached.data);
          setIsLive(true);
          setLastFetch(new Date(cached.timestamp));
          setIsLoading(false);
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "fetch-market-data"
      );

      if (error) throw error;

      if (result && result.currencies && result.rates) {
        setData(result as MarketData);
        setIsLive(true);
        setLastFetch(new Date());
        setCachedData(result as MarketData);
      }
    } catch (err) {
      console.error("Failed to fetch market data:", err);
      // Use cached data if available, otherwise fallback
      const cached = getCachedData();
      if (cached) {
        setData(cached.data);
        setLastFetch(new Date(cached.timestamp));
      }
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, isLive, lastFetch, refresh: () => fetchData(true) };
}
