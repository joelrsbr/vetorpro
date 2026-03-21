import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MarketData {
  currencies: Record<string, { value: number; variation: number }>;
  rates: Record<string, { value: number; period: string }>;
  updatedAt: string;
  source: string;
}

// Simple in-memory rate limit: max 10 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// BCB SGS series IDs
const BCB_SERIES: Record<string, { id: number; name: string; period: string }> = {
  selic: { id: 432, name: "Selic", period: "a.a." },
  ipca: { id: 13522, name: "IPCA", period: "a.a." },
  tr: { id: 226, name: "TR", period: "a.m." },
  cdi: { id: 4389, name: "CDI", period: "a.a." },
  poupanca: { id: 196, name: "Poupança", period: "a.m." },
};

async function fetchBCBRate(seriesId: number): Promise<number | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados?formato=json&dataInicial=${fmt(startDate)}&dataFinal=${fmt(endDate)}`;
    
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.error(`BCB API error for series ${seriesId}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const lastEntry = data[data.length - 1];
    return parseFloat(lastEntry.valor);
  } catch (e) {
    console.error(`Error fetching BCB series ${seriesId}:`, e);
    return null;
  }
}

async function fetchCurrencies(): Promise<Record<string, { value: number; variation: number }>> {
  try {
    const res = await fetch(
      "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL",
      { headers: { "User-Agent": "VetorPro/1.0", Accept: "application/json" } }
    );
    if (!res.ok) {
      console.error(`AwesomeAPI error: ${res.status}`);
      return {};
    }
    const data = await res.json();
    const result: Record<string, { value: number; variation: number }> = {};

    if (data.USDBRL) {
      result.usd = {
        value: parseFloat(data.USDBRL.bid),
        variation: parseFloat(data.USDBRL.pctChange),
      };
    }
    if (data.EURBRL) {
      result.eur = {
        value: parseFloat(data.EURBRL.bid),
        variation: parseFloat(data.EURBRL.pctChange),
      };
    }

    return result;
  } catch (e) {
    console.error("Error fetching currencies:", e);
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Autenticação necessária." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Token inválido." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side plan enforcement
    const { data: subData } = await supabaseClient.rpc('get_user_subscription', { p_user_id: userData.user.id });
    if (!subData?.[0]?.is_active || !['pro', 'business'].includes(subData[0].plan)) {
      return new Response(JSON.stringify({ error: "Upgrade necessário para acessar cotações de mercado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit check
    if (!checkRateLimit(userData.user.id)) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Aguarde um momento." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all data in parallel
    const [currencies, ...bcbResults] = await Promise.all([
      fetchCurrencies(),
      ...Object.values(BCB_SERIES).map((s) => fetchBCBRate(s.id)),
    ]);

    const rates: Record<string, { value: number; period: string }> = {};
    const seriesKeys = Object.keys(BCB_SERIES);

    seriesKeys.forEach((key, i) => {
      const val = bcbResults[i];
      if (val !== null) {
        rates[key] = {
          value: val,
          period: BCB_SERIES[key].period,
        };
      }
    });

    const marketData: MarketData = {
      currencies,
      rates,
      updatedAt: new Date().toISOString(),
      source: "BCB / AwesomeAPI",
    };

    return new Response(JSON.stringify(marketData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[FETCH-MARKET-DATA] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao buscar dados de mercado." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
