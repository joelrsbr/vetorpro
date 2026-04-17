import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// BCB SGS Série 192 — INCC-DI (variação % mensal)
const INCC_SERIES_ID = 192;

function log(level: string, msg: string, extra?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), level, msg, ...extra };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function buildInsight(value: number, refDate: string): string {
  const month = new Date(refDate).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  if (value > 1.0) {
    return `O INCC de ${month} fechou em ${value.toFixed(2)}%, sinalizando pressão de custos no setor da construção. Use este dado para reforçar ao cliente a importância de travar o financiamento agora — antes de novos repasses.`;
  }
  if (value > 0.5) {
    return `INCC de ${month}: ${value.toFixed(2)}%. Variação dentro da média histórica recente. Bom momento para justificar contratos com correção pelo INCC sem alarme excessivo.`;
  }
  return `INCC de ${month} em ${value.toFixed(2)}% — desaceleração relevante. Argumente que o cenário favorece quem fecha negócio agora, antes de uma possível retomada de pressão inflacionária no setor.`;
}

async function fetchAndStoreINCC(admin: ReturnType<typeof createClient>) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 18); // últimos 18 meses

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${INCC_SERIES_ID}/dados?formato=json&dataInicial=${fmt(start)}&dataFinal=${fmt(end)}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    log("error", "BCB INCC fetch failed", { status: res.status });
    throw new Error(`BCB returned ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    log("warn", "BCB INCC returned no data");
    return { inserted: 0 };
  }

  let inserted = 0;
  for (const item of data) {
    // BCB returns date as DD/MM/YYYY — last day of reference month
    const [d, m, y] = String(item.data).split("/");
    const refDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    const value = parseFloat(item.valor);
    if (isNaN(value)) continue;

    // Skip if already exists for this ref date
    const { data: existing } = await admin
      .from("market_history")
      .select("id")
      .eq("key", "incc")
      .eq("data_referencia", refDate)
      .maybeSingle();

    if (existing) continue;

    const insight = buildInsight(value, refDate);

    const { error } = await admin.from("market_history").insert({
      key: "incc",
      value,
      unidade: "percent",
      data_referencia: refDate,
      insight,
      recorded_at: new Date().toISOString(),
    });

    if (error) {
      log("error", "Insert failed for INCC", { error: error.message, refDate });
    } else {
      inserted++;
    }
  }

  log("info", "INCC sync complete", { inserted, total: data.length });
  return { inserted, total: data.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const result = await fetchAndStoreINCC(admin);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("error", "fetch-incc failed", { error: String(error) });
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
