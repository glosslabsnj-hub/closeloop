/**
 * compute-distance-eta: Calculate travel ETA using Mapbox
 *
 * Computes driving distance and time from tenant's base location to a destination.
 * Uses tenant-scoped settings from tenant_distance_settings table.
 * 
 * Features:
 * - Advanced address preprocessing for cross-streets, highways, and abbreviations
 * - State hints for regional accuracy
 * - Proximity-based bias from tenant's base location
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
import { preprocessAddress } from "../_shared/address_preprocessor.ts";

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
  verification_hint?: string;
  state_hint_applied: boolean;
  geocode_provider_used: string;

  // Deploy verification
  _version?: string;
  _deployed_at?: string;

  // Debug breakdown for why ETA is what it is
  eta_components?: {
    response_base_minutes: number;
    busy_pct: number;
    busy_buffer_minutes: number;
    drive_minutes: number;
    rounding_minutes: number;
    total_minutes: number;
  };
}

interface TenantDistanceSettings {
  distance_provider_enabled: boolean;
  provider: string;
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

interface BusynessRules {
  base_prep_minutes?: number;
  busy_buffer_minutes?: number;
  manual_busyness_pct?: number; // 0-100 slider value
}

// Update this string when you want to verify a fresh deploy is running
const VERSION = "compute-distance-eta@2026-02-12.1";
const DEPLOYED_AT = new Date().toISOString();

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
    console.log(`[${VERSION}] Request received at ${new Date().toISOString()}`);

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ...disabledResult, error: "POST only", _version: VERSION, _deployed_at: DEPLOYED_AT }),
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
      skip_eta_settings = false,
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

    // Fetch tenant distance settings AND busyness rules
    const [settingsResult, tenantResult] = await Promise.all([
      supabase
        .from("tenant_distance_settings")
        .select("*")
        .eq("tenant_id", tenant_id)
        .maybeSingle(),
      supabase
        .from("tenants")
        .select("busyness_rules_jsonb")
        .eq("id", tenant_id)
        .maybeSingle()
    ]);

    if (settingsResult.error) {
      console.error("[compute-distance-eta] Settings fetch error:", settingsResult.error);
      return new Response(
        JSON.stringify({ ...disabledResult, error: "Failed to load settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const settings = settingsResult.data as TenantDistanceSettings | null;
    const busynessRules = (tenantResult.data?.busyness_rules_jsonb as BusynessRules) || null;

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

    // If origin override via address, geocode it with same preprocessing as destination
    if (origin_address_text && (originLat === undefined || originLng === undefined)) {
      const accessToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
      if (accessToken) {
        // Determine state hint for origin geocoding (same logic as destination)
        let originStateHint = settings.base_state_hint;
        if (!originStateHint && settings.base_place_name) {
          const stateMatch = settings.base_place_name.match(/,\s*([A-Za-z\s]+)\s+\d{5}/);
          if (stateMatch) {
            const stateName = stateMatch[1].trim();
            const stateAbbreviations: Record<string, string> = {
              "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
              "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
              "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
              "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
              "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
              "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
              "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
              "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
              "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
              "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
              "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
              "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
              "Wisconsin": "WI", "Wyoming": "WY", "Washington DC": "DC"
            };
            originStateHint = stateAbbreviations[stateName] || null;
          }
        }
        
        // Preprocess origin address (same as destination)
        const originPreprocessed = preprocessAddress(origin_address_text, {
          stateHint: originStateHint || undefined,
          expandAbbreviations: true,
        });
        
        if (originPreprocessed.modifications.length > 0) {
          console.log(`[compute-distance-eta] Origin preprocessed: ${originPreprocessed.modifications.join(", ")}`);
        }
        
        // Build geocode URL with proximity bias from tenant base
        let geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(originPreprocessed.normalized)}.json?access_token=${accessToken}&limit=5&country=US`;
        
        // Add proximity bias from tenant's base location
        if (settings.base_lat !== null && settings.base_lng !== null) {
          geocodeUrl += `&proximity=${settings.base_lng},${settings.base_lat}`;
        }
        
        // For cross-streets and routes, use 'address' type
        if (originPreprocessed.isCrossStreet || originPreprocessed.isHighwayRoute) {
          geocodeUrl += `&types=address,poi`;
          console.log(`[compute-distance-eta] Using address/poi types for origin ${originPreprocessed.isCrossStreet ? "cross-street" : "highway"} query`);
        }
        
        const geocodeRes = await fetch(geocodeUrl);
        if (geocodeRes.ok) {
          const geocodeData = await geocodeRes.json();
          if (geocodeData.features?.length > 0) {
            // Pick best result using same scoring as destination
            let bestFeature = geocodeData.features[0];
            let bestScore = geocodeData.features[0].relevance || 0;
            
            if (settings.base_lat !== null && settings.base_lng !== null && geocodeData.features.length > 1) {
              for (const feature of geocodeData.features) {
                const [lng, lat] = feature.center;
                const distFactor = 1 / (1 + Math.abs(lat - settings.base_lat) + Math.abs(lng - settings.base_lng));
                const score = (feature.relevance || 0) * 0.7 + distFactor * 0.3;
                if (score > bestScore) {
                  bestScore = score;
                  bestFeature = feature;
                }
              }
            }
            
            [originLng, originLat] = bestFeature.center;
            originPlaceName = bestFeature.place_name;
            const originPlaceType = bestFeature.place_type?.[0] || "unknown";
            console.log(`[compute-distance-eta] Origin geocoded: "${originPlaceName?.substring(0, 60)}..." relevance=${bestFeature.relevance?.toFixed(2) || '?'} place_type=${originPlaceType}`);
            
            // Place-type guard: city/region-level results are unreliable
            if (["place", "region", "country", "district"].includes(originPlaceType)) {
              console.log(`[compute-distance-eta] Origin place-level result detected (${originPlaceType}), trying POI retry`);
              const poiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(originPreprocessed.normalized)}.json?access_token=${accessToken}&limit=3&country=US&types=poi,address${settings.base_lat !== null && settings.base_lng !== null ? `&proximity=${settings.base_lng},${settings.base_lat}` : ""}`;
              const poiRes = await fetch(poiUrl);
              if (poiRes.ok) {
                const poiData = await poiRes.json();
                if (poiData.features?.length > 0) {
                  const poiFeature = poiData.features[0];
                  const poiPlaceType = poiFeature.place_type?.[0] || "unknown";
                  // Only use POI result if it's actually more specific than city-level
                  if (["address", "poi", "neighborhood", "postcode", "locality"].includes(poiPlaceType)) {
                    console.log(`[compute-distance-eta] Origin POI retry succeeded: "${poiFeature.place_name?.substring(0, 60)}..." place_type=${poiPlaceType}`);
                    [originLng, originLat] = poiFeature.center;
                    originPlaceName = poiFeature.place_name;
                  } else {
                    console.log(`[compute-distance-eta] Origin POI retry still place-level (${poiPlaceType}), keeping original`);
                  }
                }
              }
            }
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
    let needsVerification = false;
    let verificationHint: string | undefined;

    if (address_text && (destLat === undefined || destLng === undefined)) {
      // Determine state hint - use explicit setting, or derive from base_place_name
      let stateHint = settings.base_state_hint;
      if (!stateHint && settings.base_place_name) {
        // Try to extract state from base_place_name (e.g., "18 Yorkshire Road, Trenton, New Jersey 08610, United States")
        const stateMatch = settings.base_place_name.match(/,\s*([A-Za-z\s]+)\s+\d{5}/);
        if (stateMatch) {
          const stateName = stateMatch[1].trim();
          // Convert full state name to abbreviation for geocoding
          const stateAbbreviations: Record<string, string> = {
            "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
            "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
            "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
            "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
            "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
            "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
            "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
            "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
            "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
            "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
            "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
            "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
            "Wisconsin": "WI", "Wyoming": "WY", "Washington DC": "DC"
          };
          stateHint = stateAbbreviations[stateName] || null;
          if (stateHint) {
            console.log(`[compute-distance-eta] Derived state hint "${stateHint}" from base_place_name`);
          }
        }
      }
      geocodeProviderUsed = "mapbox";
      
      // Preprocess address for better geocoding (handles cross-streets, highways, abbreviations)
      const preprocessed = preprocessAddress(address_text, {
        stateHint: stateHint || undefined,
        expandAbbreviations: true,
      });
      
      if (preprocessed.modifications.length > 0) {
        console.log(`[compute-distance-eta] Address preprocessed: ${preprocessed.modifications.join(", ")}`);
      }
      
      stateHintApplied = preprocessed.modifications.includes("added_state_hint");
      
      // Build Mapbox geocoding URL with proximity bias
      const encodedAddress = encodeURIComponent(preprocessed.normalized);
      let geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${accessToken}&limit=5&country=US`;
      
      // Add proximity bias from tenant's base location (improves accuracy for nearby addresses)
      if (originLat !== undefined && originLng !== undefined) {
        geocodeUrl += `&proximity=${originLng},${originLat}`;
      }
      
      // For cross-streets and routes, use 'address' type to get more precise results
      if (preprocessed.isCrossStreet || preprocessed.isHighwayRoute) {
        geocodeUrl += `&types=address,poi`;
        console.log(`[compute-distance-eta] Using address/poi types for ${preprocessed.isCrossStreet ? "cross-street" : "highway"} query`);
      }

      const geocodeRes = await fetch(geocodeUrl);
      if (!geocodeRes.ok) {
        return new Response(
          JSON.stringify({ ...disabledResult, error: "Geocoding failed", needs_verification: true, geocode_provider_used: geocodeProviderUsed }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const geocodeData = await geocodeRes.json();
      if (!geocodeData.features || geocodeData.features.length === 0) {
        // If preprocessed address fails, try original as fallback
        if (preprocessed.normalized !== preprocessed.original) {
          console.log(`[compute-distance-eta] Preprocessed address failed, trying original`);
          const fallbackUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address_text.trim())}.json?access_token=${accessToken}&limit=1&country=US`;
          const fallbackRes = await fetch(fallbackUrl);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (fallbackData.features?.length > 0) {
              const feature = fallbackData.features[0];
              [destLng, destLat] = feature.center;
              geocodedPlaceName = feature.place_name;
              geocodingConfidence = (feature.relevance || 0) >= 0.7 ? "high" : "low";
            }
          }
        }
        
        if (destLat === undefined || destLng === undefined) {
          return new Response(
            JSON.stringify({ ...disabledResult, error: "Address not found", needs_verification: true, geocode_provider_used: geocodeProviderUsed }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Pick best result - prefer higher relevance and proximity to base
        const features = geocodeData.features;
        let bestFeature = features[0];
        let bestScore = features[0].relevance || 0;
        
        // If we have proximity data, score by distance too
        if (originLat !== undefined && originLng !== undefined && features.length > 1) {
          for (const feature of features) {
            const [lng, lat] = feature.center;
            // Simple distance scoring (closer = better)
            const distFactor = 1 / (1 + Math.abs(lat - originLat) + Math.abs(lng - originLng));
            const score = (feature.relevance || 0) * 0.7 + distFactor * 0.3;
            if (score > bestScore) {
              bestScore = score;
              bestFeature = feature;
            }
          }
        }
        
        [destLng, destLat] = bestFeature.center;
        geocodedPlaceName = bestFeature.place_name;
        
        // Check geocoding relevance score (Mapbox returns 0-1)
        const relevance = bestFeature.relevance || 0;
        const destPlaceType = bestFeature.place_type?.[0] || "unknown";
        
        if (relevance < 0.7) {
          geocodingConfidence = "low";
          console.log(`[compute-distance-eta] Low Mapbox geocoding relevance: ${relevance}`);
        }
        
        console.log(`[compute-distance-eta] Mapbox geocoded: "${geocodedPlaceName?.substring(0, 60)}..." relevance=${relevance.toFixed(2)} place_type=${destPlaceType}`);
        
        // Layer 1: Place-type guard — city/region-level results are unreliable for distance
        if (["place", "region", "country", "district"].includes(destPlaceType)) {
          console.log(`[compute-distance-eta] Place-level result detected (${destPlaceType}), trying POI retry`);
          
          // Layer 2: POI retry — try types=poi,address to find landmarks/schools/businesses
          const poiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address_text!.trim())}.json?access_token=${accessToken}&limit=3&country=US&types=poi,address${originLat !== undefined && originLng !== undefined ? `&proximity=${originLng},${originLat}` : ""}`;
          const poiRes = await fetch(poiUrl);
          let poiResolved = false;
          
          if (poiRes.ok) {
            const poiData = await poiRes.json();
            if (poiData.features?.length > 0) {
              const poiFeature = poiData.features[0];
              const poiPlaceType = poiFeature.place_type?.[0] || "unknown";
              
              // Only use POI result if it's actually more specific than city-level
              if (["address", "poi", "neighborhood", "postcode", "locality"].includes(poiPlaceType)) {
                // Sanity check: is the POI within a reasonable distance of the tenant's base?
                const poiServiceRadius = settings.service_radius_miles || 100;
                if (originLat !== undefined && originLng !== undefined) {
                  const [poiLng, poiLat] = poiFeature.center;
                  // Rough distance check (1 degree ≈ 69 miles)
                  const roughDistMiles = Math.sqrt(
                    Math.pow((poiLat - originLat) * 69, 2) +
                    Math.pow((poiLng - originLng) * 69 * Math.cos(originLat * Math.PI / 180), 2)
                  );
                  
                  if (roughDistMiles <= poiServiceRadius * 2) {
                    console.log(`[compute-distance-eta] POI retry succeeded: "${poiFeature.place_name?.substring(0, 60)}..." place_type=${poiPlaceType} ~${roughDistMiles.toFixed(1)}mi from base`);
                    [destLng, destLat] = poiFeature.center;
                    geocodedPlaceName = poiFeature.place_name;
                    geocodingConfidence = poiPlaceType === "address" || poiPlaceType === "poi" ? "high" : "low";
                    poiResolved = true;
                  } else {
                    console.log(`[compute-distance-eta] POI retry result too far: ~${roughDistMiles.toFixed(1)}mi (service radius: ${poiServiceRadius}mi)`);
                  }
                } else {
                  // No base coords to compare, use POI result anyway
                  console.log(`[compute-distance-eta] POI retry succeeded (no base for distance check): "${poiFeature.place_name?.substring(0, 60)}..." place_type=${poiPlaceType}`);
                  [destLng, destLat] = poiFeature.center;
                  geocodedPlaceName = poiFeature.place_name;
                  geocodingConfidence = poiPlaceType === "address" || poiPlaceType === "poi" ? "high" : "low";
                  poiResolved = true;
                }
              } else {
                console.log(`[compute-distance-eta] POI retry still place-level (${poiPlaceType})`);
              }
            } else {
              console.log(`[compute-distance-eta] POI retry returned no results`);
            }
          }
          
          // If POI retry didn't resolve, mark as low confidence with verification hint
          if (!poiResolved) {
            geocodingConfidence = "low";
            needsVerification = true;
            verificationHint = "Can you give me a nearby cross-street or the street address?";
            console.log(`[compute-distance-eta] Destination remains place-level after POI retry — flagging for verification`);
          }
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

    // Proximity validation: if distance exceeds service radius, flag for verification
    const serviceRadius = settings.service_radius_miles || 100;
    if (distanceMiles > serviceRadius) {
      geocodingConfidence = "unverified";
      needsVerification = true;
      verificationHint = "Can you confirm the address? The location seems farther than expected.";
      console.log(`[compute-distance-eta] Distance ${distanceMiles.toFixed(1)}mi exceeds service radius (${serviceRadius}mi) - flagging as unverified`);
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
      // ETA = (Base Response Time + Busyness Buffer) + Travel Time
      //
      // - eta_base_minutes: Average response time (how long to get out the door)
      // - busyness buffer: Additional delay based on how busy they are
      // - durationMinutes: Actual drive time from base to pickup (from Mapbox)
      
      // Start with base response time (average time to get out the door)
      const responseBaseMinutes = settings.eta_base_minutes;
      let responseTime = responseBaseMinutes;

      // Apply busyness buffer if configured
      // Formula: At 100% busyness, add full busy_buffer_minutes
      // At 0% busyness, add nothing
      const busyPct = Math.min(100, Math.max(0, busynessRules?.manual_busyness_pct ?? 0));
      const busyBufferMax = busynessRules?.busy_buffer_minutes ?? 15;
      const busyBufferMinutes = Math.round((busyPct / 100) * busyBufferMax);
      responseTime += busyBufferMinutes;

      console.log(
        `[compute-distance-eta] Busyness adjustment: ${busyPct}% busyness → +${busyBufferMinutes}min buffer (max ${busyBufferMax}min)`
      );

      // Total ETA = busyness-adjusted response time + drive time
      // NOTE: Mapbox duration already reflects distance + traffic.
      // No additional per-mile buffer is applied - this was removed to prevent inflated ETAs.
      etaMinutes = responseTime + durationMinutes;

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
    console.log(`[${VERSION}] tenant=${tenant_id.substring(0, 8)}... intent=${intent} distance=${distanceMiles.toFixed(1)}mi eta=${etaMinutes}min confidence=${geocodingConfidence} geocoder=${geocodeProviderUsed}`);

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
      verification_hint: verificationHint,
      state_hint_applied: stateHintApplied,
      geocode_provider_used: geocodeProviderUsed,
      _version: VERSION,
      _deployed_at: DEPLOYED_AT,
      eta_components: {
        response_base_minutes: settings.eta_base_minutes,
        busy_pct: Math.min(100, Math.max(0, busynessRules?.manual_busyness_pct ?? 0)),
        busy_buffer_minutes: Math.round(
          (Math.min(100, Math.max(0, busynessRules?.manual_busyness_pct ?? 0)) / 100) *
            (busynessRules?.busy_buffer_minutes ?? 15)
        ),
        drive_minutes: durationMinutes,
        rounding_minutes: rounding,
        total_minutes: etaMinutes,
      },
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
