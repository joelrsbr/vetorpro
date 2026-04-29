import { Button } from "@/components/ui/button";
import { User, LogOut, CreditCard, Settings, LayoutDashboard } from "lucide-react";
import vetorproLogoHorizontal from "@/assets/vetorpro-logo-horizontal.png";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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
  const dashboardPath = "/dashboard";

  const handleManageSubscription = () => {
    window.open(STRIPE_PORTAL_URL, "_blank");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white shadow-sm">
      <nav className="container flex h-16 items-center justify-between">
        <Link to={user ? dashboardPath : "/"} className="flex items-center gap-2">
          <img src={vetorproLogoHorizontal} alt="VetorPro" className="h-8 w-auto object-contain" />
        </Link>

        <div className="flex items-center">
          {loading ? (
            <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {user && (
                  <>
                    <DropdownMenuItem onClick={handleManageSubscription}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Gerenciar Assinatura
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => navigate(dashboardPath)}>
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
