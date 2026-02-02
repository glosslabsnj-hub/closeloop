/**
 * Mapbox Distance + ETA Utility
 *
 * Clean, tenant-isolated distance/ETA computation using Mapbox APIs.
 * Supports geocoding and route caching for performance.
 *
 * Usage:
 *   import { computeTenantEta } from "../_shared/mapbox_distance.ts";
 *   const result = await computeTenantEta({ supabase, tenantId, destinationText: "123 Main St" });
 *
 * Required env: MAPBOX_ACCESS_TOKEN
 * Never exposes secrets or crosses tenant boundaries.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============= TYPES =============

export interface GeocodeResult {
  ok: boolean;
  lat: number | null;
  lng: number | null;
  place_name: string | null;
  used_cache: boolean;
  error: string | null;
}

export interface RouteResult {
  ok: boolean;
  distance_meters: number | null;
  duration_seconds: number | null;
  used_cache: boolean;
  error: string | null;
}

export interface TenantEtaResult {
  ok: boolean;
  distance_miles: number | null;
  drive_minutes: number | null;
  eta_minutes: number | null;
  provider_used: "mapbox" | "none";
  used_cache_geocode: boolean;
  used_cache_route: boolean;
  max_distance_exceeded: boolean;
  error: string | null;
}

interface TenantDistanceRow {
  base_lat: number | null;
  base_lng: number | null;
  distance_provider: string | null;
  distance_provider_enabled: boolean | null;
  mapbox_route_profile: string | null;
  eta_base_minutes: number | null;
  eta_per_mile_minutes: number | null;
  eta_min_minutes: number | null;
  eta_max_minutes: number | null;
}

interface MapboxGeocodingFeature {
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
  place_name: string;
  relevance: number;
}

interface MapboxGeocodingResponse {
  features?: MapboxGeocodingFeature[];
}

interface MapboxDirectionsResponse {
  code: string;
  routes?: Array<{
    distance: number; // meters
    duration: number; // seconds
  }>;
  message?: string;
}

// ============= CONSTANTS =============

const METERS_PER_MILE = 1609.344;
const CACHE_TTL_GEOCODE_DAYS = 30;
const CACHE_TTL_ROUTE_DAYS = 7;

// ============= GEOCODING =============

/**
 * Geocode an address with tenant-scoped caching.
 *
 * @param params.supabase - Supabase client (service role for cache writes)
 * @param params.tenantId - Tenant UUID for cache scoping
 * @param params.inputText - Address or place name to geocode
 * @returns GeocodeResult with lat/lng and cache status
 */
export async function geocodeAddress(params: {
  supabase: SupabaseClient;
  tenantId: string;
  inputText: string;
}): Promise<GeocodeResult> {
  const { supabase, tenantId, inputText } = params;

  const disabledResult: GeocodeResult = {
    ok: false,
    lat: null,
    lng: null,
    place_name: null,
    used_cache: false,
    error: null,
  };

  try {
    // Validate input
    if (!inputText || inputText.trim().length < 3) {
      return { ...disabledResult, error: "Address text too short" };
    }

    const accessToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!accessToken) {
      return { ...disabledResult, error: "MAPBOX_ACCESS_TOKEN not configured" };
    }

    // Normalize and hash for cache lookup
    const normalizedText = inputText.trim().toLowerCase().replace(/\s+/g, " ");
    const addressHash = await hashString(normalizedText);

    // Check cache first (tenant-scoped)
    const { data: cached } = await supabase
      .from("geocode_cache")
      .select("lat, lng")
      .eq("tenant_id", tenantId)
      .eq("address_hash", addressHash)
      .eq("provider", "mapbox")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached && cached.lat !== null && cached.lng !== null) {
      console.log(`[mapbox_distance] Geocode cache HIT for tenant ${tenantId.substring(0, 8)}...`);
      return {
        ok: true,
        lat: cached.lat,
        lng: cached.lng,
        place_name: null, // Cache doesn't store place_name
        used_cache: true,
        error: null,
      };
    }

    // Call Mapbox Geocoding API
    const encodedAddress = encodeURIComponent(inputText.trim());
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${accessToken}&limit=1`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return { ...disabledResult, error: `Mapbox Geocoding HTTP ${response.status}` };
    }

    const data: MapboxGeocodingResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return { ...disabledResult, error: "Address not found" };
    }

    const feature = data.features[0];
    const [lng, lat] = feature.geometry.coordinates;
    const placeName = feature.place_name;

    // Store in cache (fire-and-forget, don't block)
    const expiresAt = new Date(Date.now() + CACHE_TTL_GEOCODE_DAYS * 24 * 60 * 60 * 1000);
    (async () => {
      try {
        await supabase
          .from("geocode_cache")
          .upsert(
            {
              tenant_id: tenantId,
              address_hash: addressHash,
              lat,
              lng,
              confidence: "high",
              provider: "mapbox",
              fetched_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
            },
            { onConflict: "tenant_id,address_hash,provider" }
          );
        console.log(`[mapbox_distance] Geocode cached for tenant ${tenantId.substring(0, 8)}...`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.warn(`[mapbox_distance] Cache write failed:`, message);
      }
    })();

    return {
      ok: true,
      lat,
      lng,
      place_name: placeName,
      used_cache: false,
      error: null,
    };
  } catch (error) {
    console.error("[mapbox_distance] geocodeAddress error:", error);
    return {
      ...disabledResult,
      error: error instanceof Error ? error.message : "Geocoding failed",
    };
  }
}

// ============= ROUTING =============

/**
 * Get route duration/distance between two points with tenant-scoped caching.
 *
 * @param params.supabase - Supabase client
 * @param params.tenantId - Tenant UUID for cache scoping
 * @param params.origin - Origin coordinates { lat, lng }
 * @param params.dest - Destination coordinates { lat, lng }
 * @param params.profile - Mapbox route profile (default: "driving-traffic")
 * @returns RouteResult with distance/duration and cache status
 */
export async function routeDuration(params: {
  supabase: SupabaseClient;
  tenantId: string;
  origin: { lat: number; lng: number };
  dest: { lat: number; lng: number };
  profile?: string;
}): Promise<RouteResult> {
  const { supabase, tenantId, origin, dest, profile = "driving-traffic" } = params;

  const disabledResult: RouteResult = {
    ok: false,
    distance_meters: null,
    duration_seconds: null,
    used_cache: false,
    error: null,
  };

  try {
    const accessToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!accessToken) {
      return { ...disabledResult, error: "MAPBOX_ACCESS_TOKEN not configured" };
    }

    // Round coordinates for cache lookup (~11m precision)
    const roundedOriginLat = Math.round(origin.lat * 10000) / 10000;
    const roundedOriginLng = Math.round(origin.lng * 10000) / 10000;
    const roundedDestLat = Math.round(dest.lat * 10000) / 10000;
    const roundedDestLng = Math.round(dest.lng * 10000) / 10000;

    // Check route cache (tenant-scoped)
    const { data: cached } = await supabase
      .from("route_cache")
      .select("distance_miles, drive_time_minutes")
      .eq("tenant_id", tenantId)
      .eq("provider", "mapbox")
      .gte("origin_lat", roundedOriginLat - 0.0001)
      .lte("origin_lat", roundedOriginLat + 0.0001)
      .gte("origin_lng", roundedOriginLng - 0.0001)
      .lte("origin_lng", roundedOriginLng + 0.0001)
      .gte("dest_lat", roundedDestLat - 0.0001)
      .lte("dest_lat", roundedDestLat + 0.0001)
      .gte("dest_lng", roundedDestLng - 0.0001)
      .lte("dest_lng", roundedDestLng + 0.0001)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached && cached.distance_miles !== null && cached.drive_time_minutes !== null) {
      console.log(`[mapbox_distance] Route cache HIT for tenant ${tenantId.substring(0, 8)}...`);
      return {
        ok: true,
        distance_meters: cached.distance_miles * METERS_PER_MILE,
        duration_seconds: cached.drive_time_minutes * 60,
        used_cache: true,
        error: null,
      };
    }

    // Call Mapbox Directions API
    const cleanProfile = profile.replace("mapbox/", "");
    const url = `https://api.mapbox.com/directions/v5/mapbox/${cleanProfile}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?access_token=${accessToken}&overview=false`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return { ...disabledResult, error: `Mapbox Directions HTTP ${response.status}` };
    }

    const data: MapboxDirectionsResponse = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return {
        ...disabledResult,
        error: data.message || `Mapbox error: ${data.code}`,
      };
    }

    const route = data.routes[0];
    const distanceMeters = route.distance;
    const durationSeconds = route.duration;

    // Store in route cache (fire-and-forget)
    const expiresAt = new Date(Date.now() + CACHE_TTL_ROUTE_DAYS * 24 * 60 * 60 * 1000);
    (async () => {
      try {
        await supabase
          .from("route_cache")
          .insert({
            tenant_id: tenantId,
            origin_lat: roundedOriginLat,
            origin_lng: roundedOriginLng,
            dest_lat: roundedDestLat,
            dest_lng: roundedDestLng,
            distance_miles: distanceMeters / METERS_PER_MILE,
            drive_time_minutes: durationSeconds / 60,
            provider: "mapbox",
            route_profile: profile,
            fetched_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          });
        console.log(`[mapbox_distance] Route cached for tenant ${tenantId.substring(0, 8)}...`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        // Ignore duplicate key errors (concurrent requests)
        if (!message.includes("duplicate")) {
          console.warn(`[mapbox_distance] Route cache write failed:`, message);
        }
      }
    })();

    return {
      ok: true,
      distance_meters: distanceMeters,
      duration_seconds: durationSeconds,
      used_cache: false,
      error: null,
    };
  } catch (error) {
    console.error("[mapbox_distance] routeDuration error:", error);
    return {
      ...disabledResult,
      error: error instanceof Error ? error.message : "Route calculation failed",
    };
  }
}

// ============= TENANT ETA COMPUTATION =============

/**
 * Compute ETA for a tenant using their Mapbox configuration.
 *
 * Reads tenant config (base_lat/base_lng, distance_provider, etc.)
 * and computes distance-based ETA with caching.
 *
 * @param params.supabase - Supabase client (service role)
 * @param params.tenantId - Tenant UUID
 * @param params.destinationText - Destination address to compute ETA to
 * @returns TenantEtaResult with distance, ETA, cache status
 */
export async function computeTenantEta(params: {
  supabase: SupabaseClient;
  tenantId: string;
  destinationText: string;
}): Promise<TenantEtaResult> {
  const { supabase, tenantId, destinationText } = params;

  const disabledResult: TenantEtaResult = {
    ok: true,
    distance_miles: null,
    drive_minutes: null,
    eta_minutes: null,
    provider_used: "none",
    used_cache_geocode: false,
    used_cache_route: false,
    max_distance_exceeded: false,
    error: null,
  };

  try {
    // Check for MAPBOX_ACCESS_TOKEN
    const accessToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!accessToken) {
      console.log("[mapbox_distance] MAPBOX_ACCESS_TOKEN not set, returning disabled");
      return disabledResult;
    }

    // Fetch tenant distance config
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select(`
        base_lat,
        base_lng,
        distance_provider,
        distance_provider_enabled,
        mapbox_route_profile,
        eta_base_minutes,
        eta_per_mile_minutes,
        eta_min_minutes,
        eta_max_minutes
      `)
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error("[mapbox_distance] Tenant fetch error:", tenantError?.message);
      return {
        ...disabledResult,
        ok: false,
        error: "Tenant not found",
      };
    }

    const config: TenantDistanceRow = tenant;

    // Check if distance provider is enabled and is mapbox
    if (!config.distance_provider_enabled) {
      console.log(`[mapbox_distance] Distance provider disabled for tenant ${tenantId.substring(0, 8)}...`);
      return disabledResult;
    }

    if (config.distance_provider !== "mapbox") {
      console.log(`[mapbox_distance] Provider is ${config.distance_provider}, not mapbox`);
      return disabledResult;
    }

    // Check for base coordinates
    if (config.base_lat === null || config.base_lng === null) {
      return {
        ...disabledResult,
        ok: false,
        error: "Tenant base coordinates (base_lat/base_lng) not configured",
      };
    }

    // Validate destination
    if (!destinationText || destinationText.trim().length < 3) {
      return {
        ...disabledResult,
        ok: false,
        error: "Invalid destination address",
      };
    }

    // Geocode destination
    const geocodeResult = await geocodeAddress({
      supabase,
      tenantId,
      inputText: destinationText,
    });

    if (!geocodeResult.ok || geocodeResult.lat === null || geocodeResult.lng === null) {
      return {
        ...disabledResult,
        ok: false,
        used_cache_geocode: geocodeResult.used_cache,
        error: geocodeResult.error || "Failed to geocode destination",
      };
    }

    // Get route duration
    const profile = config.mapbox_route_profile || "mapbox/driving-traffic";
    const routeResult = await routeDuration({
      supabase,
      tenantId,
      origin: { lat: config.base_lat, lng: config.base_lng },
      dest: { lat: geocodeResult.lat, lng: geocodeResult.lng },
      profile,
    });

    if (!routeResult.ok || routeResult.distance_meters === null || routeResult.duration_seconds === null) {
      return {
        ...disabledResult,
        ok: false,
        used_cache_geocode: geocodeResult.used_cache,
        used_cache_route: routeResult.used_cache,
        error: routeResult.error || "Failed to calculate route",
      };
    }

    // Calculate ETA
    const distanceMiles = routeResult.distance_meters / METERS_PER_MILE;
    const driveMinutes = routeResult.duration_seconds / 60;

    // Apply ETA formula: base + (per_mile * miles)
    const etaBase = config.eta_base_minutes ?? 0;
    const etaPerMile = config.eta_per_mile_minutes ?? 0;
    let etaMinutes = driveMinutes + etaBase + etaPerMile * distanceMiles;

    // Apply min/max clamps
    if (config.eta_min_minutes !== null && etaMinutes < config.eta_min_minutes) {
      etaMinutes = config.eta_min_minutes;
    }
    if (config.eta_max_minutes !== null && etaMinutes > config.eta_max_minutes) {
      etaMinutes = config.eta_max_minutes;
    }

    // Round to nearest minute
    etaMinutes = Math.round(etaMinutes);

    console.log(
      `[mapbox_distance] ETA computed: ${distanceMiles.toFixed(2)} mi, ${driveMinutes.toFixed(1)} min drive, ${etaMinutes} min total`
    );

    return {
      ok: true,
      distance_miles: Math.round(distanceMiles * 100) / 100,
      drive_minutes: Math.round(driveMinutes * 10) / 10,
      eta_minutes: etaMinutes,
      provider_used: "mapbox",
      used_cache_geocode: geocodeResult.used_cache,
      used_cache_route: routeResult.used_cache,
      max_distance_exceeded: false,
      error: null,
    };
  } catch (error) {
    console.error("[mapbox_distance] computeTenantEta error:", error);
    return {
      ...disabledResult,
      ok: false,
      error: error instanceof Error ? error.message : "ETA computation failed",
    };
  }
}

// ============= HELPERS =============

/**
 * Hash a string using SHA-256 for cache keys.
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
