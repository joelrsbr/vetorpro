import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlanType } from "@/contexts/SessionContext";

interface WelcomeModalProps {
  open: boolean;
  planId: PlanType;
  onStart?: () => void;
}

export function WelcomeModal({ open, planId, onStart }: WelcomeModalProps) {
  const [accepted, setAccepted] = useState(false);

  const getPlanName = () => {
    switch (planId) {
      case "basic":
        return "Basic";
      case "pro":
        return "Pro";
      case "business":
        return "Business/TEAM";
      default:
        return "Pro";
    }
  };

  const handleStart = () => {
    localStorage.setItem("vetorpro_onboarding_accepted", "true");
    onStart?.();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md text-center [&>button]:hidden">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-success/20 flex items-center justify-center animate-scale-in">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <DialogTitle className="text-xl">Login realizado com sucesso!</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Bem-vindo ao <strong>VetorPro</strong>
            <br />
            <span className="text-primary font-medium mt-2 block">
              Plano {getPlanName()} ativado
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 pt-4 text-left">
          <Checkbox
            id="accept-terms"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-0.5"
          />
          <label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
            Li e aceito os{" "}
            <a href="/termos-de-uso" target="_blank" className="underline hover:text-primary">
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a href="/politica-de-privacidade" target="_blank" className="underline hover:text-primary">
              Política de Privacidade
            </a>.
          </label>
        </div>

        <Button
          className="w-full mt-2"
          disabled={!accepted}
          onClick={handleStart}
        >
          Iniciar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
