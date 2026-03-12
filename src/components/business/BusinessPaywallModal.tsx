import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, Shield, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BusinessPaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessPaywallModal({ open, onOpenChange }: BusinessPaywallModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Inteligência Exclusiva Business</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            O Comparativo Multi-Bancos é uma ferramenta de elite. Por apenas{" "}
            <strong className="text-foreground">R$ 149,90/mês</strong>, você tem o poder de 6 bancos em um clique.
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

        <DialogFooter className="sm:justify-center pt-2 flex-col items-center gap-3">
          <Button
            variant="hero"
            size="lg"
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              navigate("/precos");
            }}
          >
            Migrar para Business agora
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-[11px] text-muted-foreground/70 text-center flex items-center justify-center gap-1">
            <Info className="h-3 w-3 shrink-0" />
            <span>Upgrade Inteligente: Ao migrar, o valor do seu plano atual será descontado proporcionalmente da primeira mensalidade.</span>
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
