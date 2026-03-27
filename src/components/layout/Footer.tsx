import { HelpCircle, MessageCircle, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import vetorproLogo from "@/assets/vetorpro-logo.png";
import { useSubscription, getPlanLabel } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { InstitutionalModal } from "./InstitutionalModal";

export function Footer() {
  const { user } = useAuth();
  const { plan, isActive } = useSubscription();
  const brandLabel = user ? getPlanLabel(plan, isActive) : "VetorPro";
  const [showInstitutional, setShowInstitutional] = useState(false);

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground md:text-base">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1.5 cursor-help">
                    <HelpCircle className="h-5 w-5" />
                    <span className="font-medium">Suporte</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-center">
                  <p>Dúvidas? Nossa equipe responde em até 48h úteis.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
              <MessageCircle className="h-5 w-5 text-green-500 hover:text-green-600 transition-colors" />
            </a>
            <span className="mx-2">·</span>
            <img src={vetorproLogo} alt="VetorPro" className="h-6 w-auto" />
            <span className="font-semibold text-foreground">{brandLabel}</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <a href="mailto:suporte@vetorpro.com.br" className="hover:text-primary transition-colors">
              suporte@vetorpro.com.br
            </a>
          </div>

          <div className="flex items-center justify-center gap-5 text-sm text-muted-foreground">
            <Link to="/termos-de-uso" className="hover:text-primary transition-colors font-medium">Termos de Uso</Link>
            <Link to="/politica-de-privacidade" className="hover:text-primary transition-colors font-medium">Privacidade</Link>
          </div>

          <p className="text-xs text-muted-foreground/70">
            © 2026 {brandLabel}. Operado por{" "}
            <button
              onClick={() => setShowInstitutional(true)}
              className="underline underline-offset-2 hover:text-primary transition-colors"
            >
              J-RSBR (I.S.)
            </button>
          </p>
        </div>
      </div>
      <InstitutionalModal open={showInstitutional} onOpenChange={setShowInstitutional} />
    </footer>
  );
}
