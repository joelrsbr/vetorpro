import { Calculator, Building2, TrendingUp } from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-muted/30" />
      <div className="absolute top-20 right-10 opacity-10">
        <Building2 className="h-64 w-64 text-primary" />
      </div>
      <div className="absolute bottom-10 left-10 opacity-10">
        <TrendingUp className="h-48 w-48 text-primary" />
      </div>
      
      <div className="container relative max-w-4xl mx-auto text-center px-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center shadow-xl">
            <Calculator className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
          Simulador Imobiliário Profissional para{" "}
          <span className="text-primary">Corretores e Investidores</span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Simule, compare e personalize financiamentos com precisão e design profissional. 
          A ferramenta definitiva para fechar mais negócios.
        </p>
        
        {/* Brand name */}
        <div className="mt-8">
          <span className="text-sm font-medium text-muted-foreground">
            Desenvolvido por
          </span>
          <h2 className="text-2xl font-bold text-foreground mt-1">
            ImobCalcBR <span className="text-primary">Business/TEAM</span>
          </h2>
        </div>
      </div>
    </section>
  );
}
