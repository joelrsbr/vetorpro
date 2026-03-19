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
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              


              
              <span className="text-lg font-bold">
                {brandLabel}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Inteligência em cálculos e estratégias imobiliárias.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">
                  Calculadora
                </Link>
              </li>
              <li>
                <Link to="/precos" className="hover:text-primary transition-colors">
                  Preços
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Simulação SAC
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Simulação PRICE
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Propostas com IA
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Central de Ajuda
                </span>
              </li>
              <li>
                <span className="hover:text-primary transition-colors cursor-pointer">
                  Contato
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left space-y-1">
            <p className="text-sm text-muted-foreground">
              © 2026 {brandLabel}. Todos os direitos reservados.
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              Desenvolvido por J-RSBR Ltda.
            </p>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="/termos" className="hover:text-primary transition-colors">
              Termos de Uso
            </a>
            <a href="/privacidade" className="hover:text-primary transition-colors">
              Privacidade
            </a>
          </div>
        </div>
      </div>
    </footer>);

}