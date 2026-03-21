import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const userId = claimsData.claims.sub;

    // Check usage limits
    const { data: limitsData, error: limitsError } = await supabase.rpc("check_and_reset_limits", {
      p_user_id: userId,
    });

    if (limitsError || !limitsData?.[0]?.can_generate_proposal) {
      return new Response(
        JSON.stringify({ 
          error: "Limite de propostas atingido",
          message: "Você atingiu o limite de propostas do seu plano atual. Faça upgrade para liberar propostas ilimitadas."
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const proposalData: ProposalRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não está configurada");
    }

    const formatCurrency = (value: number) => {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    };

    const isBusinessMode = proposalData.businessMode === true;

    const businessSystemPrompt = `Você é um estrategista financeiro imobiliário sênior do VetorPro — plataforma de Inteligência Estratégica Imobiliária. Gere propostas executivas curtas e impactantes.

REGRAS OBRIGATÓRIAS:
- NÃO use markdown, negrito, itálico ou asteriscos (*)
- NÃO use formatação de lista com hífens ou bullets
- Escreva em parágrafos corridos, como um documento executivo
- NUNCA escreva valores monetários por extenso. Use SEMPRE o formato R$ 0.000,00 (ex: R$ 450.000,00)
- Use obrigatoriamente os termos: "Análise Estratégica de Crédito", "Antecipação de Cenários de Amortização" e "Segurança Patrimonial"
- Enfatize que o VetorPro calculou a rota de menor custo financeiro para o cliente
- Use tom de exclusividade e urgência para fechamento do negócio

ESTRUTURA:
1. Abertura executiva mencionando "Análise Estratégica de Crédito" com dados-chave do investimento
2. Destaque em parágrafo curto: Entrada, Parcela Inicial e Sistema escolhido
3. "Antecipação de Cenários de Amortização": análise estratégica de economia com amortizações e projeção de ganho patrimonial
4. "Segurança Patrimonial": fechamento com senso de urgência, mencionando que o VetorPro projetou a rota otimizada de menor custo
5. Assinatura: "Proposta gerada com inteligência VetorPro."

Ter entre 300-500 palavras. Formato elegante para PDF corporativo.`;

    const standardSystemPrompt = `Você é um consultor imobiliário de alto nível do VetorPro — plataforma de Inteligência Estratégica Imobiliária. Escreva propostas de financiamento com linguagem profissional, estratégica e orientada a resultados.

REGRAS OBRIGATÓRIAS:
- NÃO use markdown, negrito, itálico ou asteriscos (*)
- NÃO use formatação de lista com hífens ou bullets
- NÃO repita frases como "gere uma proposta profissional" ou "conquiste seu imóvel"
- NUNCA escreva valores monetários por extenso. Use SEMPRE o formato R$ 0.000,00 (ex: R$ 450.000,00)
- Use obrigatoriamente os termos: "Análise Estratégica de Crédito", "Antecipação de Cenários de Amortização" e "Segurança Patrimonial"
- Enfatize que o VetorPro calculou a rota de menor custo financeiro para o cliente
- Use tom humano, profissional e estratégico
- Retorne APENAS o texto limpo da proposta

ESTRUTURA DA PROPOSTA:
1. Introdução personalizada com o nome do cliente, mencionando "Análise Estratégica de Crédito"
2. Parágrafo curto destacando: Entrada, Parcela Inicial e Sistema (SAC ou PRICE)
3. "Antecipação de Cenários de Amortização": explicação dos benefícios do modelo escolhido e economia projetada
4. "Segurança Patrimonial": argumento financeiro de que o VetorPro projetou a rota otimizada para este perfil
5. Fechamento com convite à ação (agendar contato, validar documentação)
6. Assinatura: "Proposta gerada com inteligência VetorPro."

Ter entre 300-450 palavras.`;

    const sistemaTipo = proposalData.amortizationType.toUpperCase() === "SAC" ? "SAC" : "PRICE";
    const entradaPercentual = ((proposalData.downPayment / proposalData.propertyValue) * 100).toFixed(1);
    const prazoAnos = (proposalData.termMonths / 12).toFixed(1);

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
      throw new Error("Resposta da IA vazia");
    }

    // Increment proposal count
    await supabase
      .from("profiles")
      .update({ proposals_used: limitsData[0].proposals_remaining === 999999 ? 0 : 2 - limitsData[0].proposals_remaining + 1 })
      .eq("user_id", userId);

    // Save proposal to database
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
      console.error("Error saving proposal:", saveError);
    }

    return new Response(
      JSON.stringify({ 
        proposalText,
        proposalId: savedProposal?.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[GENERATE-PROPOSAL] Error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "Erro ao gerar proposta. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
