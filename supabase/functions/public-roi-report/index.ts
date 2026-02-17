/**
 * public-roi-report
 *
 * Returns sanitized ROI data for a public shareable report.
 * No auth required -- access gated by share_token validated against tenant_revenue_settings.
 * Uses serviceClient for all queries (no user JWT).
 * NO PII is returned (no customer names, phones, emails).
 */

import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    // Accept params from GET query string or POST body
    let tenantId: string | null = null;
    let shareToken: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      tenantId = url.searchParams.get("tenant_id");
      shareToken = url.searchParams.get("share_token");
    } else {
      const body = await req.json().catch(() => ({}));
      tenantId = body.tenant_id ?? null;
      shareToken = body.share_token ?? null;
    }

    if (!tenantId || !shareToken) {
      return errorResponse("Missing tenant_id or share_token", 400);
    }

    const svc = serviceClient();

    // Validate share_token against tenant_revenue_settings
    const { data: revSettings, error: revErr } = await svc
      .from("tenant_revenue_settings")
      .select("id, share_token")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (revErr) {
      console.error("[public-roi-report] revenue settings lookup error:", revErr);
      return errorResponse("Failed to validate share link", 500);
    }

    if (!revSettings || revSettings.share_token !== shareToken) {
      return errorResponse("Invalid or expired share link", 403);
    }

    // Fetch tenant name and business_mode (no sensitive data)
    const { data: tenant, error: tenantErr } = await svc
      .from("tenants")
      .select("id, business_name, business_mode")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantErr || !tenant) {
      console.error("[public-roi-report] tenant lookup error:", tenantErr);
      return errorResponse("Tenant not found", 404);
    }

    // Aggregate ROI data -- NO PII

    // Total calls handled
    const { count: totalCalls } = await svc
      .from("ai_call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    // Bookings created
    const { count: totalBookings } = await svc
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    // Dispatch jobs created
    const { count: totalDispatchJobs } = await svc
      .from("dispatch_jobs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    // Food orders created
    const { count: totalFoodOrders } = await svc
      .from("food_orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    // Revenue attributed (sum)
    const { data: revenueRows } = await svc
      .from("revenue_attributions")
      .select("revenue_cents")
      .eq("tenant_id", tenantId);

    const totalRevenueCents = (revenueRows ?? []).reduce(
      (sum, r) => sum + (r.revenue_cents ?? 0),
      0
    );

    // Conversion rate: sessions with outcome='booked' / total sessions
    const { count: bookedCount } = await svc
      .from("ai_call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("outcome", "booked");

    const totalCallsNum = totalCalls ?? 0;
    const bookedNum = bookedCount ?? 0;
    const conversionRate =
      totalCallsNum > 0
        ? Math.round((bookedNum / totalCallsNum) * 10000) / 10000
        : 0;

    const totalEntitiesCreated =
      (totalBookings ?? 0) + (totalDispatchJobs ?? 0) + (totalFoodOrders ?? 0);

    return jsonResponse({
      tenant_name: tenant.business_name,
      business_mode: tenant.business_mode,
      total_calls_handled: totalCallsNum,
      entities_created: {
        bookings: totalBookings ?? 0,
        dispatch_jobs: totalDispatchJobs ?? 0,
        food_orders: totalFoodOrders ?? 0,
        total: totalEntitiesCreated,
      },
      total_revenue_attributed_cents: totalRevenueCents,
      conversion_rate: conversionRate,
    });
  } catch (err) {
    console.error("[public-roi-report] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});
