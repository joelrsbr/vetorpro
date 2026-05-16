import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, Loader2, ArrowLeft } from "lucide-react";
import vetorproLogo from "@/assets/vetorpro-logo.svg";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createCheckoutUrl, getCheckoutPlanFromValue, getPendingCheckoutPlan } from "@/lib/checkout";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoCheckoutTriggered = useRef(false);

  const checkoutPlan = useMemo(
    () => getCheckoutPlanFromValue(searchParams.get("checkoutPlan")) ?? getPendingCheckoutPlan(),
    [searchParams]
  );

  // Redirect authenticated users without checkout plan to dashboard
  useEffect(() => {
    if (authLoading) return;
    if (user && !checkoutPlan) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, user, checkoutPlan, navigate]);

  useEffect(() => {
    if (authLoading || !user || !checkoutPlan || autoCheckoutTriggered.current) {
      return;
    }

    autoCheckoutTriggered.current = true;

    const triggerCheckout = async () => {
      setIsLoading(true);
      setLoadingMethod("checkout");
      try {
        const checkoutUrl = await createCheckoutUrl(checkoutPlan);
        window.location.assign(checkoutUrl);
      } catch (err: any) {
        autoCheckoutTriggered.current = false;
        toast({
          title: "Erro ao iniciar checkout",
          description: err.message || "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setLoadingMethod(null);
      }
    };

    void triggerCheckout();
  }, [authLoading, checkoutPlan, toast, user]);

  const redirectByPlan = async () => {
    const { data } = await supabase.rpc("get_user_subscription", {
      p_user_id: (await supabase.auth.getUser()).data.user!.id,
    });
    navigate("/dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingMethod("email");
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (!error && !checkoutPlan) {
      await redirectByPlan();
    }
    
    setIsLoading(false);
    setLoadingMethod(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingMethod("register");

    console.log("[Login] handleRegister →", { email: registerEmail });
    const { error, alreadyExists } = await signUp(registerEmail, registerPassword, registerName);
    console.log("[Login] signUp result:", { error, alreadyExists });

    if (!error && !alreadyExists) {
      // Email confirmation is required — do NOT attempt auto signIn (would fail with
      // "Invalid login credentials" on unconfirmed users and show misleading errors).
      toast({
        title: "Conta criada! Verifique seu e-mail",
        description: "Enviamos um link de confirmação para " + registerEmail + ". Confirme antes de fazer login.",
      });
    }

    setIsLoading(false);
    setLoadingMethod(null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast({
        title: "E-mail obrigatório",
        description: "Informe o e-mail da sua conta.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setLoadingMethod("forgot");

    const redirectTo = `${window.location.origin}/reset-password`;
    console.log("[Login] resetPasswordForEmail →", { email: forgotEmail, redirectTo });

    const { data, error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo,
    });

    console.log("[Login] resetPasswordForEmail response:", { data, error });

    if (error) {
      console.error("[Login] resetPasswordForEmail error:", error);
      toast({
        title: "Erro ao enviar e-mail",
        description: translateAuthError(error.message),
        variant: "destructive",
      });
    } else {
      toast({
        title: "E-mail enviado!",
        description: "Se este e-mail estiver cadastrado, você receberá o link de recuperação em instantes.",
      });
      setShowForgotPassword(false);
      setForgotEmail("");
    }

    setIsLoading(false);
    setLoadingMethod(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/30 to-background">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <img src={vetorproLogo} alt="VetorPro" className="mx-auto mb-3 h-20 w-20 object-contain" />
            <CardTitle className="text-2xl font-bold">
              <span className="text-primary">Vetor</span>
              <span className="text-success">Pro</span>
            </CardTitle>
            <CardDescription className="text-base">
              Acesse sua central de inteligência e<br />domine suas negociações.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {showForgotPassword ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Informe seu e-mail e enviaremos um link para redefinir sua senha.
                </p>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    variant="hero"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading && loadingMethod === "forgot" ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                    ) : (
                      "Enviar link de recuperação"
                    )}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao login
                  </button>
                </form>
              </div>
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="register">Criar Conta</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-login">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email-login" 
                          type="email" 
                          placeholder="seu@email.com"
                          className="pl-10"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password-login">Senha</Label>
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-xs text-primary hover:underline"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="password-login" 
                          type="password" 
                          placeholder="••••••••"
                          className="pl-10"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      variant="hero" 
                      className="w-full" 
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading && loadingMethod === "email" ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</>
                      ) : (
                        "Entrar"
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="name" 
                          type="text" 
                          placeholder="Seu nome"
                          className="pl-10"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email-register">E-mail</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email-register" 
                          type="email" 
                          placeholder="seu@email.com"
                          className="pl-10"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password-register">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="password-register" 
                          type="password" 
                          placeholder="Mínimo 8 caracteres"
                          className="pl-10"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          required
                          minLength={8}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      variant="hero" 
                      className="w-full" 
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading && loadingMethod === "register" ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</>
                      ) : (
                        "Criar minha Conta"
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Ao criar uma conta, você concorda com nossos{" "}
                      <a href="/termos-de-uso" className="text-primary hover:underline">Termos de Uso</a>
                      {" "}e{" "}
                      <a href="/politica-de-privacidade" className="text-primary hover:underline">Política de Privacidade</a>.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;
