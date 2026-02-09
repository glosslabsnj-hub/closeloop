/**
 * top-up-credits: Create Stripe Checkout session for purchasing credits
 *
 * SECURITY:
 * - Requires Authorization Bearer JWT with valid tenant membership
 *
 * Request body:
 * - tenant_id: UUID of the tenant
 * - amount_cents: Amount to top up in cents (e.g., 2000 for $20)
 * - success_url: URL to redirect after successful payment
 * - cancel_url: URL to redirect if user cancels
 *
 * Returns:
 * - checkout_url: Stripe Checkout URL to redirect user to
 * - session_id: Stripe Checkout Session ID
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Predefined top-up amounts for consistency
const TOP_UP_AMOUNTS = [
  { cents: 1000, label: "$10" },
  { cents: 2000, label: "$20" },
  { cents: 5000, label: "$50" },
  { cents: 10000, label: "$100" },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const body = await req.json();
    const { tenant_id, amount_cents, success_url, cancel_url } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!amount_cents || amount_cents < 100) {
      return new Response(
        JSON.stringify({ error: "amount_cents must be at least 100 ($1.00)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: "success_url and cancel_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate tenant membership via JWT
    const { tenantId: validatedTenantId, userId } = await requireAuthedTenant(req, tenant_id);

    const supabase = serviceClient();

    // Fetch subscription to get Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("tenant_id", validatedTenantId)
      .maybeSingle();

    if (subError) {
      throw new Error(`Failed to fetch subscription: ${subError.message}`);
    }

    // Fetch tenant name for description
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", validatedTenantId)
      .maybeSingle();

    const tenantName = tenant?.name || "CloseLoop";

    // Create Stripe Checkout Session
    const checkoutParams = new URLSearchParams({
      "mode": "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": amount_cents.toString(),
      "line_items[0][price_data][product_data][name]": "CloseLoop Usage Credits",
      "line_items[0][price_data][product_data][description]": `Top-up credits for ${tenantName}`,
      "line_items[0][quantity]": "1",
      "success_url": success_url,
      "cancel_url": cancel_url,
      "metadata[tenant_id]": validatedTenantId,
      "metadata[user_id]": userId,
      "metadata[credit_amount_cents]": amount_cents.toString(),
      "metadata[type]": "credit_top_up",
    });

    // If we have a Stripe customer ID, attach to the session
    if (subscription?.stripe_customer_id) {
      checkoutParams.set("customer", subscription.stripe_customer_id);
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: checkoutParams.toString(),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error("[top-up-credits] Stripe error:", errorText);
      throw new Error("Failed to create Stripe checkout session");
    }

    const checkoutSession = await stripeResponse.json();

    console.log(`[top-up-credits] Created checkout session for tenant ${validatedTenantId.substring(0, 8)}...: ${amount_cents} cents`);

    return new Response(
      JSON.stringify({
        checkout_url: checkoutSession.url,
        session_id: checkoutSession.id,
        amount_cents,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[top-up-credits] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    const status = message.includes("Forbidden") || message.includes("Missing Authorization")
      ? 403
      : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
