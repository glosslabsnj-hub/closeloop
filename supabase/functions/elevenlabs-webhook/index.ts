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
  };
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

    // Find the call session
    const { data: session, error: sessionError } = await supabase
      .from("ai_call_sessions")
      .select("id, tenant_id, context_json")
      .eq("elevenlabs_conversation_id", payload.conversation_id)
      .single();

    if (sessionError || !session) {
      console.error("Session not found for conversation:", payload.conversation_id);
      
      // Try fallback by phone
      if (payload.dynamic_variables?.caller_phone && payload.dynamic_variables?.tenant_id) {
        const { data: fallbackSession } = await supabase
          .from("ai_call_sessions")
          .select("id, tenant_id, context_json")
          .eq("tenant_id", payload.dynamic_variables.tenant_id)
          .eq("caller_phone", payload.dynamic_variables.caller_phone)
          .is("elevenlabs_conversation_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
          
        if (fallbackSession) {
          console.log("Found fallback session by phone:", fallbackSession.id);
          await processCallData(supabase, supabaseUrl, supabaseKey, fallbackSession.id, fallbackSession.tenant_id, fallbackSession.context_json, payload);
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

    await processCallData(supabase, supabaseUrl, supabaseKey, session.id, session.tenant_id, session.context_json, payload);

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

// deno-lint-ignore no-explicit-any
async function processCallData(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  sessionId: string,
  tenantId: string,
  existingContext: Record<string, unknown> | null,
  payload: ElevenLabsWebhookPayload
) {
  const transcriptText = payload.transcript
    ?.map(t => `${t.role === "user" ? "Customer" : "AI"}: ${t.message}`)
    .join("\n") || null;

  const analysis = payload.analysis || {};
  const dataCollection = analysis.data_collection || {};
  
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

  const updatedContext = {
    ...existingContext,
    customer_name: customerName || (existingContext as Record<string, unknown>)?.customer_name,
    service_requested: serviceRequested || (existingContext as Record<string, unknown>)?.service_requested,
    booking_confirmed: outcome === "booked",
    call_duration_secs: payload.metadata?.call_duration_secs,
    ...dataCollection,
  };

  // Update the session
  const { error: updateError } = await supabase
    .from("ai_call_sessions")
    .update({
      transcript: transcriptText,
      summary: analysis.summary || null,
      outcome: outcome,
      ended_at: payload.metadata?.end_time || new Date().toISOString(),
      context_json: updatedContext,
      elevenlabs_conversation_id: payload.conversation_id,
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("Failed to update session:", updateError);
    throw updateError;
  }

  console.log("Updated session:", sessionId, { outcome, hasTranscript: !!transcriptText, hasSummary: !!analysis.summary });

  // Record audit event for call ended
  try {
    await fetch(`${supabaseUrl}/functions/v1/record-audit-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        event_type: "call.ended",
        entity_type: "call",
        entity_id: sessionId,
        actor_type: "ai",
        payload: {
          outcome,
          duration_secs: payload.metadata?.call_duration_secs,
          customer_name: customerName,
          service_requested: serviceRequested,
        },
      }),
    });
  } catch (e) {
    console.error("Failed to record call.ended audit event:", e);
  }

  // Record observations from the call (confidence >= 0.65 threshold)
  const callerPhone = payload.dynamic_variables?.caller_phone;
  
  // Observation 1: Service preference
  if (serviceRequested && outcome !== "lost") {
    try {
      await fetch(`${supabaseUrl}/functions/v1/record-observation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          tenantId,
          observationType: "service_pattern",
          subjectKey: `service_${serviceRequested.toLowerCase().replace(/\s+/g, "_").substring(0, 30)}`,
          observation: `Customer inquired about ${serviceRequested}`,
        }),
      });
    } catch (e) {
      console.error("Failed to record service observation:", e);
    }
  }

  // Observation 2: Time pattern (what hour/day they called)
  const callHour = new Date().getHours();
  const callDay = new Date().getDay();
  if (outcome === "booked" || outcome === "lead_captured") {
    try {
      await fetch(`${supabaseUrl}/functions/v1/record-observation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          tenantId,
          observationType: "time_pattern",
          subjectKey: `day_${callDay}_hour_${callHour}`,
          observation: `Successful engagement at ${callHour}:00 on day ${callDay}`,
        }),
      });
    } catch (e) {
      console.error("Failed to record time pattern observation:", e);
    }
  }

  // Observation 3: Customer preference (if explicit and not HIPAA-blocked)
  if (callerPhone && customerName && outcome === "booked") {
    try {
      await fetch(`${supabaseUrl}/functions/v1/record-observation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          tenantId,
          observationType: "customer_preference",
          subjectKey: `customer_${callerPhone.replace(/\D/g, "").slice(-10)}`,
          observation: `${customerName} booked ${serviceRequested || "service"} successfully`,
        }),
      });
    } catch (e) {
      console.error("Failed to record customer preference observation:", e);
    }
  }

  // Process food order if applicable
  if (tenantId) {
    await processFoodOrderIfApplicable(supabase, supabaseUrl, supabaseKey, tenantId, dataCollection, customerName, payload);
  }
}

// deno-lint-ignore no-explicit-any
async function processFoodOrderIfApplicable(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string,
  dataCollection: Record<string, string>,
  customerName: string | null,
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
        },
        // For confirmed orders, create a dispute-safe receipt
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
