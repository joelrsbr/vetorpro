import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Globe as Chrome, Monitor, Mail, Loader2, ArrowLeft } from "lucide-react";
import { PlanType } from "@/contexts/SessionContext";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: PlanType;
  onLogin: (method: string) => void;
  isLoading: boolean;
  loginMethod: string;
}

export function LoginModal({
  open,
  onOpenChange,
  selectedPlan,
  onLogin,
  isLoading,
  loginMethod,
}: LoginModalProps) {
  const { toast } = useToast();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const getPlanName = () => {
    switch (selectedPlan) {
      case "basic":
        return "Basic";
      case "pro":
        return "Pro";
      case "business":
        return "Business/TEAM";
      default:
        return "Pro";
    }
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha e-mail e senha.",
        variant: "destructive",
      });
      return;
    }
    onLogin("E-mail");
  };

  const handleClose = (value: boolean) => {
    if (!isLoading) {
      setShowEmailForm(false);
      setEmail("");
      setPassword("");
      onOpenChange(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md animate-fade-in">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl">Assinar plano {getPlanName()}</DialogTitle>
          <DialogDescription className="text-base">
            Entre para ativar sua assinatura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!showEmailForm ? (
            <>
              {/* Google Login */}
              <Button
                className="w-full h-12 text-base gap-3 bg-[#4285F4] hover:bg-[#3574E3] text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                onClick={() => onLogin("Google")}
                disabled={isLoading}
              >
                {isLoading && loginMethod === "Google" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Chrome className="h-5 w-5" />
                )}
                Entrar com Google
              </Button>

              {/* Windows Login */}
              <Button
                variant="outline"
                className="w-full h-12 text-base gap-3 border-2 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-muted hover:scale-[1.02]"
                onClick={() => onLogin("Windows")}
                disabled={isLoading}
              >
                {isLoading && loginMethod === "Windows" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Monitor className="h-5 w-5" />
                )}
                Entrar com Windows
              </Button>

              {/* Email option */}
              <button
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2 hover:underline"
                onClick={() => setShowEmailForm(true)}
                disabled={isLoading}
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
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
                onClick={() => setShowEmailForm(false)}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para outras opções
              </button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
