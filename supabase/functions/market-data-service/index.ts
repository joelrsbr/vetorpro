import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// TTL constants in seconds
const TTL_BACEN = 24 * 60 * 60;       // 24h
const TTL_FOREX = 15 * 60;            // 15min
const TTL_CRYPTO = 5 * 60;            // 5min

// BCB SGS series
const BCB_SERIES: Record<string, { id: number; name: string; period: string; ttl: number }> = {
  selic:    { id: 432,   name: "Selic",    period: "a.a.", ttl: TTL_BACEN },
  ipca:     { id: 13522, name: "IPCA",     period: "a.a.", ttl: TTL_BACEN },
  igpm:     { id: 189,   name: "IGP-M",    period: "a.a.", ttl: TTL_BACEN },
  incc:     { id: 192,   name: "INCC",     period: "a.a.", ttl: TTL_BACEN },
  tr:       { id: 226,   name: "TR",       period: "a.m.", ttl: TTL_BACEN },
  cdi:      { id: 4389,  name: "CDI",      period: "a.a.", ttl: TTL_BACEN },
  poupanca: { id: 196,   name: "Poupança", period: "a.m.", ttl: TTL_BACEN },
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

function getSupabaseAnon() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
}

// ─── Fetchers ───

async function fetchBCBRate(seriesId: number): Promise<number | null> {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados?formato=json&dataInicial=${fmt(start)}&dataFinal=${fmt(end)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return parseFloat(data[data.length - 1].valor);
  } catch {
    return null;
  }
}

async function fetchCurrencies(): Promise<Record<string, { value: number; variation: number }>> {
  try {
    const url = "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL";
    console.log("[FOREX] Fetching:", url);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    console.log("[FOREX] Status:", res.status);
    if (!res.ok) {
      const body = await res.text();
      console.error("[FOREX] Error body:", body);
      return {};
    }
    const data = await res.json();
    console.log("[FOREX] Keys:", Object.keys(data));
    const result: Record<string, { value: number; variation: number }> = {};
    if (data.USDBRL) result.usd = { value: parseFloat(data.USDBRL.bid), variation: parseFloat(data.USDBRL.pctChange) };
    if (data.EURBRL) result.eur = { value: parseFloat(data.EURBRL.bid), variation: parseFloat(data.EURBRL.pctChange) };
    return result;
  } catch (e) {
    console.error("[FOREX] Exception:", e);
    return {};
  }
}

async function fetchBTC(): Promise<{ value: number; variation: number } | null> {
  try {
    const res = await fetch(
      "https://economia.awesomeapi.com.br/json/last/BTC-BRL",
      { headers: { "User-Agent": "VetorPro/1.0", Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.BTCBRL) {
      return { value: parseFloat(data.BTCBRL.bid), variation: parseFloat(data.BTCBRL.pctChange) };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Cache helpers ───

async function upsertCache(admin: ReturnType<typeof getSupabaseAdmin>, key: string, value: unknown, source: string, ttlSeconds: number) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  await admin.from("market_cache").upsert({
    key,
    value,
    source,
    updated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  }, { onConflict: "key" });
}

async function getCachedValue(admin: ReturnType<typeof getSupabaseAdmin>, key: string): Promise<unknown | null> {
  const { data } = await admin.from("market_cache").select("value").eq("key", key).single();
  return data?.value ?? null;
}

// ─── Refresh actions ───

async function refreshBacen(admin: ReturnType<typeof getSupabaseAdmin>) {
  const entries = Object.entries(BCB_SERIES);
  const results = await Promise.all(entries.map(([, s]) => fetchBCBRate(s.id)));
  for (let i = 0; i < entries.length; i++) {
    const [key, series] = entries[i];
    const val = results[i];
    if (val !== null) {
      await upsertCache(admin, `rate_${key}`, { value: val, period: series.period, name: series.name }, "BCB SGS", series.ttl);
    }
  }
}

async function refreshForex(admin: ReturnType<typeof getSupabaseAdmin>) {
  const currencies = await fetchCurrencies();
  for (const [key, data] of Object.entries(currencies)) {
    await upsertCache(admin, `currency_${key}`, data, "AwesomeAPI", TTL_FOREX);
  }
}

async function refreshCrypto(admin: ReturnType<typeof getSupabaseAdmin>) {
  const btc = await fetchBTC();
  if (btc) {
    await upsertCache(admin, "crypto_btc", btc, "AwesomeAPI", TTL_CRYPTO);
  }
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Cron/internal refresh actions (no auth needed — called by pg_cron via service_role)
    if (action === "refresh_bacen" || action === "refresh_forex" || action === "refresh_crypto") {
      const admin = getSupabaseAdmin();
      if (action === "refresh_bacen") await refreshBacen(admin);
      else if (action === "refresh_forex") await refreshForex(admin);
      else if (action === "refresh_crypto") await refreshCrypto(admin);
      return new Response(JSON.stringify({ ok: true, action }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client read — requires auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Autenticação necessária." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = getSupabaseAnon();
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Token inválido." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user plan
    const { data: subData } = await anonClient.rpc("get_user_subscription", { p_user_id: userData.user.id });
    const plan = subData?.[0]?.plan || "basic";
    const isActive = subData?.[0]?.is_active || false;

    if (!isActive) {
      return new Response(JSON.stringify({ error: "Assinatura inativa." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read all cache entries
    const admin = getSupabaseAdmin();
    const { data: cacheRows } = await admin.from("market_cache").select("*");

    const rates: Record<string, { value: number; period: string; name?: string }> = {};
    const currencies: Record<string, { value: number; variation: number }> = {};
    let crypto: Record<string, { value: number; variation: number }> = {};

    for (const row of cacheRows || []) {
      if (row.key.startsWith("rate_")) {
        const k = row.key.replace("rate_", "");
        rates[k] = row.value as { value: number; period: string; name?: string };
      } else if (row.key.startsWith("currency_")) {
        const k = row.key.replace("currency_", "");
        currencies[k] = row.value as { value: number; variation: number };
      } else if (row.key.startsWith("crypto_")) {
        const k = row.key.replace("crypto_", "");
        crypto[k] = row.value as { value: number; variation: number };
      }
    }

    // Plan-based filtering
    const response: Record<string, unknown> = {
      rates, // All plans get national rates
      updatedAt: new Date().toISOString(),
      source: "market_cache",
    };

    if (plan === "pro" || plan === "business") {
      response.currencies = currencies;
      response.crypto = crypto;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[MARKET-DATA-SERVICE] Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
