import { Landmark, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription, getPlanLabel } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

export function Footer() {
  const { user } = useAuth();
  const { plan, isActive } = useSubscription();
  const brandLabel = user ? getPlanLabel(plan, isActive) : "VetorPro";

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-8">
        <div className="flex flex-col items-center gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary relative">
              <Landmark className="h-4 w-4 text-primary-foreground" />
              <TrendingUp className="h-2.5 w-2.5 text-primary-foreground absolute -top-0.5 -right-0.5" />
            </div>
            <span className="text-lg font-bold">{brandLabel}</span>
          </Link>

          {/* Support + Legal */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="hover:text-primary transition-colors cursor-pointer">Suporte</span>
            <span>·</span>
            <a href="/termos" className="hover:text-primary transition-colors">Termos de Uso</a>
            <span>·</span>
            <a href="/privacidade" className="hover:text-primary transition-colors">Privacidade</a>
          </div>

          {/* Copyright */}
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              © 2026 {brandLabel}. Todos os direitos reservados.
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              Desenvolvido por J-RSBR Ltda.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
