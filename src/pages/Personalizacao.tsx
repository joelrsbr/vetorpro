import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BusinessCustomization } from "@/components/business/BusinessCustomization";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2, Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

function PersonalizacaoContent() {
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
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar ao Dashboard
        </Button>
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Personalização Business
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure sua identidade visual para propostas e simulações
          </p>
        </div>
        <BusinessCustomization />
      </main>
      <Footer />
    </div>
  );
}

export default function Personalizacao() {
  return (
    <BusinessProvider>
      <PersonalizacaoContent />
    </BusinessProvider>
  );
}
