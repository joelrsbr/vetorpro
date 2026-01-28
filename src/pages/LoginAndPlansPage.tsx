import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSession, PlanType } from "@/contexts/SessionContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Check, 
  X, 
  Building2, 
  Rocket, 
  CreditCard,
  Mail,
  Chrome,
  Monitor,
  Calculator,
  TrendingUp,
  BarChart3,
  Loader2,
  CheckCircle2,
  FileText,
  Crown
} from "lucide-react";

const plans = [
  {
    id: "basic" as PlanType,
    name: "Basic",
    price: "R$ 9,90",
    period: "/mês",
    description: "Corretores autônomos",
    icon: Crown,
    color: "bg-muted",
    borderColor: "border-muted-foreground/30",
    buttonColor: "bg-foreground/80 hover:bg-foreground text-background",
    buttonText: "Assinar Basic",
    features: [
      { text: "Simulador Financeiro", included: true },
      { text: "Painel de Cotações", included: true },
      { text: "Calculadora HP12C", included: true },
      { text: "Exportação PDF", included: false },
      { text: "Histórico de simulações", included: false },
    ],
  },
  {
    id: "pro" as PlanType,
    name: "Pro",
    price: "R$ 49,90",
    period: "/mês",
    description: "Consultores imobiliários profissionais",
    icon: Rocket,
    color: "bg-primary/10",
    borderColor: "border-primary",
    buttonColor: "bg-primary hover:bg-primary/90 text-primary-foreground",
    buttonText: "Assinar Pro",
    popular: true,
    features: [
      { text: "Tudo do Basic", included: true },
      { text: "Exportação PDF", included: true },
      { text: "Histórico de simulações", included: true },
      { text: "Personalização de Tema", included: true },
      { text: "Suporte prioritário", included: true },
    ],
  },
  {
    id: "business" as PlanType,
    name: "Business/TEAM",
    price: "R$ 149,90",
    period: "/mês",
    priceNote: "até 5 usuários",
    description: "Imobiliárias e construtoras",
    icon: Building2,
    color: "bg-success/10",
    borderColor: "border-success",
    buttonColor: "bg-success hover:bg-success/90 text-success-foreground",
    buttonText: "Falar com Consultor",
    features: [
      { text: "Tudo do Pro", included: true },
      { text: "Multiusuário e Dashboard", included: true },
      { text: "Relatórios corporativos", included: true },
      { text: "Integração via API", included: true },
      { text: "Suporte dedicado", included: true },
    ],
  },
];

export default function LoginAndPlansPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { session, login } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [loginMethod, setLoginMethod] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("pro");

  // Auto-redirect after showing welcome modal
  useEffect(() => {
    if (showWelcomeModal) {
      const timer = setTimeout(() => {
        navigate("/home");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showWelcomeModal, navigate]);

  // Redirect if already logged in (via Supabase auth)
  useEffect(() => {
    if (user) {
      navigate("/business");
    }
  }, [user, navigate]);

  // Redirect if already logged in via session
  useEffect(() => {
    if (session.isLoggedIn) {
      navigate("/home");
    }
  }, [session.isLoggedIn, navigate]);

  const handleSimulatedLogin = (method: string) => {
    setIsLoading(true);
    setLoginMethod(method);
    
    // Simulate loading time
    setTimeout(() => {
      setIsLoading(false);
      // Save session with selected plan
      login(method, selectedPlan);
      setShowWelcomeModal(true);
    }, 600);
  };

  const handleGoogleLogin = async () => {
    handleSimulatedLogin("Google");
  };

  const handleWindowsLogin = async () => {
    handleSimulatedLogin("Windows");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha e-mail e senha.",
        variant: "destructive",
      });
      return;
    }

    handleSimulatedLogin("E-mail");
  };

  const handlePlanSelect = (planId: PlanType) => {
    setSelectedPlan(planId);
    
    if (planId === "business") {
      toast({
        title: "Plano Business/TEAM selecionado",
        description: "Faça login para continuar.",
      });
    } else {
      toast({
        title: `Plano ${planId === "basic" ? "Basic" : "Pro"} selecionado`,
        description: "Faça login para ativar seu plano.",
      });
    }
  };

  const getPlanName = () => {
    const plan = plans.find(p => p.id === selectedPlan);
    return plan?.name || "Pro";
  };

  return (
    <>
      {/* Welcome Modal */}
      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="items-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-success/20 flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <DialogTitle className="text-xl">Login simulado com sucesso!</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Bem-vindo ao <strong>ImobCalcBR Business/TEAM</strong>
              <br />
              <span className="text-primary font-medium mt-2 block">
                Plano {getPlanName()} ativado
              </span>
              <span className="text-muted-foreground text-sm mt-2 block">
                Redirecionando para a página inicial...
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Aguarde um momento</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background animate-fade-in">
        {/* Header */}
        <header className="py-6 px-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
          <div className="container max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <Calculator className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">ImobCalcBR</h1>
                <p className="text-xs text-muted-foreground">Business/TEAM</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Já tenho conta
            </Button>
          </div>
        </header>

        <main className="container max-w-6xl mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simulador Financeiro Imobiliário
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A ferramenta completa para corretores e imobiliárias calcularem financiamentos, 
              gerarem propostas e fecharem mais negócios.
            </p>
          </div>

          {/* Login Section */}
          <Card className="max-w-md mx-auto mb-16 shadow-xl border-2 transition-all duration-300 hover:shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Acesse sua conta</CardTitle>
              <CardDescription>
                Entre para usar o simulador completo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showEmailLogin ? (
                <>
                  {/* Google Login - Primary */}
                  <Button
                    className="w-full h-12 text-base gap-3 bg-[#4285F4] hover:bg-[#3574E3] text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    {isLoading && loginMethod === "Google" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Chrome className="h-5 w-5" />
                    )}
                    Entrar com Google
                  </Button>

                  {/* Windows Login - Secondary */}
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base gap-3 border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-muted"
                    onClick={handleWindowsLogin}
                    disabled={isLoading}
                  >
                    {isLoading && loginMethod === "Windows" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Monitor className="h-5 w-5" />
                    )}
                    Entrar com Windows
                  </Button>

                  {/* Email Login - Tertiary */}
                  <button
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2 hover:underline"
                    onClick={() => setShowEmailLogin(true)}
                  >
                    <Mail className="h-4 w-4 inline mr-2" />
                    Entrar com outro e-mail
                  </button>
                </>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 shadow-md hover:shadow-lg transition-all"
                    disabled={isLoading}
                  >
                    {isLoading && loginMethod === "E-mail" ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : null}
                    Entrar
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowEmailLogin(false)}
                  >
                    ← Voltar para outras opções
                  </button>
                </form>
              )}

              <p className="text-xs text-center text-muted-foreground pt-2">
                Não tem conta?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-primary hover:underline font-medium"
                >
                  Criar conta grátis
                </button>
              </p>
            </CardContent>
          </Card>

          {/* Plans Section */}
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Escolha seu plano
            </h3>
            <p className="text-muted-foreground">
              Selecione o plano ideal para o seu negócio
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 cursor-pointer group ${
                  plan.popular ? "border-primary border-2 shadow-xl" : "border hover:border-primary/50"
                } ${selectedPlan === plan.id ? `ring-2 ring-offset-2 ${plan.borderColor} ring-opacity-50` : ""}`}
                onClick={() => handlePlanSelect(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-md">
                      Mais Popular
                    </span>
                  </div>
                )}

                {selectedPlan === plan.id && (
                  <div className="absolute top-3 right-3">
                    <div className="h-6 w-6 rounded-full bg-success flex items-center justify-center">
                      <Check className="h-4 w-4 text-success-foreground" />
                    </div>
                  </div>
                )}

                <CardHeader className={`rounded-t-lg ${plan.color} transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-2">
                    <plan.icon className="h-6 w-6 text-foreground group-hover:scale-110 transition-transform" />
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.priceNote && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.priceNote}
                    </p>
                  )}
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-success shrink-0" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                        )}
                        <span
                          className={
                            feature.included
                              ? "text-foreground"
                              : "text-muted-foreground/50"
                          }
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full shadow-md hover:shadow-lg transition-all ${plan.buttonColor}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanSelect(plan.id);
                    }}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer Note */}
          <p className="text-center text-sm text-muted-foreground max-w-xl mx-auto">
            Planos empresariais acima de 10 usuários sob consulta. 
            Condições sujeitas a contrato corporativo.
          </p>

          {/* Features Highlight */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Calculator, label: "Simulador SAC/PRICE" },
              { icon: TrendingUp, label: "Painel de Cotações" },
              { icon: FileText, label: "Propostas com IA" },
              { icon: BarChart3, label: "Relatórios Completos" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-200 hover:scale-105 cursor-default"
              >
                <item.icon className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium text-center">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t bg-muted/30">
          <div className="container max-w-6xl mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 ImobCalcBR Business/TEAM. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
