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
import { Mail, Lock, Loader2 } from "lucide-react";
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
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-11 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-11 pl-10"
                />
              </div>
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
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
