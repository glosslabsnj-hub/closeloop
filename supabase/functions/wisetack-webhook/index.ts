import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wisetack-signature",
};

interface WisetackWebhookPayload {
  event_type: string;
  loan_id: string;
  merchant_id: string;
  status: string;
  amount_cents?: number;
  customer_email?: string;
  customer_phone?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: {
    tenant_id?: string;
    estimate_id?: string;
    booking_id?: string;
    customer_id?: string;
  };
}

// Verify Wisetack webhook signature
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return signature === expectedSignature;
  } catch {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const payload: WisetackWebhookPayload = JSON.parse(rawBody);

    // Verify webhook signature if configured
    const webhookSecret = Deno.env.get("WISETACK_WEBHOOK_SECRET");
    const signature = req.headers.get("x-wisetack-signature");

    if (webhookSecret && signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Received Wisetack webhook:", payload.event_type, payload.loan_id);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract metadata
    const tenantId = payload.metadata?.tenant_id;
    const estimateId = payload.metadata?.estimate_id;
    const bookingId = payload.metadata?.booking_id;

    // Handle different event types
    switch (payload.event_type) {
      case "loan.approved":
        console.log(`Loan ${payload.loan_id} approved`);

        // Update estimate status if linked
        if (estimateId) {
          await supabase
            .from("estimates")
            .update({
              status: "accepted",
              updated_at: new Date().toISOString(),
            })
            .eq("id", estimateId);
        }

        // Log the financing approval
        if (tenantId) {
          try {
            await supabase.from("activity_log").insert({
              tenant_id: tenantId,
              entity_type: "financing",
              entity_id: payload.loan_id,
              action: "approved",
              details: {
                loan_id: payload.loan_id,
                amount_cents: payload.amount_cents,
                estimate_id: estimateId,
                booking_id: bookingId,
              },
            });
          } catch {
            // activity_log table might not exist, ignore
          }
        }
        break;

      case "loan.funded":
        console.log(`Loan ${payload.loan_id} funded`);

        // Convert estimate to job/booking if configured
        if (estimateId) {
          await supabase
            .from("estimates")
            .update({
              status: "converted",
              updated_at: new Date().toISOString(),
            })
            .eq("id", estimateId);
        }
        break;

      case "loan.declined":
        console.log(`Loan ${payload.loan_id} declined`);

        // Log the decline but don't update estimate status
        // Customer might want to pay differently
        if (tenantId) {
          try {
            await supabase.from("activity_log").insert({
              tenant_id: tenantId,
              entity_type: "financing",
              entity_id: payload.loan_id,
              action: "declined",
              details: {
                loan_id: payload.loan_id,
                estimate_id: estimateId,
                booking_id: bookingId,
              },
            });
          } catch {
            // activity_log table might not exist, ignore
          }
        }
        break;

      case "loan.expired":
        console.log(`Loan ${payload.loan_id} expired`);
        break;

      case "loan.cancelled":
        console.log(`Loan ${payload.loan_id} cancelled`);
        break;

      default:
        console.log(`Unhandled event type: ${payload.event_type}`);
    }

    // Store the webhook event for audit
    if (tenantId) {
      try {
        await supabase.from("webhook_events").insert({
          tenant_id: tenantId,
          source: "wisetack",
          event_type: payload.event_type,
          payload: payload,
          received_at: new Date().toISOString(),
        });
      } catch {
        // webhook_events table might not exist, ignore
      }
    }

    return new Response(
      JSON.stringify({ success: true, event: payload.event_type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing Wisetack webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
