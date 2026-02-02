/**
 * distance-eta-test: Internal-only endpoint to test Mapbox distance/ETA computation
 *
 * SECURITY:
 * - Requires x-closeloop-secret header (internal secret)
 * - Requires Authorization Bearer JWT with valid tenant membership
 * - Never logs full destination addresses (PII)
 *
 * Request body:
 * - tenant_id: UUID of the tenant to test
 * - destination_address: Address string to compute ETA to
 *
 * Returns:
 * - Full TenantEtaResult including cache hit indicators
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireInternalSecret, requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";
import { computeTenantEta } from "../_shared/mapbox_distance.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Require internal secret header
    requireInternalSecret(req);

    // Parse request body
    const body = await req.json();
    const { tenant_id, tenantId, destination_address } = body;
    const resolvedTenantId = tenant_id ?? tenantId;

    // Validate required fields
    if (!resolvedTenantId) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!destination_address || typeof destination_address !== "string") {
      return new Response(
        JSON.stringify({ error: "destination_address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate tenant membership via JWT
    // This ensures the caller has legitimate access to this tenant
    const { tenantId: validatedTenantId } = await requireAuthedTenant(req, resolvedTenantId);

    // Use service client for cache writes (has write permissions)
    const supabase = serviceClient();

    // Log request (without full address for privacy)
    const addressPreview = destination_address.substring(0, 10) + "...";
    console.log(`[distance-eta-test] Testing ETA for tenant ${validatedTenantId.substring(0, 8)}... dest=${addressPreview}`);

    // Compute ETA using Mapbox utility
    const result = await computeTenantEta({
      supabase,
      tenantId: validatedTenantId,
      destinationText: destination_address,
    });

    // Build response with metadata
    const response = {
      test_mode: true,
      tenant_id: validatedTenantId,
      destination_provided: "[ADDRESS PROVIDED]",
      result: {
        ok: result.ok,
        distance_miles: result.distance_miles,
        drive_minutes: result.drive_minutes,
        eta_minutes: result.eta_minutes,
        provider_used: result.provider_used,
        used_cache_geocode: result.used_cache_geocode,
        used_cache_route: result.used_cache_route,
        max_distance_exceeded: result.max_distance_exceeded,
        error: result.error,
      },
      cache_status: {
        geocode_hit: result.used_cache_geocode,
        route_hit: result.used_cache_route,
      },
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[distance-eta-test] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Return appropriate status code based on error type
    const status = message.includes("Forbidden") || message.includes("Missing Authorization")
      ? 403
      : message.includes("not found")
      ? 404
      : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
