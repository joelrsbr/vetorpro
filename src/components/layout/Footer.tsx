import { HelpCircle } from "lucide-react";
import vetorproLogo from "@/assets/vetorpro-logo.png";
import { useSubscription, getPlanLabel } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

export function Footer() {
  const { user } = useAuth();
  const { plan, isActive } = useSubscription();
  const brandLabel = user ? getPlanLabel(plan, isActive) : "VetorPro";

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span>Suporte</span>
            <span className="mx-2">·</span>
            <img src={vetorproLogo} alt="VetorPro" className="h-5 w-auto" />
            <span className="font-semibold text-foreground">{brandLabel}</span>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <a href="/termos" className="hover:text-primary transition-colors">Termos de Uso</a>
            <a href="/privacidade" className="hover:text-primary transition-colors">Privacidade</a>
          </div>

          <p className="text-[10px] text-muted-foreground/60">
            © 2026 {brandLabel}. Desenvolvido por J-RSBR Ltda.
          </p>
        </div>
      </div>
    </footer>
  );
}
