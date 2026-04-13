import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IndicatorMeta {
  key: string;
  display_name: string;
  description: string;
  category: string;
  plan_level: "basic" | "pro" | "business";
  unit: string;
  status: string;
  updated_at: string;
  accessible: boolean;
  value: Record<string, unknown> | null;
}

export interface MarketData {
  indicators: IndicatorMeta[];
  updatedAt: string;
  source: string;
}

const FALLBACK_DATA: MarketData = {
  indicators: [],
  updatedAt: new Date().toISOString(),
  source: "Dados de referência (offline)",
};

const CACHE_KEY = "vetorpro-market-data-v3";
const CACHE_TTL = 60 * 1000;

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

      if (result && result.indicators) {
        const merged: MarketData = {
          indicators: result.indicators,
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
