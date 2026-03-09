/**
 * sync-square-cancel: Cancel a booking in the connected POS/scheduling system.
 *
 * Currently supports: Square Appointments
 * Called from: dashboard cancel, dashboard delete, portal cancel
 *
 * POST body: { tenant_id, booking_id, square_booking_id }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSquareConfig } from "../_shared/squareToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const { tenant_id, booking_id, square_booking_id } = body;

    if (!tenant_id || !square_booking_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id and square_booking_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get valid Square config (auto-refreshes expired tokens)
    const squareConfig = await getSquareConfig(tenant_id);
    if (!squareConfig) {
      return new Response(
        JSON.stringify({ success: false, message: "No connected Square integration or token expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { accessToken } = squareConfig;

    // Get the Square booking to retrieve its version (required for cancellation)
    const getRes = await fetch(
      `https://connect.squareup.com/v2/bookings/${square_booking_id}`,
      {
        headers: {
          "Square-Version": "2024-11-20",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!getRes.ok) {
      const err = await getRes.json().catch(() => ({}));
      console.error(`[sync-square-cancel] Failed to get Square booking ${square_booking_id}:`, err);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to retrieve Square booking", details: err }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const squareBooking = (await getRes.json()).booking;
    if (!squareBooking) {
      return new Response(
        JSON.stringify({ success: false, error: "Square booking not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Already cancelled? Skip.
    if (squareBooking.status === "CANCELLED_BY_SELLER" || squareBooking.status === "CANCELLED_BY_CUSTOMER") {
      console.log(`[sync-square-cancel] Square booking ${square_booking_id} already cancelled`);
      return new Response(
        JSON.stringify({ success: true, already_cancelled: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cancel the Square booking
    const cancelRes = await fetch(
      `https://connect.squareup.com/v2/bookings/${square_booking_id}/cancel`,
      {
        method: "POST",
        headers: {
          "Square-Version": "2024-11-20",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_version: squareBooking.version,
        }),
      },
    );

    if (!cancelRes.ok) {
      const err = await cancelRes.json().catch(() => ({}));
      console.error(`[sync-square-cancel] Failed to cancel Square booking ${square_booking_id}:`, err);
      return new Response(
        JSON.stringify({ success: false, error: "Square cancellation failed", details: err }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[sync-square-cancel] Successfully cancelled Square booking ${square_booking_id}`);

    return new Response(
      JSON.stringify({ success: true, square_booking_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[sync-square-cancel] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
