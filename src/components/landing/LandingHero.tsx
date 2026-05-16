import { TrendingUp, ArrowRight, Handshake, ShieldCheck, BowArrow } from "lucide-react";
import { Button } from "@/components/ui/button";
import vetorproIcon from "@/assets/vetorpro-logo.svg";

export function LandingHero() {
  const pillars = [
  {
    icon: Handshake,
    title: "Propostas que fecham negócios",
    description: "Gere argumentos com IA, gráficos e sua marca em segundos."
  },
  {
    icon: ShieldCheck,
    title: "Segurança antes do contrato",
    description: "Antecipe taxas, seguros e custos reais de cada banco ao cliente."
  },
  {
    icon: BowArrow,
    title: "Dados do mercado financeiro",
    description: "SELIC, IPCA, INCC e câmbio atualizados em tempo real."
  }];


  return (
    <section className="relative py-20 pb-32 md:py-28 md:pb-44 bg-card border-b">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <img src={vetorproIcon} alt="VetorPro" className="h-10 w-10 md:h-12 md:w-12" />
              <span className="text-2xl md:text-3xl font-bold tracking-tight">
                <span className="text-primary">Vetor</span>
                <span style={{ color: "hsl(152 68% 38%)" }}>Pro</span>
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-foreground leading-tight">
              Clareza e Autoridade para Fechar Mais Negócios
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
              O VetorPro transforma dados complexos do mercado imobiliário em propostas profissionais, argumentos sólidos e apresentações que geram confiança no cliente — do cálculo à entrega com sua marca.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="hero" size="lg" asChild>
                <a href="#beneficios">
                  Ver como funciona
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#planos">Assinar Agora</a>
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
                  <p className="text-xs text-muted-foreground">Negócios, confiança e inteligência</p>
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