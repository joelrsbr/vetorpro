import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProposalRequest {
  clientName: string;
  propertyDescription: string;
  propertyValue: number;
  downPayment: number;
  interestRate: number;
  termMonths: number;
  amortizationType: string;
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
  monthsSaved?: number;
  interestSaved?: number;
  businessMode?: boolean;
  salesArguments?: string;
  idempotencyKey?: string;
}

// In-memory idempotency store (per instance lifetime)
const processedKeys = new Map<string, { result: string; timestamp: number }>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiting: max 5 proposal generations per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
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

function cleanExpiredKeys() {
  const now = Date.now();
  for (const [key, entry] of processedKeys) {
    if (now - entry.timestamp > IDEMPOTENCY_TTL_MS) {
      processedKeys.delete(key);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === 1. Authentication ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // === Rate limiting ===
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Aguarde um momento antes de tentar novamente.", code: "RATE_LIMITED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === 2. Parse and validate input ===
    const rawBody = await req.json();
    const proposalData: ProposalRequest = rawBody;

    // Idempotency check
    if (proposalData.idempotencyKey) {
      cleanExpiredKeys();
      const cached = processedKeys.get(`${userId}:${proposalData.idempotencyKey}`);
      if (cached) {
        console.log("[GENERATE-PROPOSAL] Idempotency hit, returning cached result");
        return new Response(cached.result, {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // String validation
    if (!proposalData.clientName || typeof proposalData.clientName !== "string" || proposalData.clientName.length > 200) {
      return new Response(JSON.stringify({ error: "Nome do cliente inválido (máximo 200 caracteres)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!proposalData.propertyDescription || typeof proposalData.propertyDescription !== "string" || proposalData.propertyDescription.length > 500) {
      return new Response(JSON.stringify({ error: "Descrição do imóvel inválida (máximo 500 caracteres)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate optional salesArguments
    if (proposalData.salesArguments && (typeof proposalData.salesArguments !== "string" || proposalData.salesArguments.length > 500)) {
      return new Response(JSON.stringify({ error: "Argumentos de venda inválidos (máximo 500 caracteres)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Numeric validation
    const numericFields = [
      { key: "propertyValue", min: 1, max: 100_000_000 },
      { key: "downPayment", min: 0, max: 100_000_000 },
      { key: "interestRate", min: 0, max: 100 },
      { key: "termMonths", min: 1, max: 600 },
      { key: "monthlyPayment", min: 0, max: 100_000_000 },
      { key: "totalPaid", min: 0, max: 1_000_000_000 },
      { key: "totalInterest", min: 0, max: 1_000_000_000 },
    ] as const;

    for (const { key, min, max } of numericFields) {
      const val = (proposalData as any)[key];
      if (typeof val !== "number" || !Number.isFinite(val) || val < min || val > max) {
        return new Response(JSON.stringify({ error: `Campo ${key} inválido.` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (proposalData.downPayment >= proposalData.propertyValue) {
      return new Response(JSON.stringify({ error: "Entrada deve ser menor que o valor do imóvel." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 3. Check credits BEFORE calling AI ===
    const { data: limitsData, error: limitsError } = await supabase.rpc("check_and_reset_limits", {
      p_user_id: userId,
    });

    if (limitsError || !limitsData?.[0]?.can_generate_proposal) {
      return new Response(
        JSON.stringify({
          error: "Limite de propostas atingido",
          message: "Você atingiu o limite de propostas do seu plano atual. Faça upgrade para continuar.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === 4. Call AI ===
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não está configurada");
    }

    const formatCurrency = (value: number) =>
      value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const isBusinessMode = proposalData.businessMode === true;

    const businessSystemPrompt = `Você é um ghostwriter de propostas executivas para corretores imobiliários de alto nível. Escreva como se o próprio corretor estivesse assinando o documento. O protagonista é sempre o corretor, nunca uma plataforma ou sistema.

REGRAS OBRIGATÓRIAS:
- NÃO use markdown, negrito, itálico ou asteriscos (*)
- NÃO use formatação de lista com hífens ou bullets
- Escreva em parágrafos corridos, como um documento executivo
- NUNCA escreva valores monetários por extenso. Use SEMPRE o formato R$ 0.000,00 (ex: R$ 450.000,00)
- NUNCA escreva "por cento" por extenso. Use SEMPRE o símbolo % (ex: 32%, 9,5%)
- Sempre que citar juros, especifique se a taxa é mensal (a.m.) ou anual (a.a.)
- Evite repetir o nome da cidade ou do cliente mais de 2 vezes no mesmo parágrafo para manter a fluidez
- Use os termos: "Análise Estratégica", "Antecipação de Cenários de Amortização" e "Segurança Patrimonial"
- NUNCA mencione "VetorPro", "algoritmos", "cálculos automatizados", "inteligência artificial" ou "plataforma" no texto
- NUNCA use frases como "Nosso compromisso no VetorPro é..." ou "Os algoritmos calculam...". O corretor é o autor
- Use linguagem em primeira pessoa do corretor: "Minha análise estratégica identificou...", "Esta recomendação pauta-se em..."
- Substitua "dados precisos" por "dados acurados"
- Use tom de exclusividade e urgência para fechamento do negócio

ESTRUTURA:
1. Abertura executiva mencionando "Análise Estratégica" com dados-chave do investimento, em tom pessoal do corretor
2. Destaque em parágrafo curto: Entrada, Parcela Inicial e Sistema escolhido
3. "Antecipação de Cenários de Amortização": análise estratégica de economia com amortizações e projeção de ganho patrimonial
4. "Segurança Patrimonial": use a frase "A Segurança Patrimonial é o pilar central desta recomendação, por isso buscamos apresentar aqui a rota de menor custo financeiro para o seu perfil"
5. Fechamento focado no corretor com convite à ação (agendar contato, validar documentação). NÃO inclua assinatura de plataforma

Ter entre 300-500 palavras. Formato elegante para PDF corporativo.`;

    const standardSystemPrompt = `Você é um ghostwriter de propostas de financiamento imobiliário para corretores profissionais. Escreva como se o próprio corretor estivesse assinando o documento. O protagonista é sempre o corretor, nunca uma plataforma ou sistema.

REGRAS OBRIGATÓRIAS:
- NÃO use markdown, negrito, itálico ou asteriscos (*)
- NÃO use formatação de lista com hífens ou bullets
- NÃO repita frases como "gere uma proposta profissional" ou "conquiste seu imóvel"
- NUNCA escreva valores monetários por extenso. Use SEMPRE o formato R$ 0.000,00 (ex: R$ 450.000,00)
- NUNCA escreva "por cento" por extenso. Use SEMPRE o símbolo % (ex: 32%, 9,5%)
- Sempre que citar juros, especifique se a taxa é mensal (a.m.) ou anual (a.a.)
- Evite repetir o nome da cidade ou do cliente mais de 2 vezes no mesmo parágrafo para manter a fluidez
- Use os termos: "Análise Estratégica", "Antecipação de Cenários de Amortização" e "Segurança Patrimonial"
- NUNCA mencione "VetorPro", "algoritmos", "cálculos automatizados", "inteligência artificial" ou "plataforma" no texto
- NUNCA use frases como "Nosso compromisso no VetorPro é..." ou "Os algoritmos calculam...". O corretor é o autor
- Use linguagem em primeira pessoa do corretor: "Minha análise estratégica identificou...", "Esta recomendação pauta-se em..."
- Substitua "dados precisos" por "dados acurados"
- Use tom humano, profissional e estratégico
- Retorne APENAS o texto limpo da proposta

ESTRUTURA DA PROPOSTA:
1. Introdução personalizada com o nome do cliente, mencionando "Análise Estratégica", em tom pessoal do corretor
2. Parágrafo curto destacando: Entrada, Parcela Inicial e Sistema (SAC ou PRICE)
3. "Antecipação de Cenários de Amortização": explicação dos benefícios do modelo escolhido e economia projetada
4. "Segurança Patrimonial": use a frase "A Segurança Patrimonial é o pilar central desta recomendação, por isso buscamos apresentar aqui a rota de menor custo financeiro para o seu perfil"
5. Fechamento focado no corretor com convite à ação (agendar contato, validar documentação). NÃO inclua assinatura de plataforma

Ter entre 300-450 palavras.`;

    const sistemaTipo = proposalData.amortizationType.toUpperCase() === "SAC" ? "SAC" : "PRICE";
    const entradaPercentual = ((proposalData.downPayment / proposalData.propertyValue) * 100).toFixed(1);
    const prazoAnos = (proposalData.termMonths / 12).toFixed(1);

    const salesArgsBlock = proposalData.salesArguments?.trim()
      ? `\nArgumentos de Venda do Corretor (incorpore naturalmente no texto):\n${proposalData.salesArguments.trim()}\n`
      : "";

    const userPrompt = isBusinessMode
      ? `Com base nestes dados, gere uma proposta executiva curta. Foque no impacto financeiro: quanto o cliente economiza em juros ao fazer as amortizações sugeridas. Use um tom de exclusividade e urgência para o fechamento do negócio.

Dados do Investimento:
- Cliente: ${proposalData.clientName}
- Imóvel: ${proposalData.propertyDescription}
- Valor do Imóvel: ${formatCurrency(proposalData.propertyValue)}
- Entrada: ${formatCurrency(proposalData.downPayment)} (${entradaPercentual}%)
- Financiamento: ${formatCurrency(proposalData.propertyValue - proposalData.downPayment)}
- Taxa de Juros: ${proposalData.interestRate}% a.a.
- Prazo: ${proposalData.termMonths} meses (${prazoAnos} anos)
- Sistema: ${sistemaTipo}
- Parcela Inicial: ${formatCurrency(proposalData.monthlyPayment)}
- Total Projetado: ${formatCurrency(proposalData.totalPaid)}
- Juros Totais: ${formatCurrency(proposalData.totalInterest)}
${proposalData.monthsSaved ? `- Redução de Prazo com Amortização Extra: ${proposalData.monthsSaved} meses` : ""}
${proposalData.interestSaved ? `- Economia em Juros com Amortização Extra: ${formatCurrency(proposalData.interestSaved)}` : ""}
${salesArgsBlock}
Retorne apenas o texto executivo pronto para PDF corporativo.`
      : `Gere uma proposta profissional de financiamento imobiliário com base nos dados abaixo, usando linguagem comercial natural, sem formatação Markdown, sem usar asteriscos ou negrito.

Dados:
- Nome do cliente: ${proposalData.clientName}
- Descrição do imóvel: ${proposalData.propertyDescription}
- Valor do imóvel: ${formatCurrency(proposalData.propertyValue)}
- Entrada: ${formatCurrency(proposalData.downPayment)} (${entradaPercentual}%)
- Valor financiado: ${formatCurrency(proposalData.propertyValue - proposalData.downPayment)}
- Taxa de juros anual: ${proposalData.interestRate}%
- Prazo: ${proposalData.termMonths} meses (${prazoAnos} anos)
- Sistema: ${sistemaTipo}
- Parcela inicial: ${formatCurrency(proposalData.monthlyPayment)}
- Total a pagar: ${formatCurrency(proposalData.totalPaid)}
- Total de juros: ${formatCurrency(proposalData.totalInterest)}
${proposalData.monthsSaved ? `- Economia de prazo com amortização extra: ${proposalData.monthsSaved} meses` : ""}
${proposalData.interestSaved ? `- Economia de juros com amortização extra: ${formatCurrency(proposalData.interestSaved)}` : ""}

Retorne apenas o texto limpo da proposta, pronto para enviar ao cliente.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: isBusinessMode ? businessSystemPrompt : standardSystemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      // AI failed → NO credit deducted
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao gerar proposta com IA");
    }

    const aiResponse = await response.json();
    const proposalText = aiResponse.choices?.[0]?.message?.content;

    if (!proposalText) {
      // AI returned empty → NO credit deducted
      throw new Error("Resposta da IA vazia");
    }

    // === 5. ATOMIC: Save proposal FIRST, then deduct credit ===
    const { data: savedProposal, error: saveError } = await supabase
      .from("proposals")
      .insert({
        user_id: userId,
        client_name: proposalData.clientName,
        property_description: proposalData.propertyDescription,
        proposal_text: proposalText,
        interest_savings: proposalData.interestSaved || null,
        term_savings_months: proposalData.monthsSaved || null,
      })
      .select()
      .single();

    if (saveError) {
      // DB save failed → NO credit deducted
      console.error("Error saving proposal:", saveError);
      throw new Error("Erro ao salvar proposta no banco de dados");
    }

    // Only deduct credit AFTER successful AI + DB save
    const { error: incrementError } = await supabase.rpc("increment_proposal_count", {
      p_user_id: userId,
    });

    if (incrementError) {
      console.error("Error incrementing proposal count:", incrementError);
      // Proposal was saved but credit wasn't deducted — acceptable (user benefits)
    }

    const resultJson = JSON.stringify({
      proposalText,
      proposalId: savedProposal?.id,
    });

    // Cache result for idempotency
    if (proposalData.idempotencyKey) {
      processedKeys.set(`${userId}:${proposalData.idempotencyKey}`, {
        result: resultJson,
        timestamp: Date.now(),
      });
    }

    return new Response(resultJson, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[GENERATE-PROPOSAL] Error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "Erro ao gerar proposta. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
