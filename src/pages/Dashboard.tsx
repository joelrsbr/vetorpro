import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MarketTicker } from "@/components/layout/MarketTicker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calculator, FileText, Crown, TrendingUp, Clock, User,
  Loader2, Sparkles, Copy, Brain, Building2, Info, Eye, Download, ShieldAlert,
  CircleDot, Trash2, ChevronUp, Pencil, Settings, Lock, Mail, Activity,
  Landmark, BrainCog
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BusinessPaywallModal } from "@/components/business/BusinessPaywallModal";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Proposal {
  id: string;
  client_name: string;
  property_description: string;
  proposal_text: string;
  interest_savings: number | null;
  term_savings_months: number | null;
  created_at: string;
  status: string;
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
  client_name: string | null;
  property_description: string | null;
}

const STATUS_OPTIONS = [
  { value: "completed", label: "Concluído", color: "text-cyan-400", emoji: "V", isVetor: true },
  { value: "closed", label: "Fechado/Doc", color: "bg-green-500", emoji: "🟢", isVetor: false },
  { value: "potential", label: "Potencial", color: "bg-yellow-500", emoji: "🟡", isVetor: false },
  { value: "archived", label: "Arquivado", color: "bg-red-500", emoji: "🔴", isVetor: false },
];

function getStatusInfo(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[1];
}

function getPlanSimLimit(plan: string, isActive: boolean) {
  if (!isActive) return 0;
  if (plan === "business") return 2000;
  if (plan === "pro") return 300;
  return 50; // basic
}

function getPlanProposalLimit(plan: string, isActive: boolean) {
  if (!isActive) return 0;
  if (plan === "business") return 300;
  if (plan === "pro") return 100;
  return 20; // basic
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
  const [showCustomizationPaywall, setShowCustomizationPaywall] = useState(false);
  const [viewProposal, setViewProposal] = useState<Proposal | null>(null);

  // Real-time counts from RPC (Single Source of Truth)
  const [dashCounts, setDashCounts] = useState<{
    simulations_count: number;
    proposals_count: number;
    plan_limit: number;
    current_plan: string;
  } | null>(null);

  
  const simLimit = dashCounts?.plan_limit ?? getPlanSimLimit(plan, isActive);
  const proposalLimit = getPlanProposalLimit(plan, isActive);

  // Sync subscription after Stripe checkout success
  useEffect(() => {
    const checkoutStatus = searchParams.get("status") ?? searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (user && (checkoutStatus === "success" || sessionId)) {
      const syncSubscription = async () => {
        try {
          await supabase.functions.invoke("check-subscription");
          await refreshProfile();
          await refreshSub();
          await fetchData();
          toast({
            title: "Assinatura confirmada com sucesso! ✅",
            description: "Aproveite o VetorPro.",
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
    const [proposalsRes, simulationsRes, countsRes] = await Promise.all([
      supabase.from("proposals").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("simulations").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.rpc("get_dashboard_counts", { p_user_id: user!.id }),
    ]);
    if (proposalsRes.data) setProposals(proposalsRes.data as Proposal[]);
    if (simulationsRes.data) setSimulations(simulationsRes.data);
    if (countsRes.data && countsRes.data[0]) setDashCounts(countsRes.data[0]);
    setLoadingData(false);
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const handleCopyProposal = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Proposta copiada para a área de transferência." });
  };

  const handleUpdateStatus = async (proposalId: string, newStatus: string) => {
    const { error } = await supabase.from("proposals").update({ status: newStatus } as any).eq("id", proposalId);
    if (!error) {
      setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: newStatus } : p));
      toast({ title: "Status atualizado" });
    }
  };

  const handleDownloadPdf = (proposal: Proposal) => {
    if (plan === "basic" || !isActive) {
      toast({
        title: "PDF bloqueado no Basic",
        description: "Faça upgrade para Professional ou Business para baixar PDFs.",
        variant: "destructive",
      });
      navigate("/precos");
      return;
    }
    // Use jsPDF for download
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Proposta de Financiamento", 20, 20);
      doc.setFontSize(11);
      doc.text(`Cliente: ${proposal.client_name}`, 20, 35);
      doc.text(`Imóvel: ${proposal.property_description}`, 20, 42);
      doc.text(`Data: ${formatDate(proposal.created_at)}`, 20, 49);
      const lines = doc.splitTextToSize(proposal.proposal_text, 170);
      doc.text(lines, 20, 62);
      doc.save(`proposta-${proposal.client_name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    });
  };

  const handleAdjustProposal = (proposal: Proposal) => {
    navigate("/calculadora", { state: { clientName: proposal.client_name, propertyDescription: proposal.property_description } });
  };

  const handleEditSimulation = (sim: Simulation) => {
    navigate("/calculadora", {
      state: {
        simulationId: sim.id,
        clientName: sim.client_name || "",
        propertyDescription: sim.property_description || "",
        propertyValue: Math.round(sim.property_value * 100).toString(),
        downPayment: Math.round(sim.down_payment * 100).toString(),
        interestRate: Math.round(sim.interest_rate * 100).toString(),
        termMonths: sim.term_months.toString(),
        amortizationType: sim.amortization_type.toUpperCase(),
        fromCRM: "true",
      },
    });
  };

  const handleDeleteProposal = async (proposalId: string) => {
    const { error } = await supabase.from("proposals").delete().eq("id", proposalId);
    if (!error) {
      setProposals(prev => prev.filter(p => p.id !== proposalId));
      toast({ title: "Proposta excluída" });
    }
  };

  const handleDeleteSimulation = async (simId: string) => {
    const { error } = await supabase.from("simulations").delete().eq("id", simId);
    if (!error) {
      setSimulations(prev => prev.filter(s => s.id !== simId));
      toast({ title: "Simulação excluída" });
    }
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
              <TrendingUp className="h-6 w-6 text-emerald-500" />
              {profile?.full_name?.split(" ")[0] || "Corretor"}
            </h1>
            <p className="text-base text-muted-foreground">Bem-vindo ao seu painel de controle</p>
          </div>
          {!isActive && (
            <Button variant="hero" size="sm" asChild>
              <Link to="/precos">
                <Crown className="h-4 w-4 mr-1" />
                Ativar Assinatura
              </Link>
            </Button>
          )}
        </div>

        {/* LGPD Notice */}
        <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 shadow-sm flex items-center justify-center gap-3 text-center">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Compromisso LGPD:</span> Os dados sensíveis de simulações são excluídos automaticamente após 30 dias. Salve seus PDFs.
          </p>
        </div>

        {/* Stats Cards */}
        {(() => {
          // Use RPC counts as Single Source of Truth
          const simCount = dashCounts?.simulations_count ?? simulations.length;
          const propCount = dashCounts?.proposals_count ?? proposals.length;
          const realSimUsage = Math.max(simCount, propCount);
          const realProposalUsage = propCount;
          const simDisplay = Math.min(realSimUsage, simLimit);
          const proposalDisplay = Math.min(realProposalUsage, proposalLimit);

          const simPercent = simLimit > 0 ? (simDisplay / simLimit) * 100 : 0;
          const propPercent = proposalLimit > 0 ? (proposalDisplay / proposalLimit) * 100 : 0;

          const getProgressColor = (percent: number) => {
            if (percent >= 90) return "bg-amber-500";
            if (percent >= 75) return "bg-yellow-500";
            return "bg-primary";
          };

          // Conversion rate: simulations that became proposals
          const conversionRate = simCount > 0 ? Math.round((propCount / simCount) * 100) : 0;

          // Recent activity: simulations in last 7 days
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recentSims = simulations.filter(s => new Date(s.created_at) >= sevenDaysAgo).length;

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {/* Simulações - Limite */}
              <Card className="shadow-card">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Simulações</p>
                      <p className="text-2xl font-semibold">
                        {`${simDisplay} de ${simLimit}`}
                      </p>
                    </div>
                    <Calculator className="h-8 w-8 text-emerald-600 dark:text-emerald-400 opacity-80" />
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${getProgressColor(simPercent)}`} 
                      style={{ width: `${simPercent}%` }} 
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Propostas IA - Limite */}
              <Card className="shadow-card">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Propostas IA</p>
                      <p className="text-2xl font-semibold">
                        {`${proposalDisplay} de ${proposalLimit}`}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400 opacity-80" />
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${getProgressColor(propPercent)}`} 
                      style={{ width: `${propPercent}%` }} 
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Conversão */}
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Conversão</p>
                      <p className="text-2xl font-semibold">{conversionRate}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Simulações → Propostas</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              {/* Atividade Recente */}
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
                      <p className="text-2xl font-semibold">{recentSims}</p>
                      <p className="text-xs text-muted-foreground mt-1">simulações realizadas</p>
                    </div>
                    <Activity className="h-8 w-8 text-emerald-600 dark:text-emerald-400 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              
              {/* Plano */}
              <Card className={`shadow-card ${
                plan === "business" 
                  ? "ring-1 ring-emerald-500/50 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]" 
                  : ""
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Seu Plano</p>
                      <p className={`text-2xl font-semibold capitalize ${
                        plan === "business" ? "text-emerald-600 dark:text-emerald-400" 
                        : plan === "pro" ? "text-amber-600 dark:text-amber-400" 
                        : ""
                      }`}>
                        {isActive ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Não ativo"}
                      </p>
                      {isActive && (
                        <Link to="/precos" className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 inline-block">
                          Compare Benefícios
                        </Link>
                      )}
                    </div>
                    <Crown className={`h-8 w-8 opacity-80 ${
                      plan === "business" ? "text-emerald-600 dark:text-emerald-400" 
                      : plan === "pro" ? "text-amber-600 dark:text-amber-400" 
                      : "text-primary"
                    }`} />
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/calculadora")}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
                <Calculator className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Nova Simulação</h3>
                <p className="text-sm text-muted-foreground">Calcule um novo financiamento</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="shadow-card hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              if (plan === "business") {
                navigate("/business?tab=comparison");
              } else {
                setShowPaywall(true);
              }
            }}
          >
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, hsl(220 70% 18%), #166534)" }}>
                <Landmark className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-base uppercase tracking-wide">Bancos</h3>
                  {plan !== "business" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-center text-xs">
                        Ao migrar para o Business, o valor do seu plano atual é descontado proporcionalmente.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {plan !== "business" ? (
                  <Button variant="outline" size="sm" className="whitespace-nowrap mt-1" onClick={(e) => { e.stopPropagation(); setShowPaywall(true); }}>
                    <Crown className="h-3.5 w-3.5 mr-1.5" />
                    Exclusivo-Business
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Sondagem Estratégica</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Personalize sua IA — opens voice tone dialog */}
          <Card 
            className="shadow-card hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              if (plan === "business") {
                setShowVoiceToneDialog(true);
              } else {
                setShowCustomizationPaywall(true);
              }
            }}
          >
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="relative h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #16a34a, #166534)" }}>
                <BrainCog className="h-6 w-6 text-white" />
                {plan !== "business" && (
                  <Lock className="h-3 w-3 text-white absolute -bottom-0.5 -right-0.5 bg-muted-foreground rounded-full p-0.5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-base">Personalize sua IA</h3>
                  {plan !== "business" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-center text-xs">
                        Ao migrar para o Business, o valor do seu plano atual é descontado proporcionalmente.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {plan !== "business" ? (
                  <Button variant="outline" size="sm" className="whitespace-nowrap mt-1" onClick={(e) => { e.stopPropagation(); setShowCustomizationPaywall(true); }}>
                    <Crown className="h-3.5 w-3.5 mr-1.5" />
                    Exclusivo-Business
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Tom de voz e identidade visual</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Personalização — identity visual (navigates to /personalizacao) */}
          <Card 
            className="shadow-card hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => {
              if (plan === "business") {
                navigate("/personalizacao");
              } else {
                setShowCustomizationPaywall(true);
              }
            }}
          >
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="relative h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #16a34a, #166534)" }}>
                <Settings className="h-6 w-6 text-white" />
                {plan !== "business" && (
                  <Lock className="h-3 w-3 text-white absolute -bottom-0.5 -right-0.5 bg-muted-foreground rounded-full p-0.5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-base">Personalização</h3>
                </div>
                {plan !== "business" ? (
                  <Button variant="outline" size="sm" className="whitespace-nowrap mt-1" onClick={(e) => { e.stopPropagation(); setShowCustomizationPaywall(true); }}>
                    <Crown className="h-3.5 w-3.5 mr-1.5" />
                    Exclusivo-Business
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Identidade visual e marca</p>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        <BusinessPaywallModal open={showPaywall} onOpenChange={setShowPaywall} />

        {/* Customization Paywall Modal */}
        <Dialog open={showCustomizationPaywall} onOpenChange={setShowCustomizationPaywall}>
          <DialogContent className="sm:max-w-md text-center">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-muted-foreground" />
                Recurso Exclusivo Business
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mt-2">
              A Personalização de taxas e identidade visual é um recurso exclusivo do Plano Business. Desbloqueie agora para profissionalizar sua operação.
            </p>
            <div className="flex flex-col gap-2 mt-4">
              <Button variant="hero" onClick={() => { setShowCustomizationPaywall(false); navigate("/precos"); }}>
                <Crown className="h-4 w-4 mr-2" />
                Ver Planos e Desbloquear
              </Button>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Info className="h-3 w-3" />
                Upgrade Inteligente: o valor já pago é descontado proporcionalmente.
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/50">
                <Mail className="h-3 w-3 shrink-0" />
                <a href="mailto:vendas@vetorpro.com.br" className="hover:text-primary transition-colors">
                  vendas@vetorpro.com.br
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* History Tabs */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">Histórico</CardTitle>
            <CardDescription>Suas simulações e propostas recentes</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="simulations">
              <TabsList className="mb-4">
                <TabsTrigger value="simulations">
                  <Calculator className="h-4 w-4 mr-2" />
                  Simulações
                </TabsTrigger>
                <TabsTrigger value="proposals">
                  <FileText className="h-4 w-4 mr-2" />
                  Propostas
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
                  <div className="space-y-2">
                    {proposals.map((proposal) => {
                      const statusInfo = getStatusInfo(proposal.status);
                      return (
                        <div key={proposal.id} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-muted/30 border border-border/50">
                          {/* Status */}
                          <div className="shrink-0 w-[140px]">
                            <Select
                              value={proposal.status}
                              onValueChange={(val) => handleUpdateStatus(proposal.id, val)}
                            >
                              <SelectTrigger className="w-full h-7 px-2 gap-1.5 text-xs border-none bg-transparent shadow-none focus:ring-0">
                                <span className="flex items-center gap-1.5">
                                  {statusInfo.isVetor ? (
                                    <ChevronUp className="h-3.5 w-3.5 text-cyan-400" strokeWidth={3} />
                                  ) : (
                                    <span className="text-xs">{statusInfo.emoji}</span>
                                  )}
                                  <span>{statusInfo.label}</span>
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value} className="pl-2">
                                    <span className="flex items-center gap-2">
                                      {opt.isVetor ? (
                                        <ChevronUp className="h-3.5 w-3.5 text-cyan-400" strokeWidth={3} />
                                      ) : (
                                        <span className="text-xs">{opt.emoji}</span>
                                      )}
                                      {opt.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Client & Property */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-semibold text-sm truncate">{proposal.client_name}</span>
                              <span className="text-muted-foreground hidden sm:inline">•</span>
                              <span className="text-sm text-muted-foreground truncate hidden sm:inline">{proposal.property_description}</span>
                            </div>
                          </div>

                          {/* Date/Time */}
                          <div className="shrink-0 w-[150px] text-center">
                            <span className="text-sm text-muted-foreground font-mono">{formatDate(proposal.created_at)}</span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center shrink-0">
                            <div className="flex items-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => { setViewProposal(null); handleAdjustProposal(proposal); }}>
                                  <Pencil className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Retomar e editar este cálculo</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setViewProposal(proposal)}>
                                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver proposta gerada</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleCopyProposal(proposal.proposal_text)}>
                                  <Copy className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={`h-8 w-8 ${(plan === "basic" || !isActive) ? "opacity-30 cursor-not-allowed text-muted-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                  onClick={() => handleDownloadPdf(proposal)}
                                >
                                  <Download className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{(plan === "basic" || !isActive) ? "Upgrade para baixar PDF" : "Download PDF"}</TooltipContent>
                            </Tooltip>
                            </div>
                            <div className="ml-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteProposal(proposal.id)}>
                                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                    <p className="text-muted-foreground">Nenhuma simulação salva ainda.</p>
                    <p className="text-sm text-muted-foreground mt-1">Use o botão "Salvar Simulação" na calculadora para registrar.</p>
                    <Button variant="hero" className="mt-4" asChild>
                      <Link to="/calculadora">Fazer Primeira Simulação</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {simulations.map((sim) => {
                      const hasProposal = proposals.some(p => p.client_name === sim.client_name && p.property_description === (sim.property_description || ""));
                      const propCount = dashCounts?.proposals_count ?? proposals.length;
                      const canGenerateAI = propCount < proposalLimit && isActive;
                      return (
                      <div key={sim.id} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-muted/30 border border-border/50">
                        {/* Type badge */}
                        <div className="shrink-0 w-[80px]">
                          <Badge variant="outline" className="text-xs">{sim.amortization_type.toUpperCase()}</Badge>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm">{sim.client_name || "Sem nome"}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{sim.property_description || formatCurrency(sim.property_value)}</span>
                            {hasProposal && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-1">
                                <Sparkles className="h-2.5 w-2.5" />
                                IA
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground">{formatCurrency(sim.property_value)}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">Parcela: {formatCurrency(sim.monthly_payment)}</span>
                            <span className="text-muted-foreground hidden sm:inline">•</span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">{sim.term_months} meses</span>
                            <span className="text-muted-foreground hidden md:inline">•</span>
                            <span className="text-xs text-muted-foreground hidden md:inline">{sim.interest_rate}% a.a.</span>
                          </div>
                        </div>

                        {/* Date/Time */}
                        <div className="shrink-0 w-[150px] text-center">
                          <span className="text-sm text-muted-foreground font-mono">{formatDate(sim.created_at)}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center shrink-0">
                          <div className="flex items-center gap-0.5">
                          {hasProposal ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:text-primary/80"
                                  onClick={() => {
                                    const existingProposal = proposals.find(p => p.client_name === sim.client_name && p.property_description === (sim.property_description || ""));
                                    if (existingProposal) setViewProposal(existingProposal);
                                  }}
                                >
                                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver proposta existente</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 ${canGenerateAI ? "text-primary hover:text-primary/80" : "text-muted-foreground opacity-50"}`}
                                  onClick={() => {
                                    if (!canGenerateAI) {
                                      setShowPaywall(true);
                                      return;
                                    }
                                    handleEditSimulation(sim);
                                  }}
                                >
                                  <Brain className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{canGenerateAI ? "Gerar Proposta IA" : `Limite de ${proposalLimit} propostas IA atingido`}</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEditSimulation(sim)}>
                                <Pencil className="h-4 w-4" strokeWidth={1.5} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Retomar e editar este cálculo</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleCopyProposal(`Simulação: ${formatCurrency(sim.property_value)} | Parcela: ${formatCurrency(sim.monthly_payment)} | ${sim.amortization_type.toUpperCase()} | ${sim.term_months} meses | Taxa: ${sim.interest_rate}% a.a.`)}>
                                <Copy className="h-4 w-4" strokeWidth={1.5} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar</TooltipContent>
                          </Tooltip>
                          </div>
                          <div className="ml-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSimulation(sim.id)}>
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Voice Tone Dialog */}
      <Dialog open={showVoiceToneDialog} onOpenChange={setShowVoiceToneDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <BrainCog className="h-5 w-5 text-emerald-600" />
              Tom de Voz da IA
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Escolha o estilo de comunicação das propostas geradas pela IA:</p>
          <div className="flex flex-col gap-3 mt-2">
            {[
              { value: "executivo", label: "Executivo", desc: "Conciso e direto ao ponto" },
              { value: "consultivo", label: "Consultivo", desc: "Educativo e pedagógico" },
              { value: "persuasivo", label: "Persuasivo", desc: "Focado em gatilhos de vendas" },
            ].map((tone) => (
              <button
                key={tone.value}
                onClick={() => {
                  localStorage.setItem("vetorpro_ai_tone", tone.value);
                  setShowVoiceToneDialog(false);
                  toast({ title: `Tom "${tone.label}" selecionado`, description: tone.desc });
                }}
                className={`flex flex-col items-start p-4 rounded-lg border transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 ${
                  (localStorage.getItem("vetorpro_ai_tone") || "executivo") === tone.value
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-border"
                }`}
              >
                <span className="font-semibold text-sm">{tone.label}</span>
                <span className="text-xs text-muted-foreground">{tone.desc}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      <MarketTicker />
      <Footer />
    </div>
  );
}
