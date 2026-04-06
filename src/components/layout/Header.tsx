import { Button } from "@/components/ui/button";
import { User, Menu, X, LogOut, LayoutDashboard, Building2, Sparkles, CreditCard, Crown, TrendingUp } from "lucide-react";
import vetorproIcon from "@/assets/vetorpro-icon.png";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, getPlanLabel, getPlanBadge } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const STRIPE_PORTAL_URL = "https://billing.stripe.com/p/login/test_14AbJ15XI4OD5kl0ji4ko00";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const { plan, isActive, loading: subLoading } = useSubscription();
  const { toast } = useToast();
  
  const isLoginPage = location.pathname === "/login";
  const logoLabel = getPlanLabel(plan, isActive);
  const planBadge = isActive ? getPlanBadge(plan) : null;

  const handleManageSubscription = () => {
    window.open(STRIPE_PORTAL_URL, "_blank");
  };

  const navigation = isLoginPage 
    ? []
    : [
        { name: "Planos", href: "/precos" },
      ];

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate("/");
  };

  const labelParts = logoLabel.split(" ");
  const planSuffix = labelParts.slice(1).join(" ");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={vetorproIcon} alt="VetorPro" className="h-8 w-8 object-contain" />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-primary">Vetor</span>
            <span style={{ color: "hsl(152 68% 38%)" }}>Pro</span>
          </span>
          {planSuffix && <span className="text-primary text-sm font-semibold">{planSuffix}</span>}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                (item as any).highlight
                  ? "text-primary font-semibold flex items-center gap-1.5"
                  : location.pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              {(item as any).highlight && <Sparkles className="h-3.5 w-3.5" />}
              {item.name}
            </Link>
          ))}
          {user && (
            <>
              <Link
                to="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Dashboard
              </Link>
              {isActive && plan === "business" && (
                <Link
                  to="/business"
                  className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${
                    location.pathname === "/business" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Business
                </Link>
              )}
            </>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {loading || subLoading ? (
            <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <div className="flex items-center gap-2">
              {!isActive && (
                <Button variant="hero" size="sm" asChild>
                  <Link to="/precos">
                    <Crown className="h-4 w-4 mr-1" />
                    Ativar Assinatura
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold">{profile?.full_name?.split(" ")[0] || "Minha Conta"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {isActive && (
                    <>
                      <DropdownMenuItem onClick={handleManageSubscription}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Gerenciar Assinatura
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
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
            </div>
          ) : (
            <Button variant="hero" size="sm" asChild>
              <Link to="/precos">
                <User className="h-4 w-4" />
                Assinar Agora
              </Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-slide-up">
          <div className="container py-4 space-y-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`block text-sm font-medium transition-colors hover:text-primary ${
                  (item as any).highlight ? "text-primary font-semibold flex items-center gap-1.5" : "text-muted-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {(item as any).highlight && <Sparkles className="h-3.5 w-3.5" />}
                {item.name}
              </Link>
            ))}
            {user && (
              <>
                <Link to="/dashboard" className="block text-sm font-medium text-muted-foreground hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                  Dashboard
                </Link>
                {isActive && plan === "business" && (
                  <Link to="/business" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                    <Building2 className="h-3.5 w-3.5" />
                    Business
                  </Link>
                )}
              </>
            )}
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              {user ? (
                <>
                  <p className="text-sm text-muted-foreground px-1">{profile?.email}</p>
                  {planBadge && (
                    <Badge className={`${planBadge.className} w-fit`}>
                      <Crown className="h-3 w-3 mr-1" />
                      {planBadge.label}
                    </Badge>
                  )}
                  {!isActive && (
                    <Button variant="hero" size="sm" asChild>
                      <Link to="/precos" onClick={() => setMobileMenuOpen(false)}>
                        <Crown className="h-4 w-4 mr-1" />
                        Ativar Assinatura
                      </Link>
                    </Button>
                  )}
                  {isActive && (
                    <Button variant="outline" size="sm" onClick={() => { setMobileMenuOpen(false); handleManageSubscription(); }}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Gerenciar Assinatura
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </>
              ) : (
                <Button variant="hero" size="sm" asChild>
                  <Link to="/precos" onClick={() => setMobileMenuOpen(false)}>Assinar Agora</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}