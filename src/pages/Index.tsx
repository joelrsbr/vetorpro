import { Header } from "@/components/layout/Header";
import { MarketTicker } from "@/components/layout/MarketTicker";
import { FinancingCalculator } from "@/components/calculator/FinancingCalculator";
import { BankComparisonModule } from "@/components/business/BankComparisonModule";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calculator, Landmark, ArrowLeft } from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeTab = searchParams.get("tab") || "simulator";

  const handleTabChange = (value: string) => {
    setSearchParams(value === "simulator" ? {} : { tab: value }, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Back to Dashboard button */}
      {user && (
        <div className="container pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="gap-1.5 text-muted-foreground hover:text-foreground border"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>
      )}
      
      <main className="flex-1">
        <section className="pt-4 pb-16 md:pt-8 md:pb-24 bg-background">
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
      </main>

      <MarketTicker />
    </div>
  );
};

export default Index;
