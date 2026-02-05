import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Check Recovery Context
 * 
 * Called at the start of an inbound call to check if the caller
 * has an active recovery campaign and inject context for the AI.
 * 
 * Input:
 * - tenant_id: string
 * - customer_id: string (optional)
 * - customer_phone: string (optional)
 * - call_session_id: string (the new call session)
 * 
 * Output:
 * - has_recovery_campaign: boolean
 * - campaign_id: string | null
 * - recovery_context: object with original intent, service, objection
 * - ai_context_addition: string to add to AI prompt
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tenant_id, customer_id, customer_phone, call_session_id } = await req.json();

    if (!tenant_id) {
      return jsonResponse({ has_recovery_campaign: false, reason: "missing_tenant_id" });
    }

    // Find customer if not provided
    let finalCustomerId = customer_id;
    
    if (!finalCustomerId && customer_phone) {
      const normalizedPhone = normalizePhoneNumber(customer_phone);
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("phone_e164", normalizedPhone)
        .maybeSingle();

      if (customer) {
        finalCustomerId = customer.id;
      }
    }

    if (!finalCustomerId) {
      return jsonResponse({ has_recovery_campaign: false, reason: "customer_not_found" });
    }

    // Check for active recovery campaign
    const { data: activeCampaign } = await supabase
      .from("lead_recovery_campaigns")
      .select(`
        id,
        original_intent,
        original_service_interest,
        original_objection,
        original_call_outcome,
        total_attempts,
        sequence:lead_recovery_sequences(name)
      `)
      .eq("tenant_id", tenant_id)
      .eq("customer_id", finalCustomerId)
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeCampaign) {
      return jsonResponse({ has_recovery_campaign: false });
    }

    // This is a recovery callback!
    console.log(`[Check Recovery] Found active campaign ${activeCampaign.id} for customer ${finalCustomerId}`);

    // Process as recovery response
    if (call_session_id) {
      try {
        await supabase.functions.invoke("process-recovery-response", {
          body: {
            tenant_id,
            customer_id: finalCustomerId,
            response_type: "inbound_call",
            response_content: "Customer called back",
            call_session_id,
          },
        });
      } catch (error) {
        console.error("[Check Recovery] Error processing response:", error);
      }

      // Update the call session with recovery context
      await supabase
        .from("ai_call_sessions")
        .update({
          is_recovery_call: true,
          recovery_campaign_id: activeCampaign.id,
          recovery_context: {
            campaign_id: activeCampaign.id,
            original_intent: activeCampaign.original_intent,
            original_service: activeCampaign.original_service_interest,
            original_objection: activeCampaign.original_objection,
          },
        })
        .eq("id", call_session_id);
    }

    // Build AI context addition for the agent prompt
    const aiContextAddition = buildAiContextAddition(activeCampaign);

    return jsonResponse({
      has_recovery_campaign: true,
      campaign_id: activeCampaign.id,
      recovery_context: {
        original_intent: activeCampaign.original_intent,
        original_service_interest: activeCampaign.original_service_interest,
        original_objection: activeCampaign.original_objection,
        original_call_outcome: activeCampaign.original_call_outcome,
        sequence_name: activeCampaign.sequence?.name,
        total_attempts: activeCampaign.total_attempts,
      },
      ai_context_addition: aiContextAddition,
    });

  } catch (error) {
    console.error("[Check Recovery] Error:", error);
    return jsonResponse({ has_recovery_campaign: false, error: String(error) });
  }
});

/**
 * Build context string to inject into AI agent prompt
 */
function buildAiContextAddition(campaign: any): string {
  const parts: string[] = [];

  parts.push("[RETURNING CUSTOMER CONTEXT]");
  parts.push("This customer called before and is calling back.");

  if (campaign.original_service_interest) {
    parts.push(`They previously asked about: ${campaign.original_service_interest}.`);
  } else if (campaign.original_intent) {
    parts.push(`Their previous inquiry was about: ${campaign.original_intent}.`);
  }

  if (campaign.original_objection) {
    parts.push(`They mentioned: "${campaign.original_objection}" as a concern.`);
  }

  parts.push("Greet them warmly like you remember them, and help them complete their booking.");
  parts.push("[END CONTEXT]");

  return parts.join(" ");
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      cleaned = "+1" + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      cleaned = "+" + cleaned;
    } else {
      cleaned = "+" + cleaned;
    }
  }
  
  return cleaned;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
