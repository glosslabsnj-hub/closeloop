import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthedTenant, requireInternalSecret, serviceClient } from "../_shared/tenant.ts";
import { computeDistanceEta, DistanceEtaResult } from "../_shared/distance_eta.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

// Timezone offset map for common US timezones (simplified)
const TIMEZONE_OFFSETS: Record<string, string> = {
  "America/New_York": "-05:00",
  "America/Chicago": "-06:00",
  "America/Denver": "-07:00",
  "America/Los_Angeles": "-08:00",
  "America/Phoenix": "-07:00",
  "America/Anchorage": "-09:00",
  "America/Honolulu": "-10:00",
  "UTC": "+00:00",
};

function getTimezoneOffset(tz: string): string {
  return TIMEZONE_OFFSETS[tz] || "-05:00"; // Default to EST
}

/**
 * Validate access - supports both user JWT and internal secret (for AI agent)
 */
async function validateAccess(
  req: Request,
  requestedTenantId: string | null
): Promise<{ tenantId: string; isInternalCall: boolean }> {
  const hasAuthHeader = req.headers.get("authorization")?.startsWith("Bearer ");
  const hasInternalSecret = req.headers.get("x-closeloop-secret");

  // Try user JWT first
  if (hasAuthHeader) {
    const { tenantId } = await requireAuthedTenant(req, requestedTenantId);
    return { tenantId, isInternalCall: false };
  }

  // Fall back to internal secret for AI agent/system triggers
  if (hasInternalSecret) {
    requireInternalSecret(req);
    if (!requestedTenantId) {
      throw new Error("tenant_id required for internal calls");
    }
    return { tenantId: requestedTenantId, isInternalCall: true };
  }

  throw new Error("Missing Authorization header or x-closeloop-secret");
}

/**
 * check-availability: Real-time slot availability check for AI voice agent
 *
 * Called during conversations when the AI needs to verify if a specific time is available
 * before confirming a booking.
 *
 * Request body:
 * - tenant_id: UUID of the tenant
 * - requested_date: Date in YYYY-MM-DD format
 * - requested_time: Time in HH:MM format (24h)
 * - duration_minutes: How long the appointment needs (default: 60)
 * - destination_address: (optional) Customer address for distance-based ETA
 *
 * Returns:
 * - available: boolean - whether the slot is free
 * - conflict_reason: string | null - why it's not available
 * - alternative_slots: array of available times nearby
 * - travel_eta: (if destination_address provided) distance/time info
 * - not_serviceable: boolean - true if destination exceeds max service distance
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      requested_date,
      requested_time,
      duration_minutes = 60,
      destination_address,
    } = body;
    const requestedTenantId = body.tenant_id ?? body.tenantId ?? null;

    if (!requested_date || !requested_time) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: requested_date, requested_time"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate access (user JWT or internal secret)
    const { tenantId } = await validateAccess(req, requestedTenantId);

    const supabase = serviceClient();

    // SECURITY: Get tenant settings scoped to validated tenantId
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("timezone, hours_json, min_lead_hours, max_advance_days, appointment_buffer_minutes")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timezone = tenant.timezone || "America/New_York";
    const bufferMinutes = tenant.appointment_buffer_minutes || 15;
    const minLeadHours = tenant.min_lead_hours || 2;

    // Parse the requested date/time in the tenant's timezone
    // The requested_time is in tenant local time, so we build an ISO string with offset
    const tzOffset = getTimezoneOffset(timezone);
    const localDateTimeStr = `${requested_date}T${requested_time}:00${tzOffset}`;
    
    const requestedStart = new Date(localDateTimeStr);
    // Total blocked time includes duration + buffer for following appointments
    const requestedEnd = new Date(requestedStart.getTime() + (duration_minutes + bufferMinutes) * 60 * 1000);

    console.log("=== CHECK AVAILABILITY ===");
    console.log("Tenant:", tenantId, "Timezone:", timezone);
    console.log("Requested:", requestedStart.toISOString(), "to", requestedEnd.toISOString());

    // Check minimum lead time
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + minLeadHours * 60 * 60 * 1000);
    if (requestedStart < minBookingTime) {
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: `Appointments require at least ${minLeadHours} hours notice`,
          alternative_slots: await getAlternativeSlots(supabase, tenantId, requested_date, duration_minutes, bufferMinutes, tenant.hours_json),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check business hours for the day
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayOfWeek = dayNames[requestedStart.getDay()];
    const dayHours = tenant.hours_json?.[dayOfWeek];

    if (!dayHours || dayHours.closed === true) {
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: `We are closed on ${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}`,
          alternative_slots: await getAlternativeSlots(supabase, tenantId, requested_date, duration_minutes, bufferMinutes, tenant.hours_json),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requested time is within business hours
    const openTime = dayHours.open;
    const closeTime = dayHours.close;
    const requestedTimeStr = requested_time;
    const requestedEndTimeStr = `${String(requestedEnd.getHours()).padStart(2, "0")}:${String(requestedEnd.getMinutes()).padStart(2, "0")}`;

    if (requestedTimeStr < openTime || requestedEndTimeStr > closeTime) {
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: `That time is outside our business hours (${openTime} - ${closeTime})`,
          alternative_slots: await getAlternativeSlots(supabase, tenantId, requested_date, duration_minutes, bufferMinutes, tenant.hours_json),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Check for conflicts scoped to validated tenantId
    const { data: conflicts, error: conflictsError } = await supabase
      .from("busy_blocks")
      .select("id, block_type, start_at, end_at, metadata_json")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .lt("start_at", requestedEnd.toISOString())
      .gt("end_at", requestedStart.toISOString());

    if (conflictsError) {
      console.error("Error checking conflicts:", conflictsError);
      return new Response(
        JSON.stringify({ error: "Failed to check availability" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Conflicts found:", conflicts?.length || 0);

    if (conflicts && conflicts.length > 0) {
      const conflict = conflicts[0];
      const conflictStart = new Date(conflict.start_at);
      const conflictEnd = new Date(conflict.end_at);
      
      let reason = "That time is already booked";
      if (conflict.block_type === "external_busy") {
        reason = "We already have an appointment at that time";
      } else if (conflict.block_type === "hold") {
        reason = "That slot is currently on hold";
      }

      console.log("Conflict:", reason, "from", conflictStart.toISOString(), "to", conflictEnd.toISOString());

      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: reason,
          alternative_slots: await getAlternativeSlots(supabase, tenantId, requested_date, duration_minutes, bufferMinutes, tenant.hours_json),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No conflicts - slot is available!
    console.log("Slot is AVAILABLE");

    // ===== Distance-aware ETA (if destination provided) =====
    let travelEta: DistanceEtaResult | null = null;
    let notServiceable = false;

    if (destination_address && typeof destination_address === "string" && destination_address.trim()) {
      travelEta = await computeDistanceEta({
        supabase,
        tenantId,
        destinationAddress: destination_address.trim(),
      });

      // If max distance exceeded, mark as not serviceable
      if (travelEta.max_distance_exceeded) {
        notServiceable = true;
        console.log(`[check-availability] Destination exceeds max service distance`);
      }
    }

    // Build response
    const response: Record<string, unknown> = {
      available: !notServiceable, // Not available if not serviceable
      conflict_reason: notServiceable
        ? "That location is outside our service area"
        : null,
      slot: {
        start: requestedStart.toISOString(),
        end: requestedEnd.toISOString(),
      },
      not_serviceable: notServiceable,
    };

    // Include travel ETA if computed
    if (travelEta && travelEta.ok) {
      response.travel_eta = {
        distance_miles: travelEta.distance_miles,
        drive_minutes: travelEta.drive_minutes,
        rounded_travel_minutes: travelEta.rounded_travel_minutes,
        provider_used: travelEta.provider_used,
      };

      // Add total ETA including travel (arrival time estimate)
      if (travelEta.rounded_travel_minutes !== null) {
        const arrivalTime = new Date(requestedStart.getTime() - travelEta.rounded_travel_minutes * 60 * 1000);
        response.suggested_departure_time = arrivalTime.toISOString();
        response.total_eta_minutes = travelEta.rounded_travel_minutes;
      }
    } else if (travelEta && !travelEta.ok) {
      // Include error info (but don't fail the whole request)
      response.travel_eta = {
        error: travelEta.error,
        provider_used: travelEta.provider_used,
      };
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in check-availability:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to get alternative available slots for the same day
// deno-lint-ignore no-explicit-any
async function getAlternativeSlots(
  supabase: any,
  tenantId: string,
  dateStr: string,
  durationMinutes: number,
  bufferMinutes: number,
  hoursJson: Record<string, unknown> | null
): Promise<Array<{ start: string; end: string; display: string }>> {
  try {
    const { data: slots, error } = await supabase.rpc("fn_compute_available_slots", {
      _tenant_id: tenantId,
      _start_date: dateStr,
      _end_date: dateStr,
      _duration_minutes: durationMinutes,
      _buffer_minutes: bufferMinutes,
      _business_hours: hoursJson,
    });

    if (error || !slots) {
      console.error("Error fetching alternatives:", error);
      return [];
    }

    // Return up to 3 alternatives with formatted display times
    return (slots as Array<{ slot_start: string; slot_end: string }>).slice(0, 3).map((slot) => {
      const start = new Date(slot.slot_start);
      const hours = start.getHours();
      const minutes = start.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes === 0 ? "" : `:${String(minutes).padStart(2, "0")}`;
      
      return {
        start: slot.slot_start,
        end: slot.slot_end,
        display: `${displayHours}${displayMinutes} ${ampm}`,
      };
    });
  } catch (error) {
    console.error("Error in getAlternativeSlots:", error);
    return [];
  }
}
