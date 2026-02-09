import { Button } from "@/components/ui/button";
import { Calculator, User, Menu, X, LogOut, LayoutDashboard, Building2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, profile, signOut, loading } = useAuth();
  
  const isLoginPage = location.pathname === "/login";

  // Navigation items - hide Calculadora on login page
  const navigation = isLoginPage 
    ? [{ name: "Assine e saia na frente", href: "/precos", highlight: true }]
    : [
        { name: "Calculadora", href: "/" },
        { name: "Planos", href: "/precos" },
      ];

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Calculator className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">
            Imob<span className="text-gradient">Calc</span> Pro
          </span>
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
                  location.pathname === "/dashboard"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/business"
                className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${
                  location.pathname === "/business"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                Business
              </Link>
            </>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {profile?.full_name?.split(" ")[0] || "Minha Conta"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
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
              <Link to="/login">
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
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
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
                  (item as any).highlight
                    ? "text-primary font-semibold flex items-center gap-1.5"
                    : "text-muted-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {(item as any).highlight && <Sparkles className="h-3.5 w-3.5" />}
                {item.name}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  to="/dashboard"
                  className="block text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/business"
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Business
                </Link>
              </>
            )}
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              {user ? (
                <>
                  <p className="text-sm text-muted-foreground px-1">
                    {profile?.email}
                  </p>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </>
              ) : (
                <Button variant="hero" size="sm" asChild>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    Assinar Agora
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
