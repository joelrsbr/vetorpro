import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, getPlanBadge } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calculator, FileText, Crown, TrendingUp, Clock, User,
  Loader2, Sparkles, Copy, Brain, Building2
} from "lucide-react";
import { BusinessPaywallModal } from "@/components/business/BusinessPaywallModal";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Proposal {
  id: string;
  client_name: string;
  property_description: string;
  proposal_text: string;
  interest_savings: number | null;
  term_savings_months: number | null;
  created_at: string;
}

interface Simulation {
  id: string;
  property_value: number;
  down_payment: number;
  interest_rate: number;
  term_months: number;
  amortization_type: string;
  monthly_payment: number;
  total_paid: number;
  total_interest: number;
  created_at: string;
}

export default function Dashboard() {
  const { user, profile, usageLimits, loading, refreshProfile } = useAuth();
  const { plan, isActive, loading: subLoading, refresh: refreshSub } = useSubscription();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const planBadge = isActive ? getPlanBadge(plan) : null;

  // Sync subscription after Stripe checkout success
  useEffect(() => {
    if (user && searchParams.get("checkout") === "success") {
      const syncSubscription = async () => {
        try {
          await supabase.functions.invoke("check-subscription");
          await refreshProfile();
          await refreshSub();
          toast({
            title: "Assinatura ativada! 🎉",
            description: "Seu plano foi ativado com sucesso.",
          });
        } catch (err) {
          console.error("Error syncing subscription:", err);
        }
        setSearchParams({}, { replace: true });
      };
      syncSubscription();
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    const [proposalsRes, simulationsRes] = await Promise.all([
      supabase.from("proposals").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("simulations").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    if (proposalsRes.data) setProposals(proposalsRes.data);
    if (simulationsRes.data) setSimulations(simulationsRes.data);
    setLoadingData(false);
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  const handleCopyProposal = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Proposta copiada para a área de transferência." });
  };

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-emerald-500" />
              {profile?.full_name?.split(" ")[0] || "Corretor"}
            </h1>
            <p className="text-muted-foreground">Bem-vindo ao seu painel de controle</p>
          </div>
          <div className="flex items-center gap-3">
            {planBadge ? (
              <Badge className={planBadge.className}>
                <Crown className="h-3 w-3 mr-1" />
                {planBadge.label}
              </Badge>
            ) : (
              <>
                <Badge variant="secondary">Plano não ativo</Badge>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/precos">
                    <Crown className="h-4 w-4 mr-1" />
                    Ativar Assinatura
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Simulações</p>
                  <p className="text-2xl font-bold">
                    {(plan === "pro" || plan === "business") && isActive
                      ? "Liberado" 
                      : `${usageLimits?.simulationsRemaining ?? 0} restantes`}
                  </p>
                </div>
                <Calculator className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Propostas IA</p>
                  <p className="text-2xl font-bold">
                    {(plan === "pro" || plan === "business") && isActive
                      ? "Liberado" 
                      : `${usageLimits?.proposalsRemaining ?? 0} restantes`}
                  </p>
                </div>
                <Sparkles className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Propostas</p>
                  <p className="text-2xl font-bold">{proposals.length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <p className="text-2xl font-bold capitalize">
                    {isActive ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Não ativo"}
                  </p>
                </div>
                <Crown className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/calculadora")}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                <Calculator className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Nova Simulação</h3>
                <p className="text-sm text-muted-foreground">Calcule um novo financiamento</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              if (plan === "business") {
                navigate("/business");
              } else {
                setShowPaywall(true);
              }
            }}
          >
            <CardContent className="pt-6 flex flex-col gap-3">
              {/* Row 1: icon + title + badge — same pattern as other cards */}
              <div className="flex flex-row items-center gap-4">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, hsl(220 70% 18%), #166534)" }}>
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-row items-center gap-3 min-w-0">
                  <h3 className="font-semibold whitespace-nowrap">Sondagem Estratégica</h3>
                  {plan !== "business" && (
                    <Badge variant="outline" className="text-[10px] whitespace-nowrap shrink-0 ml-1">Exclusivo Business</Badge>
                  )}
                </div>
              </div>

              {/* Row 2: upgrade description + button centered below */}
              {plan !== "business" ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm text-muted-foreground">Inteligência multi-bancos para corretores</p>
                  <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setShowPaywall(true); }}>
                    <Crown className="h-3.5 w-3.5 mr-1.5" />
                    Business — R$&nbsp;99,00
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Inteligência multi-bancos</p>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/precos")}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Ver Planos</h3>
                <p className="text-sm text-muted-foreground">Compare os benefícios</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <BusinessPaywallModal open={showPaywall} onOpenChange={setShowPaywall} />

        {/* History Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
            <CardDescription>Suas simulações e propostas recentes</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="proposals">
              <TabsList className="mb-4">
                <TabsTrigger value="proposals">
                  <FileText className="h-4 w-4 mr-2" />
                  Propostas
                </TabsTrigger>
                <TabsTrigger value="simulations">
                  <Calculator className="h-4 w-4 mr-2" />
                  Simulações
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="proposals">
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : proposals.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma proposta gerada ainda</p>
                    <Button variant="hero" className="mt-4" asChild>
                      <Link to="/calculadora">Gerar Primeira Proposta</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {proposals.map((proposal) => (
                      <Card key={proposal.id} className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{proposal.client_name}</span>
                                <span className="text-sm text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">{proposal.property_description}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(proposal.created_at)}
                                </span>
                                {proposal.interest_savings && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <TrendingUp className="h-3 w-3" />
                                    Economia: {formatCurrency(proposal.interest_savings)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleCopyProposal(proposal.proposal_text)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="simulations">
                {loadingData ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : simulations.length === 0 ? (
                  <div className="text-center py-8">
                    <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma simulação salva ainda</p>
                    <Button variant="hero" className="mt-4" asChild>
                      <Link to="/calculadora">Fazer Primeira Simulação</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {simulations.map((sim) => (
                      <Card key={sim.id} className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <div>
                                <p className="text-sm text-muted-foreground">Valor</p>
                                <p className="font-medium">{formatCurrency(sim.property_value)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Parcela</p>
                                <p className="font-medium">{formatCurrency(sim.monthly_payment)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Sistema</p>
                                <Badge variant="outline">{sim.amortization_type.toUpperCase()}</Badge>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Prazo</p>
                                <p className="font-medium">{sim.term_months} meses</p>
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground">{formatDate(sim.created_at)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
}
