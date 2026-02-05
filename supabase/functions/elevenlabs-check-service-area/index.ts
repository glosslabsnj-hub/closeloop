/**
 * elevenlabs-check-service-area: ElevenLabs tool endpoint for real-time
 * service area verification, ETA calculation, and pricing.
 * 
 * Called by ElevenLabs agent during voice calls when it needs to:
 * 1. Verify if an address is within the tenant's service area
 * 2. Get real-time ETA based on traffic conditions
 * 3. Calculate accurate pricing based on pickup → dropoff distance
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
  // NEW: Dropoff address for tow distance calculation
  dropoff_address?: string;
  dropoff?: string;
  // Vehicle type for price modifiers
  vehicle_type?: string;
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
    dropoff_address?: string;
    dropoff?: string;
    vehicle_type?: string;
    tenant_id?: string;
  };
}

interface PriceBreakdown {
  base_price: number;
  distance_charge: number;
  distance_miles_charged: number;
  modifier_charges: { name: string; amount: number }[];
  total_estimate: number;
}

interface ServiceAreaResponse {
  in_area: boolean;
  distance_miles: number | null;           // Dispatch distance (base → pickup)
  tow_distance_miles: number | null;       // Tow distance (pickup → dropoff)
  dropoff_geocoded: string | null;         // Resolved dropoff address
  eta_minutes: number | null;
  eta_range: string;
  message: string;
  // Pricing guidance based on distance
  service_tier: "local" | "long_distance" | "out_of_area";
  pricing_note: string;
  local_radius_miles: number;
  distance_basis_used: string;             // Which distance was used for pricing
  price_breakdown: PriceBreakdown | null;  // Detailed price calculation
  // Geocoding quality indicators
  needs_verification: boolean;             // True if address was ambiguous
  verification_message: string | null;     // Prompt for caller if needs_verification
}

// Distance tier interface matching the frontend type
interface DistanceTier {
  min_miles: number;
  max_miles: number | null;
  base_price: number;
  per_mile_price?: number;
}

// Price modifier interface
interface PriceModifier {
  value: string;
  price_adjustment: number;
  adjustment_type: "fixed" | "percent";
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
    const address = body.address || body.adress || body.params?.address || body.params?.adress || "";
    const dropoffAddress = body.dropoff_address || body.dropoff || body.params?.dropoff_address || body.params?.dropoff || "";
    const vehicleType = body.vehicle_type || body.params?.vehicle_type || "";
    const conversationId = body.conversation_id || body.call_id || body.conversationId || "";
    const directTenantId = body.tenant_id || body.tenantId || body.params?.tenant_id || "";

    console.log(`[check-service-area] Parsed: tenant_id=${directTenantId || 'NONE'}, address="${(address || '').substring(0, 40)}...", dropoff="${(dropoffAddress || '').substring(0, 40)}..."`);

    if (!address) {
      return new Response(
        JSON.stringify({
          in_area: false,
          distance_miles: null,
          tow_distance_miles: null,
          dropoff_geocoded: null,
          eta_minutes: null,
          eta_range: "",
          message: "No address provided",
          service_tier: "out_of_area",
          pricing_note: "No address provided - cannot determine pricing tier.",
          local_radius_miles: 10,
          distance_basis_used: "none",
          price_breakdown: null
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
          in_area: true,
          distance_miles: null,
          tow_distance_miles: null,
          dropoff_geocoded: null,
          eta_minutes: null,
          eta_range: "30-60 minutes",
          message: "Unable to verify - defaulting to in-area",
          service_tier: "long_distance",
          pricing_note: "Unable to verify tenant - treat as long distance, collect details for pricing.",
          local_radius_miles: 10,
          distance_basis_used: "unknown",
          price_breakdown: null
        } as ServiceAreaResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant settings and towing services with pricing config
    const [tenantResult, distanceSettingsResult, towingServicesResult] = await Promise.all([
      supabase.from("tenants").select("service_area_json").eq("id", tenantId).single(),
      supabase.from("tenant_distance_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
      // Fetch towing services that may have distance-tiered pricing
      supabase.from("services")
        .select("id, name, pricing_config_json, service_category")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .or("name.ilike.%tow%,service_category.eq.towing")
        .limit(10)
    ]);

    const serviceArea = tenantResult.data?.service_area_json as Record<string, unknown> | null;
    const distanceSettings = distanceSettingsResult.data;
    const towingServices = towingServicesResult.data || [];

    // If no distance settings or provider disabled, use fallback
    if (!distanceSettings?.distance_provider_enabled) {
      const radiusMiles = (serviceArea?.radius_miles as number) || (serviceArea?.miles as number) || 50;
      return new Response(
        JSON.stringify({
          in_area: true,
          distance_miles: null,
          tow_distance_miles: null,
          dropoff_geocoded: null,
          eta_minutes: distanceSettings?.eta_base_minutes || 45,
          eta_range: `${distanceSettings?.eta_min_minutes || 30}-${distanceSettings?.eta_max_minutes || 60} minutes`,
          message: `Within our ${radiusMiles}-mile service area`,
          service_tier: "long_distance",
          pricing_note: "Distance calculation unavailable - treat as long distance, collect details for pricing.",
          local_radius_miles: 10,
          distance_basis_used: "unavailable",
          price_breakdown: null
        } as ServiceAreaResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const internalSecret = Deno.env.get("CLOSELOOP_INTERNAL_SECRET");
    const computeEtaUrl = `${supabaseUrl}/functions/v1/compute-distance-eta`;

    // OPTIMIZATION: Calculate dispatch and tow distance in PARALLEL instead of serially
    // This reduces latency by ~40-50% (from ~1200ms to ~600ms for the API calls)
    
    const dispatchRequest = fetch(computeEtaUrl, {
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

    // Only start tow distance request if dropoff address is provided
    const towRequest = dropoffAddress ? fetch(computeEtaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-closeloop-secret": internalSecret || "",
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        origin_address_text: address,      // Pickup as origin
        address_text: dropoffAddress,       // Dropoff as destination
        intent: "dispatch",
        skip_eta_settings: true             // Just need distance, not full ETA
      })
    }) : Promise.resolve(null);

    // Wait for both requests in parallel
    const [dispatchResponse, towResponse] = await Promise.all([dispatchRequest, towRequest]);
    
    const dispatchData = await dispatchResponse.json();
    const dispatchDistanceMiles = dispatchData.route_distance_miles as number | null;
    const dispatchNeedsVerification = dispatchData.needs_verification as boolean || false;
    const dispatchGeocodingConfidence = dispatchData.geocoding_confidence as string || "high";

    // Calculate tow distance (pickup → dropoff) if dropoff provided
    let towDistanceMiles: number | null = null;
    let dropoffGeocoded: string | null = null;
    let towNeedsVerification = false;

    if (towResponse) {
      const towData = await towResponse.json();
      towDistanceMiles = towData.route_distance_miles as number | null;
      dropoffGeocoded = towData.geocoded_place_name || null;
      towNeedsVerification = towData.needs_verification as boolean || false;
      
      console.log(`[check-service-area] Tow distance calculated: ${towDistanceMiles?.toFixed(1) || 'null'} miles`);
    }

    // Determine if verification is needed (geocoding was uncertain)
    const needsVerification = dispatchNeedsVerification || towNeedsVerification;
    let verificationMessage: string | null = null;
    
    if (needsVerification) {
      verificationMessage = "I couldn't pinpoint that exact location. Could you give me a cross street or nearby landmark?";
      console.log(`[check-service-area] Flagging for verification: dispatchConfidence=${dispatchGeocodingConfidence}, towNeedsVerification=${towNeedsVerification}`);
    }

    // Check if within service area radius (based on dispatch distance)
    const radiusMiles = (
      (serviceArea?.radius_miles as number) ||
      (serviceArea?.miles as number) ||
      ((serviceArea as Record<string, unknown>)?.radius_miles as number) ||
      100
    );
    const inArea = dispatchDistanceMiles !== null ? dispatchDistanceMiles <= radiusMiles : true;
    
    // Local radius for pricing tiers
    const localRadiusMiles = 10;
    
    // Find the appropriate towing service to use for pricing
    const primaryTowService = towingServices.find(s => 
      s.name.toLowerCase().includes("local") && s.name.toLowerCase().includes("tow")
    ) || towingServices.find(s => 
      s.name.toLowerCase().includes("tow")
    ) || towingServices[0];

    // Determine which distance to use for pricing based on service config
    const pricingConfig = primaryTowService?.pricing_config_json as Record<string, unknown> | null;
    const distanceBasis = (pricingConfig?.distance_basis as string) || "tow_distance";
    
    let pricingDistanceMiles: number | null;
    let distanceBasisUsed: string;
    
    if (distanceBasis === "dispatch_distance") {
      pricingDistanceMiles = dispatchDistanceMiles;
      distanceBasisUsed = "dispatch_distance";
    } else if (distanceBasis === "total_trip") {
      pricingDistanceMiles = (dispatchDistanceMiles || 0) + (towDistanceMiles || 0);
      distanceBasisUsed = "total_trip";
    } else {
      // Default: tow_distance - use tow distance if available, else dispatch
      pricingDistanceMiles = towDistanceMiles ?? dispatchDistanceMiles;
      distanceBasisUsed = towDistanceMiles !== null ? "tow_distance" : "dispatch_distance";
    }

    // Determine service tier based on pricing distance
    let serviceTier: "local" | "long_distance" | "out_of_area" = "long_distance";
    let pricingNote: string = "Collect details for pricing.";
    let priceBreakdown: PriceBreakdown | null = null;
    
    if (!inArea) {
      serviceTier = "out_of_area";
      pricingNote = "Customer is outside service area. Use out_of_area_message.";
    } else if (pricingDistanceMiles !== null && pricingDistanceMiles <= localRadiusMiles) {
      serviceTier = "local";
      
      // Calculate local tow pricing
      const localService = towingServices.find(s => 
        s.name.toLowerCase().includes("local") && s.name.toLowerCase().includes("tow")
      );
      
      if (localService?.pricing_config_json) {
        const config = localService.pricing_config_json as Record<string, unknown>;
        const minPrice = Number(config.min_price) || 85;
        
        // Apply vehicle modifier if provided
        let modifierCharges: { name: string; amount: number }[] = [];
        let modifierTotal = 0;
        
        if (vehicleType && config.variables && Array.isArray(config.variables)) {
          for (const variable of config.variables as Array<Record<string, unknown>>) {
            if (variable.key === "vehicle_type" && Array.isArray(variable.modifiers)) {
              const modifier = (variable.modifiers as PriceModifier[]).find(
                m => m.value.toLowerCase() === vehicleType.toLowerCase()
              );
              if (modifier) {
                const adjustment = modifier.adjustment_type === "percent" 
                  ? minPrice * (modifier.price_adjustment / 100)
                  : modifier.price_adjustment;
                modifierTotal += adjustment;
                modifierCharges.push({ 
                  name: `Vehicle: ${vehicleType}`, 
                  amount: adjustment 
                });
              }
            }
          }
        }
        
        const total = minPrice + modifierTotal;
        priceBreakdown = {
          base_price: minPrice,
          distance_charge: 0,
          distance_miles_charged: pricingDistanceMiles,
          modifier_charges: modifierCharges,
          total_estimate: total
        };
        
        pricingNote = modifierCharges.length > 0
          ? `Local Tow (${pricingDistanceMiles.toFixed(0)} mi): $${minPrice} + ${modifierCharges.map(m => `$${m.amount} ${m.name}`).join(", ")} = $${total.toFixed(0)}`
          : `Local Tow (${pricingDistanceMiles.toFixed(0)} mi): $${minPrice}`;
      } else {
        pricingNote = `Within ${localRadiusMiles} miles. Quote Local Tow pricing ($85).`;
      }
    } else {
      serviceTier = "long_distance";
      
      // Find Long Distance Tow service and build dynamic pricing
      const longDistanceService = towingServices.find(s => 
        s.name.toLowerCase().includes("long distance") || 
        s.name.toLowerCase().includes("long-distance")
      ) || primaryTowService;
      
      if (longDistanceService?.pricing_config_json && pricingDistanceMiles !== null) {
        const config = longDistanceService.pricing_config_json as Record<string, unknown>;
        const pricingModel = (config.model || config.pricing_model) as string;
        
        if (pricingModel === "distance_tiered" && Array.isArray(config.distance_tiers)) {
          const tiers = config.distance_tiers as DistanceTier[];
          
          // Find applicable tier
          for (const tier of tiers) {
            const minMiles = Number(tier.min_miles) || 0;
            const maxMiles = tier.max_miles != null ? Number(tier.max_miles) : Infinity;
            const basePrice = Number(tier.base_price) || 0;
            const perMilePrice = tier.per_mile_price != null ? Number(tier.per_mile_price) : 0;
            
            if (pricingDistanceMiles >= minMiles && pricingDistanceMiles <= maxMiles) {
              const extraMiles = Math.max(0, pricingDistanceMiles - minMiles);
              const distanceCharge = extraMiles * perMilePrice;
              let baseTotal = basePrice + distanceCharge;
              
              // Apply vehicle modifier if provided
              let modifierCharges: { name: string; amount: number }[] = [];
              let modifierTotal = 0;
              
              if (vehicleType && config.variables && Array.isArray(config.variables)) {
                for (const variable of config.variables as Array<Record<string, unknown>>) {
                  if (variable.key === "vehicle_type" && Array.isArray(variable.modifiers)) {
                    const modifier = (variable.modifiers as PriceModifier[]).find(
                      m => m.value.toLowerCase() === vehicleType.toLowerCase()
                    );
                    if (modifier) {
                      const adjustment = modifier.adjustment_type === "percent" 
                        ? baseTotal * (modifier.price_adjustment / 100)
                        : modifier.price_adjustment;
                      modifierTotal += adjustment;
                      modifierCharges.push({ 
                        name: `Vehicle: ${vehicleType}`, 
                        amount: adjustment 
                      });
                    }
                  }
                }
              }
              
              const total = baseTotal + modifierTotal;
              priceBreakdown = {
                base_price: basePrice,
                distance_charge: distanceCharge,
                distance_miles_charged: pricingDistanceMiles,
                modifier_charges: modifierCharges,
                total_estimate: total
              };
              
              if (perMilePrice > 0 && extraMiles > 0) {
                pricingNote = `${pricingDistanceMiles.toFixed(0)}-mile tow: $${basePrice} base + $${distanceCharge.toFixed(2)} (${extraMiles.toFixed(0)} mi × $${perMilePrice}/mi)`;
                if (modifierCharges.length > 0) {
                  pricingNote += ` + ${modifierCharges.map(m => `$${m.amount} ${m.name}`).join(", ")}`;
                }
                pricingNote += ` = $${total.toFixed(0)}`;
              } else {
                pricingNote = `${pricingDistanceMiles.toFixed(0)}-mile tow: $${basePrice} base`;
                if (modifierCharges.length > 0) {
                  pricingNote += ` + ${modifierCharges.map(m => `$${m.amount} ${m.name}`).join(", ")} = $${total.toFixed(0)}`;
                }
              }
              break;
            }
          }
          
          // Fallback if no tier matched
          if (!priceBreakdown) {
            pricingNote = `${pricingDistanceMiles.toFixed(0)} miles - Long Distance Tow. Collect details for pricing.`;
          }
        } else {
          pricingNote = pricingDistanceMiles 
            ? `${pricingDistanceMiles.toFixed(0)} miles - Long Distance Tow applies. Collect details for pricing.`
            : "Distance unknown - treat as Long Distance Tow. Collect details for pricing.";
        }
      } else {
        pricingNote = pricingDistanceMiles 
          ? `${pricingDistanceMiles.toFixed(0)} miles - this is a Long Distance Tow. Quote varies by distance - collect details and confirm pricing.`
          : "Distance unknown - treat as Long Distance Tow. Collect details for pricing.";
      }
    }
    
    // Build message - include verification prompt if needed
    let message = "";
    if (needsVerification) {
      // For ambiguous addresses, still try to serve but flag for verification
      message = verificationMessage || "Address needs verification";
    } else if (inArea) {
      if (towDistanceMiles !== null) {
        message = `Dispatch: ${dispatchDistanceMiles?.toFixed(1) || "?"} mi to pickup, Tow: ${towDistanceMiles.toFixed(1)} mi to dropoff`;
      } else {
        message = `Within service area - ${dispatchDistanceMiles?.toFixed(1) || "?"} miles from base`;
      }
    } else {
      message = `Outside ${radiusMiles}-mile service area (${dispatchDistanceMiles?.toFixed(1)} miles away)`;
    }

    const response: ServiceAreaResponse = {
      // If geocoding is uncertain, default to in_area to avoid false rejections
      in_area: needsVerification ? true : inArea,
      distance_miles: dispatchDistanceMiles,
      tow_distance_miles: towDistanceMiles,
      dropoff_geocoded: dropoffGeocoded,
      eta_minutes: dispatchData.eta_minutes_estimate,
      eta_range: dispatchData.eta_range_minutes || `${distanceSettings.eta_min_minutes || 30}-${distanceSettings.eta_max_minutes || 60} minutes`,
      message,
      service_tier: needsVerification ? "long_distance" : serviceTier,
      pricing_note: needsVerification 
        ? "Address is approximate - collect details and verify exact location before quoting."
        : pricingNote,
      local_radius_miles: localRadiusMiles,
      distance_basis_used: distanceBasisUsed,
      price_breakdown: needsVerification ? null : priceBreakdown,
      needs_verification: needsVerification,
      verification_message: verificationMessage,
    };

    // Log for debugging (no PII - truncate addresses)
    console.log(`[check-service-area] tenant=${tenantId.substring(0, 8)}... dispatch=${dispatchDistanceMiles?.toFixed(1)}mi tow=${towDistanceMiles?.toFixed(1) || 'N/A'}mi tier=${serviceTier} basis=${distanceBasisUsed}`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[check-service-area] Error:", error);
    return new Response(
      JSON.stringify({
        in_area: true,
        distance_miles: null,
        tow_distance_miles: null,
        dropoff_geocoded: null,
        eta_minutes: 45,
        eta_range: "30-60 minutes",
        message: "Verification unavailable - proceeding with dispatch",
        service_tier: "long_distance",
        pricing_note: "Verification failed - treat as long distance, collect details for pricing.",
        local_radius_miles: 10,
        distance_basis_used: "error",
        price_breakdown: null,
        needs_verification: true,
        verification_message: "I'm having trouble verifying the address. Let's proceed and confirm the location when we arrive."
      } as ServiceAreaResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
