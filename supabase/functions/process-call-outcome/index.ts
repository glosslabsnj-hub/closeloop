/**
 * process-call-outcome
 *
 * Called after elevenlabs-webhook finishes processing a call.
 * Extracts a structured call_outcome record for conversion tracking
 * and fires pattern detection if enough data has accumulated.
 *
 * Payload:
 *   tenant_id, session_id, outcome, intent, service_requested,
 *   duration_seconds, customer_id, business_mode
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonHeaders, corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";

interface CallOutcomePayload {
  tenant_id: string;
  session_id: string;
  outcome: string;
  intent?: string;
  service_requested?: string;
  duration_seconds?: number;
  customer_id?: string;
  business_mode?: string;
  escalation_reason?: string;
}

/** Map ai_call_outcome enum values to call_outcomes.outcome_type */
function mapOutcomeType(outcome: string, intent?: string): string {
  switch (outcome) {
    case "booked": return "booked";
    case "order": return "order_placed";
    case "dispatch": return "dispatch_created";
    case "escalated": return "transferred";
    case "followup": return "callback_scheduled";
    case "message": return "voicemail";
    case "lead_captured": return "callback_scheduled";
    case "lost": {
      // Distinguish between hangup and FAQ-only calls
      if (intent === "faq" || intent === "hours_inquiry" || intent === "general_inquiry") {
        return "faq_answered";
      }
      return "hangup";
    }
    default: return "other";
  }
}

/** Estimate conversion value based on outcome and mode */
function estimateConversionValue(outcomeType: string, businessMode: string): number | null {
  if (outcomeType === "hangup" || outcomeType === "voicemail") return null;
  // Conservative estimates in cents - real values come from actual bookings
  switch (outcomeType) {
    case "booked":
      switch (businessMode) {
        case "service": return 15000; // $150
        case "dispatch": return 12500; // $125
        case "medical": return 20000; // $200
        case "food": return 3500; // $35
        default: return 10000; // $100
      }
    case "order_placed":
      return 3500; // $35
    case "dispatch_created":
      return 12500; // $125
    case "callback_scheduled":
      return 5000; // $50 potential
    case "faq_answered":
      return 500; // $5 retention value
    default:
      return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const payload: CallOutcomePayload = await req.json();

    if (!payload.tenant_id || !payload.session_id || !payload.outcome) {
      return errorResponse("Missing required fields: tenant_id, session_id, outcome");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const outcomeType = mapOutcomeType(payload.outcome, payload.intent);
    const conversionValue = estimateConversionValue(outcomeType, payload.business_mode || "general");

    // Determine if AI handled fully (no escalation)
    const aiHandledFully = !["transferred", "voicemail"].includes(outcomeType);

    // Insert call outcome
    const { error: insertError } = await supabase
      .from("call_outcomes")
      .insert({
        tenant_id: payload.tenant_id,
        session_id: payload.session_id,
        outcome_type: outcomeType,
        intent: payload.intent || null,
        service_requested: payload.service_requested || null,
        conversion_value_cents: conversionValue,
        duration_seconds: payload.duration_seconds || null,
        ai_handled_fully: aiHandledFully,
        escalation_reason: payload.escalation_reason || null,
      });

    if (insertError) {
      console.error("[process-call-outcome] Insert error:", insertError);
      return errorResponse(`Failed to insert call outcome: ${insertError.message}`, 500);
    }

    // Check if we should trigger pattern detection
    // Only trigger every 10 calls to avoid excessive processing
    const { count } = await supabase
      .from("call_outcomes")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", payload.tenant_id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const shouldDetectPatterns = (count || 0) % 10 === 0 && (count || 0) > 0;

    if (shouldDetectPatterns) {
      // Fire-and-forget pattern detection
      try {
        await fetch(`${supabaseUrl}/functions/v1/detect-patterns`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
          body: JSON.stringify({ tenant_id: payload.tenant_id }),
        });
      } catch (e) {
        console.warn("[process-call-outcome] Failed to trigger pattern detection:", e);
      }
    }

    console.log(`[process-call-outcome] Recorded ${outcomeType} for tenant ${payload.tenant_id.substring(0, 8)}... session ${payload.session_id.substring(0, 8)}...`);

    return jsonResponse({
      success: true,
      outcome_type: outcomeType,
      pattern_detection_triggered: shouldDetectPatterns,
    });
  } catch (err) {
    console.error("[process-call-outcome] Error:", err);
    return errorResponse(`Internal error: ${err.message}`, 500);
  }
});
