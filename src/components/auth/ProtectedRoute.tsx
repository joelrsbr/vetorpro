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

        const [{ data: subscriptionData, error: subscriptionError }, { data: profileData, error: profileError }] = await Promise.all([
          supabase.rpc("get_user_subscription", {
            p_user_id: user.id,
          }),
          supabase
            .from("profiles")
            .select("subscription_plan")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (!subscriptionError && subscriptionData && subscriptionData[0]?.is_active) {
          setHasActiveSubscription(true);
        }

        if (!profileError && profileData?.subscription_plan && profileData.subscription_plan !== "free") {
          setHasEligibleProfilePlan(true);
        }
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
