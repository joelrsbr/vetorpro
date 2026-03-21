import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Rocket, Building2, Loader2, ArrowRight } from "lucide-react";
import { PlanType } from "@/contexts/SessionContext";
import { STRIPE_PLANS } from "@/lib/stripe-plans";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface LandingPlansProps {
  onSelectPlan: (planId: PlanType) => void;
  selectedPlan: PlanType;
}

const plans = [
{
  id: "basic" as PlanType,
  name: "Basic",
  price: "R$ 29,90",
  period: "/mês",
  description: "Simulações ilimitadas e indexadores oficiais.",
  icon: Crown,
  buttonVariant: "outline" as const,
  features: [
  { text: "Até 10 Simulações (SAC/PRICE) por mês", included: true },
  { text: "2 Propostas com Inteligência Artificial por mês", included: true },
  { text: "Indexadores Oficiais (IPCA, IGP-M, INCC, TR, Poupança)", included: true },
  { text: "Simulador HP12C Integrado", included: true },
  { text: "Tabela de Amortizações e Arquitetura de Reforços Estratégicos", included: true },
  { text: "Histórico Recente de Simulações", included: true },
  { text: "Dashboard de Evolução de Saldo Devedor", included: true }]

},
{
  id: "pro" as PlanType,
  name: "Professional",
  price: "R$ 89,90",
  period: "/mês",
  description: "Cotações de Dólar/Euro em tempo real e Gestão de Reforços.",
  icon: Rocket,
  buttonVariant: "default" as const,
  features: [
  { text: "Tudo do Basic", included: true },
  { text: "Cotações Dólar/Euro em tempo real", included: true },
  { text: "Gestão de Reforços Estratégicos", included: true },
  { text: "Exportação de PDF Básico", included: true },
  { text: "Propostas com IA liberadas", included: true }]

},
{
  id: "business" as PlanType,
  name: "Business",
  price: "R$ 229,90",
  period: "/mês",
  description: "O Plano para Profissionais de Elite e Consultorias de Alto Padrão",
  icon: Building2,
  buttonVariant: "hero" as const,
  highlight: true,
  features: [
  { text: "Inclui todos os recursos do Plano Professional", included: true },
  { text: "Relatórios PDF Personalizados com sua Marca e CRECI", included: true },
  { text: "Datas Reais de Cronograma", included: true },
  { text: "Sondagem Estratégica Multi-Bancos", included: true },
  { text: "Dashboard Corporativo", included: true }]

}];


export function LandingPlans({ onSelectPlan, selectedPlan }: LandingPlansProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: PlanType) => {
    if (!planId) return;

    if (!user) {
      onSelectPlan(planId);
      return;
    }

    const stripePlan = STRIPE_PLANS[planId];
    if (!stripePlan) return;

    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: stripePlan.priceId }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Erro ao iniciar checkout",
        description: err.message || "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="planos" className="py-16 md:py-24 bg-muted/30 scroll-mt-20">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Escolha o plano ideal para você
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Planos pensados para cada etapa do seu negócio imobiliário.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {plans.map((plan, index) => {
            const isHighlight = (plan as any).highlight;
            return (
              <Card
                key={plan.id}
                className={`relative card-shadow-animated cursor-pointer transition-all duration-300 flex flex-col ${
                isHighlight ?
                "border-emerald-500 border-2 shadow-xl md:scale-105 z-10" :
                "border hover:border-primary/50"} ${
                selectedPlan === plan.id ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                onClick={() => onSelectPlan(plan.id)}
                style={{ animationDelay: `${index * 150}ms` }}>
                
                {isHighlight &&
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg uppercase tracking-widest">ELITE</span>
                  </div>
                }

                {selectedPlan === plan.id &&
                <div className="absolute top-4 right-4">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                }

                <CardHeader className={`rounded-t-lg transition-all duration-300 pt-8 ${isHighlight ? "bg-emerald-500/5" : ""}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <plan.icon className={`h-6 w-6 ${isHighlight ? "text-emerald-500" : "text-muted-foreground"}`} />
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2 text-sm">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) =>
                    <li key={idx} className="flex items-center gap-3">
                        {feature.included ?
                      <Check className="h-4 w-4 text-success shrink-0" /> :

                      <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      }
                        <span className={`text-sm ${feature.included ? "text-foreground" : "text-muted-foreground/50"}`}>
                          {feature.text}
                        </span>
                      </li>
                    )}
                  </ul>

                  <Button
                    variant={plan.buttonVariant}
                    size="lg"
                    className={`w-full ${isHighlight ? "shadow-button" : ""}`}
                    disabled={loadingPlan === plan.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubscribe(plan.id);
                    }}>
                    
                    {loadingPlan === plan.id ?
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
                    null}
                    Assinar Agora
                    {isHighlight && <ArrowRight className="h-4 w-4 ml-2" />}
                  </Button>
                </CardContent>
              </Card>);

          })}
        </div>

        {/* Notice */}
        <div className="mt-12 max-w-2xl mx-auto animate-fade-in-up">
          <div className="p-5 rounded-lg bg-muted/50 border text-center">
            <p className="text-sm font-medium text-foreground">
              O VetorPro é uma plataforma profissional exclusiva.
            </p>
            <p className="text-xs text-muted-foreground mt-1">Não há versão gratuita. Planos corporativos sob consulta.</p>
          </div>
        </div>
      </div>
    </section>);

}