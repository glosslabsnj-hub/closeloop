/**
 * elevenlabs-reschedule-booking: ElevenLabs tool endpoint for rescheduling
 * existing bookings during voice calls.
 *
 * Finds the booking by customer phone/name, updates the time,
 * and adjusts the busy_block accordingly.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getTimezoneOffset(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart?.value) {
      const match = tzPart.value.match(/GMT([+-]\d{2}:\d{2})/);
      if (match) return match[1];
      if (tzPart.value === "GMT") return "+00:00";
    }
    return "+00:00";
  } catch {
    return "+00:00";
  }
}

function parseTime(input: string): string {
  const lower = input.toLowerCase().trim();
  if (/^\d{1,2}:\d{2}$/.test(input)) {
    const [h, m] = input.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }
  const ampmMatch = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] || "00";
    const period = ampmMatch[3];
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${minutes}`;
  }
  return "09:00";
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

function nextWeekday(targetDay: number): Date {
  const now = new Date();
  const result = new Date(now);
  result.setDate(now.getDate() + 1);
  while (result.getDay() !== targetDay) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

function parseDate(input: string, timezone: string): string {
  const now = new Date();
  const lower = input.toLowerCase().trim();

  if (!input || lower === "today" || lower === "now") {
    return formatDate(now, timezone);
  }
  if (lower === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return formatDate(d, timezone);
  }

  // ISO date: 2026-03-05
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

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
    return formatDate(candidate, timezone);
  }

  // "Wednesday March 11" / "Tuesday June 5th" — weekday prefix then month + day
  const weekdayMonthDay = lower.match(/^[a-z]+\s+([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/);
  if (weekdayMonthDay) {
    const monthIndex = MONTH_NAMES[weekdayMonthDay[1]];
    if (monthIndex !== undefined) {
      const year = now.getFullYear();
      const candidate = new Date(Date.UTC(year, monthIndex, parseInt(weekdayMonthDay[2]), 12, 0, 0));
      if (candidate < now) candidate.setUTCFullYear(year + 1);
      return formatDate(candidate, timezone);
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
      return formatDate(candidate, timezone);
    }
  }

  // "next Monday" / "this Friday" / just "friday"
  const dayMatch = lower.match(/^(?:next\s+|this\s+)?([a-z]+)$/);
  if (dayMatch) {
    const dayIndex = DAY_NAMES[dayMatch[1]];
    if (dayIndex !== undefined) {
      return formatDate(nextWeekday(dayIndex), timezone);
    }
  }

  // Log unparseable input and fall back to today (agent usually sends ISO)
  console.warn(`[reschedule-booking] Could not parse date "${input}", defaulting to today`);
  return formatDate(now, timezone);
}

const DAY_LABELS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function getDayLabel(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return DAY_LABELS[new Date(Date.UTC(y, mo - 1, d, 12, 0, 0)).getUTCDay()];
}

function isOpenDay(dateStr: string, hoursJson: Record<string, unknown> | null | undefined): boolean {
  if (!hoursJson) return true; // no hours config = always open
  const dayLabel = getDayLabel(dateStr);
  const dayHours = hoursJson[dayLabel] as { open?: string; close?: string; closed?: boolean } | undefined;
  if (!dayHours) return false; // day not configured = closed
  if (dayHours.closed === true) return false;
  return !!(dayHours.open && dayHours.close);
}

function nextOpenDay(fromDateStr: string, hoursJson: Record<string, unknown> | null | undefined): string | null {
  const [y, mo, d] = fromDateStr.split("-").map(Number);
  const base = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  for (let i = 1; i <= 7; i++) {
    const next = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
    const iso = next.toISOString().slice(0, 10);
    if (isOpenDay(iso, hoursJson)) return iso;
  }
  return null;
}

function formatDate(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function formatTimeDisplay(time24: string): string {
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const minutes = m === "00" ? "" : `:${m}`;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}${minutes} ${period}`;
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log(`[reschedule-booking] Request:`, JSON.stringify(body));

    const p = body.params ?? {};
    const tenantId = body.tenant_id || p.tenant_id || "";
    const conversationId = body.conversation_id || p.conversation_id || "";
    const customerName = body.customer_name || p.customer_name || "";
    const customerPhone = body.customer_phone || p.customer_phone || "";
    const bookingId = body.booking_id || p.booking_id || "";
    const newDate = body.new_date || p.new_date || "";
    const newTime = body.new_time || p.new_time || "";

    if (!newDate || !newTime) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "When would you like to reschedule to?",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant + caller phone from session
    let resolvedTenantId = tenantId;
    let callerPhone: string | null = null;
    if (conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, caller_phone")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      if (session) {
        resolvedTenantId = resolvedTenantId || session.tenant_id || "";
        callerPhone = session.caller_phone || null;
      }
    }

    if (!resolvedTenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unable to reschedule right now.",
          error: "No tenant context",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find the booking
    let booking: { id: string; start_at: string; end_at: string; service_id: string | null } | null = null;

    if (bookingId) {
      const { data } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, service_id")
        .eq("id", bookingId)
        .eq("tenant_id", resolvedTenantId)
        .in("status", ["pending", "confirmed"])
        .maybeSingle();
      booking = data;
    }

    if (!booking) {
      // Find by customer phone → leads → bookings (bookings link via lead_id, not customer_id)
      const phoneE164 = normalizePhoneE164(customerPhone) || callerPhone || "";
      if (phoneE164) {
        const { data: leads } = await supabase
          .from("leads")
          .select("id")
          .eq("tenant_id", resolvedTenantId)
          .eq("phone", phoneE164);

        if (leads && leads.length > 0) {
          const leadIds = leads.map((l: { id: string }) => l.id);
          const { data } = await supabase
            .from("bookings")
            .select("id, start_at, end_at, service_id")
            .eq("tenant_id", resolvedTenantId)
            .in("lead_id", leadIds)
            .in("status", ["pending", "confirmed"])
            .gte("start_at", new Date().toISOString())
            .order("start_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          booking = data;
        }
      }
    }

    // Strategy 3: Find by customer name
    if (!booking && customerName) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id")
        .eq("tenant_id", resolvedTenantId)
        .ilike("full_name", `%${customerName}%`);

      if (leads && leads.length > 0) {
        const leadIds = leads.map((l: { id: string }) => l.id);
        const { data } = await supabase
          .from("bookings")
          .select("id, start_at, end_at, service_id")
          .eq("tenant_id", resolvedTenantId)
          .in("lead_id", leadIds)
          .in("status", ["pending", "confirmed"])
          .gte("start_at", new Date().toISOString())
          .order("start_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        booking = data;
      }
    }

    if (!booking) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `I couldn't find an upcoming appointment for ${customerName || "you"}. Could you give me the name on the booking?`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get tenant timezone + hours
    const { data: tenant } = await supabase
      .from("tenants")
      .select("timezone, appointment_buffer_minutes, hours_json")
      .eq("id", resolvedTenantId)
      .single();

    const timezone = tenant?.timezone || "America/New_York";
    const bufferMinutes = tenant?.appointment_buffer_minutes || 15;
    const hoursJson = (tenant?.hours_json as Record<string, unknown> | null) ?? null;

    // Calculate new times
    const targetDate = parseDate(newDate, timezone);
    const targetTime = parseTime(newTime);

    // Validate: reject closed business days
    if (!isOpenDay(targetDate, hoursJson)) {
      const dayLabel = getDayLabel(targetDate);
      const capitalizedDay = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
      const altDate = nextOpenDay(targetDate, hoursJson);
      const altMsg = altDate
        ? ` Our next available day is ${formatDateDisplay(altDate)}.`
        : "";
      return new Response(
        JSON.stringify({
          success: false,
          message: `We're closed on ${capitalizedDay}s.${altMsg} What other day works for you?`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const tzOffset = getTimezoneOffset(timezone);

    // Calculate duration from existing booking
    const existingStart = new Date(booking.start_at);
    const existingEnd = new Date(booking.end_at);
    const durationMs = existingEnd.getTime() - existingStart.getTime();

    const newStart = new Date(`${targetDate}T${targetTime}:00${tzOffset}`);
    const newEnd = new Date(newStart.getTime() + durationMs);
    const blockEnd = new Date(
      newStart.getTime() + durationMs + bufferMinutes * 60 * 1000
    );

    // Check for conflicts at new time
    const { data: conflicts } = await supabase
      .from("busy_blocks")
      .select("id")
      .eq("tenant_id", resolvedTenantId)
      .eq("is_active", true)
      .neq("booking_id", booking.id)
      .lt("start_at", blockEnd.toISOString())
      .gt("end_at", newStart.toISOString());

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `${formatTimeDisplay(targetTime)} on ${formatDateDisplay(targetDate)} isn't available. Would you like to try a different time?`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update the booking
    await supabase
      .from("bookings")
      .update({
        start_at: newStart.toISOString(),
        end_at: newEnd.toISOString(),
      })
      .eq("id", booking.id);

    // Update busy_block (scoped to tenant for multi-tenant safety)
    await supabase
      .from("busy_blocks")
      .update({
        start_at: newStart.toISOString(),
        end_at: blockEnd.toISOString(),
      })
      .eq("tenant_id", resolvedTenantId)
      .eq("booking_id", booking.id)
      .eq("is_active", true);

    const displayDate = formatDateDisplay(targetDate);
    const displayTime = formatTimeDisplay(targetTime);

    console.log(
      `[reschedule-booking] Rescheduled ${booking.id} to ${targetDate} ${targetTime}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: booking.id,
        message: `Your appointment has been rescheduled to ${displayTime} on ${displayDate}.`,
        new_date: targetDate,
        new_time: targetTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[reschedule-booking] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          "I'm having trouble rescheduling. Let me have someone call you to help.",
        error:
          error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
