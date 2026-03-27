import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Shield, Info, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS } from "@/lib/stripe-plans";
import { useToast } from "@/hooks/use-toast";

interface BusinessPaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessPaywallModal({ open, onOpenChange }: BusinessPaywallModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      toast({ title: "Erro", description: "Faça login para continuar.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: STRIPE_PLANS.business.priceId },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({ title: "Erro", description: "Não foi possível iniciar o checkout.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Inteligência Exclusiva Business</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            A Sondagem Estratégica é uma ferramenta de elite. Por apenas{" "}
            <strong className="text-foreground">R$ 229,90/mês</strong>, você tem o poder de 8 bancos em um clique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {[
            "Simulação simultânea em 6 bancos",
            "Taxas editáveis por proposta",
            "Selos de Melhor Taxa e Menor Custo",
            "APIs de Moedas e Indexadores em tempo real",
            "PDFs Premium com branding",
          ].map((feat) => (
            <div key={feat} className="flex items-center gap-2 text-sm">
              <Shield className="h-3.5 w-3.5 text-success shrink-0" />
              <span className="text-muted-foreground">{feat}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button
            variant="hero"
            size="lg"
            className="w-full gap-2"
            disabled={isLoading}
            onClick={handleUpgrade}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Migrar para Business agora
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-[12px] text-muted-foreground/60 text-center flex items-center justify-center gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Upgrade Inteligente: Ao migrar, o valor já pago será descontado proporcionalmente da sua primeira mensalidade.
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
  );
}