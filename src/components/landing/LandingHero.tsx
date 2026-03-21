import { TrendingUp, ArrowRight, Scale, Eye, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  const pillars = [
  {
    icon: Scale,
    title: "Economia Efetiva",
    description: "Visualize a Economia Efetiva gerada por aportes estratégicos e amortizações inteligentes."
  },
  {
    icon: Eye,
    title: "Cronograma Real",
    description: "Obtenha um Cronograma Real de fluxo de caixa, com datas precisas para cada reforço programado."
  },
  {
    icon: Target,
    title: "Consultoria de Alto Padrão",
    description: "Eleve o nível da sua consultoria entregando clareza técnica e transparência ao seu cliente final."
  }];


  return (
    <section className="relative py-20 md:py-28 bg-card border-b">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="space-y-6 animate-fade-in-up">
            <div>
            <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight">
                <span className="text-primary">Vetor</span>
                <span style={{ color: "hsl(152 68% 38%)" }}>Pro</span>
              </h1>
            </div>

            <p className="text-xl md:text-2xl font-light text-muted-foreground leading-relaxed max-w-lg">
              Antecipe o Futuro do Crédito Imobiliário.
            </p>

            <p className="text-sm md:text-base text-muted-foreground/80 leading-relaxed max-w-lg">
              A plataforma de inteligência estratégica que transforma dados de mercado em clareza para investidores e consultores de alto padrão.
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
                  <p className="text-sm font-semibold text-foreground">Por que sua Estratégia precisa do VetorPro?</p>
                  <p className="text-xs text-muted-foreground">Economia, organização e consultoria</p>
                </div>
              </div>

              <div className="space-y-4">
                {pillars.map((p) =>
                <div key={p.title} className="flex gap-3 items-start">
                    <div className="h-9 w-9 rounded-md bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                      <p.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>);

}