import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TE8bEK0PFZazC04eMPnB54f": "basic",
  "price_1TE8XiK0PFZazC04uv6s7DrS": "pro",
  "price_1TE8PQK0PFZazC04abx7OiHr": "business",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
    return new Response("Server configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: (err as Error).message });
    return new Response("Invalid signature", { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!userId) {
      logStep("No client_reference_id found, skipping");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    logStep("Processing checkout", { userId, customerId, subscriptionId });

    // Fetch the subscription to get the price/plan
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;
    const plan = PRICE_TO_PLAN[priceId] || "basic";
    const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();

    logStep("Plan determined", { plan, priceId, expiresAt });

    // Update subscriptions table
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({
        plan,
        status: "active",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (subError) {
      logStep("Error updating subscriptions", { error: subError.message });
    } else {
      logStep("Subscription updated successfully");
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const isActive = subscription.status === "active";

    // Find user by stripe_customer_id
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .limit(1)
      .single();

    if (subData?.user_id) {
      let plan = "basic";
      let expiresAt: string | null = null;

      if (isActive) {
        const priceId = subscription.items.data[0].price.id;
        plan = PRICE_TO_PLAN[priceId] || "basic";
        expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
      }

      const status = isActive ? "active" : (subscription.status === "canceled" ? "canceled" : "inactive");

      await supabase
        .from("subscriptions")
        .update({
          plan,
          status,
          stripe_subscription_id: subscription.id,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", subData.user_id);

      logStep("Subscription lifecycle updated", { userId: subData.user_id, plan, status });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
