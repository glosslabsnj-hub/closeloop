/**
 * ElevenLabs Tool: Transfer Call to Owner
 *
 * Mid-call transfer via Twilio REST API. When a caller asks to speak
 * to a person, this function:
 * 1. Looks up the twilio_call_sid from ai_call_sessions
 * 2. Looks up owner_forward_number from assistant_settings
 * 3. Updates the live Twilio call with <Dial> TwiML to forward
 * 4. Marks the session outcome as "escalated"
 * 5. Sends tenant-aware notifications (SMS + email via delivery settings)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/sendEmail.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransferRequest {
  tenant_id: string;
  conversation_id?: string;
  twilio_call_sid?: string;
  customer_name?: string;
  reason?: string;
  params?: {
    tenant_id?: string;
    conversation_id?: string;
    twilio_call_sid?: string;
    customer_name?: string;
    reason?: string;
  };
}

interface TransferResponse {
  success: boolean;
  message: string;
  transferred_to?: string;
  error?: string;
}

/** Notify the tenant owner about transfer events via SMS + email.
 *  Now writes to delivery_attempts for monitoring by check-handoff-failures and retry-failed-deliveries. */
async function notifyOwner(
  supabase: SupabaseClient,
  tenantId: string,
  subject: string,
  message: string,
  htmlMessage: string,
  entityId?: string | null,
): Promise<void> {
  // Look up owner notification preferences from universal_delivery_settings
  const { data: deliverySettings } = await supabase
    .from("universal_delivery_settings")
    .select("notify_email, notify_phone, email_enabled, sms_enabled")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  // Helper to log delivery attempts for monitoring
  const logDeliveryAttempt = async (method: string, status: string, errorMessage?: string) => {
    try {
      await supabase.from("delivery_attempts").insert({
        tenant_id: tenantId,
        entity_type: "transfer",
        entity_id: entityId || crypto.randomUUID(),
        method,
        status,
        error_message: errorMessage || null,
        request_payload: { subject, message_preview: message.slice(0, 200) },
      });
    } catch (e) {
      console.error("[transfer-call] Failed to log delivery attempt:", e);
    }
  };

  // Send SMS if configured
  if (deliverySettings?.sms_enabled && deliverySettings?.notify_phone) {
    try {
      const smsResult = await sendTenantSms({
        tenantId,
        to: deliverySettings.notify_phone,
        body: message,
      });
      if (smsResult.success) {
        await logDeliveryAttempt("sms", "success");
      } else if (smsResult.skipped) {
        await logDeliveryAttempt("sms", "skipped", smsResult.reason || "no_verified_channel");
      } else {
        await logDeliveryAttempt("sms", "failed", smsResult.error || "unknown");
      }
    } catch (err) {
      console.error("[transfer-call] SMS notification failed:", err);
      await logDeliveryAttempt("sms", "failed", String(err));
    }
  }

  // Send email if configured
  if (deliverySettings?.email_enabled && deliverySettings?.notify_email) {
    try {
      const emailResult = await sendEmail({
        to: deliverySettings.notify_email,
        subject,
        html: htmlMessage,
      });
      if (emailResult.success) {
        await logDeliveryAttempt("email", "success");
      } else {
        await logDeliveryAttempt("email", "failed", emailResult.error || "unknown");
      }
    } catch (err) {
      console.error("[transfer-call] Email notification failed:", err);
      await logDeliveryAttempt("email", "failed", String(err));
    }
  }

  if (!deliverySettings?.sms_enabled && !deliverySettings?.email_enabled) {
    console.warn("[transfer-call] No notification channels configured for tenant", tenantId.slice(0, 8));
    await logDeliveryAttempt("sms", "skipped", "no_channels_configured");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if this is a Twilio dial_complete callback
  const url = new URL(req.url);
  if (url.searchParams.get("event") === "dial_complete") {
    return handleDialComplete(req, url);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    const body: TransferRequest = await req.json();

    // Handle nested params from ElevenLabs
    const tenantId = body.tenant_id || body.params?.tenant_id || "";
    const conversationId = body.conversation_id || body.params?.conversation_id || "";
    const directCallSid = body.twilio_call_sid || body.params?.twilio_call_sid || "";
    const customerName = body.customer_name || body.params?.customer_name || "";
    const reason = body.reason || body.params?.reason || "caller requested transfer";

    console.log(`[transfer-call] tenant=${tenantId.slice(0, 8)}, conv=${conversationId}, callSid=${directCallSid}, reason=${reason}`);

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Sorry, I can't transfer right now. Can I take your info and have someone call you back?",
        } as TransferResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!twilioAccountSid || !twilioAuthToken) {
      console.error("[transfer-call] Missing Twilio credentials");
      await notifyOwner(supabase, tenantId,
        "Transfer Failed - Missing Configuration",
        "A caller tried to transfer but Twilio is not configured. Please contact support.",
        `<h3>Transfer Failed</h3><p>A caller tried to reach you but the phone system is not configured. Please contact support.</p>`,
        conversationId || null,
      );
      return new Response(
        JSON.stringify({
          success: false,
          message: "Sorry, I can't transfer right now. Can I take your info and have someone call you back?",
          error: "Missing Twilio credentials",
        } as TransferResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Resolve the twilio_call_sid from the session
    let callSid = directCallSid;
    let sessionId: string | null = null;

    // Strategy A: direct callSid provided
    if (callSid && !callSid.startsWith("missing_") && callSid !== "undefined" && callSid !== "null" && callSid.length >= 20) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("id")
        .eq("twilio_call_sid", callSid)
        .maybeSingle();
      sessionId = session?.id || null;
      console.log(`[transfer-call] Strategy A (direct): callSid=${callSid}, sessionId=${sessionId}`);
    }

    // Strategy B: lookup by conversation_id
    if ((!callSid || callSid.length < 20) && conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("id, twilio_call_sid")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();

      if (session?.twilio_call_sid) {
        callSid = session.twilio_call_sid;
        sessionId = session.id;
        console.log(`[transfer-call] Strategy B (conversation_id): callSid=${callSid}, sessionId=${sessionId}`);
      }
    }

    // Strategy C: fallback — most recent active session for this tenant (created in last 5 min)
    if (!callSid || callSid.startsWith("missing_") || callSid === "undefined" || callSid === "null" || callSid.length < 20) {
      const { data: recentSession } = await supabase
        .from("ai_call_sessions")
        .select("id, twilio_call_sid")
        .eq("tenant_id", tenantId)
        .not("twilio_call_sid", "is", null)
        .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentSession?.twilio_call_sid) {
        callSid = recentSession.twilio_call_sid;
        sessionId = recentSession.id;
        console.log(`[transfer-call] Strategy C (recent session fallback): callSid=${callSid}, sessionId=${sessionId}`);
      }
    }

    if (!callSid || callSid.startsWith("missing_") || callSid === "undefined" || callSid === "null" || callSid.length < 20) {
      console.error(`[transfer-call] No valid twilio_call_sid found (got: ${callSid})`);
      await notifyOwner(supabase, tenantId,
        "Missed Transfer - Call Back Needed",
        `Transfer failed: ${customerName ? `${customerName} ` : "A caller "}tried to reach you. Reason: ${reason}. They were asked to leave their info.`,
        `<h3>Transfer Failed</h3>${customerName ? `<p><strong>Caller:</strong> ${customerName}</p>` : ""}<p><strong>Reason:</strong> ${reason}</p><p>The caller was asked to leave their info for a callback.</p>`,
        sessionId || conversationId || null,
      );
      return new Response(
        JSON.stringify({
          success: false,
          message: "I can't transfer right now, but let me take your info and have someone call you right back.",
        } as TransferResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Look up the owner's forward number and business name
    const { data: settings } = await supabase
      .from("assistant_settings")
      .select("owner_forward_number")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle();

    const forwardNumber = settings?.owner_forward_number;
    const businessName = tenant?.name || "Unknown business";

    if (!forwardNumber) {
      console.error("[transfer-call] No owner_forward_number configured");
      await notifyOwner(supabase, tenantId,
        "Transfer Failed - No Forward Number",
        `Transfer failed for ${businessName}: ${customerName ? `${customerName} ` : "A caller "}tried to reach you but no forward number is set. Configure it in Settings > AI Assistant.`,
        `<h3>Transfer Failed</h3><p><strong>Business:</strong> ${businessName}</p>${customerName ? `<p><strong>Caller:</strong> ${customerName}</p>` : ""}<p><strong>Reason:</strong> ${reason}</p><p>No forward number is configured. Set it in Settings &gt; AI Assistant.</p>`,
        sessionId || conversationId || null,
      );
      return new Response(
        JSON.stringify({
          success: false,
          message: "Nobody's available to take the call right now. Can I get your info and have someone call you back?",
        } as TransferResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Build TwiML for the transfer
    const twiml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<Response>",
      '  <Pause length="2"/>',
      `  <Dial timeout="30" action="${supabaseUrl}/functions/v1/elevenlabs-transfer-call?event=dial_complete&amp;tenant_id=${encodeURIComponent(tenantId)}&amp;session_id=${encodeURIComponent(sessionId || "")}&amp;customer_name=${encodeURIComponent(customerName)}&amp;business_name=${encodeURIComponent(businessName)}">`,
      `    <Number>${escapeXml(forwardNumber)}</Number>`,
      "  </Dial>",
      "  <Say>Sorry, nobody was available to take your call. Someone will call you back shortly.</Say>",
      "  <Hangup/>",
      "</Response>",
    ].join("\n");

    // Step 4: Update the live call via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls/${callSid}.json`;
    const authHeader = "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const updateParams = new URLSearchParams();
    updateParams.set("Twiml", twiml);

    console.log(`[transfer-call] Updating call ${callSid} to dial ${forwardNumber}`);

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: updateParams.toString(),
    });

    if (!twilioRes.ok) {
      const errText = await twilioRes.text();
      console.error(`[transfer-call] Twilio update failed [${twilioRes.status}]: ${errText}`);
      await notifyOwner(supabase, tenantId,
        "Transfer Failed - Phone System Error",
        `Transfer failed for ${businessName}: ${customerName ? `${customerName} ` : "A caller "}tried to reach you. Phone system error (${twilioRes.status}). They were asked to leave their info.`,
        `<h3>Transfer Failed</h3><p><strong>Business:</strong> ${businessName}</p>${customerName ? `<p><strong>Caller:</strong> ${customerName}</p>` : ""}<p><strong>Error:</strong> Twilio API returned ${twilioRes.status}</p>`,
        sessionId || conversationId || null,
      );
      return new Response(
        JSON.stringify({
          success: false,
          message: "I wasn't able to transfer you right now. Can I take your info and have them call you back?",
          error: `Twilio ${twilioRes.status}`,
        } as TransferResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 5: Update session outcome to escalated
    if (sessionId) {
      await supabase
        .from("ai_call_sessions")
        .update({
          outcome: "escalated",
          summary: `Caller ${customerName ? `(${customerName}) ` : ""}requested transfer. Reason: ${reason}`,
        })
        .eq("id", sessionId);
    }

    console.log(`[transfer-call] Successfully transferring call ${callSid} to ${forwardNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Transferring you now. One moment.",
        transferred_to: "owner",
      } as TransferResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[transfer-call] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "I wasn't able to transfer you. Let me take your info and have someone call you right back.",
        error: error instanceof Error ? error.message : "Unknown error",
      } as TransferResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Handle the Twilio <Dial> action callback (dial_complete event).
 * Called after the dial attempt finishes (answered, no-answer, busy, failed).
 * Notifies the business owner of the outcome via their configured channels.
 */
async function handleDialComplete(req: Request, url: URL): Promise<Response> {
  try {
    const formData = await req.text();
    const params = new URLSearchParams(formData);

    const dialCallStatus = params.get("DialCallStatus") || "unknown";
    const dialCallDuration = params.get("DialCallDuration") || "0";
    const tenantId = url.searchParams.get("tenant_id") || "";
    const sessionId = url.searchParams.get("session_id") || "";
    const customerName = url.searchParams.get("customer_name") || "";
    const businessName = url.searchParams.get("business_name") || "";

    console.log(`[transfer-call] dial_complete: status=${dialCallStatus}, duration=${dialCallDuration}s, tenant=${tenantId.slice(0, 8)}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update session with transfer result
    if (sessionId) {
      const summaryText = dialCallStatus === "completed"
        ? `Transfer successful. Owner spoke with caller for ${dialCallDuration}s.`
        : `Transfer attempted but owner didn't answer (${dialCallStatus}).`;

      await supabase
        .from("ai_call_sessions")
        .update({ summary: summaryText })
        .eq("id", sessionId);
    }

    // Notify owner if they missed the transfer
    if (dialCallStatus !== "completed" && tenantId) {
      await notifyOwner(supabase, tenantId,
        "Missed Transfer - Call Back Needed",
        `MISSED TRANSFER${businessName ? ` (${businessName})` : ""}${customerName ? `: ${customerName}` : ""} - Status: ${dialCallStatus}. The caller was told someone would call back. Please call them back ASAP.`,
        `<h3>Missed Transfer</h3>${businessName ? `<p><strong>Business:</strong> ${businessName}</p>` : ""}${customerName ? `<p><strong>Caller:</strong> ${customerName}</p>` : ""}<p><strong>Status:</strong> ${dialCallStatus}</p><p>The caller heard "someone will call you back shortly." Please call them back ASAP.</p>`,
        sessionId || null,
      );
    }

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("[transfer-call] dial_complete error:", error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { ...corsHeaders, "Content-Type": "text/xml" } }
    );
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
