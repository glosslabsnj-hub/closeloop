/**
 * elevenlabs-cancel-booking: ElevenLabs tool endpoint for canceling
 * existing bookings during voice calls.
 * 
 * Called by ElevenLabs agent when:
 * - Customer wants to cancel an appointment
 * - Customer is rescheduling (cancel + rebook)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancelBookingRequest {
  // Identification - at least one required
  booking_id?: string;
  customer_name?: string;
  customer_phone?: string;
  // Context
  reason?: string;
  // Tenant identification
  tenant_id?: string;
  tenantId?: string;
  // ElevenLabs context
  conversation_id?: string;
  call_id?: string;
  // Nested params from ElevenLabs
  params?: {
    booking_id?: string;
    customer_name?: string;
    customer_phone?: string;
    reason?: string;
    tenant_id?: string;
  };
}

interface CancelBookingResponse {
  success: boolean;
  cancelled_booking_id?: string;
  was_upcoming: boolean;
  cancellation_policy_applied: boolean;
  message: string;
  error?: string;
  _version?: string;
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

serve(async (req: Request) => {
  console.log(`[cancel-booking] v${VERSION} - Request received`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CancelBookingRequest = await req.json();
    
    console.log(`[cancel-booking] Full request:`, JSON.stringify(body));
    
    // Parse request params
    const bookingId = body.booking_id || body.params?.booking_id || "";
    const customerName = body.customer_name || body.params?.customer_name || "";
    const customerPhone = body.customer_phone || body.params?.customer_phone || "";
    const reason = body.reason || body.params?.reason || "";
    const directTenantId = body.tenant_id || body.tenantId || body.params?.tenant_id || "";
    const conversationId = body.conversation_id || body.call_id || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant_id from conversation or use direct
    let tenantId: string | null = directTenantId || null;
    let sessionId: string | null = null;
    let callerPhone: string | null = null;
    
    if (conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id, caller_phone")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      
      if (session) {
        tenantId = session.tenant_id || tenantId;
        sessionId = session.id || null;
        callerPhone = session.caller_phone || null;
      }
    }

    if (!tenantId) {
      console.error("[cancel-booking] No tenant_id found");
      return new Response(
        JSON.stringify({
          success: false,
          was_upcoming: false,
          cancellation_policy_applied: false,
          message: "I couldn't find that appointment. Can you give me more details?",
          error: "No active session found",
          _version: VERSION,
        } as CancelBookingResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get cancellation policy
    const { data: assistantSettings } = await supabase
      .from("assistant_settings")
      .select("cancellation_notice_hours")
      .eq("tenant_id", tenantId)
      .single();

    const cancellationNoticeHours = assistantSettings?.cancellation_notice_hours || 24;

    // Use caller phone from session if not provided
    const phoneE164 = normalizePhone(customerPhone) || callerPhone || "";
    
    console.log(`[cancel-booking] Tenant: ${tenantId.substring(0, 8)}..., BookingId: ${bookingId || 'none'}, Phone: ${phoneE164}`);

    // Find the booking
    let booking: any = null;

    // Strategy 1: Direct booking ID lookup
    if (bookingId) {
      const { data } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, status, lead_id, service_id")
        .eq("id", bookingId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      booking = data;
    }

    // Strategy 2: Find by phone number (most recent upcoming booking)
    if (!booking && phoneE164) {
      // First find the customer
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone_e164", phoneE164)
        .maybeSingle();

      if (customer) {
        // Find leads for this customer
        const { data: leads } = await supabase
          .from("leads")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("phone", phoneE164);

        if (leads && leads.length > 0) {
          const leadIds = leads.map(l => l.id);
          
          // Find upcoming booking for these leads
          const { data } = await supabase
            .from("bookings")
            .select("id, start_at, end_at, status, lead_id, service_id")
            .eq("tenant_id", tenantId)
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

    // Strategy 3: Find by customer name (most recent upcoming)
    if (!booking && customerName) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id")
        .eq("tenant_id", tenantId)
        .ilike("full_name", `%${customerName}%`);

      if (leads && leads.length > 0) {
        const leadIds = leads.map(l => l.id);
        
        const { data } = await supabase
          .from("bookings")
          .select("id, start_at, end_at, status, lead_id, service_id")
          .eq("tenant_id", tenantId)
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
          was_upcoming: false,
          cancellation_policy_applied: false,
          message: "I couldn't find an upcoming appointment under that name. Do you have any other details?",
          error: "No booking found",
          _version: VERSION,
        } as CancelBookingResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if within cancellation policy window
    const bookingStart = new Date(booking.start_at);
    const now = new Date();
    const hoursUntilAppointment = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isWithinPolicy = hoursUntilAppointment < cancellationNoticeHours;
    const wasUpcoming = bookingStart > now;

    // Cancel the booking
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ 
        status: "cancelled",
        notes: booking.notes ? `${booking.notes}\n\nCancelled via voice AI: ${reason}` : `Cancelled via voice AI: ${reason}`
      })
      .eq("id", booking.id);

    if (updateError) {
      console.error("[cancel-booking] Update error:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          was_upcoming: wasUpcoming,
          cancellation_policy_applied: false,
          message: "I had trouble canceling that appointment. Let me take a note and have someone call you back.",
          error: updateError.message,
          _version: VERSION,
        } as CancelBookingResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deactivate the busy_block
    await supabase
      .from("busy_blocks")
      .update({ is_active: false })
      .eq("booking_id", booking.id);

    // Update session if we have one
    if (sessionId) {
      await supabase
        .from("ai_call_sessions")
        .update({
          outcome: "cancellation",
          extracted_payload: {
            cancelled_booking_id: booking.id,
            reason: reason,
            was_within_policy: isWithinPolicy,
          },
        })
        .eq("id", sessionId);
    }

    console.log(`[cancel-booking] Success - Cancelled booking: ${booking.id}`);

    // Build response message
    let message = "That's been canceled for you.";
    if (isWithinPolicy && cancellationNoticeHours > 0) {
      message = `That's been canceled. Just so you know, we normally ask for ${cancellationNoticeHours} hours notice for cancellations.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        cancelled_booking_id: booking.id,
        was_upcoming: wasUpcoming,
        cancellation_policy_applied: isWithinPolicy,
        message: message,
        _version: VERSION,
      } as CancelBookingResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[cancel-booking] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        was_upcoming: false,
        cancellation_policy_applied: false,
        message: "I had trouble with that. Let me take a note and have someone call you back.",
        error: error instanceof Error ? error.message : "Unknown error",
        _version: VERSION,
      } as CancelBookingResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
