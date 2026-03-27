import { TrendingUp, ArrowRight, Handshake, ShieldCheck, BowArrow } from "lucide-react";
import { Button } from "@/components/ui/button";
import vetorproIcon from "@/assets/vetorpro-icon.png";

export function LandingHero() {
  const pillars = [
  {
    icon: Handshake,
    title: "Potencialização de Negócios",
    description: "Use o fator relacionamento para potencializar suas negociações. Identifique o melhor cenário para o seu cliente e forneça o argumento certo para buscar condições exclusivas."
  },
  {
    icon: ShieldCheck,
    title: "Confiança Estratégica",
    description: "Antecipe custos extras e taxas bancárias ocultas. Gere confiança estratégica ao eliminar surpresas no fechamento e proteja sua reputação diante de investidores."
  },
  {
    icon: BowArrow,
    title: "Inteligência Evolutiva",
    description: "Um sistema vivo que evolui diariamente. Unimos a velocidade da IA com a ética e a curadoria humana da VetorPro para que você esteja sempre atualizado com o mercado."
  }];


  return (
    <section className="relative py-20 pb-32 md:py-28 md:pb-44 bg-card border-b">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="space-y-6 animate-fade-in-up">
            <div>
            <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight flex items-center gap-3">
                <img src={vetorproIcon} alt="VetorPro" className="h-12 w-12 md:h-14 md:w-14" />
                <span>
                  <span className="text-primary">Vetor</span>
                  <span style={{ color: "hsl(152 68% 38%)" }}>Pro</span>
                </span>
              </h1>
            </div>

            <p className="text-xl md:text-2xl font-light text-muted-foreground leading-relaxed max-w-lg">
              A plataforma de Inteligência Imobiliária que acelera sua jornada do básico à Consultoria de Elite.
            </p>

            <p className="text-sm md:text-base text-muted-foreground/80 leading-relaxed max-w-lg">
              Evoluímos a cada dia para transformar dados complexos em clareza absoluta. Conquiste a confiança do investidor e acelere seu sucesso com a IA, Ética e a Curadoria Humana da VetorPro.
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