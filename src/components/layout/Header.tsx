import { Button } from "@/components/ui/button";
import { User, LogOut, CreditCard, Settings, LayoutDashboard } from "lucide-react";
import vetorproIcon from "@/assets/vetorpro-icon.png";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STRIPE_PORTAL_URL = "https://billing.stripe.com/p/login/test_14AbJ15XI4OD5kl0ji4ko00";

export function Header() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();

  const handleManageSubscription = () => {
    window.open(STRIPE_PORTAL_URL, "_blank");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <img src={vetorproIcon} alt="VetorPro" className="h-8 w-8 object-contain" />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-primary">Vetor</span>
            <span style={{ color: "hsl(152 68% 38%)" }}>Pro</span>
          </span>
        </Link>

        <div className="flex items-center">
          {loading || subLoading ? (
            <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {isActive && (
                  <>
                    <DropdownMenuItem onClick={handleManageSubscription}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Gerenciar Assinatura
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="hero" size="sm" asChild>
              <Link to="/precos">
                <User className="h-4 w-4" />
                Assinar Agora
              </Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
