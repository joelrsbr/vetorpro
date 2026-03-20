import { HelpCircle, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import vetorproLogo from "@/assets/vetorpro-logo.png";
import { useSubscription, getPlanLabel } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export function Footer() {
  const { user } = useAuth();
  const { plan, isActive } = useSubscription();
  const brandLabel = user ? getPlanLabel(plan, isActive) : "VetorPro";

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 cursor-help">
                    <HelpCircle className="h-4 w-4" />
                    <span>Suporte</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-center">
                  <p>Dúvidas? Nossa equipe responde em até 48h úteis.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
              <MessageCircle className="h-4 w-4 text-green-500 hover:text-green-600 transition-colors" />
            </a>
            <span className="mx-2">·</span>
            <img src={vetorproLogo} alt="VetorPro" className="h-5 w-auto" />
            <span className="font-semibold text-foreground">{brandLabel}</span>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <a href="/termos-de-uso" className="hover:text-primary transition-colors">Termos de Uso</a>
            <a href="/politica-de-privacidade" className="hover:text-primary transition-colors">Privacidade</a>
          </div>

          <p className="text-[10px] text-muted-foreground/60">
            © 2026 {brandLabel}. Desenvolvido por J-RSBR Ltda.
          </p>
        </div>
      </div>
    </footer>
  );
}
