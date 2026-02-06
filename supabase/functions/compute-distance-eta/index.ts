/**
 * compute-distance-eta: Calculate travel ETA using Mapbox or HERE
 *
 * Computes driving distance and time from tenant's base location to a destination.
 * Uses tenant-scoped settings from tenant_distance_settings table.
 * 
 * Geocode provider selection:
 * - 'mapbox' (default): Standard geocoding for addresses
 * - 'here': Better for cross-streets, routes, mile markers (dispatch/towing)
 *
 * POST /functions/v1/compute-distance-eta
 * Body: {
 *   tenant_id: string,
 *   address_text?: string,
 *   dest_lat?: number,
 *   dest_lng?: number,
 *   intent?: "dispatch" | "delivery"
 * }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { geocodeWithHere, isCrossStreetOrRouteQuery } from "../_shared/here_geocode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

interface ComputeEtaRequest {
  tenant_id: string;
  address_text?: string;
  dest_lat?: number;
  dest_lng?: number;
  intent?: "dispatch" | "delivery";
  // Optional origin override - if not provided, uses tenant base location
  origin_lat?: number;
  origin_lng?: number;
  origin_address_text?: string;
  // If true, skips tenant settings lookup (for simple point-to-point calculations)
  skip_eta_settings?: boolean;
}

interface ComputeEtaResponse {
  geocoded_place_name: string | null;
  route_distance_miles: number | null;
  route_duration_minutes: number | null;
  eta_minutes_estimate: number | null;
  eta_range_low: number | null;
  eta_range_high: number | null;
  eta_range_minutes: string;
  profile_used: string;
  error: string | null;
  // Geocoding quality indicators
  geocoding_confidence: "high" | "low" | "unverified" | null;
  needs_verification: boolean;
  state_hint_applied: boolean;
  geocode_provider_used: string;
}

interface TenantDistanceSettings {
  distance_provider_enabled: boolean;
  provider: string;
  geocode_provider: string;  // 'mapbox' or 'here'
  base_lat: number | null;
  base_lng: number | null;
  base_place_name: string | null;
  base_state_hint: string | null;  // e.g., "NJ" to improve geocoding accuracy
  mapbox_route_profile: string;
  eta_base_minutes: number;
  eta_per_mile_minutes: number | null;
  eta_min_minutes: number | null;
  eta_max_minutes: number | null;
  eta_rounding_minutes: number;
  service_radius_miles: number | null;  // For proximity validation
}

const METERS_PER_MILE = 1609.344;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const disabledResult: ComputeEtaResponse = {
    geocoded_place_name: null,
    route_distance_miles: null,
    route_duration_minutes: null,
    eta_minutes_estimate: null,
    eta_range_low: null,
    eta_range_high: null,
    eta_range_minutes: "",
    profile_used: "none",
    error: null,
    geocoding_confidence: null,
    needs_verification: false,
    state_hint_applied: false,
    geocode_provider_used: "none",
  };

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ...disabledResult, error: "POST only" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for internal secret (for server-to-server calls) or auth header
    const internalSecret = req.headers.get("x-closeloop-secret");
    const authHeader = req.headers.get("Authorization");
    const hasInternalAuth = internalSecret === Deno.env.get("CLOSELOOP_INTERNAL_SECRET");

    // Parse request
    const body: ComputeEtaRequest = await req.json();
    const { 
      tenant_id, 
      address_text, 
      dest_lat, 
      dest_lng, 
      intent = "dispatch",
      origin_lat,
      origin_lng,
      origin_address_text,
      skip_eta_settings = false
    } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ ...disabledResult, error: "Missing tenant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!address_text && (dest_lat === undefined || dest_lng === undefined)) {
      return new Response(
        JSON.stringify({ ...disabledResult, error: "Must provide address_text or dest_lat/dest_lng" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create appropriate client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    let supabase;

    if (hasInternalAuth) {
      // Internal server call - use service role
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      supabase = createClient(supabaseUrl, serviceKey);
    } else if (authHeader) {
      // User call - verify membership
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: membership } = await supabase
        .from("tenant_memberships")
        .select("id")
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (!membership) {
        return new Response(
          JSON.stringify({ ...disabledResult, error: "Tenant access denied" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ ...disabledResult, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch tenant distance settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("tenant_distance_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (settingsError) {
      console.error("[compute-distance-eta] Settings fetch error:", settingsError);
      return new Response(
        JSON.stringify({ ...disabledResult, error: "Failed to load settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const settings = settingsData as TenantDistanceSettings | null;

    // If no settings or disabled, return early
    if (!settings || !settings.distance_provider_enabled) {
      return new Response(
        JSON.stringify({ ...disabledResult, error: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine origin coordinates - use override if provided, else tenant base
    let originLat = origin_lat;
    let originLng = origin_lng;
    let originPlaceName: string | null = null;

    // If origin override via address, geocode it
    if (origin_address_text && (originLat === undefined || originLng === undefined)) {
      const accessToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
      if (accessToken) {
        const encodedOrigin = encodeURIComponent(origin_address_text.trim());
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedOrigin}.json?access_token=${accessToken}&limit=1`;
        const geocodeRes = await fetch(geocodeUrl);
        if (geocodeRes.ok) {
          const geocodeData = await geocodeRes.json();
          if (geocodeData.features?.length > 0) {
            [originLng, originLat] = geocodeData.features[0].center;
            originPlaceName = geocodeData.features[0].place_name;
          }
        }
      }
    }

    // Fall back to tenant base if no origin override
    if (originLat === undefined || originLng === undefined) {
      if (settings.base_lat === null || settings.base_lng === null) {
        return new Response(
          JSON.stringify({ ...disabledResult, error: "Tenant base coordinates not configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      originLat = settings.base_lat;
      originLng = settings.base_lng;
      originPlaceName = settings.base_place_name;
    }

    // Get Mapbox token
    const accessToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!accessToken) {
      console.error("[compute-distance-eta] MAPBOX_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ ...disabledResult, error: null }), // Silent fail
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Geocode destination if needed
    let destLat = dest_lat;
    let destLng = dest_lng;
    let geocodedPlaceName: string | null = null;
    let stateHintApplied = false;
    let geocodingConfidence: "high" | "low" | "unverified" = "high";
    let geocodeProviderUsed = "none";

    if (address_text && (destLat === undefined || destLng === undefined)) {
      const stateHint = settings.base_state_hint;
      const geocodeProvider = settings.geocode_provider || "mapbox";
      
      // Determine if we should use HERE (better for cross-streets, routes, mile markers)
      const shouldUseHere = geocodeProvider === "here" || isCrossStreetOrRouteQuery(address_text);
      
      if (shouldUseHere) {
        // Use HERE for dispatch/towing - better cross-street & route handling
        geocodeProviderUsed = "here";
        console.log(`[compute-distance-eta] Using HERE geocoder (provider=${geocodeProvider}, isCrossStreet=${isCrossStreetOrRouteQuery(address_text)})`);
        
        const hereResult = await geocodeWithHere(address_text, {
          stateHint: stateHint || undefined,
          countryCode: "USA",
          // Bias results toward tenant's base location
          proximityLat: originLat,
          proximityLng: originLng,
          proximityRadius: 80000, // 80km ~ 50 miles
        });
        
        if (!hereResult.ok || hereResult.lat === null || hereResult.lng === null) {
          // Fallback to Mapbox if HERE fails
          console.log(`[compute-distance-eta] HERE failed, falling back to Mapbox: ${hereResult.error}`);
          geocodeProviderUsed = "mapbox_fallback";
        } else {
          destLat = hereResult.lat;
          destLng = hereResult.lng;
          geocodedPlaceName = hereResult.place_name;
          stateHintApplied = !!stateHint;
          
          // Map HERE relevance to confidence
          if (hereResult.relevance < 0.5) {
            geocodingConfidence = "low";
          } else if (hereResult.match_level === "street" || hereResult.match_level === "intersection") {
            geocodingConfidence = "high";
          }
          
          console.log(`[compute-distance-eta] HERE geocoded: "${geocodedPlaceName?.substring(0, 50)}..." relevance=${hereResult.relevance} type=${hereResult.match_level}`);
        }
      }
      
      // Use Mapbox if HERE not configured, failed, or for standard addresses
      if (destLat === undefined || destLng === undefined) {
        geocodeProviderUsed = geocodeProviderUsed === "mapbox_fallback" ? "mapbox_fallback" : "mapbox";
        
        // Apply state hint if address doesn't include a state/country
        let addressToGeocode = address_text.trim();
        const hasState = /,\s*[A-Z]{2}\b/.test(addressToGeocode) || 
                         /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i.test(addressToGeocode);
        
        if (!hasState && stateHint) {
          addressToGeocode = `${addressToGeocode}, ${stateHint}`;
          stateHintApplied = true;
          console.log(`[compute-distance-eta] Applied state hint: "${stateHint}" to address`);
        }
        
        const encodedAddress = encodeURIComponent(addressToGeocode);
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${accessToken}&limit=1`;

        const geocodeRes = await fetch(geocodeUrl);
        if (!geocodeRes.ok) {
          return new Response(
            JSON.stringify({ ...disabledResult, error: "Geocoding failed", needs_verification: true, geocode_provider_used: geocodeProviderUsed }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const geocodeData = await geocodeRes.json();
        if (!geocodeData.features || geocodeData.features.length === 0) {
          return new Response(
            JSON.stringify({ ...disabledResult, error: "Address not found", needs_verification: true, geocode_provider_used: geocodeProviderUsed }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const feature = geocodeData.features[0];
        [destLng, destLat] = feature.center;
        geocodedPlaceName = feature.place_name;
        
        // Check geocoding relevance score (Mapbox returns 0-1)
        const relevance = feature.relevance || 0;
        if (relevance < 0.7) {
          geocodingConfidence = "low";
          console.log(`[compute-distance-eta] Low Mapbox geocoding relevance: ${relevance}`);
        }
      }
    }

    if (destLat === undefined || destLng === undefined) {
      return new Response(
        JSON.stringify({ ...disabledResult, error: "Could not determine destination" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get route from Mapbox Directions (using origin coords, which may be tenant base or override)
    const profile = settings.mapbox_route_profile.replace("mapbox/", "");
    const coordinates = `${originLng},${originLat};${destLng},${destLat}`;
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?access_token=${accessToken}&overview=false`;

    const directionsRes = await fetch(directionsUrl);
    if (!directionsRes.ok) {
      return new Response(
        JSON.stringify({ ...disabledResult, error: "Route calculation failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const directionsData = await directionsRes.json();
    if (directionsData.code !== "Ok" || !directionsData.routes?.length) {
      return new Response(
        JSON.stringify({ ...disabledResult, error: directionsData.message || "No route found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const route = directionsData.routes[0];
    const distanceMiles = route.distance / METERS_PER_MILE;
    const durationMinutes = Math.ceil(route.duration / 60);

    // Proximity validation: if distance is > 2x the service radius, flag as unverified
    let needsVerification = false;
    const serviceRadius = settings.service_radius_miles || 100;
    if (distanceMiles > serviceRadius * 2) {
      geocodingConfidence = "unverified";
      needsVerification = true;
      console.log(`[compute-distance-eta] Distance ${distanceMiles.toFixed(1)}mi exceeds 2x service radius (${serviceRadius}mi) - flagging as unverified`);
    }

    // Calculate ETA - skip complex ETA settings if doing simple point-to-point
    let etaMinutes: number;
    let etaRangeLow: number;
    let etaRangeHigh: number;
    let etaRangeStr: string;
    const rounding = settings.eta_rounding_minutes || 5;

    if (skip_eta_settings) {
      // Simple point-to-point: just use raw duration
      etaMinutes = Math.ceil(durationMinutes / rounding) * rounding;
      etaRangeLow = etaMinutes;
      etaRangeHigh = etaMinutes + rounding;
      etaRangeStr = `${etaRangeLow}–${etaRangeHigh}`;
    } else {
      // Full ETA calculation with tenant settings
      etaMinutes = settings.eta_base_minutes + durationMinutes;

      // Add per-mile buffer if configured
      if (settings.eta_per_mile_minutes) {
        etaMinutes += Math.ceil(distanceMiles * settings.eta_per_mile_minutes);
      }

      // Apply min/max clamps
      if (settings.eta_min_minutes !== null) {
        etaMinutes = Math.max(etaMinutes, settings.eta_min_minutes);
      }
      if (settings.eta_max_minutes !== null) {
        etaMinutes = Math.min(etaMinutes, settings.eta_max_minutes);
      }

      // Apply rounding
      etaMinutes = Math.ceil(etaMinutes / rounding) * rounding;

      // Calculate range
      etaRangeLow = etaMinutes;
      etaRangeHigh = etaMinutes + rounding;
      etaRangeStr = `${etaRangeLow}–${etaRangeHigh}`;
    }

    // Log success (no PII)
    console.log(`[compute-distance-eta] tenant=${tenant_id.substring(0, 8)}... intent=${intent} distance=${distanceMiles.toFixed(1)}mi eta=${etaMinutes}min confidence=${geocodingConfidence} geocoder=${geocodeProviderUsed}`);

    const result: ComputeEtaResponse = {
      geocoded_place_name: geocodedPlaceName,
      route_distance_miles: Math.round(distanceMiles * 100) / 100,
      route_duration_minutes: durationMinutes,
      eta_minutes_estimate: etaMinutes,
      eta_range_low: etaRangeLow,
      eta_range_high: etaRangeHigh,
      eta_range_minutes: etaRangeStr,
      profile_used: settings.mapbox_route_profile,
      error: null,
      geocoding_confidence: geocodingConfidence,
      needs_verification: needsVerification,
      state_hint_applied: stateHintApplied,
      geocode_provider_used: geocodeProviderUsed,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[compute-distance-eta] Error:", error);
    return new Response(
      JSON.stringify({
        ...disabledResult,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
