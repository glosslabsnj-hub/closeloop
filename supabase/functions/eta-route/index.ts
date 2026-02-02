/**
 * ETA Route Edge Function
 *
 * Calculates distance and duration between two addresses using Mapbox.
 * Results are cached in eta_routes_cache (HIPAA-safe: hashed addresses only).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAPBOX_ACCESS_TOKEN = Deno.env.get("MAPBOX_ACCESS_TOKEN");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// Types
// ============================================================================

interface EtaRouteRequest {
  origin_address: string;
  destination_address: string;
  tenant_id: string;
  skip_cache?: boolean;
}

interface EtaRouteResponse {
  distance_miles: number | null;
  duration_minutes: number | null;
  confidence: "high" | "medium" | "low";
  provider: "mapbox" | "none";
  cached: boolean;
  error?: string;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  confidence: "high" | "medium" | "low";
  place_type: string;
}

// ============================================================================
// Helpers
// ============================================================================

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

/**
 * Normalize address for consistent hashing
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,#\-']/g, "");
}

/**
 * SHA-256 hash of normalized address
 */
async function hashAddress(address: string): Promise<string> {
  const normalized = normalizeAddress(address);
  const data = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Determine geocode confidence based on Mapbox place_type
 */
function getGeocodeConfidence(placeType: string): "high" | "medium" | "low" {
  // High confidence: exact address match
  if (placeType === "address" || placeType === "poi") {
    return "high";
  }
  // Medium confidence: place-level (neighborhood, postcode, locality)
  if (["place", "locality", "neighborhood", "postcode"].includes(placeType)) {
    return "medium";
  }
  // Low confidence: region, country, or unknown
  return "low";
}

/**
 * Geocode an address using Mapbox Geocoding API
 */
async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    return null;
  }

  const encodedAddress = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[eta-route] Geocode failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      console.log(`[eta-route] No geocode results for address`);
      return null;
    }

    const feature = data.features[0];
    const [lng, lat] = feature.center;
    const placeType = feature.place_type?.[0] || "unknown";

    return {
      lat,
      lng,
      confidence: getGeocodeConfidence(placeType),
      place_type: placeType,
    };
  } catch (error) {
    console.error(`[eta-route] Geocode error:`, error);
    return null;
  }
}

/**
 * Get route between two coordinates using Mapbox Directions API
 */
async function getRoute(
  origin: GeocodeResult,
  destination: GeocodeResult
): Promise<{ distance_miles: number; duration_minutes: number } | null> {
  if (!MAPBOX_ACCESS_TOKEN) {
    return null;
  }

  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?access_token=${MAPBOX_ACCESS_TOKEN}&overview=false`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[eta-route] Directions failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      console.log(`[eta-route] No route found`);
      return null;
    }

    const route = data.routes[0];
    // Mapbox returns distance in meters, duration in seconds
    const distance_miles = route.distance / 1609.344;
    const duration_minutes = Math.round(route.duration / 60);

    return { distance_miles, duration_minutes };
  } catch (error) {
    console.error(`[eta-route] Directions error:`, error);
    return null;
  }
}

/**
 * Check cache for existing route
 */
async function checkCache(
  tenantId: string,
  originHash: string,
  destinationHash: string
): Promise<EtaRouteResponse | null> {
  const { data, error } = await supabase
    .from("eta_routes_cache")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("origin_hash", originHash)
    .eq("destination_hash", destinationHash)
    .eq("provider", "mapbox")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    distance_miles: data.distance_miles,
    duration_minutes: data.duration_minutes,
    confidence: data.confidence as "high" | "medium" | "low",
    provider: "mapbox",
    cached: true,
  };
}

/**
 * Store route in cache
 */
async function storeCache(
  tenantId: string,
  originHash: string,
  destinationHash: string,
  result: { distance_miles: number; duration_minutes: number; confidence: string }
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 day TTL

  await supabase.from("eta_routes_cache").upsert(
    {
      tenant_id: tenantId,
      origin_hash: originHash,
      destination_hash: destinationHash,
      distance_miles: result.distance_miles,
      duration_minutes: result.duration_minutes,
      confidence: result.confidence,
      provider: "mapbox",
      expires_at: expiresAt.toISOString(),
    },
    {
      onConflict: "tenant_id,origin_hash,destination_hash,provider",
    }
  );
}

/**
 * Log ETA event (HIPAA-safe: no raw addresses)
 */
async function logEtaEvent(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("ai_event_logs").insert({
      tenant_id: tenantId,
      stage: eventType,
      event_data: payload,
    });
  } catch (e) {
    console.error(`[eta-route] Failed to log event:`, e);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json(405, { error: "POST only" });
    }

    const body: EtaRouteRequest = await req.json();
    const { origin_address, destination_address, tenant_id, skip_cache } = body;

    // Validate required fields
    if (!origin_address || !destination_address || !tenant_id) {
      return json(400, {
        error: "Missing required fields: origin_address, destination_address, tenant_id",
      });
    }

    // Check if Mapbox token is configured
    if (!MAPBOX_ACCESS_TOKEN) {
      await logEtaEvent(tenant_id, "eta_fallback", {
        reason: "mapbox_token_not_configured",
        provider: "none",
      });

      return json(200, {
        distance_miles: null,
        duration_minutes: null,
        confidence: "low",
        provider: "none",
        cached: false,
        error: "Mapbox provider not configured",
      } as EtaRouteResponse);
    }

    // Hash addresses for cache lookup and logging
    const originHash = await hashAddress(origin_address);
    const destinationHash = await hashAddress(destination_address);

    // Check cache first (unless skip_cache is true)
    if (!skip_cache) {
      const cachedResult = await checkCache(tenant_id, originHash, destinationHash);
      if (cachedResult) {
        await logEtaEvent(tenant_id, "eta_computed", {
          provider: "mapbox",
          cached: true,
          distance_miles: cachedResult.distance_miles,
          duration_minutes: cachedResult.duration_minutes,
          confidence: cachedResult.confidence,
        });

        return json(200, cachedResult);
      }
    }

    // Geocode both addresses
    const originGeo = await geocodeAddress(origin_address);
    const destinationGeo = await geocodeAddress(destination_address);

    if (!originGeo || !destinationGeo) {
      const missingOrigin = !originGeo;
      const missingDestination = !destinationGeo;

      await logEtaEvent(tenant_id, "eta_blocked_missing_address", {
        origin_geocoded: !missingOrigin,
        destination_geocoded: !missingDestination,
        provider: "mapbox",
      });

      return json(200, {
        distance_miles: null,
        duration_minutes: null,
        confidence: "low",
        provider: "none",
        cached: false,
        error: missingOrigin && missingDestination
          ? "Could not geocode origin or destination"
          : missingOrigin
          ? "Could not geocode origin address"
          : "Could not geocode destination address",
      } as EtaRouteResponse);
    }

    // Get route
    const route = await getRoute(originGeo, destinationGeo);

    if (!route) {
      await logEtaEvent(tenant_id, "eta_fallback", {
        reason: "route_calculation_failed",
        origin_confidence: originGeo.confidence,
        destination_confidence: destinationGeo.confidence,
        provider: "mapbox",
      });

      return json(200, {
        distance_miles: null,
        duration_minutes: null,
        confidence: "low",
        provider: "none",
        cached: false,
        error: "Could not calculate route",
      } as EtaRouteResponse);
    }

    // Determine overall confidence (use lower of the two geocode confidences)
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    const overallConfidence =
      confidenceOrder[originGeo.confidence] <= confidenceOrder[destinationGeo.confidence]
        ? originGeo.confidence
        : destinationGeo.confidence;

    // Store in cache
    await storeCache(tenant_id, originHash, destinationHash, {
      distance_miles: route.distance_miles,
      duration_minutes: route.duration_minutes,
      confidence: overallConfidence,
    });

    // Log success
    await logEtaEvent(tenant_id, "eta_computed", {
      provider: "mapbox",
      cached: false,
      distance_miles: route.distance_miles,
      duration_minutes: route.duration_minutes,
      confidence: overallConfidence,
      origin_place_type: originGeo.place_type,
      destination_place_type: destinationGeo.place_type,
    });

    const result: EtaRouteResponse = {
      distance_miles: Math.round(route.distance_miles * 100) / 100,
      duration_minutes: route.duration_minutes,
      confidence: overallConfidence,
      provider: "mapbox",
      cached: false,
    };

    return json(200, result);
  } catch (error) {
    console.error("[eta-route] Error:", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
