import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildBusinessContext, storeContextSnapshot, type BusinessContext } from "../_shared/buildBusinessContext.ts";

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

// Build dynamic variables from BusinessContext for ElevenLabs
function buildDynamicVariables(ctx: BusinessContext, callerPhoneE164: string, customerId: string | null): Record<string, string | number | boolean> {
  const enabledModulesArray: string[] = [];
  if (ctx.operations.modules.booking_enabled) enabledModulesArray.push("booking");
  if (ctx.operations.modules.dispatch_enabled) enabledModulesArray.push("dispatch_queue");
  if (ctx.operations.modules.orders_enabled) enabledModulesArray.push("food_orders");
  if (ctx.operations.modules.reservations_enabled) enabledModulesArray.push("reservations");
  if (ctx.operations.modules.catering_enabled) enabledModulesArray.push("catering");
  if (ctx.operations.modules.voice_enabled) enabledModulesArray.push("ai_voice");
  if (ctx.operations.modules.sms_enabled) enabledModulesArray.push("instant_text_back");
  if (ctx.operations.modules.medical_intake_enabled) enabledModulesArray.push("medical_intake");

  return {
    // Core identifiers
    tenant_id: ctx.tenant.tenant_id,
    location_id: ctx._meta.location_id || "",
    business_name: ctx.tenant.business_name || "Our Business",
    business_mode: ctx.tenant.business_mode,
    enabled_modules: enabledModulesArray.join(","),
    hipaa_mode: ctx.safety.hipaa_mode,
    timezone: ctx.tenant.timezone,
    
    // Caller info (respect PHI settings)
    caller_phone: ctx.safety.hipaa_mode ? "" : callerPhoneE164,
    customer_id: customerId || "",
    
    // Hours and availability
    hours_today: ctx.tenant.hours_today,
    calendar_connected: ctx.operations.availability.calendar_connected,
    booking_link: ctx.operations.availability.booking_url,
    
    // Business Brain content
    service_summary: ctx.offerings.services_summary,
    services_pricing: ctx.offerings.services_for_prompt,
    menu_summary: ctx.offerings.menu_summary,
    policies_summary: [
      ctx.policies.cancellation && `Cancellation: ${ctx.policies.cancellation}`,
      ctx.policies.deposit && `Deposit: ${ctx.policies.deposit}`,
      ctx.policies.payment_methods.length > 0 && `Payment: ${ctx.policies.payment_methods.join(", ")}`,
    ].filter(Boolean).join(". "),
    faqs_summary: ctx.knowledge.faqs_summary,
    
    // AI assistant settings
    greeting_script: ctx.ai_settings.greeting_script,
    fallback_script: ctx.ai_settings.fallback_script,
    tone: ctx.ai_settings.tone,
    
    // Intelligence layers
    intent_rules_summary: ctx.intelligence.intent_rules_summary,
    memory_hints_summary: ctx.safety.hipaa_mode ? "" : ctx.intelligence.memory_hints_summary,
    memory_enabled: ctx.intelligence.settings.memory_enabled,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_2") || Deno.env.get("ELEVENLABS_API_KEY");
  const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");

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

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    console.error("Missing ElevenLabs configuration");
    await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, null, callSid, toNumber, fromNumber, "config_error", null, "Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID", null);
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
      .select("voice_ai_enabled, voice_mode, connect_status")
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

    if (settings?.voice_ai_enabled === false) {
      console.log(`Voice AI disabled for tenant ${tenantId}`);
      return twimlResponse(hangupTwiml("Thank you for calling. We're currently unavailable. Please try again later or visit our website."));
    }

    const voiceMode = settings?.voice_mode || "always_on";
    if (voiceMode === "off") {
      console.log(`Voice mode is off for tenant ${tenantId}`);
      return twimlResponse(hangupTwiml("Thank you for calling. We're currently unavailable. Please try again later."));
    }

    // ===== BUILD DYNAMIC VARIABLES FOR ELEVENLABS =====
    const dynamicVariables = buildDynamicVariables(context, callerPhoneE164, customerId);

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
    }

    // ===== CALL ELEVENLABS REGISTER-CALL API =====
    const registerCallPayload = {
      agent_id: ELEVENLABS_AGENT_ID,
      from_number: fromNumber,
      to_number: toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: dynamicVariables,
      },
    };
    
    console.log("Sending to ElevenLabs:", JSON.stringify(registerCallPayload, null, 2));
    
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
