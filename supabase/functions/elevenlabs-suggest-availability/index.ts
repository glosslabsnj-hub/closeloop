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

// Parse natural language date to YYYY-MM-DD
function parseDate(input: string, timezone: string): string {
  const now = new Date();
  const lower = input.toLowerCase().trim();
  
  // Handle relative dates
  if (lower === "today" || lower === "now") {
    return formatDateLocal(now, timezone);
  }
  if (lower === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateLocal(tomorrow, timezone);
  }
  if (lower.includes("next")) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const target = new Date(now);
        const currentDay = now.getDay();
        let daysToAdd = i - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        target.setDate(target.getDate() + daysToAdd);
        return formatDateLocal(target, timezone);
      }
    }
  }
  
  // Try parsing as YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  
  // Try parsing as MM/DD or MM-DD
  const mdMatch = input.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (mdMatch) {
    const month = mdMatch[1].padStart(2, "0");
    const day = mdMatch[2].padStart(2, "0");
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
  }
  
  // Default to today
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

    // Call the database function for slot computation
    const { data: slots, error: slotsError } = await supabase.rpc(
      "fn_compute_available_slots",
      {
        _tenant_id: tenantId,
        _start_date: targetDate,
        _end_date: targetDate,
        _duration_minutes: finalDuration,
        _buffer_minutes: bufferMinutes,
        _business_hours: tenant?.hours_json,
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
