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

// Update this string when you want to verify a fresh deploy is running
const VERSION = "elevenlabs-check-service-area@2026-02-06.1";
const DEPLOYED_AT = new Date().toISOString();

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
  dropoff_in_area: boolean | null;         // Whether dropoff is within coverage
  dropoff_coverage_note: string | null;    // Message about dropoff coverage
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

  // Deploy verification + ETA debug
  _meta?: {
    version: string;
    deployed_at: string;
    compute_distance_eta_version?: string | null;
  };
  eta_components?: Record<string, unknown> | null;
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
    console.log(`[${VERSION}] [check-service-area] Full request body:`, JSON.stringify(body));
    
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

    // P0-2: Removed cross-tenant fallback lookups (Fallback 1 and 2) that
    // queried most recent session across ALL tenants. Tenant isolation risk.

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
      supabase.from("tenants").select("service_area_json, business_mode").eq("id", tenantId).single(),
      supabase.from("tenant_distance_settings").select("*, default_distance_basis").eq("tenant_id", tenantId).maybeSingle(),
      // Fetch towing services that may have distance-tiered pricing
      supabase.from("services")
        .select("id, name, pricing_config_json, service_category")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .or("name.ilike.%tow%,service_category.eq.towing")
        .limit(10)
    ]);

    const serviceArea = tenantResult.data?.service_area_json as Record<string, unknown> | null;
    const businessMode = tenantResult.data?.business_mode as string || "service";
    const distanceSettings = distanceSettingsResult.data;
    const towingServices = towingServicesResult.data || [];

    // FOOD MODE: Use delivery zone check instead of dispatch distance logic
    if (businessMode === "food") {
      const deliveryRadiusMiles = (serviceArea?.radius_miles as number) || (serviceArea?.miles as number) || 10; // Default 10mi for food, not 100
      const outOfAreaMessage = (serviceArea?.out_of_area_message as string) ||
        "I'm sorry, that address is outside our delivery area. Would you like to place a pickup order instead?";

      // Try zip-code match against delivery_zones
      const zipMatch = address.match(/\b(\d{5})(-\d{4})?\b/);
      const zip = zipMatch ? zipMatch[1] : null;

      let inDeliveryZone = false;
      let deliveryFee: number | null = null;
      let zoneName: string | null = null;

      if (zip) {
        const { data: zones } = await supabase
          .from("delivery_zones")
          .select("id, name, delivery_fee_cents, zip_codes, estimated_delivery_minutes")
          .eq("tenant_id", tenantId);

        if (zones && zones.length > 0) {
          const matchingZone = zones.find(
            (z: Record<string, unknown>) => z.zip_codes && Array.isArray(z.zip_codes) && (z.zip_codes as string[]).includes(zip)
          );
          if (matchingZone) {
            inDeliveryZone = true;
            deliveryFee = matchingZone.delivery_fee_cents || 0;
            zoneName = matchingZone.name;
          }
        }
      }

      // If no zip-code zones configured, fall back to radius check
      if (!zip || (!inDeliveryZone && !zip)) {
        // Simplified: assume in-area if we can't determine, let the order proceed
        inDeliveryZone = true;
      }

      if (!inDeliveryZone) {
        return new Response(
          JSON.stringify({
            in_area: false,
            distance_miles: null,
            tow_distance_miles: null,
            dropoff_geocoded: null,
            eta_minutes: null,
            eta_range: "",
            message: outOfAreaMessage,
            service_tier: "out_of_area",
            pricing_note: outOfAreaMessage,
            local_radius_miles: deliveryRadiusMiles,
            distance_basis_used: "food_zone_check",
            price_breakdown: null,
            out_of_area_message: outOfAreaMessage,
          } as ServiceAreaResponse),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const deliveryFeeFormatted = deliveryFee !== null ? `$${(deliveryFee / 100).toFixed(2)}` : "varies";
      return new Response(
        JSON.stringify({
          in_area: true,
          distance_miles: null,
          tow_distance_miles: null,
          dropoff_geocoded: null,
          eta_minutes: 30,
          eta_range: "25-45 minutes",
          message: zoneName
            ? `Delivery available in ${zoneName} zone. Delivery fee: ${deliveryFeeFormatted}.`
            : `Delivery available. Delivery fee: ${deliveryFeeFormatted}.`,
          service_tier: "local",
          pricing_note: `Delivery fee: ${deliveryFeeFormatted}`,
          local_radius_miles: deliveryRadiusMiles,
          distance_basis_used: "food_zone_check",
          price_breakdown: deliveryFee !== null ? {
            base_price: 0,
            distance_charge: 0,
            distance_miles_charged: 0,
            modifier_charges: [{ name: "delivery_fee", amount: deliveryFee / 100 }],
            total_estimate: deliveryFee / 100,
          } : null,
        } as ServiceAreaResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no distance settings or provider disabled, use text-based fallback
    if (!distanceSettings?.distance_provider_enabled) {
      const radiusMiles = (serviceArea?.radius_miles as number) || (serviceArea?.miles as number) || 50;

      // Get tenant's base address for state comparison
      const { data: tenantAddrData } = await supabase
        .from("tenants")
        .select("address")
        .eq("id", tenantId)
        .single();

      const tenantAddress = (tenantAddrData?.address || "").toUpperCase().trim();

      // US state abbreviations and full names
      const stateMap: Record<string, string> = {
        AL:"AL",ALABAMA:"AL",AK:"AK",ALASKA:"AK",AZ:"AZ",ARIZONA:"AZ",AR:"AR",ARKANSAS:"AR",
        CA:"CA",CALIFORNIA:"CA",CO:"CO",COLORADO:"CO",CT:"CT",CONNECTICUT:"CT",DE:"DE",DELAWARE:"DE",
        FL:"FL",FLORIDA:"FL",GA:"GA",GEORGIA:"GA",HI:"HI",HAWAII:"HI",ID:"ID",IDAHO:"ID",
        IL:"IL",ILLINOIS:"IL",IN:"IN",INDIANA:"IN",IA:"IA",IOWA:"IA",KS:"KS",KANSAS:"KS",
        KY:"KY",KENTUCKY:"KY",LA:"LA",LOUISIANA:"LA",ME:"ME",MAINE:"ME",MD:"MD",MARYLAND:"MD",
        MA:"MA",MASSACHUSETTS:"MA",MI:"MI",MICHIGAN:"MI",MN:"MN",MINNESOTA:"MN",MS:"MS",MISSISSIPPI:"MS",
        MO:"MO",MISSOURI:"MO",MT:"MT",MONTANA:"MT",NE:"NE",NEBRASKA:"NE",NV:"NV",NEVADA:"NV",
        NH:"NH","NEW HAMPSHIRE":"NH",NJ:"NJ","NEW JERSEY":"NJ",NM:"NM","NEW MEXICO":"NM",
        NY:"NY","NEW YORK":"NY",NC:"NC","NORTH CAROLINA":"NC",ND:"ND","NORTH DAKOTA":"ND",
        OH:"OH",OHIO:"OH",OK:"OK",OKLAHOMA:"OK",OR:"OR",OREGON:"OR",PA:"PA",PENNSYLVANIA:"PA",
        RI:"RI","RHODE ISLAND":"RI",SC:"SC","SOUTH CAROLINA":"SC",SD:"SD","SOUTH DAKOTA":"SD",
        TN:"TN",TENNESSEE:"TN",TX:"TX",TEXAS:"TX",UT:"UT",UTAH:"UT",VT:"VT",VERMONT:"VT",
        VA:"VA",VIRGINIA:"VA",WA:"WA",WASHINGTON:"WA",WV:"WV","WEST VIRGINIA":"WV",
        WI:"WI",WISCONSIN:"WI",WY:"WY",WYOMING:"WY",DC:"DC","DISTRICT OF COLUMBIA":"DC",
      };

      // Extract state from an address string
      function extractState(addr: string): string {
        const upper = addr.toUpperCase();
        // Try 2-letter state abbreviations first (most reliable — word boundary match)
        const abbrMatch = upper.match(/\b([A-Z]{2})\s+\d{5}\b/);
        if (abbrMatch && stateMap[abbrMatch[1]]) return stateMap[abbrMatch[1]];
        // Try full state names (longer matches first to avoid "NEW" matching before "NEW JERSEY")
        const sortedKeys = Object.keys(stateMap).sort((a, b) => b.length - a.length);
        for (const key of sortedKeys) {
          if (key.length < 3) continue; // Skip abbreviations, already checked
          if (upper.includes(key)) return stateMap[key];
        }
        // Final fallback: 2-letter abbrev anywhere
        for (const key of Object.keys(stateMap)) {
          if (key.length === 2 && new RegExp(`\\b${key}\\b`).test(upper)) return stateMap[key];
        }
        return "";
      }

      const tenantState = extractState(tenantAddress);
      const customerState = extractState(address);

      // Extract city from tenant address for friendly messages
      const tenantCityMatch = tenantAddress.match(/,\s*([^,]+),\s*[A-Z]{2}\s+\d{5}/i);
      const tenantCity = tenantCityMatch ? tenantCityMatch[1].toLowerCase().trim() : "";

      // If we found both states and they differ, clearly reject
      if (tenantState && customerState && tenantState !== customerState) {
        // Check if the states are neighbors (allow neighboring states within radius)
        const neighborStates: Record<string, string[]> = {
          NJ: ["NY", "PA", "DE"],
          NY: ["NJ", "PA", "CT", "MA", "VT"],
          PA: ["NJ", "NY", "DE", "MD", "WV", "OH"],
          CT: ["NY", "MA", "RI"],
          DE: ["NJ", "PA", "MD"],
          MD: ["PA", "DE", "VA", "WV", "DC"],
          VA: ["MD", "DC", "WV", "KY", "TN", "NC"],
          CA: ["OR", "NV", "AZ"],
          TX: ["NM", "OK", "AR", "LA"],
          FL: ["GA", "AL"],
          IL: ["WI", "IN", "IA", "MO", "KY"],
          OH: ["PA", "WV", "KY", "IN", "MI"],
          GA: ["FL", "AL", "TN", "NC", "SC"],
          MA: ["CT", "RI", "NH", "VT", "NY"],
        };
        const neighbors = neighborStates[tenantState] || [];
        const isNeighborState = neighbors.includes(customerState);

        if (!isNeighborState) {
          const outOfAreaMsg = (serviceArea?.out_of_area_message as string) ||
            `Sorry, we don't service that area. We only cover within ${radiusMiles} miles of ${tenantCity || "our location"}.`;
          console.log(`[check-service-area] State mismatch: tenant=${tenantState} customer=${customerState} → out_of_area`);
          return new Response(
            JSON.stringify({
              in_area: false,
              distance_miles: null,
              tow_distance_miles: null,
              dropoff_geocoded: null,
              eta_minutes: null,
              eta_range: "",
              message: outOfAreaMsg,
              service_tier: "out_of_area",
              pricing_note: outOfAreaMsg,
              local_radius_miles: radiusMiles,
              distance_basis_used: "state_mismatch",
              price_breakdown: null,
              needs_verification: false,
              verification_message: null,
            } as ServiceAreaResponse),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // Neighboring state — could be near the border or far away (e.g. NYC is 65mi from Hamilton NJ).
          // We cannot verify distance without geocoding, so we MUST NOT assume in_area=true.
          // Return in_area=false with needs_verification=true so the AI asks for exact city/zip.
          const neighborVerifyMsg = `Your address appears to be in ${customerState}, a neighboring state. Could you confirm your city and zip code so I can verify you're within our ${radiusMiles}-mile service area?`;
          console.log(`[check-service-area] Neighboring state (${tenantState}→${customerState}): cannot verify ${radiusMiles}mi radius, returning in_area=false needs_verification=true`);
          return new Response(
            JSON.stringify({
              in_area: false,
              distance_miles: null,
              tow_distance_miles: null,
              dropoff_geocoded: null,
              eta_minutes: null,
              eta_range: "",
              message: `Cannot verify distance — ${customerState} address may be outside our ${radiusMiles}-mile service area`,
              service_tier: "out_of_area",
              pricing_note: "Address is in a neighboring state. Verify caller is within our service area before proceeding.",
              local_radius_miles: radiusMiles,
              distance_basis_used: "neighboring_state_unverified",
              price_breakdown: null,
              needs_verification: true,
              verification_message: neighborVerifyMsg,
            } as ServiceAreaResponse),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Same state or can't determine — cannot verify if within radius without geocoding
      // Set needs_verification=true so the AI asks the caller to confirm their city/zip
      const verifyMsg = `I need to verify you're within our ${radiusMiles}-mile service area. Could you tell me your city and zip code?`;
      console.log(`[check-service-area] state_match_fallback: cannot verify ${radiusMiles}mi radius, setting needs_verification=true`);
      return new Response(
        JSON.stringify({
          in_area: true,
          distance_miles: null,
          tow_distance_miles: null,
          dropoff_geocoded: null,
          eta_minutes: distanceSettings?.eta_base_minutes || 45,
          eta_range: `${distanceSettings?.eta_min_minutes || 30}-${distanceSettings?.eta_max_minutes || 60} minutes`,
          message: `Cannot verify exact distance — please confirm caller is within ${radiusMiles} miles`,
          service_tier: "long_distance",
          pricing_note: "Distance cannot be verified. Ask the caller to confirm their city — only proceed if they confirm they are within our service area.",
          local_radius_miles: 10,
          distance_basis_used: "state_match_fallback",
          price_breakdown: null,
          needs_verification: true,
          verification_message: verifyMsg,
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
    
    // Find the appropriate service to use for pricing
    // For non-towing businesses, towingServices may include any active service matching the query
    const primaryTowService = towingServices.find(s =>
      s.name.toLowerCase().includes("local") && s.name.toLowerCase().includes("tow")
    ) || towingServices.find(s =>
      s.name.toLowerCase().includes("tow")
    ) || towingServices[0];

    // Determine which distance to use for pricing based on service config
    // Priority: service-level override > tenant default > fallback to tow_distance
    const pricingConfig = primaryTowService?.pricing_config_json as Record<string, unknown> | null;
    const tenantDefaultBasis = (distanceSettings?.default_distance_basis as string) || "tow_distance";
    const serviceBasis = pricingConfig?.distance_basis as string | undefined;
    const distanceBasis = serviceBasis || tenantDefaultBasis;
    
    console.log(`[check-service-area] Distance basis: service=${serviceBasis || 'none'} tenant_default=${tenantDefaultBasis} → using ${distanceBasis}`);
    
    let pricingDistanceMiles: number | null;
    let distanceBasisUsed: string;
    
    if (distanceBasis === "dispatch_distance") {
      pricingDistanceMiles = dispatchDistanceMiles;
      distanceBasisUsed = "dispatch_distance";
    } else if (distanceBasis === "total_trip") {
      pricingDistanceMiles = (dispatchDistanceMiles || 0) + (towDistanceMiles || 0);
      distanceBasisUsed = "total_trip";
    } else if (distanceBasis === "flat") {
      pricingDistanceMiles = 0;
      distanceBasisUsed = "flat";
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
      // Use tenant's custom out-of-area message, NOT a placeholder instruction
      const customOutOfAreaMsg = (serviceArea?.out_of_area_message as string) ||
        "I'm sorry, that location is outside our service area. Would you like me to take your information for a callback?";
      pricingNote = customOutOfAreaMsg;
    } else if (pricingDistanceMiles !== null && pricingDistanceMiles <= localRadiusMiles) {
      serviceTier = "local";

      // Calculate local pricing from matching service
      const localService = towingServices.find(s =>
        s.name.toLowerCase().includes("local") && s.name.toLowerCase().includes("tow")
      ) || primaryTowService;

      if (localService?.pricing_config_json) {
        const config = localService.pricing_config_json as Record<string, unknown>;
        const pricingModel = (config.pricing_model || config.model || "flat") as string;

        // Helper: apply vehicle modifiers from variables[]
        const applyVehicleModifiers = (baseAmount: number): { charges: { name: string; amount: number }[]; total: number } => {
          const charges: { name: string; amount: number }[] = [];
          let total = 0;
          if (vehicleType && config.variables && Array.isArray(config.variables)) {
            for (const variable of config.variables as Array<Record<string, unknown>>) {
              if (variable.key === "vehicle_type" && Array.isArray(variable.modifiers)) {
                const modifier = (variable.modifiers as PriceModifier[]).find(
                  m => m.value.toLowerCase() === vehicleType.toLowerCase()
                );
                if (modifier) {
                  const adjustment = modifier.adjustment_type === "percent"
                    ? baseAmount * (modifier.price_adjustment / 100)
                    : modifier.price_adjustment;
                  total += adjustment;
                  charges.push({ name: `Vehicle: ${vehicleType}`, amount: adjustment });
                }
              }
            }
          }
          return { charges, total };
        };

        // Trip fee
        const tripFee = config.trip_fee as { enabled?: boolean; amount?: number; label?: string } | undefined;
        const tripFeeAmount = (tripFee?.enabled && tripFee?.amount) ? tripFee.amount : 0;
        const tripFeeLabel = tripFee?.label || "Trip Fee";

        let basePrice = Number(config.min_price) || 0;
        let modifierCharges: { name: string; amount: number }[] = [];
        let modifierTotal = 0;

        if (pricingModel === "flat") {
          basePrice = Number(config.min_price) || 85;
          const mods = applyVehicleModifiers(basePrice);
          modifierCharges = mods.charges;
          modifierTotal = mods.total;
        } else if (pricingModel === "per_unit") {
          const unitLabel = (config.unit_label as string) || "unit";
          const perUnitPrice = Number(config.per_unit_price) || 0;
          const minUnits = Number(config.min_units) || 1;
          basePrice = perUnitPrice * minUnits;
          if (config.min_price && basePrice < Number(config.min_price)) {
            basePrice = Number(config.min_price);
          }
          pricingNote = `${localService.name}: $${perUnitPrice} per ${unitLabel}`;
          if (minUnits > 1) pricingNote += ` (${minUnits}-${unitLabel} minimum, starting at $${basePrice})`;
        } else if (pricingModel === "package") {
          const packages = config.packages as Array<{ name: string; price: number; description?: string; is_popular?: boolean }> | undefined;
          if (packages?.length) {
            const tierList = packages.map(p => `${p.name}: $${p.price}`).join(", ");
            basePrice = packages[0].price;
            pricingNote = `${localService.name} packages: ${tierList}`;
          }
        } else if (pricingModel === "distance_tiered") {
          // Local distance-tiered: use first tier
          basePrice = Number(config.min_price) || 85;
          const mods = applyVehicleModifiers(basePrice);
          modifierCharges = mods.charges;
          modifierTotal = mods.total;
        } else {
          // variable / quote
          basePrice = Number(config.min_price) || 0;
        }

        const total = basePrice + modifierTotal + tripFeeAmount;
        priceBreakdown = {
          base_price: basePrice,
          distance_charge: 0,
          distance_miles_charged: pricingDistanceMiles,
          modifier_charges: [
            ...(tripFeeAmount > 0 ? [{ name: tripFeeLabel, amount: tripFeeAmount }] : []),
            ...modifierCharges,
          ],
          total_estimate: total
        };

        // Build pricing note if not already set by per_unit/package
        if (!pricingNote || pricingNote === "Collect details for pricing.") {
          if (modifierCharges.length > 0 || tripFeeAmount > 0) {
            const parts = [`${localService.name} (${pricingDistanceMiles.toFixed(0)} mi): $${basePrice}`];
            if (tripFeeAmount > 0) parts.push(`$${tripFeeAmount} ${tripFeeLabel.toLowerCase()}`);
            if (modifierCharges.length > 0) parts.push(modifierCharges.map(m => `$${m.amount} ${m.name}`).join(", "));
            pricingNote = parts.join(" + ") + ` = $${total.toFixed(0)}`;
          } else {
            pricingNote = `${localService.name} (${pricingDistanceMiles.toFixed(0)} mi): $${basePrice}`;
          }
        }
      } else {
        pricingNote = `Within ${localRadiusMiles} miles. Quote Local pricing.`;
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
        const pricingModel = (config.pricing_model || config.model) as string;

        // Handle non-distance models (per_unit, package) — they don't depend on distance
        if (pricingModel === "per_unit") {
          const unitLabel = (config.unit_label as string) || "unit";
          const perUnitPrice = Number(config.per_unit_price) || 0;
          const minUnits = Number(config.min_units) || 1;
          const baseTotal = perUnitPrice * minUnits;
          const tripFee = (config.trip_fee as { enabled?: boolean; amount?: number })?.enabled
            ? Number((config.trip_fee as { amount?: number }).amount) || 0
            : 0;
          priceBreakdown = {
            base_price: baseTotal,
            distance_charge: 0,
            distance_miles_charged: pricingDistanceMiles,
            modifier_charges: tripFee > 0 ? [{ name: "Trip Fee", amount: tripFee }] : [],
            total_estimate: baseTotal + tripFee,
          };
          pricingNote = `${longDistanceService.name}: $${perUnitPrice} per ${unitLabel}`;
          if (minUnits > 1) pricingNote += ` (${minUnits}-${unitLabel} minimum)`;
          if (tripFee > 0) pricingNote += ` + $${tripFee} service call fee`;
        } else if (pricingModel === "package") {
          const packages = config.packages as Array<{ name: string; price: number }> | undefined;
          if (packages?.length) {
            const tierList = packages.map(p => `${p.name}: $${p.price}`).join(", ");
            pricingNote = `${longDistanceService.name} packages: ${tierList}`;
            priceBreakdown = {
              base_price: packages[0].price,
              distance_charge: 0,
              distance_miles_charged: pricingDistanceMiles,
              modifier_charges: [],
              total_estimate: packages[0].price,
            };
          }
        } else if (pricingModel === "distance_tiered" && Array.isArray(config.distance_tiers)) {
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
              const baseTotal = basePrice + distanceCharge;
              
              // Apply vehicle modifier if provided
              const modifierCharges: { name: string; amount: number }[] = [];
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
    
    // ── Dropoff Coverage Check ──
    let dropoffInArea: boolean | null = null;
    let dropoffCoverageNote: string | null = null;
    
    const dropoffCoverageMode = (distanceSettings?.dropoff_coverage_mode as string) || "none";
    
    if (dropoffAddress && towDistanceMiles !== null && dropoffCoverageMode !== "none") {
      // Calculate distance from base to dropoff for same_area check
      const baseToDropoffMiles = (dispatchDistanceMiles || 0) + (towDistanceMiles || 0);
      
      if (dropoffCoverageMode === "same_area") {
        dropoffInArea = baseToDropoffMiles <= radiusMiles;
        if (!dropoffInArea) {
          dropoffCoverageNote = `The dropoff location is about ${baseToDropoffMiles.toFixed(0)} miles from our base — outside our ${radiusMiles}-mile service area. There may be an extra mileage charge.`;
        }
      } else if (dropoffCoverageMode === "extended") {
        const maxDropoffMiles = (distanceSettings?.dropoff_max_miles as number) || radiusMiles * 2;
        dropoffInArea = baseToDropoffMiles <= maxDropoffMiles;
        if (!dropoffInArea) {
          dropoffCoverageNote = `The dropoff is about ${baseToDropoffMiles.toFixed(0)} miles away — beyond our ${maxDropoffMiles}-mile maximum. We may not be able to service that destination.`;
        } else if (baseToDropoffMiles > radiusMiles) {
          dropoffCoverageNote = `The dropoff is ${baseToDropoffMiles.toFixed(0)} miles away — outside our normal area but within our extended range. Extra mileage charges apply.`;
        }
      }
      
      console.log(`[check-service-area] Dropoff coverage: mode=${dropoffCoverageMode}, baseToDropoff=${baseToDropoffMiles.toFixed(1)}mi, inArea=${dropoffInArea}`);
    }

    // Build message
    // Important: if we are clearly out of area, say so even if geocoding is uncertain.
    let message = "";
    if (!inArea) {
      message = `Outside ${radiusMiles}-mile service area (${dispatchDistanceMiles?.toFixed(1)} miles away)`;
    } else if (needsVerification) {
      // For ambiguous addresses *within* the service area, prompt for clarification.
      message = verificationMessage || "Address needs verification";
    } else {
      if (towDistanceMiles !== null) {
        message = `Dispatch: ${dispatchDistanceMiles?.toFixed(1) || "?"} mi to pickup, Tow: ${towDistanceMiles.toFixed(1)} mi to dropoff`;
      } else {
        message = `Within service area - ${dispatchDistanceMiles?.toFixed(1) || "?"} miles from base`;
      }
    }
    
    // Append dropoff coverage warning to message
    if (dropoffCoverageNote && dropoffInArea === false) {
      message += `. WARNING: ${dropoffCoverageNote}`;
    }

    // Previously we defaulted to in_area=true whenever geocoding was uncertain.
    // That makes truly out-of-area addresses look like "can't find you".
    // New rule: only keep calls "in area" when the computed distance is within the radius.
    const responseInArea = inArea;

    // If out of area, always mark as out_of_area regardless of uncertainty.
    const responseServiceTier: ServiceAreaResponse["service_tier"] = responseInArea
      ? (needsVerification ? "long_distance" : serviceTier)
      : "out_of_area";

    const dispatchAny = dispatchData as any;

    const response: ServiceAreaResponse = {
      in_area: responseInArea,
      distance_miles: dispatchDistanceMiles,
      tow_distance_miles: towDistanceMiles,
      dropoff_geocoded: dropoffGeocoded,
      dropoff_in_area: dropoffInArea,
      dropoff_coverage_note: dropoffCoverageNote,
      eta_minutes: dispatchAny.eta_minutes_estimate ?? null,
      eta_range:
        dispatchAny.eta_range_minutes ||
        `${distanceSettings.eta_min_minutes || 30}-${distanceSettings.eta_max_minutes || 60} minutes`,
      message,
      service_tier: responseServiceTier,
      pricing_note: !responseInArea
        ? `Outside service area (${radiusMiles} miles). Collect details and offer a callback if needed.`
        : (needsVerification
            ? "Address is approximate - collect details and verify exact location before quoting."
            : pricingNote),
      local_radius_miles: localRadiusMiles,
      distance_basis_used: distanceBasisUsed,
      price_breakdown: needsVerification ? null : priceBreakdown,
      needs_verification: needsVerification,
      verification_message: verificationMessage,
      _meta: {
        version: VERSION,
        deployed_at: DEPLOYED_AT,
        compute_distance_eta_version: dispatchAny._version ?? null,
      },
      eta_components: dispatchAny.eta_components ?? null,
    };

    // Log for debugging (no PII - truncate addresses)
    console.log(`[check-service-area] tenant=${tenantId.substring(0, 8)}... dispatch=${dispatchDistanceMiles?.toFixed(1)}mi tow=${towDistanceMiles?.toFixed(1) || 'N/A'}mi tier=${serviceTier} basis=${distanceBasisUsed} dropoff_ok=${dropoffInArea ?? 'n/a'}`);

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
