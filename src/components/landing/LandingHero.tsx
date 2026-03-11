import { Landmark, TrendingUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import heroVideo from "@/assets/hero-background.mp4";
import heroImageMobile from "@/assets/hero-background-mobile.jpg";

export function LandingHero() {
  const isMobile = useIsMobile();

  return (
    <section className="relative py-20 md:py-32 overflow-hidden min-h-[600px] md:min-h-[700px]">
      {/* Video Background - Desktop */}
      {!isMobile && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster={heroImageMobile}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
      )}
      
      {/* Static Image Background - Mobile */}
      {isMobile && (
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImageMobile})` }}
        />
      )}
      
      {/* Blue Corporate Overlay - 60% opacity */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundColor: 'hsla(210, 79%, 46%, 0.6)',
          backdropFilter: 'blur(2px)'
        }} 
      />
      
      <div className="container relative max-w-4xl mx-auto text-center px-4 z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-fade-in-up">
          <div className="h-20 w-20 rounded-2xl bg-background/95 flex items-center justify-center shadow-xl backdrop-blur-sm">
            <Calculator className="h-10 w-10 text-primary" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight animate-fade-in-up drop-shadow-lg">
          Simulador Imobiliário Profissional para{" "}
          <span className="text-primary-foreground/90">Corretores e Investidores</span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed animate-fade-in-up-delay drop-shadow-md">
          Simule, compare e personalize financiamentos com precisão e design profissional. 
          A ferramenta definitiva para fechar mais negócios.
        </p>
        
      </div>
    </section>
  );
}
