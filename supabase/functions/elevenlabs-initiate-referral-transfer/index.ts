/**
 * elevenlabs-initiate-referral-transfer: Execute a referral transfer.
 *
 * Transfers the live Twilio call from Business A's AI agent to Business B's AI agent.
 * This is the direct agent-switch approach:
 *  1. Registers a NEW ElevenLabs conversation with the target tenant's agent
 *  2. Injects referral context into the target agent's dynamic variables
 *  3. Switches the live Twilio call to the new ElevenLabs stream via REST API
 *
 * Same proven pattern as elevenlabs-transfer-call but targeting another AI agent
 * instead of a human phone number.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAgentIdForMode } from "../_shared/agentResolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransferRequest {
  target_tenant_id?: string;
  transfer_id?: string;
  service_needed?: string;
  caller_name?: string;
  caller_phone?: string;
  caller_location?: string;
  urgency?: string;
  referral_reason?: string;
  notes?: string;
  tenant_id?: string;
  twilio_call_sid?: string;
  conversation_id?: string;
  params?: {
    target_tenant_id?: string;
    transfer_id?: string;
    service_needed?: string;
    caller_name?: string;
    caller_phone?: string;
    caller_location?: string;
    urgency?: string;
    referral_reason?: string;
    notes?: string;
    tenant_id?: string;
    twilio_call_sid?: string;
    conversation_id?: string;
  };
}

const FALLBACK_MSG =
  "I wasn't able to connect you right now. Can I take your info and have someone call you back?";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: TransferRequest = await req.json();
    console.log("[referral-transfer] Request:", JSON.stringify(body));

    // Handle nested params
    const targetTenantId = body.target_tenant_id || body.params?.target_tenant_id || "";
    const transferId = body.transfer_id || body.params?.transfer_id || "";
    const serviceNeeded = body.service_needed || body.params?.service_needed || "";
    const callerName = body.caller_name || body.params?.caller_name || "";
    const callerPhone = body.caller_phone || body.params?.caller_phone || "";
    const callerLocation = body.caller_location || body.params?.caller_location || "";
    const urgency = body.urgency || body.params?.urgency || "normal";
    const referralReason = body.referral_reason || body.params?.referral_reason || "";
    const notes = body.notes || body.params?.notes || "";
    const sourceTenantId = body.tenant_id || body.params?.tenant_id || "";
    const directCallSid = body.twilio_call_sid || body.params?.twilio_call_sid || "";
    const conversationId = body.conversation_id || body.params?.conversation_id || "";

    if (!targetTenantId) {
      return respond(false, FALLBACK_MSG);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    if (!twilioAccountSid || !twilioAuthToken || !elevenLabsApiKey) {
      console.error("[referral-transfer] Missing Twilio or ElevenLabs credentials");
      return respond(false, FALLBACK_MSG);
    }

    // ── Resolve twilio_call_sid from session ──
    let callSid = directCallSid;
    let sourceSessionId: string | null = null;

    if (!callSid && conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("id, twilio_call_sid")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();

      if (session?.twilio_call_sid) {
        callSid = session.twilio_call_sid;
        sourceSessionId = session.id;
      }
    }

    if (callSid && !sourceSessionId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("id")
        .eq("twilio_call_sid", callSid)
        .maybeSingle();
      sourceSessionId = session?.id || null;
    }

    if (!callSid || callSid.startsWith("missing_")) {
      console.error(`[referral-transfer] No valid twilio_call_sid (got: ${callSid})`);
      return respond(false, FALLBACK_MSG);
    }

    // ── Chain prevention: check referral_depth ──
    if (transferId) {
      const { data: existingTransfer } = await supabase
        .from("referral_transfers")
        .select("referral_depth")
        .eq("id", transferId)
        .maybeSingle();

      if (existingTransfer && (existingTransfer.referral_depth || 1) >= 2) {
        console.warn("[referral-transfer] Chain prevention: max depth reached");
        return respond(
          false,
          "I'm not able to transfer further. Can I take your info and have someone call you back?"
        );
      }
    }

    // Also check if this call already has a referral transfer (by session)
    if (sourceSessionId) {
      const { data: existingRef } = await supabase
        .from("ai_call_sessions")
        .select("is_referral_receiving")
        .eq("id", sourceSessionId)
        .maybeSingle();

      if (existingRef?.is_referral_receiving) {
        console.warn("[referral-transfer] Chain prevention: session is already a referral");
        return respond(
          false,
          "I'm not able to transfer further. Can I take your info and have someone call you back?"
        );
      }
    }

    // ── Fetch target tenant config ──
    const { data: targetTenant, error: targetErr } = await supabase
      .from("tenants")
      .select("id, business_name, business_mode, enabled_modules, capabilities_json, industry")
      .eq("id", targetTenantId)
      .single();

    if (targetErr || !targetTenant) {
      console.error("[referral-transfer] Target tenant not found:", targetTenantId);
      return respond(false, FALLBACK_MSG);
    }

    // ── Resolve target agent ID ──
    const internalSecret = Deno.env.get("CLOSELOOP_INTERNAL_SECRET");

    // Build target business context via internal call
    const contextRes = await fetch(`${supabaseUrl}/functions/v1/copilot-context`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-closeloop-secret": internalSecret || "",
      },
      body: JSON.stringify({
        tenant_id: targetTenantId,
        channel: "voice",
        caller_phone: callerPhone,
      }),
    });

    let dynamicVariables: Record<string, string | number | boolean> = {};
    let targetAgentId = "";

    if (contextRes.ok) {
      const contextData = await contextRes.json();
      dynamicVariables = contextData.dynamic_variables || {};
      targetAgentId = contextData.agent_id || "";
    }

    // Fallback: use mode-based env var resolution (same path as twilio-inbound)
    if (!targetAgentId) {
      const resolution = getAgentIdForMode(targetTenant.business_mode);
      targetAgentId = resolution.agentId || "";
    }

    if (!targetAgentId) {
      console.error("[referral-transfer] No agent_id for target tenant");
      return respond(false, FALLBACK_MSG);
    }

    // ── Inject referral context into dynamic variables ──
    // Look up source business name
    let sourceName = "another business";
    if (sourceTenantId) {
      const { data: srcTenant } = await supabase
        .from("tenants")
        .select("business_name")
        .eq("id", sourceTenantId)
        .single();
      sourceName = srcTenant?.business_name || "another business";
    }

    dynamicVariables.is_referral_transfer = "true";
    dynamicVariables.referral_caller_name = callerName || "";
    dynamicVariables.referral_caller_need = serviceNeeded || "";
    dynamicVariables.referral_caller_phone = callerPhone || "";
    dynamicVariables.referral_source_business = sourceName;
    dynamicVariables.referral_context =
      `Caller was speaking with ${sourceName}` +
      (serviceNeeded ? ` and needs ${serviceNeeded}` : "") +
      (callerLocation ? ` in ${callerLocation}` : "") +
      (callerName ? `. Their name is ${callerName}` : "") +
      ".";

    // ── Register new ElevenLabs conversation ──
    console.log(
      `[referral-transfer] Registering agent=${targetAgentId.slice(0, 8)}... ` +
        `for tenant=${targetTenantId.slice(0, 8)}...`
    );

    const registerRes = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": elevenLabsApiKey,
        },
        body: JSON.stringify({
          agent_id: targetAgentId,
          dynamic_variables: dynamicVariables,
        }),
      }
    );

    if (!registerRes.ok) {
      const errText = await registerRes.text();
      console.error(
        `[referral-transfer] ElevenLabs register-call failed [${registerRes.status}]: ${errText}`
      );
      return respond(false, FALLBACK_MSG);
    }

    const registerData = await registerRes.json();
    // ElevenLabs returns TwiML with a <Stream> WebSocket URL
    // The response format has the conversation_id embedded in the stream URL
    const twiml = registerData.twiml || "";

    // Extract conversation_id from stream URL
    const convIdMatch = twiml.match(/conversation_id=([a-zA-Z0-9_-]+)/);
    const targetConversationId = convIdMatch?.[1] || "";

    console.log(
      `[referral-transfer] Got TwiML (${twiml.length} chars), ` +
        `conv_id=${targetConversationId || "unknown"}`
    );

    // ── Create target session ──
    const { data: targetSession } = await supabase
      .from("ai_call_sessions")
      .insert({
        tenant_id: targetTenantId,
        twilio_call_sid: callSid,
        elevenlabs_conversation_id: targetConversationId || null,
        started_at: new Date().toISOString(),
        is_referral_receiving: true,
        referral_transfer_id: transferId || null,
      })
      .select("id")
      .single();

    // ── Update source session ──
    if (sourceSessionId) {
      await supabase
        .from("ai_call_sessions")
        .update({
          outcome: "referral_transfer",
          referral_transfer_id: transferId || null,
        })
        .eq("id", sourceSessionId);
    }

    // ── Update referral_transfers record ──
    if (transferId) {
      await supabase
        .from("referral_transfers")
        .update({
          status: "transferring",
          target_session_id: targetSession?.id || null,
        })
        .eq("id", transferId);
    }

    // ── Switch the live Twilio call to the new agent ──
    // Prepend a brief pause to let the AI finish its farewell
    const switchTwiml = twiml.replace("<Response>", "<Response><Pause length=\"2\"/>");

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls/${callSid}.json`;
    const authHeader = "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const updateParams = new URLSearchParams();
    updateParams.set("Twiml", switchTwiml);

    console.log(`[referral-transfer] Updating Twilio call ${callSid}`);

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
      console.error(
        `[referral-transfer] Twilio update failed [${twilioRes.status}]: ${errText}`
      );

      // Update transfer status to failed
      if (transferId) {
        await supabase
          .from("referral_transfers")
          .update({
            status: "failed",
            failure_reason: `Twilio ${twilioRes.status}: ${errText.substring(0, 200)}`,
          })
          .eq("id", transferId);
      }

      return respond(false, FALLBACK_MSG);
    }

    // ── Success: update transfer status ──
    if (transferId) {
      await supabase
        .from("referral_transfers")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", transferId);

      // Increment referrals_today for target
      await supabase.rpc("increment_referrals_today", {
        p_tenant_id: targetTenantId,
      }).catch((err: unknown) => {
        console.error("[referral-transfer] increment_referrals_today RPC failed:", err);
      });
    }

    console.log(
      `[referral-transfer] Successfully transferred call ${callSid} ` +
        `to ${targetTenant.business_name}`
    );

    return respond(
      true,
      `Connecting you to ${targetTenant.business_name} now. One moment please.`
    );
  } catch (error) {
    console.error("[referral-transfer] Error:", error);
    return respond(false, FALLBACK_MSG);
  }
});

function respond(success: boolean, message: string) {
  return new Response(
    JSON.stringify({ success, message }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
