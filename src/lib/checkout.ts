import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS } from "@/lib/stripe-plans";

const PENDING_CHECKOUT_PLAN_KEY = "vetorpro_pending_checkout_plan";

export type CheckoutPlan = keyof typeof STRIPE_PLANS;

export const isCheckoutPlan = (value: string | null): value is CheckoutPlan => {
  return Boolean(value && value in STRIPE_PLANS);
};

export const getCheckoutPlanFromValue = (value: string | null): CheckoutPlan | null => {
  return isCheckoutPlan(value) ? value : null;
};

export const setPendingCheckoutPlan = (plan: CheckoutPlan) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_CHECKOUT_PLAN_KEY, plan);
};

export const getPendingCheckoutPlan = (): CheckoutPlan | null => {
  if (typeof window === "undefined") return null;
  return getCheckoutPlanFromValue(window.localStorage.getItem(PENDING_CHECKOUT_PLAN_KEY));
};

export const clearPendingCheckoutPlan = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
};

export const createCheckoutUrl = async (plan: CheckoutPlan) => {
  const stripePlan = STRIPE_PLANS[plan];

  if (!stripePlan) {
    throw new Error("Plano inválido.");
  }

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { priceId: stripePlan.priceId },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error("Checkout indisponível no momento.");
  }

  return data.url as string;
};