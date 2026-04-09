import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MarketTicker } from "@/components/layout/MarketTicker";
import { BusinessTeamHeader } from "@/components/layout/BusinessTeamHeader";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { PricingSection } from "@/components/pricing/PricingSection";
import { FinancingCalculator } from "@/components/calculator/FinancingCalculator";
import { BankComparisonModule } from "@/components/business/BankComparisonModule";
import { useSession } from "@/contexts/SessionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Landmark } from "lucide-react";

const Index = () => {
  const { session } = useSession();
  const { user } = useAuth();
  const { plan, isActive } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();

  const isLoggedIn = !!user || session.isLoggedIn;
  const activeTab = searchParams.get("tab") || "simulator";

  const handleTabChange = (value: string) => {
    setSearchParams(value === "simulator" ? {} : { tab: value }, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col animate-fade-in">
      {session.isLoggedIn ? <BusinessTeamHeader /> : <Header />}
      
      <main className="flex-1">
        {isLoggedIn ? (
          <section className="pt-8 pb-16 md:pt-12 md:pb-24 bg-background">
            <div className="container">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="flex justify-center mb-8">
                  <TabsList>
                    <TabsTrigger value="simulator" className="gap-2">
                      <Calculator className="h-4 w-4" />
                      Simulador
                    </TabsTrigger>
                    {plan === "business" && (
                      <TabsTrigger value="comparison" className="gap-2">
                        <Landmark className="h-4 w-4" />
                        Sondagem Estratégica
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <TabsContent value="simulator">
                  <div className="text-center space-y-4 mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold">
                      Simulador de Financiamento
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                      Faça uma simulação completa de financiamento imobiliário em segundos.
                    </p>
                  </div>
                  <div className="max-w-4xl mx-auto">
                    <FinancingCalculator />
                  </div>
                </TabsContent>

                {plan === "business" && (
                  <TabsContent value="comparison" className="space-y-6">
                    <BankComparisonModule />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </section>
        ) : (
          <>
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

      <MarketTicker />
      <Footer />
    </div>
  );
};

export default Index;
