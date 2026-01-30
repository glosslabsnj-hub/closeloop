import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-elevenlabs-signature, x-eleven-labs-signature",
};

// Parse ElevenLabs signature header format: "t=timestamp,v0=hash"
interface ParsedSignature {
  timestamp: number;
  v0: string;
}

function parseSignatureHeader(header: string): ParsedSignature | null {
  try {
    const parts = header.split(",");
    let timestamp = 0;
    let v0 = "";
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith("t=")) {
        timestamp = parseInt(trimmed.substring(2), 10);
      } else if (trimmed.startsWith("v0=")) {
        v0 = trimmed.substring(3).trim();
      }
    }
    
    if (timestamp > 0 && v0) {
      return { timestamp, v0 };
    }
    return null;
  } catch {
    return null;
  }
}

// Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Verify HMAC signature from ElevenLabs using their documented format
// Signed payload = timestamp.rawBody, compared as HMAC-SHA256 hex
async function verifyElevenLabsSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<{ valid: boolean; timestamp?: number; receivedHash?: string; expectedHash?: string; reason?: string }> {
  if (!signatureHeader) {
    return { valid: false, reason: "missing_signature_header" };
  }
  
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) {
    return { valid: false, reason: "invalid_header_format", receivedHash: signatureHeader.substring(0, 20) };
  }
  
  // Check timestamp freshness (5 minute window)
  const nowSeconds = Math.floor(Date.now() / 1000);
  const timestampDiff = Math.abs(nowSeconds - parsed.timestamp);
  if (timestampDiff > 300) {
    return { 
      valid: false, 
      reason: "timestamp_stale", 
      timestamp: parsed.timestamp,
      receivedHash: parsed.v0.substring(0, 12)
    };
  }
  
  try {
    // Build signed payload: timestamp.rawBody
    const signedPayload = `${parsed.timestamp}.${rawBody}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(signedPayload);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
    const hexBytes = encodeHex(new Uint8Array(signatureBuffer));
    const expectedHash = new TextDecoder().decode(hexBytes).toLowerCase();
    const receivedHash = parsed.v0.toLowerCase();
    
    const isValid = constantTimeCompare(expectedHash, receivedHash);
    
    return {
      valid: isValid,
      timestamp: parsed.timestamp,
      receivedHash: receivedHash.substring(0, 12),
      expectedHash: expectedHash.substring(0, 12),
      reason: isValid ? undefined : "hash_mismatch"
    };
  } catch (error) {
    console.error("HMAC verification error:", error);
    return { valid: false, reason: "crypto_error" };
  }
}

interface ElevenLabsWebhookPayload {
  type: string;
  conversation_id: string;
  agent_id: string;
  transcript?: { role: "user" | "agent"; message: string; timestamp?: number }[];
  analysis?: {
    summary?: string;
    data_collection?: Record<string, string>;
    call_successful?: boolean;
    customer_satisfaction?: string;
  };
  metadata?: {
    call_duration_secs?: number;
    start_time?: string;
    end_time?: string;
  };
  dynamic_variables?: {
    tenant_id?: string;
    caller_phone?: string;
    business_name?: string;
    customer_id?: string;
    location_id?: string;
    hipaa_mode?: boolean | string;
    business_mode?: string;
  };
}

// Normalize phone to E.164
function normalizeToE164(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (phone.startsWith("+")) return phone;
  return digits.length > 0 ? `+${digits}` : "";
}

// Extract value from ElevenLabs data collection objects
// ElevenLabs may return objects like { data_collection_id, value, rationale, json_schema }
// This helper extracts just the actual value, handling both simple strings and wrapped objects
function extractDataCollectionValue(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val || null;
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    // Check for wrapped value object: { value: "actual value", rationale: "...", ... }
    if ("value" in obj) {
      return extractDataCollectionValue(obj.value);
    }
    // Check for nested data_collection_id pattern
    if ("data_collection_id" in obj && "value" in obj) {
      return extractDataCollectionValue(obj.value);
    }
    // Don't stringify objects - return null for complex types
    return null;
  }
  return null;
}

// Log event to ai_event_logs table
// deno-lint-ignore no-explicit-any
async function logEventStage(
  supabase: any,
  tenantId: string,
  sessionId: string | null,
  callSid: string | null,
  conversationId: string,
  stage: string,
  eventData: Record<string, unknown> = {},
  errorMessage: string | null = null
) {
  try {
    await supabase.from("ai_event_logs").insert({
      tenant_id: tenantId,
      session_id: sessionId,
      call_sid: callSid,
      conversation_id: conversationId,
      stage,
      event_data: eventData,
      error_message: errorMessage,
    });
  } catch (e) {
    console.error(`Failed to log event stage ${stage}:`, e);
  }
}

// Parse conversation_id robustly from various payload structures
function parseConversationId(payload: Record<string, unknown>): string {
  // Direct field
  if (typeof payload.conversation_id === "string" && payload.conversation_id) {
    return payload.conversation_id;
  }
  
  // Nested in data
  if (payload.data && typeof payload.data === "object") {
    const data = payload.data as Record<string, unknown>;
    if (typeof data.conversation_id === "string" && data.conversation_id) {
      return data.conversation_id;
    }
  }
  
  // Nested in conversation object
  if (payload.conversation && typeof payload.conversation === "object") {
    const conv = payload.conversation as Record<string, unknown>;
    if (typeof conv.id === "string" && conv.id) {
      return conv.id;
    }
    if (typeof conv.conversation_id === "string" && conv.conversation_id) {
      return conv.conversation_id;
    }
  }
  
  // Header field (sometimes ElevenLabs sends it this way)
  if (typeof payload.id === "string" && payload.id) {
    return payload.id;
  }
  
  return "unknown";
}

// Parse event type robustly
function parseEventType(payload: Record<string, unknown>): string {
  if (typeof payload.type === "string") return payload.type;
  if (typeof payload.event === "string") return payload.event;
  if (typeof payload.event_type === "string") return payload.event_type;
  
  // Check in data object
  if (payload.data && typeof payload.data === "object") {
    const data = payload.data as Record<string, unknown>;
    if (typeof data.type === "string") return data.type;
  }
  
  return "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookSecret = (Deno.env.get("ELEVENLABS_CONVAI_WEBHOOK_SECRET") ?? "").trim();
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Read RAW body BEFORE any parsing
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch (readError) {
    console.error("[elevenlabs-webhook] Failed to read request body:", readError);
    return new Response(
      JSON.stringify({ error: "Failed to read body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Step 2: Verify HMAC signature BEFORE parsing JSON
  if (!webhookSecret) {
    console.error("[elevenlabs-webhook] ELEVENLABS_CONVAI_WEBHOOK_SECRET not configured");
    return new Response(
      JSON.stringify({ error: "Webhook secret not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Read signature header case-insensitively
  const signatureHeader = 
    req.headers.get("ElevenLabs-Signature") ?? 
    req.headers.get("elevenlabs-signature") ??
    req.headers.get("x-elevenlabs-signature") ??
    req.headers.get("x-eleven-labs-signature");

  if (!signatureHeader) {
    console.warn("[elevenlabs-webhook] Missing signature header");
    await logEventStage(
      supabase,
      "unknown",
      null,
      null,
      "unknown",
      "webhook_signature_missing",
      { raw_body_length: rawBody.length },
      "No signature header present"
    );
    return new Response(
      JSON.stringify({ error: "Missing signature header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const verifyResult = await verifyElevenLabsSignature(rawBody, signatureHeader, webhookSecret);

  if (!verifyResult.valid) {
    console.warn("[elevenlabs-webhook] Signature verification failed:", {
      reason: verifyResult.reason,
      timestamp: verifyResult.timestamp,
      receivedHash: verifyResult.receivedHash,
      expectedHash: verifyResult.expectedHash,
      rawBodyLength: rawBody.length
    });
    await logEventStage(
      supabase,
      "unknown",
      null,
      null,
      "unknown",
      "webhook_signature_invalid",
      { 
        reason: verifyResult.reason,
        timestamp: verifyResult.timestamp,
        received_hash_prefix: verifyResult.receivedHash,
        expected_hash_prefix: verifyResult.expectedHash,
        raw_body_length: rawBody.length
      },
      `HMAC verification failed: ${verifyResult.reason}`
    );
    return new Response(
      JSON.stringify({ error: "Invalid signature", reason: verifyResult.reason }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[elevenlabs-webhook] HMAC signature verified successfully, timestamp:", verifyResult.timestamp);

  // Step 3: NOW parse JSON from rawBody
  let parsedPayload: Record<string, unknown> = {};
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch (parseError) {
    console.error("Failed to parse webhook body:", parseError);
    await logEventStage(
      supabase,
      "unknown",
      null,
      null,
      "unknown",
      "webhook_parse_error",
      { raw_body_length: rawBody.length, raw_body_preview: rawBody.substring(0, 200) },
      parseError instanceof Error ? parseError.message : "JSON parse failed"
    );
    return new Response(
      JSON.stringify({ status: "error", reason: "parse_failed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Robustly parse conversation_id and event type first
    const conversationId = parseConversationId(parsedPayload);
    const eventType = parseEventType(parsedPayload);
    
    // Handle ElevenLabs new payload format where data is nested inside 'data' object
    // New format: { type: "post_call_transcription", data: { conversation_id, transcript, analysis, metadata }, event_timestamp }
    const nestedData = (parsedPayload.data && typeof parsedPayload.data === "object") 
      ? parsedPayload.data as Record<string, unknown> 
      : null;
    
    // Extract conversation_initiation_client_data for dynamic_variables (can be at top level or in data)
    const clientData = 
      (nestedData?.conversation_initiation_client_data as Record<string, unknown>) ??
      (parsedPayload.conversation_initiation_client_data as Record<string, unknown>) ??
      null;
    
    // Build typed payload with parsed values, checking nested data first
    const payload: ElevenLabsWebhookPayload = {
      type: eventType,
      conversation_id: conversationId,
      agent_id: (nestedData?.agent_id ?? parsedPayload.agent_id) as string || "",
      // Transcript: check data.transcript first, then top-level
      transcript: Array.isArray(nestedData?.transcript) 
        ? nestedData.transcript as ElevenLabsWebhookPayload["transcript"]
        : Array.isArray(parsedPayload.transcript) 
          ? parsedPayload.transcript as ElevenLabsWebhookPayload["transcript"] 
          : undefined,
      // Analysis: check data.analysis first, then top-level
      analysis: (nestedData?.analysis ?? parsedPayload.analysis) as ElevenLabsWebhookPayload["analysis"],
      // Metadata: check data.metadata first, then top-level
      metadata: (nestedData?.metadata ?? parsedPayload.metadata) as ElevenLabsWebhookPayload["metadata"],
      // Dynamic variables: check client_data.dynamic_variables, then top-level
      dynamic_variables: (clientData?.dynamic_variables ?? parsedPayload.dynamic_variables) as ElevenLabsWebhookPayload["dynamic_variables"],
    };
    
    const payloadSize = rawBody.length;
    const tenantIdFromPayload = payload.dynamic_variables?.tenant_id || "unknown";
    
    console.log("ElevenLabs webhook received:", JSON.stringify({
      type: eventType,
      conversation_id: conversationId,
      agent_id: payload.agent_id,
      has_transcript: !!payload.transcript?.length,
      has_analysis: !!payload.analysis,
      dynamic_variables: payload.dynamic_variables,
      payload_size: payloadSize,
      used_nested_data: !!nestedData,
    }));

    // Log every webhook hit immediately with full metadata
    await logEventStage(
      supabase,
      tenantIdFromPayload,
      null,
      null,
      conversationId,
      "webhook_received",
      {
        event_type: eventType,
        conversation_id: conversationId,
        payload_size: payloadSize,
        has_transcript: !!payload.transcript?.length,
        has_analysis: !!payload.analysis,
        transcript_length: payload.transcript?.length || 0,
        analysis_keys: payload.analysis ? Object.keys(payload.analysis) : [],
        data_collection_keys: payload.analysis?.data_collection ? Object.keys(payload.analysis.data_collection) : [],
        dynamic_variables_keys: payload.dynamic_variables ? Object.keys(payload.dynamic_variables) : [],
        tenant_id_from_variables: tenantIdFromPayload,
        used_nested_data: !!nestedData,
      }
    );

    // Check for conversation ended events (various formats) - INCLUDING post_call_transcription
    const isConversationEnded = 
      eventType === "post_call_transcription" ||  // ElevenLabs primary webhook event type
      eventType === "conversation.ended" || 
      eventType === "conversation_ended" ||
      eventType === "call.ended" ||
      eventType === "session.ended";
    
    if (!isConversationEnded) {
      console.log("Ignoring non-ended event type:", eventType);
      return new Response(
        JSON.stringify({ status: "ignored", reason: "not conversation end event", event_type: eventType }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Processing call end event:", eventType, "for conversation:", conversationId);

    // Find the call session by conversation_id
    const { data: session, error: sessionError } = await supabase
      .from("ai_call_sessions")
      .select("id, tenant_id, context_json, customer_id, caller_phone, twilio_call_sid")
      .eq("elevenlabs_conversation_id", payload.conversation_id)
      .single();

    if (sessionError || !session) {
      console.error("Session not found for conversation:", payload.conversation_id);
      
      // Try fallback by phone + tenant
      if (payload.dynamic_variables?.caller_phone && payload.dynamic_variables?.tenant_id) {
        const { data: fallbackSession } = await supabase
          .from("ai_call_sessions")
          .select("id, tenant_id, context_json, customer_id, caller_phone, twilio_call_sid")
          .eq("tenant_id", payload.dynamic_variables.tenant_id)
          .eq("caller_phone", normalizeToE164(payload.dynamic_variables.caller_phone))
          .is("elevenlabs_conversation_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
          
        if (fallbackSession) {
          console.log("Found fallback session by phone:", fallbackSession.id);
          await processCallData(supabase, supabaseUrl, supabaseKey, fallbackSession, payload);
          return new Response(
            JSON.stringify({ status: "success", session_id: fallbackSession.id, fallback: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      // Log session not found
      await logEventStage(
        supabase,
        tenantIdFromPayload,
        null,
        null,
        payload.conversation_id,
        "webhook_session_not_found",
        {
          conversation_id: payload.conversation_id,
          caller_phone: payload.dynamic_variables?.caller_phone || null,
          tenant_id_from_payload: tenantIdFromPayload,
        },
        "No matching ai_call_sessions record found"
      );
      
      // Return 200 even on not found to prevent ElevenLabs retries
      return new Response(
        JSON.stringify({ status: "warning", reason: "session not found", conversation_id: payload.conversation_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await processCallData(supabase, supabaseUrl, supabaseKey, session, payload);

    return new Response(
      JSON.stringify({ status: "success", session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    
    // Try to log the error
    try {
      await logEventStage(
        supabase,
        "unknown",
        null,
        null,
        "unknown",
        "webhook_error",
        {},
        error instanceof Error ? error.message : "Unknown error"
      );
    } catch {
      // Ignore logging failures
    }
    
    // Return 200 even on error to prevent ElevenLabs retries
    return new Response(
      JSON.stringify({ status: "error", error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface SessionData {
  id: string;
  tenant_id: string;
  context_json: Record<string, unknown> | null;
  customer_id: string | null;
  caller_phone: string | null;
  twilio_call_sid: string | null;
}

// deno-lint-ignore no-explicit-any
async function processCallData(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  session: SessionData,
  payload: ElevenLabsWebhookPayload
) {
  const sessionId = session.id;
  const tenantId = session.tenant_id;
  const existingContext = session.context_json || {};
  const callerPhone = session.caller_phone || payload.dynamic_variables?.caller_phone || "";
  const callerPhoneE164 = normalizeToE164(callerPhone);
  const locationId = existingContext.location_id as string || payload.dynamic_variables?.location_id || null;
  const hipaaMode = existingContext.hipaa_mode === true || payload.dynamic_variables?.hipaa_mode === true || payload.dynamic_variables?.hipaa_mode === "true";
  const businessMode = existingContext.business_mode as string || payload.dynamic_variables?.business_mode || "general";

  // Log call_end event
  await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "call_end", {
    duration_secs: payload.metadata?.call_duration_secs,
    has_transcript: !!payload.transcript?.length,
    has_analysis: !!payload.analysis,
  });

  // Get intelligence settings and retention settings in parallel
  const [intelligenceResult, retentionResult, tenantResult] = await Promise.all([
    supabase
      .from("tenant_intelligence_settings")
      .select("memory_enabled, min_confidence_threshold")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("data_retention_settings")
      .select("store_transcripts, store_caller_phone, allow_customer_memory, phi_minimization_enabled")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("tenants")
      .select("business_mode, enabled_modules")
      .eq("id", tenantId)
      .single(),
  ]);
  
  const intelligenceSettings = intelligenceResult.data;
  const retentionSettings = retentionResult.data;
  const tenant = tenantResult.data;
  const tenantBusinessMode = tenant?.business_mode || businessMode;
  
  const memoryEnabled = intelligenceSettings?.memory_enabled === true;
  const minConfidence = intelligenceSettings?.min_confidence_threshold || 0.65;
  
  // Determine data retention behavior
  const storeTranscripts = retentionSettings?.store_transcripts !== false && !hipaaMode;
  const storeCallerPhone = retentionSettings?.store_caller_phone !== false && !hipaaMode;
  const allowCustomerMemory = retentionSettings?.allow_customer_memory !== false && !hipaaMode;
  const phiMinimization = retentionSettings?.phi_minimization_enabled === true || hipaaMode;

  // Build transcript text (only if storing is allowed)
  const transcriptText = storeTranscripts 
    ? (payload.transcript
        ?.map(t => `${t.role === "user" ? "Customer" : "AI"}: ${t.message}`)
        .join("\n") || null)
    : null;

  const analysis = payload.analysis || {};
  // ElevenLabs may use data_collection or data_collection_results
  const dataCollection = 
    (analysis.data_collection as Record<string, string>) || 
    (analysis as Record<string, unknown>).data_collection_results as Record<string, string> || 
    {};
  
  // ===== EXTRACT SUMMARY (check multiple locations) =====
  // ElevenLabs may provide summary in different places depending on configuration
  // Common field names: summary, transcript_summary, call_summary, call_summary_title
  const summaryText = 
    analysis.summary ||
    (analysis as Record<string, unknown>).transcript_summary ||
    (analysis as Record<string, unknown>).call_summary ||
    (analysis as Record<string, unknown>).call_summary_title ||
    dataCollection.call_summary ||
    dataCollection.summary ||
    dataCollection.transcript_summary ||
    // Try to build a summary from transcript if none provided
    (payload.transcript?.length ? buildSummaryFromTranscript(payload.transcript, tenantBusinessMode) : null);
  
  // ===== EXTRACT CUSTOMER INFO (unwrap ElevenLabs data collection objects) =====
  const customerName = 
    extractDataCollectionValue(dataCollection.customer_name) ||
    extractDataCollectionValue(dataCollection.name) ||
    extractDataCollectionValue(dataCollection.caller_name) ||
    extractFromTranscript(payload.transcript, "name") ||
    null;

  const serviceRequested =
    extractDataCollectionValue(dataCollection.service_requested) ||
    extractDataCollectionValue(dataCollection.service) ||
    extractDataCollectionValue(dataCollection.reason) ||
    extractDataCollectionValue(dataCollection.inquiry_type) ||
    extractFromTranscript(payload.transcript, "service") ||
    null;

  // ===== DETERMINE OUTCOME BASED ON BUSINESS MODE =====
  let outcome: string = "lost";
  
  // Extract values for outcome detection (handle wrapped objects)
  const orderConfirmedVal = extractDataCollectionValue(dataCollection.order_confirmed);
  const jobCreatedVal = extractDataCollectionValue(dataCollection.job_created);
  const dispatchConfirmedVal = extractDataCollectionValue(dataCollection.dispatch_confirmed);
  const bookingConfirmedVal = extractDataCollectionValue(dataCollection.booking_confirmed);
  const callbackRequestedVal = extractDataCollectionValue(dataCollection.callback_requested);
  const messageTakenVal = extractDataCollectionValue(dataCollection.message_taken);
  const orderItemsVal = extractDataCollectionValue(dataCollection.order_items) || extractDataCollectionValue(dataCollection.items);
  const pickupAddressVal = extractDataCollectionValue(dataCollection.pickup_address);
  
  // Check for mode-specific outcomes first
  if (tenantBusinessMode === "food") {
    // Check multiple ways order confirmation can be expressed
    const orderConfirmed = 
      orderConfirmedVal === "true" || 
      orderConfirmedVal === "yes" ||
      !!orderItemsVal;
    if (orderConfirmed) {
      outcome = "order";
    }
  } else if (tenantBusinessMode === "dispatch") {
    if (jobCreatedVal === "true" || dispatchConfirmedVal === "true" || pickupAddressVal) {
      outcome = "dispatch";
    }
  }
  
  // Generic outcomes
  if (outcome === "lost") {
    if (analysis.call_successful === true || bookingConfirmedVal === "true" || bookingConfirmedVal === "yes") {
      outcome = "booked";
    } else if (callbackRequestedVal === "true" || callbackRequestedVal === "yes") {
      outcome = "followup";
    } else if (messageTakenVal === "true") {
      outcome = "message";
    } else if (analysis.call_successful === false) {
      outcome = "lost";
    } else if (customerName || serviceRequested) {
      outcome = "lead_captured";
    }
  }
  
  console.log("Determined outcome:", outcome, "for business mode:", tenantBusinessMode, "order_confirmed:", orderConfirmedVal);

  // ===== BUILD EXTRACTED PAYLOAD (MODE-SPECIFIC) =====
  const extractedPayload = buildExtractedPayload(tenantBusinessMode, dataCollection, payload.transcript);

  // ===== CUSTOMER RESOLUTION & LINKING =====
  let customerId = session.customer_id;
  
  // If no customer linked yet, try to find/create one (only if allowed by retention settings)
  if (!customerId && callerPhoneE164 && !phiMinimization && storeCallerPhone) {
    // Check for existing customer
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("phone_e164", callerPhoneE164)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update name if we learned it and it's more complete
      if (customerName && (!existingCustomer.full_name || existingCustomer.full_name === "Unknown" || customerName.length > existingCustomer.full_name.length)) {
        await supabase
          .from("customers")
          .update({ 
            full_name: customerName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", customerId);
        console.log(`Updated customer name: ${customerId} -> ${customerName}`);
      } else {
        // Just update last seen
        await supabase
          .from("customers")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", customerId);
      }
      console.log(`Linked to existing customer: ${customerId}`);
    } else if (callerPhoneE164) {
      // Create new customer (with name if we have it, otherwise "Unknown")
      const { data: newCustomer, error: createError } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenantId,
          full_name: customerName || "Unknown",
          phone_e164: callerPhoneE164,
          phone_raw: callerPhone,
          source: "ai_call",
        })
        .select("id")
        .single();

      if (!createError && newCustomer) {
        customerId = newCustomer.id;
        console.log(`Created new customer: ${customerId} (name: ${customerName || "Unknown"})`);
      }
    }
  }

  // Update context with extracted data
  const updatedContext = {
    ...existingContext,
    customer_name: customerName || existingContext.customer_name,
    service_requested: serviceRequested || existingContext.service_requested,
    booking_confirmed: outcome === "booked",
    call_duration_secs: payload.metadata?.call_duration_secs,
    customer_id: customerId,
    ...dataCollection,
  };

  // ===== UPDATE CALL SESSION WITH ALL DATA =====
  const { error: updateError } = await supabase
    .from("ai_call_sessions")
    .update({
      transcript: transcriptText,
      summary: summaryText || null,
      outcome: outcome as "booked" | "followup" | "lost" | "escalated",
      ended_at: payload.metadata?.end_time || new Date().toISOString(),
      context_json: updatedContext,
      elevenlabs_conversation_id: payload.conversation_id,
      customer_id: customerId,
      extracted_payload: extractedPayload,
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("Failed to update session:", updateError);
    await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "summary_save_error", {}, updateError.message);
    throw updateError;
  }

  // Log summary saved event
  await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "summary_saved", {
    outcome,
    has_transcript: !!transcriptText,
    has_summary: !!summaryText,
    customer_id: customerId,
    customer_name: customerName,
    extracted_fields: Object.keys(extractedPayload),
    extraction_source: extractedPayload._extraction_source || "unknown",
  });

  // Log customer resolution
  if (customerId) {
    await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "customer_resolved", {
      customer_id: customerId,
      customer_name: customerName,
      phone_e164: callerPhoneE164,
      was_existing: session.customer_id === customerId,
    });
  }

  console.log("Updated session:", sessionId, { 
    outcome, 
    hasTranscript: !!transcriptText, 
    hasSummary: !!summaryText, 
    customerId,
    customerName,
    extractedPayloadKeys: Object.keys(extractedPayload),
  });

  // ===== RECORD AUDIT EVENT =====
  try {
    await fetch(`${supabaseUrl}/functions/v1/record-audit-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        location_id: locationId,
        event_type: "call.ended",
        entity_type: "call",
        entity_id: sessionId,
        actor_type: "ai",
        payload: {
          outcome,
          duration_secs: payload.metadata?.call_duration_secs,
          customer_name: customerName,
          service_requested: serviceRequested,
          customer_id: customerId,
        },
      }),
    });
  } catch (e) {
    console.error("Failed to record call.ended audit event:", e);
  }

  // ===== TRIGGER CALL.ENDED AND CALL.COMPLETED EVENTS =====
  // call.ended - legacy event name
  // call.completed - preferred event name for automations
  const eventsToTrigger = ["call.ended", "call.completed"];
  
  for (const eventName of eventsToTrigger) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          trigger: eventName,
          entity_type: "call",
          entity_id: sessionId,
          location_id: locationId,
          customer: customerId ? {
            id: customerId,
            name: customerName,
            phone: callerPhoneE164,
          } : undefined,
          summary: analysis.summary,
          details: {
            outcome,
            duration_secs: payload.metadata?.call_duration_secs,
            service_requested: serviceRequested,
            extracted_payload: extractedPayload,
          },
        }),
      });
      console.log(`Triggered ${eventName} workflow for session:`, sessionId);
    } catch (e) {
      console.error(`Failed to trigger ${eventName} workflow:`, e);
    }
  }

  // Also emit lead.captured if applicable
  if ((outcome === "lead_captured" || outcome === "booked" || outcome === "followup") && customerId) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          trigger: "lead.captured",
          entity_type: "lead",
          entity_id: customerId,
          location_id: locationId,
          customer: {
            id: customerId,
            name: customerName,
            phone: callerPhoneE164,
          },
          details: {
            source: "ai_call",
            outcome,
            service_requested: serviceRequested,
          },
        }),
      });
      console.log("Triggered lead.captured workflow for customer:", customerId);
    } catch (e) {
      console.error("Failed to trigger lead.captured workflow:", e);
    }
  }

  // ===== RECORD POST-CALL OBSERVATIONS (CONFIDENCE GATED) =====
  if (memoryEnabled && outcome !== "lost") {
    const observations: Array<{
      type: string;
      subjectKey: string;
      observation: string;
      confidence: number;
    }> = [];

    // Observation 1: Service preference pattern
    if (serviceRequested) {
      const serviceKey = `service_${serviceRequested.toLowerCase().replace(/[^a-z0-9]+/g, "_").substring(0, 30)}`;
      observations.push({
        type: "service_pattern",
        subjectKey: serviceKey,
        observation: `Customer inquired about ${serviceRequested}`,
        confidence: outcome === "booked" ? 0.8 : 0.6,
      });
    }

    // Observation 2: Time pattern (day/hour of successful engagement)
    const callHour = new Date().getHours();
    const callDay = new Date().getDay();
    if (outcome === "booked" || outcome === "lead_captured" || outcome === "order") {
      observations.push({
        type: "time_pattern",
        subjectKey: `day_${callDay}_hour_${callHour}`,
        observation: `Successful engagement at ${callHour}:00 on day ${callDay}`,
        confidence: 0.7,
      });
    }

    // Observation 3: Customer preference (ONLY if allowed by retention settings)
    if (allowCustomerMemory && callerPhoneE164 && customerName && (outcome === "booked" || outcome === "order")) {
      const customerKey = `customer_${callerPhoneE164.replace(/\D/g, "").slice(-10)}`;
      observations.push({
        type: "customer_preference",
        subjectKey: customerKey,
        observation: `${customerName} booked ${serviceRequested || "service"} successfully`,
        confidence: 0.85,
      });
    }

    // Observation 4: Exception pattern (if call duration unusually long/short)
    const duration = payload.metadata?.call_duration_secs || 0;
    if (duration > 600) { // > 10 min
      observations.push({
        type: "exception_pattern",
        subjectKey: "long_calls",
        observation: `Call exceeded 10 minutes (${Math.round(duration / 60)} min) - may indicate complex inquiry`,
        confidence: 0.65,
      });
    }

    // Record observations that meet confidence threshold
    for (const obs of observations) {
      if (obs.confidence >= minConfidence) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/record-observation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              tenantId,
              locationId,
              observationType: obs.type,
              subjectKey: obs.subjectKey,
              observation: obs.observation,
            }),
          });
        } catch (e) {
          console.error(`Failed to record ${obs.type} observation:`, e);
        }
      }
    }
  }

  // Log extraction saved
  await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "extraction_saved", {
    business_mode: tenantBusinessMode,
    extracted_payload: extractedPayload,
  });

  // ===== UNIVERSAL DERIVED ENTITY PERSISTENCE =====
  // Based on intent and business_mode, persist to the appropriate domain table
  await persistDerivedEntity(
    supabase,
    supabaseUrl,
    supabaseKey,
    tenantId,
    sessionId,
    tenantBusinessMode,
    outcome,
    extractedPayload,
    dataCollection,
    customerName,
    customerId,
    callerPhoneE164,
    payload
  );
}

// Build extracted payload based on business mode
// Includes server-side extraction fallback when ElevenLabs doesn't provide structured data
// IMPORTANT: Uses extractDataCollectionValue to unwrap ElevenLabs nested objects
function buildExtractedPayload(
  businessMode: string,
  dataCollection: Record<string, string>,
  transcript?: ElevenLabsWebhookPayload["transcript"]
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  
  // Helper to get clean value from data collection
  const getVal = (key: string): string | null => {
    return extractDataCollectionValue(dataCollection[key]);
  };
  
  // Always include common fields (unwrapped)
  const customerNameVal = getVal("customer_name") || getVal("name");
  if (customerNameVal) {
    payload.customer_name = customerNameVal;
  }
  const callbackNumberVal = getVal("callback_number");
  if (callbackNumberVal) {
    payload.callback_number = callbackNumberVal;
  }
  const notesVal = getVal("notes") || getVal("special_instructions");
  if (notesVal) {
    payload.notes = notesVal;
  }
  
  // SERVER-SIDE EXTRACTION FALLBACK
  // If ElevenLabs didn't provide structured data, extract from transcript
  const hasStructuredData = Object.keys(dataCollection).length > 0;
  
  if (!hasStructuredData && transcript?.length) {
    const extracted = extractStructuredDataFromTranscript(transcript, businessMode);
    Object.assign(payload, extracted);
    payload._extraction_source = "server_side";
  } else {
    payload._extraction_source = "elevenlabs";
  }
  
  switch (businessMode) {
    case "food": {
      // Food mode: order items, modifiers, totals, pickup/delivery, address
      const orderItemsRaw = getVal("order_items") || getVal("items");
      if (orderItemsRaw) {
        try {
          payload.items = JSON.parse(orderItemsRaw);
        } catch {
          payload.items_raw = orderItemsRaw;
        }
      }
      const orderTypeVal = getVal("order_type");
      if (orderTypeVal) payload.order_type = orderTypeVal;
      
      const deliveryAddressVal = getVal("delivery_address");
      if (deliveryAddressVal) payload.delivery_address = deliveryAddressVal;
      
      const requestedTimeVal = getVal("pickup_time") || getVal("requested_time");
      if (requestedTimeVal) payload.requested_time = requestedTimeVal;
      
      const totalEstimateVal = getVal("total_estimate");
      if (totalEstimateVal) payload.total_estimate = totalEstimateVal;
      
      const specialInstructionsVal = getVal("special_instructions");
      if (specialInstructionsVal) payload.special_instructions = specialInstructionsVal;
      
      const modifiersRaw = getVal("modifiers");
      if (modifiersRaw) {
        try {
          payload.modifiers = JSON.parse(modifiersRaw);
        } catch {
          payload.modifiers_raw = modifiersRaw;
        }
      }
      break;
    }
      
    case "service": {
      // Service mode: service requested, schedule preference, intake fields
      const serviceVal = getVal("service_requested") || getVal("service");
      if (serviceVal) payload.service_requested = serviceVal;
      
      const preferredDateVal = getVal("preferred_date") || getVal("schedule_date");
      if (preferredDateVal) payload.preferred_date = preferredDateVal;
      
      const preferredTimeVal = getVal("preferred_time") || getVal("schedule_time");
      if (preferredTimeVal) payload.preferred_time = preferredTimeVal;
      
      const addressVal = getVal("address") || getVal("service_address");
      if (addressVal) payload.address = addressVal;
      
      const vehicleVal = getVal("vehicle");
      if (vehicleVal) payload.vehicle = vehicleVal;
      
      const vehicleYearVal = getVal("vehicle_year");
      if (vehicleYearVal) payload.vehicle_year = vehicleYearVal;
      
      const vehicleMakeVal = getVal("vehicle_make");
      if (vehicleMakeVal) payload.vehicle_make = vehicleMakeVal;
      
      const vehicleModelVal = getVal("vehicle_model");
      if (vehicleModelVal) payload.vehicle_model = vehicleModelVal;
      
      // Capture any additional intake fields (also unwrap)
      for (const key of Object.keys(dataCollection)) {
        if (key.startsWith("intake_") || key.startsWith("custom_")) {
          const val = getVal(key);
          if (val) payload[key] = val;
        }
      }
      break;
    }
      
    case "dispatch": {
      // Dispatch mode: pickup/dropoff, vehicle, urgency
      const pickupVal = getVal("pickup_address");
      if (pickupVal) payload.pickup_address = pickupVal;
      
      const dropoffVal = getVal("dropoff_address");
      if (dropoffVal) payload.dropoff_address = dropoffVal;
      
      const vehicleVal = getVal("vehicle_type") || getVal("vehicle");
      if (vehicleVal) payload.vehicle = vehicleVal;
      
      const isDrivableVal = getVal("is_drivable");
      if (isDrivableVal !== null) {
        payload.is_drivable = isDrivableVal === "true" || isDrivableVal === "yes";
      }
      
      const urgencyVal = getVal("urgency") || getVal("priority");
      if (urgencyVal) payload.urgency = urgencyVal;
      
      const jobTypeVal = getVal("job_type");
      if (jobTypeVal) payload.job_type = jobTypeVal;
      
      const etaVal = getVal("eta_requested");
      if (etaVal) payload.eta_requested = etaVal;
      break;
    }
      
    case "medical": {
      // Medical mode: minimal intake, no PHI stored
      const apptTypeVal = getVal("appointment_type");
      if (apptTypeVal) payload.appointment_type = apptTypeVal;
      
      const isNewPatientVal = getVal("is_new_patient");
      if (isNewPatientVal !== null) {
        payload.is_new_patient = isNewPatientVal === "true" || isNewPatientVal === "yes";
      }
      
      const preferredDateVal = getVal("preferred_date");
      if (preferredDateVal) payload.preferred_date = preferredDateVal;
      
      const callbackVal = getVal("callback_requested");
      if (callbackVal !== null) {
        payload.callback_requested = callbackVal === "true";
      }
      // Do NOT store symptoms or other PHI
      break;
    }
      
    default: {
      // General mode: service/reason
      const serviceVal = getVal("service_requested") || getVal("reason");
      if (serviceVal) payload.service_requested = serviceVal;
      
      const messageVal = getVal("message");
      if (messageVal) payload.message = messageVal;
    }
  }
  
  return payload;
}

// Server-side extraction from transcript when ElevenLabs doesn't provide structured data
function extractStructuredDataFromTranscript(
  transcript: NonNullable<ElevenLabsWebhookPayload["transcript"]>,
  businessMode: string
): Record<string, unknown> {
  const extracted: Record<string, unknown> = {};
  
  const customerMessages = transcript
    .filter(t => t.role === "user")
    .map(t => t.message.toLowerCase())
    .join(" ");
  
  const allMessages = transcript
    .map(t => t.message.toLowerCase())
    .join(" ");
  
  // Extract customer name
  const nameMatch = customerMessages.match(/(?:my name is|this is|i'm|i am|call me)\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (nameMatch) {
    extracted.customer_name = nameMatch[1].split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  
  // Extract callback number if mentioned
  const phoneMatch = customerMessages.match(/(?:call me (?:back )?at|my number is|reach me at)\s*([\d\-\(\)\s]+)/);
  if (phoneMatch) {
    extracted.callback_number = phoneMatch[1].replace(/\D/g, "");
  }
  
  // Business mode specific extraction
  switch (businessMode) {
    case "food":
      // ===== RESERVATION DETECTION (check BEFORE order detection) =====
      // Look for reservation-specific keywords: "table for X", "reservation for X", "party of X"
      const reservationPatterns = [
        /(?:table|reservation|party)\s+(?:for|of)\s+(\d+)/i,
        /(\d+)\s+(?:people|guests|persons?)\s+(?:for|on|this)/i,
        /book(?:ing)?\s+(?:a\s+)?table/i,
        /make\s+(?:a\s+)?reservation/i,
        /reserve\s+(?:a\s+)?table/i,
      ];
      
      let isReservation = false;
      let partySizeFromTranscript: number | null = null;
      
      for (const pattern of reservationPatterns) {
        const match = customerMessages.match(pattern);
        if (match) {
          isReservation = true;
          if (match[1]) {
            partySizeFromTranscript = parseInt(match[1]);
          }
          break;
        }
      }
      
      // Also check for large party sizes mentioned (25, 30, 40+ people suggests reservation)
      const largeParyMatch = customerMessages.match(/(\d+)\s*(?:people|guests|of us)/i);
      if (largeParyMatch) {
        const size = parseInt(largeParyMatch[1]);
        if (size >= 4) { // 4+ people likely a reservation, not individual order
          isReservation = true;
          partySizeFromTranscript = size;
        }
      }
      
      // Extract date/time for reservation
      if (isReservation) {
        extracted._reservation_detected = true;
        if (partySizeFromTranscript) {
          extracted.party_size = String(partySizeFromTranscript);
        }
        
        // Extract date
        const resDateMatch = customerMessages.match(/(?:on|for|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)/i);
        if (resDateMatch) {
          extracted.reservation_date = resDateMatch[1];
        }
        
        // Extract time
        const resTimeMatch = customerMessages.match(/(?:at|around|about)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
        if (resTimeMatch) {
          extracted.reservation_time = resTimeMatch[1];
        }
        
        // Check if AI confirmed reservation
        if (allMessages.includes("reservation") && (allMessages.includes("confirm") || allMessages.includes("booked") || allMessages.includes("see you"))) {
          extracted.reservation_confirmed = "true";
        }
        
        break; // Don't continue to order extraction
      }
      
      // ===== ORDER DETECTION =====
      // Check for order confirmation
      if (allMessages.includes("order") && (allMessages.includes("confirm") || allMessages.includes("placed") || allMessages.includes("ready"))) {
        extracted.order_confirmed = "true";
      }
      
      // Check order type
      if (customerMessages.includes("delivery") || customerMessages.includes("deliver")) {
        extracted.order_type = "delivery";
      } else if (customerMessages.includes("pickup") || customerMessages.includes("pick up")) {
        extracted.order_type = "pickup";
      }
      
      // Extract address for delivery
      const addressMatch = customerMessages.match(/(?:deliver to|address is|at)\s+(\d+\s+[a-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|boulevard|blvd))/i);
      if (addressMatch) {
        extracted.delivery_address = addressMatch[1];
      }
      
      // Extract any mentioned food items (basic extraction)
      const foodItems: string[] = [];
      const foodPatterns = [
        /(?:i(?:'d| would) like|order|want|get me|have)\s+(?:a|an|the|some)?\s*(\d*\s*[a-z\s]+)/gi
      ];
      for (const pattern of foodPatterns) {
        const matches = customerMessages.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].length > 2 && match[1].length < 50) {
            foodItems.push(match[1].trim());
          }
        }
      }
      if (foodItems.length > 0) {
        extracted.items_raw = foodItems.join(", ");
      }
      break;
      
    case "service":
      // Extract service type
      const servicePatterns = [
        /(?:need|want|looking for|schedule|book)\s+(?:a|an)?\s*([a-z\s]+(?:service|appointment|cleaning|repair|maintenance|consultation))/i,
      ];
      for (const pattern of servicePatterns) {
        const match = customerMessages.match(pattern);
        if (match) {
          extracted.service_requested = match[1].trim();
          break;
        }
      }
      
      // Extract preferred date/time
      const dateMatch = customerMessages.match(/(?:on|for|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)/i);
      if (dateMatch) {
        extracted.preferred_date = dateMatch[1];
      }
      
      const timeMatch = customerMessages.match(/(?:at|around|about)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (timeMatch) {
        extracted.preferred_time = timeMatch[1];
      }
      break;
      
    case "dispatch":
      // Extract pickup address
      const pickupMatch = customerMessages.match(/(?:pick(?:ing)? (?:me )?up|from|at)\s+(\d+\s+[a-z\s]+(?:street|st|avenue|ave|road|rd))/i);
      if (pickupMatch) {
        extracted.pickup_address = pickupMatch[1];
      }
      
      // Extract dropoff/destination
      const dropoffMatch = customerMessages.match(/(?:to|drop(?:ping)? (?:me )?(?:off|at)|going to|destination)\s+(\d+\s+[a-z\s]+(?:street|st|avenue|ave|road|rd))/i);
      if (dropoffMatch) {
        extracted.dropoff_address = dropoffMatch[1];
      }
      
      // Extract vehicle info
      const vehicleMatch = customerMessages.match(/(car|truck|suv|van|sedan|motorcycle|vehicle)/i);
      if (vehicleMatch) {
        extracted.vehicle = vehicleMatch[1];
      }
      
      // Check urgency
      if (customerMessages.includes("urgent") || customerMessages.includes("emergency") || customerMessages.includes("asap") || customerMessages.includes("right away")) {
        extracted.urgency = "high";
      }
      
      // Check job type
      if (customerMessages.includes("tow") || customerMessages.includes("broke down")) {
        extracted.job_type = "tow";
      } else if (customerMessages.includes("jump") || customerMessages.includes("battery")) {
        extracted.job_type = "jump_start";
      } else if (customerMessages.includes("flat") || customerMessages.includes("tire")) {
        extracted.job_type = "tire_change";
      } else if (customerMessages.includes("lock") || customerMessages.includes("keys")) {
        extracted.job_type = "lockout";
      }
      break;
      
    case "medical":
      // Check if new patient
      if (customerMessages.includes("new patient") || customerMessages.includes("first time") || customerMessages.includes("never been")) {
        extracted.is_new_patient = "true";
      }
      
      // Extract appointment type
      const apptMatch = customerMessages.match(/(?:need|want|schedule|book)\s+(?:a|an)?\s*([a-z\s]+(?:appointment|checkup|consultation|exam|visit))/i);
      if (apptMatch) {
        extracted.appointment_type = apptMatch[1].trim();
      }
      break;
      
    default:
      // General extraction
      const reasonMatch = customerMessages.match(/(?:calling about|reason for calling|need help with|question about)\s+(.+?)(?:\.|$)/i);
      if (reasonMatch) {
        extracted.service_requested = reasonMatch[1].trim();
      }
  }
  
  return extracted;
}

// deno-lint-ignore no-explicit-any
async function processFoodOrderIfApplicable(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string | null,
  dataCollection: Record<string, string>,
  customerName: string | null,
  customerId: string | null,
  payload: ElevenLabsWebhookPayload,
  extractedPayload: Record<string, unknown>
) {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("business_mode, enabled_modules")
    .eq("id", tenantId)
    .single();

  if (!tenant) return;

  const isFoodMode = tenant.business_mode === "food" || 
    (Array.isArray(tenant.enabled_modules) && 
      ["food_orders", "menu_knowledge"].some((m: string) => tenant.enabled_modules.includes(m)));

  if (!isFoodMode) return;

  // Check if order was confirmed - unwrap ElevenLabs data collection objects
  const orderConfirmedVal = extractDataCollectionValue(dataCollection.order_confirmed);
  const orderConfirmed = 
    orderConfirmedVal === "true" || 
    orderConfirmedVal === "yes" ||
    extractedPayload.order_confirmed === true ||
    extractedPayload.order_confirmed === "true";
  
  // Unwrap order items as well
  const orderItemsRaw = extractDataCollectionValue(dataCollection.order_items) || 
    extractDataCollectionValue(dataCollection.items) || 
    extractedPayload.items_raw;
  
  // Also check if we have items extracted from transcript
  const hasOrderData = orderConfirmed || orderItemsRaw || extractedPayload.items;
  
  if (!hasOrderData) return;

  console.log("Processing food order for tenant:", tenantId);

  let parsedItems: Array<{ name: string; qty: number; modifiers?: string[]; item_notes?: string }> = [];
  let extractedTotalCents: number | null = null;
  
  try {
    if (typeof orderItemsRaw === "string") {
      try {
        parsedItems = JSON.parse(orderItemsRaw);
      } catch {
        // Parse natural language items from transcript or raw string
        const parsed = parseNaturalLanguageItems(orderItemsRaw, payload.transcript);
        parsedItems = parsed.items;
        extractedTotalCents = parsed.totalCents;
      }
    }
  } catch (e) {
    console.error("Failed to parse order items:", e);
  }
  
  // Use items from extracted payload if available and parsedItems is empty
  if (parsedItems.length === 0 && Array.isArray(extractedPayload.items)) {
    parsedItems = extractedPayload.items as typeof parsedItems;
  }
  
  // If still empty but we have items_raw, try parsing that
  if (parsedItems.length === 0 && typeof extractedPayload.items_raw === "string") {
    const parsed = parseNaturalLanguageItems(extractedPayload.items_raw, payload.transcript);
    parsedItems = parsed.items;
    if (!extractedTotalCents) extractedTotalCents = parsed.totalCents;
  }

  // ===== MATCH ITEMS TO MENU AND CALCULATE PRICES =====
  const { items: pricedItems, totalCents: calculatedTotal, unmatchedCount } = 
    await matchAndPriceItems(supabase, tenantId, parsedItems);
  
  // Use calculated total if available, otherwise fall back to transcript-parsed total
  const finalTotalCents = calculatedTotal > 0 ? calculatedTotal : extractedTotalCents;
  
  console.log("Price matching result:", {
    parsedItemCount: parsedItems.length,
    pricedItemCount: pricedItems.length,
    calculatedTotal,
    extractedTotalCents,
    finalTotalCents,
    unmatchedCount,
  });

  // Generate sequential order number (ORD-101, ORD-102, etc.)
  const { data: lastOrder } = await supabase
    .from("food_orders")
    .select("order_number")
    .eq("tenant_id", tenantId)
    .like("order_number", "ORD-%")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  let nextOrderNum = 100;
  if (lastOrder?.order_number) {
    const match = lastOrder.order_number.match(/ORD-(\d+)/);
    if (match) {
      nextOrderNum = parseInt(match[1], 10) + 1;
    }
  }
  const orderNumber = `ORD-${nextOrderNum}`;
  
  // Also unwrap uncertainty flags
  const needsClarificationVal = extractDataCollectionValue(dataCollection.needs_clarification);
  const uncertainVal = extractDataCollectionValue(dataCollection.uncertain);
  const hasUncertainty = needsClarificationVal === "true" || 
    uncertainVal === "true" ||
    (parsedItems.length === 0 && orderItemsRaw);
  
  const status = hasUncertainty ? "needs_followup" : "confirmed";
  
  // Unwrap customer name for order
  const orderCustomerName = customerName || 
    extractDataCollectionValue(dataCollection.customer_name) || 
    "Phone Customer";

  // ===== COLLECT ALL SPECIAL INSTRUCTIONS AND MODIFIERS =====
  // Combine item-level notes, modifiers, and order-level special instructions
  const allInstructions: string[] = [];
  
  // Add item-level modifiers and notes
  for (const item of pricedItems) {
    if (item.modifiers && item.modifiers.length > 0) {
      allInstructions.push(`${item.name}: ${item.modifiers.join(", ")}`);
    }
    if (item.item_notes) {
      allInstructions.push(`${item.name}: ${item.item_notes}`);
    }
  }
  
  // Add order-level special instructions
  const orderLevelInstructions = 
    (extractedPayload.special_instructions as string) || 
    extractDataCollectionValue(dataCollection.special_instructions) ||
    null;
  if (orderLevelInstructions) {
    allInstructions.push(orderLevelInstructions);
  }
  
  // Fallback: if no items parsed but we have raw order data
  const fallbackInstructions = (orderItemsRaw && parsedItems.length === 0) 
    ? `Customer order: ${orderItemsRaw}` 
    : null;
  if (fallbackInstructions) {
    allInstructions.push(fallbackInstructions);
  }
  
  const combinedSpecialInstructions = allInstructions.length > 0 
    ? allInstructions.join("; ") 
    : null;

  const { data: newOrder, error: orderError } = await supabase
    .from("food_orders")
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      order_number: orderNumber,
      order_type: (extractedPayload.order_type as string) || extractDataCollectionValue(dataCollection.order_type) || "pickup",
      status,
      customer_id: customerId,
      customer_name: orderCustomerName,
      customer_phone: payload.dynamic_variables?.caller_phone || null,
      items_json: pricedItems.length > 0 ? pricedItems : [{ name: "Order details in special instructions", qty: 1, matched: false }],
      total_cents: finalTotalCents,
      subtotal_cents: calculatedTotal > 0 ? calculatedTotal : null,
      totals_estimate: {
        subtotal: calculatedTotal > 0 ? calculatedTotal : null,
        parsed_from_speech: extractedTotalCents,
        calculated_from_menu: calculatedTotal > 0,
        unmatched_items: unmatchedCount,
      },
      special_instructions: combinedSpecialInstructions,
      requested_time: extractDataCollectionValue(dataCollection.requested_time) ? new Date(extractDataCollectionValue(dataCollection.requested_time) as string).toISOString() : null,
      delivery_address: (extractedPayload.delivery_address as string) || extractDataCollectionValue(dataCollection.delivery_address) || null,
      address_json: (extractedPayload.delivery_address || extractDataCollectionValue(dataCollection.delivery_address)) ? { street: extractedPayload.delivery_address || extractDataCollectionValue(dataCollection.delivery_address) } : null,
    })
    .select()
    .single();

  if (orderError) {
    console.error("Failed to create food order:", orderError);
    return;
  }

  console.log("Created food order:", newOrder.id, newOrder.order_number);

  // Record audit event
  try {
    await fetch(`${supabaseUrl}/functions/v1/record-audit-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        event_type: status === "confirmed" ? "order.confirmed" : "order.created",
        entity_type: "order",
        entity_id: newOrder.id,
        actor_type: "ai",
        payload: {
          order_number: orderNumber,
          order_type: dataCollection.order_type || "pickup",
          item_count: parsedItems.length,
          customer_id: customerId,
        },
        confirmation_summary: status === "confirmed" 
          ? `Order #${orderNumber}: ${parsedItems.map(i => `${i.qty}x ${i.name}`).join(", ") || "See special instructions"}`
          : undefined,
        confirmed_by: "customer_voice",
      }),
    });
  } catch (e) {
    console.error("Failed to record order audit event:", e);
  }

  // Trigger order handoff
  try {
    await fetch(`${supabaseUrl}/functions/v1/order-handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        order_id: newOrder.id,
        tenant_id: tenantId,
      }),
    });
  } catch (e) {
    console.error("Failed to trigger order handoff:", e);
  }
}

// ===== UNIVERSAL DERIVED ENTITY PERSISTENCE ROUTER =====
// Routes extracted call data to the appropriate domain table based on intent and business_mode
// deno-lint-ignore no-explicit-any
async function persistDerivedEntity(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string,
  businessMode: string,
  outcome: string,
  extractedPayload: Record<string, unknown>,
  dataCollection: Record<string, string>,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string,
  payload: ElevenLabsWebhookPayload
): Promise<void> {
  // Determine intent from outcome + extracted payload
  const intent = determineIntent(outcome, businessMode, extractedPayload, dataCollection);
  
  console.log(`[persistDerivedEntity] Intent: ${intent}, BusinessMode: ${businessMode}, Outcome: ${outcome}`);
  
  // Log the intent determination
  await logEventStage(supabase, tenantId, sessionId, null, payload.conversation_id, "intent_determined", {
    intent,
    business_mode: businessMode,
    outcome,
  });
  
  let entityType: string | null = null;
  let entityId: string | null = null;
  let success = false;
  let errorMsg: string | null = null;
  
  try {
    switch (intent) {
      case "order":
        // Delegate to existing food order handler
        await processFoodOrderIfApplicable(
          supabase, supabaseUrl, supabaseKey, tenantId, sessionId, dataCollection,
          customerName, customerId, payload, extractedPayload
        );
        // Food order logs its own entity creation
        entityType = "order";
        success = true;
        break;
        
      case "reservation":
        const reservation = await persistReservation(
          supabase, supabaseUrl, supabaseKey, tenantId, sessionId,
          extractedPayload, dataCollection, customerName, customerId, callerPhoneE164
        );
        if (reservation) {
          entityType = "reservation";
          entityId = reservation.id;
          success = true;
        }
        break;
        
      case "booking":
        const booking = await persistBooking(
          supabase, supabaseUrl, supabaseKey, tenantId, sessionId,
          extractedPayload, dataCollection, customerName, customerId, callerPhoneE164
        );
        if (booking) {
          entityType = "booking";
          entityId = booking.id;
          success = true;
        }
        break;
        
      case "dispatch":
        const dispatchJob = await persistDispatchJob(
          supabase, supabaseUrl, supabaseKey, tenantId, sessionId,
          extractedPayload, dataCollection, customerName, customerId, callerPhoneE164
        );
        if (dispatchJob) {
          entityType = "dispatch_job";
          entityId = dispatchJob.id;
          success = true;
        }
        break;
        
      default:
        // No derived entity to create (callback, faq, message_only, etc.)
        console.log(`[persistDerivedEntity] No derived entity for intent: ${intent}`);
        break;
    }
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
    console.error(`[persistDerivedEntity] Failed to persist ${intent}:`, e);
  }
  
  // Log derived entity creation result
  if (entityType) {
    await logEventStage(
      supabase, tenantId, sessionId, null, payload.conversation_id,
      success ? "derived_entity_created" : "derived_entity_failed",
      { entity_type: entityType, entity_id: entityId, intent },
      errorMsg
    );
  }
}

// Determine intent from outcome and extracted data
function determineIntent(
  outcome: string,
  businessMode: string,
  extractedPayload: Record<string, unknown>,
  dataCollection: Record<string, string>
): string {
  // Direct outcome mappings
  if (outcome === "order") return "order";
  if (outcome === "dispatch") return "dispatch";
  if (outcome === "booked") return "booking";
  
  // Check extracted payload for explicit intent
  const explicitIntent = extractedPayload.intent as string;
  if (explicitIntent && ["order", "reservation", "booking", "dispatch", "callback", "faq"].includes(explicitIntent)) {
    return explicitIntent;
  }
  
  // Check data collection fields
  const orderConfirmed = extractDataCollectionValue(dataCollection.order_confirmed);
  if (orderConfirmed === "true" || orderConfirmed === "yes") return "order";
  
  const reservationConfirmed = extractDataCollectionValue(dataCollection.reservation_confirmed);
  if (reservationConfirmed === "true" || reservationConfirmed === "yes") return "reservation";
  
  const bookingConfirmed = extractDataCollectionValue(dataCollection.booking_confirmed);
  if (bookingConfirmed === "true" || bookingConfirmed === "yes") return "booking";
  
  const dispatchConfirmed = extractDataCollectionValue(dataCollection.dispatch_confirmed) || 
    extractDataCollectionValue(dataCollection.job_created);
  if (dispatchConfirmed === "true" || dispatchConfirmed === "yes") return "dispatch";
  
  // Infer from business mode + extracted data presence
  if (businessMode === "food") {
    // Check for reservation data - IMPROVED detection
    const hasPartySize = extractedPayload.party_size || 
      extractDataCollectionValue(dataCollection.party_size) ||
      extractDataCollectionValue(dataCollection.guests) ||
      extractDataCollectionValue(dataCollection.number_of_guests);
    
    const hasReservationDate = extractDataCollectionValue(dataCollection.reservation_date) ||
      extractDataCollectionValue(dataCollection.date) ||
      extractedPayload.reservation_date ||
      extractedPayload.date;
    
    const hasReservationTime = extractDataCollectionValue(dataCollection.reservation_time) ||
      extractDataCollectionValue(dataCollection.time) ||
      extractedPayload.reservation_time ||
      extractedPayload.time;
    
    // If we have party size OR (date + time combination), it's a reservation
    const hasReservationData = hasPartySize || (hasReservationDate && hasReservationTime);
    
    // Also check for extracted reservation intent from transcript
    if (hasReservationData || extractedPayload._reservation_detected) {
      return "reservation";
    }
    
    // Check for order data (items)
    const hasOrderData = extractedPayload.items || 
      extractedPayload.items_raw ||
      extractDataCollectionValue(dataCollection.order_items);
    if (hasOrderData) return "order";
  }
  
  if (businessMode === "dispatch") {
    const hasDispatchData = extractedPayload.pickup_address ||
      extractDataCollectionValue(dataCollection.pickup_address);
    if (hasDispatchData) return "dispatch";
  }
  
  if (businessMode === "service" || businessMode === "medical") {
    const hasBookingData = extractedPayload.service_requested ||
      extractedPayload.preferred_date ||
      extractDataCollectionValue(dataCollection.service_requested);
    if (hasBookingData) return "booking";
  }
  
  // Fallback: check for callback request
  const callbackRequested = extractDataCollectionValue(dataCollection.callback_requested);
  if (callbackRequested === "true" || callbackRequested === "yes") return "callback";
  
  return "other";
}

// ===== PERSIST RESERVATION =====
// deno-lint-ignore no-explicit-any
async function persistReservation(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string,
  extractedPayload: Record<string, unknown>,
  dataCollection: Record<string, string>,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string
): Promise<{ id: string } | null> {
  // Extract reservation data
  const partySize = parseInt(
    extractDataCollectionValue(dataCollection.party_size) ||
    String(extractedPayload.party_size) ||
    extractDataCollectionValue(dataCollection.guests) ||
    "2"
  ) || 2;
  
  let reservationDate = extractDataCollectionValue(dataCollection.reservation_date) ||
    extractDataCollectionValue(dataCollection.date) ||
    extractedPayload.reservation_date as string ||
    extractedPayload.date as string;
    
  let reservationTime = extractDataCollectionValue(dataCollection.reservation_time) ||
    extractDataCollectionValue(dataCollection.time) ||
    extractedPayload.reservation_time as string ||
    extractedPayload.time as string;
  
  // Parse natural language dates (e.g., "next Friday")
  if (reservationDate && !reservationDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    reservationDate = parseNaturalDate(reservationDate);
  }
  
  // Default to today if no date
  if (!reservationDate) {
    reservationDate = new Date().toISOString().split("T")[0];
  }
  
  // Parse time (e.g., "7 PM" -> "19:00")
  if (reservationTime && !reservationTime.match(/^\d{2}:\d{2}/)) {
    reservationTime = parseNaturalTime(reservationTime);
  }
  
  // Default to 7 PM if no time
  if (!reservationTime) {
    reservationTime = "19:00";
  }
  
  const specialRequests = extractDataCollectionValue(dataCollection.special_requests) ||
    extractDataCollectionValue(dataCollection.notes) ||
    extractedPayload.notes as string ||
    null;
  
  const tablePreference = extractDataCollectionValue(dataCollection.table_preference) ||
    extractedPayload.table_preference as string ||
    null;
  
  console.log(`[persistReservation] Creating: ${partySize} guests on ${reservationDate} at ${reservationTime}`);
  
  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      customer_id: customerId,
      customer_name: customerName || "Phone Customer",
      customer_phone: callerPhoneE164 || null,
      party_size: partySize,
      reservation_date: reservationDate,
      reservation_time: reservationTime,
      special_requests: specialRequests,
      table_preference: tablePreference,
      status: "confirmed",
    })
    .select("id")
    .single();
  
  if (error) {
    console.error("[persistReservation] Failed:", error);
    return null;
  }
  
  console.log(`[persistReservation] Created reservation: ${reservation.id}`);
  
  // Trigger workflow
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        trigger: "reservation.created",
        entity_type: "reservation",
        entity_id: reservation.id,
        customer: customerId ? { id: customerId, name: customerName, phone: callerPhoneE164 } : undefined,
        details: { party_size: partySize, date: reservationDate, time: reservationTime },
      }),
    });
  } catch (e) {
    console.error("[persistReservation] Failed to trigger workflow:", e);
  }
  
  return reservation;
}

// ===== PERSIST BOOKING =====
// deno-lint-ignore no-explicit-any
async function persistBooking(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string,
  extractedPayload: Record<string, unknown>,
  dataCollection: Record<string, string>,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string
): Promise<{ id: string } | null> {
  // Get or create lead for booking
  let leadId: string | null = null;
  
  // Try to find existing lead by customer
  if (customerId) {
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone", callerPhoneE164)
      .maybeSingle();
    
    if (existingLead) {
      leadId = existingLead.id;
    }
  }
  
  // Create lead if not found
  if (!leadId) {
    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        tenant_id: tenantId,
        full_name: customerName || "Phone Customer",
        phone: callerPhoneE164,
        source: "ai_call",
        status: "new",
      })
      .select("id")
      .single();
    
    if (leadError) {
      console.error("[persistBooking] Failed to create lead:", leadError);
      return null;
    }
    leadId = newLead.id;
  }
  
  // Extract booking data
  const serviceRequested = extractDataCollectionValue(dataCollection.service_requested) ||
    extractedPayload.service_requested as string;
  
  // Try to match service
  let serviceId: string | null = null;
  if (serviceRequested) {
    const { data: service } = await supabase
      .from("services")
      .select("id, duration_minutes")
      .eq("tenant_id", tenantId)
      .ilike("name", `%${serviceRequested}%`)
      .limit(1)
      .maybeSingle();
    
    if (service) {
      serviceId = service.id;
    }
  }
  
  // Parse date/time
  let preferredDate = extractDataCollectionValue(dataCollection.preferred_date) ||
    extractedPayload.preferred_date as string;
  let preferredTime = extractDataCollectionValue(dataCollection.preferred_time) ||
    extractedPayload.preferred_time as string;
  
  if (preferredDate && !preferredDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    preferredDate = parseNaturalDate(preferredDate);
  }
  
  // Default to tomorrow
  if (!preferredDate) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    preferredDate = tomorrow.toISOString().split("T")[0];
  }
  
  if (preferredTime && !preferredTime.match(/^\d{2}:\d{2}/)) {
    preferredTime = parseNaturalTime(preferredTime);
  }
  
  if (!preferredTime) {
    preferredTime = "10:00";
  }
  
  // Build start_at and end_at
  const startAt = new Date(`${preferredDate}T${preferredTime}:00`);
  const durationMinutes = 60; // Default 1 hour
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  
  const notes = extractDataCollectionValue(dataCollection.notes) ||
    extractedPayload.notes as string ||
    (serviceRequested ? `Service requested: ${serviceRequested}` : null);
  
  console.log(`[persistBooking] Creating: ${serviceRequested || "Service"} on ${preferredDate} at ${preferredTime}`);
  
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      lead_id: leadId,
      service_id: serviceId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "pending_deposit", // Pending until confirmed in UI
      deposit_required: false,
      deposit_paid: false,
      notes,
    })
    .select("id")
    .single();
  
  if (error) {
    console.error("[persistBooking] Failed:", error);
    return null;
  }
  
  console.log(`[persistBooking] Created booking: ${booking.id}`);
  
  // Trigger workflow
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        trigger: "booking.created",
        entity_type: "booking",
        entity_id: booking.id,
        customer: customerId ? { id: customerId, name: customerName, phone: callerPhoneE164 } : undefined,
        details: { service: serviceRequested, date: preferredDate, time: preferredTime },
      }),
    });
  } catch (e) {
    console.error("[persistBooking] Failed to trigger workflow:", e);
  }
  
  return booking;
}

// ===== PERSIST DISPATCH JOB =====
// deno-lint-ignore no-explicit-any
async function persistDispatchJob(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string,
  extractedPayload: Record<string, unknown>,
  dataCollection: Record<string, string>,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string
): Promise<{ id: string } | null> {
  // Extract dispatch data
  const pickupAddress = extractDataCollectionValue(dataCollection.pickup_address) ||
    extractedPayload.pickup_address as string ||
    null;
  
  const dropoffAddress = extractDataCollectionValue(dataCollection.dropoff_address) ||
    extractedPayload.dropoff_address as string ||
    null;
  
  const vehicleType = extractDataCollectionValue(dataCollection.vehicle_type) ||
    extractDataCollectionValue(dataCollection.vehicle) ||
    extractedPayload.vehicle as string ||
    null;
  
  const urgency = extractDataCollectionValue(dataCollection.urgency) ||
    extractedPayload.urgency as string ||
    "normal";
  
  const jobType = extractDataCollectionValue(dataCollection.job_type) ||
    extractedPayload.job_type as string ||
    "tow";
  
  const description = extractDataCollectionValue(dataCollection.description) ||
    extractDataCollectionValue(dataCollection.notes) ||
    extractedPayload.notes as string ||
    null;
  
  // Generate job number
  const { data: lastJob } = await supabase
    .from("dispatch_jobs")
    .select("job_number")
    .eq("tenant_id", tenantId)
    .like("job_number", "JOB-%")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  let nextJobNum = 1001;
  if (lastJob?.job_number) {
    const match = lastJob.job_number.match(/JOB-(\d+)/);
    if (match) {
      nextJobNum = parseInt(match[1], 10) + 1;
    }
  }
  const jobNumber = `JOB-${nextJobNum}`;
  
  // Map urgency to priority
  const priorityMap: Record<string, string> = {
    urgent: "urgent",
    emergency: "urgent",
    asap: "high",
    high: "high",
    normal: "normal",
    low: "low",
  };
  const priority = priorityMap[urgency.toLowerCase()] || "normal";
  
  console.log(`[persistDispatchJob] Creating: ${jobNumber} - ${jobType} at ${pickupAddress}`);
  
  const { data: job, error } = await supabase
    .from("dispatch_jobs")
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      job_number: jobNumber,
      customer_id: customerId,
      customer_name: customerName || "Phone Customer",
      customer_phone: callerPhoneE164 || null,
      pickup_address: pickupAddress,
      dropoff_address: dropoffAddress,
      job_type: jobType,
      description,
      priority,
      status: "pending",
    })
    .select("id")
    .single();
  
  if (error) {
    console.error("[persistDispatchJob] Failed:", error);
    return null;
  }
  
  console.log(`[persistDispatchJob] Created dispatch job: ${job.id}`);
  
  // Trigger workflow
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        trigger: "dispatch.created",
        entity_type: "dispatch_job",
        entity_id: job.id,
        customer: customerId ? { id: customerId, name: customerName, phone: callerPhoneE164 } : undefined,
        details: { job_type: jobType, pickup: pickupAddress, priority },
      }),
    });
  } catch (e) {
    console.error("[persistDispatchJob] Failed to trigger workflow:", e);
  }
  
  return job;
}

// Helper: Parse natural language dates
function parseNaturalDate(input: string): string {
  const lower = input.toLowerCase().trim();
  const today = new Date();
  
  if (lower === "today") {
    return today.toISOString().split("T")[0];
  }
  
  if (lower === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }
  
  // Handle "next [day]"
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const nextMatch = lower.match(/(?:next|this)\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (nextMatch) {
    const targetDay = dayNames.indexOf(nextMatch[1]);
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    return targetDate.toISOString().split("T")[0];
  }
  
  // Handle just day names
  const dayMatch = lower.match(/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (dayMatch) {
    const targetDay = dayNames.indexOf(dayMatch[1]);
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    return targetDate.toISOString().split("T")[0];
  }
  
  // Try to parse as actual date
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  
  // Default to today
  return today.toISOString().split("T")[0];
}

// Helper: Parse natural language times
function parseNaturalTime(input: string): string {
  const lower = input.toLowerCase().trim();
  
  // Handle "X AM/PM" format
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3];
    
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    
    // If no period specified, assume PM for evening hours
    if (!period && hour >= 1 && hour <= 6) hour += 12;
    
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }
  
  // Common time words
  if (lower.includes("noon")) return "12:00";
  if (lower.includes("evening")) return "18:00";
  if (lower.includes("morning")) return "09:00";
  if (lower.includes("afternoon")) return "14:00";
  
  return "12:00"; // Default
}

// ===== MENU ITEM PRICE MATCHING =====
// Matches parsed order items against menu_items table and calculates totals

interface PricedOrderItem {
  name: string;
  qty: number;
  price_cents: number | null;
  menu_item_id: string | null;
  matched: boolean;
  modifiers?: string[];
  item_notes?: string;
}

interface MenuMatchResult {
  items: PricedOrderItem[];
  totalCents: number;
  unmatchedCount: number;
}

// deno-lint-ignore no-explicit-any
async function matchAndPriceItems(
  supabase: any,
  tenantId: string,
  parsedItems: Array<{ name: string; qty: number; modifiers?: string[]; item_notes?: string }>
): Promise<MenuMatchResult> {
  if (parsedItems.length === 0) {
    return { items: [], totalCents: 0, unmatchedCount: 0 };
  }

  // Fetch all menu items for tenant
  const { data: menuItems, error } = await supabase
    .from("menu_items")
    .select("id, name, category, price_cents")
    .eq("tenant_id", tenantId)
    .eq("is_available", true);

  if (error || !menuItems) {
    console.error("Failed to fetch menu items:", error);
    // Return items without pricing
    return {
      items: parsedItems.map(item => ({
        ...item,
        price_cents: null,
        menu_item_id: null,
        matched: false,
      })),
      totalCents: 0,
      unmatchedCount: parsedItems.length,
    };
  }

  console.log(`Found ${menuItems.length} menu items for tenant ${tenantId}`);

  let totalCents = 0;
  let unmatchedCount = 0;

  const pricedItems: PricedOrderItem[] = parsedItems.map(item => {
    const match = findBestMenuMatch(item.name, menuItems);

    if (match && match.price_cents) {
      const lineTotal = match.price_cents * item.qty;
      totalCents += lineTotal;
      console.log(`Matched "${item.name}" -> "${match.name}" @ $${(match.price_cents / 100).toFixed(2)} x ${item.qty}`);
      return {
        ...item,
        price_cents: match.price_cents,
        menu_item_id: match.id,
        matched: true,
      };
    }

    unmatchedCount++;
    console.log(`No match found for "${item.name}"`);
    return {
      ...item,
      price_cents: null,
      menu_item_id: null,
      matched: false,
    };
  });

  return { items: pricedItems, totalCents, unmatchedCount };
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price_cents: number | null;
}

function findBestMenuMatch(
  spokenName: string,
  menuItems: MenuItem[]
): MenuItem | null {
  if (!menuItems.length) return null;

  // Normalize the spoken name
  const normalized = spokenName.toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/pizza$/i, "")
    .replace(/\s*wings?$/i, "")
    .trim();

  // Direct/substring match first (highest confidence)
  for (const item of menuItems) {
    const itemNorm = item.name.toLowerCase().replace(/\s+/g, " ");
    if (itemNorm === normalized || 
        itemNorm.includes(normalized) || 
        normalized.includes(itemNorm)) {
      return item;
    }
  }

  // Size-aware matching (e.g., "large margherita" → "Margherita Pizza")
  const sizeMatch = normalized.match(/^(large|medium|small|xl|extra[ -]?large|personal)\s+(.+)/i);
  if (sizeMatch) {
    const sizelessName = sizeMatch[2].trim();
    for (const item of menuItems) {
      const itemNorm = item.name.toLowerCase();
      if (itemNorm.includes(sizelessName)) {
        return item;
      }
    }
  }

  // Category-based matching for drinks
  const drinkKeywords = ["pepsi", "coke", "coca-cola", "sprite", "dr pepper", "fanta", "7-up", "root beer", 
                         "ginger ale", "water", "lemonade", "iced tea", "sweet tea", "coffee", "espresso"];
  for (const keyword of drinkKeywords) {
    if (normalized.includes(keyword)) {
      const drinkMatch = menuItems.find(m => 
        m.name.toLowerCase().includes(keyword) || 
        (m.category && m.category.toLowerCase() === "drinks")
      );
      if (drinkMatch) return drinkMatch;
    }
  }

  // Wings matching (handle "42 wings" -> "Wings" menu item)
  if (normalized.includes("wing") || spokenName.toLowerCase().includes("wing")) {
    const wingsMatch = menuItems.find(m => 
      m.name.toLowerCase().includes("wing") ||
      (m.category && m.category.toLowerCase() === "wings")
    );
    if (wingsMatch) return wingsMatch;
  }

  // Calzone/stromboli matching
  const italianSpecialties = ["calzone", "stromboli", "stuffed shell", "eggplant parm", "chicken parm", "veal parm"];
  for (const specialty of italianSpecialties) {
    if (normalized.includes(specialty)) {
      const match = menuItems.find(m => m.name.toLowerCase().includes(specialty));
      if (match) return match;
    }
  }

  // Pasta matching
  const pastaTypes = ["spaghetti", "fettuccine", "penne", "lasagna", "ravioli", "linguine", "rigatoni", "gnocchi", "tortellini", "manicotti"];
  for (const pasta of pastaTypes) {
    if (normalized.includes(pasta)) {
      const match = menuItems.find(m => m.name.toLowerCase().includes(pasta));
      if (match) return match;
    }
  }

  // Appetizer/side matching
  const sides = ["bruschetta", "garlic bread", "garlic knots", "breadsticks", "calamari", "mozzarella sticks", 
                 "onion rings", "fries", "french fries", "caesar salad", "garden salad", "house salad"];
  for (const side of sides) {
    if (normalized.includes(side)) {
      const match = menuItems.find(m => m.name.toLowerCase().includes(side));
      if (match) return match;
    }
  }

  return null;
}

// Parse natural language order items from transcript
// IMPORTANT: This function extracts food items, drinks, and totals from customer speech
// Test cases are in elevenlabs-webhook/extraction.test.ts
interface ParsedOrderResult {
  items: Array<{ name: string; qty: number; modifiers?: string[]; item_notes?: string }>;
  totalCents: number | null;
}

function parseNaturalLanguageItems(
  rawText: string,
  transcript?: ElevenLabsWebhookPayload["transcript"]
): ParsedOrderResult {
  const items: Array<{ name: string; qty: number; modifiers?: string[]; item_notes?: string }> = [];
  
  // Get customer messages from transcript if available
  const customerText = transcript
    ? transcript.filter(t => t.role === "user").map(t => t.message).join(" ")
    : rawText;
  
  // Get all messages (including AI) for total extraction
  const allText = transcript
    ? transcript.map(t => t.message).join(" ")
    : rawText;
  
  // Common food items to look for
  // PIZZA: make "pizza" suffix OPTIONAL to catch "large margarita" without "pizza"
  const pizzaTypes = "margherita|margarita|pepperoni|cheese|hawaiian|veggie|vegetarian|meat ?lovers?|supreme|quattro ?formaggi|buffalo|bbq|mushroom|sausage|white|plain|sicilian|neapolitan";
  const pizzaSizes = "(?:extra[ -]?large|x-?large|xl|large|medium|small|personal)?";
  
  const foodPatterns: Array<{ pattern: RegExp; formatFn: ((match: string, qty: string, size: string, type: string) => string) | null }> = [
    // Pizza patterns - "pizza" suffix is now OPTIONAL
    { 
      pattern: new RegExp(`(\\d*)\\s*${pizzaSizes}\\s*(${pizzaTypes})(?:\\s*pizza)?`, "gi"), 
      formatFn: (match: string) => {
        // Ensure "Pizza" is appended if not present
        const cleaned = match.replace(/^\d+\s*/, "").trim();
        const hasWord = cleaned.toLowerCase().includes("pizza");
        const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        return hasWord ? capitalized : capitalized + " Pizza";
      }
    },
    // Pasta patterns  
    { 
      pattern: /(\d*)\s*(spaghetti|fettuccine|penne|lasagna|ravioli|linguine|rigatoni|gnocchi|tortellini|manicotti)\s*(?:alla\s*)?(carbonara|alfredo|bolognese|marinara|arrabbiata|puttanesca|primavera)?/gi, 
      formatFn: null 
    },
    // Calzones, stromboli, and stuffed items
    {
      pattern: /(\d*)\s*(calzone|stromboli|stuffed shells?|eggplant (?:parm|parmesan|parmigiana)|chicken (?:parm|parmesan|parmigiana)|veal (?:parm|parmesan|parmigiana))s?/gi,
      formatFn: (match: string) => {
        const cleaned = match.replace(/^\d+\s*/, "").trim();
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    },
    // Subs, sandwiches, heroes
    {
      pattern: /(\d*)\s*((?:italian|meatball|chicken|philly|cheesesteak|turkey|ham|club|blt|veggie|vegetarian)\s*(?:sub|hoagie|hero|sandwich|grinder)?|(?:sub|hoagie|hero|sandwich|grinder))/gi,
      formatFn: (match: string) => {
        const cleaned = match.replace(/^\d+\s*/, "").trim();
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    },
    // Wings with count and flavor
    {
      pattern: /(\d+)\s*(?:piece\s+)?(?:chicken\s+)?wings?(?:\s+(buffalo|bbq|garlic parmesan|honey mustard|lemon pepper|plain|naked|hot|mild|medium))?/gi,
      formatFn: (match: string, qty: string) => {
        const cleaned = match.replace(/^\d+\s*/, "").trim();
        const formatted = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        // Ensure "Wings" is properly labeled
        return formatted.includes("wing") || formatted.includes("Wing") ? formatted : `${formatted} Wings`;
      }
    },
    // Appetizers/sides
    {
      pattern: /(\d*)\s*(bruschetta|garlic (?:bread|knots)|breadsticks?|calamari|fried calamari|mozzarella sticks?|onion rings?|fries|french fries|curly fries|caesar salad|garden salad|house salad|soup|tiramisu|cannoli|cheesecake|gelato|zeppole|rice balls?|arancini)/gi,
      formatFn: null
    },
    // Drinks - improved size detection for "two-liter" and "2-liter" variations
    { 
      pattern: /(?:(\d+)\s+)?(?:(two[ -]?liter|2[ -]?liter|liter|bottle|can|large|medium|small)\s+)?(pepsi|coke|coca[ -]?cola|sprite|dr\.?\s*pepper|fanta|7[ -]?up|root ?beer|ginger ?ale|water|lemonade|iced?\s*tea|sweet\s*tea|coffee|espresso)/gi, 
      formatFn: (match: string) => {
        const cleaned = match.replace(/^\d+\s*/, "").trim();
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    },
    // General items with quantities
    { pattern: /(\d+)\s*(piece|order|serving)s?\s+(?:of\s+)?(\w+)/gi, formatFn: null },
  ];
  
  const seenItems = new Set<string>(); // Prevent duplicates
  
  for (const { pattern, formatFn } of foodPatterns) {
    const matches = customerText.matchAll(pattern);
    for (const match of matches) {
      const qty = parseInt(match[1]) || 1;
      let itemName: string;
      
      if (formatFn) {
        itemName = formatFn(match[0], match[1], match[2], match[3]);
      } else {
        itemName = match[0].replace(/^\d+\s*/, "").trim();
        itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
      }
      
      // Skip very short matches or duplicates
      const normalizedName = itemName.toLowerCase().replace(/\s+/g, " ");
      if (itemName.length > 2 && !seenItems.has(normalizedName)) {
        seenItems.add(normalizedName);
        items.push({ name: itemName, qty });
      }
    }
  }
  
  // ===== EXTRACT SPECIAL INSTRUCTIONS AND MODIFIERS =====
  // Look for modifiers that can apply to all items or specific items
  const allModifiers: string[] = [];
  const allSpecialInstructions: string[] = [];
  
  // Modifier patterns: "extra cheese", "no onions", "add bacon"
  const modifierPatterns = [
    /(?:with|add|extra|no|light|heavy|double|triple)\s+(?:extra\s+)?(garlic|cheese|onions?|peppers?|bell peppers?|mushrooms?|olives?|bacon|anchovies|jalape[ñn]os?|pineapple|tomatoes?|pepperoni|sausage|ham|spinach|basil|oregano|parmesan|mozzarella|feta|ricotta|provolone)/gi,
    /(?:gluten[ -]?free|dairy[ -]?free|vegetarian|vegan)/gi,
  ];
  
  // Special instruction patterns: cooking preferences, preparation requests
  const specialInstructionPatterns = [
    /(?:cooked?\s+)?(well[ -]?done|medium[ -]?well|medium[ -]?rare|medium|rare|crispy|light|extra crispy)/gi,
    /(?:on the side|cut into squares?|cut into slices?|uncut|well done|extra[ -]?sauce|light sauce|no sauce)/gi,
    /(?:fresh|extra)\s+(garlic|basil|oregano|herbs?|parsley|red pepper(?:\s+flakes)?|crushed red pepper|hot pepper|chili flakes)/gi,
    /(?:make it|cooked?)\s+(hot|spicy|mild|extra spicy|very hot)/gi,
  ];
  
  for (const pattern of modifierPatterns) {
    const matches = customerText.matchAll(pattern);
    for (const match of matches) {
      const mod = match[0].trim();
      if (mod && !allModifiers.includes(mod.toLowerCase())) {
        allModifiers.push(mod);
      }
    }
  }
  
  for (const pattern of specialInstructionPatterns) {
    const matches = customerText.matchAll(pattern);
    for (const match of matches) {
      const instruction = match[0].trim();
      if (instruction && !allSpecialInstructions.includes(instruction.toLowerCase())) {
        allSpecialInstructions.push(instruction);
      }
    }
  }
  
  // Apply modifiers and special instructions to items
  // If only one item, apply all modifiers and instructions to it
  // Otherwise, store as order-level special instructions
  if (items.length > 0) {
    if (items.length === 1) {
      // Single item - attach all modifiers and instructions directly
      if (allModifiers.length > 0) {
        items[0].modifiers = allModifiers;
      }
      if (allSpecialInstructions.length > 0) {
        items[0].item_notes = allSpecialInstructions.join(", ");
      }
    } else {
      // Multiple items - attach modifiers to first item (most likely target)
      // and store special instructions for order-level
      if (allModifiers.length > 0) {
        items[0].modifiers = allModifiers;
      }
      // For multiple items, add item_notes to all items that might match
      if (allSpecialInstructions.length > 0) {
        items[0].item_notes = allSpecialInstructions.join(", ");
      }
    }
  }
  
  // If no structured items found, just return the raw text as a single item
  if (items.length === 0 && rawText && !rawText.includes("to place an order")) {
    items.push({
      name: rawText.substring(0, 100),
      qty: 1,
    });
  }
  
  // EXTRACT ORDER TOTAL from AI confirmation (e.g., "Your total is $42.50")
  // Look for dollar amounts mentioned as totals in the FULL conversation
  const totalPatterns = [
    /(?:total|total is|comes to|that(?:'ll| will) be|that's|your order is)\s*\$?(\d+(?:\.\d{2})?)/i,
    /\$(\d+(?:\.\d{2})?)\s*(?:total|altogether|in total)/i,
  ];
  
  let totalCents: number | null = null;
  for (const pattern of totalPatterns) {
    const totalMatch = allText.match(pattern);
    if (totalMatch) {
      const amount = parseFloat(totalMatch[1]);
      if (amount > 0 && amount < 10000) { // Sanity check: $0 < total < $10,000
        totalCents = Math.round(amount * 100);
        break;
      }
    }
  }
  
  return { items, totalCents };
}

// Build a summary from transcript when ElevenLabs doesn't provide one
function buildSummaryFromTranscript(
  transcript: NonNullable<ElevenLabsWebhookPayload["transcript"]>,
  businessMode: string
): string | null {
  if (!transcript.length) return null;
  
  const customerMessages = transcript
    .filter(t => t.role === "user")
    .map(t => t.message)
    .join(" ");
  
  const aiMessages = transcript
    .filter(t => t.role === "agent")
    .map(t => t.message)
    .join(" ");
  
  // Build a summary based on business mode
  const parts: string[] = [];
  
  // Extract customer name
  const nameMatch = customerMessages.match(/(?:my name is|this is|i'm|call me|name is)\s+([a-z]+)/i);
  if (nameMatch) {
    parts.push(`Customer: ${nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1)}`);
  }
  
  switch (businessMode) {
    case "food":
      // Check for order type and items
      if (customerMessages.match(/pickup|pick up/i)) {
        parts.push("Order type: Pickup");
      } else if (customerMessages.match(/delivery|deliver/i)) {
        parts.push("Order type: Delivery");
      }
      
      // Check for specific items mentioned
      const foodKeywords = ["pizza", "pasta", "burger", "sandwich", "salad", "soup", "wings", "fries", "drink", "pepsi", "coke", "soda"];
      const mentionedItems = foodKeywords.filter(item => customerMessages.toLowerCase().includes(item));
      if (mentionedItems.length > 0) {
        parts.push(`Items: ${mentionedItems.join(", ")}`);
      }
      
      // Check if order was confirmed
      if (aiMessages.match(/order.*(?:ready|placed|confirmed|got it)/i)) {
        parts.push("Status: Order confirmed");
      }
      break;
      
    case "service":
      // Extract service type
      const serviceMatch = customerMessages.match(/(?:need|want|book|schedule).*?(?:detail|wash|clean|repair|service|appointment)/i);
      if (serviceMatch) {
        parts.push(`Service: ${serviceMatch[0]}`);
      }
      break;
      
    case "dispatch":
      // Extract job type
      if (customerMessages.match(/tow|broke down/i)) {
        parts.push("Job: Towing");
      } else if (customerMessages.match(/jump|battery/i)) {
        parts.push("Job: Jump start");
      } else if (customerMessages.match(/flat|tire/i)) {
        parts.push("Job: Tire change");
      } else if (customerMessages.match(/lock|keys/i)) {
        parts.push("Job: Lockout");
      }
      break;
      
    default:
      // General summary
      const reasonMatch = customerMessages.match(/(?:calling about|need|want|looking for)\s+(.{10,50}?)(?:\.|,|$)/i);
      if (reasonMatch) {
        parts.push(`Reason: ${reasonMatch[1].trim()}`);
      }
  }
  
  return parts.length > 0 ? parts.join(". ") + "." : null;
}

function extractFromTranscript(
  transcript: ElevenLabsWebhookPayload["transcript"],
  type: "name" | "service"
): string | null {
  if (!transcript?.length) return null;

  const customerMessages = transcript
    .filter(t => t.role === "user")
    .map(t => t.message)
    .join(" ");

  if (type === "name") {
    const namePatterns = [
      /my name is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /this is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /i'm ([A-Z][a-z]+)/i,
      /i am ([A-Z][a-z]+)/i,
      /call me ([A-Z][a-z]+)/i,
    ];
    
    for (const pattern of namePatterns) {
      const match = customerMessages.match(pattern);
      if (match) return match[1];
    }
  }

  if (type === "service") {
    const servicePatterns = [
      /need (?:a )?(.+?(?:tow|jump|tire|lockout|delivery|repair|service|detail|wash|clean|cut))/i,
      /looking for (?:a )?(.+?(?:tow|jump|tire|lockout|delivery|repair|service|detail|wash|clean|cut))/i,
      /want (?:a )?(.+?(?:tow|jump|tire|lockout|delivery|repair|service|detail|wash|clean|cut))/i,
      /schedule (?:a )?(.+?(?:appointment|service|consultation|visit))/i,
      /book (?:a )?(.+?(?:appointment|service|consultation|visit))/i,
      /flat tire/i,
      /battery (?:dead|jump|died)/i,
      /locked out/i,
      /tow(?:ing)?/i,
    ];
    
    for (const pattern of servicePatterns) {
      const match = customerMessages.match(pattern);
      if (match) {
        return typeof match[1] === "string" ? match[1] : match[0];
      }
    }
  }

  return null;
}
