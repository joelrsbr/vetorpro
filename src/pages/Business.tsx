import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BusinessHeader } from "@/components/business/BusinessHeader";
import { BusinessCustomization } from "@/components/business/BusinessCustomization";
import { FinancingCalculator } from "@/components/calculator/FinancingCalculator";
import { HP12CCalculator } from "@/components/calculator/HP12CCalculator";
import { QuotesPanel } from "@/components/business/QuotesPanel";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calculator, Settings, Loader2, Building2 } from "lucide-react";

// BusinessPaywall removed — non-Business users are redirected to /precos

function BusinessContent() {
  const { user, loading } = useAuth();
  const { plan, isActive, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && !subLoading && user && (!isActive || plan !== "business")) {
      navigate("/precos");
    }
  }, [isActive, plan, loading, subLoading, user, navigate]);

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isActive || plan !== "business") return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <BusinessHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              VetorPro Business/TEAM
            </h1>
            <p className="text-muted-foreground mt-1">
              Simulador financeiro personalizado para sua empresa
            </p>
          </div>
          <QuotesPanel />
        </div>

        <Tabs defaultValue="simulator" className="space-y-6">
          <TabsList>
            <TabsTrigger value="simulator" className="gap-2">
              <Calculator className="h-4 w-4" />
              Simulador
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Personalização
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulator" className="space-y-6">
            <FinancingCalculator />
          </TabsContent>

          <TabsContent value="settings">
            <BusinessCustomization />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
      <HP12CCalculator />
    </div>
  );
}

export default function Business() {
  return (
    <BusinessProvider>
      <BusinessContent />
    </BusinessProvider>
  );
}
