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
