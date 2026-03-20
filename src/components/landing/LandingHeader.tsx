import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import vetorproLogo from "@/assets/vetorpro-logo.png";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const navigation = [
    { name: "Benefícios", href: "#beneficios" },
    { name: "Planos", href: "#planos" },
  ];

  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/40 supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src={vetorproLogo} alt="VetorPro" className="h-10 w-auto object-contain" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => scrollToSection(item.href)}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-32 bg-muted/50 animate-pulse rounded-lg" />
          ) : user ? (
            <Button
              variant="hero"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Acessar meu Painel
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="gap-2"
              >
                <LogIn className="h-4 w-4" />
                Entrar
              </Button>
              <Button
                variant="hero"
                size="sm"
                onClick={() => scrollToSection("#planos")}
              >
                Iniciar
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
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
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border animate-slide-up">
          <div className="container py-4 space-y-4">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.href)}
                className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2"
              >
                {item.name}
              </button>
            ))}
            
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              {loading ? (
                <div className="h-9 w-full bg-muted/50 animate-pulse rounded-lg" />
              ) : user ? (
                <Button
                  variant="hero"
                  size="sm"
                  onClick={() => {
                    navigate("/dashboard");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Acessar meu Painel
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigate("/login");
                      setMobileMenuOpen(false);
                    }}
                    className="w-full gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </Button>
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={() => scrollToSection("#planos")}
                    className="w-full"
                  >
                    Iniciar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
