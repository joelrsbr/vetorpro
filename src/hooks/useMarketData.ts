import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CurrencyData {
  value: number;
  variation: number;
}

interface RateData {
  value: number;
  period: string;
  name?: string;
}

export interface MarketData {
  currencies: Record<string, CurrencyData>;
  crypto: Record<string, CurrencyData>;
  rates: Record<string, RateData>;
  updatedAt: string;
  source: string;
}

const FALLBACK_DATA: MarketData = {
  currencies: {
    usd: { value: 5.01, variation: 0 },
    eur: { value: 5.43, variation: 0 },
  },
  crypto: {},
  rates: {
    selic: { value: 13.25, period: "a.a." },
    ipca: { value: 4.75, period: "a.a." },
    igpm: { value: 4.20, period: "a.a." },
    incc: { value: 3.85, period: "a.a." },
    tr: { value: 0.04, period: "a.m." },
    cdi: { value: 10.9, period: "a.a." },
    poupanca: { value: 0.63, period: "a.m." },
  },
  updatedAt: new Date().toISOString(),
  source: "Dados de referência (offline)",
};

const CACHE_KEY = "vetorpro-market-data-v2";
const CACHE_TTL = 60 * 1000; // 1 min local cache to avoid excessive calls

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
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
}

export function useMarketData() {
  const [data, setData] = useState<MarketData>(() => {
    const cached = getCachedData();
    return cached ? cached.data : FALLBACK_DATA;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(() => {
    const cached = getCachedData();
    return cached ? (Date.now() - cached.timestamp) < CACHE_TTL : false;
  });
  const [lastFetch, setLastFetch] = useState<Date | null>(() => {
    const cached = getCachedData();
    return cached ? new Date(cached.timestamp) : null;
  });

  const fetchData = useCallback(async (force = false) => {
    if (!force) {
      const cached = getCachedData();
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        setData(cached.data);
        setIsLive(true);
        setLastFetch(new Date(cached.timestamp));
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("market-data-service");

      if (error) throw error;

      if (result && result.rates) {
        const merged: MarketData = {
          rates: { ...FALLBACK_DATA.rates, ...result.rates },
          currencies: { ...FALLBACK_DATA.currencies, ...(result.currencies || {}) },
          crypto: result.crypto || {},
          updatedAt: result.updatedAt || new Date().toISOString(),
          source: result.source || "market_cache",
        };
        setData(merged);
        setIsLive(true);
        setLastFetch(new Date());
        setCachedData(merged);
      } else {
        setData(FALLBACK_DATA);
        setIsLive(false);
      }
    } catch (err) {
      console.error("Failed to fetch market data:", err);
      const cached = getCachedData();
      if (cached) {
        setData(cached.data);
        setLastFetch(new Date(cached.timestamp));
      } else {
        setData(FALLBACK_DATA);
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
