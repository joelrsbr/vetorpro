import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, Copy, Download, Loader2, Lock, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS } from "@/lib/stripe-plans";
import { ReportConfiguration, type ReportConfig } from "./ReportConfiguration";
import jsPDF from "jspdf";

interface Calculations {
  principal: number;
  firstPayment: number;
  totalPaid: number;
  totalInterest: number;
  monthsSaved: number;
  interestSaved: number;
}

interface ProposalGeneratorProps {
  calculations: Calculations;
  propertyValue: number;
  downPayment: number;
  interestRate: number;
  termMonths: number;
  amortizationType: string;
}

export function ProposalGenerator({
  calculations,
  propertyValue,
  downPayment,
  interestRate,
  termMonths,
  amortizationType,
}: ProposalGeneratorProps) {
  const { user, usageLimits } = useAuth();
  const { plan, isActive } = useSubscription();
  const { toast } = useToast();
  const [clientName, setClientName] = useState("");
  const [propertyDescription, setPropertyDescription] = useState("");
  const [proposalText, setProposalText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBusiness, setIsGeneratingBusiness] = useState(false);
  const [isRedirectingBusiness, setIsRedirectingBusiness] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    logoUrl: null,
    companyName: "",
    creci: "",
    isBusiness: false,
  });

  const isBusiness = isActive && plan === "business";

  const handleUpgradeBusiness = async () => {
    if (!user) return;
    setIsRedirectingBusiness(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: STRIPE_PLANS.business.priceId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      toast({ title: "Erro", description: "Não foi possível iniciar o checkout.", variant: "destructive" });
    } finally {
      setIsRedirectingBusiness(false);
    }
  };

  const handleGenerateProposal = async () => {
    if (!clientName.trim() || !propertyDescription.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome do cliente e a descrição do imóvel.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-proposal", {
        body: {
          clientName,
          propertyDescription,
          propertyValue,
          downPayment,
          interestRate,
          termMonths,
          amortizationType,
          monthlyPayment: calculations.firstPayment,
          totalPaid: calculations.totalPaid,
          totalInterest: calculations.totalInterest,
          monthsSaved: calculations.monthsSaved || undefined,
          interestSaved: calculations.interestSaved || undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Erro",
          description: data.message || data.error,
          variant: "destructive",
        });
        return;
      }

      setProposalText(data.proposalText);
      toast({
        title: "Proposta gerada!",
        description: "Sua proposta foi criada com sucesso.",
      });
    } catch (error) {
      console.error("Error generating proposal:", error);
      toast({
        title: "Erro ao gerar proposta",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBusinessProposal = async () => {
    if (!clientName.trim() || !propertyDescription.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome do cliente e a descrição do imóvel.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingBusiness(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-proposal", {
        body: {
          clientName,
          propertyDescription,
          propertyValue,
          downPayment,
          interestRate,
          termMonths,
          amortizationType,
          monthlyPayment: calculations.firstPayment,
          totalPaid: calculations.totalPaid,
          totalInterest: calculations.totalInterest,
          monthsSaved: calculations.monthsSaved || undefined,
          interestSaved: calculations.interestSaved || undefined,
          businessMode: true,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Erro",
          description: data.message || data.error,
          variant: "destructive",
        });
        return;
      }

      setProposalText(data.proposalText);
      toast({
        title: "Proposta executiva gerada! 🏢",
        description: "Proposta estratégica criada com tom de exclusividade.",
      });
    } catch (error) {
      console.error("Error generating business proposal:", error);
      toast({
        title: "Erro ao gerar proposta",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingBusiness(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(proposalText);
    toast({
      title: "Copiado!",
      description: "Proposta copiada para a área de transferência.",
    });
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPos = 20;

    const isPro = isActive && plan === "pro";

    if (reportConfig.isBusiness && reportConfig.logoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = reportConfig.logoUrl!;
        });
        doc.addImage(img, "PNG", margin, yPos, 40, 20);
        yPos += 25;
      } catch {
        // Skip logo if loading fails
      }

      if (reportConfig.companyName) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(reportConfig.companyName, pageWidth / 2, yPos, { align: "center" });
        yPos += 7;
      }
      if (reportConfig.creci) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(reportConfig.creci, pageWidth / 2, yPos, { align: "center" });
        yPos += 5;
      }

      // Separator line
      doc.setDrawColor(200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
    } else if (isPro && (reportConfig.companyName || reportConfig.creci)) {
      // Pro branding: name and CRECI in footer
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      const footerY = doc.internal.pageSize.getHeight() - 10;
      const proFooter = [reportConfig.companyName, reportConfig.creci].filter(Boolean).join(" • ");
      doc.text(proFooter, pageWidth / 2, footerY, { align: "center" });
      doc.setTextColor(0);
    } else {
      // Default branding for Basic
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);
      const footerY = doc.internal.pageSize.getHeight() - 10;
      doc.text("Gerado por VetorPro • vetorpro.com.br", pageWidth / 2, footerY, {
        align: "center",
      });
      doc.setTextColor(0);
    }

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Proposta de Financiamento", pageWidth / 2, yPos, { align: "center" });
    yPos += 12;

    // Client info
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${clientName}`, margin, yPos);
    yPos += 6;
    doc.text(`Imóvel: ${propertyDescription}`, margin, yPos);
    yPos += 10;

    // Proposal text
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(proposalText, maxWidth);
    for (const line of lines) {
      if (yPos > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    }

    // Business footer with logo
    if (reportConfig.isBusiness) {
      const footerY = doc.internal.pageSize.getHeight() - 10;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `${reportConfig.companyName}${reportConfig.creci ? " • " + reportConfig.creci : ""}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
      );
      doc.setTextColor(0);
    }

    doc.save(`proposta-${clientName.replace(/\s+/g, "-").toLowerCase()}.pdf`);

    toast({
      title: "PDF gerado!",
      description: "A proposta foi baixada como PDF.",
    });
  };

  if (!user) {
    return (
      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Proposta com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            Faça login para gerar propostas personalizadas com inteligência artificial.
          </p>
          <Button variant="hero" asChild>
            <Link to="/login">Fazer Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const canGenerateProposal = usageLimits?.canGenerateProposal ?? false;

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <ReportConfiguration onConfigChange={setReportConfig} />

      {/* Proposal Generator */}
      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerar Proposta com IA
            </div>
            {usageLimits && (
              <span className="text-sm font-normal text-muted-foreground">
                {usageLimits.proposalsRemaining === 999999
                  ? "Ilimitado"
                  : `${usageLimits.proposalsRemaining} restantes`}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome do Cliente</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="João da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyDescription">Descrição do Imóvel</Label>
              <Input
                id="propertyDescription"
                value={propertyDescription}
                onChange={(e) => setPropertyDescription(e.target.value)}
                placeholder="Apartamento 3 quartos, 85m², Zona Sul"
              />
            </div>
          </div>

          {!canGenerateProposal && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Você atingiu o limite de propostas do seu plano atual.{" "}
                <Link to="/precos" className="font-medium underline">
                  Faça upgrade do seu plano
                </Link>{" "}
                para propostas ilimitadas.
              </p>
            </div>
          )}

          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={handleGenerateProposal}
            disabled={isGenerating || !canGenerateProposal}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando proposta...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Proposta com IA
              </>
            )}
          </Button>

          {/* Business AI Executive Proposal */}
          <div className="relative rounded-xl border-2 border-dashed border-success/40 p-5 bg-success/5">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-success" />
              <span className="font-semibold text-foreground">Proposta Executiva com IA</span>
              <Badge variant="outline" className="border-success text-success text-xs">
                Business
              </Badge>
            </div>
            {isBusiness ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Gere uma proposta estratégica com tom de exclusividade, focada no impacto financeiro e economia com amortizações.
                </p>
                <Button
                  size="lg"
                  className="w-full bg-success hover:bg-success/90 text-success-foreground"
                  onClick={handleGenerateBusinessProposal}
                  disabled={isGeneratingBusiness || !canGenerateProposal}
                >
                  {isGeneratingBusiness ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando proposta executiva...
                    </>
                  ) : (
                    <>
                      <Crown className="mr-2 h-4 w-4" />
                      Gerar Proposta Executiva
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Gere propostas persuasivas com IA — Disponível no Business
                </p>
                <Button variant="outline" size="lg" className="w-full" asChild>
                  <Link to="/precos">
                    <Crown className="mr-2 h-4 w-4" />
                    Fazer Upgrade para Business
                  </Link>
                </Button>
              </>
            )}
          </div>

          {proposalText && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <Label>Proposta Gerada</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                    <Download className="h-4 w-4 mr-1" />
                    Baixar PDF
                  </Button>
                </div>
              </div>
              <Textarea
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
                className="min-h-[300px] text-sm"
                placeholder="A proposta aparecerá aqui..."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
