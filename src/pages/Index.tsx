import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { PricingSection } from "@/components/pricing/PricingSection";
import { FinancingCalculator } from "@/components/calculator/FinancingCalculator";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <HeroSection />
        
        {/* Calculator Demo Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">
                Experimente Agora
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Faça uma simulação completa de financiamento imobiliário em segundos.
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <FinancingCalculator />
            </div>
          </div>
        </section>

        <FeaturesSection />
        <PricingSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
