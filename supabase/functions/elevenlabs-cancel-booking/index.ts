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
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";

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

// Use shared phone normalization
const normalizePhone = normalizePhoneE164;

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

    // Get cancellation policy and AI cancellation permission
    const [{ data: assistantSettings }, { data: serviceWorkflow }] = await Promise.all([
      supabase
        .from("assistant_settings")
        .select("cancellation_notice_hours")
        .eq("tenant_id", tenantId)
        .single(),
      supabase
        .from("service_workflow_config")
        .select("allow_ai_cancellation")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    const cancellationNoticeHours = assistantSettings?.cancellation_notice_hours || 24;

    // If allow_ai_cancellation=false, redirect to owner callback instead of canceling
    const allowAiCancellation = serviceWorkflow?.allow_ai_cancellation !== false;
    if (!allowAiCancellation) {
      console.log(`[cancel-booking] allow_ai_cancellation=false for tenant ${tenantId.substring(0, 8)}... — redirecting to callback`);
      return new Response(
        JSON.stringify({
          success: false,
          was_upcoming: false,
          cancellation_policy_applied: false,
          message: "I'm not able to process cancellations directly, but I've noted your request and the owner will reach out to you shortly to take care of it. Is there anything else I can help with?",
          error: "allow_ai_cancellation=false",
          _version: VERSION,
        } as CancelBookingResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use caller phone from session if not provided
    const phoneE164 = normalizePhone(customerPhone) || callerPhone || "";
    
    console.log(`[cancel-booking] Tenant: ${tenantId.substring(0, 8)}..., BookingId: ${bookingId || 'none'}, Phone: ${phoneE164}`);

    // Find the booking
    let booking: any = null;

    // Strategy 1: Direct booking ID lookup
    if (bookingId) {
      const { data } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, status, lead_id, service_id, external_event_id, external_provider, notes")
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
            .select("id, start_at, end_at, status, lead_id, service_id, external_event_id, external_provider, notes")
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

    // Deactivate the busy_block (scoped to tenant for multi-tenant safety)
    await supabase
      .from("busy_blocks")
      .update({ is_active: false })
      .eq("tenant_id", tenantId)
      .eq("booking_id", booking.id);

    // For sales mode: also cancel the linked test_drive record
    await supabase
      .from("test_drives")
      .update({ status: "cancelled" })
      .eq("tenant_id", tenantId)
      .eq("booking_id", booking.id);

    // Cancel in Square if this booking was synced there
    if (booking.external_provider === "square" && booking.external_event_id) {
      try {
        const { data: oauthToken } = await supabase
          .from("integration_oauth_tokens")
          .select("access_token")
          .eq("tenant_id", tenantId)
          .eq("provider", "square_pos")
          .eq("status", "connected")
          .maybeSingle();

        if (oauthToken?.access_token) {
          const squareCancelResponse = await fetch(
            `https://connect.squareup.com/v2/bookings/${booking.external_event_id}/cancel`,
            {
              method: "POST",
              headers: {
                "Square-Version": "2024-01-18",
                "Authorization": `Bearer ${oauthToken.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                booking_version: 0, // Square requires version; 0 forces latest
              }),
            }
          );

          if (squareCancelResponse.ok) {
            console.log(`[cancel-booking] Square booking ${booking.external_event_id} cancelled`);
          } else {
            const errText = await squareCancelResponse.text();
            console.error(`[cancel-booking] Square cancel failed: ${squareCancelResponse.status} ${errText}`);
          }
        } else {
          console.warn(`[cancel-booking] No Square OAuth token for tenant ${tenantId}, skipping Square cancel`);
        }
      } catch (squareErr) {
        console.error("[cancel-booking] Square cancel error:", squareErr);
      }
    }

    // Update session if we have one
    if (sessionId) {
      await supabase
        .from("ai_call_sessions")
        .update({
          outcome: "followup",
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
