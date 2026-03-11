import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionPlan = "basic" | "pro" | "business";

interface SubscriptionInfo {
  plan: SubscriptionPlan;
  isActive: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionInfo {
  const { user } = useAuth();
  const [plan, setPlan] = useState<SubscriptionPlan>("basic");
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setIsActive(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc("get_user_subscription", {
      p_user_id: user.id,
    });

    if (!error && data && data[0]) {
      setPlan(data[0].plan as SubscriptionPlan);
      setIsActive(data[0].is_active);
    } else {
      setIsActive(false);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return { plan, isActive, loading, refresh: fetchSubscription };
}

/** Returns the display label for the logo based on plan */
export function getPlanLabel(plan: SubscriptionPlan, isActive: boolean): string {
  if (!isActive) return "VetorPro";
  switch (plan) {
    case "basic": return "VetorPro Basic";
    case "pro": return "VetorPro Pro";
    case "business": return "VetorPro Business";
    default: return "VetorPro";
  }
}

/** Badge styling per plan */
export function getPlanBadge(plan: SubscriptionPlan) {
  switch (plan) {
    case "basic":
      return { label: "Plano Basic", className: "bg-muted-foreground text-background" };
    case "pro":
      return { label: "Plano Pro", className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white" };
    case "business":
      return { label: "Plano Business", className: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" };
  }
}
