/**
 * portal-booking-action: Allow customers to reschedule or cancel bookings
 * via their portal link.
 *
 * Accepts:
 *   { token, tenant_id, booking_id, action: "cancel" | "reschedule", new_start_at? }
 *
 * Auth: Portal token (HMAC-SHA256, same as verify-portal-token)
 */
import { corsHeaders, corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/tenant.ts";

async function verifyPortalToken(
  token: string,
  tenantId: string,
): Promise<{ valid: boolean; customerId?: string; error?: string }> {
  const secret = Deno.env.get("PORTAL_TOKEN_SECRET");
  if (!secret) return { valid: false, error: "PORTAL_TOKEN_SECRET not configured" };

  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, error: "Invalid token format" };

  const [payloadB64, signatureB64] = parts;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  const expectedSigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const expectedSigArray = Array.from(new Uint8Array(expectedSigBuffer));
  const expectedSigB64 = btoa(String.fromCharCode(...expectedSigArray));

  if (signatureB64.length !== expectedSigB64.length) return { valid: false, error: "Invalid token" };
  let mismatch = 0;
  for (let i = 0; i < signatureB64.length; i++) {
    mismatch |= signatureB64.charCodeAt(i) ^ expectedSigB64.charCodeAt(i);
  }
  if (mismatch !== 0) return { valid: false, error: "Invalid token" };

  let payload: { customer_id: string; tenant_id: string; iat: number; exp: number };
  try {
    payload = JSON.parse(atob(payloadB64));
  } catch {
    return { valid: false, error: "Malformed token" };
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) return { valid: false, error: "Token expired" };
  if (payload.tenant_id !== tenantId) return { valid: false, error: "Tenant mismatch" };

  return { valid: true, customerId: payload.customer_id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { token, tenant_id, booking_id, action, new_start_at } = await req.json();

    if (!token || !tenant_id || !booking_id || !action) {
      return errorResponse("Missing required fields: token, tenant_id, booking_id, action", 400);
    }

    if (!["cancel", "reschedule"].includes(action)) {
      return errorResponse("Invalid action. Must be 'cancel' or 'reschedule'", 400);
    }

    // Verify portal token
    const tokenResult = await verifyPortalToken(token, tenant_id);
    if (!tokenResult.valid) {
      return jsonResponse({ success: false, error: tokenResult.error }, 401);
    }

    const supabase = serviceClient();

    // Fetch the booking and verify it belongs to this customer
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, tenant_id, lead_id, status, start_at, leads(customer_id)")
      .eq("id", booking_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (bookingErr || !booking) {
      return errorResponse("Booking not found", 404);
    }

    // Verify the booking belongs to this customer (via lead → customer)
    const leadCustomerId = (booking.leads as any)?.customer_id;
    if (leadCustomerId !== tokenResult.customerId) {
      return errorResponse("Booking does not belong to this customer", 403);
    }

    // Only allow actions on modifiable statuses
    const modifiableStatuses = ["pending", "confirmed"];
    if (!modifiableStatuses.includes(booking.status)) {
      return errorResponse(`Cannot ${action} a booking with status '${booking.status}'`, 422);
    }

    if (action === "cancel") {
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          status: "canceled",
          notes: `${booking.notes ? booking.notes + "\n" : ""}[Customer cancelled via portal on ${new Date().toISOString()}]`,
        } as any)
        .eq("id", booking_id);

      if (updateErr) {
        console.error("[portal-booking-action] Cancel error:", updateErr);
        return errorResponse("Failed to cancel booking", 500);
      }

      return jsonResponse({ success: true, action: "cancel", booking_id });
    }

    if (action === "reschedule") {
      if (!new_start_at) {
        return errorResponse("new_start_at is required for reschedule", 400);
      }

      // Validate the new time is in the future
      const newDate = new Date(new_start_at);
      if (isNaN(newDate.getTime()) || newDate <= new Date()) {
        return errorResponse("new_start_at must be a valid future date", 422);
      }

      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          start_at: new_start_at,
          status: "pending", // Reset to pending for owner re-approval
          notes: `${booking.notes ? booking.notes + "\n" : ""}[Customer rescheduled via portal on ${new Date().toISOString()}. Previous time: ${booking.start_at}]`,
        } as any)
        .eq("id", booking_id);

      if (updateErr) {
        console.error("[portal-booking-action] Reschedule error:", updateErr);
        return errorResponse("Failed to reschedule booking", 500);
      }

      return jsonResponse({ success: true, action: "reschedule", booking_id, new_start_at });
    }

    return errorResponse("Unknown action", 400);
  } catch (err: unknown) {
    console.error("[portal-booking-action] Error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(message, 500);
  }
});
