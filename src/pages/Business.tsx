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
import { Calculator, Settings, Loader2, Building2, Lock, Crown, Sparkles } from "lucide-react";

function BusinessPaywall() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            ImobCalc Business/TEAM
          </h1>
          <p className="text-muted-foreground mt-1">
            Simulador financeiro personalizado para sua empresa
          </p>
        </div>

        {/* Blurred preview with overlay */}
        <div className="relative rounded-xl overflow-hidden">
          {/* Blurred background content preview */}
          <div className="filter blur-sm pointer-events-none select-none opacity-40 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-32 bg-muted rounded-lg" />
              <div className="h-32 bg-muted rounded-lg" />
            </div>
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-48 bg-muted rounded-lg" />
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="max-w-md text-center p-8 rounded-2xl border bg-card shadow-xl">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Recurso Exclusivo do Plano Business</h2>
              <p className="text-muted-foreground mb-6">
                Personalize seus relatórios com sua logo, CRECI e identidade visual para fechar mais negócios.
              </p>
              <Button variant="hero" size="lg" className="w-full gap-2" asChild>
                <Link to="/precos">
                  <Crown className="h-5 w-5" />
                  Fazer Upgrade para Business AGORA
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3" />
                Propostas com branding, IA e PDF executivo
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function BusinessContent() {
  const { user, loading } = useAuth();
  const { plan, isActive, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Gate: only business plan can access full content
  if (!isActive || plan !== "business") {
    return <BusinessPaywall />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <BusinessHeader />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              ImobCalc Business/TEAM
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
