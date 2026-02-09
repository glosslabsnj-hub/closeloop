/**
 * analyze-call-outcome
 * 
 * Called by elevenlabs-webhook after processing a call.
 * Extracts outcome from canonical payload and stores conversion data.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  tenantId: string;
  sessionId: string;
  canonicalPayload: {
    intent?: string;
    booking?: {
      confirmed?: boolean;
      service_name?: string;
    };
    callback?: {
      requested?: boolean;
    };
    order?: {
      items?: unknown[];
      total_cents?: number;
    };
    dispatch?: {
      pickup_address?: string;
    };
    escalation?: {
      reason?: string;
    };
  };
  duration: number;
  transcript?: string;
}

function determineOutcome(payload: AnalyzeRequest["canonicalPayload"]): {
  outcomeType: string;
  aiHandledFully: boolean;
  conversionValueCents: number | null;
} {
  // Check for successful conversions first
  if (payload.booking?.confirmed) {
    return { outcomeType: "booked", aiHandledFully: true, conversionValueCents: null };
  }
  
  if (payload.order?.items && payload.order.items.length > 0) {
    return { 
      outcomeType: "order_placed", 
      aiHandledFully: true, 
      conversionValueCents: payload.order.total_cents || null 
    };
  }
  
  if (payload.dispatch?.pickup_address) {
    return { outcomeType: "dispatch_created", aiHandledFully: true, conversionValueCents: null };
  }
  
  if (payload.callback?.requested) {
    return { outcomeType: "callback_scheduled", aiHandledFully: true, conversionValueCents: null };
  }
  
  // Check for escalations/transfers
  if (payload.escalation?.reason) {
    return { outcomeType: "transferred", aiHandledFully: false, conversionValueCents: null };
  }
  
  // Default based on intent
  if (payload.intent === "faq" || payload.intent === "question") {
    return { outcomeType: "faq_answered", aiHandledFully: true, conversionValueCents: null };
  }
  
  // Unknown/other
  return { outcomeType: "other", aiHandledFully: true, conversionValueCents: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: AnalyzeRequest = await req.json();
    const { tenantId, sessionId, canonicalPayload, duration } = body;

    if (!tenantId || !sessionId) {
      return new Response(JSON.stringify({ error: "Missing tenantId or sessionId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { outcomeType, aiHandledFully, conversionValueCents } = determineOutcome(canonicalPayload || {});

    // Insert call outcome record
    const { data: outcome, error: outcomeError } = await supabase
      .from("call_outcomes")
      .insert({
        tenant_id: tenantId,
        session_id: sessionId,
        outcome_type: outcomeType,
        intent: canonicalPayload?.intent || null,
        service_requested: canonicalPayload?.booking?.service_name || null,
        conversion_value_cents: conversionValueCents,
        duration_seconds: duration || null,
        ai_handled_fully: aiHandledFully,
        escalation_reason: canonicalPayload?.escalation?.reason || null,
      })
      .select("id")
      .single();

    if (outcomeError) {
      console.error("[analyze-call-outcome] Failed to insert outcome:", outcomeError);
      throw outcomeError;
    }

    console.log(`[analyze-call-outcome] Recorded outcome ${outcomeType} for session ${sessionId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      outcomeId: outcome.id,
      outcomeType,
      aiHandledFully,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[analyze-call-outcome] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
