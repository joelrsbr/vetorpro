import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BusinessTeamHeader } from "@/components/layout/BusinessTeamHeader";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { PricingSection } from "@/components/pricing/PricingSection";
import { FinancingCalculator } from "@/components/calculator/FinancingCalculator";
import { QuotesPanel } from "@/components/business/QuotesPanel";
import { useSession } from "@/contexts/SessionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";

const Index = () => {
  const { session } = useSession();
  const { user } = useAuth();
  const { plan, isActive } = useSubscription();

  // User is logged in if either Supabase auth OR session context says so
  const isLoggedIn = !!user || session.isLoggedIn;
  const showQuotes = isActive && (plan === "pro" || plan === "business");

  return (
    <div className="min-h-screen flex flex-col animate-fade-in">
      {/* Show BusinessTeamHeader for session-based login, Header for Supabase auth or visitors */}
      {session.isLoggedIn ? <BusinessTeamHeader /> : <Header />}
      
      <main className="flex-1">
        {isLoggedIn ? (
          <>
            {/* Logged-in: Calculator first, NO Hero */}
            <section className="pt-8 pb-16 md:pt-12 md:pb-24 bg-background">
              <div className="container">
                <div className="flex items-center justify-between mb-12">
                  <div className="text-center flex-1 space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold">
                      Simulador de Financiamento
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                      Faça uma simulação completa de financiamento imobiliário em segundos.
                    </p>
                  </div>
                  {showQuotes && <QuotesPanel />}
                </div>
                <div className="max-w-4xl mx-auto">
                  <FinancingCalculator />
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Visitor: Hero first */}
            <HeroSection />
            <section id="experimente" className="py-16 md:py-24 bg-background scroll-mt-20">
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
          </>
        )}

        <FeaturesSection />
        <PricingSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
