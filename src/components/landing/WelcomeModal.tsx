import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PlanType } from "@/contexts/SessionContext";

interface WelcomeModalProps {
  open: boolean;
  planId: PlanType;
}

export function WelcomeModal({ open, planId }: WelcomeModalProps) {
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

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md text-center [&>button]:hidden">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-success/20 flex items-center justify-center animate-scale-in">
            <CheckCircle2 className="h-10 w-10 text-success" />
          </div>
          <DialogTitle className="text-xl">Login realizado com sucesso!</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Bem-vindo ao <strong>ImobCalcBR Business/TEAM</strong>
            <br />
            <span className="text-primary font-medium mt-2 block">
              Plano {getPlanName()} ativado
            </span>
            <span className="text-muted-foreground text-sm mt-2 block">
              Redirecionando para o painel...
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Aguarde um momento</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
