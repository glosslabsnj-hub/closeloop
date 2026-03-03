import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthedTenant, requireInternalSecret, serviceClient } from "../_shared/tenant.ts";
import { computeDistanceEta, DistanceEtaResult } from "../_shared/distance_eta.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-closeloop-secret",
};

// DST-aware timezone offset calculator
function getTimezoneOffset(tz: string, refDate?: Date): string {
  try {
    const d = refDate || new Date();
    const utcStr = d.toLocaleString("en-US", { timeZone: "UTC" });
    const localStr = d.toLocaleString("en-US", { timeZone: tz });
    const diffMs = new Date(localStr).getTime() - new Date(utcStr).getTime();
    const totalMin = Math.round(diffMs / 60000);
    const sign = totalMin >= 0 ? "+" : "-";
    const abs = Math.abs(totalMin);
    return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  } catch {
    return "-05:00";
  }
}

// Compute end time string by adding minutes to a HH:MM string (stays in local time)
function addMinutesToTimeStr(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Get day of week from YYYY-MM-DD string (avoids UTC/local day confusion)
function dayOfWeekFromDateStr(dateStr: string): number {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0)).getUTCDay();
}

/**
 * Normalize hours_json day config to { open, close } format.
 * Handles both legacy flat format and windows array format.
 */
function normalizeHours(dayConfig: any): { open: string; close: string } | null {
  if (!dayConfig || dayConfig.closed === true) return null;
  // Windows array format: { closed: false, windows: [{ open, close }] }
  if (dayConfig.windows?.length) {
    return { open: dayConfig.windows[0].open, close: dayConfig.windows[0].close };
  }
  // Legacy flat format: { open, close }
  if (dayConfig.open && dayConfig.close) {
    return { open: dayConfig.open, close: dayConfig.close };
  }
  return null;
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
    const minLeadHours = tenant.min_lead_hours ?? 2;

    // Parse the requested date/time in the tenant's timezone
    // The requested_time is in tenant local time, so we build an ISO string with offset
    const tzOffset = getTimezoneOffset(timezone, new Date(`${requested_date}T12:00:00Z`));
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
          alternative_slots: await getAlternativeSlots(supabase, tenantId, requested_date, duration_minutes, bufferMinutes, tenant.hours_json, timezone),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check business hours for the day
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayOfWeek = dayNames[dayOfWeekFromDateStr(requested_date)];
    const rawDayHours = tenant.hours_json?.[dayOfWeek];
    const normalizedDay = normalizeHours(rawDayHours);

    if (!normalizedDay) {
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: `We are closed on ${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}`,
          alternative_slots: await getAlternativeSlots(supabase, tenantId, requested_date, duration_minutes, bufferMinutes, tenant.hours_json, timezone),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requested time is within business hours
    const openTime = normalizedDay.open;
    const closeTime = normalizedDay.close;
    const requestedTimeStr = requested_time;
    const requestedEndTimeStr = addMinutesToTimeStr(requested_time, duration_minutes + bufferMinutes);

    if (requestedTimeStr < openTime || requestedEndTimeStr > closeTime) {
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: `That time is outside our business hours (${openTime} - ${closeTime})`,
          alternative_slots: await getAlternativeSlots(supabase, tenantId, requested_date, duration_minutes, bufferMinutes, tenant.hours_json, timezone),
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
          alternative_slots: await getAlternativeSlots(supabase, tenantId, requested_date, duration_minutes, bufferMinutes, tenant.hours_json, timezone),
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
  hoursJson: Record<string, unknown> | null,
  timezone: string
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
      const display = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(slot.slot_start));

      return {
        start: slot.slot_start,
        end: slot.slot_end,
        display,
      };
    });
  } catch (error) {
    console.error("Error in getAlternativeSlots:", error);
    return [];
  }
}
