import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Check, 
  X, 
  Building2, 
  Rocket, 
  CreditCard,
  Mail,
  Chrome,
  Monitor,
  Users,
  FileText,
  Calculator,
  TrendingUp,
  Palette,
  History,
  Headphones,
  BarChart3,
  Loader2
} from "lucide-react";

const plans = [
  {
    id: "basic",
    name: "Basic",
    price: "R$ 9,90",
    period: "/mês",
    description: "Corretores autônomos",
    icon: CreditCard,
    color: "bg-muted",
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
    id: "pro",
    name: "Pro",
    price: "R$ 49,90",
    period: "/mês",
    description: "Consultores imobiliários profissionais",
    icon: Rocket,
    color: "bg-primary/10",
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
    id: "business",
    name: "Business/TEAM",
    price: "R$ 149,90",
    period: "/mês",
    priceNote: "até 5 usuários",
    description: "Imobiliárias e construtoras",
    icon: Building2,
    color: "bg-success/10",
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
  const { user, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Redirect if already logged in
  if (user) {
    navigate("/business");
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Placeholder for Google OAuth integration
      toast({
        title: "Login com Google",
        description: "Funcionalidade em integração. Use o login por e-mail.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao conectar com Google.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWindowsLogin = async () => {
    toast({
      title: "Login com Windows",
      description: "Funcionalidade em desenvolvimento.",
    });
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

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (!error) {
      navigate("/business");
    }
  };

  const handlePlanSelect = (planId: string) => {
    if (!user) {
      toast({
        title: "Faça login primeiro",
        description: "Escolha um plano para liberar o acesso completo.",
      });
      return;
    }

    if (planId === "business") {
      toast({
        title: "Plano Business/TEAM",
        description: "Um consultor entrará em contato em breve.",
      });
    } else {
      // Placeholder for Stripe integration
      toast({
        title: "Processando assinatura",
        description: `Redirecionando para pagamento do plano ${planId}...`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background">
      {/* Header */}
      <header className="py-6 px-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
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
        <Card className="max-w-md mx-auto mb-16 shadow-lg border-2">
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
                  className="w-full h-12 text-base gap-3 bg-[#4285F4] hover:bg-[#3574E3] text-white"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Chrome className="h-5 w-5" />
                  )}
                  Entrar com Google
                </Button>

                {/* Windows Login - Secondary */}
                <Button
                  variant="outline"
                  className="w-full h-12 text-base gap-3 border-2"
                  onClick={handleWindowsLogin}
                  disabled={isLoading}
                >
                  <Monitor className="h-5 w-5" />
                  Entrar com Windows
                </Button>

                {/* Email Login - Tertiary */}
                <button
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
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
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={isLoading}
                >
                  {isLoading ? (
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
                className="text-primary hover:underline"
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
              className={`relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                plan.popular ? "border-primary border-2 shadow-lg" : "border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    Mais Popular
                  </span>
                </div>
              )}

              <CardHeader className={`rounded-t-lg ${plan.color}`}>
                <div className="flex items-center gap-3 mb-2">
                  <plan.icon className="h-6 w-6 text-foreground" />
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
                  className={`w-full ${plan.buttonColor}`}
                  onClick={() => handlePlanSelect(plan.id)}
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
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
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
  );
}
