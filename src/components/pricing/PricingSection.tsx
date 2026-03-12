import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Loader2 } from "lucide-react";
import { STRIPE_PLANS } from "@/lib/stripe-plans";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type PlanKey = "basic" | "pro" | "business";

const plans = [
  {
    key: "basic" as PlanKey,
    name: "Basic",
    price: "R$29,90",
    period: "/mês",
    description: "Para corretores autônomos",
    features: [
      "Simulação simples SAC/PRICE",
      "Calculadora HP12C",
      "10 simulações/mês",
      "2 propostas com IA/mês",
    ],
    limitations: [
      "Sem exportação de PDF",
      "Sem comparativo Multi-Bancos",
    ],
    cta: "Assinar Basic",
    variant: "outline" as const,
    popular: false,
  },
  {
    key: "pro" as PlanKey,
    name: "Pro",
    price: "R$59,90",
    period: "/mês",
    description: "Para consultores profissionais",
    features: [
      "Tudo do Basic",
      "Simulações ilimitadas",
      "Propostas com IA ilimitadas",
      "Exportação PDF básica",
      "Visualização de indexadores",
    ],
    limitations: [
      "Sem comparativo Multi-Bancos",
    ],
    cta: "Assinar Pro",
    variant: "hero" as const,
    popular: true,
  },
  {
    key: "business" as PlanKey,
    name: "Business/TEAM",
    price: "R$149,90",
    period: "/mês",
    description: "Para imobiliárias e construtoras",
    features: [
      "Tudo do Pro",
      "Propostas com IA + branding personalizado",
      "Upload de logo e CRECI no PDF",
      "Multiusuário (até 5 usuários)",
      "Dashboard corporativo",
      "Integração via API",
      "Suporte dedicado",
    ],
    limitations: [],
    cta: "Assinar Business",
    variant: "default" as const,
    popular: false,
    highlight: true,
  },
];

export function PricingSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planKey: PlanKey) => {
    if (!user) {
      navigate("/login");
      return;
    }

    const stripePlan = STRIPE_PLANS[planKey];
    if (!stripePlan) return;

    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: stripePlan.priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Erro ao iniciar checkout",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Zap className="h-4 w-4" />
            Preços simples e transparentes
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">
            Escolha o plano ideal para você
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Planos pensados para cada etapa do seu negócio imobiliário.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.name}
              className={`relative shadow-card hover:shadow-lg transition-all duration-300 ${
                plan.popular ? "border-primary border-2 scale-105" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 px-4 py-1 rounded-full gradient-primary text-primary-foreground text-sm font-medium">
                    <Sparkles className="h-3 w-3" />
                    Mais Popular
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-3 opacity-50">
                      <span className="h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                        ✕
                      </span>
                      <span className="text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.variant} 
                  size="lg" 
                  className="w-full"
                  disabled={loadingPlan === plan.key}
                  onClick={() => handleSubscribe(plan.key)}
                >
                  {loadingPlan === plan.key ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : null}
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>✓ Cancele a qualquer momento · ✓ Sem taxas ocultas · ✓ Garantia de 7 dias</p>
        </div>
      </div>
    </section>
  );
}
