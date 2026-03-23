import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const ProtectedRoute = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [hasEligibleProfilePlan, setHasEligibleProfilePlan] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Default to blocked — only set true on confirmed active subscription
        let active = false;
        try {
          const { data: subscriptionData, error: subscriptionError } = await supabase.rpc("get_user_subscription", {
            p_user_id: user.id,
          });

          if (!subscriptionError && subscriptionData && subscriptionData[0]?.is_active === true) {
            active = true;
          }
        } catch (rpcErr) {
          console.error("Erro ao verificar assinatura (RPC):", rpcErr);
          // On any error, remain blocked
        }
        setHasActiveSubscription(active);
      } catch (err) {
        console.error("Erro ao verificar assinatura:", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Não logado → login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logado mas sem assinatura ativa → preços
  // Exige AMBAS: assinatura ativa no Stripe E plano elegível no perfil
  if (!hasActiveSubscription) {
    return <Navigate to="/precos" replace />;
  }

  return <Outlet />;
};
