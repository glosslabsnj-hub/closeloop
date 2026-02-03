import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildBusinessContext, storeContextSnapshot, buildDynamicVariables } from "../_shared/buildBusinessContext.ts";
import { getAgentIdForMode } from "../_shared/agentResolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to create TwiML response
function twimlResponse(twiml: string): Response {
  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

// Helper to create a polite hangup TwiML
function hangupTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Normalize phone number to E.164 format
function normalizeToE164(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (phone.startsWith("+")) return phone;
  return digits.length > 0 ? `+${digits}` : "";
}

// Helper to mask phone number for PHI compliance
function maskPhone(phone: string, shouldMask: boolean): string {
  if (!shouldMask || !phone) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "[REDACTED]";
  return `+***-***-${digits.slice(-4)}`;
}

// Helper to log events to twilio_event_logs table
async function logTwilioEvent(
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string | null,
  callSid: string,
  toNumber: string,
  fromNumber: string,
  stage: string,
  httpStatus: number | null,
  errorMessage: string | null,
  rawPayload: Record<string, unknown> | null,
  maskPhi: boolean = false
) {
  try {
    const sb = createClient(supabaseUrl, supabaseKey);
    await sb.from("twilio_event_logs").insert({
      tenant_id: tenantId,
      twilio_call_sid: callSid,
      to_number: toNumber,
      from_number: maskPhi ? maskPhone(fromNumber, true) : fromNumber,
      stage,
      http_status: httpStatus,
      error_message: errorMessage,
      raw_payload: maskPhi ? null : rawPayload,
    });
  } catch (e) {
    console.error("Failed to log twilio event:", e);
  }
}

// buildDynamicVariables is now imported from _shared/buildBusinessContext.ts

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_2") || Deno.env.get("ELEVENLABS_API_KEY");
  // Note: Agent ID is now resolved dynamically per business_mode via getAgentIdForMode()

  // Parse Twilio's form data
  let formData: URLSearchParams;
  let toNumber = "";
  let fromNumber = "";
  let callSid = "";

  try {
    const body = await req.text();
    formData = new URLSearchParams(body);
    toNumber = formData.get("To") || "";
    fromNumber = formData.get("From") || "";
    callSid = formData.get("CallSid") || "";
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }

  console.log(`Inbound call: From=${fromNumber}, To=${toNumber}, CallSid=${callSid}`);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase configuration");
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, null, callSid, toNumber, fromNumber, "request_received", null, null, { method: req.method });

  if (!ELEVENLABS_API_KEY) {
    console.error("Missing ElevenLabs API key");
    await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, null, callSid, toNumber, fromNumber, "config_error", null, "Missing ELEVENLABS_API_KEY", null);
    return twimlResponse(hangupTwiml("Our voice assistant is currently unavailable. Please leave a message or try again later."));
  }

  const callerPhoneE164 = normalizeToE164(fromNumber);

  try {
    // Lookup tenant by the "To" number
    const { data: phoneRecord, error: phoneError } = await supabase
      .from("phone_numbers")
      .select("tenant_id, status, location_id")
      .eq("phone_e164", toNumber)
      .maybeSingle();

    if (phoneError) {
      console.error("Database error looking up phone number:", phoneError);
      await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, null, callSid, toNumber, fromNumber, "db_error_phone_lookup", null, phoneError.message, { code: phoneError.code });
      return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
    }

    if (!phoneRecord) {
      console.error(`No tenant found for number: ${toNumber}`);
      await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, null, callSid, toNumber, fromNumber, "no_tenant_found", null, `No tenant found for number: ${toNumber}`, null);
      return twimlResponse(hangupTwiml("This number is not currently in service. Please check the number and try again."));
    }

    const tenantId = phoneRecord.tenant_id;
    const locationId = phoneRecord.location_id || null;
    console.log(`Resolved tenant: ${tenantId}, location: ${locationId}`);

    // ===== RESOLVE CUSTOMER BY PHONE =====
    let customerId: string | null = null;
    if (callerPhoneE164) {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone_e164", callerPhoneE164)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        await supabase
          .from("customers")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", customerId);
        console.log(`Resolved existing customer: ${customerId}`);
      }
    }

    // ===== BUILD CANONICAL BUSINESS CONTEXT =====
    const { context, systemPrompt } = await buildBusinessContext(supabase, {
      tenantId,
      locationId,
      customerId,
      channel: "voice",
      sessionId: callSid,
      callerPhone: callerPhoneE164,
      includeIntelligence: true,
    });

    // Store context snapshot for debugging
    await storeContextSnapshot(supabase, context);

    // Check if voice AI is enabled
    const { data: settings } = await supabase
      .from("assistant_settings")
      .select("voice_ai_enabled, voice_mode, connect_status, off_behavior, owner_forward_number, owner_forward_verified")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    // Update connect_status to "connected" on first real call (verifies forwarding works)
    if (settings?.connect_status !== "connected" && settings?.connect_status !== "forwarding_verified") {
      await supabase
        .from("assistant_settings")
        .update({ connect_status: "connected", updated_at: new Date().toISOString() })
        .eq("tenant_id", tenantId);
      console.log(`Updated connect_status to connected for tenant ${tenantId}`);

      // Also log this milestone event
      await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, tenantId, callSid, toNumber, fromNumber, "first_call_connected", 200, null, null);
    }

    // ===== AGENT OFF ROUTING LOGIC =====
    if (settings?.voice_ai_enabled === false || settings?.voice_mode === "off") {
      console.log(`Voice AI disabled for tenant ${tenantId}, routing via off_behavior`);
      const offBehavior = settings?.off_behavior || "FORWARD_OWNER";
      const ownerNumber = settings?.owner_forward_number;
      const ownerVerified = settings?.owner_forward_verified || false;

      await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, tenantId, callSid, toNumber, fromNumber, "agent_off_routing", 200, null, { off_behavior: offBehavior });

      // FORWARD_OWNER: Forward to owner's phone
      if (offBehavior === "FORWARD_OWNER") {
        if (ownerNumber && ownerVerified) {
          console.log(`Forwarding call to owner: ${ownerNumber}`);
          const forwardTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="20" action="">
    <Number>${escapeXml(ownerNumber)}</Number>
  </Dial>
  <Say voice="Polly.Joanna">We're unable to connect you right now. Please leave a message after the tone.</Say>
  <Record maxLength="120" transcribe="false" />
  <Hangup/>
</Response>`;
          return twimlResponse(forwardTwiml);
        } else {
          // Fallback to voicemail if no owner number configured
          console.log(`No owner forward number configured, falling back to voicemail`);
          const voicemailTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for calling ${escapeXml(context.tenant.business_name || "us")}. We're currently unavailable. Please leave a message after the tone and we'll get back to you soon.</Say>
  <Record maxLength="120" transcribe="false" />
  <Say voice="Polly.Joanna">Thank you. We'll return your call soon. Goodbye.</Say>
  <Hangup/>
</Response>`;
          return twimlResponse(voicemailTwiml);
        }
      }

      // VOICEMAIL: Take voicemail
      if (offBehavior === "VOICEMAIL") {
        console.log(`Taking voicemail for tenant ${tenantId}`);
        const voicemailTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for calling ${escapeXml(context.tenant.business_name || "us")}. We're currently unavailable. Please leave a message after the tone and we'll get back to you soon.</Say>
  <Record maxLength="120" transcribe="false" />
  <Say voice="Polly.Joanna">Thank you. We'll return your call soon. Goodbye.</Say>
  <Hangup/>
</Response>`;
        return twimlResponse(voicemailTwiml);
      }

      // CALLBACK_ONLY: Capture callback request
      if (offBehavior === "CALLBACK_ONLY") {
        console.log(`Capturing callback request for tenant ${tenantId}`);
        const callbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for calling ${escapeXml(context.tenant.business_name || "us")}. We're currently unavailable, but we've captured your number and will call you back as soon as possible. Thank you for your patience.</Say>
  <Hangup/>
</Response>`;

        // Create a callback task/lead
        try {
          await supabase.from("leads").insert({
            tenant_id: tenantId,
            phone_e164: callerPhoneE164,
            source: "callback_request",
            status: "new",
            notes: `Callback request from ${callerPhoneE164} when agent was OFF`,
            created_at: new Date().toISOString(),
          });
          console.log(`Created callback lead for ${callerPhoneE164}`);
        } catch (e) {
          console.error("Failed to create callback lead:", e);
        }

        return twimlResponse(callbackTwiml);
      }

      // Fallback (should never reach here)
      console.error(`Unknown off_behavior: ${offBehavior}`);
      return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
    }

    // ===== BUILD DYNAMIC VARIABLES FOR ELEVENLABS =====
    const dynamicVariables = buildDynamicVariables(context, callerPhoneE164, customerId);

    // ===== LOG DYNAMIC VARIABLES FOR INSTRUMENTATION =====
    // Redact sensitive values for storage
    const redactedDynamicVariables: Record<string, string> = {};
    const sensitiveKeys = ["caller_phone", "customer_id"];
    for (const [key, value] of Object.entries(dynamicVariables)) {
      const stringValue = String(value);
      if (sensitiveKeys.includes(key) && value && stringValue !== "") {
        redactedDynamicVariables[key] = context.safety.phi_minimization ? "[REDACTED]" : stringValue.slice(0, 20);
      } else if (stringValue.length > 200) {
        redactedDynamicVariables[key] = stringValue.slice(0, 200) + `... [${stringValue.length} chars]`;
      } else {
        redactedDynamicVariables[key] = stringValue;
      }
    }

    // Store dynamic variables in context snapshot for debugging
    await supabase
      .from("ai_context_snapshots")
      .update({ dynamic_variables_json: redactedDynamicVariables })
      .eq("tenant_id", tenantId)
      .eq("session_id", callSid);

    console.log(`Building context for tenant ${tenantId}:`, {
      business_mode: context.tenant.business_mode,
      hipaa_mode: context.safety.hipaa_mode,
      customer_id: customerId,
      services_count: context.offerings.services.length,
      has_service_summary: !!context.offerings.services_summary,
      has_services_pricing: !!context.offerings.services_for_prompt,
      has_menu_summary: !!context.offerings.menu_summary,
      has_faqs: context.knowledge.faqs.length > 0,
      intent_rules_count: context.intelligence.intent_rules.length,
      memory_hints_count: context.intelligence.memory_hints.length,
      missing_sections: context._meta.missing_sections,
    });

    // ===== CREATE CALL SESSION RECORD =====
    const contextForStorage: Record<string, unknown> = {
      tenant_id: tenantId,
      location_id: locationId,
      business_mode: context.tenant.business_mode,
      hipaa_mode: context.safety.hipaa_mode,
      customer_id: customerId,
      caller_phone: context.safety.phi_minimization ? "[REDACTED]" : callerPhoneE164,
      hours_today: context.tenant.hours_today,
      booking_link: context.operations.availability.booking_url,
      intent_rules_count: context.intelligence.intent_rules.length,
      memory_hints_count: context.intelligence.memory_hints.length,
      missing_sections: context._meta.missing_sections,
    };

    const { data: callSession, error: sessionError } = await supabase
      .from("ai_call_sessions")
      .insert({
        tenant_id: tenantId,
        call_direction: "inbound",
        twilio_call_sid: callSid,
        caller_phone: context.safety.store_caller_phone ? (callerPhoneE164 || fromNumber) : maskPhone(callerPhoneE164 || fromNumber, true),
        customer_id: customerId,
        started_at: new Date().toISOString(),
        context_json: contextForStorage,
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error("Error creating call session:", sessionError);
    } else {
      console.log(`Created call session: ${callSession?.id}`);
      
      // Log call_start, context_built, and dynamic_variables_built events
      await supabase.from("ai_event_logs").insert([
        {
          tenant_id: tenantId,
          session_id: callSession?.id,
          call_sid: callSid,
          stage: "call_start",
          event_data: {
            caller_phone: context.safety.store_caller_phone ? callerPhoneE164 : "[REDACTED]",
            customer_id: customerId,
          },
        },
        {
          tenant_id: tenantId,
          session_id: callSession?.id,
          call_sid: callSid,
          stage: "context_built",
          event_data: {
            business_mode: context.tenant.business_mode,
            services_count: context.offerings.services.length,
            menu_count: context.offerings.menu.length,
            faqs_count: context.knowledge.faqs.length,
            intent_rules_count: context.intelligence.intent_rules.length,
            missing_sections: context._meta.missing_sections,
          },
        },
        {
          tenant_id: tenantId,
          session_id: callSession?.id,
          call_sid: callSid,
          stage: "dynamic_variables_built",
          event_data: {
            variable_keys: Object.keys(dynamicVariables),
            business_name: String(dynamicVariables.business_name || "").slice(0, 50),
            business_mode: String(dynamicVariables.business_mode || ""),
            hours_today: String(dynamicVariables.hours_today || "").slice(0, 100),
            menu_summary_length: String(dynamicVariables.menu_summary || "").length,
            service_summary_length: String(dynamicVariables.service_summary || "").length,
            context_has_hours: String(dynamicVariables.context_has_hours || "false"),
            context_has_menu: String(dynamicVariables.context_has_menu || "false"),
            context_has_services: String(dynamicVariables.context_has_services || "false"),
          },
        },
      ]);
    }

    // ===== CALL ELEVENLABS REGISTER-CALL API =====
    // Build availability context for strict slot enforcement
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    
    // Precompute tomorrow's available slots for the agent
    let precomputedSlots: string[] = [];
    try {
      // Get tenant hours_json directly from database for slot computation
      const { data: tenantHours } = await supabase
        .from("tenants")
        .select("hours_json")
        .eq("id", tenantId)
        .single();
      
      const { data: slots } = await supabase.rpc("fn_compute_available_slots", {
        _tenant_id: tenantId,
        _start_date: tomorrowStr,
        _end_date: tomorrowStr,
        _duration_minutes: 60, // Default duration
        _buffer_minutes: 15,
        _business_hours: tenantHours?.hours_json || null,
      });
      if (slots && Array.isArray(slots)) {
        precomputedSlots = slots.slice(0, 6).map((s: { slot_time_local: string }) => s.slot_time_local);
      }
    } catch (e) {
      console.error("Failed to precompute slots:", e);
    }

    // Build strict scheduling instructions
    const schedulingInstructions = `
STRICT SCHEDULING RULES (MANDATORY):
- You MUST verify availability before confirming ANY appointment time.
- NEVER invent or guess available times. Only offer times you know are available.
- Tomorrow's available slots: ${precomputedSlots.length > 0 ? precomputedSlots.join(", ") : "Check with backend"}
- If a customer asks for "earlier" times and none exist, explain: "That's our earliest opening for [service duration]."
- Always confirm the service type first to ensure correct duration (some services need 2+ hours).
- When a customer requests a specific time, verify it's in the available slots before confirming.
`;

    // ===== RESOLVE MODE-SPECIFIC AGENT ID =====
    const { agentId, source: agentSource, envKey: agentEnvKey } = getAgentIdForMode(context.tenant.business_mode);
    
    if (!agentId) {
      console.error(`No ElevenLabs agent configured for mode: ${context.tenant.business_mode}`);
      await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, tenantId, callSid, toNumber, fromNumber, "agent_not_configured", null, `No agent for mode: ${context.tenant.business_mode}`, null, context.safety.phi_minimization);
      return twimlResponse(hangupTwiml("Our voice assistant is temporarily unavailable. Please try again later."));
    }

    console.log(`Using ElevenLabs agent: ${agentId.slice(0, 12)}... (source: ${agentSource}, mode: ${context.tenant.business_mode})`);

    const registerCallPayload = {
      agent_id: agentId,
      from_number: fromNumber,
      to_number: toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: dynamicVariables,
      },
      conversation_config_override: {
        agent: {
          prompt: {
            prompt: systemPrompt + "\n\n" + schedulingInstructions,
          },
        },
      },
    };
    
    console.log(`Sending to ElevenLabs agent ${agentId.slice(0, 12)}... with prompt override, slots: ${precomputedSlots.length}`);
    
    const registerCallResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/twilio/register-call`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerCallPayload),
      }
    );

    if (!registerCallResponse.ok) {
      const errorText = await registerCallResponse.text();
      console.error(`ElevenLabs register-call failed [${registerCallResponse.status}]:`, errorText);
      await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, tenantId, callSid, toNumber, fromNumber, "elevenlabs_register_failed", registerCallResponse.status, errorText.substring(0, 500), null, context.safety.phi_minimization);
      return twimlResponse(hangupTwiml("Our voice assistant is temporarily unavailable. Please try again later."));
    }

    await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, tenantId, callSid, toNumber, fromNumber, "elevenlabs_register_success", 200, null, null, context.safety.phi_minimization);

    const responseText = await registerCallResponse.text();
    
    // Extract conversation_id for webhook linkage
    const conversationIdHeader = registerCallResponse.headers.get("x-conversation-id");
    let conversationId: string | null = conversationIdHeader;
    
    if (!conversationId) {
      const match = responseText.match(/conversation[_-]?id[="':]+([a-zA-Z0-9_-]+)/i);
      if (match) conversationId = match[1];
    }

    if (conversationId && callSession?.id) {
      await supabase
        .from("ai_call_sessions")
        .update({ elevenlabs_conversation_id: conversationId })
        .eq("id", callSession.id);
      console.log(`Updated call session ${callSession.id} with conversation_id: ${conversationId}`);
    }

    console.log(`ElevenLabs returned TwiML (${responseText.length} chars)`);

    return new Response(responseText, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });

  } catch (error) {
    console.error("Error handling inbound call:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    try {
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, null, callSid || "unknown", toNumber || "unknown", fromNumber || "unknown", "unhandled_exception", 500, errorMsg, null);
      }
    } catch { /* ignore */ }
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }
});
