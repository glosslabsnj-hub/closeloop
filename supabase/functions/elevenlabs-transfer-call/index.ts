/**
 * ElevenLabs Tool: Transfer Call to Owner
 *
 * Mid-call transfer via Twilio REST API. When a caller asks to speak
 * to a person, this function:
 * 1. Looks up the twilio_call_sid from ai_call_sessions
 * 2. Looks up owner_forward_number from assistant_settings
 * 3. Updates the live Twilio call with <Dial> TwiML to forward
 * 4. Marks the session outcome as "escalated"
 *
 * If the owner doesn't answer (30s timeout), caller hears a fallback
 * message and the call ends gracefully.
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    if (!callSid && conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("id, twilio_call_sid")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();

      if (session?.twilio_call_sid) {
        callSid = session.twilio_call_sid;
        sessionId = session.id;
      }
    }

    // Also try to get session ID if we have callSid but no sessionId
    if (callSid && !sessionId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("id")
        .eq("twilio_call_sid", callSid)
        .maybeSingle();
      sessionId = session?.id || null;
    }

    if (!callSid || callSid.startsWith("missing_") || callSid === "undefined" || callSid === "null" || callSid.length < 20) {
      console.error(`[transfer-call] No valid twilio_call_sid found (got: ${callSid})`);
      return new Response(
        JSON.stringify({
          success: false,
          message: "I can't transfer right now, but let me take your info and have someone call you right back.",
        } as TransferResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Look up the owner's forward number
    const { data: settings } = await supabase
      .from("assistant_settings")
      .select("owner_forward_number")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const forwardNumber = settings?.owner_forward_number;

    if (!forwardNumber) {
      console.error("[transfer-call] No owner_forward_number configured");
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
      `  <Dial timeout="30" action="${supabaseUrl}/functions/v1/elevenlabs-transfer-call?event=dial_complete&amp;tenant_id=${encodeURIComponent(tenantId)}&amp;session_id=${encodeURIComponent(sessionId || "")}">`,
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
 * This is called after the dial attempt finishes (answered, no-answer, busy, etc).
 * For now, Twilio handles fallback via the <Say> after <Dial> in the TwiML.
 * This endpoint can be extended for logging if needed.
 */

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
