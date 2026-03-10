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
import { parseTime } from "../_shared/parseTime.ts";
import { resolveService } from "../_shared/resolveService.ts";

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

// DST-aware timezone offset calculator (uses longOffset for reliability)
function getTimezoneOffset(tz: string, refDate?: Date): string {
  try {
    const d = refDate || new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    });
    const parts = formatter.formatToParts(d);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart?.value) {
      const match = tzPart.value.match(/GMT([+-]\d{2}:\d{2})/);
      if (match) return match[1];
      if (tzPart.value === "GMT") return "+00:00";
    }
    return "-05:00";
  } catch {
    return "-05:00";
  }
}

// Convert "HH:MM" or "H:MM" to minutes since midnight (robust to non-padded formats)
function timeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || "00:00").split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
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

// parseTime imported from _shared/parseTime.ts

const MONTH_NAMES: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
  november: 10, nov: 10, december: 11, dec: 11,
};

const DAY_NAMES: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};

/** Get the next occurrence of a weekday (0=Sun … 6=Sat), at least 1 day from now */
function nextWeekday(targetDay: number): Date {
  const now = new Date();
  const result = new Date(now);
  result.setDate(now.getDate() + 1);
  while (result.getDay() !== targetDay) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

// Parse natural language date to YYYY-MM-DD
function parseDate(input: string, timezone: string): string {
  const now = new Date();
  const lower = input.toLowerCase().trim();

  if (!input || lower === "today" || lower === "now") {
    return formatDateLocal(now, timezone);
  }
  if (lower === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateLocal(tomorrow, timezone);
  }

  // ISO date: 2026-03-05
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  // MM/DD/YYYY or M/D/YYYY
  const slashDate = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const [, m, d, y] = slashDate;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // MM/DD or M/D (assume current/next year)
  const slashShort = input.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashShort) {
    const [, m, d] = slashShort;
    const year = now.getFullYear();
    // Use noon UTC to avoid timezone day-shift when formatting in local tz
    const candidate = new Date(Date.UTC(year, parseInt(m) - 1, parseInt(d), 12, 0, 0));
    if (candidate < now) candidate.setUTCFullYear(year + 1);
    return formatDateLocal(candidate, timezone);
  }

  // "Wednesday March 11" / "Tuesday June 5th" — weekday prefix then month + day
  const weekdayMonthDay = lower.match(/^[a-z]+\s+([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/);
  if (weekdayMonthDay) {
    const monthIndex = MONTH_NAMES[weekdayMonthDay[1]];
    if (monthIndex !== undefined) {
      const year = now.getFullYear();
      const candidate = new Date(Date.UTC(year, monthIndex, parseInt(weekdayMonthDay[2]), 12, 0, 0));
      if (candidate < now) candidate.setUTCFullYear(year + 1);
      return formatDateLocal(candidate, timezone);
    }
  }

  // "March 5" / "March 5th" / "5th of March"
  const monthDay = lower.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/) ||
                   lower.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)$/);
  if (monthDay) {
    let monthStr: string, dayStr: string;
    if (/^[a-z]/.test(monthDay[1])) {
      [, monthStr, dayStr] = monthDay;
    } else {
      [, dayStr, monthStr] = monthDay;
    }
    const monthIndex = MONTH_NAMES[monthStr];
    if (monthIndex !== undefined) {
      const year = now.getFullYear();
      // Use noon UTC to avoid timezone day-shift
      const candidate = new Date(Date.UTC(year, monthIndex, parseInt(dayStr), 12, 0, 0));
      if (candidate < now) candidate.setUTCFullYear(year + 1);
      return formatDateLocal(candidate, timezone);
    }
  }

  // "next Monday" / "this Friday" / just "friday"
  const dayMatch = lower.match(/^(?:next\s+|this\s+)?([a-z]+)$/);
  if (dayMatch) {
    const dayIndex = DAY_NAMES[dayMatch[1]];
    if (dayIndex !== undefined) {
      return formatDateLocal(nextWeekday(dayIndex), timezone);
    }
  }

  // Fallback: today
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

    // Resolve service for duration (fuzzy matching handles &, /, partial names)
    const resolved = await resolveService(supabase, tenantId, {
      serviceId: serviceId || undefined,
      serviceName: serviceName || undefined,
      durationOverride: durationOverride,
    });
    const resolvedServiceName = resolved.service?.name || null;
    const finalDuration = resolved.duration;

    // Safety: warn when using default duration (service not matched)
    if (!resolved.service && serviceName) {
      console.warn(`[check-availability] WARNING: Service "${serviceName}" not matched for tenant ${tenantId.substring(0, 8)}. Using default ${finalDuration}min duration. This may cause incorrect availability.`);
    } else if (!resolved.service && !serviceName) {
      console.warn(`[check-availability] WARNING: No service_name provided for tenant ${tenantId.substring(0, 8)}. Using default ${finalDuration}min duration.`);
    }
    console.log(`[check-availability] Service resolved: ${resolvedServiceName || "none"}, duration: ${finalDuration}min, addon: ${resolved.service?.is_addon || false}`);

    // Add-on service enforcement: add-ons cannot be booked standalone
    if (resolved.service?.is_addon) {
      return new Response(
        JSON.stringify({
          available: false,
          conflict_reason: "addon_service",
          slot: null,
          alternative_slots: [],
          service_name: resolvedServiceName,
          duration_minutes: finalDuration,
          message: `${resolvedServiceName} is an add-on service and must be booked together with a main service. Please ask the customer which primary service they would like (such as a full detail, interior detail, exterior wash, paint correction, or ceramic coating) and then add ${resolvedServiceName} to that booking.`,
        } as CheckAvailabilityResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build timestamp in tenant timezone
    const tzOffset = getTimezoneOffset(timezone, new Date(`${targetDate}T12:00:00Z`));
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
    const dayOfWeek = dayNames[dayOfWeekFromDateStr(targetDate)];
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
    // Use numeric comparison to avoid string padding issues ("9:00" vs "09:00")
    const openMin = timeToMinutes(openTime);
    const closeMin = timeToMinutes(closeTime);
    const requestedMin = timeToMinutes(targetTime);
    const requestedEndMin = requestedMin + finalDuration + bufferMinutes;

    console.log(`[check-availability] Hours check: requested ${targetTime} (${requestedMin}min) end ${requestedEndMin}min vs open ${openTime} (${openMin}min) close ${closeTime} (${closeMin}min)`);

    if (requestedMin < openMin || requestedEndMin > closeMin) {
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
