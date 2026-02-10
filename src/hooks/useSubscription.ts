import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionPlan = "basic" | "pro" | "business";

interface SubscriptionInfo {
  plan: SubscriptionPlan;
  isActive: boolean;
  loading: boolean;
}

export function useSubscription(): SubscriptionInfo {
  const { user } = useAuth();
  const [plan, setPlan] = useState<SubscriptionPlan>("basic");
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      const { data, error } = await supabase.rpc("get_user_subscription", {
        p_user_id: user.id,
      });

      if (!error && data && data[0]) {
        setPlan(data[0].plan as SubscriptionPlan);
        setIsActive(data[0].is_active);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  return { plan, isActive, loading };
}
