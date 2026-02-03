/**
 * elevenlabs-check-service-area: ElevenLabs tool endpoint for real-time
 * service area verification and ETA calculation.
 * 
 * Called by ElevenLabs agent during voice calls when it needs to:
 * 1. Verify if an address is within the tenant's service area
 * 2. Get real-time ETA based on traffic conditions
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ElevenLabsToolRequest {
  address?: string;
  adress?: string;  // Handle common typo in tool config
  // Tenant identification - preferred method
  tenant_id?: string;
  tenantId?: string;
  // ElevenLabs may pass conversation context in various formats
  conversation_id?: string;
  conversationId?: string;
  call_id?: string;
  agent_id?: string;
  // Some implementations nest params
  params?: {
    address?: string;
    adress?: string;
    tenant_id?: string;
  };
}

interface ServiceAreaResponse {
  in_area: boolean;
  distance_miles: number | null;
  eta_minutes: number | null;
  eta_range: string;
  message: string;
  // Pricing guidance based on distance
  service_tier: "local" | "long_distance" | "out_of_area";
  pricing_note: string;
  local_radius_miles: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Log full request body to understand what ElevenLabs sends
    console.log(`[check-service-area] Full request body:`, JSON.stringify(body));
    
    // Handle different request formats - ElevenLabs may nest parameters or have typos
    // Note: ElevenLabs tool config may have "adress" typo - handle both spellings
    const address = body.address || body.adress || body.params?.address || body.params?.adress || "";
    const conversationId = body.conversation_id || body.call_id || body.conversationId || "";
    // Direct tenant_id is the most reliable method
    const directTenantId = body.tenant_id || body.tenantId || body.params?.tenant_id || "";

    console.log(`[check-service-area] Parsed: tenant_id=${directTenantId || 'NONE'}, conversation_id=${conversationId || 'NONE'}, address="${(address || '').substring(0, 40)}..."`);

    if (!address) {
      return new Response(
        JSON.stringify({
          in_area: false,
          distance_miles: null,
          eta_minutes: null,
          eta_range: "",
          message: "No address provided",
          service_tier: "out_of_area",
          pricing_note: "No address provided - cannot determine pricing tier.",
          local_radius_miles: 10
        } as ServiceAreaResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get tenant_id - prefer direct parameter, then conversation lookup
    let tenantId: string | null = directTenantId || null;
    let resolutionMethod = directTenantId ? "direct_param" : "none";
    
    // Fallback to conversation lookup if no direct tenant_id
    if (!tenantId && conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      
      if (session?.tenant_id) {
        tenantId = session.tenant_id;
        resolutionMethod = "conversation_id";
      }
    }

    // Fallback 1: most recent active session (ended_at is null)
    if (!tenantId) {
      const { data: recentSession } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id")
        .is("ended_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (recentSession?.tenant_id) {
        tenantId = recentSession.tenant_id;
        resolutionMethod = "active_session";
      }
    }

    // Fallback 2: most recent session created in last 5 minutes (even if ended)
    if (!tenantId) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentSession } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id")
        .gte("created_at", fiveMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (recentSession?.tenant_id) {
        tenantId = recentSession.tenant_id;
        resolutionMethod = "recent_session_5min";
      }
    }

    console.log(`[check-service-area] Tenant resolution: method=${resolutionMethod}, tenant_id=${tenantId || 'NONE'}`);

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          in_area: true, // Default to accepting if we can't verify
          distance_miles: null,
          eta_minutes: null,
          eta_range: "30-60 minutes",
          message: "Unable to verify - defaulting to in-area",
          service_tier: "long_distance",
          pricing_note: "Unable to verify tenant - treat as long distance, collect details for pricing.",
          local_radius_miles: 10
        } as ServiceAreaResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant settings
    const [tenantResult, distanceSettingsResult] = await Promise.all([
      supabase.from("tenants").select("service_area_json").eq("id", tenantId).single(),
      supabase.from("tenant_distance_settings").select("*").eq("tenant_id", tenantId).maybeSingle()
    ]);

    const serviceArea = tenantResult.data?.service_area_json as Record<string, unknown> | null;
    const distanceSettings = distanceSettingsResult.data;

    // If no distance settings or provider disabled, use fallback
    if (!distanceSettings?.distance_provider_enabled) {
      const radiusMiles = (serviceArea?.radius_miles as number) || (serviceArea?.miles as number) || 50;
      return new Response(
        JSON.stringify({
          in_area: true, // Can't verify, assume in-area
          distance_miles: null,
          eta_minutes: distanceSettings?.eta_base_minutes || 45,
          eta_range: `${distanceSettings?.eta_min_minutes || 30}-${distanceSettings?.eta_max_minutes || 60} minutes`,
          message: `Within our ${radiusMiles}-mile service area`,
          service_tier: "long_distance",
          pricing_note: "Distance calculation unavailable - treat as long distance, collect details for pricing.",
          local_radius_miles: 10
        } as ServiceAreaResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call compute-distance-eta to get real distance and ETA
    const internalSecret = Deno.env.get("CLOSELOOP_INTERNAL_SECRET");
    const computeEtaUrl = `${supabaseUrl}/functions/v1/compute-distance-eta`;
    
    const etaResponse = await fetch(computeEtaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-closeloop-secret": internalSecret || "",
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        address_text: address,
        intent: "dispatch"
      })
    });

    const etaData = await etaResponse.json();

    // Check if within service area radius
    // Handle various service_area_json structures (can be nested or flat)
    const radiusMiles = (
      (serviceArea?.radius_miles as number) ||
      (serviceArea?.miles as number) ||
      ((serviceArea as Record<string, unknown>)?.radius_miles as number) ||
      100 // Default to 100 miles if not configured
    );
    const distanceMiles = etaData.route_distance_miles as number | null;
    const inArea = distanceMiles !== null ? distanceMiles <= radiusMiles : true;
    
    // Local radius for pricing tiers (matches "Local Tow (0-10 miles)" service)
    const localRadiusMiles = 10;
    
    // Determine service tier and pricing note based on distance
    let serviceTier: "local" | "long_distance" | "out_of_area";
    let pricingNote: string;
    
    if (!inArea) {
      serviceTier = "out_of_area";
      pricingNote = "Customer is outside service area. Use out_of_area_message.";
    } else if (distanceMiles !== null && distanceMiles <= localRadiusMiles) {
      serviceTier = "local";
      pricingNote = `Within ${localRadiusMiles} miles. Quote Local Tow pricing ($85).`;
    } else {
      serviceTier = "long_distance";
      pricingNote = distanceMiles 
        ? `${distanceMiles.toFixed(0)} miles - this is a Long Distance Tow. Quote varies by distance - collect details and confirm pricing.`
        : "Distance unknown - treat as Long Distance Tow. Collect details for pricing.";
    }
    
    // Build message
    let message = "";
    if (inArea) {
      message = `Within service area - ${distanceMiles?.toFixed(1) || "?"} miles from base`;
    } else {
      message = `Outside ${radiusMiles}-mile service area (${distanceMiles?.toFixed(1)} miles away)`;
    }

    const response: ServiceAreaResponse = {
      in_area: inArea,
      distance_miles: distanceMiles,
      eta_minutes: etaData.eta_minutes_estimate,
      eta_range: etaData.eta_range_minutes || `${distanceSettings.eta_min_minutes || 30}-${distanceSettings.eta_max_minutes || 60} minutes`,
      message,
      service_tier: serviceTier,
      pricing_note: pricingNote,
      local_radius_miles: localRadiusMiles
    };

    // Log for debugging (no PII - truncate address)
    console.log(`[check-service-area] tenant=${tenantId.substring(0, 8)}... address="${address.substring(0, 30)}..." in_area=${inArea} distance=${distanceMiles?.toFixed(1)}mi eta=${etaData.eta_minutes_estimate}min`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[check-service-area] Error:", error);
    return new Response(
      JSON.stringify({
        in_area: true, // Default to accepting on error
        distance_miles: null,
        eta_minutes: 45,
        eta_range: "30-60 minutes",
        message: "Verification unavailable - proceeding with dispatch",
        service_tier: "long_distance",
        pricing_note: "Verification failed - treat as long distance, collect details for pricing.",
        local_radius_miles: 10
      } as ServiceAreaResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
