import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Twilio Incoming SMS Webhook
 * 
 * Handles incoming SMS messages and routes them appropriately:
 * 1. Check if sender has an active recovery campaign
 * 2. If yes, process as recovery response
 * 3. Create conversation record for tracking
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse Twilio webhook form data
    const formData = await req.formData();
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const messageBody = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;

    console.log(`[SMS Webhook] Received SMS from ${from} to ${to}: "${messageBody?.substring(0, 50)}..."`);

    if (!from || !to || !messageBody) {
      console.log("[SMS Webhook] Missing required fields");
      return twilioResponse("");
    }

    // Normalize phone number to E.164 format
    const normalizedFrom = normalizePhoneNumber(from);
    const normalizedTo = normalizePhoneNumber(to);

    // Look up tenant by the 'to' number (CloseLoop number)
    const { data: assistantSettings } = await supabase
      .from("assistant_settings")
      .select("tenant_id")
      .eq("closeloop_number", normalizedTo)
      .maybeSingle();

    if (!assistantSettings) {
      console.log(`[SMS Webhook] No tenant found for number ${normalizedTo}`);
      return twilioResponse("");
    }

    const tenantId = assistantSettings.tenant_id;

    // Look up customer by phone
    const { data: customer } = await supabase
      .from("customers")
      .select("id, full_name, do_not_contact")
      .eq("tenant_id", tenantId)
      .eq("phone_e164", normalizedFrom)
      .maybeSingle();

    if (!customer) {
      console.log(`[SMS Webhook] Unknown customer ${normalizedFrom} for tenant ${tenantId}`);
      // Could create a new customer here, but for now just log
      return twilioResponse("");
    }

    // Check if customer opted out
    if (customer.do_not_contact) {
      console.log(`[SMS Webhook] Customer ${customer.id} has do_not_contact=true, ignoring`);
      return twilioResponse("");
    }

    // Check for active recovery campaign
    const { data: activeCampaign } = await supabase
      .from("lead_recovery_campaigns")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customer.id)
      .in("status", ["active", "paused"])
      .maybeSingle();

    if (activeCampaign) {
      // Process as recovery response
      console.log(`[SMS Webhook] Processing as recovery response for campaign ${activeCampaign.id}`);
      
      try {
        const { data: responseResult, error: responseError } = await supabase.functions.invoke(
          "process-recovery-response",
          {
            body: {
              tenant_id: tenantId,
              customer_id: customer.id,
              customer_phone: normalizedFrom,
              response_type: "sms_reply",
              response_content: messageBody,
            },
          }
        );

        if (responseError) {
          console.error("[SMS Webhook] Error processing recovery response:", responseError);
        } else {
          console.log("[SMS Webhook] Recovery response processed:", responseResult);
        }
      } catch (invokeError) {
        console.error("[SMS Webhook] Exception invoking process-recovery-response:", invokeError);
      }
    }

    // Log the inbound message for conversation tracking
    // Find or create a conversation
    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customer.id)
      .eq("channel", "sms")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId = existingConversation?.id;

    if (!conversationId) {
      // Create a new conversation - need a lead_id
      const { data: lead } = await supabase
        .from("leads")
        .select("id")
        .eq("tenant_id", tenantId)
        .or(`phone.eq.${normalizedFrom},email.ilike.%`)
        .limit(1)
        .maybeSingle();

      if (lead) {
        const { data: newConversation } = await supabase
          .from("conversations")
          .insert({
            tenant_id: tenantId,
            lead_id: lead.id,
            customer_id: customer.id,
            channel: "sms",
          })
          .select("id")
          .single();

        conversationId = newConversation?.id;
      }
    }

    // Log the message
    if (conversationId) {
      await supabase.from("messages").insert({
        tenant_id: tenantId,
        conversation_id: conversationId,
        direction: "inbound",
        channel: "sms",
        content: messageBody,
        external_id: messageSid,
        status: "delivered",
      });
    }

    // Return empty TwiML response (no auto-reply)
    return twilioResponse("");

  } catch (error) {
    console.error("[SMS Webhook] Fatal error:", error);
    return twilioResponse("");
  }
});

// Use shared phone normalization
const normalizePhoneNumber = normalizePhoneE164;

/**
 * Return a TwiML response for Twilio
 */
function twilioResponse(message: string): Response {
  const twiml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

  return new Response(twiml, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
