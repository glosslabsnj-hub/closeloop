/**
 * Distance-aware ETA Computation
 *
 * Computes driving distance/time between tenant's base address and a destination.
 * Supports multiple providers: Mapbox (preferred), Google, OSRM.
 *
 * Configuration sources (in priority order):
 * 1. tenants table columns (distance_provider_enabled, distance_provider, etc.)
 * 2. tenant_distance_settings table (legacy, for Google provider)
 *
 * Provider keys are NEVER stored in DB - they are platform env vars:
 * - MAPBOX_ACCESS_TOKEN
 * - GOOGLE_DISTANCE_MATRIX_API_KEY
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============= TYPES =============

export interface DistanceEtaInput {
  supabase: SupabaseClient;
  tenantId: string;
  destinationAddress: string;
  /** Optional: pre-geocoded destination coordinates */
  destinationLat?: number;
  destinationLng?: number;
}

export interface DistanceEtaResult {
  ok: boolean;
  distance_miles: number | null;
  drive_minutes: number | null;
  rounded_travel_minutes: number | null;
  provider_used: "google" | "mapbox" | "osrm" | "fallback_per_mile" | "none";
  max_distance_exceeded: boolean;
  error: string | null;
}

/** Tenant columns for distance configuration */
interface TenantDistanceConfig {
  address: string | null;
  base_lat: number | null;
  base_lng: number | null;
  distance_provider: string;
  distance_provider_enabled: boolean;
  mapbox_route_profile: string;
  eta_base_minutes: number;
  eta_per_mile_minutes: number;
  eta_min_minutes: number | null;
  eta_max_minutes: number | null;
}

/** tenant_distance_settings table (Business Brain) */
interface DistanceSettings {
  tenant_id: string;
  distance_provider_enabled: boolean;
  provider: string;
  base_lat: number | null;
  base_lng: number | null;
  base_place_name: string | null;
  mapbox_route_profile: string;
  eta_base_minutes: number;
  eta_per_mile_minutes: number | null;
  eta_min_minutes: number | null;
  eta_max_minutes: number | null;
  eta_rounding_minutes: number;
}

interface GoogleDistanceMatrixResponse {
  status: string;
  rows?: Array<{
    elements?: Array<{
      status: string;
      distance?: { value: number; text: string };
      duration?: { value: number; text: string };
    }>;
  }>;
  error_message?: string;
}

interface MapboxDirectionsResponse {
  code: string;
  routes?: Array<{
    distance: number; // meters
    duration: number; // seconds
  }>;
  message?: string;
}

interface MapboxGeocodingResponse {
  features?: Array<{
    geometry: {
      coordinates: [number, number]; // [lng, lat]
    };
    relevance: number;
  }>;
}

// ============= CONSTANTS =============

const METERS_PER_MILE = 1609.344;
const SECONDS_PER_MINUTE = 60;

// ============= MAIN FUNCTION =============

/**
 * Compute distance-aware travel time for ETA.
 *
 * Priority:
 * 1. If tenant has distance_provider_enabled=true, use tenants table config (Mapbox/etc)
 * 2. Otherwise fall back to tenant_distance_settings table (legacy Google)
 *
 * @param input - tenantId (trusted), supabase client, destination address
 * @returns Structured result with distance, time, and provider info
 */
export async function computeDistanceEta(
  input: DistanceEtaInput
): Promise<DistanceEtaResult> {
  const { supabase, tenantId, destinationAddress, destinationLat, destinationLng } = input;

  // Default "disabled" result (Golden Path safe - no nulls that break ElevenLabs)
  const disabledResult: DistanceEtaResult = {
    ok: true,
    distance_miles: null,
    drive_minutes: null,
    rounded_travel_minutes: null,
    provider_used: "none",
    max_distance_exceeded: false,
    error: null,
  };

  try {
    // Validate destination (need either address or coordinates)
    const hasAddress = destinationAddress && destinationAddress.trim().length >= 5;
    const hasCoords = destinationLat !== undefined && destinationLng !== undefined;

    if (!hasAddress && !hasCoords) {
      return {
        ...disabledResult,
        ok: false,
        error: "Invalid or missing destination address/coordinates",
      };
    }

    // ===== 1. Fetch tenant config (includes new distance columns) =====
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select(`
        address,
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
      console.error("[distance_eta] Tenant fetch error:", tenantError?.message);
      return {
        ...disabledResult,
        ok: false,
        error: "Failed to fetch tenant data",
      };
    }

    // Type-safe config with null-safe defaults
    const tenantConfig: TenantDistanceConfig = {
      address: tenant.address ?? null,
      base_lat: tenant.base_lat ?? null,
      base_lng: tenant.base_lng ?? null,
      distance_provider: tenant.distance_provider ?? "mapbox",
      distance_provider_enabled: tenant.distance_provider_enabled ?? false,
      mapbox_route_profile: tenant.mapbox_route_profile ?? "mapbox/driving-traffic",
      eta_base_minutes: tenant.eta_base_minutes ?? 0,
      eta_per_mile_minutes: tenant.eta_per_mile_minutes ?? 0,
      eta_min_minutes: tenant.eta_min_minutes ?? null,
      eta_max_minutes: tenant.eta_max_minutes ?? null,
    };

    // ===== 2. Check if new distance system is enabled =====
    if (tenantConfig.distance_provider_enabled) {
      return await computeDistanceEtaV2(supabase, tenantId, tenantConfig, {
        address: destinationAddress,
        lat: destinationLat,
        lng: destinationLng,
      });
    }

    // ===== 3. Fall back to legacy tenant_distance_settings =====
    const { data: settings, error: settingsError } = await supabase
      .from("tenant_distance_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (settingsError) {
      console.error("[distance_eta] Settings fetch error:", settingsError.message);
      return {
        ...disabledResult,
        ok: false,
        error: "Failed to fetch distance settings",
      };
    }

    // If no settings row or disabled, return early
    if (!settings || !settings.distance_provider_enabled) {
      logDistanceEta(tenantId, "none", true, false, "disabled_or_no_config");
      return disabledResult;
    }

    const distanceSettings = settings as DistanceSettings;

    // Get origin coordinates (prefer base_lat/lng from settings, fallback to tenant address)
    let originLat = distanceSettings.base_lat;
    let originLng = distanceSettings.base_lng;
    const originAddress = tenantConfig.address;

    if ((originLat === null || originLng === null) && (!originAddress || originAddress.trim().length < 5)) {
      logDistanceEta(tenantId, "none", false, false, "missing_origin_coords_and_address");
      return {
        ...disabledResult,
        ok: false,
        error: "Tenant base location not configured (no coordinates or address)",
      };
    }

    // ===== 4. Call distance provider =====
    let providerResult: {
      ok: boolean;
      distance_meters: number | null;
      duration_seconds: number | null;
      error: string | null;
    } = { ok: false, distance_meters: null, duration_seconds: null, error: null };

    const provider = distanceSettings.provider;
    const routeProfile = distanceSettings.mapbox_route_profile || "mapbox/driving-traffic";

    if (provider === "google") {
      // Google needs address strings
      const originStr = originAddress || `${originLat},${originLng}`;
      providerResult = await callGoogleDistanceMatrix(originStr, destinationAddress);
    } else if (provider === "mapbox") {
      // Mapbox can use coordinates or addresses
      if (originLat !== null && originLng !== null) {
        providerResult = await callMapboxDirections(
          { lat: originLat, lng: originLng },
          { address: destinationAddress },
          routeProfile
        );
      } else if (originAddress) {
        providerResult = await callMapboxDirections(
          { address: originAddress },
          { address: destinationAddress },
          routeProfile
        );
      }
    } else if (provider === "osrm") {
      providerResult = { ok: false, distance_meters: null, duration_seconds: null, error: "OSRM provider not yet implemented" };
    } else if (provider === "none") {
      logDistanceEta(tenantId, "none", true, false, "provider_disabled");
      return disabledResult;
    } else {
      providerResult = { ok: false, distance_meters: null, duration_seconds: null, error: `Unknown provider: ${provider}` };
    }

    // ===== 5. Handle provider result or fallback =====
    let distance_miles: number | null = null;
    let drive_minutes: number | null = null;
    let provider_used: DistanceEtaResult["provider_used"] = "none";

    if (providerResult.ok && providerResult.distance_meters !== null && providerResult.duration_seconds !== null) {
      distance_miles = providerResult.distance_meters / METERS_PER_MILE;
      drive_minutes = providerResult.duration_seconds / SECONDS_PER_MINUTE;
      provider_used = provider as DistanceEtaResult["provider_used"];
    } else {
      // Use eta_per_mile_minutes as fallback if configured
      const etaPerMile = distanceSettings.eta_per_mile_minutes;
      if (etaPerMile !== null && etaPerMile > 0 && providerResult.distance_meters !== null) {
        distance_miles = providerResult.distance_meters / METERS_PER_MILE;
        drive_minutes = distanceSettings.eta_base_minutes + distance_miles * etaPerMile;
        provider_used = "fallback_per_mile";
        console.log(`[distance_eta] Using fallback: ${distanceSettings.eta_base_minutes} base + ${distance_miles.toFixed(2)} mi * ${etaPerMile} = ${drive_minutes.toFixed(1)} min`);
      } else {
        logDistanceEta(tenantId, "none", false, false, providerResult.error || "provider_failed");
        return {
          ...disabledResult,
          ok: false,
          error: providerResult.error || "Distance provider failed and no fallback configured",
        };
      }
    }

    // Add base prep time
    drive_minutes += distanceSettings.eta_base_minutes;

    // Apply min/max clamps
    if (distanceSettings.eta_min_minutes !== null && drive_minutes < distanceSettings.eta_min_minutes) {
      drive_minutes = distanceSettings.eta_min_minutes;
    }
    if (distanceSettings.eta_max_minutes !== null && drive_minutes > distanceSettings.eta_max_minutes) {
      drive_minutes = distanceSettings.eta_max_minutes;
    }

    // ===== 6. Apply rounding =====
    const roundingMinutes = distanceSettings.eta_rounding_minutes || 5;
    const rounded_travel_minutes = Math.ceil(drive_minutes / roundingMinutes) * roundingMinutes;

    // ===== 7. Check max distance cutoff (use eta_max_minutes as proxy) =====
    const max_distance_exceeded = false; // Removed - use eta_max_minutes clamping instead

    logDistanceEta(tenantId, provider_used, true, max_distance_exceeded, null);

    return {
      ok: true,
      distance_miles: Math.round(distance_miles * 100) / 100,
      drive_minutes: Math.round(drive_minutes * 10) / 10,
      rounded_travel_minutes,
      provider_used,
      max_distance_exceeded,
      error: null,
    };
  } catch (error) {
    console.error("[distance_eta] Unexpected error:", error);
    return {
      ...disabledResult,
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected error computing distance",
    };
  }
}

// ============= V2: NEW DISTANCE SYSTEM (tenants table columns) =============

/**
 * New distance computation using tenants table columns.
 * Supports Mapbox with geocoding and route caching.
 */
async function computeDistanceEtaV2(
  supabase: SupabaseClient,
  tenantId: string,
  config: TenantDistanceConfig,
  destination: { address?: string; lat?: number; lng?: number }
): Promise<DistanceEtaResult> {
  const disabledResult: DistanceEtaResult = {
    ok: true,
    distance_miles: null,
    drive_minutes: null,
    rounded_travel_minutes: null,
    provider_used: "none",
    max_distance_exceeded: false,
    error: null,
  };

  // Get origin coordinates (from tenant's base_lat/base_lng or geocode address)
  let originLat = config.base_lat;
  let originLng = config.base_lng;

  if (originLat === null || originLng === null) {
    if (!config.address || config.address.trim().length < 5) {
      logDistanceEta(tenantId, "none", false, false, "missing_origin_coords_and_address");
      return {
        ...disabledResult,
        ok: false,
        error: "Tenant base location not configured (no coordinates or address)",
      };
    }

    // Geocode the tenant's address
    const geocoded = await geocodeAddress(supabase, tenantId, config.address);
    if (!geocoded.ok || geocoded.lat === null || geocoded.lng === null) {
      logDistanceEta(tenantId, "none", false, false, "geocode_origin_failed");
      return {
        ...disabledResult,
        ok: false,
        error: geocoded.error || "Failed to geocode tenant base address",
      };
    }
    originLat = geocoded.lat;
    originLng = geocoded.lng;
  }

  // Get destination coordinates
  let destLat = destination.lat;
  let destLng = destination.lng;

  if (destLat === undefined || destLng === undefined) {
    if (!destination.address || destination.address.trim().length < 5) {
      return {
        ...disabledResult,
        ok: false,
        error: "Invalid destination (no coordinates or address)",
      };
    }

    // Geocode the destination address
    const geocoded = await geocodeAddress(supabase, tenantId, destination.address);
    if (!geocoded.ok || geocoded.lat === null || geocoded.lng === null) {
      return {
        ...disabledResult,
        ok: false,
        error: geocoded.error || "Failed to geocode destination address",
      };
    }
    destLat = geocoded.lat;
    destLng = geocoded.lng;
  }

  // Call routing provider
  const provider = config.distance_provider;
  let providerResult: {
    ok: boolean;
    distance_meters: number | null;
    duration_seconds: number | null;
    error: string | null;
  };

  if (provider === "mapbox") {
    providerResult = await callMapboxDirections(
      { lat: originLat, lng: originLng },
      { lat: destLat, lng: destLng },
      config.mapbox_route_profile
    );
  } else if (provider === "google") {
    // For Google, we need addresses not coords (or use a different API)
    const originAddr = config.address || `${originLat},${originLng}`;
    const destAddr = destination.address || `${destLat},${destLng}`;
    providerResult = await callGoogleDistanceMatrix(originAddr, destAddr);
  } else if (provider === "none") {
    // Use simple linear estimation
    const straightLineMiles = haversineDistanceMiles(originLat, originLng, destLat, destLng);
    const estimatedDriveMiles = straightLineMiles * 1.3; // ~30% more than straight line
    providerResult = {
      ok: true,
      distance_meters: estimatedDriveMiles * METERS_PER_MILE,
      duration_seconds: (config.eta_base_minutes + estimatedDriveMiles * config.eta_per_mile_minutes) * 60,
      error: null,
    };
  } else {
    providerResult = { ok: false, distance_meters: null, duration_seconds: null, error: `Unknown provider: ${provider}` };
  }

  if (!providerResult.ok || providerResult.distance_meters === null || providerResult.duration_seconds === null) {
    // Use eta_per_mile_minutes as fallback if configured
    if (config.eta_per_mile_minutes > 0) {
      const straightLineMiles = haversineDistanceMiles(originLat, originLng, destLat, destLng);
      const estimatedDriveMiles = straightLineMiles * 1.3;
      const drive_minutes = config.eta_base_minutes + estimatedDriveMiles * config.eta_per_mile_minutes;

      logDistanceEta(tenantId, "fallback_per_mile", true, false, "provider_failed_using_eta_per_mile");

      return {
        ok: true,
        distance_miles: Math.round(estimatedDriveMiles * 100) / 100,
        drive_minutes: Math.round(drive_minutes * 10) / 10,
        rounded_travel_minutes: Math.ceil(drive_minutes / 5) * 5,
        provider_used: "fallback_per_mile",
        max_distance_exceeded: false,
        error: null,
      };
    }

    logDistanceEta(tenantId, "none", false, false, providerResult.error || "provider_failed");
    return {
      ...disabledResult,
      ok: false,
      error: providerResult.error || "Distance provider failed",
    };
  }

  // Calculate final values
  let distance_miles = providerResult.distance_meters / METERS_PER_MILE;
  let drive_minutes = providerResult.duration_seconds / SECONDS_PER_MINUTE;

  // Add base prep time
  drive_minutes += config.eta_base_minutes;

  // Apply min/max constraints
  if (config.eta_min_minutes !== null && drive_minutes < config.eta_min_minutes) {
    drive_minutes = config.eta_min_minutes;
  }
  if (config.eta_max_minutes !== null && drive_minutes > config.eta_max_minutes) {
    drive_minutes = config.eta_max_minutes;
  }

  // Round to nearest 5 minutes
  const rounded_travel_minutes = Math.ceil(drive_minutes / 5) * 5;

  const provider_used = provider === "none" ? "fallback_per_mile" : provider as DistanceEtaResult["provider_used"];
  logDistanceEta(tenantId, provider_used, true, false, null);

  return {
    ok: true,
    distance_miles: Math.round(distance_miles * 100) / 100,
    drive_minutes: Math.round(drive_minutes * 10) / 10,
    rounded_travel_minutes,
    provider_used,
    max_distance_exceeded: false,
    error: null,
  };
}

// ============= GOOGLE DISTANCE MATRIX =============

async function callGoogleDistanceMatrix(
  origin: string,
  destination: string
): Promise<{
  ok: boolean;
  distance_meters: number | null;
  duration_seconds: number | null;
  error: string | null;
}> {
  const apiKey = Deno.env.get("GOOGLE_DISTANCE_MATRIX_API_KEY");

  if (!apiKey) {
    console.error("[distance_eta] GOOGLE_DISTANCE_MATRIX_API_KEY not configured");
    return {
      ok: false,
      distance_meters: null,
      duration_seconds: null,
      error: "Google Distance Matrix API key not configured",
    };
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", origin);
    url.searchParams.set("destinations", destination);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("units", "imperial");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      console.error("[distance_eta] Google API HTTP error:", response.status);
      return {
        ok: false,
        distance_meters: null,
        duration_seconds: null,
        error: `Google API returned HTTP ${response.status}`,
      };
    }

    const data: GoogleDistanceMatrixResponse = await response.json();

    if (data.status !== "OK") {
      console.error("[distance_eta] Google API status:", data.status, data.error_message);
      return {
        ok: false,
        distance_meters: null,
        duration_seconds: null,
        error: data.error_message || `Google API status: ${data.status}`,
      };
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") {
      const elementStatus = element?.status || "NO_ELEMENT";
      console.error("[distance_eta] Google element status:", elementStatus);
      return {
        ok: false,
        distance_meters: null,
        duration_seconds: null,
        error: `Route not found: ${elementStatus}`,
      };
    }

    const distance_meters = element.distance?.value ?? null;
    const duration_seconds = element.duration?.value ?? null;

    if (distance_meters === null || duration_seconds === null) {
      return {
        ok: false,
        distance_meters,
        duration_seconds,
        error: "Missing distance or duration in response",
      };
    }

    console.log(`[distance_eta] Google result: ${element.distance?.text}, ${element.duration?.text}`);

    return {
      ok: true,
      distance_meters,
      duration_seconds,
      error: null,
    };
  } catch (error) {
    console.error("[distance_eta] Google API call failed:", error);
    return {
      ok: false,
      distance_meters: null,
      duration_seconds: null,
      error: error instanceof Error ? error.message : "Google API call failed",
    };
  }
}

// ============= MAPBOX DIRECTIONS =============

/**
 * Call Mapbox Directions API for routing.
 * Supports both coordinates and addresses (addresses will be geocoded first).
 */
async function callMapboxDirections(
  origin: { lat?: number; lng?: number; address?: string },
  destination: { lat?: number; lng?: number; address?: string },
  routeProfile: string = "mapbox/driving-traffic"
): Promise<{
  ok: boolean;
  distance_meters: number | null;
  duration_seconds: number | null;
  error: string | null;
}> {
  const accessToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");

  if (!accessToken) {
    console.error("[distance_eta] MAPBOX_ACCESS_TOKEN not configured");
    return {
      ok: false,
      distance_meters: null,
      duration_seconds: null,
      error: "Mapbox API token not configured",
    };
  }

  try {
    // Get coordinates (geocode if needed)
    let originLng: number, originLat: number;
    let destLng: number, destLat: number;

    if (origin.lat !== undefined && origin.lng !== undefined) {
      originLat = origin.lat;
      originLng = origin.lng;
    } else if (origin.address) {
      const geocoded = await geocodeWithMapbox(origin.address, accessToken);
      if (!geocoded.ok) {
        return { ok: false, distance_meters: null, duration_seconds: null, error: geocoded.error || "Failed to geocode origin" };
      }
      originLat = geocoded.lat!;
      originLng = geocoded.lng!;
    } else {
      return { ok: false, distance_meters: null, duration_seconds: null, error: "Origin missing coordinates and address" };
    }

    if (destination.lat !== undefined && destination.lng !== undefined) {
      destLat = destination.lat;
      destLng = destination.lng;
    } else if (destination.address) {
      const geocoded = await geocodeWithMapbox(destination.address, accessToken);
      if (!geocoded.ok) {
        return { ok: false, distance_meters: null, duration_seconds: null, error: geocoded.error || "Failed to geocode destination" };
      }
      destLat = geocoded.lat!;
      destLng = geocoded.lng!;
    } else {
      return { ok: false, distance_meters: null, duration_seconds: null, error: "Destination missing coordinates and address" };
    }

    // Extract profile from "mapbox/driving-traffic" -> "driving-traffic"
    const profile = routeProfile.replace("mapbox/", "");

    // Call Mapbox Directions API
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${originLng},${originLat};${destLng},${destLat}?access_token=${accessToken}&overview=false`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      console.error("[distance_eta] Mapbox API HTTP error:", response.status);
      return {
        ok: false,
        distance_meters: null,
        duration_seconds: null,
        error: `Mapbox API returned HTTP ${response.status}`,
      };
    }

    const data: MapboxDirectionsResponse = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      console.error("[distance_eta] Mapbox API error:", data.code, data.message);
      return {
        ok: false,
        distance_meters: null,
        duration_seconds: null,
        error: data.message || `Mapbox error: ${data.code}`,
      };
    }

    const route = data.routes[0];
    console.log(`[distance_eta] Mapbox result: ${(route.distance / METERS_PER_MILE).toFixed(2)} mi, ${(route.duration / 60).toFixed(1)} min`);

    return {
      ok: true,
      distance_meters: route.distance,
      duration_seconds: route.duration,
      error: null,
    };
  } catch (error) {
    console.error("[distance_eta] Mapbox API call failed:", error);
    return {
      ok: false,
      distance_meters: null,
      duration_seconds: null,
      error: error instanceof Error ? error.message : "Mapbox API call failed",
    };
  }
}

/**
 * Geocode an address using Mapbox Geocoding API (direct call, no caching).
 */
async function geocodeWithMapbox(
  address: string,
  accessToken: string
): Promise<{ ok: boolean; lat: number | null; lng: number | null; error: string | null }> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${accessToken}&limit=1`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      return { ok: false, lat: null, lng: null, error: `Mapbox Geocoding HTTP ${response.status}` };
    }

    const data: MapboxGeocodingResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return { ok: false, lat: null, lng: null, error: "Address not found" };
    }

    const [lng, lat] = data.features[0].geometry.coordinates;
    return { ok: true, lat, lng, error: null };
  } catch (error) {
    return {
      ok: false,
      lat: null,
      lng: null,
      error: error instanceof Error ? error.message : "Geocoding failed",
    };
  }
}

// ============= GEOCODING WITH CACHE =============

/**
 * Geocode an address with caching (tenant-scoped).
 * Checks geocode_cache first, then calls Mapbox if not found.
 */
async function geocodeAddress(
  supabase: SupabaseClient,
  tenantId: string,
  address: string
): Promise<{ ok: boolean; lat: number | null; lng: number | null; error: string | null }> {
  const accessToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
  if (!accessToken) {
    return { ok: false, lat: null, lng: null, error: "MAPBOX_ACCESS_TOKEN not configured" };
  }

  // Normalize and hash address for cache lookup
  const normalizedAddress = address.trim().toLowerCase().replace(/\s+/g, " ");
  const addressHash = await hashString(normalizedAddress);

  // Check cache first
  const { data: cached } = await supabase
    .from("geocode_cache")
    .select("lat, lng")
    .eq("tenant_id", tenantId)
    .eq("address_hash", addressHash)
    .eq("provider", "mapbox")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) {
    console.log(`[distance_eta] Geocode cache hit for hash ${addressHash.substring(0, 8)}...`);
    return { ok: true, lat: cached.lat, lng: cached.lng, error: null };
  }

  // Call Mapbox Geocoding
  const result = await geocodeWithMapbox(address, accessToken);

  if (result.ok && result.lat !== null && result.lng !== null) {
    // Store in cache (fire-and-forget, don't block on insert)
    supabase
      .from("geocode_cache")
      .upsert({
        tenant_id: tenantId,
        address_hash: addressHash,
        lat: result.lat,
        lng: result.lng,
        confidence: "high",
        provider: "mapbox",
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      }, { onConflict: "tenant_id,address_hash,provider" })
      .then(() => {
        console.log(`[distance_eta] Geocode cached for hash ${addressHash.substring(0, 8)}...`);
      })
      .catch((err) => {
        console.warn(`[distance_eta] Failed to cache geocode:`, err.message);
      });
  }

  return result;
}

/**
 * Hash a string using SHA-256 (Web Crypto API).
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ============= LOGGING =============

function logDistanceEta(
  tenantId: string,
  provider: string,
  ok: boolean,
  maxExceeded: boolean,
  reason: string | null
): void {
  // Log with truncated tenant ID (no PII)
  const shortTenant = tenantId.substring(0, 8);
  console.log(
    `[distance_eta] tenant=${shortTenant}... provider=${provider} ok=${ok} max_exceeded=${maxExceeded}${reason ? ` reason=${reason}` : ""}`
  );
}

// ============= HAVERSINE DISTANCE (for fallback estimation) =============

/**
 * Calculate straight-line distance between two lat/lng points.
 * Used for fallback estimation when provider fails but we have coordinates.
 */
export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
