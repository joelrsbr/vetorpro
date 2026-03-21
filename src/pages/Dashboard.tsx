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
  Loader2, Sparkles, Copy, Brain, Building2, Info, Eye, Download, ShieldAlert,
  CircleDot, Trash2, ChevronUp
} from "lucide-react";
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

function getPlanLimit(plan: string, isActive: boolean) {
  if (!isActive) return 10;
  if (plan === "business") return 200;
  if (plan === "pro") return 100;
  return 10;
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
  const [viewProposal, setViewProposal] = useState<Proposal | null>(null);

  const planBadge = isActive ? getPlanBadge(plan) : null;
  const limit = getPlanLimit(plan, isActive);

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
      supabase.from("proposals").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("simulations").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (proposalsRes.data) setProposals(proposalsRes.data as Proposal[]);
    if (simulationsRes.data) setSimulations(simulationsRes.data);
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

  const handleDeleteProposal = async (proposalId: string) => {
    const { error } = await supabase.from("proposals").delete().eq("id", proposalId);
    if (!error) {
      setProposals(prev => prev.filter(p => p.id !== proposalId));
      toast({ title: "Proposta excluída" });
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
            <h1 className="text-2xl font-medium flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
              {profile?.full_name?.split(" ")[0] || "Corretor"}
            </h1>
            <p className="text-sm font-light text-muted-foreground">Bem-vindo ao seu painel de controle</p>
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

        {/* LGPD Notice */}
        <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-center justify-center gap-3 text-center">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-xs font-light text-muted-foreground">
            <span className="font-medium text-foreground">Compromisso LGPD:</span> Por segurança e privacidade, os dados sensíveis de simulações são excluídos automaticamente após 30 dias. Salve seus PDFs.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-light text-muted-foreground">Simulações</p>
                  <p className="text-xl font-medium">
                    {`${usageLimits?.simulationsRemaining ?? 0} de ${limit}`}
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
                  <p className="text-xs font-light text-muted-foreground">Propostas IA</p>
                  <p className="text-xl font-medium">
                    {`${usageLimits?.proposalsRemaining ?? 0} de ${limit}`}
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
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, hsl(220 70% 18%), #166534)" }}>
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold">Sondagem Estratégica</h3>
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
                  <p className="text-sm text-muted-foreground">Inteligência multi-bancos</p>
                )}
              </div>
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
                              <span className="font-medium text-sm truncate">{proposal.client_name}</span>
                              <span className="text-muted-foreground hidden sm:inline">•</span>
                              <span className="text-xs text-muted-foreground truncate hidden sm:inline">{proposal.property_description}</span>
                            </div>
                          </div>

                          {/* Date/Time */}
                          <div className="shrink-0 w-[150px] text-center">
                            <span className="text-xs text-muted-foreground font-mono">{formatDate(proposal.created_at)}</span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setViewProposal(proposal)}>
                                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver Proposta</TooltipContent>
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

      {/* Proposal View Modal */}
      <Dialog open={!!viewProposal} onOpenChange={(open) => !open && setViewProposal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Proposta — {viewProposal?.client_name}
            </DialogTitle>
          </DialogHeader>
          {viewProposal && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{viewProposal.property_description}</span>
                <span>•</span>
                <span>{formatDate(viewProposal.created_at)}</span>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed border rounded-lg p-4 bg-muted/30">
                {viewProposal.proposal_text}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => handleCopyProposal(viewProposal.proposal_text)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(viewProposal)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="default" size="sm" onClick={() => { setViewProposal(null); handleAdjustProposal(viewProposal); }}>
                  Ajustar Proposta
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
