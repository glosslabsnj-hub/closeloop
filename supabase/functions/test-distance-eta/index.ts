/**
 * test-distance-eta: Dry-run endpoint for distance ETA computation
 *
 * Protected by x-closeloop-secret - for internal testing only.
 * Does not create bookings or affect any data.
 *
 * Request body:
 * - tenant_id: UUID of the tenant to test
 * - destination_address: Address to compute distance to
 *
 * Returns the full DistanceEtaResult for verification.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireInternalSecret, serviceClient } from "../_shared/tenant.ts";
import { computeDistanceEta } from "../_shared/distance_eta.ts";

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
    // SECURITY: Require internal secret - this is a test/debug endpoint
    requireInternalSecret(req);

    const body = await req.json();
    const { tenant_id, tenantId, destination_address } = body;

    const resolvedTenantId = tenant_id ?? tenantId;

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

    const supabase = serviceClient();

    // Verify tenant exists (basic validation)
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, address")
      .eq("id", resolvedTenantId)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch distance settings for debugging
    const { data: settings } = await supabase
      .from("tenant_distance_settings")
      .select("*")
      .eq("tenant_id", resolvedTenantId)
      .maybeSingle();

    // Compute distance ETA
    const result = await computeDistanceEta({
      supabase,
      tenantId: resolvedTenantId,
      destinationAddress: destination_address,
    });

    return new Response(
      JSON.stringify({
        test_mode: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          base_address: tenant.address ? "[CONFIGURED]" : "[NOT SET]",
        },
        settings: settings
          ? {
              distance_provider_enabled: settings.distance_provider_enabled,
              provider: settings.provider,
              base_lat: settings.base_lat ? "[CONFIGURED]" : null,
              base_lng: settings.base_lng ? "[CONFIGURED]" : null,
              mapbox_route_profile: settings.mapbox_route_profile,
              eta_base_minutes: settings.eta_base_minutes,
              eta_per_mile_minutes: settings.eta_per_mile_minutes,
              eta_min_minutes: settings.eta_min_minutes,
              eta_max_minutes: settings.eta_max_minutes,
              eta_rounding_minutes: settings.eta_rounding_minutes,
            }
          : null,
        destination_provided: "[ADDRESS PROVIDED]",
        result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in test-distance-eta:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
