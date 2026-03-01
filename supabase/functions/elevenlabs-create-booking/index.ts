/**
 * elevenlabs-create-booking: ElevenLabs tool endpoint for creating
 * appointment bookings during voice calls.
 * 
 * Called by ElevenLabs agent when it has collected booking details:
 * - Creates booking in pending or confirmed state based on tenant config
 * - Creates busy_block to prevent double-booking
 * - Finds or creates customer record
 * - Triggers booking handoff notifications
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ElevenLabsToolRequest {
  // Customer info
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  // Appointment details
  date: string;
  time: string;
  service_name?: string;
  service_id?: string;
  duration_minutes?: number;
  // Additional info
  notes?: string;
  // Tenant identification
  tenant_id?: string;
  tenantId?: string;
  // ElevenLabs context
  conversation_id?: string;
  call_id?: string;
  // Nested params
  params?: {
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    date?: string;
    time?: string;
    service_name?: string;
    service_id?: string;
    duration_minutes?: number;
    notes?: string;
    tenant_id?: string;
  };
}

interface CreateBookingResponse {
  success: boolean;
  booking_id?: string;
  confirmation_number?: string;
  status: "pending" | "confirmed" | "failed";
  appointment: {
    date: string;
    time: string;
    service: string | null;
    duration_minutes: number;
  } | null;
  message: string;
  error?: string;
}

/**
 * Compute real timezone offset using Intl.DateTimeFormat.
 * Handles DST automatically for any IANA timezone.
 */
function getTimezoneOffset(tz: string): string {
  try {
    const now = new Date();
    // Get the timezone offset in minutes using Intl
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart?.value) {
      // Format is like "GMT-05:00" or "GMT+05:30"
      const match = tzPart.value.match(/GMT([+-]\d{2}:\d{2})/);
      if (match) return match[1];
      // GMT with no offset means UTC
      if (tzPart.value === "GMT") return "+00:00";
    }
    // Fallback: compute manually
    const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const diffMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000;
    const hours = Math.floor(Math.abs(diffMinutes) / 60);
    const mins = Math.abs(diffMinutes) % 60;
    const sign = diffMinutes >= 0 ? "+" : "-";
    return `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  } catch {
    // If timezone string is invalid, default to UTC
    return "+00:00";
  }
}

// Use shared phone normalization
const normalizePhone = normalizePhoneE164;

// Parse time to HH:MM
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
  
  if (/^\d{1,2}$/.test(input)) {
    const hour = parseInt(input, 10);
    const adjustedHour = hour < 8 ? hour + 12 : hour;
    return `${String(adjustedHour).padStart(2, "0")}:00`;
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

/** Get the next occurrence of a weekday (0=Sun … 6=Sat), at least 1 day from now */
function nextWeekday(targetDay: number): Date {
  const now = new Date();
  const result = new Date(now);
  result.setDate(now.getDate() + 1); // Start from tomorrow
  while (result.getDay() !== targetDay) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

// Parse date
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
    const candidate = new Date(year, parseInt(m) - 1, parseInt(d));
    // If the date already passed this year, use next year
    if (candidate < now) candidate.setFullYear(year + 1);
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
      const candidate = new Date(year, monthIndex, parseInt(dayStr));
      if (candidate < now) candidate.setFullYear(year + 1);
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

// Format for display
function formatTimeDisplay(time24: string): string {
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const minutes = m === "00" ? "" : `:${m}`;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  return `${displayHour}${minutes} ${period}`;
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// Generate confirmation number
function generateConfirmationNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ElevenLabsToolRequest = await req.json();
    
    console.log(`[create-booking] Full request:`, JSON.stringify(body));
    
    // Parse request params
    const customerName = body.customer_name || body.params?.customer_name || "";
    const customerPhone = body.customer_phone || body.params?.customer_phone || "";
    const customerEmail = body.customer_email || body.params?.customer_email || "";
    const rawDate = body.date || body.params?.date || "";
    const rawTime = body.time || body.params?.time || "";
    const serviceName = body.service_name || body.params?.service_name || "";
    const serviceId = body.service_id || body.params?.service_id || "";
    const durationOverride = body.duration_minutes || body.params?.duration_minutes;
    const notes = body.notes || body.params?.notes || "";
    const directTenantId = body.tenant_id || body.tenantId || body.params?.tenant_id || "";
    const conversationId = body.conversation_id || body.call_id || "";

    // Validate required fields
    if (!customerName) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          appointment: null,
          message: "I need your name to book the appointment.",
          error: "customer_name is required",
        } as CreateBookingResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!rawDate || !rawTime) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          appointment: null,
          message: "I need to know when you'd like to schedule.",
          error: "date and time are required",
        } as CreateBookingResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant_id
    let tenantId: string | null = directTenantId || null;
    let sessionId: string | null = null;
    
    if (conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      tenantId = session?.tenant_id || tenantId;
      sessionId = session?.id || null;
    }

    // P0-2: Removed cross-tenant fallback that queried most recent session
    // across ALL tenants. This was a tenant isolation risk.

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          appointment: null,
          message: "Unable to complete the booking right now.",
          error: "No active session found",
        } as CreateBookingResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant settings
    const { data: tenant } = await supabase
      .from("tenants")
      .select("timezone, appointment_buffer_minutes")
      .eq("id", tenantId)
      .single();

    // Get assistant settings to determine booking mode
    const { data: assistantSettings } = await supabase
      .from("assistant_settings")
      .select("ai_booking_mode")
      .eq("tenant_id", tenantId)
      .single();

    const timezone = tenant?.timezone || "America/New_York";
    const bufferMinutes = tenant?.appointment_buffer_minutes || 15;
    const rawMode = assistantSettings?.ai_booking_mode || "pending";
    // Normalize: accept both "auto_book" and "auto_confirm" as auto-confirm
    const bookingMode = (rawMode === "auto_book" || rawMode === "auto_confirm") ? "auto_confirm" : rawMode;

    // Parse date and time
    const targetDate = parseDate(rawDate, timezone);
    const targetTime = parseTime(rawTime);

    console.log(`[create-booking] Tenant: ${tenantId.substring(0, 8)}..., Date: ${targetDate}, Time: ${targetTime}, Mode: ${bookingMode}`);

    // Resolve service
    let finalDuration = durationOverride || 60;
    let resolvedServiceId: string | null = null;
    let resolvedServiceName: string | null = null;

    if (serviceId) {
      const { data: service } = await supabase
        .from("services")
        .select("id, name, duration_minutes")
        .eq("id", serviceId)
        .eq("tenant_id", tenantId)
        .single();
      if (service) {
        resolvedServiceId = service.id;
        resolvedServiceName = service.name;
        finalDuration = service.duration_minutes || finalDuration;
      }
    } else if (serviceName) {
      const { data: service } = await supabase
        .from("services")
        .select("id, name, duration_minutes")
        .eq("tenant_id", tenantId)
        .ilike("name", `%${serviceName}%`)
        .limit(1)
        .maybeSingle();
      if (service) {
        resolvedServiceId = service.id;
        resolvedServiceName = service.name;
        finalDuration = service.duration_minutes || finalDuration;
      }
    }

    // Build timestamps
    const tzOffset = getTimezoneOffset(timezone);
    const localDateTimeStr = `${targetDate}T${targetTime}:00${tzOffset}`;
    const startAt = new Date(localDateTimeStr);
    const endAt = new Date(startAt.getTime() + finalDuration * 60 * 1000);
    const blockEndAt = new Date(startAt.getTime() + (finalDuration + bufferMinutes) * 60 * 1000);

    // Check for conflicts one more time (belt and suspenders)
    const { data: conflicts } = await supabase
      .from("busy_blocks")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .lt("start_at", blockEndAt.toISOString())
      .gt("end_at", startAt.toISOString());

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          appointment: null,
          message: `${formatTimeDisplay(targetTime)} just got booked. Let me find another time.`,
          error: "Time slot no longer available",
        } as CreateBookingResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or create customer
    const phoneE164 = normalizePhone(customerPhone);
    let leadId: string | null = null;
    let customerId: string | null = null;

    // First try to find by phone
    if (phoneE164) {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone_e164", phoneE164)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        await supabase
          .from("customers")
          .update({ full_name: customerName, updated_at: new Date().toISOString() })
          .eq("id", customerId);
      }
    }

    // Create customer if not found
    if (!customerId && phoneE164) {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenantId,
          full_name: customerName,
          phone_e164: phoneE164,
          phone_raw: customerPhone,
          email: customerEmail || null,
          source: "ai_call",
        })
        .select("id")
        .single();
      customerId = newCustomer?.id || null;
    }

    // Create lead for booking reference
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        tenant_id: tenantId,
        full_name: customerName,
        phone: phoneE164 || customerPhone,
        email: customerEmail || null,
        source: "ai_call",
        customer_id: customerId,
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("[create-booking] Lead creation error:", leadError);
    }

    leadId = lead?.id || null;

    if (!leadId) {
      console.error("[create-booking] Failed to create lead - no ID returned");
      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          appointment: null,
          message: "Unable to complete the booking right now. We'll call you back.",
          error: `Failed to create lead record: ${leadError?.message || "unknown"}`,
        } as CreateBookingResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine initial booking status
    const initialStatus = bookingMode === "auto_confirm" ? "confirmed" : "pending";
    const confirmationNumber = generateConfirmationNumber();

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        tenant_id: tenantId,
        lead_id: leadId,
        service_id: resolvedServiceId,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: initialStatus,
        notes: notes || null,
        session_id: sessionId,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      console.error("[create-booking] Booking error:", bookingError);
      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          appointment: null,
          message: "Unable to complete the booking right now. We'll call you back.",
          error: bookingError?.message || "Failed to create booking",
        } as CreateBookingResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create busy_block to prevent double-booking
    await supabase.from("busy_blocks").insert({
      tenant_id: tenantId,
      booking_id: booking.id,
      start_at: startAt.toISOString(),
      end_at: blockEndAt.toISOString(),
      block_type: initialStatus === "confirmed" ? "confirmed_booking" : "hold",
      is_active: true,
      expires_at: initialStatus === "pending" 
        ? new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min hold for pending
        : null,
    });

    // Update session with booking outcome
    if (sessionId) {
      await supabase
        .from("ai_call_sessions")
        .update({
          booking_id: booking.id,
          outcome: "booked",
          extracted_payload: {
            booking_id: booking.id,
            confirmation_number: confirmationNumber,
            customer_name: customerName,
            customer_phone: phoneE164,
            service_name: resolvedServiceName,
            date: targetDate,
            time: targetTime,
            status: initialStatus,
          },
        })
        .eq("id", sessionId);
    }

    // For sales-mode tenants, also create a test_drives record
    try {
      const { data: tenantFull } = await supabase
        .from("tenants")
        .select("business_mode")
        .eq("id", tenantId)
        .single();

      if (tenantFull?.business_mode === "sales") {
        const isTestDrive = (resolvedServiceName || "").toLowerCase().includes("test drive") ||
          (notes || "").toLowerCase().includes("test drive") ||
          (serviceName || "").toLowerCase().includes("test drive");

        if (isTestDrive || tenantFull.business_mode === "sales") {
          await supabase.from("test_drives").insert({
            tenant_id: tenantId,
            customer_id: customerId,
            scheduled_at: startAt.toISOString(),
            duration_minutes: finalDuration,
            status: initialStatus === "confirmed" ? "confirmed" : "scheduled",
            salesperson: null,
            notes: notes || null,
            booking_id: booking.id,
            session_id: sessionId,
            vehicle_description: resolvedServiceName || null,
          });
          console.log(`[create-booking] Created test_drive for sales tenant`);
        }
      }
    } catch (e) {
      console.error("[create-booking] Test drive creation failed:", e);
    }

    // Trigger booking handoff
    try {
      await fetch(`${supabaseUrl}/functions/v1/booking-handoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || serviceKey,
        },
        body: JSON.stringify({
          booking_id: booking.id,
          tenant_id: tenantId,
        }),
      });
    } catch (e) {
      console.error("[create-booking] Handoff trigger failed:", e);
    }

    // Build response
    const displayDate = formatDateDisplay(targetDate);
    const displayTime = formatTimeDisplay(targetTime);
    
    let message: string;
    if (initialStatus === "confirmed") {
      message = `You're all set for ${displayTime} on ${displayDate}. Your confirmation number is ${confirmationNumber}.`;
    } else {
      message = `I've submitted your request for ${displayTime} on ${displayDate}. Someone will confirm shortly. Your reference is ${confirmationNumber}.`;
    }

    const response: CreateBookingResponse = {
      success: true,
      booking_id: booking.id,
      confirmation_number: confirmationNumber,
      status: initialStatus,
      appointment: {
        date: targetDate,
        time: targetTime,
        service: resolvedServiceName,
        duration_minutes: finalDuration,
      },
      message,
    };

    console.log(`[create-booking] Created booking ${booking.id} (${initialStatus})`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[create-booking] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        status: "failed",
        appointment: null,
        message: "Unable to complete the booking right now. We'll call you back to confirm.",
        error: error instanceof Error ? error.message : "Unknown error",
      } as CreateBookingResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
