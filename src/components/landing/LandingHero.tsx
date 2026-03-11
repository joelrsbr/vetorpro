import { Landmark, TrendingUp, ArrowRight, Scale, Eye, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  const pillars = [
    {
      icon: Scale,
      title: "Fidelidade Normativa",
      description: "Cálculos rigorosos baseados nas metodologias oficiais SAC e PRICE.",
    },
    {
      icon: Eye,
      title: "Transparência de Taxas",
      description: "Inclusão de custos de seguros e taxas de administração para um Custo Efetivo Total (CET) real.",
    },
    {
      icon: Target,
      title: "Estratégias de Antecipação",
      description: "Algoritmos focados em encontrar o ponto ótimo de amortização para maximizar a economia do investidor.",
    },
  ];

  return (
    <section className="relative py-20 md:py-28 bg-card border-b">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/8 border border-primary/15">
              <Landmark className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium tracking-wide text-primary uppercase">
                Consultoria Patrimonial
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold leading-tight text-foreground tracking-tight">
              VetorPro: Gestão Estratégica de Amortização Imobiliária
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
              Transforme cálculos complexos em decisões patrimoniais sólidas. 
              Precisão técnica para consultores e investidores.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="hero" size="lg" asChild>
                <a href="#planos">
                  Assinar Agora
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#beneficios">Conhecer Recursos</a>
              </Button>
            </div>
          </div>

          {/* Right — Trust Pillars */}
          <div className="animate-fade-in-up-delay">
            <div className="rounded-xl border bg-background p-6 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 border-b pb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Pilares de Confiança</p>
                  <p className="text-xs text-muted-foreground">Base técnica da plataforma</p>
                </div>
              </div>

              <div className="space-y-4">
                {pillars.map((p) => (
                  <div key={p.title} className="flex gap-3 items-start">
                    <div className="h-9 w-9 rounded-md bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                      <p.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}