import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Link } from "react-router-dom";
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
  interestRateType?: "annual" | "monthly";
  termMonths: number;
  amortizationType: string;
  clientName: string;
  propertyDescription: string;
  clientPhone?: string;
  clientEmail?: string;
}

export function ProposalGenerator({
  calculations,
  propertyValue,
  downPayment,
  interestRate,
  interestRateType = "annual",
  termMonths,
  amortizationType,
  clientName,
  propertyDescription,
  clientPhone,
  clientEmail,
}: ProposalGeneratorProps) {
  const { user, usageLimits, profile } = useAuth();
  const { plan, isActive } = useSubscription();
  const { toast } = useToast();
  const [proposalText, setProposalText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [salesArguments, setSalesArguments] = useState("");
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    logoUrl: null,
    companyName: "",
    creci: "",
    isBusiness: false,
  });

  const isBusiness = isActive && plan === "business";

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

    const idempotencyKey = `proposal-${clientName}-${propertyValue}-${Date.now()}`;

    try {
      const { data, error } = await supabase.functions.invoke("generate-proposal", {
        body: {
          clientName,
          propertyDescription,
          propertyValue,
          downPayment,
          interestRate,
          interestRateType,
          termMonths,
          amortizationType,
          monthlyPayment: calculations.firstPayment,
          totalPaid: calculations.totalPaid,
          totalInterest: calculations.totalInterest,
          monthsSaved: calculations.monthsSaved || undefined,
          interestSaved: calculations.interestSaved || undefined,
          businessMode: isBusiness,
          salesArguments: isBusiness && salesArguments.trim() ? salesArguments.trim() : undefined,
          clientPhone: clientPhone?.trim() || undefined,
          clientEmail: clientEmail?.trim() || undefined,
          consultantName: profile?.full_name || undefined,
          idempotencyKey,
        },
      });

      if (error) {
        const errorBody = typeof error === 'object' && 'message' in error ? error.message : '';
        if (errorBody.includes('429') || data?.code === 'RATE_LIMITED') {
          toast({ title: "Limite de requisições", description: "Muitas requisições em pouco tempo. Aguarde um momento.", variant: "destructive" });
          return;
        }
        throw error;
      }

      if (data.error) {
        const errorMessages: Record<string, { title: string; description: string }> = {
          "Limite de propostas atingido": { title: "Saldo de créditos insuficiente", description: data.message || "Faça upgrade para continuar gerando propostas." },
          "RATE_LIMITED": { title: "Limite de requisições", description: "Muitas requisições em pouco tempo. Aguarde um momento." },
        };
        const mapped = errorMessages[data.error] || { title: "Erro na geração", description: data.message || data.error };
        toast({ ...mapped, variant: "destructive" });
        return;
      }

      setProposalText(data.proposalText);
      toast({
        title: isBusiness ? "Proposta executiva gerada!" : "Proposta gerada!",
        description: isBusiness ? "Proposta estratégica criada com tom de exclusividade." : "Sua proposta foi criada com sucesso.",
      });
    } catch (error: any) {
      console.error("Error generating proposal:", error);
      const msg = error?.message || "";
      if (msg.includes("400")) {
        toast({ title: "Dados inválidos", description: "Verifique os campos preenchidos e tente novamente.", variant: "destructive" });
      } else if (msg.includes("429")) {
        toast({ title: "Muitas requisições", description: "Aguarde um momento antes de tentar novamente.", variant: "destructive" });
      } else if (msg.includes("402")) {
        toast({ title: "Créditos de IA esgotados", description: "Entre em contato com o suporte.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao gerar proposta", description: "Tente novamente em alguns instantes.", variant: "destructive" });
      }
    } finally {
      setIsGenerating(false);
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPos = 20;

    const isPro = isActive && plan === "pro";
    const consultantName = user ? (profile?.full_name || "") : "";

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

      doc.setDrawColor(200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
    }

    // Date/time of prospection
    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`Data e Hora da Prospeccao: ${dateStr} as ${timeStr}`, pageWidth - margin, yPos, { align: "right" });
    doc.setTextColor(0);
    yPos += 8;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Relatorio Estrategico de Cenarios", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(
      `Consultor Responsavel: ${consultantName || "____________________________"}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    doc.setTextColor(0);
    yPos += 10;

    doc.setDrawColor(220);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${clientName}`, margin, yPos);
    yPos += 6;
    doc.text(`Imovel: ${propertyDescription}`, margin, yPos);
    yPos += 10;

    // Sales arguments block (Business only)
    if (isBusiness && salesArguments.trim()) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Diferenciais do Imovel:", margin, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const argLines = doc.splitTextToSize(salesArguments.trim(), maxWidth);
      for (const line of argLines) {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += 5;
      }
      yPos += 5;
      doc.setDrawColor(220);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
    }

    doc.setFontSize(10);
    const lines = doc.splitTextToSize(proposalText, maxWidth);
    for (const line of lines) {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += 5;
    }

    const totalPages = doc.getNumberOfPages();
    const validityText = "Esta prospeccao tem validade de 24 horas, devido a volatilidade dos indexadores financeiros e taxas bancarias.";

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(160);
      doc.text(validityText, pageWidth / 2, pageHeight - 14, { align: "center" });

      const footerY = pageHeight - 8;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);

      if (reportConfig.isBusiness) {
        // White Label: only broker/company data, NO VetorPro
        const parts = [reportConfig.companyName, reportConfig.creci].filter(Boolean);
        const businessLine = parts.length > 0
          ? parts.join(" • ")
          : "";
        if (businessLine) {
          doc.text(businessLine, pageWidth / 2, footerY, { align: "center" });
        }
      } else if (isPro && (reportConfig.companyName || reportConfig.creci)) {
        const proFooter = [reportConfig.companyName, reportConfig.creci].filter(Boolean).join(" • ");
        doc.text(`${proFooter} | Gerado por VetorPro`, pageWidth / 2, footerY, { align: "center" });
      } else {
        doc.text("Gerado por VetorPro", pageWidth / 2, footerY, { align: "center" });
      }
      doc.setTextColor(0);
    }

    doc.save(`relatorio-estrategico-${clientName.replace(/\s+/g, "-").toLowerCase()}.pdf`);

    toast({
      title: "PDF gerado!",
      description: "Relatório Estratégico de Cenários baixado com sucesso.",
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
      <ReportConfiguration onConfigChange={setReportConfig} />

      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isBusiness ? (
                <Crown className="h-5 w-5 text-success" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
              {isBusiness ? "Proposta Executiva com IA" : "Gerar Proposta com IA"}
              {isBusiness && (
                <Badge variant="outline" className="border-success text-success text-xs ml-1">
                  Business
                </Badge>
              )}
            </div>
            {usageLimits && (
              <span className="text-sm font-normal text-muted-foreground">
                {usageLimits.proposalsRemaining} restantes
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {!canGenerateProposal && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Você atingiu o limite de propostas do seu plano atual.{" "}
                <Link to="/precos" className="font-medium underline">
                  Faça upgrade do seu plano
                </Link>{" "}
                para continuar gerando.
              </p>
            </div>
          )}

          {/* Business-only: Sales Arguments textarea */}
          {isBusiness && (
            <div className="space-y-2">
              <Label htmlFor="sales-arguments" className="text-sm font-medium">
                Argumentos de Venda (Opcional)
              </Label>
              <Textarea
                id="sales-arguments"
                value={salesArguments}
                onChange={(e) => {
                  if (e.target.value.length <= 500) setSalesArguments(e.target.value);
                }}
                placeholder="Ex: Casa a 100m da praia, acabamento classe A, sol da manhã e alta valorização."
                className="min-h-[80px] text-sm"
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  A IA incorporará seus argumentos na proposta executiva para criar um texto consultivo e exclusivo.
                </p>
                <span className={`text-xs ${salesArguments.length >= 480 ? "text-destructive" : "text-muted-foreground"}`}>
                  {salesArguments.length}/500
                </span>
              </div>
            </div>
          )}

          <Button
            variant={isBusiness ? "default" : "hero"}
            size="lg"
            className={`w-full ${isBusiness ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`}
            onClick={handleGenerateProposal}
            disabled={isGenerating || !canGenerateProposal}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isBusiness ? "Gerando proposta executiva..." : "Gerando proposta..."}
              </>
            ) : (
              <>
                {isBusiness ? (
                  <Crown className="mr-2 h-4 w-4" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isBusiness ? "Gerar Proposta Executiva" : "Gerar Proposta com IA"}
              </>
            )}
          </Button>

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
