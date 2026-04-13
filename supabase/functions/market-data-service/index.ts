import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// TTL constants in seconds
const TTL_BACEN = 24 * 60 * 60;
const TTL_FOREX = 15 * 60;
const TTL_CRYPTO = 5 * 60;

// BCB SGS series
const BCB_SERIES: Record<string, { id: number; name: string; period: string; ttl: number; unit: string }> = {
  selic:    { id: 432,   name: "Selic",    period: "a.a.", ttl: TTL_BACEN, unit: "percent" },
  ipca:     { id: 13522, name: "IPCA",     period: "a.a.", ttl: TTL_BACEN, unit: "percent" },
  igpm:     { id: 189,   name: "IGP-M",    period: "a.a.", ttl: TTL_BACEN, unit: "percent" },
  incc:     { id: 192,   name: "INCC",     period: "a.a.", ttl: TTL_BACEN, unit: "percent" },
  tr:       { id: 226,   name: "TR",       period: "a.m.", ttl: TTL_BACEN, unit: "percent" },
  cdi:      { id: 4389,  name: "CDI",      period: "a.a.", ttl: TTL_BACEN, unit: "percent" },
  poupanca: { id: 196,   name: "Poupança", period: "a.m.", ttl: TTL_BACEN, unit: "percent" },
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

function log(level: string, msg: string, extra?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), level, msg, ...extra };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

// ─── Cache helpers ───

async function upsertCache(
  admin: ReturnType<typeof getSupabaseAdmin>,
  key: string,
  value: unknown,
  source: string,
  ttlSeconds: number,
  status: string,
  unit: string,
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const { error } = await admin.from("market_cache").upsert(
    {
      key,
      value,
      source,
      updated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status,
      unit,
    },
    { onConflict: "key" },
  );
  if (error) log("error", `Cache upsert failed for ${key}`, { error: error.message });

  // Insert history record (extract numeric value)
  if (status === "ok") {
    let numericValue: number | null = null;
    if (typeof value === "object" && value !== null && "value" in (value as Record<string, unknown>)) {
      numericValue = Number((value as Record<string, unknown>).value);
    } else if (typeof value === "number") {
      numericValue = value;
    }
    if (numericValue !== null && !isNaN(numericValue)) {
      const { error: histErr } = await admin.from("market_history").insert({
        key,
        value: numericValue,
        recorded_at: now.toISOString(),
      });
      if (histErr) log("error", `History insert failed for ${key}`, { error: histErr.message });
    }
  }
}

async function getCached(admin: ReturnType<typeof getSupabaseAdmin>, key: string) {
  const { data } = await admin.from("market_cache").select("*").eq("key", key).single();
  return data ?? null;
}

function isCacheValid(row: { expires_at: string } | null): boolean {
  if (!row) return false;
  return new Date(row.expires_at) > new Date();
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
  const result: Record<string, { value: number; variation: number }> = {};
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

    const usdUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json&dataInicial=${fmt(start)}&dataFinal=${fmt(end)}`;
    const eurUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.21619/dados?formato=json&dataInicial=${fmt(start)}&dataFinal=${fmt(end)}`;

    const [usdRes, eurRes] = await Promise.all([
      fetch(usdUrl, { headers: { Accept: "application/json" } }),
      fetch(eurUrl, { headers: { Accept: "application/json" } }),
    ]);

    if (usdRes.ok) {
      const usdData = await usdRes.json();
      if (Array.isArray(usdData) && usdData.length >= 2) {
        const last = parseFloat(usdData[usdData.length - 1].valor);
        const prev = parseFloat(usdData[usdData.length - 2].valor);
        result.usd = { value: last, variation: parseFloat(((last - prev) / prev * 100).toFixed(2)) };
      } else if (Array.isArray(usdData) && usdData.length === 1) {
        result.usd = { value: parseFloat(usdData[0].valor), variation: 0 };
      }
    }

    if (eurRes.ok) {
      const eurData = await eurRes.json();
      if (Array.isArray(eurData) && eurData.length >= 2) {
        const last = parseFloat(eurData[eurData.length - 1].valor);
        const prev = parseFloat(eurData[eurData.length - 2].valor);
        result.eur = { value: last, variation: parseFloat(((last - prev) / prev * 100).toFixed(2)) };
      } else if (Array.isArray(eurData) && eurData.length === 1) {
        result.eur = { value: parseFloat(eurData[0].valor), variation: 0 };
      }
    }
  } catch (e) {
    log("error", "Forex fetch failed", { error: String(e) });
  }
  return result;
}

async function fetchBTC(): Promise<{ value: number; variation: number } | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true",
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.bitcoin) {
      return {
        value: data.bitcoin.brl,
        variation: parseFloat((data.bitcoin.brl_24h_change || 0).toFixed(2)),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Refresh with TTL check + fallback ───

async function refreshBacen(admin: ReturnType<typeof getSupabaseAdmin>) {
  const entries = Object.entries(BCB_SERIES);

  for (const [key, series] of entries) {
    const cacheKey = `rate_${key}`;
    const cached = await getCached(admin, cacheKey);

    // Skip if cache is still valid
    if (isCacheValid(cached)) {
      log("info", `Cache valid for ${cacheKey}, skipping fetch`);
      continue;
    }

    const val = await fetchBCBRate(series.id);
    if (val !== null) {
      await upsertCache(admin, cacheKey, { value: val, period: series.period, name: series.name }, "BCB SGS", series.ttl, "ok", series.unit);
      log("info", `Updated ${cacheKey}`, { value: val });
    } else if (cached) {
      // API failed but we have stale data — mark as fallback, extend TTL slightly
      await upsertCache(admin, cacheKey, cached.value, cached.source, 3600, "fallback", series.unit);
      log("warn", `API failed for ${cacheKey}, using fallback`, { staleFrom: cached.updated_at });
    } else {
      log("error", `API failed for ${cacheKey} and no cache exists`);
    }
  }
}

async function refreshForex(admin: ReturnType<typeof getSupabaseAdmin>) {
  const currencyKeys = ["usd", "eur"];

  // Check if all caches are valid
  const cachedEntries: Record<string, ReturnType<typeof getCached> extends Promise<infer T> ? T : never> = {};
  let allValid = true;
  for (const k of currencyKeys) {
    const cached = await getCached(admin, `currency_${k}`);
    cachedEntries[k] = cached;
    if (!isCacheValid(cached)) allValid = false;
  }

  if (allValid) {
    log("info", "Forex cache valid, skipping fetch");
    return;
  }

  const currencies = await fetchCurrencies();

  for (const k of currencyKeys) {
    const cacheKey = `currency_${k}`;
    if (currencies[k]) {
      await upsertCache(admin, cacheKey, currencies[k], "BCB PTAX", TTL_FOREX, "ok", "currency");
      log("info", `Updated ${cacheKey}`, { value: currencies[k].value });
    } else if (cachedEntries[k]) {
      await upsertCache(admin, cacheKey, cachedEntries[k]!.value, cachedEntries[k]!.source, 300, "fallback", "currency");
      log("warn", `Forex API failed for ${k}, using fallback`);
    } else {
      log("error", `Forex API failed for ${k} and no cache exists`);
    }
  }
}

async function refreshCrypto(admin: ReturnType<typeof getSupabaseAdmin>) {
  const cacheKey = "crypto_btc";
  const cached = await getCached(admin, cacheKey);

  if (isCacheValid(cached)) {
    log("info", "Crypto cache valid, skipping fetch");
    return;
  }

  const btc = await fetchBTC();
  if (btc) {
    await upsertCache(admin, cacheKey, btc, "CoinGecko", TTL_CRYPTO, "ok", "crypto");
    log("info", `Updated ${cacheKey}`, { value: btc.value });
  } else if (cached) {
    await upsertCache(admin, cacheKey, cached.value, cached.source, 120, "fallback", "crypto");
    log("warn", "Crypto API failed, using fallback");
  } else {
    log("error", "Crypto API failed and no cache exists");
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

    // Cron/internal refresh actions
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

    const rates: Record<string, { value: number; period: string; name?: string; status?: string }> = {};
    const currencies: Record<string, { value: number; variation: number; status?: string }> = {};
    let crypto: Record<string, { value: number; variation: number; status?: string }> = {};

    for (const row of cacheRows || []) {
      const val = row.value as Record<string, unknown>;
      const rowStatus = row.status as string;

      if (row.key.startsWith("rate_")) {
        const k = row.key.replace("rate_", "");
        rates[k] = { ...(val as { value: number; period: string; name?: string }), status: rowStatus };
      } else if (row.key.startsWith("currency_")) {
        const k = row.key.replace("currency_", "");
        currencies[k] = { ...(val as { value: number; variation: number }), status: rowStatus };
      } else if (row.key.startsWith("crypto_")) {
        const k = row.key.replace("crypto_", "");
        crypto[k] = { ...(val as { value: number; variation: number }), status: rowStatus };
      }
    }

    const response: Record<string, unknown> = {
      rates,
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
    log("error", "Unhandled error in market-data-service", { error: String(error) });
    return new Response(JSON.stringify({ error: "Erro interno." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
