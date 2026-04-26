import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, FileDown, Lock, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";

interface ExportActionsProps {
  // Financial values
  propertyValue: number;
  downPayment: number;
  financedAmount: number;
  firstPayment: number;
  totalInterest: number;
  totalPaid: number;
  interestRate: number; // annual %
  termMonths: number;
  amortizationType: "SAC" | "PRICE";
  correctionIndex: string;
  // Identification
  clientName: string;
  propertyDescription: string;
  clientPhone?: string;
  clientEmail?: string;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// Convert HSL string "224 76% 30%" → [r,g,b]
const hslToRgb = (hsl: string): [number, number, number] => {
  try {
    const parts = hsl.trim().split(/\s+/);
    const h = parseFloat(parts[0]) / 360;
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    if (s === 0) {
      const v = Math.round(l * 255);
      return [v, v, v];
    }
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ];
  } catch {
    return [30, 64, 124];
  }
};

const loadImageAsDataURL = (url: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

export function ExportActions(props: ExportActionsProps) {
  const { profile } = useAuth();
  const { plan, isActive } = useSubscription();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const canPDF = (plan === "pro" || plan === "business") && isActive;

  // Read brand from localStorage (same key as BusinessContext) — works even outside BusinessProvider
  const getBrand = () => {
    try {
      const raw = localStorage.getItem("vetorpro-business-settings");
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const handleCopyWhatsApp = async () => {
    const consultant = profile?.full_name || "Corretor";
    const creci = profile?.creci ? `CRECI ${profile.creci}` : "";
    const phone = profile?.phone || "";
    const sysLabel = props.amortizationType;
    const lines = [
      `📊 Simulação VetorPro — ${props.propertyDescription || "Imóvel"}`,
      `Valor financiado: ${formatBRL(props.financedAmount)} | Entrada: ${formatBRL(props.downPayment)}`,
      `1ª Parcela: ${formatBRL(props.firstPayment)} | Sistema: ${sysLabel} | Prazo: ${props.termMonths} meses`,
      `Taxa: ${props.interestRate.toFixed(2)}% a.a. | Total a pagar: ${formatBRL(props.totalPaid)}`,
      [consultant, creci, phone].filter(Boolean).join(" | "),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Resumo copiado", description: "Cole no WhatsApp do seu cliente." });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleDownloadPDF = async () => {
    if (!canPDF) {
      toast({
        title: "Recurso Professional",
        description: "Faça upgrade para gerar PDFs profissionais.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    try {
      const brand = getBrand();
      const primaryHSL = brand?.primaryColor || "224 76% 30%";
      const accentHSL = brand?.accentColor || "217 91% 60%";
      const [pr, pg, pb] = hslToRgb(primaryHSL);
      const [ar, ag, ab] = hslToRgb(accentHSL);

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;

      // Header band
      doc.setFillColor(pr, pg, pb);
      doc.rect(0, 0, pageW, 28, "F");

      // Logo (from profile.logo_url or brand.companyLogo)
      const logoUrl = profile?.logo_url || brand?.companyLogo || "";
      let textStartX = margin;
      if (logoUrl) {
        const dataUrl = await loadImageAsDataURL(logoUrl);
        if (dataUrl) {
          try {
            doc.addImage(dataUrl, "PNG", margin, 5, 18, 18);
            textStartX = margin + 22;
          } catch {}
        }
      }

      const consultant = profile?.full_name || brand?.consultantName || "Corretor";
      const company = profile?.company || brand?.companyName || "";
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(consultant, textStartX, 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const subParts = [
        company,
        profile?.creci ? `CRECI ${profile.creci}` : "",
      ].filter(Boolean);
      if (subParts.length) doc.text(subParts.join(" • "), textStartX, 19);
      doc.setFontSize(8);
      doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, 13, { align: "right" });

      // Title
      let y = 38;
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Análise de Financiamento Imobiliário", margin, y);

      // Client section
      y += 8;
      doc.setDrawColor(pr, pg, pb);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageW - margin, y);
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(pr, pg, pb);
      doc.text("DADOS DO CLIENTE", margin, y);
      y += 6;
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const clientLines = [
        ["Cliente", props.clientName || "—"],
        ["Imóvel", props.propertyDescription || "—"],
        ["Telefone", props.clientPhone || "—"],
        ["E-mail", props.clientEmail || "—"],
      ];
      clientLines.forEach(([k, v]) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${k}:`, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(v), margin + 22, y);
        y += 5.5;
      });

      // Simulation section
      y += 4;
      doc.setDrawColor(pr, pg, pb);
      doc.line(margin, y, pageW - margin, y);
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(pr, pg, pb);
      doc.text("DADOS DA SIMULAÇÃO", margin, y);
      y += 6;
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);

      const simRows: [string, string][] = [
        ["Valor do imóvel", formatBRL(props.propertyValue)],
        ["Entrada", formatBRL(props.downPayment)],
        ["Valor financiado", formatBRL(props.financedAmount)],
        ["Prazo", `${props.termMonths} meses`],
        ["Sistema de amortização", props.amortizationType],
        ["Taxa de juros", `${props.interestRate.toFixed(2)}% a.a.`],
        ["Indexador", props.correctionIndex.toUpperCase()],
        ["1ª Parcela", formatBRL(props.firstPayment)],
        ["Total de juros", formatBRL(props.totalInterest)],
        ["Total a pagar", formatBRL(props.totalPaid)],
      ];

      // Two-column layout
      const colW = (pageW - margin * 2) / 2;
      simRows.forEach((row, i) => {
        const col = i % 2;
        const rowIdx = Math.floor(i / 2);
        const x = margin + col * colW;
        const ry = y + rowIdx * 6;
        doc.setFont("helvetica", "bold");
        doc.text(`${row[0]}:`, x, ry);
        doc.setFont("helvetica", "normal");
        doc.text(row[1], x + 42, ry);
      });
      y += Math.ceil(simRows.length / 2) * 6 + 4;

      // Highlight box for first payment
      doc.setFillColor(ar, ag, ab);
      doc.setTextColor(255, 255, 255);
      doc.roundedRect(margin, y, pageW - margin * 2, 16, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("PRIMEIRA PARCELA", margin + 5, y + 7);
      doc.setFontSize(16);
      doc.text(formatBRL(props.firstPayment), pageW - margin - 5, y + 11, { align: "right" });
      y += 22;

      // Disclaimer
      doc.setTextColor(110, 110, 110);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      const disclaimer = doc.splitTextToSize(
        "Esta simulação é meramente ilustrativa e não constitui oferta de crédito. Valores sujeitos a aprovação cadastral e condições do banco. Indexadores e taxas podem variar.",
        pageW - margin * 2
      );
      doc.text(disclaimer, margin, y);

      // Footer
      const footerY = pageH - 14;
      doc.setDrawColor(pr, pg, pb);
      doc.setLineWidth(0.4);
      doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
      doc.setTextColor(pr, pg, pb);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(consultant, margin, footerY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const footerParts = [
        profile?.creci ? `CRECI ${profile.creci}` : "",
        profile?.phone || "",
        profile?.email || "",
      ].filter(Boolean);
      doc.text(footerParts.join(" • "), pageW - margin, footerY, { align: "right" });

      const safe = (s: string) => (s || "cliente").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      doc.save(`simulacao-${safe(props.clientName)}.pdf`);
      toast({ title: "PDF gerado", description: "Download iniciado." });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        className="h-12 gap-2"
        onClick={handleCopyWhatsApp}
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copiado!" : "Copiar Resumo (WhatsApp)"}
      </Button>

      {canPDF ? (
        <Button
          type="button"
          variant="outline"
          className="h-12 gap-2"
          onClick={handleDownloadPDF}
          disabled={generating}
        >
          <FileDown className="h-4 w-4" />
          {generating ? "Gerando..." : "Baixar PDF (1 página)"}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-12 gap-2 opacity-70"
          asChild
        >
          <Link to="/precos">
            <Lock className="h-4 w-4" />
            PDF 1 página — Professional
          </Link>
        </Button>
      )}
    </div>
  );
}
