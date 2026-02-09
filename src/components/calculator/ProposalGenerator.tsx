import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, FileText, Copy, Download, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

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
  const { user, usageLimits, session } = useAuth();
  const { toast } = useToast();
  const [clientName, setClientName] = useState("");
  const [propertyDescription, setPropertyDescription] = useState("");
  const [proposalText, setProposalText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(proposalText);
    toast({
      title: "Copiado!",
      description: "Proposta copiada para a área de transferência.",
    });
  };

  const handleDownloadPDF = () => {
    // Create a simple text file download for now
    // A full PDF implementation would require a library like jsPDF
    const blob = new Blob([proposalText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposta-${clientName.replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download iniciado",
      description: "A proposta foi baixada como arquivo de texto.",
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
                  Baixar
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
  );
}
