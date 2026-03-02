/**
 * create-billing-portal-session: Creates a Stripe Customer Billing Portal session
 *
 * Allows customers to manage their subscription, update payment methods,
 * view invoices, and cancel/downgrade from Stripe's hosted portal.
 *
 * SECURITY:
 * - Requires Authorization Bearer JWT with valid tenant membership
 *
 * INPUT: { tenant_id?: string, return_url?: string }
 * OUTPUT: { url: string }
 */
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return errorResponse("Stripe not configured", 500);
    }

    const body = await req.json().catch(() => ({}));
    const { tenant_id: requestedTenantId, return_url: requestedReturnUrl } = body;

    const { tenantId } = await requireAuthedTenant(req, requestedTenantId);

    const supabase = serviceClient();

    // Fetch Stripe customer ID from subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const stripeCustomerId = subscription?.stripe_customer_id;

    if (!stripeCustomerId) {
      return errorResponse(
        "No Stripe customer found. Please subscribe to a plan first.",
        404,
      );
    }

    // Determine return URL
    const origin = req.headers.get("origin")
      || req.headers.get("referer")?.replace(/\/[^/]*$/, "")
      || "https://app.getfluxdata.com";

    const returnUrl = requestedReturnUrl || `${origin}/app/usage`;

    // Create Stripe Billing Portal session
    const portalRes = await fetch(
      "https://api.stripe.com/v1/billing_portal/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          customer: stripeCustomerId,
          return_url: returnUrl,
        }).toString(),
      },
    );

    if (!portalRes.ok) {
      const err = await portalRes.text();
      console.error("Stripe billing portal creation failed:", err);

      // Check for common error: no portal configuration
      if (err.includes("configuration")) {
        return errorResponse(
          "Stripe Customer Portal not configured. Please set up a portal configuration in the Stripe Dashboard.",
          500,
        );
      }

      return errorResponse("Failed to create billing portal session", 500);
    }

    const session = await portalRes.json();

    return jsonResponse({ url: session.url });
  } catch (err) {
    console.error("create-billing-portal-session error:", err);
    if (
      err instanceof Error &&
      (err.message === "Unauthorized" || err.message.includes("Forbidden"))
    ) {
      return errorResponse(err.message, 401);
    }
    return errorResponse("Internal error", 500);
  }
});
