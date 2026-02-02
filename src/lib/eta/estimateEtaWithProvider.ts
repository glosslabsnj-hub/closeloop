/**
 * ETA Estimator with Provider - Step 2
 *
 * Extends Step 1 baseline estimator with Mapbox distance/duration provider.
 * Falls back to safe baseline ranges when provider unavailable or fails.
 */

import { supabase } from "@/integrations/supabase/client";
import { estimateEta, formatSpokenEta, EtaPolicy, EtaInput, EtaResult, DEFAULT_ETA_POLICY } from "./estimateEta";

// ============================================================================
// Types
// ============================================================================

export interface EtaPolicyExtended extends EtaPolicy {
  /** Enable distance provider (Mapbox) */
  provider_enabled?: boolean;

  /** Maximum service radius in miles (out-of-area if exceeded) */
  max_service_radius_miles?: number;

  /** Allow fallback to baseline when address is vague */
  allow_vague_address_fallback?: boolean;

  /** Base prep time for food orders (minutes) */
  food_prep_minutes?: number;

  /** Average response time for dispatch (minutes before driving) */
  dispatch_response_minutes?: number;

  /** Traffic buffer percentage (applied to driving duration) */
  traffic_buffer_pct?: number;
}

export interface EtaInputExtended extends EtaInput {
  /** Origin address (e.g., business location) */
  origin_address?: string;

  /** Destination address (e.g., customer location) */
  destination_address?: string;

  /** Tenant ID for API calls */
  tenant_id?: string;
}

export type EtaStatus = "computed" | "fallback" | "out_of_area" | "blocked_missing_address";

export interface EtaResultExtended extends EtaResult {
  /** Status of the ETA computation */
  status: EtaStatus;

  /** Distance in miles (if provider computed) */
  distance_miles?: number;

  /** Driving duration in minutes (if provider computed) */
  duration_minutes?: number;

  /** Provider used: "mapbox" | "none" */
  provider: "mapbox" | "none";

  /** Confidence level */
  confidence: "high" | "medium" | "low";

  /** Whether result came from cache */
  cached?: boolean;

  /** Out-of-area message (if status is out_of_area) */
  out_of_area_message?: string;

  /** Whether destination address was provided */
  destination_provided: boolean;

  /** Whether destination address was vague */
  destination_vague?: boolean;
}

export interface RouteResult {
  distance_miles: number | null;
  duration_minutes: number | null;
  confidence: "high" | "medium" | "low";
  provider: "mapbox" | "none";
  cached: boolean;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if an address is vague (missing specific location details)
 */
function isVagueAddress(address: string): boolean {
  if (!address || address.trim().length < 10) return true;

  const normalized = address.toLowerCase().trim();

  // Check for common vague patterns
  const vaguePatterns = [
    /^near\s/i,
    /^around\s/i,
    /^somewhere\s/i,
    /^by\s+the\s/i,
    /^close\s+to\s/i,
    /^\d{5}$/, // Just a zip code
    /^[a-z]+\s*,\s*[a-z]{2}$/i, // Just city, state
  ];

  if (vaguePatterns.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  // Check if it has a street number or recognizable address format
  const hasStreetNumber = /\d+\s+\w+/.test(normalized);
  const hasStreetType =
    /(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|blvd|boulevard|court|ct|circle|cir)/i.test(
      normalized
    );

  // If no street number and no street type, likely vague
  if (!hasStreetNumber && !hasStreetType) {
    return true;
  }

  return false;
}

/**
 * Call the eta-route Edge Function
 */
async function callRouteProvider(
  tenantId: string,
  originAddress: string,
  destinationAddress: string
): Promise<RouteResult> {
  try {
    const { data, error } = await supabase.functions.invoke("eta-route", {
      body: {
        tenant_id: tenantId,
        origin_address: originAddress,
        destination_address: destinationAddress,
      },
    });

    if (error) {
      console.error("[estimateEtaWithProvider] Edge function error:", error);
      return {
        distance_miles: null,
        duration_minutes: null,
        confidence: "low",
        provider: "none",
        cached: false,
        error: error.message,
      };
    }

    return {
      distance_miles: data.distance_miles,
      duration_minutes: data.duration_minutes,
      confidence: data.confidence || "low",
      provider: data.provider || "none",
      cached: data.cached || false,
      error: data.error,
    };
  } catch (err) {
    console.error("[estimateEtaWithProvider] Call failed:", err);
    return {
      distance_miles: null,
      duration_minutes: null,
      confidence: "low",
      provider: "none",
      cached: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Compute ETA range from driving duration based on business mode
 */
function computeEtaFromDuration(
  durationMinutes: number,
  policy: EtaPolicyExtended,
  businessMode: string,
  busynessPct: number
): { min: number; max: number } {
  let baseTime: number;

  if (businessMode === "food") {
    // Food: prep time + driving time
    const prepTime = policy.food_prep_minutes ?? 15;
    baseTime = prepTime + durationMinutes;
  } else if (businessMode === "dispatch") {
    // Dispatch: response time + driving time
    const responseTime = policy.dispatch_response_minutes ?? 5;
    baseTime = responseTime + durationMinutes;
  } else {
    // Service/other: just driving time (technician already en route or scheduled)
    baseTime = durationMinutes;
  }

  // Apply traffic buffer
  const trafficBufferPct = policy.traffic_buffer_pct ?? 15;
  const trafficMultiplier = 1 + trafficBufferPct / 100;

  // Compute range: min is base time, max includes traffic buffer
  let min = Math.round(baseTime);
  let max = Math.round(baseTime * trafficMultiplier);

  // Apply busyness buffer (same logic as Step 1)
  const busynessBufferPct = Math.min(50, Math.max(0, policy.busyness_buffer_pct ?? 0));
  if (busynessPct > 0 && busynessBufferPct > 0) {
    const busynessMultiplier = 1 + (busynessBufferPct * busynessPct) / 10000;
    min = Math.round(min * busynessMultiplier);
    max = Math.round(max * busynessMultiplier);
  }

  // Ensure reasonable min/max gap
  if (max - min < 5) {
    max = min + 5;
  }

  return { min, max };
}

// ============================================================================
// Main Estimator with Provider
// ============================================================================

/**
 * Estimates ETA using Mapbox distance provider when available.
 *
 * Flow:
 * 1. If provider_enabled false → use Step 1 baseline
 * 2. If destination missing → status "blocked_missing_address" (unless allow fallback)
 * 3. If destination vague → status "fallback" (unless allow fallback false → blocked)
 * 4. Call eta-route Edge Function
 * 5. If distance > max_service_radius_miles → status "out_of_area"
 * 6. Compute ETA range from duration
 * 7. If provider fails → status "fallback" with Step 1 baseline
 */
export async function estimateEtaWithProvider(
  policy: EtaPolicyExtended,
  input: EtaInputExtended
): Promise<EtaResultExtended> {
  const notes: string[] = [];

  // Check if provider is enabled
  const providerEnabled = policy.provider_enabled === true;
  const hasDestination = !!input.destination_address?.trim();
  const hasOrigin = !!input.origin_address?.trim();
  const hasTenantId = !!input.tenant_id;

  // If provider not enabled, use Step 1 baseline
  if (!providerEnabled) {
    notes.push("Provider not enabled, using baseline estimate");
    const baselineResult = estimateEta(policy, input);
    return {
      ...baselineResult,
      status: "fallback",
      provider: "none",
      confidence: "medium",
      destination_provided: hasDestination,
    };
  }

  // If destination not provided
  if (!hasDestination) {
    const allowFallback = policy.allow_vague_address_fallback !== false;

    if (allowFallback) {
      notes.push("Destination not provided, using baseline estimate");
      const baselineResult = estimateEta(policy, input);
      return {
        ...baselineResult,
        status: "fallback",
        provider: "none",
        confidence: "low",
        destination_provided: false,
        notes: [...baselineResult.notes, ...notes],
      };
    } else {
      notes.push("Destination not provided and fallback disabled");
      return {
        spoken: "We need your address to estimate arrival time",
        min: 0,
        max: 0,
        source: "default",
        status: "blocked_missing_address",
        provider: "none",
        confidence: "low",
        destination_provided: false,
        notes,
      };
    }
  }

  // Check if destination is vague
  const destinationVague = isVagueAddress(input.destination_address!);

  if (destinationVague) {
    const allowFallback = policy.allow_vague_address_fallback !== false;

    if (allowFallback) {
      notes.push("Destination address is vague, using baseline estimate");
      const baselineResult = estimateEta(policy, input);
      return {
        ...baselineResult,
        status: "fallback",
        provider: "none",
        confidence: "low",
        destination_provided: true,
        destination_vague: true,
        notes: [...baselineResult.notes, ...notes],
      };
    } else {
      notes.push("Destination address is vague and fallback disabled");
      return {
        spoken: "We need a more specific address to estimate arrival time",
        min: 0,
        max: 0,
        source: "default",
        status: "blocked_missing_address",
        provider: "none",
        confidence: "low",
        destination_provided: true,
        destination_vague: true,
        notes,
      };
    }
  }

  // If no origin or tenant_id, fall back to baseline
  if (!hasOrigin || !hasTenantId) {
    notes.push("Missing origin address or tenant_id, using baseline estimate");
    const baselineResult = estimateEta(policy, input);
    return {
      ...baselineResult,
      status: "fallback",
      provider: "none",
      confidence: "low",
      destination_provided: true,
      notes: [...baselineResult.notes, ...notes],
    };
  }

  // Call the route provider
  notes.push("Calling Mapbox route provider...");
  const routeResult = await callRouteProvider(
    input.tenant_id!,
    input.origin_address!,
    input.destination_address!
  );

  // If provider failed, fall back to baseline
  if (routeResult.provider === "none" || routeResult.distance_miles === null) {
    notes.push(`Provider failed: ${routeResult.error || "Unknown error"}`);
    notes.push("Falling back to baseline estimate");
    const baselineResult = estimateEta(policy, input);
    return {
      ...baselineResult,
      status: "fallback",
      provider: "none",
      confidence: "low",
      destination_provided: true,
      notes: [...baselineResult.notes, ...notes],
    };
  }

  // Check out-of-area
  const maxRadius = policy.max_service_radius_miles;
  if (maxRadius && routeResult.distance_miles > maxRadius) {
    notes.push(
      `Distance ${routeResult.distance_miles.toFixed(1)} miles exceeds max radius ${maxRadius} miles`
    );
    return {
      spoken: `Sorry, that location is outside our service area of ${maxRadius} miles`,
      min: 0,
      max: 0,
      source: "default",
      status: "out_of_area",
      distance_miles: routeResult.distance_miles,
      duration_minutes: routeResult.duration_minutes ?? undefined,
      provider: "mapbox",
      confidence: routeResult.confidence,
      cached: routeResult.cached,
      destination_provided: true,
      out_of_area_message: `Location is ${routeResult.distance_miles.toFixed(1)} miles away, which exceeds our ${maxRadius} mile service area.`,
      notes,
    };
  }

  // Compute ETA range from driving duration
  const busynessPct = Math.min(100, Math.max(0, input.manual_busyness_pct ?? 0));
  const range = computeEtaFromDuration(
    routeResult.duration_minutes!,
    policy,
    input.business_mode,
    busynessPct
  );

  notes.push(
    `Route: ${routeResult.distance_miles.toFixed(1)} miles, ${routeResult.duration_minutes} min driving`
  );
  notes.push(`Computed ETA range: ${range.min}-${range.max} min`);

  const spoken = formatSpokenEta(range.min, range.max);
  notes.push(`Final ETA: "${spoken}"`);

  return {
    spoken,
    min: range.min,
    max: range.max,
    source: "job_type", // Route-based is more specific than mode/default
    status: "computed",
    distance_miles: routeResult.distance_miles,
    duration_minutes: routeResult.duration_minutes ?? undefined,
    provider: "mapbox",
    confidence: routeResult.confidence,
    cached: routeResult.cached,
    destination_provided: true,
    notes,
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  isVagueAddress,
  computeEtaFromDuration,
};
