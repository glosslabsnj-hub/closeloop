/**
 * elevenlabs-suggest-availability: ElevenLabs tool endpoint for suggesting
 * available appointment slots during voice calls.
 * 
 * Called by ElevenLabs agent when it needs to offer appointment times:
 * - Returns next available slots for a given date
 * - Respects service duration, business hours, and existing bookings
 * - Provides human-readable slot displays for voice output
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveService } from "../_shared/resolveService.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ElevenLabsToolRequest {
  // Date for availability (YYYY-MM-DD or natural language like "tomorrow")
  date?: string;
  // Service name or ID to determine duration
  service_name?: string;
  service_id?: string;
  // Duration override in minutes
  duration_minutes?: number;
  // Preference: earliest, morning, afternoon, evening
  preference?: string;
  // Max slots to return
  max_results?: number;
  // Tenant identification
  tenant_id?: string;
  tenantId?: string;
  // ElevenLabs context
  conversation_id?: string;
  call_id?: string;
  // Nested params (ElevenLabs format)
  params?: {
    date?: string;
    service_name?: string;
    service_id?: string;
    duration_minutes?: number;
    preference?: string;
    tenant_id?: string;
  };
}

interface SuggestAvailabilityResponse {
  success: boolean;
  slots: Array<{
    start: string;
    end: string;
    display: string;
    local_date: string;
  }>;
  count: number;
  date: string;
  service_name: string | null;
  duration_minutes: number;
  message: string;
  no_availability_reason?: string;
  waitlist_available?: boolean;
  callback_available?: boolean;
  next_available_date?: string | null;
  next_available_slots?: Array<{ start: string; end: string; display: string; local_date: string }>;
}

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ElevenLabsToolRequest = await req.json();
    
    console.log(`[suggest-availability] Full request:`, JSON.stringify(body));
    
    // Parse request params (handle ElevenLabs nested format)
    const rawDate = body.date || body.params?.date || "";
    const serviceName = body.service_name || body.params?.service_name || "";
    const serviceId = body.service_id || body.params?.service_id || "";
    const durationOverride = body.duration_minutes || body.params?.duration_minutes;
    const preference = body.preference || body.params?.preference || "earliest";
    const maxResults = body.max_results || 5;
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
          success: false,
          slots: [],
          count: 0,
          date: rawDate,
          service_name: null,
          duration_minutes: 60,
          message: "Unable to check availability - no active session found",
        } as SuggestAvailabilityResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant settings + assistant_settings (same_day_enabled, waitlist_enabled)
    const [tenantResult, assistantSettingsResult] = await Promise.all([
      supabase.from("tenants").select("timezone, hours_json, appointment_buffer_minutes").eq("id", tenantId).single(),
      supabase.from("assistant_settings").select("same_day_enabled, waitlist_enabled").eq("tenant_id", tenantId).maybeSingle(),
    ]);

    const tenant = tenantResult.data;
    const assistantSettings = assistantSettingsResult.data;
    const timezone = tenant?.timezone || "America/New_York";
    const bufferMinutes = tenant?.appointment_buffer_minutes || 15;
    const sameDayEnabled = assistantSettings?.same_day_enabled ?? true;
    const waitlistEnabled = assistantSettings?.waitlist_enabled ?? false;

    // Parse the date
    let targetDate = parseDate(rawDate || "today", timezone);

    // same_day_enabled check: if disabled and target is today, skip to tomorrow
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
    if (!sameDayEnabled && targetDate === todayStr) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDate = tomorrow.toLocaleDateString("en-CA", { timeZone: timezone });
      console.log(`[suggest-availability] same_day_enabled=false, advancing to ${targetDate}`);
    }
    
    console.log(`[suggest-availability] Tenant: ${tenantId.substring(0, 8)}..., Date: ${targetDate}, Service: ${serviceName || serviceId}`);

    // Resolve service for duration (fuzzy matching handles &, /, partial names)
    const resolved = await resolveService(supabase, tenantId, {
      serviceId: serviceId || undefined,
      serviceName: serviceName || undefined,
      durationOverride: durationOverride,
    });
    const finalDuration = resolved.duration;
    const resolvedServiceName = resolved.service?.name || null;
    console.log(`[suggest-availability] Service resolved: ${resolvedServiceName || "none"}, duration: ${finalDuration}min`);

    // Call the database function for slot computation
    // Fetch tenant capacity for multi-technician support
    const { data: tenantCapacity } = await supabase
      .from("tenants")
      .select("default_capacity")
      .eq("id", tenantId)
      .single();
    const capacity = (tenantCapacity as any)?.default_capacity || 1;

    const { data: slots, error: slotsError } = await supabase.rpc(
      "fn_compute_available_slots",
      {
        _tenant_id: tenantId,
        _start_date: targetDate,
        _end_date: targetDate,
        _duration_minutes: finalDuration,
        _buffer_minutes: bufferMinutes,
        _business_hours: tenant?.hours_json,
        _capacity: capacity,
      }
    );

    if (slotsError) {
      console.error("[suggest-availability] Slots error:", slotsError);
      return new Response(
        JSON.stringify({
          success: false,
          slots: [],
          count: 0,
          date: targetDate,
          service_name: resolvedServiceName,
          duration_minutes: finalDuration,
          message: "Unable to check availability at this time",
        } as SuggestAvailabilityResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply preference filter
    let filteredSlots = (slots || []) as Array<{
      slot_start: string;
      slot_end: string;
      slot_date: string;
      slot_time_local: string;
    }>;

    if (preference === "morning") {
      filteredSlots = filteredSlots.filter(slot => {
        const hour = parseInt(slot.slot_time_local.split(":")[0], 10);
        return hour < 12;
      });
    } else if (preference === "afternoon") {
      filteredSlots = filteredSlots.filter(slot => {
        const hour = parseInt(slot.slot_time_local.split(":")[0], 10);
        return hour >= 12 && hour < 17;
      });
    } else if (preference === "evening") {
      filteredSlots = filteredSlots.filter(slot => {
        const hour = parseInt(slot.slot_time_local.split(":")[0], 10);
        return hour >= 17;
      });
    }

    // Limit and format results
    const limitedSlots = filteredSlots.slice(0, maxResults);
    
    const formattedSlots = limitedSlots.map(slot => ({
      start: slot.slot_start,
      end: slot.slot_end,
      display: slot.slot_time_local,
      local_date: slot.slot_date,
    }));

    // Build response message
    let message: string;
    let noAvailabilityReason: string | undefined;
    let waitlistAvailable: boolean | undefined;
    let callbackAvailable: boolean | undefined;
    let nextAvailableDate: string | null = null;
    let nextAvailableSlots: Array<{ start: string; end: string; display: string; local_date: string }> | undefined;

    if (formattedSlots.length === 0) {
      if (filteredSlots.length === 0 && (slots?.length || 0) > 0) {
        noAvailabilityReason = `No ${preference} slots available. Other times may be available.`;
        message = noAvailabilityReason;
      } else {
        // No slots on requested date — scan up to 5 additional business days
        let foundFutureSlots = false;
        for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
          const futureDate = new Date(targetDate + "T12:00:00");
          futureDate.setDate(futureDate.getDate() + dayOffset);
          const futureDateStr = futureDate.toISOString().split("T")[0];

          const { data: futureSlots } = await supabase.rpc("fn_compute_available_slots", {
            _tenant_id: tenantId,
            _start_date: futureDateStr,
            _end_date: futureDateStr,
            _duration_minutes: finalDuration,
            _buffer_minutes: bufferMinutes,
            _business_hours: tenant?.hours_json,
            _capacity: capacity,
          });

          if (futureSlots && futureSlots.length > 0) {
            nextAvailableDate = futureDateStr;
            nextAvailableSlots = futureSlots.slice(0, 3).map((s: Record<string, string>) => ({
              start: s.slot_start,
              end: s.slot_end,
              display: s.slot_time_local,
              local_date: s.slot_date,
            }));
            const nextTimes = nextAvailableSlots.map(s => s.display).join(", ");
            message = `Nothing available on ${targetDate}, but I have openings on ${futureDateStr} at ${nextTimes}. Would any of those work?`;
            noAvailabilityReason = "requested_date_full";
            foundFutureSlots = true;
            break;
          }
        }

        if (!foundFutureSlots) {
          // All scanned days are full — offer waitlist or callback
          if (waitlistEnabled) {
            waitlistAvailable = true;
            noAvailabilityReason = "fully_booked_waitlist_available";
            message = "We're fully booked for the next several days. Would you like me to add you to our waitlist? We'll call you as soon as something opens up.";
          } else {
            callbackAvailable = true;
            noAvailabilityReason = "fully_booked_no_waitlist";
            message = "We're fully booked right now. Would you like us to call you back when something opens up?";
          }
        }
      }
    } else if (formattedSlots.length === 1) {
      message = `I have ${formattedSlots[0].display} available.`;
    } else {
      const displayTimes = formattedSlots.slice(0, 3).map(s => s.display).join(", ");
      message = `Available times include ${displayTimes}.`;
    }

    const response: SuggestAvailabilityResponse = {
      success: formattedSlots.length > 0,
      slots: formattedSlots,
      count: formattedSlots.length,
      date: targetDate,
      service_name: resolvedServiceName,
      duration_minutes: finalDuration,
      message,
      no_availability_reason: noAvailabilityReason,
      waitlist_available: waitlistAvailable,
      callback_available: callbackAvailable,
      next_available_date: nextAvailableDate,
      next_available_slots: nextAvailableSlots,
    };

    console.log(`[suggest-availability] Returning ${formattedSlots.length} slots`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[suggest-availability] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        slots: [],
        count: 0,
        date: "",
        service_name: null,
        duration_minutes: 60,
        message: "Unable to check availability at this time",
      } as SuggestAvailabilityResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
