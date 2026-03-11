import { Landmark, TrendingUp, ArrowRight, BarChart3, Shield, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  const metrics = [
    { label: "Economia média", value: "R$ 47k", sub: "em juros por contrato" },
    { label: "Simulações", value: "12.000+", sub: "realizadas na plataforma" },
    { label: "Precisão", value: "99,8%", sub: "nos cálculos SAC/PRICE" },
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

          {/* Right — Executive Dashboard Preview */}
          <div className="animate-fade-in-up-delay">
            <div className="rounded-xl border bg-background p-6 space-y-5 shadow-sm">
              {/* Mini header */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Painel Executivo</p>
                    <p className="text-xs text-muted-foreground">Visão consolidada</p>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded">LIVE</span>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-4">
                {metrics.map((m) => (
                  <div key={m.label} className="text-center space-y-1">
                    <p className="text-xl md:text-2xl font-bold text-foreground">{m.value}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{m.sub}</p>
                  </div>
                ))}
              </div>

              {/* Mini feature list */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[
                  { icon: BarChart3, label: "SAC & PRICE" },
                  { icon: Shield, label: "Dados Seguros" },
                  { icon: FileText, label: "Relatórios PDF" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
                    <f.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-medium text-foreground">{f.label}</span>
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
