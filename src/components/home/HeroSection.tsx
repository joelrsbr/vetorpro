import { Button } from "@/components/ui/button";
import { Landmark, TrendingUp, Sparkles, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  const features = [
    "Simulações SAC e PRICE",
    "Amortizações inteligentes",
    "Propostas com IA",
  ];

  return (
    <section className="relative overflow-hidden gradient-hero py-16 md:py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in">
            <Sparkles className="h-4 w-4" />
            A plataforma #1 para corretores de elite
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight animate-slide-up">
            VetorPro:{" "}
            <span className="text-gradient">Inteligência Patrimonial</span>{" "}
            e Estratégias de Amortização
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Transforme dados complexos de financiamento em relatórios de autoridade. 
            Simulações SAC e PRICE, amortizações inteligentes e propostas com IA.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card shadow-sm border"
              >
                <Check className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/login">
                <Landmark className="h-5 w-5 mr-2" />
                Iniciar
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link to="/precos">Ver Planos</Link>
            </Button>
          </div>

          {/* Trust indicator */}
          <p className="text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.4s" }}>
            ✓ Planos acessíveis · ✓ Cancele quando quiser · ✓ Suporte dedicado
          </p>
        </div>
      </div>
    </section>
  );
}
