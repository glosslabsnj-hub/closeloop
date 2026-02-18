/**
 * get-agency-metrics
 *
 * Returns aggregated metrics across all agency-managed tenants.
 * Auth: JWT via requireAuthedTenant, then agency_accounts lookup.
 * Uses serviceClient for cross-tenant queries (bypasses RLS).
 */

import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    // Auth: only need user identity, not tenant membership
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Unauthorized", 401);

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: userRes, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userRes?.user?.id) return errorResponse("Unauthorized", 401);

    const userId = userRes.user.id;

    const svc = serviceClient();

    // Look up agency_accounts where user_id matches the authed user
    const { data: agency, error: agencyErr } = await svc
      .from("agency_accounts")
      .select("id, agency_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (agencyErr) {
      console.error("[get-agency-metrics] agency lookup error:", agencyErr);
      return errorResponse("Failed to look up agency account", 500);
    }

    if (!agency) {
      return errorResponse("No agency account found", 403);
    }

    // Fetch all agency_tenants for this agency
    const { data: agencyTenants, error: tenantsErr } = await svc
      .from("agency_tenants")
      .select("tenant_id, status, provisioned_at, notes")
      .eq("agency_id", agency.id);

    if (tenantsErr) {
      console.error("[get-agency-metrics] agency_tenants lookup error:", tenantsErr);
      return errorResponse("Failed to fetch managed tenants", 500);
    }

    const managedTenants = agencyTenants ?? [];
    const activeTenants = managedTenants.filter((t) => t.status === "active");
    const tenantIds = activeTenants.map((t) => t.tenant_id);

    if (tenantIds.length === 0) {
      return jsonResponse({
        agency_id: agency.id,
        agency_name: agency.agency_name,
        total_clients: 0,
        total_calls_30d: 0,
        total_revenue_30d_cents: 0,
        conversion_rate: 0,
        per_tenant: [],
      });
    }

    // Calculate 30-day window
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch tenant names
    const { data: tenants } = await svc
      .from("tenants")
      .select("id, name")
      .in("id", tenantIds);

    const tenantNameMap: Record<string, string> = {};
    for (const t of tenants ?? []) {
      tenantNameMap[t.id] = t.name ?? "Unknown";
    }

    // Fetch call sessions (last 30d) for all managed tenants
    const { data: sessions30d } = await svc
      .from("ai_call_sessions")
      .select("id, tenant_id, outcome")
      .in("tenant_id", tenantIds)
      .gte("started_at", thirtyDaysAgo);

    const sessionsList = sessions30d ?? [];

    // Fetch revenue attributions (last 30d) for all managed tenants
    const { data: revenues30d } = await svc
      .from("revenue_attributions")
      .select("tenant_id, revenue_cents")
      .in("tenant_id", tenantIds)
      .gte("created_at", thirtyDaysAgo);

    const revenuesList = revenues30d ?? [];

    // Aggregate per-tenant
    const perTenant: Array<{
      tenant_id: string;
      tenant_name: string;
      calls_30d: number;
      revenue_30d_cents: number;
      conversion_rate: number;
      status: string;
    }> = [];

    let totalCalls30d = 0;
    let totalRevenue30dCents = 0;
    let totalBooked30d = 0;

    for (const at of activeTenants) {
      const tid = at.tenant_id;

      const tenantSessions = sessionsList.filter((s) => s.tenant_id === tid);
      const tenantRevenues = revenuesList.filter((r) => r.tenant_id === tid);

      const calls30d = tenantSessions.length;
      const booked30d = tenantSessions.filter((s) => s.outcome === "booked").length;
      const revenue30dCents = tenantRevenues.reduce(
        (sum, r) => sum + (r.revenue_cents ?? 0),
        0
      );

      totalCalls30d += calls30d;
      totalRevenue30dCents += revenue30dCents;
      totalBooked30d += booked30d;

      perTenant.push({
        tenant_id: tid,
        tenant_name: tenantNameMap[tid] ?? "Unknown",
        calls_30d: calls30d,
        revenue_30d_cents: revenue30dCents,
        conversion_rate: calls30d > 0 ? Math.round((booked30d / calls30d) * 10000) / 10000 : 0,
        status: at.status,
      });
    }

    return jsonResponse({
      agency_id: agency.id,
      agency_name: agency.agency_name,
      total_clients: activeTenants.length,
      total_calls_30d: totalCalls30d,
      total_revenue_30d_cents: totalRevenue30dCents,
      conversion_rate:
        totalCalls30d > 0
          ? Math.round((totalBooked30d / totalCalls30d) * 10000) / 10000
          : 0,
      per_tenant: perTenant,
    });
  } catch (err) {
    console.error("[get-agency-metrics] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message.includes("Unauthorized") || message.includes("bearer") ? 401 : 500;
    return errorResponse(message, status);
  }
});
