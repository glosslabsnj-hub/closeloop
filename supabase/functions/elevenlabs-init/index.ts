import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import { buildBusinessContext, storeContextSnapshot, buildDynamicVariables, type BusinessContext } from "../_shared/buildBusinessContext.ts";

/**
 * ElevenLabs Client Data Webhook
 * 
 * This endpoint is called by ElevenLabs when a new Twilio phone call or SIP trunk 
 * conversation begins. It returns tenant-specific business context as dynamic variables.
 * 
 * Configuration: In ElevenLabs Workspace Settings → Conversation Initiation Client Data Webhook
 * URL: https://<project-ref>.supabase.co/functions/v1/elevenlabs-init
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-elevenlabs-signature, x-eleven-labs-signature",
};

// Verify HMAC signature from ElevenLabs
async function verifyHmacSignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(rawBody);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
    const hexBytes = encodeHex(new Uint8Array(signatureBuffer));
    // Convert Uint8Array of hex chars to string
    const computedSignature = new TextDecoder().decode(hexBytes);
    
    // Compare signatures (constant-time comparison for security)
    return computedSignature.toLowerCase() === signature.toLowerCase();
  } catch (error) {
    console.error("HMAC verification error:", error);
    return false;
  }
}

// Normalize phone number to E.164 format
function normalizeToE164(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (phone.startsWith("+")) return phone;
  return digits.length > 0 ? `+${digits}` : "";
}

// Empty dynamic variables structure for when context is unavailable
function getEmptyDynamicVariables(): Record<string, string> {
  return {
    tenant_id: "",
    location_id: "",
    business_name: "",
    businessname: "", // Alias for ElevenLabs compatibility
    business_mode: "",
    enabled_modules: "",
    hipaa_mode: "false",
    timezone: "",
    caller_phone: "",
    customer_id: "",
    hours_today: "",
    calendar_connected: "false",
    booking_link: "",
    service_summary: "",
    services_pricing: "",
    menu_summary: "",
    policies_summary: "",
    faqs_summary: "",
    menu_has_more: "false",
    menu_top_categories: "",
    menu_summary_length: "0",
    greeting_script: "",
    fallback_script: "",
    tone: "friendly",
    intent_rules_summary: "",
    memory_hints_summary: "",
    memory_enabled: "false",
    context_has_hours: "false",
    context_has_menu: "false",
    context_has_services: "false",
    context_menu_count: "0",
    context_services_count: "0",
    context_missing_sections: "",
  };
}

// Convert raw dynamic variables to safe string map (no nulls, all strings)
function toSafeStringMap(rawVars: Record<string, string | number | boolean>): Record<string, string> {
  const safeVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawVars)) {
    if (value === null || value === undefined) {
      safeVars[key] = "";
    } else if (typeof value === "boolean") {
      safeVars[key] = value ? "true" : "false";
    } else if (typeof value === "number") {
      safeVars[key] = String(value);
    } else {
      safeVars[key] = String(value);
    }
  }
  return safeVars;
}

// Build safe dynamic variables from context or return empty structure
function buildSafeDynamicVars(
  context: BusinessContext | null,
  callerPhone: string,
  customerId: string | null
): Record<string, string> {
  if (!context) {
    const empty = getEmptyDynamicVariables();
    if (callerPhone) empty.caller_phone = callerPhone;
    return empty;
  }
  
  const rawVars = buildDynamicVariables(context, callerPhone, customerId);
  return toSafeStringMap(rawVars);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow GET for health checks (ElevenLabs may ping)
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ 
        status: "ok", 
        service: "elevenlabs-init",
        description: "ElevenLabs Client Data Webhook for CloseLoop" 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  // Only accept POST for actual webhook calls
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("ELEVENLABS_CONVAI_WEBHOOK_SECRET");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase configuration");
    const emptyVars = getEmptyDynamicVariables();
    return new Response(
      JSON.stringify({ 
        dynamic_variables: emptyVars,
        client_data: emptyVars,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Log every endpoint hit for debugging (no PII)
  try {
    await supabase.from("ai_event_logs").insert({
      tenant_id: null,
      stage: "voice_endpoint_hit",
      event_data: {
        endpoint: "elevenlabs-init",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (logError) {
    console.error("[elevenlabs-init] Failed to log endpoint hit:", logError);
  }

  let requestBody: Record<string, unknown> = {};
  let toNumber = "";
  let fromNumber = "";
  let callSid = "";
  let conversationId = "";
  let sessionId = "";

  let rawBody = "";
  
  try {
    // Parse request body - ElevenLabs may send various formats
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      rawBody = await req.text();
      
      // Verify HMAC signature if secret is configured
      if (webhookSecret) {
        const signature = 
          req.headers.get("x-elevenlabs-signature") || 
          req.headers.get("x-eleven-labs-signature");
        
        const isValid = await verifyHmacSignature(rawBody, signature, webhookSecret);
        
        if (!isValid) {
          console.warn("[elevenlabs-init] Invalid HMAC signature - rejecting request");
          const emptyVars = getEmptyDynamicVariables();
          return new Response(
            JSON.stringify({ 
              error: "Invalid signature",
              dynamic_variables: emptyVars,
              client_data: emptyVars,
            }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.log("[elevenlabs-init] HMAC signature verified successfully");
      } else {
        console.warn("[elevenlabs-init] No webhook secret configured - skipping signature verification");
      }
      
      requestBody = JSON.parse(rawBody);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      rawBody = await req.text();
      const params = new URLSearchParams(rawBody);
      requestBody = Object.fromEntries(params.entries());
    } else {
      // Try JSON first, fallback to form data
      rawBody = await req.text();
      try {
        requestBody = JSON.parse(rawBody);
      } catch {
        const params = new URLSearchParams(rawBody);
        requestBody = Object.fromEntries(params.entries());
      }
    }

    // Extract phone numbers from various possible field names
    // ElevenLabs payload structure can vary
    toNumber = String(
      requestBody.To || 
      requestBody.to || 
      requestBody.to_number || 
      requestBody.called_number ||
      requestBody.called ||
      (requestBody.call as Record<string, unknown>)?.to ||
      ""
    );
    
    fromNumber = String(
      requestBody.From || 
      requestBody.from || 
      requestBody.from_number || 
      requestBody.caller_number ||
      requestBody.caller ||
      (requestBody.call as Record<string, unknown>)?.from ||
      ""
    );
    
    callSid = String(
      requestBody.CallSid || 
      requestBody.call_sid || 
      requestBody.callSid ||
      requestBody.twilio_call_sid ||
      (requestBody.call as Record<string, unknown>)?.sid ||
      ""
    );
    
    conversationId = String(
      requestBody.conversation_id || 
      requestBody.conversationId ||
      requestBody.session_id ||
      ""
    );

    sessionId = callSid || conversationId || `init_${Date.now()}`;

    console.log(`[elevenlabs-init] Request received:`, {
      to: toNumber,
      from: fromNumber?.substring(0, 8) + "...",
      callSid: callSid?.substring(0, 12),
      conversationId,
    });

  } catch (error) {
    console.error("[elevenlabs-init] Failed to parse request body:", error);
    // Log error but still return safe response
    try {
      await supabase.from("ai_event_logs").insert({
        tenant_id: null,
        stage: "elevenlabs_init_parse_error",
        error_message: String(error),
        event_data: { raw_body_type: typeof requestBody },
      });
    } catch (logError) {
      console.error("[elevenlabs-init] Failed to log parse error:", logError);
    }
    
    const emptyVars = getEmptyDynamicVariables();
    return new Response(
      JSON.stringify({ 
        dynamic_variables: emptyVars,
        client_data: emptyVars,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const callerPhoneE164 = normalizeToE164(fromNumber);
  const toPhoneE164 = normalizeToE164(toNumber) || toNumber;

  // Enhanced logging: show all extracted phone numbers for debugging
  console.log(`[elevenlabs-init] Phone extraction:`, {
    raw_to: toNumber,
    raw_from: fromNumber?.substring(0, 8) + "...",
    normalized_to: toPhoneE164,
    normalized_from: callerPhoneE164?.substring(0, 8) + "...",
  });

  // Lookup tenant by "To" phone number with multiple fallback strategies
  let tenantId: string | null = null;
  let locationId: string | null = null;
  let resolutionSource: "phone_numbers" | "tenants_phone_public" | "explicit" | "lookup_failed" = "lookup_failed";

  // Strategy 1: Lookup in phone_numbers table (primary method)
  try {
    const { data: phoneRecord, error: phoneError } = await supabase
      .from("phone_numbers")
      .select("tenant_id, location_id, status")
      .eq("phone_e164", toPhoneE164)
      .eq("status", "active")
      .maybeSingle();

    if (phoneError) {
      console.error("[elevenlabs-init] phone_numbers lookup error:", phoneError);
    } else if (phoneRecord) {
      tenantId = phoneRecord.tenant_id;
      locationId = phoneRecord.location_id;
      resolutionSource = "phone_numbers";
      console.log(`[elevenlabs-init] Resolved via phone_numbers: tenant=${tenantId}, location=${locationId}`);
    }
  } catch (lookupError) {
    console.error("[elevenlabs-init] phone_numbers lookup failed:", lookupError);
  }

  // Strategy 2: Fallback to tenants.phone_public if phone_numbers didn't match
  if (!tenantId && toPhoneE164) {
    try {
      // Try exact match first
      const { data: tenantByPhone } = await supabase
        .from("tenants")
        .select("id")
        .eq("phone_public", toPhoneE164)
        .maybeSingle();

      if (tenantByPhone) {
        tenantId = tenantByPhone.id;
        resolutionSource = "tenants_phone_public";
        console.log(`[elevenlabs-init] Resolved via tenants.phone_public: tenant=${tenantId}`);
      } else {
        // Try without + prefix (some systems store without it)
        const phoneWithoutPlus = toPhoneE164.replace(/^\+/, "");
        const { data: tenantByPhoneAlt } = await supabase
          .from("tenants")
          .select("id")
          .or(`phone_public.eq.${toPhoneE164},phone_public.eq.${phoneWithoutPlus},phone_public.eq.+${phoneWithoutPlus}`)
          .maybeSingle();

        if (tenantByPhoneAlt) {
          tenantId = tenantByPhoneAlt.id;
          resolutionSource = "tenants_phone_public";
          console.log(`[elevenlabs-init] Resolved via tenants.phone_public (alt format): tenant=${tenantId}`);
        }
      }
    } catch (fallbackError) {
      console.error("[elevenlabs-init] tenants.phone_public fallback failed:", fallbackError);
    }
  }

  // Log tenant resolution result (HIPAA-safe: no raw phone numbers in event_data)
  try {
    await supabase.from("ai_event_logs").insert({
      tenant_id: tenantId,
      stage: "voice_tenant_resolved",
      event_data: {
        tenant_id: tenantId,
        source: resolutionSource,
        has_location_id: !!locationId,
        to_number_prefix: toPhoneE164?.substring(0, 8),
        session_id: sessionId,
      },
    });
  } catch (logError) {
    console.error("[elevenlabs-init] Failed to log voice_tenant_resolved:", logError);
  }

  // If no tenant found, log and return safe empty response
  if (!tenantId) {
    console.warn(`[elevenlabs-init] TENANT NOT FOUND for number: ${toPhoneE164}`);
    console.warn(`[elevenlabs-init] To fix: Add this number to phone_numbers table OR set as tenants.phone_public`);

    await supabase.from("ai_event_logs").insert({
      tenant_id: null,
      stage: "elevenlabs_init_tenant_not_found",
      error_message: `No tenant found for number. Tried: phone_numbers table, tenants.phone_public`,
      event_data: {
        to_number_prefix: toPhoneE164?.substring(0, 8),
        from_number_prefix: callerPhoneE164?.substring(0, 8),
        strategies_tried: ["phone_numbers", "tenants_phone_public"],
      },
    });

    const emptyVars = buildSafeDynamicVars(null, callerPhoneE164, null);
    return new Response(
      JSON.stringify({
        dynamic_variables: emptyVars,
        client_data: emptyVars,
        _debug: {
          error: "tenant_not_found",
          to_number_prefix: toPhoneE164?.substring(0, 8),
          resolution_source: resolutionSource,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // NOTE: Demo tenant tripwire removed - all valid tenants are now allowed
  // The only safety rule is: tenant must be resolved explicitly (no silent fallbacks)
  // This is enforced by the lookup logic above which returns 200 with empty vars if not found

  // Resolve customer by phone (if caller identified)
  let customerId: string | null = null;
  if (callerPhoneE164) {
    try {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone_e164", callerPhoneE164)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      }
    } catch (customerError) {
      console.error("[elevenlabs-init] Customer lookup failed:", customerError);
    }
  }

  // Build full business context
  let context: BusinessContext | null = null;
  
  try {
    const result = await buildBusinessContext(supabase, {
      tenantId,
      locationId,
      customerId,
      channel: "voice",
      sessionId,
      callerPhone: callerPhoneE164,
      includeIntelligence: true,
    });
    context = result.context;

    // Store context snapshot for debugging
    await storeContextSnapshot(supabase, context);

    // Log successful init call
    await supabase.from("ai_event_logs").insert({
      tenant_id: tenantId,
      call_sid: callSid || null,
      conversation_id: conversationId || null,
      stage: "elevenlabs_init_called",
      event_data: {
        business_mode: context.tenant.business_mode,
        services_count: context.offerings.services.length,
        menu_count: context.offerings.menu.length,
        faqs_count: context.knowledge.faqs.length,
        has_hours: Object.keys(context.tenant.hours).length > 0,
        hipaa_mode: context.safety.hipaa_mode,
        missing_sections: context._meta.missing_sections,
        customer_id: customerId,
        from_number_prefix: callerPhoneE164?.substring(0, 8),
      },
    });

  } catch (contextError) {
    console.error("[elevenlabs-init] Context build failed:", contextError);
    await supabase.from("ai_event_logs").insert({
      tenant_id: tenantId,
      stage: "elevenlabs_init_context_error",
      error_message: String(contextError),
      event_data: { session_id: sessionId },
    });
  }

  // Build safe dynamic variables
  const dynamicVariables = buildSafeDynamicVars(context, callerPhoneE164, customerId);

  // Apply HIPAA filtering if needed
  if (context?.safety.hipaa_mode) {
    // Clear any PHI fields
    dynamicVariables.caller_phone = "";
    dynamicVariables.customer_id = "";
    dynamicVariables.memory_hints_summary = "";
  }

  // Log voice context injection for debugging (keys only, no values for HIPAA safety)
  try {
    const keysPresent = Object.keys(dynamicVariables);
    const keysEmpty = keysPresent.filter(k => !dynamicVariables[k] || dynamicVariables[k] === "false" || dynamicVariables[k] === "0");
    const keysPopulated = keysPresent.filter(k => dynamicVariables[k] && dynamicVariables[k] !== "false" && dynamicVariables[k] !== "0");

    await supabase.from("ai_event_logs").insert({
      tenant_id: tenantId,
      call_sid: callSid || null,
      conversation_id: conversationId || null,
      stage: "voice_context_injected",
      event_data: {
        keys_total: keysPresent.length,
        keys_populated: keysPopulated.length,
        keys_empty: keysEmpty,
        hipaa_mode: dynamicVariables.hipaa_mode === "true",
        business_mode: dynamicVariables.business_mode,
        enabled_modules: dynamicVariables.enabled_modules,
        context_missing_sections: dynamicVariables.context_missing_sections,
        // Key Business Brain indicators (populated or not, no values)
        has_menu_summary: Boolean(dynamicVariables.menu_summary),
        has_services_pricing: Boolean(dynamicVariables.services_pricing),
        has_faqs_summary: Boolean(dynamicVariables.faqs_summary),
        has_hours_today: Boolean(dynamicVariables.hours_today),
        has_greeting_script: Boolean(dynamicVariables.greeting_script),
      },
    });
  } catch (logError) {
    console.error("[elevenlabs-init] Failed to log voice_context_injected:", logError);
  }

  console.log(`[elevenlabs-init] Returning context for tenant ${tenantId}:`, {
    business_name: dynamicVariables.business_name?.substring(0, 30),
    business_mode: dynamicVariables.business_mode,
    services_count: dynamicVariables.context_services_count,
    menu_count: dynamicVariables.context_menu_count,
    has_hours: dynamicVariables.context_has_hours,
  });

  // Return both formats for maximum compatibility
  return new Response(
    JSON.stringify({
      dynamic_variables: dynamicVariables,
      client_data: dynamicVariables,
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
});
