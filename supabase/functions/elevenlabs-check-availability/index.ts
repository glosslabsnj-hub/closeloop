/**
 * elevenlabs-check-availability: ElevenLabs tool endpoint for verifying
 * if a specific appointment slot is available.
 * 
 * Called by ElevenLabs agent when caller requests a specific time:
 * - Validates against business hours, existing bookings, and lead time
 * - Returns availability status with alternatives if unavailable
 * - Supports destination address for service-based ETA
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ElevenLabsToolRequest {
  // Date in YYYY-MM-DD or natural language
  date?: string;
  // Time in HH:MM (24h) or natural language like "2pm"
  time?: string;
  // Service identification
  service_name?: string;
  service_id?: string;
  // Duration override
  duration_minutes?: number;
  // Customer address for distance/ETA
  destination_address?: string;
  // Tenant identification
  tenant_id?: string;
  tenantId?: string;
  // ElevenLabs context
  conversation_id?: string;
  call_id?: string;
  // Nested params
  params?: {
    date?: string;
    time?: string;
    service_name?: string;
    service_id?: string;
    duration_minutes?: number;
    destination_address?: string;
    tenant_id?: string;
  };
}

interface CheckAvailabilityResponse {
  available: boolean;
  conflict_reason: string | null;
  slot: {
    start: string;
    end: string;
    display: string;
  } | null;
  alternative_slots: Array<{
    start: string;
    end: string;
    display: string;
  }>;
  service_name: string | null;
  duration_minutes: number;
  message: string;
  // Optional travel ETA if destination provided
  travel_eta?: {
    distance_miles: number;
    drive_minutes: number;
  } | null;
}

// Timezone offset map
const TIMEZONE_OFFSETS: Record<string, string> = {
  "America/New_York": "-05:00",
  "America/Chicago": "-06:00",
  "America/Denver": "-07:00",
  "America/Los_Angeles": "-08:00",
  "America/Phoenix": "-07:00",
  "UTC": "+00:00",
};

function getTimezoneOffset(tz: string): string {
  return TIMEZONE_OFFSETS[tz] || "-05:00";
}

// Parse natural language time to HH:MM
function parseTime(input: string): string {
  const lower = input.toLowerCase().trim();
  
  // Handle HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(input)) {
    const [h, m] = input.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }
  
  // Handle "2pm", "10am", "3:30pm"
  const ampmMatch = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] || "00";
    const period = ampmMatch[3];
    
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    
    return `${String(hour).padStart(2, "0")}:${minutes}`;
  }
  
  // Handle just hour number (assume next reasonable time)
  if (/^\d{1,2}$/.test(input)) {
    const hour = parseInt(input, 10);
    if (hour >= 1 && hour <= 12) {
      // Assume PM for business hours if ambiguous
      const adjustedHour = hour < 8 ? hour + 12 : hour;
      return `${String(adjustedHour).padStart(2, "0")}:00`;
    }
    return `${String(hour).padStart(2, "0")}:00`;
  }
  
  // Default to 9 AM if unparseable
  return "09:00";
}

// Parse natural language date
function parseDate(input: string, timezone: string): string {
  const now = new Date();
  const lower = input.toLowerCase().trim();
  
  if (lower === "today" || lower === "now" || !input) {
    return formatDateLocal(now, timezone);
  }
  if (lower === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateLocal(tomorrow, timezone);
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  
  return formatDateLocal(now, timezone);
}

function formatDateLocal(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

// Format time for display
function formatTimeDisplay(time24: string): string {
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const minutes = m === "00" ? "" : `:${m}`;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  return `${displayHour}${minutes} ${period}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ElevenLabsToolRequest = await req.json();
    
    console.log(`[check-availability] Full request:`, JSON.stringify(body));
    
    // Parse request params
    const rawDate = body.date || body.params?.date || "";
    const rawTime = body.time || body.params?.time || "";
    const serviceName = body.service_name || body.params?.service_name || "";
    const serviceId = body.service_id || body.params?.service_id || "";
    const durationOverride = body.duration_minutes || body.params?.duration_minutes;
    const destinationAddress = body.destination_address || body.params?.destination_address || "";
    const directTenantId = body.tenant_id || body.tenantId || body.params?.tenant_id || "";
    const conversationId = body.conversation_id || body.call_id || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant_id
    let tenantId: string | null = directTenantId || null;
    
    if (!tenantId && conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      tenantId = session?.tenant_id || null;
    }

    // P0-2: Removed cross-tenant fallback that queried most recent session
    // across ALL tenants. This was a tenant isolation risk.

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: "Unable to verify availability",
          slot: null,
          alternative_slots: [],
          service_name: null,
          duration_minutes: 60,
          message: "Unable to check availability - no active session found",
        } as CheckAvailabilityResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant settings
    const { data: tenant } = await supabase
      .from("tenants")
      .select("timezone, hours_json, appointment_buffer_minutes, min_lead_hours")
      .eq("id", tenantId)
      .single();

    const timezone = tenant?.timezone || "America/New_York";
    const bufferMinutes = tenant?.appointment_buffer_minutes || 15;
    const minLeadHours = tenant?.min_lead_hours || 2;

    // Parse date and time
    const targetDate = parseDate(rawDate, timezone);
    const targetTime = parseTime(rawTime);
    
    console.log(`[check-availability] Tenant: ${tenantId.substring(0, 8)}..., Date: ${targetDate}, Time: ${targetTime}`);

    // Resolve service for duration
    let finalDuration = durationOverride || 60;
    let resolvedServiceName: string | null = null;

    if (serviceId) {
      const { data: service } = await supabase
        .from("services")
        .select("name, duration_minutes")
        .eq("id", serviceId)
        .eq("tenant_id", tenantId)
        .single();
      if (service) {
        finalDuration = service.duration_minutes || finalDuration;
        resolvedServiceName = service.name;
      }
    } else if (serviceName) {
      const { data: service } = await supabase
        .from("services")
        .select("name, duration_minutes")
        .eq("tenant_id", tenantId)
        .ilike("name", `%${serviceName}%`)
        .limit(1)
        .maybeSingle();
      if (service) {
        finalDuration = service.duration_minutes || finalDuration;
        resolvedServiceName = service.name;
      }
    }

    // Build timestamp in tenant timezone
    const tzOffset = getTimezoneOffset(timezone);
    const localDateTimeStr = `${targetDate}T${targetTime}:00${tzOffset}`;
    const requestedStart = new Date(localDateTimeStr);
    const requestedEnd = new Date(requestedStart.getTime() + (finalDuration + bufferMinutes) * 60 * 1000);

    // Check minimum lead time
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + minLeadHours * 60 * 60 * 1000);
    
    if (requestedStart < minBookingTime) {
      const alternatives = await getAlternatives(supabase, tenantId, targetDate, finalDuration, bufferMinutes, tenant?.hours_json);
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: `Appointments require at least ${minLeadHours} hours notice`,
          slot: null,
          alternative_slots: alternatives,
          service_name: resolvedServiceName,
          duration_minutes: finalDuration,
          message: `That time is too soon. We need at least ${minLeadHours} hours notice.`,
        } as CheckAvailabilityResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check business hours
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayOfWeek = dayNames[requestedStart.getDay()];
    const dayHours = tenant?.hours_json?.[dayOfWeek];

    if (!dayHours || dayHours.closed === true) {
      const alternatives = await getAlternatives(supabase, tenantId, targetDate, finalDuration, bufferMinutes, tenant?.hours_json);
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: `We are closed on ${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}`,
          slot: null,
          alternative_slots: alternatives,
          service_name: resolvedServiceName,
          duration_minutes: finalDuration,
          message: `We're closed on ${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}.`,
        } as CheckAvailabilityResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize business hours (handle both flat and windows format)
    const openTime = dayHours.windows?.length > 0 ? dayHours.windows[0].open : dayHours.open;
    const closeTime = dayHours.windows?.length > 0 ? dayHours.windows[0].close : dayHours.close;
    const requestedEndTime = `${String(requestedEnd.getHours()).padStart(2, "0")}:${String(requestedEnd.getMinutes()).padStart(2, "0")}`;

    if (targetTime < openTime || requestedEndTime > closeTime) {
      const alternatives = await getAlternatives(supabase, tenantId, targetDate, finalDuration, bufferMinutes, tenant?.hours_json);
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: `Outside business hours (${openTime} - ${closeTime})`,
          slot: null,
          alternative_slots: alternatives,
          service_name: resolvedServiceName,
          duration_minutes: finalDuration,
          message: `That's outside our hours. We're open ${formatTimeDisplay(openTime)} to ${formatTimeDisplay(closeTime)}.`,
        } as CheckAvailabilityResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for conflicts in busy_blocks
    const { data: conflicts } = await supabase
      .from("busy_blocks")
      .select("id, block_type, start_at, end_at")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .lt("start_at", requestedEnd.toISOString())
      .gt("end_at", requestedStart.toISOString());

    if (conflicts && conflicts.length > 0) {
      const alternatives = await getAlternatives(supabase, tenantId, targetDate, finalDuration, bufferMinutes, tenant?.hours_json);
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: "That time is already booked",
          slot: null,
          alternative_slots: alternatives,
          service_name: resolvedServiceName,
          duration_minutes: finalDuration,
          message: `${formatTimeDisplay(targetTime)} is not available. Let me suggest some alternatives.`,
        } as CheckAvailabilityResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Slot is available!
    const displayTime = formatTimeDisplay(targetTime);
    
    // Optionally compute travel ETA if destination provided
    let travelEta: { distance_miles: number; drive_minutes: number } | null = null;
    
    if (destinationAddress) {
      try {
        const internalSecret = Deno.env.get("CLOSELOOP_INTERNAL_SECRET");
        const etaResponse = await fetch(`${supabaseUrl}/functions/v1/compute-distance-eta`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-closeloop-secret": internalSecret || "",
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            address_text: destinationAddress,
            intent: "dispatch",
          }),
        });
        const etaData = await etaResponse.json();
        if (etaData.route_distance_miles !== null) {
          travelEta = {
            distance_miles: etaData.route_distance_miles,
            drive_minutes: etaData.drive_minutes || Math.round(etaData.route_distance_miles * 2),
          };
        }
      } catch (e) {
        console.error("[check-availability] ETA calculation failed:", e);
      }
    }

    const response: CheckAvailabilityResponse = {
      available: true,
      conflict_reason: null,
      slot: {
        start: requestedStart.toISOString(),
        end: requestedEnd.toISOString(),
        display: displayTime,
      },
      alternative_slots: [],
      service_name: resolvedServiceName,
      duration_minutes: finalDuration,
      message: `${displayTime} is available.`,
      travel_eta: travelEta,
    };

    console.log(`[check-availability] Slot available: ${displayTime}`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[check-availability] Error:", error);
    return new Response(
      JSON.stringify({
        available: false,
        conflict_reason: "Unable to verify availability",
        slot: null,
        alternative_slots: [],
        service_name: null,
        duration_minutes: 60,
        message: "Unable to check availability at this time",
      } as CheckAvailabilityResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to get alternative slots
// deno-lint-ignore no-explicit-any
async function getAlternatives(
  supabase: any,
  tenantId: string,
  dateStr: string,
  durationMinutes: number,
  bufferMinutes: number,
  hoursJson: Record<string, unknown> | null
): Promise<Array<{ start: string; end: string; display: string }>> {
  try {
    const { data: slots } = await supabase.rpc("fn_compute_available_slots", {
      _tenant_id: tenantId,
      _start_date: dateStr,
      _end_date: dateStr,
      _duration_minutes: durationMinutes,
      _buffer_minutes: bufferMinutes,
      _business_hours: hoursJson,
    });

    if (!slots) return [];

    return (slots as Array<{ slot_start: string; slot_end: string; slot_time_local: string }>)
      .slice(0, 3)
      .map(slot => ({
        start: slot.slot_start,
        end: slot.slot_end,
        display: slot.slot_time_local,
      }));
  } catch {
    return [];
  }
}
