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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ElevenLabsWebhookPayload = await req.json();
    
    console.log("ElevenLabs webhook received:", JSON.stringify({
      type: payload.type,
      conversation_id: payload.conversation_id,
      agent_id: payload.agent_id,
      has_transcript: !!payload.transcript?.length,
      has_analysis: !!payload.analysis,
    }));

    if (payload.type !== "conversation.ended" && payload.type !== "conversation_ended") {
      console.log("Ignoring non-ended event type:", payload.type);
      return new Response(
        JSON.stringify({ status: "ignored", reason: "not conversation end event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the call session by conversation_id
    const { data: session, error: sessionError } = await supabase
      .from("ai_call_sessions")
      .select("id, tenant_id, context_json, customer_id, caller_phone")
      .eq("elevenlabs_conversation_id", payload.conversation_id)
      .single();

    if (sessionError || !session) {
      console.error("Session not found for conversation:", payload.conversation_id);
      
      // Try fallback by phone + tenant
      if (payload.dynamic_variables?.caller_phone && payload.dynamic_variables?.tenant_id) {
        const { data: fallbackSession } = await supabase
          .from("ai_call_sessions")
          .select("id, tenant_id, context_json, customer_id, caller_phone")
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
            JSON.stringify({ status: "success", session_id: fallbackSession.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      return new Response(
        JSON.stringify({ status: "error", reason: "session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await processCallData(supabase, supabaseUrl, supabaseKey, session, payload);

    return new Response(
      JSON.stringify({ status: "success", session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface SessionData {
  id: string;
  tenant_id: string;
  context_json: Record<string, unknown> | null;
  customer_id: string | null;
  caller_phone: string | null;
}

async function processCallData(
  // deno-lint-ignore no-explicit-any
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

  // Get intelligence settings for confidence thresholds
  const { data: intelligenceSettings } = await supabase
    .from("tenant_intelligence_settings")
    .select("memory_enabled, min_confidence_threshold")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  
  const memoryEnabled = intelligenceSettings?.memory_enabled === true;
  const minConfidence = intelligenceSettings?.min_confidence_threshold || 0.65;

  // Build transcript text
  const transcriptText = payload.transcript
    ?.map(t => `${t.role === "user" ? "Customer" : "AI"}: ${t.message}`)
    .join("\n") || null;

  const analysis = payload.analysis || {};
  const dataCollection = analysis.data_collection || {};
  
  // Extract customer info from call
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

  // Determine outcome
  let outcome: string = "lost";
  if (analysis.call_successful === true || dataCollection.booking_confirmed === "true" || dataCollection.booking_confirmed === "yes") {
    outcome = "booked";
  } else if (dataCollection.callback_requested === "true" || dataCollection.callback_requested === "yes") {
    outcome = "followup";
  } else if (analysis.call_successful === false) {
    outcome = "lost";
  } else if (customerName || serviceRequested) {
    outcome = "lead_captured";
  }

  // ===== CUSTOMER RESOLUTION & LINKING =====
  let customerId = session.customer_id;
  
  // If no customer linked yet, try to find/create one
  if (!customerId && callerPhoneE164 && !hipaaMode) {
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
      } else {
        // Just update last seen
        await supabase
          .from("customers")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", customerId);
      }
      console.log(`Linked to existing customer: ${customerId}`);
    } else if (customerName && callerPhoneE164) {
      // Create new customer
      const { data: newCustomer, error: createError } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenantId,
          full_name: customerName,
          phone_e164: callerPhoneE164,
          phone_raw: callerPhone,
          source: "ai_call",
        })
        .select("id")
        .single();

      if (!createError && newCustomer) {
        customerId = newCustomer.id;
        console.log(`Created new customer: ${customerId}`);
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

  // ===== UPDATE CALL SESSION =====
  const { error: updateError } = await supabase
    .from("ai_call_sessions")
    .update({
      transcript: transcriptText,
      summary: analysis.summary || null,
      outcome: outcome,
      ended_at: payload.metadata?.end_time || new Date().toISOString(),
      context_json: updatedContext,
      elevenlabs_conversation_id: payload.conversation_id,
      customer_id: customerId,
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("Failed to update session:", updateError);
    throw updateError;
  }

  console.log("Updated session:", sessionId, { outcome, hasTranscript: !!transcriptText, hasSummary: !!analysis.summary, customerId });

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
    if (outcome === "booked" || outcome === "lead_captured") {
      observations.push({
        type: "time_pattern",
        subjectKey: `day_${callDay}_hour_${callHour}`,
        observation: `Successful engagement at ${callHour}:00 on day ${callDay}`,
        confidence: 0.7,
      });
    }

    // Observation 3: Customer preference (ONLY if NOT HIPAA mode)
    if (!hipaaMode && callerPhoneE164 && customerName && outcome === "booked") {
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

  // ===== PROCESS FOOD ORDER IF APPLICABLE =====
  if (tenantId) {
    await processFoodOrderIfApplicable(supabase, supabaseUrl, supabaseKey, tenantId, dataCollection, customerName, customerId, payload);
  }
}

async function processFoodOrderIfApplicable(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  dataCollection: Record<string, string>,
  customerName: string | null,
  customerId: string | null,
  payload: ElevenLabsWebhookPayload
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
      order_type: dataCollection.order_type || "pickup",
      status,
      customer_id: customerId,
      customer_name: customerName || dataCollection.customer_name || "Phone Customer",
      customer_phone: payload.dynamic_variables?.caller_phone || null,
      items_json: parsedItems.length > 0 ? parsedItems : [{ name: "Order details in special instructions", qty: 1 }],
      special_instructions: dataCollection.special_instructions || 
        (orderItems && parsedItems.length === 0 ? `Customer order: ${orderItems}` : null),
      requested_time: dataCollection.requested_time ? new Date(dataCollection.requested_time).toISOString() : null,
      delivery_address: dataCollection.delivery_address || null,
      address_json: dataCollection.delivery_address ? { street: dataCollection.delivery_address } : null,
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
    ];
    
    for (const pattern of namePatterns) {
      const match = customerMessages.match(pattern);
      if (match) return match[1];
    }
  }

  if (type === "service") {
    const servicePatterns = [
      /need (?:a )?(.+?(?:tow|jump|tire|lockout|delivery|repair|service))/i,
      /looking for (?:a )?(.+?(?:tow|jump|tire|lockout|delivery|repair|service))/i,
      /want (?:a )?(.+?(?:tow|jump|tire|lockout|delivery|repair|service))/i,
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
