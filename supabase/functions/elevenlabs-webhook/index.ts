import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-elevenlabs-signature",
};

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
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Capture raw body for robust parsing
  let rawBody = "";
  let parsedPayload: Record<string, unknown> = {};
  
  try {
    rawBody = await req.text();
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
    // Return 200 to prevent retries
    return new Response(
      JSON.stringify({ status: "error", reason: "parse_failed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Robustly parse conversation_id and event type first
    const conversationId = parseConversationId(parsedPayload);
    const eventType = parseEventType(parsedPayload);
    
    // Build typed payload with parsed values
    const payload: ElevenLabsWebhookPayload = {
      type: eventType,
      conversation_id: conversationId,
      agent_id: typeof parsedPayload.agent_id === "string" ? parsedPayload.agent_id : "",
      transcript: Array.isArray(parsedPayload.transcript) ? parsedPayload.transcript as ElevenLabsWebhookPayload["transcript"] : undefined,
      analysis: parsedPayload.analysis as ElevenLabsWebhookPayload["analysis"],
      metadata: parsedPayload.metadata as ElevenLabsWebhookPayload["metadata"],
      dynamic_variables: parsedPayload.dynamic_variables as ElevenLabsWebhookPayload["dynamic_variables"],
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
      }
    );

    // Check for conversation ended events (various formats)
    const isConversationEnded = 
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
  const dataCollection = analysis.data_collection || {};
  
  // ===== EXTRACT CUSTOMER INFO =====
  const customerName = 
    dataCollection.customer_name ||
    dataCollection.name ||
    dataCollection.caller_name ||
    extractFromTranscript(payload.transcript, "name") ||
    null;

  const serviceRequested =
    dataCollection.service_requested ||
    dataCollection.service ||
    dataCollection.reason ||
    dataCollection.inquiry_type ||
    extractFromTranscript(payload.transcript, "service") ||
    null;

  // ===== DETERMINE OUTCOME BASED ON BUSINESS MODE =====
  let outcome: string = "lost";
  
  // Check for mode-specific outcomes first
  if (tenantBusinessMode === "food") {
    if (dataCollection.order_confirmed === "true" || dataCollection.order_confirmed === "yes" || dataCollection.order_items) {
      outcome = "order";
    }
  } else if (tenantBusinessMode === "dispatch") {
    if (dataCollection.job_created === "true" || dataCollection.dispatch_confirmed === "true" || dataCollection.pickup_address) {
      outcome = "dispatch";
    }
  }
  
  // Generic outcomes
  if (outcome === "lost") {
    if (analysis.call_successful === true || dataCollection.booking_confirmed === "true" || dataCollection.booking_confirmed === "yes") {
      outcome = "booked";
    } else if (dataCollection.callback_requested === "true" || dataCollection.callback_requested === "yes") {
      outcome = "followup";
    } else if (dataCollection.message_taken === "true") {
      outcome = "message";
    } else if (analysis.call_successful === false) {
      outcome = "lost";
    } else if (customerName || serviceRequested) {
      outcome = "lead_captured";
    }
  }

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
      summary: analysis.summary || null,
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
    has_summary: !!analysis.summary,
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
    hasSummary: !!analysis.summary, 
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

  // ===== TRIGGER CALL.ENDED WORKFLOW =====
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        trigger: "call.ended",
        entity_type: "call",
        entity_id: sessionId,
        location_id: locationId,
      }),
    });
    console.log("Triggered call.ended workflow for session:", sessionId);
  } catch (e) {
    console.error("Failed to trigger call.ended workflow:", e);
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

  // ===== PROCESS FOOD ORDER IF APPLICABLE =====
  if (tenantId && (tenantBusinessMode === "food" || outcome === "order")) {
    await processFoodOrderIfApplicable(supabase, supabaseUrl, supabaseKey, tenantId, dataCollection, customerName, customerId, payload, extractedPayload);
  }
}

// Build extracted payload based on business mode
// Includes server-side extraction fallback when ElevenLabs doesn't provide structured data
function buildExtractedPayload(
  businessMode: string,
  dataCollection: Record<string, string>,
  transcript?: ElevenLabsWebhookPayload["transcript"]
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  
  // Always include common fields
  if (dataCollection.customer_name || dataCollection.name) {
    payload.customer_name = dataCollection.customer_name || dataCollection.name;
  }
  if (dataCollection.callback_number) {
    payload.callback_number = dataCollection.callback_number;
  }
  if (dataCollection.notes || dataCollection.special_instructions) {
    payload.notes = dataCollection.notes || dataCollection.special_instructions;
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
    case "food":
      // Food mode: order items, modifiers, totals, pickup/delivery, address
      if (dataCollection.order_items || dataCollection.items) {
        try {
          const items = dataCollection.order_items || dataCollection.items;
          payload.items = typeof items === "string" ? JSON.parse(items) : items;
        } catch {
          payload.items_raw = dataCollection.order_items || dataCollection.items;
        }
      }
      if (dataCollection.order_type) payload.order_type = dataCollection.order_type;
      if (dataCollection.delivery_address) payload.delivery_address = dataCollection.delivery_address;
      if (dataCollection.pickup_time || dataCollection.requested_time) {
        payload.requested_time = dataCollection.pickup_time || dataCollection.requested_time;
      }
      if (dataCollection.total_estimate) payload.total_estimate = dataCollection.total_estimate;
      if (dataCollection.special_instructions) payload.special_instructions = dataCollection.special_instructions;
      if (dataCollection.modifiers) {
        try {
          payload.modifiers = typeof dataCollection.modifiers === "string" ? JSON.parse(dataCollection.modifiers) : dataCollection.modifiers;
        } catch {
          payload.modifiers_raw = dataCollection.modifiers;
        }
      }
      break;
      
    case "service":
      // Service mode: service requested, schedule preference, intake fields
      if (dataCollection.service_requested || dataCollection.service) {
        payload.service_requested = dataCollection.service_requested || dataCollection.service;
      }
      if (dataCollection.preferred_date || dataCollection.schedule_date) {
        payload.preferred_date = dataCollection.preferred_date || dataCollection.schedule_date;
      }
      if (dataCollection.preferred_time || dataCollection.schedule_time) {
        payload.preferred_time = dataCollection.preferred_time || dataCollection.schedule_time;
      }
      if (dataCollection.address || dataCollection.service_address) {
        payload.address = dataCollection.address || dataCollection.service_address;
      }
      if (dataCollection.vehicle) payload.vehicle = dataCollection.vehicle;
      if (dataCollection.vehicle_year) payload.vehicle_year = dataCollection.vehicle_year;
      if (dataCollection.vehicle_make) payload.vehicle_make = dataCollection.vehicle_make;
      if (dataCollection.vehicle_model) payload.vehicle_model = dataCollection.vehicle_model;
      // Capture any additional intake fields
      for (const key of Object.keys(dataCollection)) {
        if (key.startsWith("intake_") || key.startsWith("custom_")) {
          payload[key] = dataCollection[key];
        }
      }
      break;
      
    case "dispatch":
      // Dispatch mode: pickup/dropoff, vehicle, urgency
      if (dataCollection.pickup_address) payload.pickup_address = dataCollection.pickup_address;
      if (dataCollection.dropoff_address) payload.dropoff_address = dataCollection.dropoff_address;
      if (dataCollection.vehicle_type || dataCollection.vehicle) {
        payload.vehicle = dataCollection.vehicle_type || dataCollection.vehicle;
      }
      if (dataCollection.is_drivable !== undefined) {
        payload.is_drivable = dataCollection.is_drivable === "true" || dataCollection.is_drivable === "yes";
      }
      if (dataCollection.urgency || dataCollection.priority) {
        payload.urgency = dataCollection.urgency || dataCollection.priority;
      }
      if (dataCollection.job_type) payload.job_type = dataCollection.job_type;
      if (dataCollection.eta_requested) payload.eta_requested = dataCollection.eta_requested;
      break;
      
    case "medical":
      // Medical mode: minimal intake, no PHI stored
      if (dataCollection.appointment_type) payload.appointment_type = dataCollection.appointment_type;
      if (dataCollection.is_new_patient !== undefined) {
        payload.is_new_patient = dataCollection.is_new_patient === "true" || dataCollection.is_new_patient === "yes";
      }
      if (dataCollection.preferred_date) payload.preferred_date = dataCollection.preferred_date;
      if (dataCollection.callback_requested !== undefined) {
        payload.callback_requested = dataCollection.callback_requested === "true";
      }
      // Do NOT store symptoms or other PHI
      break;
      
    default:
      // General mode: service/reason
      if (dataCollection.service_requested || dataCollection.reason) {
        payload.service_requested = dataCollection.service_requested || dataCollection.reason;
      }
      if (dataCollection.message) payload.message = dataCollection.message;
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

  const orderConfirmed = dataCollection.order_confirmed === "true" || dataCollection.order_confirmed === "yes";
  const orderItems = dataCollection.order_items || dataCollection.items;
  
  if (!orderConfirmed && !orderItems) return;

  console.log("Processing food order for tenant:", tenantId);

  let parsedItems: Array<{ name: string; qty: number; modifiers?: string[]; item_notes?: string }> = [];
  try {
    if (typeof orderItems === "string") {
      try {
        parsedItems = JSON.parse(orderItems);
      } catch {
        parsedItems = orderItems.split(/[,\n]/).filter(Boolean).map(item => ({
          name: item.trim(),
          qty: 1,
        }));
      }
    }
  } catch (e) {
    console.error("Failed to parse order items:", e);
  }
  
  // Use items from extracted payload if available
  if (Array.isArray(extractedPayload.items)) {
    parsedItems = extractedPayload.items as typeof parsedItems;
  }

  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const hasUncertainty = dataCollection.needs_clarification === "true" || 
    dataCollection.uncertain === "true" ||
    (parsedItems.length === 0 && orderItems);
  
  const status = hasUncertainty ? "needs_followup" : "confirmed";

  const { data: newOrder, error: orderError } = await supabase
    .from("food_orders")
    .insert({
      tenant_id: tenantId,
      order_number: orderNumber,
      order_type: (extractedPayload.order_type as string) || dataCollection.order_type || "pickup",
      status,
      customer_id: customerId,
      customer_name: customerName || dataCollection.customer_name || "Phone Customer",
      customer_phone: payload.dynamic_variables?.caller_phone || null,
      items_json: parsedItems.length > 0 ? parsedItems : [{ name: "Order details in special instructions", qty: 1 }],
      special_instructions: (extractedPayload.special_instructions as string) || dataCollection.special_instructions || 
        (orderItems && parsedItems.length === 0 ? `Customer order: ${orderItems}` : null),
      requested_time: dataCollection.requested_time ? new Date(dataCollection.requested_time).toISOString() : null,
      delivery_address: (extractedPayload.delivery_address as string) || dataCollection.delivery_address || null,
      address_json: (extractedPayload.delivery_address || dataCollection.delivery_address) ? { street: extractedPayload.delivery_address || dataCollection.delivery_address } : null,
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
