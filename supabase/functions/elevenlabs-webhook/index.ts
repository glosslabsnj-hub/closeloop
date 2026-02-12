import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import { computePriceQuote, computeEtaQuote, type QuoteResult } from "../_shared/computeQuote.ts";
import { computeBookingPrice, computeFoodOrderTotals, computeDispatchPrice } from "../_shared/computeEntityPricing.ts";
import { captureException } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-elevenlabs-signature, x-eleven-labs-signature",
};

// ===== CANONICAL PAYLOAD TYPES =====
interface CanonicalCustomer {
  name: string | null;
  phone_e164: string | null;
  email: string | null;
}

interface CanonicalOrderItem {
  name: string;
  quantity: number;
  size: string | null;
  modifiers: string[];
  special_instructions: string | null;
  price_cents: number | null;
  menu_item_id: string | null;
  matched: boolean;
}

interface CanonicalOrder {
  type: "pickup" | "delivery" | null;
  items: CanonicalOrderItem[];
  special_instructions: string | null;
  delivery_address: string | null;
  requested_time: string | null;
  total_cents: number | null;
}

interface CanonicalReservation {
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM
  party_size: number | null;
  notes: string | null;
  original_date_phrase: string | null;
  original_time_phrase: string | null;
}

interface CanonicalBooking {
  service_requested: string | null;
  service_id: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  address: string | null;
  notes: string | null;
  confirmed: boolean | null;
}

interface CanonicalDispatch {
  pickup_address: string | null;
  dropoff_address: string | null;
  vehicle_type: string | null;
  drivable: boolean | null;
  urgency: "normal" | "high" | "urgent";
  job_type: string | null;
  notes: string | null;
}

interface CanonicalCallback {
  requested: boolean | null;
  best_time: string | null;
  message: string | null;
}

interface CanonicalMeta {
  extraction_source: "elevenlabs" | "server_side" | "hybrid";
  normalized_at: string;
  tenant_timezone: string;
  raw_data_collection_keys: string[];
}

interface CanonicalSales {
  interest_type: string;
  vehicle_interest: string;
  budget_range: string;
  timeline: string;
  has_trade_in: boolean;
  trade_in_details: string;
  financing_interest: boolean;
  wants_test_drive: boolean;
  preferred_date: string;
  preferred_time: string;
}

interface CanonicalPayload {
  intent: "order" | "reservation" | "booking" | "dispatch" | "callback" | "faq" | "other" | "test_drive" | "sales_lead";
  customer: CanonicalCustomer;
  order: CanonicalOrder;
  reservation: CanonicalReservation;
  booking: CanonicalBooking;
  dispatch: CanonicalDispatch;
  callback: CanonicalCallback;
  sales: CanonicalSales;
  quote?: {
    price?: QuoteResult;
    eta?: QuoteResult;
  };
  _meta: CanonicalMeta;
}

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
function extractDataCollectionValue(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val || null;
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("value" in obj) {
      return extractDataCollectionValue(obj.value);
    }
    if ("data_collection_id" in obj && "value" in obj) {
      return extractDataCollectionValue(obj.value);
    }
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

function parseConversationId(payload: Record<string, unknown>): string {
  if (typeof payload.conversation_id === "string" && payload.conversation_id) {
    return payload.conversation_id;
  }
  if (payload.data && typeof payload.data === "object") {
    const data = payload.data as Record<string, unknown>;
    if (typeof data.conversation_id === "string" && data.conversation_id) {
      return data.conversation_id;
    }
  }
  if (payload.conversation && typeof payload.conversation === "object") {
    const conv = payload.conversation as Record<string, unknown>;
    if (typeof conv.id === "string" && conv.id) {
      return conv.id;
    }
    if (typeof conv.conversation_id === "string" && conv.conversation_id) {
      return conv.conversation_id;
    }
  }
  if (typeof payload.id === "string" && payload.id) {
    return payload.id;
  }
  return "unknown";
}

function parseEventType(payload: Record<string, unknown>): string {
  if (typeof payload.type === "string") return payload.type;
  if (typeof payload.event === "string") return payload.event;
  if (typeof payload.event_type === "string") return payload.event_type;
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

  if (!webhookSecret) {
    console.error("[elevenlabs-webhook] ELEVENLABS_CONVAI_WEBHOOK_SECRET not configured");
    return new Response(
      JSON.stringify({ error: "Webhook secret not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const signatureHeader = 
    req.headers.get("ElevenLabs-Signature") ?? 
    req.headers.get("elevenlabs-signature") ??
    req.headers.get("x-elevenlabs-signature") ??
    req.headers.get("x-eleven-labs-signature");

  if (!signatureHeader) {
    console.warn("[elevenlabs-webhook] Missing signature header");
    await logEventStage(supabase, "unknown", null, null, "unknown", "webhook_signature_missing", { raw_body_length: rawBody.length }, "No signature header present");
    return new Response(
      JSON.stringify({ error: "Missing signature header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const verifyResult = await verifyElevenLabsSignature(rawBody, signatureHeader, webhookSecret);

  if (!verifyResult.valid) {
    console.warn("[elevenlabs-webhook] Signature verification failed:", verifyResult);
    await logEventStage(supabase, "unknown", null, null, "unknown", "webhook_signature_invalid", { 
      reason: verifyResult.reason,
      timestamp: verifyResult.timestamp,
      received_hash_prefix: verifyResult.receivedHash,
      expected_hash_prefix: verifyResult.expectedHash,
      raw_body_length: rawBody.length
    }, `HMAC verification failed: ${verifyResult.reason}`);
    return new Response(
      JSON.stringify({ error: "Invalid signature", reason: verifyResult.reason }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[elevenlabs-webhook] HMAC signature verified successfully, timestamp:", verifyResult.timestamp);

  let parsedPayload: Record<string, unknown> = {};
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch (parseError) {
    console.error("Failed to parse webhook body:", parseError);
    await logEventStage(supabase, "unknown", null, null, "unknown", "webhook_parse_error", { raw_body_length: rawBody.length, raw_body_preview: rawBody.substring(0, 200) }, parseError instanceof Error ? parseError.message : "JSON parse failed");
    return new Response(
      JSON.stringify({ status: "error", reason: "parse_failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const conversationId = parseConversationId(parsedPayload);
    const eventType = parseEventType(parsedPayload);
    
    const nestedData = (parsedPayload.data && typeof parsedPayload.data === "object") 
      ? parsedPayload.data as Record<string, unknown> 
      : null;
    
    const clientData = 
      (nestedData?.conversation_initiation_client_data as Record<string, unknown>) ??
      (parsedPayload.conversation_initiation_client_data as Record<string, unknown>) ??
      null;
    
    const payload: ElevenLabsWebhookPayload = {
      type: eventType,
      conversation_id: conversationId,
      agent_id: (nestedData?.agent_id ?? parsedPayload.agent_id) as string || "",
      transcript: Array.isArray(nestedData?.transcript) 
        ? nestedData.transcript as ElevenLabsWebhookPayload["transcript"]
        : Array.isArray(parsedPayload.transcript) 
          ? parsedPayload.transcript as ElevenLabsWebhookPayload["transcript"] 
          : undefined,
      analysis: (nestedData?.analysis ?? parsedPayload.analysis) as ElevenLabsWebhookPayload["analysis"],
      metadata: (nestedData?.metadata ?? parsedPayload.metadata) as ElevenLabsWebhookPayload["metadata"],
      dynamic_variables: (clientData?.dynamic_variables ?? parsedPayload.dynamic_variables) as ElevenLabsWebhookPayload["dynamic_variables"],
    };
    
    const tenantIdFromPayload = payload.dynamic_variables?.tenant_id || "unknown";
    
    console.log("ElevenLabs webhook received:", JSON.stringify({
      type: eventType,
      conversation_id: conversationId,
      has_transcript: !!payload.transcript?.length,
      has_analysis: !!payload.analysis,
      dynamic_variables: payload.dynamic_variables,
      used_nested_data: !!nestedData,
    }));

    await logEventStage(supabase, tenantIdFromPayload, null, null, conversationId, "webhook_received", {
      event_type: eventType,
      conversation_id: conversationId,
      payload_size: rawBody.length,
      has_transcript: !!payload.transcript?.length,
      has_analysis: !!payload.analysis,
      transcript_length: payload.transcript?.length || 0,
      analysis_keys: payload.analysis ? Object.keys(payload.analysis) : [],
      data_collection_keys: payload.analysis?.data_collection ? Object.keys(payload.analysis.data_collection) : [],
      used_nested_data: !!nestedData,
    });

    const isConversationEnded = 
      eventType === "post_call_transcription" ||
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

    // ===== IDEMPOTENCY CHECK =====
    // Check if we've already processed this conversation_id to prevent duplicate processing
    const { data: existingSession } = await supabase
      .from("ai_call_sessions")
      .select("id, transcript, ended_at")
      .eq("elevenlabs_conversation_id", payload.conversation_id)
      .single();

    // P0-4: Check ended_at alone. Previously required BOTH transcript AND ended_at,
    // which allowed duplicate processing when first webhook had null transcript.
    if (existingSession?.ended_at) {
      console.log(`Duplicate webhook detected for conversation ${conversationId} - already processed`);
      await logEventStage(supabase, "unknown", existingSession.id, null, conversationId, "webhook_duplicate_skipped", {
        existing_session_id: existingSession.id,
        already_processed_at: existingSession.ended_at,
      });
      return new Response(
        JSON.stringify({
          status: "skipped",
          reason: "duplicate",
          session_id: existingSession.id,
          message: "This conversation has already been processed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ===== END IDEMPOTENCY CHECK =====

    const { data: session, error: sessionError } = await supabase
      .from("ai_call_sessions")
      .select("id, tenant_id, context_json, customer_id, caller_phone, twilio_call_sid")
      .eq("elevenlabs_conversation_id", payload.conversation_id)
      .single();

    if (sessionError || !session) {
      console.error("Session not found for conversation:", payload.conversation_id);
      
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
      
      await logEventStage(supabase, tenantIdFromPayload, null, null, payload.conversation_id, "webhook_session_not_found", {
        conversation_id: payload.conversation_id,
        caller_phone: payload.dynamic_variables?.caller_phone || null,
        tenant_id_from_payload: tenantIdFromPayload,
      }, "No matching ai_call_sessions record found");
      
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

    // Capture to Sentry for monitoring
    await captureException(error, {
      tags: { function: "elevenlabs-webhook" },
    });

    try {
      await logEventStage(supabase, "unknown", null, null, "unknown", "webhook_error", {}, error instanceof Error ? error.message : "Unknown error");
    } catch { /* Ignore */ }
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
  const tenantTimezone = existingContext.timezone as string || "America/New_York";

  await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "call_end", {
    duration_secs: payload.metadata?.call_duration_secs,
    has_transcript: !!payload.transcript?.length,
    has_analysis: !!payload.analysis,
  });

  const [intelligenceResult, retentionResult, tenantResult] = await Promise.all([
    supabase.from("tenant_intelligence_settings").select("memory_enabled, min_confidence_threshold").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("data_retention_settings").select("store_transcripts, store_caller_phone, allow_customer_memory, phi_minimization_enabled").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("tenants").select("business_mode, enabled_modules, timezone").eq("id", tenantId).single(),
  ]);
  
  const intelligenceSettings = intelligenceResult.data;
  const retentionSettings = retentionResult.data;
  const tenant = tenantResult.data;
  const tenantBusinessMode = tenant?.business_mode || businessMode;
  const effectiveTimezone = tenant?.timezone || tenantTimezone;
  
  const memoryEnabled = intelligenceSettings?.memory_enabled === true;
  const minConfidence = intelligenceSettings?.min_confidence_threshold || 0.65;
  const storeTranscripts = retentionSettings?.store_transcripts !== false && !hipaaMode;
  const storeCallerPhone = retentionSettings?.store_caller_phone !== false && !hipaaMode;
  const allowCustomerMemory = retentionSettings?.allow_customer_memory !== false && !hipaaMode;
  const phiMinimization = retentionSettings?.phi_minimization_enabled === true || hipaaMode;

  const transcriptText = storeTranscripts 
    ? (payload.transcript?.map(t => `${t.role === "user" ? "Customer" : "AI"}: ${t.message}`).join("\n") || null)
    : null;

  const analysis = payload.analysis || {};
  const dataCollection = (analysis.data_collection as Record<string, string>) || (analysis as Record<string, unknown>).data_collection_results as Record<string, string> || {};
  
  // ===== BUILD SUMMARY =====
  const summaryText = 
    analysis.summary ||
    (analysis as Record<string, unknown>).transcript_summary ||
    (analysis as Record<string, unknown>).call_summary ||
    dataCollection.call_summary ||
    dataCollection.summary ||
    (payload.transcript?.length ? buildSummaryFromTranscript(payload.transcript, tenantBusinessMode) : null);

  // ===== BUILD CANONICAL PAYLOAD =====
  const rawExtracted = extractRawDataFromSources(dataCollection, payload.transcript, tenantBusinessMode);
  const canonicalPayload = buildCanonicalPayload(tenantBusinessMode, dataCollection, payload.transcript, rawExtracted, effectiveTimezone);
  
  await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "extraction_canonicalized", {
    intent: canonicalPayload.intent,
    has_customer: !!canonicalPayload.customer.name,
    has_order_items: canonicalPayload.order.items.length > 0,
    has_reservation: !!canonicalPayload.reservation.party_size,
    has_booking: !!canonicalPayload.booking.service_requested,
    has_dispatch: !!canonicalPayload.dispatch.pickup_address,
    extraction_source: canonicalPayload._meta.extraction_source,
  });

  // ===== NORMALIZE VALUES =====
  const normalizedPayload = normalizePayloadValues(canonicalPayload, effectiveTimezone);

  // ===== VALIDATE PAYLOAD (ensure no nulls for required fields) =====
  const validatedPayload = validateCanonicalPayload(normalizedPayload);

  await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "normalization_applied", {
    reservation_date: validatedPayload.reservation.date,
    reservation_time: validatedPayload.reservation.time,
    party_size: validatedPayload.reservation.party_size,
    original_date_phrase: validatedPayload.reservation.original_date_phrase,
    original_time_phrase: validatedPayload.reservation.original_time_phrase,
    tenant_timezone: effectiveTimezone,
  });

  // ===== COMPUTE QUOTES (if customer asked about price/time) =====
  const hasPricingQuestion = detectPricingQuestion(transcriptText || "");
  const hasEtaQuestion = detectEtaQuestion(transcriptText || "");

  if (hasPricingQuestion || hasEtaQuestion) {
    const contextData = existingContext as any;
    const pricingRules = contextData?.pricing?.rules || [];
    const busynessRules = contextData?.eta?.busyness_rules || {};

    // Build inputs from normalized payload
    const inputs: Record<string, any> = {
      service_requested: validatedPayload.booking.service_requested,
      party_size: validatedPayload.reservation.party_size,
      order_type: validatedPayload.order.type,
      distance_miles: null, // Could extract from dispatch later
    };

    // Compute price quote if pricing question detected
    let priceQuote: QuoteResult | undefined;
    if (hasPricingQuestion && pricingRules.length > 0) {
      try {
        priceQuote = computePriceQuote({
          rules: pricingRules,
          businessMode: tenantBusinessMode,
          offering: {
            name: validatedPayload.booking.service_requested || "",
            type: validatedPayload.order.type || "service",
          },
          inputs,
        });
      } catch (e) {
        console.error("Price quote computation failed:", e);
      }
    }

    // Compute ETA quote if timing question detected
    let etaQuote: QuoteResult | undefined;
    if (hasEtaQuestion && Object.keys(busynessRules).length > 0) {
      try {
        etaQuote = computeEtaQuote({
          busynessRules,
          mode: tenantBusinessMode,
          queueMetrics: {
            busynessLevel: "medium",
            queueLength: 0,
          },
          inputs,
        });
      } catch (e) {
        console.error("ETA quote computation failed:", e);
      }
    }

    // Add quote results to normalized payload
    if (priceQuote || etaQuote) {
      validatedPayload.quote = {
        price: priceQuote,
        eta: etaQuote,
      };

      // Redact sensitive info if HIPAA mode
      const logDetails: Record<string, any> = {
        has_price_quote: !!priceQuote,
        has_eta_quote: !!etaQuote,
      };

      if (!hipaaMode) {
        if (priceQuote) {
          logDetails.price_type = priceQuote.type;
          logDetails.price_confidence = priceQuote.confidence;
          logDetails.price_missing_inputs = priceQuote.missingInputs.length;
        }
        if (etaQuote) {
          logDetails.eta_type = etaQuote.type;
          logDetails.eta_confidence = etaQuote.confidence;
          logDetails.eta_missing_inputs = etaQuote.missingInputs.length;
        }
      }

      await logEventStage(
        supabase,
        tenantId,
        sessionId,
        session.twilio_call_sid,
        payload.conversation_id,
        "quote_computed",
        logDetails
      );
    }
  }

  // ===== DETERMINE OUTCOME =====
  const outcome = determineOutcomeFromIntent(validatedPayload.intent, tenantBusinessMode);

  // ===== CUSTOMER RESOLUTION =====
  let customerId = session.customer_id;
  
  if (!customerId && callerPhoneE164 && !phiMinimization && storeCallerPhone) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("phone_e164", callerPhoneE164)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      if (validatedPayload.customer.name && (!existingCustomer.full_name || existingCustomer.full_name === "Unknown" || validatedPayload.customer.name.length > existingCustomer.full_name.length)) {
        await supabase.from("customers").update({ full_name: validatedPayload.customer.name, updated_at: new Date().toISOString() }).eq("id", customerId);
      } else {
        await supabase.from("customers").update({ updated_at: new Date().toISOString() }).eq("id", customerId);
      }
    } else if (callerPhoneE164) {
      const { data: newCustomer, error: createError } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenantId,
          full_name: validatedPayload.customer.name || "Unknown",
          phone_e164: callerPhoneE164,
          phone_raw: callerPhone,
          source: "ai_call",
        })
        .select("id")
        .single();

      if (!createError && newCustomer) {
        customerId = newCustomer.id;
      }
    }
  }

  // Update context
  const updatedContext = {
    ...existingContext,
    customer_name: validatedPayload.customer.name || existingContext.customer_name,
    service_requested: validatedPayload.booking.service_requested || existingContext.service_requested,
    booking_confirmed: outcome === "booked",
    call_duration_secs: payload.metadata?.call_duration_secs,
    customer_id: customerId,
    ...dataCollection,
  };

  // ===== COMPUTE LEAD SCORE =====
  const leadScore = computeLeadScore(validatedPayload, transcriptText || "", outcome);

  // ===== UPDATE CALL SESSION =====
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
      extracted_payload: validatedPayload as unknown as Record<string, unknown>,
      lead_score: leadScore,
      followup_status: outcome === "booked" || outcome === "order" ? "completed" : "new",
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("Failed to update session:", updateError);
    await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "summary_save_error", {}, updateError.message);
    throw updateError;
  }

  await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "summary_saved", {
    outcome,
    has_transcript: !!transcriptText,
    has_summary: !!summaryText,
    customer_id: customerId,
    customer_name: validatedPayload.customer.name,
    intent: validatedPayload.intent,
  });

  if (customerId) {
    await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "customer_resolved", {
      customer_id: customerId,
      customer_name: validatedPayload.customer.name,
      phone_e164: callerPhoneE164,
      was_existing: session.customer_id === customerId,
    });
  }

  console.log("Updated session:", sessionId, { outcome, hasTranscript: !!transcriptText, hasSummary: !!summaryText, customerId, intent: validatedPayload.intent });

  // ===== TRACK VOICE USAGE =====
  const callDurationSecs = payload.metadata?.call_duration_secs || 0;
  if (callDurationSecs > 0) {
    // Round UP to nearest minute for billing
    const voiceMinutes = Math.ceil(callDurationSecs / 60);
    try {
      const usageRes = await fetch(`${supabaseUrl}/functions/v1/track-usage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          event_type: "voice_minute",
          quantity: voiceMinutes,
        }),
      });
      if (usageRes.ok) {
        console.log(`[usage] Tracked ${voiceMinutes} minutes for tenant ${tenantId.substring(0, 8)}...`);
      } else {
        const errText = await usageRes.text();
        console.error(`[usage] Failed to track usage: ${errText}`);
      }
    } catch (e) {
      console.error("[usage] Error tracking voice usage:", e);
    }
  }

  // ===== RELEASE SESSION LOCKS =====
  // If the call didn't result in a booking, release any slot locks held for this session
  if (outcome !== "booked") {
    try {
      const releaseRes = await fetch(`${supabaseUrl}/functions/v1/manage-session-locks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          action: "release",
          session_id: sessionId,
        }),
      });
      if (releaseRes.ok) {
        const releaseData = await releaseRes.json();
        if (releaseData.released_count > 0) {
          console.log(`[slots] Released ${releaseData.released_count} slot locks for session ${sessionId.substring(0, 8)}...`);
        }
      }
    } catch (e) {
      // Non-critical - locks will expire anyway
      console.warn("[slots] Failed to release session locks:", e);
    }
  }

  // ===== TRIGGER EVENTS =====
  try {
    await fetch(`${supabaseUrl}/functions/v1/record-audit-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
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
          customer_name: validatedPayload.customer.name,
          intent: validatedPayload.intent,
          customer_id: customerId,
        },
      }),
    });
  } catch (e) {
    console.error("Failed to record call.ended audit event:", e);
  }

  for (const eventName of ["call.ended", "call.completed"]) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          tenant_id: tenantId,
          trigger: eventName,
          entity_type: "call",
          entity_id: sessionId,
          session_id: sessionId, // Link workflow to originating call session
          location_id: locationId,
          customer: customerId ? { id: customerId, name: validatedPayload.customer.name, phone: callerPhoneE164 } : undefined,
          summary: summaryText,
          details: { outcome, duration_secs: payload.metadata?.call_duration_secs, intent: validatedPayload.intent, extracted_payload: validatedPayload },
        }),
      });
    } catch (e) {
      console.error(`Failed to trigger ${eventName} workflow:`, e);
    }
  }

  if ((outcome === "lead_captured" || outcome === "booked" || outcome === "followup") && customerId) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          tenant_id: tenantId,
          trigger: "lead.captured",
          entity_type: "lead",
          entity_id: customerId,
          session_id: sessionId, // Link workflow to originating call session
          location_id: locationId,
          customer: { id: customerId, name: validatedPayload.customer.name, phone: callerPhoneE164 },
          details: { source: "ai_call", outcome, service_requested: validatedPayload.booking.service_requested },
        }),
      });
    } catch (e) {
      console.error("Failed to trigger lead.captured workflow:", e);
    }
  }

  // ===== OBSERVATIONS =====
  if (memoryEnabled && outcome !== "lost") {
    const observations = [];
    if (validatedPayload.booking.service_requested) {
      const serviceKey = `service_${validatedPayload.booking.service_requested.toLowerCase().replace(/[^a-z0-9]+/g, "_").substring(0, 30)}`;
      observations.push({ type: "service_pattern", subjectKey: serviceKey, observation: `Customer inquired about ${validatedPayload.booking.service_requested}`, confidence: outcome === "booked" ? 0.8 : 0.6 });
    }
    const callHour = new Date().getHours();
    const callDay = new Date().getDay();
    if (outcome === "booked" || outcome === "lead_captured" || outcome === "order") {
      observations.push({ type: "time_pattern", subjectKey: `day_${callDay}_hour_${callHour}`, observation: `Successful engagement at ${callHour}:00 on day ${callDay}`, confidence: 0.7 });
    }
    if (allowCustomerMemory && callerPhoneE164 && validatedPayload.customer.name && (outcome === "booked" || outcome === "order")) {
      const customerKey = `customer_${callerPhoneE164.replace(/\D/g, "").slice(-10)}`;
      observations.push({ type: "customer_preference", subjectKey: customerKey, observation: `${validatedPayload.customer.name} booked ${validatedPayload.booking.service_requested || "service"} successfully`, confidence: 0.85 });
    }
    const duration = payload.metadata?.call_duration_secs || 0;
    if (duration > 600) {
      observations.push({ type: "exception_pattern", subjectKey: "long_calls", observation: `Call exceeded 10 minutes (${Math.round(duration / 60)} min) - may indicate complex inquiry`, confidence: 0.65 });
    }
    for (const obs of observations) {
      if (obs.confidence >= minConfidence) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/record-observation`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
            body: JSON.stringify({ tenantId, locationId, observationType: obs.type, subjectKey: obs.subjectKey, observation: obs.observation }),
          });
        } catch (e) {
          console.error(`Failed to record ${obs.type} observation:`, e);
        }
      }
    }
  }

  await logEventStage(supabase, tenantId, sessionId, session.twilio_call_sid, payload.conversation_id, "extraction_saved", {
    business_mode: tenantBusinessMode,
    intent: validatedPayload.intent,
  });

  // Get enabled_modules from tenant for routing decisions
  const enabledModules: string[] = Array.isArray(tenant?.enabled_modules)
    ? tenant.enabled_modules
    : [];

  if (enabledModules.length === 0) {
    console.warn(`[elevenlabs-webhook] enabled_modules is empty for tenant ${tenantId} - all intents will route to "none"`);
  }

  // ===== RECORD CALL OUTCOME (Intelligence Layer) =====
  try {
    await fetch(`${supabaseUrl}/functions/v1/process-call-outcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({
        tenant_id: tenantId,
        session_id: sessionId,
        outcome,
        intent: validatedPayload.intent,
        service_requested: validatedPayload.booking.service_requested || validatedPayload.dispatch.vehicle_type || null,
        duration_seconds: payload.metadata?.call_duration_secs || null,
        customer_id: customerId,
        business_mode: tenantBusinessMode,
      }),
    });
  } catch (e) {
    // Non-critical — don't fail the webhook for intelligence tracking
    console.warn("[elevenlabs-webhook] Failed to record call outcome:", e);
  }

  // ===== ENSURE LEAD RECORD =====
  let leadId: string | null = null;
  if (callerPhoneE164 && !phiMinimization) {
    try {
      leadId = await ensureLead(
        supabase, tenantId, sessionId, validatedPayload,
        validatedPayload.customer.name, customerId, callerPhoneE164,
        outcome, leadScore
      );
      if (leadId) {
        await supabase
          .from("ai_call_sessions")
          .update({ lead_id: leadId })
          .eq("id", sessionId);
      }
    } catch (e) {
      console.warn("[ensureLead] Non-critical failure:", e);
    }
  }

  // ===== PERSIST DERIVED ENTITY =====
  await persistDerivedEntity(supabase, supabaseUrl, supabaseKey, tenantId, sessionId, tenantBusinessMode, enabledModules, validatedPayload, validatedPayload.customer.name, customerId, callerPhoneE164, payload, leadId);
}

// ===== COMPUTE LEAD SCORE =====
function computeLeadScore(
  payload: CanonicalPayload,
  transcriptText: string,
  outcome: string
): "hot" | "warm" | "cool" {
  // Hot: urgency keywords, high-value services, or booked
  if (outcome === "booked" || outcome === "order" || outcome === "dispatch") return "hot";

  const lowerTranscript = transcriptText.toLowerCase();
  const urgencyKeywords = ["asap", "emergency", "urgent", "broken down", "stranded", "right away", "immediately", "today"];
  const highValueKeywords = ["engine", "transmission", "rebuild", "replace", "overhaul", "turbo", "full service"];

  const hasUrgency = urgencyKeywords.some(k => lowerTranscript.includes(k));
  const hasHighValue = highValueKeywords.some(k => lowerTranscript.includes(k));
  const dispatchUrgent = payload.dispatch.urgency === "urgent" || payload.dispatch.urgency === "high";

  if (hasUrgency || hasHighValue || dispatchUrgent) return "hot";

  // Cool: no name, no service, or abandoned/lost
  if (outcome === "lost" || outcome === "abandoned") return "cool";

  const hasName = !!payload.customer.name && payload.customer.name !== "Unknown";
  const hasPhone = !!payload.customer.phone_e164;
  const hasService = !!payload.booking.service_requested || !!payload.dispatch.job_type;

  if (!hasName && !hasService) return "cool";
  if (hasName && hasPhone && hasService) return "warm";

  return "warm";
}

// ===== ENSURE LEAD RECORD =====
// Creates or updates a lead for every call, not just bookings.
// Uses upsert-by-lookup on (tenant_id, phone) to avoid duplicates.
// deno-lint-ignore no-explicit-any
async function ensureLead(
  supabase: any,
  tenantId: string,
  sessionId: string,
  payload: CanonicalPayload,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string,
  outcome: string,
  leadScore: "hot" | "warm" | "cool"
): Promise<string | null> {
  // Map outcome → lead status
  // Status ranking: new < contacted < qualified < booked < won
  const STATUS_RANK: Record<string, number> = {
    new: 0,
    contacted: 1,
    qualified: 2,
    booked: 3,
    won: 4,
  };

  let targetStatus: string;
  switch (outcome) {
    case "booked":
    case "order":
    case "reservation":
      targetStatus = "booked";
      break;
    case "followup":
    case "lead_captured":
    case "dispatch":
    case "escalated":
    case "message":
      targetStatus = "new";
      break;
    case "lost":
      targetStatus = "contacted";
      break;
    default:
      targetStatus = "new";
      break;
  }

  // Build vehicle_or_context from payload
  let vehicleOrContext: string | null = null;
  if (payload.booking.service_requested) {
    vehicleOrContext = `Service: ${payload.booking.service_requested}`;
  } else if (payload.dispatch.job_type) {
    vehicleOrContext = `Dispatch: ${payload.dispatch.job_type}`;
  } else if (payload.order.items.length > 0) {
    vehicleOrContext = `Order: ${payload.order.items.length} items`;
  }

  // Look up existing lead by (tenant_id, phone)
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("phone", callerPhoneE164)
    .maybeSingle();

  if (existingLead) {
    // Update existing lead — never downgrade status
    const currentRank = STATUS_RANK[existingLead.status] ?? -1;
    const targetRank = STATUS_RANK[targetStatus] ?? 0;
    const newStatus = targetRank > currentRank ? targetStatus : existingLead.status;

    const updateFields: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
      status: newStatus,
    };

    if (customerName && customerName !== "Unknown" && customerName !== "Phone Customer") {
      updateFields.full_name = customerName;
    }
    if (vehicleOrContext) {
      updateFields.vehicle_or_context = vehicleOrContext;
    }

    await supabase
      .from("leads")
      .update(updateFields)
      .eq("id", existingLead.id);

    console.log(`[ensureLead] Updated existing lead: ${existingLead.id}, status: ${existingLead.status} → ${newStatus}`);
    return existingLead.id;
  }

  // Insert new lead
  const { data: newLead, error: leadError } = await supabase
    .from("leads")
    .insert({
      tenant_id: tenantId,
      full_name: customerName || "Phone Customer",
      phone: callerPhoneE164,
      source: "ai_call",
      status: targetStatus,
      vehicle_or_context: vehicleOrContext,
      tags: [leadScore],
      customer_id: customerId,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (leadError) {
    console.error("[ensureLead] Failed to create lead:", leadError);
    return null;
  }

  console.log(`[ensureLead] Created new lead: ${newLead.id}, status: ${targetStatus}, score: ${leadScore}`);
  return newLead.id;
}

// ===== EXTRACT RAW DATA FROM SOURCES =====
function extractRawDataFromSources(
  dataCollection: Record<string, string>,
  transcript: ElevenLabsWebhookPayload["transcript"],
  businessMode: string
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  
  // Copy all data collection values (unwrapped)
  for (const key of Object.keys(dataCollection)) {
    raw[key] = extractDataCollectionValue(dataCollection[key]);
  }
  
  // Server-side extraction from transcript if needed
  if (Object.keys(dataCollection).length === 0 && transcript?.length) {
    const extracted = extractStructuredDataFromTranscript(transcript, businessMode);
    Object.assign(raw, extracted);
    raw._extraction_source = "server_side";
  } else {
    raw._extraction_source = "elevenlabs";
  }
  
  return raw;
}

// ===== BUILD CANONICAL PAYLOAD =====
// Universal data collection field keys that ONE agent can use across all modes:
// Core: customer_name, customer_phone, intent
// Booking: service_requested, booking_date, booking_time, booking_confirmed
// Food: order_items, order_modifiers, order_special_instructions, order_type, delivery_address, 
//       reservation_date, reservation_time, party_size
// Dispatch: dispatch_pickup_address, dispatch_dropoff_address, vehicle_type, drivable, urgency
// Callback: callback_requested
function buildCanonicalPayload(
  businessMode: string,
  dataCollection: Record<string, string>,
  transcript: ElevenLabsWebhookPayload["transcript"],
  rawExtracted: Record<string, unknown>,
  timezone: string
): CanonicalPayload {
  // Helper to get value from universal keys or legacy fallbacks
  const getVal = (key: string): string | null => extractDataCollectionValue(dataCollection[key]) || rawExtracted[key] as string || null;
  
  // Explicit intent from ElevenLabs data collection (universal field)
  const explicitIntent = getVal("intent")?.toLowerCase();
  
  const payload: CanonicalPayload = {
    intent: "other",
    customer: {
      // Universal key: customer_name (with legacy fallbacks)
      name: getVal("customer_name") || getVal("name") || getVal("caller_name") || extractFromTranscript(transcript, "name"),
      // Universal key: customer_phone
      phone_e164: getVal("customer_phone") || getVal("phone") || null,
      email: getVal("email") || getVal("customer_email"),
    },
    order: {
      type: null,
      items: [],
      special_instructions: null,
      delivery_address: null,
      requested_time: null,
      total_cents: null,
    },
    reservation: {
      date: null,
      time: null,
      party_size: null,
      notes: null,
      original_date_phrase: null,
      original_time_phrase: null,
    },
    booking: {
      service_requested: null,
      service_id: null,
      preferred_date: null,
      preferred_time: null,
      address: null,
      notes: null,
      confirmed: null,
    },
    dispatch: {
      pickup_address: null,
      dropoff_address: null,
      vehicle_type: null,
      drivable: null,
      urgency: "normal",
      job_type: null,
      notes: null,
    },
    callback: {
      requested: null,
      best_time: null,
      message: null,
    },
    sales: {
      interest_type: "",
      vehicle_interest: "",
      budget_range: "",
      timeline: "",
      has_trade_in: false,
      trade_in_details: "",
      financing_interest: false,
      wants_test_drive: false,
      preferred_date: "",
      preferred_time: "",
    },
    _meta: {
      extraction_source: rawExtracted._extraction_source === "server_side" ? "server_side" : "elevenlabs",
      normalized_at: new Date().toISOString(),
      tenant_timezone: timezone,
      raw_data_collection_keys: Object.keys(dataCollection),
    },
  };

  // ===== UNIVERSAL EXTRACTION (works for all modes) =====
  // These universal keys are checked FIRST, before mode-specific fallbacks
  
  // Booking universal keys
  payload.booking.service_requested = getVal("service_requested") || getVal("service") || getVal("reason");
  payload.booking.preferred_date = getVal("booking_date") || getVal("preferred_date") || getVal("schedule_date");
  payload.booking.preferred_time = getVal("booking_time") || getVal("preferred_time") || getVal("schedule_time");
  const bookingConfirmed = getVal("booking_confirmed");
  payload.booking.confirmed = bookingConfirmed === "true" || bookingConfirmed === "yes" || bookingConfirmed === "1";
  
  // Reservation universal keys
  payload.reservation.date = getVal("reservation_date") || getVal("date");
  payload.reservation.time = getVal("reservation_time") || getVal("time");
  const partySize = getVal("party_size") || getVal("guests") || getVal("number_of_guests");
  payload.reservation.party_size = partySize ? parseInt(partySize, 10) || null : null;
  
  // Order universal keys  
  const orderType = getVal("order_type");
  payload.order.type = orderType === "delivery" ? "delivery" : orderType === "pickup" ? "pickup" : null;
  payload.order.delivery_address = getVal("delivery_address");
  payload.order.special_instructions = getVal("order_special_instructions") || getVal("special_instructions");
  
  // Parse order items from universal keys
  const orderItemsRaw = getVal("order_items") || getVal("items") || rawExtracted.items_raw as string;
  const orderModifiers = getVal("order_modifiers") || getVal("modifiers");
  if (orderItemsRaw) {
    const parsed = parseNaturalLanguageItems(orderItemsRaw, transcript);
    payload.order.items = parsed.items.map(item => ({
      name: item.name,
      quantity: item.qty,
      size: null,
      modifiers: item.modifiers || (orderModifiers ? [orderModifiers] : []),
      special_instructions: item.item_notes || null,
      price_cents: null,
      menu_item_id: null,
      matched: false,
    }));
    if (parsed.totalCents) {
      payload.order.total_cents = parsed.totalCents;
    }
  }
  
  // Dispatch universal keys
  payload.dispatch.pickup_address = getVal("dispatch_pickup_address") || getVal("pickup_address");
  payload.dispatch.dropoff_address = getVal("dispatch_dropoff_address") || getVal("dropoff_address");
  payload.dispatch.vehicle_type = getVal("vehicle_type") || getVal("vehicle");
  const drivable = getVal("drivable") || getVal("is_drivable");
  if (drivable === "yes" || drivable === "true") {
    payload.dispatch.drivable = true;
  } else if (drivable === "no" || drivable === "false") {
    payload.dispatch.drivable = false;
  }
  const urgency = getVal("urgency") || getVal("priority");
  if (urgency === "emergency" || urgency === "urgent") {
    payload.dispatch.urgency = "urgent";
  } else if (urgency === "high" || urgency === "asap" || urgency === "same_day") {
    payload.dispatch.urgency = "high";
  }
  
  // Callback universal key
  const callbackVal = getVal("callback_requested");
  if (callbackVal === "true" || callbackVal === "yes" || callbackVal === "1") {
    payload.callback.requested = true;
    payload.callback.best_time = getVal("callback_time") || getVal("best_time");
    payload.callback.message = getVal("message") || getVal("callback_message");
  }

  // ===== MODE-SPECIFIC ADDITIONAL EXTRACTION =====
  // Fill any remaining mode-specific fields that weren't covered by universal keys
  switch (businessMode) {
    case "food":
      fillFoodSection(payload, dataCollection, rawExtracted, transcript);
      break;
    case "service":
      fillBookingSection(payload, dataCollection, rawExtracted);
      break;
    case "dispatch":
      fillDispatchSection(payload, dataCollection, rawExtracted);
      break;
    case "medical":
      fillMedicalSection(payload, dataCollection, rawExtracted);
      break;
    case "sales":
      fillSalesSection(payload, dataCollection, rawExtracted);
      break;
    default:
      fillGeneralSection(payload, dataCollection, rawExtracted);
  }

  // ===== DETERMINE INTENT =====
  // Use explicit intent if provided, otherwise infer from payload
  // Normalize explicit intent aliases to canonical values
  const intentAliases: Record<string, CanonicalPayload["intent"]> = {
    // Order aliases
    "order": "order",
    "food_order": "order",
    "place_order": "order",
    "takeout": "order",
    "delivery": "order",
    "pickup": "order",
    // Reservation aliases
    "reservation": "reservation",
    "reserve": "reservation",
    "table": "reservation",
    "dine_in": "reservation",
    // Booking aliases
    "booking": "booking",
    "appointment": "booking",
    "schedule": "booking",
    "book_service": "booking",
    // Dispatch aliases
    "dispatch": "dispatch",
    "service_call": "dispatch",
    "job": "dispatch",
    "tow": "dispatch",
    // Callback aliases
    "callback": "callback",
    "call_back": "callback",
    "follow_up": "callback",
    // FAQ aliases
    "faq": "faq",
    "question": "faq",
    "inquiry": "faq",
    "info": "faq",
    // Sales aliases
    "test_drive": "test_drive",
    "test drive": "test_drive",
    "demo": "test_drive",
    "showing": "test_drive",
    "sales_lead": "sales_lead",
    "sales": "sales_lead",
    "interested": "sales_lead",
    "purchase": "sales_lead",
    "buy": "sales_lead",
    // Other
    "other": "other",
    "general": "other",
  };

  const normalizedExplicitIntent = explicitIntent ? intentAliases[explicitIntent] : null;
  const intentSource = normalizedExplicitIntent ? "explicit" : "heuristic";

  if (normalizedExplicitIntent) {
    payload.intent = normalizedExplicitIntent;
  } else {
    payload.intent = determineIntentFromPayload(businessMode, payload, dataCollection, rawExtracted);
  }

  // Store intent source in meta for debugging
  (payload._meta as any).intent_source = intentSource;
  (payload._meta as any).raw_intent_value = explicitIntent || null;

  return payload;
}

function fillFoodSection(
  payload: CanonicalPayload,
  dataCollection: Record<string, string>,
  rawExtracted: Record<string, unknown>,
  transcript?: ElevenLabsWebhookPayload["transcript"]
) {
  const getVal = (key: string): string | null => extractDataCollectionValue(dataCollection[key]) || rawExtracted[key] as string || null;
  
  // Check for reservation first
  const partySize = getVal("party_size") || getVal("guests") || getVal("number_of_guests");
  const resDate = getVal("reservation_date") || getVal("date");
  const resTime = getVal("reservation_time") || getVal("time");
  
  if (partySize || rawExtracted._reservation_detected) {
    payload.reservation.party_size = partySize ? parseInt(partySize, 10) : null;
    payload.reservation.date = resDate;
    payload.reservation.time = resTime;
    payload.reservation.notes = getVal("special_requests") || getVal("notes");
    return; // Don't fill order if it's a reservation
  }
  
  // Order section
  const orderType = getVal("order_type");
  payload.order.type = orderType === "delivery" ? "delivery" : orderType === "pickup" ? "pickup" : null;
  payload.order.delivery_address = getVal("delivery_address");
  payload.order.requested_time = getVal("pickup_time") || getVal("requested_time");
  payload.order.special_instructions = getVal("special_instructions");
  
  // Parse items
  const orderItemsRaw = getVal("order_items") || getVal("items") || rawExtracted.items_raw as string;
  if (orderItemsRaw) {
    const parsed = parseNaturalLanguageItems(orderItemsRaw, transcript);
    payload.order.items = parsed.items.map(item => ({
      name: item.name,
      quantity: item.qty,
      size: null,
      modifiers: item.modifiers || [],
      special_instructions: item.item_notes || null,
      price_cents: null,
      menu_item_id: null,
      matched: false,
    }));
    if (parsed.totalCents) {
      payload.order.total_cents = parsed.totalCents;
    }
  } else if (Array.isArray(rawExtracted.items)) {
    const items = rawExtracted.items as Array<{ name: string; qty: number; modifiers?: string[]; item_notes?: string }>;
    payload.order.items = items.map(item => ({
      name: item.name,
      quantity: item.qty,
      size: null,
      modifiers: item.modifiers || [],
      special_instructions: item.item_notes || null,
      price_cents: null,
      menu_item_id: null,
      matched: false,
    }));
  }
}

function fillBookingSection(
  payload: CanonicalPayload,
  dataCollection: Record<string, string>,
  rawExtracted: Record<string, unknown>
) {
  const getVal = (key: string): string | null => extractDataCollectionValue(dataCollection[key]) || rawExtracted[key] as string || null;
  
  payload.booking.service_requested = getVal("service_requested") || getVal("service") || getVal("reason");
  payload.booking.preferred_date = getVal("preferred_date") || getVal("schedule_date");
  payload.booking.preferred_time = getVal("preferred_time") || getVal("schedule_time");
  payload.booking.address = getVal("address") || getVal("service_address");
  payload.booking.notes = getVal("notes");
  
  const confirmed = getVal("booking_confirmed");
  payload.booking.confirmed = confirmed === "true" || confirmed === "yes";
}

function fillDispatchSection(
  payload: CanonicalPayload,
  dataCollection: Record<string, string>,
  rawExtracted: Record<string, unknown>
) {
  const getVal = (key: string): string | null => extractDataCollectionValue(dataCollection[key]) || rawExtracted[key] as string || null;
  
  payload.dispatch.pickup_address = getVal("pickup_address");
  payload.dispatch.dropoff_address = getVal("dropoff_address");
  payload.dispatch.vehicle_type = getVal("vehicle_type") || getVal("vehicle");
  payload.dispatch.job_type = getVal("job_type");
  payload.dispatch.notes = getVal("notes") || getVal("description");
  
  const drivable = getVal("is_drivable");
  if (drivable !== null) {
    payload.dispatch.drivable = drivable === "true" || drivable === "yes";
  }
  
  const urgency = getVal("urgency") || getVal("priority");
  if (urgency === "urgent" || urgency === "emergency") {
    payload.dispatch.urgency = "urgent";
  } else if (urgency === "high" || urgency === "asap") {
    payload.dispatch.urgency = "high";
  }
}

function fillMedicalSection(
  payload: CanonicalPayload,
  dataCollection: Record<string, string>,
  rawExtracted: Record<string, unknown>
) {
  const getVal = (key: string): string | null => extractDataCollectionValue(dataCollection[key]) || rawExtracted[key] as string || null;
  
  payload.booking.service_requested = getVal("appointment_type") || getVal("reason");
  payload.booking.preferred_date = getVal("preferred_date");
  payload.booking.preferred_time = getVal("preferred_time");
  
  const isNew = getVal("is_new_patient");
  if (isNew) {
    payload.booking.notes = isNew === "true" ? "New patient" : "Existing patient";
  }
}

function fillGeneralSection(
  payload: CanonicalPayload,
  dataCollection: Record<string, string>,
  rawExtracted: Record<string, unknown>
) {
  const getVal = (key: string): string | null => extractDataCollectionValue(dataCollection[key]) || rawExtracted[key] as string || null;

  payload.booking.service_requested = getVal("service_requested") || getVal("reason");
  payload.callback.message = getVal("message");
}

function fillSalesSection(
  payload: CanonicalPayload,
  dataCollection: Record<string, string>,
  rawExtracted: Record<string, unknown>
) {
  const getVal = (key: string): string | null => extractDataCollectionValue(dataCollection[key]) || rawExtracted[key] as string || null;

  payload.sales.interest_type = getVal("interest_type") || getVal("inquiry_type") || "";
  payload.sales.vehicle_interest = getVal("vehicle_interest") || getVal("product_interest") || getVal("vehicle_of_interest") || "";
  payload.sales.budget_range = getVal("budget_range") || getVal("budget") || "";
  payload.sales.timeline = getVal("timeline") || getVal("purchase_timeline") || "";
  const tradeIn = getVal("has_trade_in") || getVal("trade_in");
  payload.sales.has_trade_in = tradeIn === "true" || tradeIn === "yes" || tradeIn === "1";
  payload.sales.trade_in_details = getVal("trade_in_details") || getVal("trade_in_vehicle") || "";
  const financing = getVal("financing_interest") || getVal("financing") || getVal("needs_financing");
  payload.sales.financing_interest = financing === "true" || financing === "yes" || financing === "1";
  const wantsTestDrive = getVal("wants_test_drive") || getVal("test_drive") || getVal("test_drive_requested");
  payload.sales.wants_test_drive = wantsTestDrive === "true" || wantsTestDrive === "yes" || wantsTestDrive === "1";
  payload.sales.preferred_date = getVal("preferred_date") || getVal("booking_date") || "";
  payload.sales.preferred_time = getVal("preferred_time") || getVal("booking_time") || "";

  // Also fill booking section for test drive scheduling
  if (!payload.booking.preferred_date && payload.sales.preferred_date) {
    payload.booking.preferred_date = payload.sales.preferred_date;
  }
  if (!payload.booking.preferred_time && payload.sales.preferred_time) {
    payload.booking.preferred_time = payload.sales.preferred_time;
  }
  if (!payload.booking.service_requested) {
    payload.booking.service_requested = payload.sales.wants_test_drive ? "Test Drive" : "Sales Consultation";
  }
}

// ===== DETERMINE INTENT FROM PAYLOAD =====
// Heuristic-based intent detection when explicit intent is not provided
// Uses a scoring system to handle ambiguous cases
function determineIntentFromPayload(
  businessMode: string,
  payload: CanonicalPayload,
  dataCollection: Record<string, string>,
  rawExtracted: Record<string, unknown>
): CanonicalPayload["intent"] {
  const getVal = (key: string): string | null => extractDataCollectionValue(dataCollection[key]) || rawExtracted[key] as string || null;

  // Helper to check for "truthy" confirmation values
  const isConfirmed = (val: string | null): boolean =>
    val === "true" || val === "yes" || val === "1" || val === "confirmed";

  // === STEP 1: Check explicit confirmation flags (highest confidence) ===
  const orderConfirmed = getVal("order_confirmed") || getVal("order_placed");
  if (isConfirmed(orderConfirmed)) return "order";

  const reservationConfirmed = getVal("reservation_confirmed") || getVal("reservation_made");
  if (isConfirmed(reservationConfirmed)) return "reservation";

  const bookingConfirmed = getVal("booking_confirmed") || getVal("appointment_booked");
  if (isConfirmed(bookingConfirmed)) return "booking";

  const dispatchConfirmed = getVal("dispatch_confirmed") || getVal("job_created") || getVal("service_requested");
  if (isConfirmed(dispatchConfirmed)) return "dispatch";

  // Sales-specific confirmation flags
  const testDriveRequested = getVal("test_drive_requested") || getVal("wants_test_drive");
  if (isConfirmed(testDriveRequested) && businessMode === "sales") return "test_drive";

  const salesLeadCreated = getVal("sales_lead_created") || getVal("interested");
  if (isConfirmed(salesLeadCreated) && businessMode === "sales") return "sales_lead";

  const callbackRequested = getVal("callback_requested") || getVal("wants_callback");
  if (isConfirmed(callbackRequested)) return "callback";

  // === STEP 2: Score-based detection for ambiguous cases ===
  const scores: Record<string, number> = {
    order: 0,
    reservation: 0,
    booking: 0,
    dispatch: 0,
    callback: 0,
    faq: 0,
    other: 0,
    test_drive: 0,
    sales_lead: 0,
  };

  // Order signals
  if (payload.order.items.length > 0) scores.order += 3;
  if (rawExtracted.items_raw || getVal("order_items")) scores.order += 2;
  if (payload.order.type) scores.order += 1;
  if (payload.order.delivery_address) scores.order += 1;

  // Reservation signals
  if (payload.reservation.party_size) scores.reservation += 3;
  if (rawExtracted._reservation_detected) scores.reservation += 2;
  if (payload.reservation.date && payload.reservation.time) scores.reservation += 2;
  if (getVal("guests") || getVal("number_of_guests")) scores.reservation += 1;

  // Booking signals
  if (payload.booking.service_requested) scores.booking += 3;
  if (payload.booking.preferred_date || payload.booking.preferred_time) scores.booking += 2;
  if (payload.booking.address) scores.booking += 1;

  // Dispatch signals
  if (payload.dispatch.pickup_address) scores.dispatch += 3;
  if (payload.dispatch.dropoff_address) scores.dispatch += 2;
  if (payload.dispatch.vehicle_type) scores.dispatch += 1;
  if (payload.dispatch.urgency !== "normal") scores.dispatch += 1;

  // Callback signals
  if (payload.callback.requested) scores.callback += 3;
  if (payload.callback.best_time) scores.callback += 1;
  if (payload.callback.message) scores.callback += 1;

  // Sales signals
  if (payload.sales.wants_test_drive) scores.test_drive += 3;
  if (payload.sales.vehicle_interest) scores.sales_lead += 2;
  if (payload.sales.budget_range) scores.sales_lead += 1;
  if (payload.sales.has_trade_in) scores.sales_lead += 1;
  if (payload.sales.financing_interest) scores.sales_lead += 1;
  if (payload.sales.timeline) scores.sales_lead += 1;
  // Test drive inherits from sales_lead if higher
  if (scores.sales_lead > 0 && payload.sales.wants_test_drive) scores.test_drive += scores.sales_lead;

  // === STEP 3: Apply business mode weighting ===
  // Give bonus to intents that match the business mode
  switch (businessMode) {
    case "food":
      scores.order += 1;
      scores.reservation += 1;
      break;
    case "dispatch":
      scores.dispatch += 2;
      break;
    case "service":
    case "medical":
      scores.booking += 2;
      break;
    case "sales":
      scores.test_drive += 2;
      scores.sales_lead += 1;
      break;
    case "general":
      scores.faq += 1;
      break;
  }

  // === STEP 4: Find highest scoring intent ===
  let maxScore = 0;
  let bestIntent: CanonicalPayload["intent"] = "other";

  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestIntent = intent as typeof bestIntent;
    }
  }

  // Only return a specific intent if we have meaningful signals (score >= 2)
  // Otherwise fall back to "other" to avoid misclassification
  if (maxScore < 2) {
    return "other";
  }

  return bestIntent;
}

// ===== QUOTE DETECTION HELPERS =====

/**
 * Detect if transcript contains pricing-related questions
 * Simple keyword heuristic for V1
 */
function detectPricingQuestion(transcript: string): boolean {
  if (!transcript) return false;
  const lower = transcript.toLowerCase();

  const priceKeywords = [
    "how much", "what's the price", "what is the price", "cost", "pricing",
    "what do you charge", "how expensive", "price for", "quote for",
    "what's it cost", "what does it cost", "how much does", "price of"
  ];

  return priceKeywords.some(keyword => lower.includes(keyword));
}

/**
 * Detect if transcript contains ETA/timing-related questions
 * Simple keyword heuristic for V1
 */
function detectEtaQuestion(transcript: string): boolean {
  if (!transcript) return false;
  const lower = transcript.toLowerCase();

  const etaKeywords = [
    "how long", "when can you", "how soon", "how quickly", "wait time",
    "how much time", "eta", "estimated time", "arrival time", "ready when",
    "how fast", "time to", "take to get"
  ];

  return etaKeywords.some(keyword => lower.includes(keyword));
}

// ===== VALIDATE CANONICAL PAYLOAD =====
// Ensures all required fields have safe defaults and no nulls slip through
function validateCanonicalPayload(payload: CanonicalPayload): CanonicalPayload {
  // Ensure customer has safe defaults
  payload.customer.name = payload.customer.name ?? null;
  payload.customer.phone_e164 = payload.customer.phone_e164 ?? null;
  payload.customer.email = payload.customer.email ?? null;

  // Ensure order has safe defaults
  payload.order.type = payload.order.type ?? null;
  payload.order.items = payload.order.items ?? [];
  payload.order.special_instructions = payload.order.special_instructions ?? null;
  payload.order.delivery_address = payload.order.delivery_address ?? null;
  payload.order.requested_time = payload.order.requested_time ?? null;
  payload.order.total_cents = payload.order.total_cents ?? null;

  // Ensure each order item has required fields
  payload.order.items = payload.order.items.map(item => ({
    name: item.name ?? "Unknown Item",
    quantity: item.quantity ?? 1,
    size: item.size ?? null,
    modifiers: item.modifiers ?? [],
    special_instructions: item.special_instructions ?? null,
    price_cents: item.price_cents ?? null,
    menu_item_id: item.menu_item_id ?? null,
    matched: item.matched ?? false,
  }));

  // Ensure reservation has safe defaults
  payload.reservation.date = payload.reservation.date ?? null;
  payload.reservation.time = payload.reservation.time ?? null;
  payload.reservation.party_size = payload.reservation.party_size ?? null;
  payload.reservation.notes = payload.reservation.notes ?? null;
  payload.reservation.original_date_phrase = payload.reservation.original_date_phrase ?? null;
  payload.reservation.original_time_phrase = payload.reservation.original_time_phrase ?? null;

  // Ensure booking has safe defaults
  payload.booking.service_requested = payload.booking.service_requested ?? null;
  payload.booking.service_id = payload.booking.service_id ?? null;
  payload.booking.preferred_date = payload.booking.preferred_date ?? null;
  payload.booking.preferred_time = payload.booking.preferred_time ?? null;
  payload.booking.address = payload.booking.address ?? null;
  payload.booking.notes = payload.booking.notes ?? null;
  payload.booking.confirmed = payload.booking.confirmed ?? null;

  // Ensure dispatch has safe defaults
  payload.dispatch.pickup_address = payload.dispatch.pickup_address ?? null;
  payload.dispatch.dropoff_address = payload.dispatch.dropoff_address ?? null;
  payload.dispatch.vehicle_type = payload.dispatch.vehicle_type ?? null;
  payload.dispatch.drivable = payload.dispatch.drivable ?? null;
  payload.dispatch.urgency = payload.dispatch.urgency ?? "normal";
  payload.dispatch.job_type = payload.dispatch.job_type ?? null;
  payload.dispatch.notes = payload.dispatch.notes ?? null;

  // Ensure callback has safe defaults
  payload.callback.requested = payload.callback.requested ?? null;
  payload.callback.best_time = payload.callback.best_time ?? null;
  payload.callback.message = payload.callback.message ?? null;

  // Ensure meta has required fields
  payload._meta.extraction_source = payload._meta.extraction_source ?? "server_side";
  payload._meta.normalized_at = payload._meta.normalized_at ?? new Date().toISOString();
  payload._meta.tenant_timezone = payload._meta.tenant_timezone ?? "America/New_York";
  payload._meta.raw_data_collection_keys = payload._meta.raw_data_collection_keys ?? [];

  return payload;
}

// ===== NORMALIZE PAYLOAD VALUES =====
function normalizePayloadValues(payload: CanonicalPayload, timezone: string): CanonicalPayload {
  // Normalize party_size to integer
  if (payload.reservation.party_size !== null) {
    const parsed = parseInt(String(payload.reservation.party_size), 10);
    payload.reservation.party_size = isNaN(parsed) ? null : parsed;
  }
  
  // Normalize reservation date to ISO
  if (payload.reservation.date && !isISODate(payload.reservation.date)) {
    payload.reservation.original_date_phrase = payload.reservation.date;
    payload.reservation.date = parseNaturalDate(payload.reservation.date, timezone);
  }
  
  // Normalize reservation time to HH:MM
  if (payload.reservation.time && !is24HourTime(payload.reservation.time)) {
    payload.reservation.original_time_phrase = payload.reservation.time;
    payload.reservation.time = parseNaturalTime(payload.reservation.time);
  }
  
  // Normalize booking dates
  if (payload.booking.preferred_date && !isISODate(payload.booking.preferred_date)) {
    payload.booking.preferred_date = parseNaturalDate(payload.booking.preferred_date, timezone);
  }
  
  if (payload.booking.preferred_time && !is24HourTime(payload.booking.preferred_time)) {
    payload.booking.preferred_time = parseNaturalTime(payload.booking.preferred_time);
  }
  
  payload._meta.normalized_at = new Date().toISOString();
  payload._meta.tenant_timezone = timezone;
  
  return payload;
}

function isISODate(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function is24HourTime(str: string): boolean {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(str);
}

function parseNaturalDate(input: string, _timezone?: string): string {
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
  
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  
  // Handle "next [day]" - always goes to next week
  const nextMatch = lower.match(/next\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (nextMatch) {
    const targetDay = dayNames.indexOf(nextMatch[1]);
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    // "next X" means at least 7 days
    daysUntil += 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    return targetDate.toISOString().split("T")[0];
  }
  
  // Handle "this [day]" - this week
  const thisMatch = lower.match(/this\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (thisMatch) {
    const targetDay = dayNames.indexOf(thisMatch[1]);
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    return targetDate.toISOString().split("T")[0];
  }
  
  // Handle just day names - nearest future occurrence
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
  
  // Default to today if can't parse
  return today.toISOString().split("T")[0];
}

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
    if (!period && hour >= 1 && hour <= 6) hour += 12;
    
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }
  
  // Common time words
  if (lower.includes("noon")) return "12:00";
  if (lower.includes("evening")) return "18:00";
  if (lower.includes("morning")) return "09:00";
  if (lower.includes("afternoon")) return "14:00";
  if (lower.includes("night")) return "19:00";
  if (lower.includes("dinner")) return "18:30";
  if (lower.includes("lunch")) return "12:00";
  if (lower.includes("breakfast")) return "08:00";
  
  return "12:00";
}

function determineOutcomeFromIntent(intent: string, _businessMode: string): string {
  switch (intent) {
    case "order": return "order";
    case "reservation": return "booked";
    case "booking": return "booked";
    case "dispatch": return "dispatch";
    case "callback": return "followup";
    case "faq": return "lead_captured";
    default: return "lost";
  }
}

// ===== PERSIST DERIVED ENTITY (ROUTER) =====
// Deterministic routing based on intent + enabled_modules
// deno-lint-ignore no-explicit-any
async function persistDerivedEntity(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string,
  businessMode: string,
  enabledModules: string[],
  payload: CanonicalPayload,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string,
  webhookPayload: ElevenLabsWebhookPayload,
  leadId: string | null = null
): Promise<void> {
  const intent = payload.intent;

  // Build routing decision
  const routingDecision = determineRoutingTarget(intent, businessMode, enabledModules, payload);

  console.log(`[persistDerivedEntity] Intent: ${intent}, BusinessMode: ${businessMode}, Target: ${routingDecision.target}, Reason: ${routingDecision.reason}`);
  
  await logEventStage(supabase, tenantId, sessionId, null, webhookPayload.conversation_id, "extraction_normalized", {
    intent,
    business_mode: businessMode,
    enabled_modules: enabledModules,
    routing_target: routingDecision.target,
    routing_reason: routingDecision.reason,
    has_order_items: payload.order.items.length > 0,
    has_reservation_data: !!payload.reservation.party_size || !!payload.reservation.date,
    has_booking_data: !!payload.booking.service_requested,
    has_dispatch_data: !!payload.dispatch.pickup_address,
    customer_name: customerName,
  });
  
  let entityType: string | null = null;
  let entityId: string | null = null;
  let entityNumber: string | null = null;
  let success = false;
  let errorMsg: string | null = null;
  
  try {
    switch (routingDecision.target) {
      case "food_orders":
        const order = await persistFoodOrder(supabase, supabaseUrl, supabaseKey, tenantId, sessionId, payload, customerName, customerId, callerPhoneE164);
        if (order) {
          entityType = "order";
          entityId = order.id;
          entityNumber = order.order_number || null;
          success = true;
        }
        break;
        
      case "reservations":
        const reservation = await persistReservation(supabase, supabaseUrl, supabaseKey, tenantId, sessionId, payload, customerName, customerId, callerPhoneE164);
        if (reservation) {
          entityType = "reservation";
          entityId = reservation.id;
          success = true;
        }
        break;
        
      case "bookings":
        const booking = await persistBooking(supabase, supabaseUrl, supabaseKey, tenantId, sessionId, payload, customerName, customerId, callerPhoneE164, leadId);
        if (booking) {
          entityType = "booking";
          entityId = booking.id;
          success = true;
        }
        break;
        
      case "dispatch_jobs":
        const dispatchJob = await persistDispatchJob(supabase, supabaseUrl, supabaseKey, tenantId, sessionId, payload, customerName, customerId, callerPhoneE164);
        if (dispatchJob) {
          entityType = "dispatch_job";
          entityId = dispatchJob.id;
          entityNumber = dispatchJob.job_number || null;
          success = true;
        }
        break;

      case "callback_requests":
        const callback = await persistCallback(supabase, supabaseUrl, supabaseKey, tenantId, sessionId, payload, customerName, customerId, callerPhoneE164);
        if (callback) {
          entityType = "callback";
          entityId = callback.id;
          success = true;
        }
        break;

      case "medical_intakes":
        const intake = await persistMedicalIntake(supabase, supabaseUrl, supabaseKey, tenantId, sessionId, payload, customerName, customerId, callerPhoneE164);
        if (intake) {
          entityType = "medical_intake";
          entityId = intake.id;
          success = true;
        }
        break;

      case "test_drives":
        const testDrive = await persistTestDrive(supabase, supabaseUrl, supabaseKey, tenantId, sessionId, payload, customerName, customerId, callerPhoneE164);
        if (testDrive) {
          entityType = "test_drive";
          entityId = testDrive.id;
          success = true;
        }
        break;

      case "sales_leads":
        const salesLead = await persistSalesLead(supabase, supabaseUrl, supabaseKey, tenantId, sessionId, payload, customerName, customerId, callerPhoneE164);
        if (salesLead) {
          entityType = "sales_lead";
          entityId = salesLead.id;
          entityNumber = salesLead.lead_number || null;
          success = true;
        }
        break;

      case "none":
      default:
        console.log(`[persistDerivedEntity] No derived entity: ${routingDecision.reason}`);
        await logEventStage(supabase, tenantId, sessionId, null, webhookPayload.conversation_id, "derived_entity_skipped", {
          intent,
          target: routingDecision.target,
          reason: routingDecision.reason,
        });
        break;
    }
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
    console.error(`[persistDerivedEntity] Failed to persist ${routingDecision.target}:`, e);
  }
  
  // Always log routing result
  const logStage = success ? "entity_routed_" + routingDecision.target.replace("_", "") : 
                   errorMsg ? "entity_insert_failed" : "derived_entity_skipped";
  
  await logEventStage(
    supabase, tenantId, sessionId, null, webhookPayload.conversation_id,
    success ? "derived_entity_created" : (errorMsg ? "entity_insert_failed" : logStage),
    { 
      entity_type: entityType, 
      entity_id: entityId, 
      entity_number: entityNumber,
      intent,
      routing_target: routingDecision.target,
      routing_reason: routingDecision.reason,
    },
    errorMsg
  );
}

// ===== ROUTING DECISION LOGIC =====
interface RoutingDecision {
  target: "food_orders" | "reservations" | "bookings" | "dispatch_jobs" | "callback_requests" | "medical_intakes" | "test_drives" | "sales_leads" | "none";
  reason: string;
}

function determineRoutingTarget(
  intent: string,
  businessMode: string,
  enabledModules: string[],
  payload: CanonicalPayload
): RoutingDecision {
  // Helper to check if module is enabled
  const hasModule = (mod: string) => enabledModules.includes(mod);
  
  switch (intent) {
    case "order":
      // Only route to food_orders if food_orders module is enabled
      if (hasModule("food_orders")) {
        if (payload.order.items.length > 0) {
          return { target: "food_orders", reason: "intent=order, food_orders enabled, items present" };
        }
        return { target: "none", reason: "intent=order but no items extracted" };
      }
      return { target: "none", reason: "intent=order but food_orders module not enabled" };
      
    case "reservation":
      // Route to reservations if reservations module is enabled
      if (hasModule("reservations")) {
        return { target: "reservations", reason: "intent=reservation, reservations enabled" };
      }
      // Fall back to booking if booking is enabled but not reservations
      if (hasModule("booking")) {
        return { target: "bookings", reason: "intent=reservation, reservations not enabled, falling back to booking" };
      }
      return { target: "none", reason: "intent=reservation but reservations module not enabled" };
      
    case "booking":
      // Medical mode with medical_intake: route to medical_intakes (also creates a booking inside)
      if (businessMode === "medical" && hasModule("medical_intake")) {
        return { target: "medical_intakes", reason: "intent=booking, medical mode, medical_intake enabled" };
      }
      if (hasModule("booking")) {
        return { target: "bookings", reason: "intent=booking, booking enabled" };
      }
      return { target: "none", reason: "intent=booking but booking module not enabled" };
      
    case "dispatch":
      if (hasModule("dispatch_queue")) {
        if (payload.dispatch.pickup_address) {
          return { target: "dispatch_jobs", reason: "intent=dispatch, dispatch_queue enabled, pickup address present" };
        }
        // Still create with incomplete data for manual follow-up
        return { target: "dispatch_jobs", reason: "intent=dispatch, dispatch_queue enabled (incomplete address)" };
      }
      return { target: "none", reason: "intent=dispatch but dispatch_queue module not enabled" };
      
    case "callback":
      // Persist callback requests so no callback is ever lost
      if (payload.callback.requested) {
        return { target: "callback_requests", reason: "intent=callback, callback requested" };
      }
      return { target: "none", reason: "intent=callback but not explicitly requested" };

    case "test_drive":
      if (hasModule("test_drives")) {
        return { target: "test_drives", reason: "intent=test_drive, test_drives module enabled" };
      }
      // Fallback to bookings if test_drives not enabled but booking is
      if (hasModule("booking")) {
        return { target: "bookings", reason: "intent=test_drive, test_drives not enabled, falling back to booking" };
      }
      return { target: "none", reason: "intent=test_drive but no scheduling module enabled" };

    case "sales_lead":
      if (hasModule("sales_leads")) {
        return { target: "sales_leads", reason: "intent=sales_lead, sales_leads module enabled" };
      }
      return { target: "none", reason: "intent=sales_lead but sales_leads module not enabled" };

    case "faq":
    case "other":
    default:
      return { target: "none", reason: `intent=${intent}, no entity creation for this intent` };
  }
}

// ===== PERSIST FOOD ORDER =====
// deno-lint-ignore no-explicit-any
async function persistFoodOrder(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string,
  payload: CanonicalPayload,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string
): Promise<{ id: string; order_number?: string } | null> {
  // Match items to menu and calculate prices
  const { items: pricedItems, totalCents: calculatedTotal, unmatchedCount } = 
    await matchAndPriceItems(supabase, tenantId, payload.order.items);
  
  // Compute tax + delivery fees
  const orderTotals = await computeFoodOrderTotals(
    supabase,
    tenantId,
    calculatedTotal > 0 ? calculatedTotal : (payload.order.total_cents || 0),
    payload.order.type,
    payload.order.delivery_address
  );

  const finalTotalCents = orderTotals.total_cents > 0 ? orderTotals.total_cents : payload.order.total_cents;

  // Generate order number
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
    if (match) nextOrderNum = parseInt(match[1], 10) + 1;
  }
  const orderNumber = `ORD-${nextOrderNum}`;
  
  const status = unmatchedCount > 0 && pricedItems.length === 0 ? "needs_followup" : "confirmed";
  
  // Combine special instructions
  const allInstructions: string[] = [];
  for (const item of pricedItems) {
    if (item.modifiers && item.modifiers.length > 0) {
      allInstructions.push(`${item.name}: ${item.modifiers.join(", ")}`);
    }
    if (item.item_notes) {
      allInstructions.push(`${item.name}: ${item.item_notes}`);
    }
  }
  if (payload.order.special_instructions) {
    allInstructions.push(payload.order.special_instructions);
  }
  const combinedInstructions = allInstructions.length > 0 ? allInstructions.join("; ") : null;
  
  console.log(`[persistFoodOrder] Creating: ${orderNumber} with ${pricedItems.length} items`);
  
  const { data: newOrder, error } = await supabase
    .from("food_orders")
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      order_number: orderNumber,
      order_type: payload.order.type || "pickup",
      status,
      customer_id: customerId,
      customer_name: customerName || "Phone Customer",
      customer_phone: callerPhoneE164 || null,
      items_json: pricedItems.length > 0 ? pricedItems : [{ name: "Order details in notes", qty: 1, matched: false }],
      total_cents: finalTotalCents,
      subtotal_cents: orderTotals.subtotal_cents || (calculatedTotal > 0 ? calculatedTotal : null),
      tax_cents: orderTotals.tax_cents || null,
      delivery_fee_cents: orderTotals.delivery_fee_cents,
      totals_estimate: { subtotal: calculatedTotal > 0 ? calculatedTotal : null, calculated_from_menu: calculatedTotal > 0, unmatched_items: unmatchedCount },
      totals_breakdown: orderTotals.breakdown,
      special_instructions: combinedInstructions,
      delivery_address: payload.order.delivery_address,
    })
    .select("id, order_number")
    .single();
  
  if (error) {
    console.error("[persistFoodOrder] Failed:", error);
    return null;
  }
  
  console.log(`[persistFoodOrder] Created order: ${newOrder.id}`);
  
  // Trigger workflows
  
  // Trigger workflows
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({
        tenant_id: tenantId,
        trigger: "order.created",
        entity_type: "order",
        entity_id: newOrder.id,
        session_id: sessionId, // Link workflow to originating call session
        customer: customerId ? { id: customerId, name: customerName, phone: callerPhoneE164 } : undefined,
        details: { order_number: orderNumber, order_type: payload.order.type, item_count: pricedItems.length },
      }),
    });
  } catch (e) {
    console.error("[persistFoodOrder] Failed to trigger workflow:", e);
  }
  
  try {
    await fetch(`${supabaseUrl}/functions/v1/order-handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({ order_id: newOrder.id, tenant_id: tenantId }),
    });
  } catch (e) {
    console.error("[persistFoodOrder] Failed to trigger order handoff:", e);
  }
  
  return newOrder;
}

// ===== PERSIST RESERVATION =====
// deno-lint-ignore no-explicit-any
async function persistReservation(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string,
  payload: CanonicalPayload,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string
): Promise<{ id: string } | null> {
  // Build notes from original phrases if date/time couldn't be fully parsed
  const notes: string[] = [];
  if (payload.reservation.original_date_phrase) {
    notes.push(`Requested date: "${payload.reservation.original_date_phrase}"`);
  }
  if (payload.reservation.original_time_phrase) {
    notes.push(`Requested time: "${payload.reservation.original_time_phrase}"`);
  }
  if (payload.reservation.notes) {
    notes.push(payload.reservation.notes);
  }
  
  const reservationDate = payload.reservation.date || new Date().toISOString().split("T")[0];
  const reservationTime = payload.reservation.time || "19:00";
  const partySize = payload.reservation.party_size || 2;
  const status = (payload.reservation.date && payload.reservation.time) ? "confirmed" : "pending";
  
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
      special_requests: notes.length > 0 ? notes.join(". ") : null,
      status,
    })
    .select("id")
    .single();
  
  if (error) {
    console.error("[persistReservation] Failed:", error);
    return null;
  }
  
  console.log(`[persistReservation] Created reservation: ${reservation.id}`);
  
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({
        tenant_id: tenantId,
        trigger: "reservation.created",
        entity_type: "reservation",
        entity_id: reservation.id,
        session_id: sessionId, // Link workflow to originating call session
        customer: customerId ? { id: customerId, name: customerName, phone: callerPhoneE164 } : undefined,
        details: { party_size: partySize, date: reservationDate, time: reservationTime },
      }),
    });
  } catch (e) {
    console.error("[persistReservation] Failed to trigger workflow:", e);
  }

  // Trigger universal-delivery for reservation (NOT order-handoff — that looks up food_orders)
  try {
    await fetch(`${supabaseUrl}/functions/v1/universal-delivery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        entity_type: "reservation",
        entity_id: reservation.id,
      }),
    });
  } catch (e) {
    console.warn("[persistReservation] Failed to trigger reservation handoff:", e);
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
  payload: CanonicalPayload,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string,
  leadId: string | null = null
): Promise<{ id: string } | null> {
  // Try to match service
  let serviceId: string | null = null;
  if (payload.booking.service_requested) {
    const { data: service } = await supabase
      .from("services")
      .select("id, duration_minutes, price_amount, price_type")
      .eq("tenant_id", tenantId)
      .ilike("name", `%${payload.booking.service_requested}%`)
      .limit(1)
      .maybeSingle();

    if (service) serviceId = service.id;
  }

  // Compute pricing from service + modifiers
  const pricingResult = await computeBookingPrice(supabase, tenantId, serviceId, payload);

  // Fetch deposit_required from assistant_settings
  const { data: assistantSettings } = await supabase
    .from("assistant_settings")
    .select("deposit_required")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const tenantDepositRequired = assistantSettings?.deposit_required ?? false;

  const preferredDate = payload.booking.preferred_date || (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  })();

  const preferredTime = payload.booking.preferred_time || "10:00";
  const startAt = new Date(`${preferredDate}T${preferredTime}:00`);
  const durationMs = pricingResult.duration_minutes * 60 * 1000;
  const endAt = new Date(startAt.getTime() + durationMs);

  const notes = payload.booking.notes || (payload.booking.service_requested ? `Service requested: ${payload.booking.service_requested}` : null);

  // Determine booking status: confirmed on call → "confirmed", deposit required → "pending_deposit", else "pending"
  let bookingStatus: string;
  if (payload.booking.confirmed === true) {
    bookingStatus = "confirmed";
  } else if (tenantDepositRequired) {
    bookingStatus = "pending_deposit";
  } else {
    bookingStatus = "pending";
  }

  console.log(`[persistBooking] Creating: ${payload.booking.service_requested || "Service"} on ${preferredDate} at ${preferredTime}, status: ${bookingStatus}, price: ${pricingResult.price_cents ?? "N/A"}c`);

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      lead_id: leadId,
      service_id: serviceId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: bookingStatus,
      deposit_required: tenantDepositRequired,
      deposit_paid: false,
      price_cents: pricingResult.price_cents,
      price_breakdown: pricingResult.price_breakdown,
      duration_minutes: pricingResult.duration_minutes,
      notes,
    })
    .select("id")
    .single();
  
  if (error) {
    console.error("[persistBooking] Failed:", error);
    return null;
  }
  
  console.log(`[persistBooking] Created booking: ${booking.id}, status: ${bookingStatus}`);

  // Trigger appropriate workflow based on booking status
  const workflowTrigger = bookingStatus === "confirmed" ? "booking.confirmed" : "booking.created";
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({
        tenant_id: tenantId,
        trigger: workflowTrigger,
        entity_type: "booking",
        entity_id: booking.id,
        session_id: sessionId, // Link workflow to originating call session
        customer: customerId ? { id: customerId, name: customerName, phone: callerPhoneE164 } : undefined,
        details: { service: payload.booking.service_requested, date: preferredDate, time: preferredTime, confirmed: bookingStatus === "confirmed" },
      }),
    });
  } catch (e) {
    console.error("[persistBooking] Failed to trigger workflow:", e);
  }

  // Trigger booking handoff (handles calendar sync, notifications, etc.)
  try {
    await fetch(`${supabaseUrl}/functions/v1/booking-handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-closeloop-secret": Deno.env.get("CLOSELOOP_INTERNAL_SECRET") || supabaseKey
      },
      body: JSON.stringify({ booking_id: booking.id, tenant_id: tenantId }),
    });
    console.log(`[persistBooking] Triggered booking handoff for: ${booking.id}`);
  } catch (e) {
    console.error("[persistBooking] Failed to trigger booking handoff:", e);
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
  payload: CanonicalPayload,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string
): Promise<{ id: string; job_number?: string } | null> {
  // P0 DEDUP: Check if a dispatch job already exists for this session
  // (created by create-dispatch-request tool during the call)
  const { data: existingJob } = await supabase
    .from("dispatch_jobs")
    .select("id, job_number")
    .eq("session_id", sessionId)
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle();
  
  if (existingJob) {
    console.log(`[persistDispatchJob] DEDUP: Job already exists for session ${sessionId}: ${existingJob.job_number}`);
    return existingJob;
  }
  
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
    if (match) nextJobNum = parseInt(match[1], 10) + 1;
  }
  const jobNumber = `JOB-${nextJobNum}`;
  
  const priorityMap: Record<string, string> = { urgent: "urgent", high: "high", normal: "normal" };
  const priority = priorityMap[payload.dispatch.urgency] || "normal";

  // Compute pricing + distance (non-blocking — job creation > pricing)
  let dispatchPricing: { price_cents: number | null; price_breakdown: Record<string, unknown>; distance_miles: number | null; estimated_eta_minutes: number | null } = {
    price_cents: null,
    price_breakdown: { method: "none" },
    distance_miles: null,
    estimated_eta_minutes: null,
  };
  try {
    dispatchPricing = await computeDispatchPrice(
      supabase,
      supabaseUrl,
      supabaseKey,
      tenantId,
      payload.dispatch.pickup_address,
      payload.dispatch.dropoff_address,
      payload.dispatch.job_type,
      payload.dispatch.urgency
    );
  } catch (e) {
    console.warn("[persistDispatchJob] Pricing computation failed (non-blocking):", e);
  }

  console.log(`[persistDispatchJob] Creating: ${jobNumber} - ${payload.dispatch.job_type || "job"} at ${payload.dispatch.pickup_address}, price: ${dispatchPricing.price_cents ?? "N/A"}c`);

  const { data: job, error } = await supabase
    .from("dispatch_jobs")
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      job_number: jobNumber,
      customer_id: customerId,
      customer_name: customerName || "Phone Customer",
      customer_phone: callerPhoneE164 || null,
      pickup_address: payload.dispatch.pickup_address,
      dropoff_address: payload.dispatch.dropoff_address,
      job_type: payload.dispatch.job_type || "tow",
      vehicle_category: payload.dispatch.vehicle_type || null,
      drivable: payload.dispatch.drivable,
      description: payload.dispatch.notes,
      priority,
      status: "pending",
      price_cents: dispatchPricing.price_cents,
      dispatch_distance_miles: dispatchPricing.distance_miles,
      estimated_eta_minutes: dispatchPricing.estimated_eta_minutes,
    })
    .select("id, job_number")
    .single();
  
  if (error) {
    console.error("[persistDispatchJob] Failed:", error);
    return null;
  }
  
  console.log(`[persistDispatchJob] Created dispatch job: ${job.id}`);
  
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({
        tenant_id: tenantId,
        trigger: "dispatch.created",
        entity_type: "dispatch_job",
        entity_id: job.id,
        session_id: sessionId, // Link workflow to originating call session
        customer: customerId ? { id: customerId, name: customerName, phone: callerPhoneE164 } : undefined,
        details: { job_type: payload.dispatch.job_type, pickup: payload.dispatch.pickup_address, priority },
      }),
    });
  } catch (e) {
    console.error("[persistDispatchJob] Failed to trigger workflow:", e);
  }

  // Trigger dispatch handoff (handles notifications, SMS, etc.)
  try {
    await fetch(`${supabaseUrl}/functions/v1/dispatch-handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ dispatch_id: job.id, tenant_id: tenantId }),
    });
  } catch (e) {
    console.warn("[persistDispatchJob] Failed to trigger dispatch handoff:", e);
  }

  return job;
}

// ===== MENU ITEM PRICE MATCHING =====
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
  parsedItems: CanonicalOrderItem[]
): Promise<MenuMatchResult> {
  if (parsedItems.length === 0) {
    return { items: [], totalCents: 0, unmatchedCount: 0 };
  }

  const { data: menuItems, error } = await supabase
    .from("menu_items")
    .select("id, name, category, price_cents")
    .eq("tenant_id", tenantId)
    .eq("is_available", true);

  if (error || !menuItems) {
    console.error("Failed to fetch menu items:", error);
    return {
      items: parsedItems.map(item => ({ name: item.name, qty: item.quantity, price_cents: null, menu_item_id: null, matched: false, modifiers: item.modifiers, item_notes: item.special_instructions || undefined })),
      totalCents: 0,
      unmatchedCount: parsedItems.length,
    };
  }

  let totalCents = 0;
  let unmatchedCount = 0;

  const pricedItems: PricedOrderItem[] = parsedItems.map(item => {
    const match = findBestMenuMatch(item.name, menuItems);

    if (match && match.price_cents) {
      const lineTotal = match.price_cents * item.quantity;
      totalCents += lineTotal;
      return { name: item.name, qty: item.quantity, price_cents: match.price_cents, menu_item_id: match.id, matched: true, modifiers: item.modifiers, item_notes: item.special_instructions || undefined };
    }

    unmatchedCount++;
    return { name: item.name, qty: item.quantity, price_cents: null, menu_item_id: null, matched: false, modifiers: item.modifiers, item_notes: item.special_instructions || undefined };
  });

  return { items: pricedItems, totalCents, unmatchedCount };
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price_cents: number | null;
}

function findBestMenuMatch(spokenName: string, menuItems: MenuItem[]): MenuItem | null {
  if (!menuItems.length) return null;

  const normalized = spokenName.toLowerCase().replace(/\s+/g, " ").replace(/pizza$/i, "").replace(/\s*wings?$/i, "").trim();

  for (const item of menuItems) {
    const itemNorm = item.name.toLowerCase().replace(/\s+/g, " ");
    if (itemNorm === normalized || itemNorm.includes(normalized) || normalized.includes(itemNorm)) {
      return item;
    }
  }

  const sizeMatch = normalized.match(/^(large|medium|small|xl|extra[ -]?large|personal)\s+(.+)/i);
  if (sizeMatch) {
    const sizelessName = sizeMatch[2].trim();
    for (const item of menuItems) {
      const itemNorm = item.name.toLowerCase();
      if (itemNorm.includes(sizelessName)) return item;
    }
  }

  const drinkKeywords = ["pepsi", "coke", "coca-cola", "sprite", "dr pepper", "fanta", "7-up", "root beer", "ginger ale", "water", "lemonade", "iced tea", "sweet tea", "coffee", "espresso"];
  for (const keyword of drinkKeywords) {
    if (normalized.includes(keyword)) {
      const drinkMatch = menuItems.find(m => m.name.toLowerCase().includes(keyword) || (m.category && m.category.toLowerCase() === "drinks"));
      if (drinkMatch) return drinkMatch;
    }
  }

  if (normalized.includes("wing")) {
    const wingsMatch = menuItems.find(m => m.name.toLowerCase().includes("wing") || (m.category && m.category.toLowerCase() === "wings"));
    if (wingsMatch) return wingsMatch;
  }

  const italianSpecialties = ["calzone", "stromboli", "stuffed shell", "eggplant parm", "chicken parm", "veal parm"];
  for (const specialty of italianSpecialties) {
    if (normalized.includes(specialty)) {
      const match = menuItems.find(m => m.name.toLowerCase().includes(specialty));
      if (match) return match;
    }
  }

  const pastaTypes = ["spaghetti", "fettuccine", "penne", "lasagna", "ravioli", "linguine", "rigatoni", "gnocchi", "tortellini", "manicotti"];
  for (const pasta of pastaTypes) {
    if (normalized.includes(pasta)) {
      const match = menuItems.find(m => m.name.toLowerCase().includes(pasta));
      if (match) return match;
    }
  }

  const sides = ["bruschetta", "garlic bread", "garlic knots", "breadsticks", "calamari", "mozzarella sticks", "onion rings", "fries", "french fries", "caesar salad", "garden salad", "house salad"];
  for (const side of sides) {
    if (normalized.includes(side)) {
      const match = menuItems.find(m => m.name.toLowerCase().includes(side));
      if (match) return match;
    }
  }

  return null;
}

// Parse natural language order items
interface ParsedOrderResult {
  items: Array<{ name: string; qty: number; modifiers?: string[]; item_notes?: string }>;
  totalCents: number | null;
}

function parseNaturalLanguageItems(rawText: string, transcript?: ElevenLabsWebhookPayload["transcript"]): ParsedOrderResult {
  const items: Array<{ name: string; qty: number; modifiers?: string[]; item_notes?: string }> = [];
  
  const customerText = transcript ? transcript.filter(t => t.role === "user").map(t => t.message).join(" ") : rawText;
  const allText = transcript ? transcript.map(t => t.message).join(" ") : rawText;
  
  const pizzaTypes = "margherita|margarita|pepperoni|cheese|hawaiian|veggie|vegetarian|meat ?lovers?|supreme|quattro ?formaggi|buffalo|bbq|mushroom|sausage|white|plain|sicilian|neapolitan";
  const pizzaSizes = "(?:extra[ -]?large|x-?large|xl|large|medium|small|personal)?";
  
  const foodPatterns: Array<{ pattern: RegExp; formatFn: ((match: string, qty: string, size: string, type: string) => string) | null }> = [
    { pattern: new RegExp(`(\\d*)\\s*${pizzaSizes}\\s*(${pizzaTypes})(?:\\s*pizza)?`, "gi"), formatFn: (match: string) => { const cleaned = match.replace(/^\d+\s*/, "").trim(); const hasWord = cleaned.toLowerCase().includes("pizza"); const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1); return hasWord ? capitalized : capitalized + " Pizza"; } },
    { pattern: /(\d*)\s*(spaghetti|fettuccine|penne|lasagna|ravioli|linguine|rigatoni|gnocchi|tortellini|manicotti)\s*(?:alla\s*)?(carbonara|alfredo|bolognese|marinara|arrabbiata|puttanesca|primavera)?/gi, formatFn: null },
    { pattern: /(\d*)\s*(calzone|stromboli|stuffed shells?|eggplant (?:parm|parmesan|parmigiana)|chicken (?:parm|parmesan|parmigiana)|veal (?:parm|parmesan|parmigiana))s?/gi, formatFn: (match: string) => { const cleaned = match.replace(/^\d+\s*/, "").trim(); return cleaned.charAt(0).toUpperCase() + cleaned.slice(1); } },
    { pattern: /(\d*)\s*((?:italian|meatball|chicken|philly|cheesesteak|turkey|ham|club|blt|veggie|vegetarian)\s*(?:sub|hoagie|hero|sandwich|grinder)?|(?:sub|hoagie|hero|sandwich|grinder))/gi, formatFn: (match: string) => { const cleaned = match.replace(/^\d+\s*/, "").trim(); return cleaned.charAt(0).toUpperCase() + cleaned.slice(1); } },
    { pattern: /(\d+)\s*(?:piece\s+)?(?:chicken\s+)?wings?(?:\s+(buffalo|bbq|garlic parmesan|honey mustard|lemon pepper|plain|naked|hot|mild|medium))?/gi, formatFn: (match: string, _qty: string) => { const cleaned = match.replace(/^\d+\s*/, "").trim(); const formatted = cleaned.charAt(0).toUpperCase() + cleaned.slice(1); return formatted.includes("wing") || formatted.includes("Wing") ? formatted : `${formatted} Wings`; } },
    { pattern: /(\d*)\s*(bruschetta|garlic (?:bread|knots)|breadsticks?|calamari|fried calamari|mozzarella sticks?|onion rings?|fries|french fries|curly fries|caesar salad|garden salad|house salad|soup|tiramisu|cannoli|cheesecake|gelato|zeppole|rice balls?|arancini)/gi, formatFn: null },
    { pattern: /(?:(\d+)\s+)?(?:(two[ -]?liter|2[ -]?liter|liter|bottle|can|large|medium|small)\s+)?(pepsi|coke|coca[ -]?cola|sprite|dr\.?\s*pepper|fanta|7[ -]?up|root ?beer|ginger ?ale|water|lemonade|iced?\s*tea|sweet\s*tea|coffee|espresso)/gi, formatFn: (match: string) => { const cleaned = match.replace(/^\d+\s*/, "").trim(); return cleaned.charAt(0).toUpperCase() + cleaned.slice(1); } },
    { pattern: /(\d+)\s*(piece|order|serving)s?\s+(?:of\s+)?(\w+)/gi, formatFn: null },
  ];
  
  const seenItems = new Set<string>();
  
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
      const normalizedName = itemName.toLowerCase().replace(/\s+/g, " ");
      if (itemName.length > 2 && !seenItems.has(normalizedName)) {
        seenItems.add(normalizedName);
        items.push({ name: itemName, qty });
      }
    }
  }
  
  // Extract modifiers
  const allModifiers: string[] = [];
  const allSpecialInstructions: string[] = [];
  
  const modifierPatterns = [
    /(?:with|add|extra|no|light|heavy|double|triple)\s+(?:extra\s+)?(garlic|cheese|onions?|peppers?|bell peppers?|mushrooms?|olives?|bacon|anchovies|jalape[ñn]os?|pineapple|tomatoes?|pepperoni|sausage|ham|spinach|basil|oregano|parmesan|mozzarella|feta|ricotta|provolone)/gi,
    /(?:gluten[ -]?free|dairy[ -]?free|vegetarian|vegan)/gi,
  ];
  
  const specialInstructionPatterns = [
    /(?:cooked?\s+)?(well[ -]?done|medium[ -]?well|medium[ -]?rare|medium|rare|crispy|light|extra crispy)/gi,
    /(?:on the side|cut into squares?|cut into slices?|uncut|well done|extra[ -]?sauce|light sauce|no sauce)/gi,
  ];
  
  for (const pattern of modifierPatterns) {
    const matches = customerText.matchAll(pattern);
    for (const match of matches) {
      const mod = match[0].trim();
      if (mod && !allModifiers.includes(mod.toLowerCase())) allModifiers.push(mod);
    }
  }
  
  for (const pattern of specialInstructionPatterns) {
    const matches = customerText.matchAll(pattern);
    for (const match of matches) {
      const instruction = match[0].trim();
      if (instruction && !allSpecialInstructions.includes(instruction.toLowerCase())) allSpecialInstructions.push(instruction);
    }
  }
  
  if (items.length > 0) {
    if (allModifiers.length > 0) items[0].modifiers = allModifiers;
    if (allSpecialInstructions.length > 0) items[0].item_notes = allSpecialInstructions.join(", ");
  }
  
  if (items.length === 0 && rawText && !rawText.includes("to place an order")) {
    items.push({ name: rawText.substring(0, 100), qty: 1 });
  }
  
  // Extract total
  const totalPatterns = [
    /(?:total|total is|comes to|that(?:'ll| will) be|that's|your order is)\s*\$?(\d+(?:\.\d{2})?)/i,
    /\$(\d+(?:\.\d{2})?)\s*(?:total|altogether|in total)/i,
  ];
  
  let totalCents: number | null = null;
  for (const pattern of totalPatterns) {
    const totalMatch = allText.match(pattern);
    if (totalMatch) {
      const amount = parseFloat(totalMatch[1]);
      if (amount > 0 && amount < 10000) {
        totalCents = Math.round(amount * 100);
        break;
      }
    }
  }
  
  return { items, totalCents };
}

function buildSummaryFromTranscript(transcript: NonNullable<ElevenLabsWebhookPayload["transcript"]>, businessMode: string): string | null {
  if (!transcript.length) return null;
  
  const customerMessages = transcript.filter(t => t.role === "user").map(t => t.message).join(" ");
  const aiMessages = transcript.filter(t => t.role === "agent").map(t => t.message).join(" ");
  const parts: string[] = [];
  
  const nameMatch = customerMessages.match(/(?:my name is|this is|i'm|call me|name is)\s+([a-z]+)/i);
  if (nameMatch) parts.push(`Customer: ${nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1)}`);
  
  switch (businessMode) {
    case "food":
      if (customerMessages.match(/pickup|pick up/i)) parts.push("Order type: Pickup");
      else if (customerMessages.match(/delivery|deliver/i)) parts.push("Order type: Delivery");
      const foodKeywords = ["pizza", "pasta", "burger", "sandwich", "salad", "soup", "wings", "fries", "drink", "pepsi", "coke", "soda"];
      const mentionedItems = foodKeywords.filter(item => customerMessages.toLowerCase().includes(item));
      if (mentionedItems.length > 0) parts.push(`Items: ${mentionedItems.join(", ")}`);
      if (aiMessages.match(/order.*(?:ready|placed|confirmed|got it)/i)) parts.push("Status: Order confirmed");
      break;
    case "service":
      const serviceMatch = customerMessages.match(/(?:need|want|book|schedule).*?(?:detail|wash|clean|repair|service|appointment)/i);
      if (serviceMatch) parts.push(`Service: ${serviceMatch[0]}`);
      break;
    case "dispatch":
      if (customerMessages.match(/tow|broke down/i)) parts.push("Job: Towing");
      else if (customerMessages.match(/jump|battery/i)) parts.push("Job: Jump start");
      else if (customerMessages.match(/flat|tire/i)) parts.push("Job: Tire change");
      else if (customerMessages.match(/lock|keys/i)) parts.push("Job: Lockout");
      break;
    default:
      const reasonMatch = customerMessages.match(/(?:calling about|need|want|looking for)\s+(.{10,50}?)(?:\.|,|$)/i);
      if (reasonMatch) parts.push(`Reason: ${reasonMatch[1].trim()}`);
  }
  
  return parts.length > 0 ? parts.join(". ") + "." : null;
}

function extractFromTranscript(transcript: ElevenLabsWebhookPayload["transcript"], type: "name" | "service"): string | null {
  if (!transcript?.length) return null;

  const customerMessages = transcript.filter(t => t.role === "user").map(t => t.message).join(" ");

  if (type === "name") {
    const namePatterns = [/my name is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i, /this is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i, /i'm ([A-Z][a-z]+)/i, /i am ([A-Z][a-z]+)/i, /call me ([A-Z][a-z]+)/i];
    for (const pattern of namePatterns) {
      const match = customerMessages.match(pattern);
      if (match) return match[1];
    }
  }

  if (type === "service") {
    const servicePatterns = [/need (?:a )?(.+?(?:tow|jump|tire|lockout|delivery|repair|service|detail|wash|clean|cut))/i, /looking for (?:a )?(.+?(?:tow|jump|tire|lockout|delivery|repair|service|detail|wash|clean|cut))/i];
    for (const pattern of servicePatterns) {
      const match = customerMessages.match(pattern);
      if (match) return typeof match[1] === "string" ? match[1] : match[0];
    }
  }

  return null;
}

function extractStructuredDataFromTranscript(transcript: NonNullable<ElevenLabsWebhookPayload["transcript"]>, businessMode: string): Record<string, unknown> {
  const extracted: Record<string, unknown> = {};
  const customerMessages = transcript.filter(t => t.role === "user").map(t => t.message.toLowerCase()).join(" ");
  const allMessages = transcript.map(t => t.message.toLowerCase()).join(" ");
  
  // Extract customer name
  const nameMatch = customerMessages.match(/(?:my name is|this is|i'm|i am|call me)\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (nameMatch) extracted.customer_name = nameMatch[1].split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  
  // Extract callback number
  const phoneMatch = customerMessages.match(/(?:call me (?:back )?at|my number is|reach me at)\s*([\d\-\(\)\s]+)/);
  if (phoneMatch) extracted.callback_number = phoneMatch[1].replace(/\D/g, "");
  
  switch (businessMode) {
    case "food":
      // Reservation detection
      const reservationPatterns = [/(?:table|reservation|party)\s+(?:for|of)\s+(\d+)/i, /(\d+)\s+(?:people|guests|persons?)\s+(?:for|on|this)/i, /book(?:ing)?\s+(?:a\s+)?table/i, /make\s+(?:a\s+)?reservation/i];
      
      let isReservation = false;
      let partySizeFromTranscript: number | null = null;
      
      for (const pattern of reservationPatterns) {
        const match = customerMessages.match(pattern);
        if (match) {
          isReservation = true;
          if (match[1]) partySizeFromTranscript = parseInt(match[1]);
          break;
        }
      }
      
      const largeParyMatch = customerMessages.match(/(\d+)\s*(?:people|guests|of us)/i);
      if (largeParyMatch) {
        const size = parseInt(largeParyMatch[1]);
        if (size >= 4) {
          isReservation = true;
          partySizeFromTranscript = size;
        }
      }
      
      if (isReservation) {
        extracted._reservation_detected = true;
        if (partySizeFromTranscript) extracted.party_size = String(partySizeFromTranscript);
        
        const resDateMatch = customerMessages.match(/(?:on|for|this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)/i);
        if (resDateMatch) extracted.reservation_date = resDateMatch[1];
        
        const resTimeMatch = customerMessages.match(/(?:at|around|about)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
        if (resTimeMatch) extracted.reservation_time = resTimeMatch[1];
        
        if (allMessages.includes("reservation") && (allMessages.includes("confirm") || allMessages.includes("booked") || allMessages.includes("see you"))) {
          extracted.reservation_confirmed = "true";
        }
        break;
      }
      
      // Order detection
      if (allMessages.includes("order") && (allMessages.includes("confirm") || allMessages.includes("placed") || allMessages.includes("ready"))) {
        extracted.order_confirmed = "true";
      }
      if (customerMessages.includes("delivery")) extracted.order_type = "delivery";
      else if (customerMessages.includes("pickup")) extracted.order_type = "pickup";
      
      const foodItems: string[] = [];
      const foodPatterns = [/(?:i(?:'d| would) like|order|want|get me|have)\s+(?:a|an|the|some)?\s*(\d*\s*[a-z\s]+)/gi];
      for (const pattern of foodPatterns) {
        const matches = customerMessages.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].length > 2 && match[1].length < 50) foodItems.push(match[1].trim());
        }
      }
      if (foodItems.length > 0) extracted.items_raw = foodItems.join(", ");
      break;
      
    case "service":
      const servicePatterns = [/(?:need|want|looking for|schedule|book)\s+(?:a|an)?\s*([a-z\s]+(?:service|appointment|cleaning|repair|maintenance|consultation))/i];
      for (const pattern of servicePatterns) {
        const match = customerMessages.match(pattern);
        if (match) { extracted.service_requested = match[1].trim(); break; }
      }
      const dateMatch = customerMessages.match(/(?:on|for|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)/i);
      if (dateMatch) extracted.preferred_date = dateMatch[1];
      const timeMatch = customerMessages.match(/(?:at|around|about)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (timeMatch) extracted.preferred_time = timeMatch[1];
      break;
      
    case "dispatch":
      const pickupMatch = customerMessages.match(/(?:pick(?:ing)? (?:me )?up|from|at)\s+(\d+\s+[a-z\s]+(?:street|st|avenue|ave|road|rd))/i);
      if (pickupMatch) extracted.pickup_address = pickupMatch[1];
      const dropoffMatch = customerMessages.match(/(?:to|drop(?:ping)? (?:me )?(?:off|at)|going to|destination)\s+(\d+\s+[a-z\s]+(?:street|st|avenue|ave|road|rd))/i);
      if (dropoffMatch) extracted.dropoff_address = dropoffMatch[1];
      if (customerMessages.includes("urgent") || customerMessages.includes("emergency") || customerMessages.includes("asap")) extracted.urgency = "high";
      if (customerMessages.includes("tow") || customerMessages.includes("broke down")) extracted.job_type = "tow";
      else if (customerMessages.includes("jump") || customerMessages.includes("battery")) extracted.job_type = "jump_start";
      else if (customerMessages.includes("flat") || customerMessages.includes("tire")) extracted.job_type = "tire_change";
      else if (customerMessages.includes("lock") || customerMessages.includes("keys")) extracted.job_type = "lockout";
      break;
      
    case "medical":
      if (customerMessages.includes("new patient") || customerMessages.includes("first time")) extracted.is_new_patient = "true";
      const apptMatch = customerMessages.match(/(?:need|want|schedule|book)\s+(?:a|an)?\s*([a-z\s]+(?:appointment|checkup|consultation|exam|visit))/i);
      if (apptMatch) extracted.appointment_type = apptMatch[1].trim();
      break;
      
    default:
      const reasonMatch = customerMessages.match(/(?:calling about|reason for calling|need help with|question about)\s+(.+?)(?:\.|$)/i);
      if (reasonMatch) extracted.service_requested = reasonMatch[1].trim();
  }
  
  return extracted;
}

// ===== PERSIST CALLBACK REQUEST =====
// Ensures no callback request is ever lost — previously discarded at routing.
// deno-lint-ignore no-explicit-any
async function persistCallback(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string,
  payload: CanonicalPayload,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string
): Promise<{ id: string } | null> {
  console.log(`[persistCallback] Creating callback request for ${customerName || callerPhoneE164}`);

  const { data: callback, error } = await supabase
    .from("callback_requests")
    .insert({
      tenant_id: tenantId,
      session_id: sessionId,
      customer_id: customerId,
      customer_name: customerName || "Phone Customer",
      customer_phone: callerPhoneE164 || null,
      best_time: payload.callback.best_time,
      message: payload.callback.message,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[persistCallback] Failed:", error);
    return null;
  }

  console.log(`[persistCallback] Created callback request: ${callback.id}`);

  // Trigger workflow
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({
        tenant_id: tenantId,
        trigger: "callback.created",
        entity_type: "callback",
        entity_id: callback.id,
        session_id: sessionId,
        customer: customerId ? { id: customerId, name: customerName, phone: callerPhoneE164 } : undefined,
        details: { best_time: payload.callback.best_time, message: payload.callback.message },
      }),
    });
  } catch (e) {
    console.error("[persistCallback] Failed to trigger workflow:", e);
  }

  // Trigger notification to owner via universal-delivery
  try {
    await fetch(`${supabaseUrl}/functions/v1/universal-delivery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        entity_type: "callback",
        entity_id: callback.id,
      }),
    });
  } catch (e) {
    console.warn("[persistCallback] Failed to trigger callback notification:", e);
  }

  return callback;
}

// ===== PERSIST MEDICAL INTAKE =====
// Creates medical_intakes record AND a booking for medical mode.
// deno-lint-ignore no-explicit-any
async function persistMedicalIntake(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string,
  payload: CanonicalPayload,
  customerName: string | null,
  customerId: string | null,
  callerPhoneE164: string
): Promise<{ id: string } | null> {
  console.log(`[persistMedicalIntake] Creating intake + booking for ${customerName || callerPhoneE164}`);

  // Extract medical-specific fields from raw data collection or transcript
  const rawKeys = payload._meta?.raw_data_collection_keys || [];
  const intakeType = rawKeys.includes("new_patient") ? "new_patient" :
                     rawKeys.includes("follow_up") ? "follow_up" :
                     rawKeys.includes("prescription") ? "prescription_refill" : "appointment_request";
  const urgencyLevel = rawKeys.includes("urgent") ? "urgent" :
                       rawKeys.includes("soon") ? "soon" : "routine";

  // Create medical intake record
  const { data: intake, error } = await supabase
    .from("medical_intakes")
    .insert({
      tenant_id: tenantId,
      call_session_id: sessionId,
      customer_id: customerId,
      intake_type: intakeType,
      urgency_level: urgencyLevel,
      reason_for_visit: payload.booking.notes || payload.booking.service_requested || null,
      preferred_date: payload.booking.preferred_date || null,
      preferred_time_range: payload.booking.preferred_time || null,
      verbal_consent_given: false, // Conservative default
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[persistMedicalIntake] Failed:", error);
    return null;
  }

  console.log(`[persistMedicalIntake] Created medical intake: ${intake.id}`);

  // Also create a booking (medical appointments need scheduling)
  try {
    await persistBooking(supabase, supabaseUrl, supabaseKey, tenantId, sessionId, payload, customerName, customerId, callerPhoneE164);
  } catch (e) {
    console.warn("[persistMedicalIntake] Booking side-effect failed (intake still created):", e);
  }

  // Trigger workflow
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
      body: JSON.stringify({
        tenant_id: tenantId,
        trigger: "intake.created",
        entity_type: "medical_intake",
        entity_id: intake.id,
        session_id: sessionId,
        customer: customerId ? { id: customerId, name: customerName, phone: callerPhoneE164 } : undefined,
        details: { intake_type: intakeType, urgency_level: urgencyLevel },
      }),
    });
  } catch (e) {
    console.error("[persistMedicalIntake] Failed to trigger workflow:", e);
  }

  // Trigger notification via universal-delivery (supports HIPAA redaction)
  try {
    await fetch(`${supabaseUrl}/functions/v1/universal-delivery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        entity_type: "intake",
        entity_id: intake.id,
      }),
    });
  } catch (e) {
    console.warn("[persistMedicalIntake] Failed to trigger intake notification:", e);
  }

  return intake;
}

// ===== PERSIST TEST DRIVE =====
// deno-lint-ignore no-explicit-any
async function persistTestDrive(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string,
  payload: CanonicalPayload,
  customerName: string | null,
  customerId: string | null,
  _callerPhoneE164: string
): Promise<{ id: string } | null> {
  console.log(`[persistTestDrive] Creating test drive for ${customerName || _callerPhoneE164}`);

  const sales = payload.sales;

  // Parse scheduled_at from preferred_date + preferred_time
  let scheduledAt: string | null = null;
  const dateStr = sales.preferred_date || payload.booking.preferred_date;
  const timeStr = sales.preferred_time || payload.booking.preferred_time;
  if (dateStr && timeStr) {
    scheduledAt = `${dateStr}T${timeStr}:00`;
  } else if (dateStr) {
    scheduledAt = `${dateStr}T09:00:00`;
  }

  const { data: testDrive, error } = await supabase
    .from("test_drives")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      session_id: sessionId,
      vehicle_interest: sales.vehicle_interest || null,
      scheduled_at: scheduledAt,
      scheduled_date: dateStr || null,
      scheduled_time: timeStr || null,
      sales_rep_requested: null,
      trade_in_interest: sales.has_trade_in,
      trade_in_vehicle_info: sales.trade_in_details || null,
      financing_interest: sales.financing_interest,
      budget_range: sales.budget_range || null,
      status: "pending",
      notes: payload.booking.notes || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[persistTestDrive] Failed:", error);
    return null;
  }

  console.log(`[persistTestDrive] Created test drive: ${testDrive.id}`);

  // Trigger test-drive-handoff
  try {
    await fetch(`${supabaseUrl}/functions/v1/test-drive-handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        test_drive_id: testDrive.id,
        session_id: sessionId,
      }),
    });
  } catch (e) {
    console.warn("[persistTestDrive] Failed to trigger handoff:", e);
  }

  return testDrive;
}

// ===== PERSIST SALES LEAD =====
// deno-lint-ignore no-explicit-any
async function persistSalesLead(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  sessionId: string,
  payload: CanonicalPayload,
  customerName: string | null,
  customerId: string | null,
  _callerPhoneE164: string
): Promise<{ id: string; lead_number?: string } | null> {
  console.log(`[persistSalesLead] Creating sales lead for ${customerName || _callerPhoneE164}`);

  const sales = payload.sales;

  // Generate lead number: SL-NNN
  const { count } = await supabase
    .from("sales_leads")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  const leadNumber = `SL-${String((count || 0) + 1).padStart(3, "0")}`;

  // Determine priority
  let priority = "normal";
  if (sales.timeline === "immediate") priority = "hot";
  else if (sales.timeline === "this_week") priority = "high";

  const { data: salesLead, error } = await supabase
    .from("sales_leads")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      session_id: sessionId,
      lead_number: leadNumber,
      interest_type: sales.interest_type || "general",
      vehicle_interest: sales.vehicle_interest || null,
      budget_range: sales.budget_range || null,
      timeline: sales.timeline || null,
      financing_preapproved: false,
      has_trade_in: sales.has_trade_in,
      trade_in_details: sales.trade_in_details || null,
      status: "new",
      priority,
      source: "ai_call",
      notes: payload.booking.notes || null,
    })
    .select("id, lead_number")
    .single();

  if (error) {
    console.error("[persistSalesLead] Failed:", error);
    return null;
  }

  console.log(`[persistSalesLead] Created sales lead: ${salesLead.id} (${leadNumber})`);

  // Trigger sales-lead-handoff
  try {
    await fetch(`${supabaseUrl}/functions/v1/sales-lead-handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        sales_lead_id: salesLead.id,
        session_id: sessionId,
      }),
    });
  } catch (e) {
    console.warn("[persistSalesLead] Failed to trigger handoff:", e);
  }

  return salesLead;
}
