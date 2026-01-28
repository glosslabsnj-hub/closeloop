import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-elevenlabs-signature",
};

/**
 * ElevenLabs Webhook Handler
 * 
 * This endpoint receives post-call data from ElevenLabs after a conversation ends.
 * It updates the ai_call_sessions table with:
 * - Transcript
 * - Summary  
 * - Customer name (extracted from conversation)
 * - Service requested (extracted from conversation)
 * - Outcome (booked, followup, lost, etc.)
 * 
 * Webhook should be configured in ElevenLabs dashboard to POST to:
 * {SUPABASE_URL}/functions/v1/elevenlabs-webhook
 */

interface ElevenLabsWebhookPayload {
  type: string;
  conversation_id: string;
  agent_id: string;
  
  // Conversation data
  transcript?: {
    role: "user" | "agent";
    message: string;
    timestamp?: number;
  }[];
  
  // Analysis/summary
  analysis?: {
    summary?: string;
    data_collection?: Record<string, string>;
    call_successful?: boolean;
    customer_satisfaction?: string;
  };
  
  // Metadata
  metadata?: {
    call_duration_secs?: number;
    start_time?: string;
    end_time?: string;
  };
  
  // Dynamic variables passed at call start
  dynamic_variables?: {
    tenant_id?: string;
    caller_phone?: string;
    business_name?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
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

    // Only process conversation.ended or similar events
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

    // Find the call session by ElevenLabs conversation ID
    const { data: session, error: sessionError } = await supabase
      .from("ai_call_sessions")
      .select("id, tenant_id, context_json")
      .eq("elevenlabs_conversation_id", payload.conversation_id)
      .single();

    if (sessionError || !session) {
      console.error("Session not found for conversation:", payload.conversation_id);
      
      // Try to find by recent caller phone if available
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
          await processCallData(supabase, fallbackSession.id, fallbackSession.context_json, payload);
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

    await processCallData(supabase, session.id, session.context_json, payload);

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
  sessionId: string,
  existingContext: Record<string, unknown> | null,
  payload: ElevenLabsWebhookPayload
) {
  // Build full transcript text
  const transcriptText = payload.transcript
    ?.map(t => `${t.role === "user" ? "Customer" : "AI"}: ${t.message}`)
    .join("\n") || null;

  // Extract customer info from analysis or transcript
  const analysis = payload.analysis || {};
  const dataCollection = analysis.data_collection || {};
  
  // Try to extract customer name from various sources
  const customerName = 
    dataCollection.customer_name ||
    dataCollection.name ||
    dataCollection.caller_name ||
    extractFromTranscript(payload.transcript, "name") ||
    null;

  // Try to extract service requested
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

  // Merge extracted data into context
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

  console.log("Updated session:", sessionId, {
    outcome,
    hasTranscript: !!transcriptText,
    hasSummary: !!analysis.summary,
    customerName,
    serviceRequested,
  });

  // Check if this is a food order - create food_order record if applicable
  const tenantId = payload.dynamic_variables?.tenant_id || (existingContext as Record<string, unknown>)?.tenant_id;
  if (tenantId) {
    await processFoodOrderIfApplicable(supabase, String(tenantId), dataCollection, customerName, payload);
  }
}

// Process food orders from AI calls
// deno-lint-ignore no-explicit-any
async function processFoodOrderIfApplicable(
  supabase: any,
  tenantId: string,
  dataCollection: Record<string, string>,
  customerName: string | null,
  payload: ElevenLabsWebhookPayload
) {
  // Check if tenant is in food mode
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

  // Check if there's order data in the collection
  const orderConfirmed = dataCollection.order_confirmed === "true" || dataCollection.order_confirmed === "yes";
  const orderItems = dataCollection.order_items || dataCollection.items;
  
  if (!orderConfirmed && !orderItems) return;

  console.log("Processing food order for tenant:", tenantId);

  // Parse order items if provided as string
  let parsedItems: Array<{ name: string; qty: number; modifiers?: string[]; item_notes?: string }> = [];
  try {
    if (typeof orderItems === "string") {
      // Try to parse as JSON first
      try {
        parsedItems = JSON.parse(orderItems);
      } catch {
        // If not JSON, split by comma/newline and create simple items
        parsedItems = orderItems.split(/[,\n]/).filter(Boolean).map(item => ({
          name: item.trim(),
          qty: 1,
        }));
      }
    }
  } catch (e) {
    console.error("Failed to parse order items:", e);
  }

  // Generate order number
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

  // Determine status based on certainty
  const hasUncertainty = dataCollection.needs_clarification === "true" || 
    dataCollection.uncertain === "true" ||
    (parsedItems.length === 0 && orderItems);
  
  const status = hasUncertainty ? "needs_followup" : "confirmed";

  // Create the food order
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

  // Trigger order handoff
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    await fetch(`${supabaseUrl}/functions/v1/order-handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
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

/**
 * Simple extraction from transcript - looks for patterns like:
 * "My name is John" or "I need a tow"
 */
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
    // Look for "My name is X" or "This is X" or "I'm X"
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
    // Look for service keywords
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
