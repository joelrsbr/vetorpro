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
    consultantName: "",
    creci: "",
    socials: {},
    isBusiness: false,
    isPro: false,
    isBasic: true,
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

    const isPro = isActive && plan === "pro";
    const consultantName = (profile?.full_name || "").trim();

    const rateUnitLabel = interestRateType === "monthly" ? "a.m." : "a.a.";

    // Justified text writer (manual word-spacing) — fallback to left for last line
    const writeJustified = (
      text: string,
      x: number,
      startY: number,
      width: number,
      lineHeight: number,
      bottomLimit: number,
      onPageBreak: () => number
    ): number => {
      let y = startY;
      const paragraphs = text.split(/\n+/);
      for (const para of paragraphs) {
        const words = para.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) {
          y += lineHeight;
          continue;
        }
        // Greedy line break
        const lines: string[][] = [];
        let cur: string[] = [];
        for (const w of words) {
          const trial = [...cur, w].join(" ");
          if (doc.getTextWidth(trial) > width && cur.length > 0) {
            lines.push(cur);
            cur = [w];
          } else {
            cur.push(w);
          }
        }
        if (cur.length) lines.push(cur);

        for (let li = 0; li < lines.length; li++) {
          if (y > bottomLimit) {
            y = onPageBreak();
          }
          const lineWords = lines[li];
          const isLast = li === lines.length - 1;
          if (isLast || lineWords.length === 1) {
            doc.text(lineWords.join(" "), x, y);
          } else {
            const lineText = lineWords.join(" ");
            const textW = doc.getTextWidth(lineText);
            const gaps = lineWords.length - 1;
            const extra = (width - textW) / gaps;
            let cx = x;
            for (let wi = 0; wi < lineWords.length; wi++) {
              doc.text(lineWords[wi], cx, y);
              cx += doc.getTextWidth(lineWords[wi]) + doc.getTextWidth(" ") + extra;
            }
          }
          y += lineHeight;
        }
        y += lineHeight * 0.4; // paragraph spacing
      }
      return y;
    };

    // Replace any AI-leaked placeholder names by the real consultant
    let cleanedProposal = proposalText;
    if (consultantName) {
      cleanedProposal = cleanedProposal.replace(/Joel\s+TESTE/gi, consultantName);
    }

    // Header (cover or first page)
    let yPos = 20;

    const drawBrandHeader = () => {
      let localY = 20;
      if (reportConfig.isBusiness) {
        if (reportConfig.companyName) {
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(reportConfig.companyName, pageWidth / 2, localY, { align: "center" });
          localY += 7;
        }
        if (reportConfig.creci) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(reportConfig.creci, pageWidth / 2, localY, { align: "center" });
          localY += 5;
        }
        doc.setDrawColor(200);
        doc.line(margin, localY, pageWidth - margin, localY);
        localY += 10;
      }
      return localY;
    };

    // === BUSINESS: COVER PAGE ===
    if (isBusiness) {
      // Optional logo on cover
      if (reportConfig.isBusiness && reportConfig.logoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = reportConfig.logoUrl!;
          });
          doc.addImage(img, "PNG", pageWidth / 2 - 20, 50, 40, 20);
        } catch {}
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString("pt-BR");
      const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.text(`Prospecção emitida em ${dateStr} às ${timeStr}`, pageWidth / 2, 90, { align: "center" });
      doc.setTextColor(0);

      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório Estratégico", pageWidth / 2, 130, { align: "center" });
      doc.text("de Cenários", pageWidth / 2, 142, { align: "center" });

      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text(`Preparado para ${clientName}`, pageWidth / 2, 165, { align: "center" });
      if (propertyDescription) {
        const pdLines = doc.splitTextToSize(propertyDescription, maxWidth - 20);
        doc.text(pdLines, pageWidth / 2, 175, { align: "center" });
      }

      doc.setFontSize(11);
      doc.setTextColor(40);
      doc.text(
        consultantName ? `Consultor Responsável: ${consultantName}` : "Consultor Responsável",
        pageWidth / 2,
        pageHeight - 50,
        { align: "center" }
      );
      doc.setTextColor(0);

      doc.addPage();
      yPos = drawBrandHeader();
    } else {
      // PRO/Standard: brand header inline
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
        } catch {}
      }
      yPos = Math.max(yPos, drawBrandHeader());
    }

    // === PAGE: DADOS DA SIMULAÇÃO ===
    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR");
    const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`Data e Hora da Prospecção: ${dateStr} às ${timeStr}`, pageWidth - margin, yPos, { align: "right" });
    doc.setTextColor(0);
    yPos += 8;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Estratégico de Cenários", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(
      `Consultor Responsável: ${consultantName || "____________________________"}`,
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
    doc.setFont("helvetica", "bold");
    doc.text("Dados do Cliente e Simulação", margin, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");

    const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const dataRows: [string, string][] = [
      ["Cliente", clientName || "—"],
      ["Imóvel", propertyDescription || "—"],
      ["Valor do imóvel", fmtBRL(propertyValue)],
      ["Entrada", fmtBRL(downPayment)],
      ["Valor financiado", fmtBRL(propertyValue - downPayment)],
      ["Sistema", amortizationType.toUpperCase()],
      ["Prazo", `${termMonths} meses`],
      ["Taxa de juros", `${interestRate.toFixed(2)}% ${rateUnitLabel}`],
      ["Parcela inicial", fmtBRL(calculations.firstPayment)],
      ["Total a pagar", fmtBRL(calculations.totalPaid)],
      ["Total de juros", fmtBRL(calculations.totalInterest)],
    ];
    doc.setFontSize(10);
    for (const [k, v] of dataRows) {
      doc.setFont("helvetica", "bold");
      doc.text(`${k}:`, margin, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(String(v), margin + 45, yPos);
      yPos += 6;
    }

    yPos += 4;

    // Sales arguments block (Business only) — kept on data page
    if (isBusiness && salesArguments.trim()) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Diferenciais do Imóvel:", margin, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      yPos = writeJustified(salesArguments.trim(), margin, yPos, maxWidth, 5, pageHeight - 30, () => {
        doc.addPage();
        return 20;
      });
      yPos += 4;
      doc.setDrawColor(220);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;
    }

    // === PAGE: CENÁRIO/CONCLUSÃO (Business → forced new page) ===
    if (isBusiness) {
      doc.addPage();
      yPos = drawBrandHeader();
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Cenário Estratégico e Conclusão", margin, yPos);
      yPos += 8;
    } else {
      yPos += 2;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    yPos = writeJustified(cleanedProposal, margin, yPos, maxWidth, 5, pageHeight - 30, () => {
      doc.addPage();
      return 20;
    });

    // === FOOTER on every page ===
    const totalPages = doc.getNumberOfPages();
    const volatilityNotice =
      "Esta prospecção pode sofrer alterações sem prévio aviso devido à volatilidade dos indexadores financeiros e taxas bancárias. Consulte seu corretor para confirmar as condições vigentes.";

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // Volatility notice — italic, secondary
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(140);
      const noticeLines = doc.splitTextToSize(volatilityNotice, pageWidth - margin * 2);
      doc.text(noticeLines, pageWidth / 2, pageHeight - 18, { align: "center" });

      // Brand footer line
      const footerY = pageHeight - 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150);

      if (reportConfig.isBusiness) {
        const parts = [reportConfig.companyName, reportConfig.creci].filter(Boolean);
        const businessLine = parts.join(" • ");
        if (businessLine) doc.text(businessLine, pageWidth / 2, footerY, { align: "center" });
      } else if (isPro && (reportConfig.companyName || reportConfig.creci)) {
        const proFooter = [reportConfig.companyName, reportConfig.creci].filter(Boolean).join(" • ");
        doc.text(`${proFooter} | Gerado por VetorPro`, pageWidth / 2, footerY, { align: "center" });
      } else {
        doc.text("Gerado por VetorPro", pageWidth / 2, footerY, { align: "center" });
      }

      // Page number (right)
      doc.text(`${i}/${totalPages}`, pageWidth - margin, footerY, { align: "right" });
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
