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
          message: "Você atingiu o limite de propostas do plano gratuito. Faça upgrade para o plano Pro para propostas ilimitadas."
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

    const systemPrompt = `Você é um assistente especializado em gerar propostas profissionais de financiamento imobiliário para corretores de imóveis brasileiros.

Seu objetivo é criar um texto persuasivo, profissional e amigável que o corretor possa enviar diretamente ao cliente.

O texto deve:
- Ser personalizado com o nome do cliente
- Destacar os benefícios do financiamento
- Mencionar a economia gerada (se houver)
- Usar tom profissional mas acolhedor
- Ser formatado para fácil leitura
- Incluir uma chamada para ação no final
- Ter entre 200-400 palavras

IMPORTANTE: Responda APENAS com o texto da proposta, sem comentários adicionais.`;

    const userPrompt = `Gere uma proposta de financiamento para:

CLIENTE: ${proposalData.clientName}
IMÓVEL: ${proposalData.propertyDescription}

DADOS DO FINANCIAMENTO:
- Valor do imóvel: ${formatCurrency(proposalData.propertyValue)}
- Entrada: ${formatCurrency(proposalData.downPayment)} (${((proposalData.downPayment / proposalData.propertyValue) * 100).toFixed(1)}%)
- Valor financiado: ${formatCurrency(proposalData.propertyValue - proposalData.downPayment)}
- Taxa de juros: ${proposalData.interestRate}% ao ano
- Prazo: ${proposalData.termMonths} meses (${(proposalData.termMonths / 12).toFixed(1)} anos)
- Sistema: ${proposalData.amortizationType}
- Parcela inicial: ${formatCurrency(proposalData.monthlyPayment)}
- Total a pagar: ${formatCurrency(proposalData.totalPaid)}
- Total de juros: ${formatCurrency(proposalData.totalInterest)}
${proposalData.monthsSaved ? `- Economia de prazo: ${proposalData.monthsSaved} meses` : ""}
${proposalData.interestSaved ? `- Economia de juros: ${formatCurrency(proposalData.interestSaved)}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
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
    console.error("Error in generate-proposal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
