/**
 * Distance-aware ETA Computation
 *
 * Computes driving distance/time between tenant's base address and a destination.
 * Reads configuration from Business Brain (tenant_distance_settings).
 *
 * Provider keys are NEVER stored in DB - they are platform env vars.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============= TYPES =============

export interface DistanceEtaInput {
  supabase: SupabaseClient;
  tenantId: string;
  destinationAddress: string;
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

interface DistanceSettings {
  tenant_id: string;
  enabled: boolean;
  provider: string;
  fallback_mode: string;
  fallback_minutes_per_mile: number;
  eta_rounding_minutes: number;
  max_distance_miles: number | null;
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

// ============= CONSTANTS =============

const METERS_PER_MILE = 1609.344;
const SECONDS_PER_MINUTE = 60;

// ============= MAIN FUNCTION =============

/**
 * Compute distance-aware travel time for ETA.
 *
 * @param input - tenantId (trusted), supabase client, destination address
 * @returns Structured result with distance, time, and provider info
 */
export async function computeDistanceEta(
  input: DistanceEtaInput
): Promise<DistanceEtaResult> {
  const { supabase, tenantId, destinationAddress } = input;

  // Default "disabled" result
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
    // Validate destination address
    if (!destinationAddress || destinationAddress.trim().length < 5) {
      return {
        ...disabledResult,
        ok: false,
        error: "Invalid or missing destination address",
      };
    }

    // ===== 1. Fetch distance settings for tenant =====
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
    if (!settings || !settings.enabled) {
      logDistanceEta(tenantId, "none", true, false, "disabled_or_no_config");
      return disabledResult;
    }

    const distanceSettings = settings as DistanceSettings;

    // ===== 2. Fetch tenant base address =====
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("address")
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

    const originAddress = tenant.address;
    if (!originAddress || originAddress.trim().length < 5) {
      logDistanceEta(tenantId, "none", false, false, "missing_origin_address");
      return {
        ...disabledResult,
        ok: false,
        error: "Tenant base address not configured",
      };
    }

    // ===== 3. Call distance provider =====
    let providerResult: {
      ok: boolean;
      distance_meters: number | null;
      duration_seconds: number | null;
      error: string | null;
    } = { ok: false, distance_meters: null, duration_seconds: null, error: null };

    const provider = distanceSettings.provider;

    if (provider === "google") {
      providerResult = await callGoogleDistanceMatrix(originAddress, destinationAddress);
    } else if (provider === "mapbox") {
      // Stub for future implementation
      providerResult = { ok: false, distance_meters: null, duration_seconds: null, error: "Mapbox provider not yet implemented" };
    } else if (provider === "osrm") {
      // Stub for future implementation
      providerResult = { ok: false, distance_meters: null, duration_seconds: null, error: "OSRM provider not yet implemented" };
    } else if (provider === "none") {
      // Provider explicitly disabled
      logDistanceEta(tenantId, "none", true, false, "provider_disabled");
      return disabledResult;
    } else {
      providerResult = { ok: false, distance_meters: null, duration_seconds: null, error: `Unknown provider: ${provider}` };
    }

    // ===== 4. Handle provider result or fallback =====
    let distance_miles: number | null = null;
    let drive_minutes: number | null = null;
    let provider_used: DistanceEtaResult["provider_used"] = "none";

    if (providerResult.ok && providerResult.distance_meters !== null && providerResult.duration_seconds !== null) {
      // Provider succeeded
      distance_miles = providerResult.distance_meters / METERS_PER_MILE;
      drive_minutes = providerResult.duration_seconds / SECONDS_PER_MINUTE;
      provider_used = provider as DistanceEtaResult["provider_used"];
    } else {
      // Provider failed - try fallback
      if (distanceSettings.fallback_mode === "per_mile") {
        // Use straight-line distance estimation (simplified - use haversine in production)
        // For now, we estimate based on a rough factor if we have any distance hint
        // If provider gave partial data (distance but no duration), use it
        if (providerResult.distance_meters !== null) {
          distance_miles = providerResult.distance_meters / METERS_PER_MILE;
        } else {
          // Cannot compute fallback without any distance data
          logDistanceEta(tenantId, "fallback_per_mile", false, false, "no_distance_data_for_fallback");
          return {
            ...disabledResult,
            ok: false,
            error: "Distance provider failed and no distance data available for fallback",
          };
        }

        drive_minutes = distance_miles * distanceSettings.fallback_minutes_per_mile;
        provider_used = "fallback_per_mile";
        console.log(`[distance_eta] Using fallback: ${distance_miles.toFixed(2)} mi * ${distanceSettings.fallback_minutes_per_mile} = ${drive_minutes.toFixed(1)} min`);
      } else {
        // fallback_mode = 'none' - fail
        logDistanceEta(tenantId, "none", false, false, providerResult.error || "provider_failed");
        return {
          ...disabledResult,
          ok: false,
          error: providerResult.error || "Distance provider failed and no fallback configured",
        };
      }
    }

    // ===== 5. Apply rounding =====
    const roundingMinutes = distanceSettings.eta_rounding_minutes || 5;
    const rounded_travel_minutes = Math.ceil(drive_minutes / roundingMinutes) * roundingMinutes;

    // ===== 6. Check max distance cutoff =====
    const max_distance_exceeded =
      distanceSettings.max_distance_miles !== null &&
      distance_miles > distanceSettings.max_distance_miles;

    logDistanceEta(tenantId, provider_used, true, max_distance_exceeded, null);

    return {
      ok: true,
      distance_miles: Math.round(distance_miles * 100) / 100, // 2 decimal places
      drive_minutes: Math.round(drive_minutes * 10) / 10, // 1 decimal place
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
