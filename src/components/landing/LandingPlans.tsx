import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Rocket, Building2 } from "lucide-react";
import { PlanType } from "@/contexts/SessionContext";

interface LandingPlansProps {
  onSelectPlan: (planId: PlanType) => void;
  selectedPlan: PlanType;
}

const plans = [
  {
    id: "basic" as PlanType,
    name: "Basic",
    price: "R$ 9,90",
    period: "/mês",
    description: "Para corretores autônomos",
    icon: Crown,
    color: "bg-muted",
    borderColor: "border-muted-foreground/30",
    buttonVariant: "outline" as const,
    features: [
      { text: "Simulador Financeiro SAC/PRICE", included: true },
      { text: "Painel de Cotações", included: true },
      { text: "Calculadora HP12C", included: true },
      { text: "Exportação PDF", included: false },
      { text: "Histórico de simulações", included: false },
      { text: "Personalização de marca", included: false },
    ],
  },
  {
    id: "pro" as PlanType,
    name: "Pro",
    price: "R$ 49,90",
    period: "/mês",
    description: "Para consultores profissionais",
    icon: Rocket,
    color: "bg-primary/10",
    borderColor: "border-primary",
    buttonVariant: "default" as const,
    popular: true,
    features: [
      { text: "Tudo do Basic", included: true },
      { text: "Exportação PDF profissional", included: true },
      { text: "Histórico ilimitado", included: true },
      { text: "Personalização de Tema", included: true },
      { text: "Propostas com IA", included: true },
      { text: "Suporte prioritário", included: true },
    ],
  },
  {
    id: "business" as PlanType,
    name: "Business/TEAM",
    price: "R$ 149,90",
    period: "/mês",
    priceNote: "até 5 usuários",
    description: "Para imobiliárias e construtoras",
    icon: Building2,
    color: "bg-success/10",
    borderColor: "border-success",
    buttonVariant: "default" as const,
    buttonClass: "bg-success hover:bg-success/90 text-success-foreground",
    features: [
      { text: "Tudo do Pro", included: true },
      { text: "Multiusuário e Dashboard", included: true },
      { text: "Relatórios corporativos", included: true },
      { text: "Integração via API", included: true },
      { text: "Gerenciador de equipe", included: true },
      { text: "Suporte dedicado", included: true },
    ],
  },
];

export function LandingPlans({ onSelectPlan, selectedPlan }: LandingPlansProps) {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Escolha o plano ideal para você
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Planos pensados para cada etapa do seu negócio imobiliário.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <Card
              key={plan.id}
              className={`relative card-shadow-animated cursor-pointer ${
                plan.popular ? "border-primary border-2 shadow-xl scale-105 z-10" : "border hover:border-primary/50"
              } ${selectedPlan === plan.id ? `ring-2 ring-offset-2 ring-primary` : ""}`}
              onClick={() => onSelectPlan(plan.id)}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full shadow-lg animate-pulse-slow">
                    Mais Popular
                  </span>
                </div>
              )}

              {selectedPlan === plan.id && (
                <div className="absolute top-4 right-4">
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              )}

              <CardHeader className={`rounded-t-lg ${plan.color} transition-all duration-300 pt-8`}>
                <div className="flex items-center gap-3 mb-3">
                  <plan.icon className="h-7 w-7 text-foreground" />
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                {plan.priceNote && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {plan.priceNote}
                  </p>
                )}
                <CardDescription className="mt-2 text-base">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-success shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                      )}
                      <span
                        className={
                          feature.included
                            ? "text-foreground"
                            : "text-muted-foreground/50"
                        }
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.buttonVariant}
                  size="lg"
                  className={`w-full shadow-md animate-pulse-button ${plan.buttonClass || ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPlan(plan.id);
                  }}
                >
                  Assinar agora
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Important Notice */}
        <div className="mt-12 max-w-2xl mx-auto animate-fade-in-up">
          <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/30 text-center card-shadow-animated">
            <p className="text-base font-medium text-foreground">
              🚫 <strong>Não há versão gratuita.</strong>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              O ImobCalcBR é uma ferramenta profissional exclusiva para corretores e investidores 
              que buscam excelência nas simulações imobiliárias.
            </p>
          </div>
        </div>

        {/* Enterprise note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Planos corporativos acima de 10 usuários sob consulta. 
          Condições sujeitas a contrato.
        </p>
      </div>
    </section>
  );
}
