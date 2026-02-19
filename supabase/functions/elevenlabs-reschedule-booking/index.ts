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

function parseDate(input: string, timezone: string): string {
  const lower = input.toLowerCase().trim();
  const now = new Date();
  if (lower === "today" || !input) {
    return formatDate(now, timezone);
  }
  if (lower === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return formatDate(d, timezone);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return formatDate(now, timezone);
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

    // Resolve tenant
    let resolvedTenantId = tenantId;
    if (conversationId && !resolvedTenantId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      resolvedTenantId = session?.tenant_id || "";
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
      // Find by customer phone
      const phoneE164 = normalizePhoneE164(customerPhone);
      if (phoneE164) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("tenant_id", resolvedTenantId)
          .eq("phone_e164", phoneE164)
          .maybeSingle();

        if (customer) {
          const { data } = await supabase
            .from("bookings")
            .select("id, start_at, end_at, service_id")
            .eq("tenant_id", resolvedTenantId)
            .eq("customer_id", customer.id)
            .in("status", ["pending", "confirmed"])
            .gte("start_at", new Date().toISOString())
            .order("start_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          booking = data;
        }
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

    // Get tenant timezone
    const { data: tenant } = await supabase
      .from("tenants")
      .select("timezone, appointment_buffer_minutes")
      .eq("id", resolvedTenantId)
      .single();

    const timezone = tenant?.timezone || "America/New_York";
    const bufferMinutes = tenant?.appointment_buffer_minutes || 15;

    // Calculate new times
    const targetDate = parseDate(newDate, timezone);
    const targetTime = parseTime(newTime);
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

    // Update busy_block
    await supabase
      .from("busy_blocks")
      .update({
        start_at: newStart.toISOString(),
        end_at: blockEnd.toISOString(),
      })
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
