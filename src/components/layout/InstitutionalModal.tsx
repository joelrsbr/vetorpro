import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Building2 } from "lucide-react";

interface InstitutionalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstitutionalModal({ open, onOpenChange }: InstitutionalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center sm:text-center space-y-4">
          <DialogTitle className="text-lg font-semibold tracking-tight text-center">J-RSBR</DialogTitle>
          <p className="text-sm italic text-muted-foreground">
            Empresa Inova Simples (I.S.)<br />100% Brasileira
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Company info */}
          <div className="space-y-2 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span>CNPJ: 65.827.331/0001-45</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <a href="mailto:contato@J-RSBR.com.br" className="hover:text-primary transition-colors">
                contato@J-RSBR.com.br
              </a>
            </div>
          </div>

          <div className="mx-auto h-px w-16 bg-border" />

          {/* Mission */}
          <div className="text-center space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Missão</p>
            <p className="text-sm font-medium leading-relaxed text-foreground">
              Inteligência Artificial, Ética e Curadoria Humana a Serviço das Pessoas.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
