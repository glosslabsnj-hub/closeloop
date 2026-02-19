/**
 * create-payment-link
 *
 * Generates a Stripe Checkout URL that an agency can share with a client.
 * The client can click the link without CloseLoop auth to pay for their plan.
 *
 * Auth: JWT + requireAuthedTenant (agency user must have membership on the client tenant)
 * Input: { tenant_id, plan_sku }
 * Returns: { checkout_url, expires_at }
 */

import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

const TRIAL_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return errorResponse("Stripe not configured", 500);
    }

    const { tenant_id: requestedTenantId, plan_sku } = await req.json();

    if (!requestedTenantId) {
      return errorResponse("Missing tenant_id");
    }
    if (!plan_sku) {
      return errorResponse("Missing plan_sku");
    }

    const { tenantId } = await requireAuthedTenant(req, requestedTenantId);

    const supabase = serviceClient();

    // Get or create Stripe customer
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    let stripeCustomerId = subscription?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Get user email for Stripe customer (tenant owner)
      const { data: tenantUsers } = await supabase
        .from("tenant_users")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("role", "owner")
        .limit(1);

      let email = "";
      if (tenantUsers?.[0]?.user_id) {
        const { data: userData } = await supabase.auth.admin.getUserById(tenantUsers[0].user_id);
        email = userData?.user?.email || "";
      }

      // Create Stripe customer
      const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          ...(email ? { email } : {}),
          "metadata[tenant_id]": tenantId,
          ...(tenant?.name ? { name: tenant.name } : {}),
        }).toString(),
      });

      if (!customerRes.ok) {
        const err = await customerRes.text();
        console.error("Stripe customer creation failed:", err);
        return errorResponse("Failed to create Stripe customer", 500);
      }

      const customer = await customerRes.json();
      stripeCustomerId = customer.id;

      // Store customer ID
      await supabase
        .from("subscriptions")
        .upsert({
          tenant_id: tenantId,
          stripe_customer_id: stripeCustomerId,
          plan_code: plan_sku,
          status: "incomplete",
        }, { onConflict: "tenant_id" });
    }

    // Look up Stripe price ID for the plan SKU
    const priceSearchRes = await fetch(
      `https://api.stripe.com/v1/prices/search?query=metadata['plan_code']:'${plan_sku}' AND active:'true'`,
      {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      }
    );

    let stripePriceId: string | null = null;
    if (priceSearchRes.ok) {
      const priceData = await priceSearchRes.json();
      stripePriceId = priceData.data?.[0]?.id || null;
    }

    if (!stripePriceId) {
      console.error(`No Stripe price found for plan_sku: ${plan_sku}`);
      return errorResponse(`No Stripe price configured for plan: ${plan_sku}`, 400);
    }

    // Determine origin for redirect URLs
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "https://app.voxly.ai";

    // Create Checkout Session with trial (shareable link — no auth required to visit)
    const sessionParams = new URLSearchParams({
      "mode": "subscription",
      "customer": stripeCustomerId!,
      "line_items[0][price]": stripePriceId,
      "line_items[0][quantity]": "1",
      "subscription_data[trial_period_days]": String(TRIAL_DAYS),
      "subscription_data[metadata][tenant_id]": tenantId,
      "subscription_data[metadata][plan_code]": plan_sku,
      "subscription_data[metadata][agency_initiated]": "true",
      "payment_method_collection": "always",
      "success_url": `${origin}/app/dashboard?tenant=${tenantId}&activated=true`,
      "cancel_url": `${origin}/app/agency`,
    });

    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: sessionParams.toString(),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      console.error("Stripe session creation failed:", err);
      return errorResponse("Failed to create checkout session", 500);
    }

    const session = await sessionRes.json();

    return jsonResponse({
      checkout_url: session.url,
      expires_at: new Date(session.expires_at * 1000).toISOString(),
    });
  } catch (err) {
    console.error("create-payment-link error:", err);
    if (err instanceof Error && (err.message === "Unauthorized" || err.message.includes("Forbidden"))) {
      return errorResponse(err.message, 401);
    }
    return errorResponse("Internal error", 500);
  }
});
