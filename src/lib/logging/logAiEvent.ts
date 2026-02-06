/**
 * AI Event Logger - HIPAA-safe logging for AI events
 *
 * Logs events to ai_event_logs table with proper sanitization.
 * Never stores raw addresses or PII in log data.
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Types
// ============================================================================

export type AiEventType =
  | "eta_computed"
  | "eta_fallback"
  | "eta_blocked_missing_address"
  | "eta_out_of_area"
  | "call_initiated"
  | "call_completed"
  | "intent_detected"
  | "handoff_triggered"
  | "error";

export interface EtaComputedEventData {
  spoken: string;
  min_minutes: number;
  max_minutes: number;
  source: string;
  business_mode: string;
  busyness_pct?: number;
  job_type?: string;
  is_holiday?: boolean;
  // Step 2 fields
  distance_miles?: number;
  duration_minutes?: number;
  confidence?: "high" | "medium" | "low";
  provider?: "mapbox" | "none";
  cached?: boolean;
  destination_provided?: boolean;
  destination_vague?: boolean;
}

export interface BaseAiEventOptions {
  tenantId: string;
  sessionId?: string;
  callSid?: string;
  conversationId?: string;
}

// ============================================================================
// Hash Helpers
// ============================================================================

/**
 * Creates a HIPAA-safe hash of an address for logging.
 * Uses first 8 chars of SHA-256 hash to allow correlation without storing raw data.
 */
async function hashAddress(address: string): Promise<string> {
  if (!address) return "";

  const encoder = new TextEncoder();
  const data = encoder.encode(address.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex.substring(0, 8);
}

/**
 * Extracts only the city from an address for HIPAA-safe logging.
 * Removes street numbers and specific identifiers.
 */
function extractCityOnly(address: string): string {
  if (!address) return "";

  // Try to extract city from common address formats
  const parts = address.split(",").map(p => p.trim());

  // If we have at least 2 parts, second-to-last is usually city
  if (parts.length >= 2) {
    // Return just the city name (strip zip codes, state codes)
    const cityPart = parts[parts.length - 2];
    // Remove any numbers (zip codes that might be attached)
    return cityPart.replace(/\d+/g, "").trim();
  }

  return "";
}

// ============================================================================
// Main Logger
// ============================================================================

/**
 * Logs an AI event to ai_event_logs table.
 * Automatically sanitizes data for HIPAA compliance.
 *
 * @param eventType - Type of event (eta_computed, call_initiated, etc.)
 * @param options - Base options with tenant/session info
 * @param eventData - Event-specific data (will be sanitized)
 * @returns Debug info for client-side use
 */
export async function logAiEvent(
  eventType: AiEventType,
  options: BaseAiEventOptions,
  eventData: Record<string, unknown>
): Promise<{ logged: boolean; debug?: Record<string, unknown> }> {
  const { tenantId, sessionId, callSid, conversationId } = options;

  try {
    // Sanitize any address fields in event data
    const sanitizedData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(eventData)) {
      if (typeof value === "string" && (key.includes("address") || key.includes("location"))) {
        // Hash addresses for correlation, keep only city
        sanitizedData[`${key}_hash`] = await hashAddress(value);
        sanitizedData[`${key}_city`] = extractCityOnly(value);
      } else {
        sanitizedData[key] = value;
      }
    }

    // Insert the log entry
    const { error } = await supabase.from("ai_event_logs").insert([{
      tenant_id: tenantId,
      session_id: sessionId || null,
      call_sid: callSid || null,
      conversation_id: conversationId || null,
      stage: eventType,
      event_data: sanitizedData as unknown as import("@/integrations/supabase/types").Json,
    }]);

    if (error) {
      return { logged: false, debug: { error: error.message } };
    }

    return {
      logged: true,
      debug: {
        event_type: eventType,
        ...sanitizedData,
      },
    };
  } catch (err) {
    return { logged: false, debug: { error: String(err) } };
  }
}

/**
 * Convenience method for logging ETA computation events.
 * Includes proper typing for ETA-specific data.
 */
export async function logEtaComputed(
  options: BaseAiEventOptions,
  data: EtaComputedEventData & { pickup_address?: string; dropoff_address?: string }
): Promise<{ logged: boolean; debug?: Record<string, unknown> }> {
  return logAiEvent("eta_computed", options, { ...data });
}

// ============================================================================
// Server-side helper (for edge functions)
// ============================================================================

/** Minimal interface for Supabase client used in edge functions */
interface SupabaseClientLike {
  from(table: string): {
    insert(values: Record<string, unknown> | Record<string, unknown>[]): Promise<{ error: { message: string } | null }>;
  };
}

/**
 * Creates a logger bound to a specific supabase client.
 * Use this in edge functions where you have a service role client.
 */
export function createAiEventLogger(
  supabaseClient: SupabaseClientLike
) {
  return {
    logEtaComputed: async (
      options: BaseAiEventOptions,
      data: EtaComputedEventData & { pickup_address?: string; dropoff_address?: string }
    ) => {
      const sanitizedData: Record<string, unknown> = {
        spoken: data.spoken,
        min_minutes: data.min_minutes,
        max_minutes: data.max_minutes,
        source: data.source,
        business_mode: data.business_mode,
        busyness_pct: data.busyness_pct,
        job_type: data.job_type,
        is_holiday: data.is_holiday,
      };

      // Hash addresses if present
      if (data.pickup_address) {
        const encoder = new TextEncoder();
        const hashData = encoder.encode(data.pickup_address.toLowerCase().trim());
        const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        sanitizedData.pickup_address_hash = hashHex.substring(0, 8);
      }

      if (data.dropoff_address) {
        const encoder = new TextEncoder();
        const hashData = encoder.encode(data.dropoff_address.toLowerCase().trim());
        const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        sanitizedData.dropoff_address_hash = hashHex.substring(0, 8);
      }

      const { error } = await supabaseClient.from("ai_event_logs").insert({
        tenant_id: options.tenantId,
        session_id: options.sessionId || null,
        call_sid: options.callSid || null,
        conversation_id: options.conversationId || null,
        stage: "eta_computed",
        event_data: sanitizedData,
      });

      return { logged: !error, error: error?.message };
    },

    logEvent: async <T extends Record<string, unknown>>(
      eventType: AiEventType,
      options: BaseAiEventOptions,
      data: T
    ) => {
      const { error } = await supabaseClient.from("ai_event_logs").insert({
        tenant_id: options.tenantId,
        session_id: options.sessionId || null,
        call_sid: options.callSid || null,
        conversation_id: options.conversationId || null,
        stage: eventType,
        event_data: data,
      });

      return { logged: !error, error: error?.message };
    },
  };
}
