import { useNavigate } from "react-router-dom";
import { useSession, PlanDetails } from "@/contexts/SessionContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Calculator, 
  MoreVertical, 
  ClipboardList, 
  LogOut, 
  User,
  Check,
  Crown,
  Building2,
  Rocket
} from "lucide-react";
import { useState } from "react";

export function BusinessTeamHeader() {
  const navigate = useNavigate();
  const { session, logout, getPlanDetails } = useSession();
  const { settings, isCustomized } = useBusiness();
  const [showPlanModal, setShowPlanModal] = useState(false);

  const planDetails = getPlanDetails();

  const handleLogout = () => {
    logout();
    navigate("/loginandplans");
  };

  const getPlanBadgeClass = () => {
    switch (session.plan) {
      case "basic":
        return "bg-muted-foreground/90 text-background";
      case "pro":
        return "bg-primary text-primary-foreground";
      case "business":
        return "bg-success text-success-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPlanIcon = () => {
    switch (session.plan) {
      case "basic":
        return <Crown className="h-3 w-3" />;
      case "pro":
        return <Rocket className="h-3 w-3" />;
      case "business":
        return <Building2 className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getPlanDisplayName = () => {
    switch (session.plan) {
      case "basic":
        return "Basic";
      case "pro":
        return "Pro";
      case "business":
        return "Business";
      default:
        return "Free";
    }
  };

  // Only show if session is logged in
  if (!session.isLoggedIn) return null;

  return (
    <>
      {/* Plan Details Modal */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Meu Plano
            </DialogTitle>
            <DialogDescription>
              Detalhes da sua assinatura atual
            </DialogDescription>
          </DialogHeader>
          
          {planDetails && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {session.plan === "basic" && <Crown className="h-8 w-8 text-muted-foreground" />}
                  {session.plan === "pro" && <Rocket className="h-8 w-8 text-primary" />}
                  {session.plan === "business" && <Building2 className="h-8 w-8 text-success" />}
                  <div>
                    <h4 className="font-semibold text-lg">{planDetails.name}</h4>
                    <p className="text-sm text-muted-foreground">{planDetails.price}</p>
                  </div>
                </div>
                <Badge className={getPlanBadgeClass()}>Ativo</Badge>
              </div>

              <div className="space-y-2">
                <h5 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Benefícios inclusos
                </h5>
                <ul className="space-y-2">
                  {planDetails.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setShowPlanModal(false);
                    navigate("/loginandplans");
                  }}
                >
                  Alterar plano
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-primary shadow-md">
        <div className="container flex h-14 items-center justify-between px-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            {isCustomized && settings.companyLogo ? (
              <img 
                src={settings.companyLogo} 
                alt={settings.companyName}
                className="h-8 max-w-20 object-contain brightness-0 invert"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/20">
                <Calculator className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
          </div>

          {/* Center: Team Name */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
            <h1 className="text-sm md:text-base font-semibold text-primary-foreground whitespace-nowrap">
              {isCustomized ? settings.companyName : session.teamName}
            </h1>
          </div>

          {/* Right: Consultant + Plan Badge + Menu */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Plan Badge */}
            <Badge 
              className={`hidden md:flex items-center gap-1 text-xs font-medium ${getPlanBadgeClass()}`}
            >
              {getPlanIcon()}
              Plano: {getPlanDisplayName()}
            </Badge>

            {/* Consultant Name */}
            <div className="hidden sm:flex items-center gap-1.5 text-primary-foreground/90 text-sm">
              <User className="h-3.5 w-3.5" />
              <span className="max-w-[120px] truncate">
                {isCustomized && settings.consultantName 
                  ? settings.consultantName 
                  : session.consultantName}
              </span>
            </div>

            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Mobile: Show plan badge */}
                <div className="md:hidden px-2 py-1.5">
                  <Badge className={`w-full justify-center ${getPlanBadgeClass()}`}>
                    {getPlanIcon()}
                    <span className="ml-1">Plano: {getPlanDisplayName()}</span>
                  </Badge>
                </div>
                <DropdownMenuSeparator className="md:hidden" />
                
                <DropdownMenuItem onClick={() => setShowPlanModal(true)}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  📋 Meu Plano
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  🚪 Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}
