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

// Normalize phone to E.164
function normalizePhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
}

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

// Parse date
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

    if (!tenantId) {
      const { data: recentSession } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id")
        .is("ended_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      tenantId = recentSession?.tenant_id || null;
      sessionId = recentSession?.id || null;
    }

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
    const bookingMode = assistantSettings?.ai_booking_mode || "pending"; // pending | auto_confirm | hybrid

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
          source: "voice_ai",
        })
        .select("id")
        .single();
      customerId = newCustomer?.id || null;
    }

    // Create lead for booking reference
    const { data: lead } = await supabase
      .from("leads")
      .insert({
        tenant_id: tenantId,
        full_name: customerName,
        phone: phoneE164 || customerPhone,
        email: customerEmail || null,
        source: "voice_ai",
      })
      .select("id")
      .single();

    leadId = lead?.id || null;

    if (!leadId) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          appointment: null,
          message: "Unable to complete the booking right now. We'll call you back.",
          error: "Failed to create lead record",
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
          outcome: "booking",
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
