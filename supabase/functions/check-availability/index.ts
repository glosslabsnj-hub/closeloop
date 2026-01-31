import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
 * 
 * Returns:
 * - available: boolean - whether the slot is free
 * - conflict_reason: string | null - why it's not available
 * - alternative_slots: array of available times nearby
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      tenant_id,
      requested_date,
      requested_time,
      duration_minutes = 60,
    } = await req.json();

    if (!tenant_id || !requested_date || !requested_time) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: tenant_id, requested_date, requested_time" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get tenant settings for timezone and business hours
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("timezone, hours_json, min_lead_hours, max_advance_days, appointment_buffer_minutes")
      .eq("id", tenant_id)
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
    console.log("Tenant:", tenant_id, "Timezone:", timezone);
    console.log("Requested:", requestedStart.toISOString(), "to", requestedEnd.toISOString());

    // Check minimum lead time
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + minLeadHours * 60 * 60 * 1000);
    if (requestedStart < minBookingTime) {
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: `Appointments require at least ${minLeadHours} hours notice`,
          alternative_slots: await getAlternativeSlots(supabase, tenant_id, requested_date, duration_minutes, bufferMinutes, tenant.hours_json),
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
          alternative_slots: await getAlternativeSlots(supabase, tenant_id, requested_date, duration_minutes, bufferMinutes, tenant.hours_json),
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
          alternative_slots: await getAlternativeSlots(supabase, tenant_id, requested_date, duration_minutes, bufferMinutes, tenant.hours_json),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for conflicts with busy_blocks (including bookings, holds, and external events)
    const { data: conflicts, error: conflictsError } = await supabase
      .from("busy_blocks")
      .select("id, block_type, start_at, end_at, metadata_json")
      .eq("tenant_id", tenant_id)
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
          alternative_slots: await getAlternativeSlots(supabase, tenant_id, requested_date, duration_minutes, bufferMinutes, tenant.hours_json),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No conflicts - slot is available!
    console.log("Slot is AVAILABLE");

    return new Response(
      JSON.stringify({
        available: true,
        conflict_reason: null,
        slot: {
          start: requestedStart.toISOString(),
          end: requestedEnd.toISOString(),
        },
      }),
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
