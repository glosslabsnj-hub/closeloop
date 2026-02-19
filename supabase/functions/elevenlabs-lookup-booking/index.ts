/**
 * elevenlabs-lookup-booking: ElevenLabs tool endpoint for looking up
 * existing bookings during voice calls.
 *
 * "When's my appointment?" — finds the next upcoming booking
 * for the caller and returns details.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function formatTimeDisplay(isoStr: string, tz: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDateDisplay(isoStr: string, tz: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log(`[lookup-booking] Request:`, JSON.stringify(body));

    const p = body.params ?? {};
    const tenantId = body.tenant_id || p.tenant_id || "";
    const conversationId = body.conversation_id || p.conversation_id || "";
    const customerName = body.customer_name || p.customer_name || "";
    const customerPhone = body.customer_phone || p.customer_phone || "";
    const bookingId = body.booking_id || p.booking_id || "";

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
          message: "Unable to look up bookings right now.",
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
      .select("timezone")
      .eq("id", resolvedTenantId)
      .single();
    const timezone = tenant?.timezone || "America/New_York";

    // Find booking
    interface BookingResult {
      id: string;
      start_at: string;
      end_at: string;
      status: string;
      notes: string | null;
      services: { name: string } | null;
    }

    let booking: BookingResult | null = null;

    if (bookingId) {
      const { data } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, status, notes, services:service_id(name)")
        .eq("id", bookingId)
        .eq("tenant_id", resolvedTenantId)
        .maybeSingle();
      booking = data as unknown as BookingResult;
    }

    if (!booking) {
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
            .select(
              "id, start_at, end_at, status, notes, services:service_id(name)"
            )
            .eq("tenant_id", resolvedTenantId)
            .eq("customer_id", customer.id)
            .in("status", ["pending", "confirmed"])
            .gte("start_at", new Date().toISOString())
            .order("start_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          booking = data as unknown as BookingResult;
        }
      }
    }

    if (!booking) {
      return new Response(
        JSON.stringify({
          success: false,
          found: false,
          message: `I don't see any upcoming appointments for ${customerName || "your number"}. Would you like to schedule one?`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const displayDate = formatDateDisplay(booking.start_at, timezone);
    const displayTime = formatTimeDisplay(booking.start_at, timezone);
    const serviceName = booking.services?.name || "your appointment";
    const statusText =
      booking.status === "confirmed" ? "confirmed" : "pending confirmation";

    console.log(`[lookup-booking] Found booking ${booking.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        booking_id: booking.id,
        status: booking.status,
        date: displayDate,
        time: displayTime,
        service: serviceName,
        message: `Your ${serviceName} is scheduled for ${displayTime} on ${displayDate}. It's currently ${statusText}.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[lookup-booking] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          "I'm having trouble looking up bookings. Let me have someone check and call you back.",
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
