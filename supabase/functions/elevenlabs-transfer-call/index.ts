/**
 * ElevenLabs Tool: Transfer Call to Owner
 *
 * Mid-call transfer via Twilio REST API. When a caller asks to speak
 * to a person, this function:
 * 1. Looks up the twilio_call_sid from ai_call_sessions
 * 2. Looks up owner_forward_number from assistant_settings
 * 3. Updates the live Twilio call with <Dial> TwiML to forward
 * 4. Marks the session outcome as "escalated"
 * 5. Sends Telegram notification to Jack
 *
 * Also handles the Twilio <Dial> action callback (dial_complete event)
 * to notify Jack whether the transfer succeeded or the caller hung up.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/** Send a Telegram message to Jack via the Lenard bot */
async function notifyJack(message: string): Promise<void> {
  const botToken = Deno.env.get("LENARD_TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("LENARD_TELEGRAM_CHAT_ID");
  if (!botToken || !chatId) {
    console.warn("[transfer-call] Telegram credentials not configured, skipping notification");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("[transfer-call] Telegram notification failed:", err);
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: TransferRequest = await req.json();

    // Handle nested params from ElevenLabs
    const tenantId = body.tenant_id || body.params?.tenant_id || "";
    const conversationId = body.conversation_id || body.params?.conversation_id || "";
    const directCallSid = body.twilio_call_sid || body.params?.twilio_call_sid || "";
    const customerName = body.customer_name || body.params?.customer_name || "";
    const reason = body.reason || body.params?.reason || "caller requested transfer";

    console.log(`[transfer-call] tenant=${tenantId.slice(0, 8)}, conv=${conversationId}, callSid=${directCallSid}, reason=${reason}`);

    if (!tenantId) {
      await notifyJack(`<b>TRANSFER FAILED</b>\nNo tenant ID provided. A caller tried to reach you but the system couldn't process the transfer.`);
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
      await notifyJack(`<b>TRANSFER FAILED</b>\nMissing Twilio credentials. A caller tried to reach you but the system couldn't process it.`);
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
    // Three lookup strategies, in order of specificity:
    //   A. Direct callSid from ElevenLabs dynamic variable (most reliable)
    //   B. Lookup by conversation_id in ai_call_sessions
    //   C. Fallback: most recent active session for this tenant (last 5 min)
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
      await notifyJack(
        `<b>TRANSFER FAILED</b>\n` +
        `${customerName ? `Caller: ${customerName}\n` : ""}` +
        `Reason: ${reason}\n` +
        `Error: No valid call SID found. The caller was asked to leave their info.`
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
      await notifyJack(
        `<b>TRANSFER FAILED</b>\n` +
        `Business: ${businessName}\n` +
        `${customerName ? `Caller: ${customerName}\n` : ""}` +
        `Reason: ${reason}\n` +
        `Error: No forward number configured for this business. Set it in the dashboard.`
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
    // Short delay to let ElevenLabs finish speaking the farewell message
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
      await notifyJack(
        `<b>TRANSFER FAILED</b>\n` +
        `Business: ${businessName}\n` +
        `${customerName ? `Caller: ${customerName}\n` : ""}` +
        `Reason: ${reason}\n` +
        `Error: Twilio API returned ${twilioRes.status}. The caller was asked to leave their info.`
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

    // No "incoming" notification needed — Jack's phone rings directly.
    // If he misses it, the dial_complete handler sends a MISSED TRANSFER alert.

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
    await notifyJack(
      `<b>TRANSFER ERROR</b>\nA caller tried to transfer but the system hit an error: ${error instanceof Error ? error.message : "Unknown"}`
    );
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
 * Notifies Jack of the outcome.
 */
async function handleDialComplete(req: Request, url: URL): Promise<Response> {
  try {
    // Twilio sends form-encoded data for action callbacks
    const formData = await req.text();
    const params = new URLSearchParams(formData);

    const dialCallStatus = params.get("DialCallStatus") || "unknown";
    const dialCallDuration = params.get("DialCallDuration") || "0";
    const tenantId = url.searchParams.get("tenant_id") || "";
    const sessionId = url.searchParams.get("session_id") || "";
    const customerName = url.searchParams.get("customer_name") || "";
    const businessName = url.searchParams.get("business_name") || "";

    console.log(`[transfer-call] dial_complete: status=${dialCallStatus}, duration=${dialCallDuration}s, tenant=${tenantId.slice(0, 8)}`);

    // Update session with transfer result
    if (sessionId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const summaryText = dialCallStatus === "completed"
        ? `Transfer successful. Owner spoke with caller for ${dialCallDuration}s.`
        : `Transfer attempted but owner didn't answer (${dialCallStatus}).`;

      await supabase
        .from("ai_call_sessions")
        .update({ summary: summaryText })
        .eq("id", sessionId);
    }

    // Notify Jack based on outcome
    if (dialCallStatus === "completed") {
      // Owner answered. No need to alert since they just had the conversation.
      console.log("[transfer-call] Transfer completed successfully");
    } else {
      // Owner didn't answer (no-answer, busy, failed, canceled)
      await notifyJack(
        `<b>MISSED TRANSFER</b>\n` +
        `${businessName ? `Business: ${businessName}\n` : ""}` +
        `${customerName ? `Caller: ${customerName}\n` : ""}` +
        `Status: ${dialCallStatus}\n` +
        `The caller heard "someone will call you back shortly." Call them back ASAP.`
      );
    }

    // Return empty TwiML (Twilio needs a valid response)
    // The <Say> and <Hangup> in the original TwiML handle the caller-side fallback
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
