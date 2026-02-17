/**
 * outbound-call
 *
 * Initiates an outbound AI phone call via Twilio + ElevenLabs.
 * Used for appointment reminders, warm lead follow-ups, review requests, and no-show recovery.
 *
 * Called by: cron-process-outbound-queue
 *
 * Payload:
 *   tenant_id       - Required
 *   customer_phone  - Required (E.164)
 *   call_purpose    - Required: reminder | followup | recovery | review | no_show_recovery
 *   context         - Optional: entity details, history, etc.
 *   queue_item_id   - Optional: outbound_call_queue record ID
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { buildBusinessContext, buildDynamicVariables } from "../_shared/buildBusinessContext.ts";
import { getAgentIdForMode } from "../_shared/agentResolver.ts";

interface OutboundCallPayload {
  tenant_id: string;
  customer_phone: string;
  call_purpose: "reminder" | "followup" | "recovery" | "review" | "no_show_recovery";
  context?: Record<string, unknown>;
  queue_item_id?: string;
}

// Purpose-specific opening prompts
const PURPOSE_PROMPTS: Record<string, string> = {
  reminder: "Hi {{customer_name}}, this is {{business_name}}'s assistant calling to confirm your {{service_name}} appointment {{appointment_time}}. Would you like to confirm, reschedule, or cancel?",
  followup: "Hi {{customer_name}}, this is {{business_name}} following up on your call earlier about {{service_requested}}. I wanted to check if you had any other questions or if you'd like to go ahead and schedule?",
  recovery: "Hi {{customer_name}}, this is {{business_name}}. We noticed you were interested in {{service_requested}} — we'd love to help you get that scheduled. Do you have a moment?",
  review: "Hi {{customer_name}}, this is {{business_name}}. We wanted to check in — how was your recent {{service_name}} with us? We'd love to hear your feedback.",
  no_show_recovery: "Hi {{customer_name}}, this is {{business_name}}. We noticed you missed your appointment today. No worries at all — would you like to reschedule? I can check what's available.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const payload: OutboundCallPayload = await req.json();

    if (!payload.tenant_id || !payload.customer_phone || !payload.call_purpose) {
      return errorResponse("Missing required fields: tenant_id, customer_phone, call_purpose");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const elevenLabsApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!twilioAccountSid || !twilioAuthToken || !elevenLabsApiKey) {
      return errorResponse("Missing Twilio or ElevenLabs credentials", 500);
    }

    // Check opt-out list
    const { data: optOut } = await supabase
      .from("outbound_opt_outs")
      .select("id")
      .eq("tenant_id", payload.tenant_id)
      .eq("customer_phone", payload.customer_phone)
      .maybeSingle();

    if (optOut) {
      console.log(`[outbound-call] Skipping opted-out customer ${payload.customer_phone.slice(-4)}`);
      if (payload.queue_item_id) {
        await supabase.from("outbound_call_queue").update({ status: "skipped", error_message: "Customer opted out" }).eq("id", payload.queue_item_id);
      }
      return jsonResponse({ success: false, reason: "opted_out" });
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, business_name, business_mode, enabled_modules, timezone, hours_json")
      .eq("id", payload.tenant_id)
      .single();

    if (!tenant) {
      return errorResponse("Tenant not found", 404);
    }

    // Check business hours
    const now = new Date();
    const tenantTz = tenant.timezone || "America/New_York";
    const localHour = parseInt(now.toLocaleString("en-US", { timeZone: tenantTz, hour: "numeric", hour12: false }));
    if (localHour < 9 || localHour >= 20) {
      console.log(`[outbound-call] Outside business hours (${localHour}h in ${tenantTz})`);
      if (payload.queue_item_id) {
        // Reschedule for next business hour
        const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        nextDay.setHours(10, 0, 0, 0);
        await supabase.from("outbound_call_queue").update({
          scheduled_at: nextDay.toISOString(),
          status: "queued",
        }).eq("id", payload.queue_item_id);
      }
      return jsonResponse({ success: false, reason: "outside_hours" });
    }

    // Get a phone number to call from
    const { data: phoneNumbers } = await supabase
      .from("phone_numbers")
      .select("phone_e164")
      .eq("tenant_id", payload.tenant_id)
      .eq("is_active", true)
      .limit(1);

    const fromNumber = phoneNumbers?.[0]?.phone_e164;
    if (!fromNumber) {
      return errorResponse("No active phone number for tenant", 400);
    }

    // Resolve agent
    const agentResolution = await getAgentIdForMode(
      supabase,
      payload.tenant_id,
      tenant.business_mode,
      null
    );
    const agentId = agentResolution.agentId;

    if (!agentId) {
      return errorResponse("No ElevenLabs agent configured", 400);
    }

    // Build business context
    let dynamicVars: Record<string, string> = {};
    try {
      const contextClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { context } = await buildBusinessContext(contextClient, {
        tenantId: payload.tenant_id,
        locationId: null,
        customerId: null,
        channel: "voice",
        sessionId: null,
        callerPhone: payload.customer_phone,
        includeIntelligence: true,
      });
      dynamicVars = buildDynamicVariables(context, payload.customer_phone, null);
    } catch (e) {
      console.warn("[outbound-call] Context build failed, using minimal vars:", e);
    }

    // Build purpose-specific greeting
    const contextData = payload.context || {};
    let purposeGreeting = PURPOSE_PROMPTS[payload.call_purpose] || PURPOSE_PROMPTS.followup;
    purposeGreeting = purposeGreeting
      .replace("{{customer_name}}", (contextData.customer_name as string) || "there")
      .replace("{{business_name}}", tenant.business_name || "our business")
      .replace("{{service_name}}", (contextData.service_name as string) || "service")
      .replace("{{service_requested}}", (contextData.service_requested as string) || "our services")
      .replace("{{appointment_time}}", (contextData.appointment_time as string) || "tomorrow");

    // Override greeting for outbound purpose
    dynamicVars.greeting_script = purposeGreeting;
    dynamicVars.call_direction = "outbound";
    dynamicVars.call_purpose = payload.call_purpose;

    // Register call with ElevenLabs
    const registerResponse = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          from_number: fromNumber,
          to_number: payload.customer_phone,
          conversation_initiation_client_data: {
            dynamic_variables: dynamicVars,
          },
        }),
      }
    );

    if (!registerResponse.ok) {
      const errText = await registerResponse.text();
      console.error(`[outbound-call] ElevenLabs register failed: ${errText}`);
      return errorResponse(`ElevenLabs register failed: ${registerResponse.status}`, 500);
    }

    const registerData = await registerResponse.json();

    // Initiate outbound call via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
    const twiml = registerData.twiml || `<Response><Connect><Stream url="${registerData.stream_url || ""}" /></Connect></Response>`;

    const twilioBody = new URLSearchParams({
      To: payload.customer_phone,
      From: fromNumber,
      Twiml: twiml,
      StatusCallback: `${supabaseUrl}/functions/v1/twilio-inbound`,
      StatusCallbackEvent: "completed",
      MachineDetection: "Enable",
      MachineDetectionTimeout: "5",
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: twilioBody.toString(),
    });

    if (!twilioResponse.ok) {
      const errText = await twilioResponse.text();
      console.error(`[outbound-call] Twilio call failed: ${errText}`);
      if (payload.queue_item_id) {
        await supabase.from("outbound_call_queue").update({
          status: "failed",
          error_message: `Twilio error: ${twilioResponse.status}`,
          last_attempt_at: new Date().toISOString(),
        }).eq("id", payload.queue_item_id);
      }
      return errorResponse(`Twilio call failed: ${twilioResponse.status}`, 500);
    }

    const twilioData = await twilioResponse.json();
    const callSid = twilioData.sid;

    // Create session record
    const { data: session } = await supabase
      .from("ai_call_sessions")
      .insert({
        tenant_id: payload.tenant_id,
        twilio_call_sid: callSid,
        caller_phone: payload.customer_phone,
        direction: "outbound",
        call_purpose: payload.call_purpose,
        started_at: new Date().toISOString(),
        context_json: { ...contextData, call_purpose: payload.call_purpose },
      })
      .select("id")
      .single();

    // Update queue item
    if (payload.queue_item_id) {
      await supabase.from("outbound_call_queue").update({
        status: "calling",
        last_attempt_at: new Date().toISOString(),
        result_session_id: session?.id || null,
      }).eq("id", payload.queue_item_id);
    }

    console.log(`[outbound-call] Initiated ${payload.call_purpose} call to ${payload.customer_phone.slice(-4)} (sid: ${callSid})`);

    return jsonResponse({
      success: true,
      call_sid: callSid,
      session_id: session?.id,
      purpose: payload.call_purpose,
    });

  } catch (error) {
    console.error("[outbound-call] Error:", error);
    return errorResponse(`Internal error: ${(error as Error).message}`, 500);
  }
});
