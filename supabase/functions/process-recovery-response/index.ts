import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ProcessResponseRequest {
  tenant_id: string;
  customer_id?: string;
  customer_phone?: string;
  response_type: "sms_reply" | "inbound_call" | "manual";
  response_content: string;
  call_session_id?: string;
}

interface ResponseAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  outcome: "interested" | "question" | "not_now" | "declined";
}

interface ProcessResponseResult {
  success: boolean;
  reason?: string;
  campaign_id?: string;
  response_outcome?: string;
  campaign_status?: string;
  notification_sent?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ProcessResponseRequest = await req.json();
    const {
      tenant_id,
      customer_id,
      customer_phone,
      response_type,
      response_content,
      call_session_id,
    } = body;

    if (!tenant_id) {
      return jsonResponse({ success: false, reason: "missing_tenant_id" }, 400);
    }

    if (!customer_id && !customer_phone) {
      return jsonResponse({ success: false, reason: "missing_customer_identifier" }, 400);
    }

    // Step 1: Find the active campaign
    let finalCustomerId = customer_id;
    
    // If no customer_id, look up by phone
    if (!finalCustomerId && customer_phone) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("phone_e164", customer_phone)
        .maybeSingle();

      if (customer) {
        finalCustomerId = customer.id;
      }
    }

    if (!finalCustomerId) {
      return jsonResponse({ success: false, reason: "customer_not_found" });
    }

    // Find active campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("lead_recovery_campaigns")
      .select(`
        *,
        customer:customers(*),
        lead:leads(*)
      `)
      .eq("tenant_id", tenant_id)
      .eq("customer_id", finalCustomerId)
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (campaignError || !campaign) {
      console.log("No active campaign found for customer:", finalCustomerId);
      return jsonResponse({ success: false, reason: "no_active_campaign" });
    }

    // Get recovery settings
    const { data: settings } = await supabase
      .from("lead_recovery_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    // Get assistant settings for notifications
    const { data: assistantSettings } = await supabase
      .from("assistant_settings")
      .select("closeloop_number, business_name")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    // Step 2: Analyze the response
    const analysis = analyzeResponse(response_content, response_type);
    console.log(`Response analysis for campaign ${campaign.id}:`, analysis);

    // Step 3: Log the response - update most recent action
    const { data: recentAction } = await supabase
      .from("lead_recovery_actions")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("response_received", false)
      .order("executed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentAction) {
      await supabase
        .from("lead_recovery_actions")
        .update({
          response_received: true,
          response_at: new Date().toISOString(),
          response_content: response_content,
          response_sentiment: analysis.sentiment,
          response_outcome: analysis.outcome,
        })
        .eq("id", recentAction.id);
    } else {
      // Create a new action record for this response
      await supabase.from("lead_recovery_actions").insert({
        campaign_id: campaign.id,
        step_id: null,
        action_type: response_type === "inbound_call" ? "inbound_call" : "sms_response",
        executed_at: new Date().toISOString(),
        message_sent: null,
        call_session_id: call_session_id || null,
        delivery_status: "received",
        response_received: true,
        response_at: new Date().toISOString(),
        response_content: response_content,
        response_sentiment: analysis.sentiment,
        response_outcome: analysis.outcome,
      });
    }

    // Step 4: Update campaign based on outcome
    let newCampaignStatus = campaign.status;
    let notificationSent = false;

    if (analysis.outcome === "declined") {
      // Customer declined
      newCampaignStatus = "declined";
      
      await supabase
        .from("lead_recovery_campaigns")
        .update({
          status: "declined",
          stopped_at: new Date().toISOString(),
          stopped_reason: `Customer responded: "${response_content.substring(0, 100)}"`,
          total_responses: campaign.total_responses + 1,
          last_response_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      // Update lead
      if (campaign.lead_id) {
        await supabase
          .from("leads")
          .update({ recovery_status: "declined" })
          .eq("id", campaign.lead_id);
      }

      // Check for opt-out keywords
      const lowerContent = response_content.toLowerCase();
      if (lowerContent.includes("stop") || lowerContent.includes("unsubscribe") || lowerContent.includes("remove")) {
        await supabase
          .from("customers")
          .update({ do_not_contact: true })
          .eq("id", finalCustomerId);
        
        console.log(`Customer ${finalCustomerId} opted out of all contact`);
      }

    } else if (analysis.outcome === "interested" || analysis.outcome === "question") {
      // Customer is interested or has questions - pause and notify
      newCampaignStatus = "paused";
      
      await supabase
        .from("lead_recovery_campaigns")
        .update({
          status: "paused",
          total_responses: campaign.total_responses + 1,
          last_response_at: new Date().toISOString(),
          notes: `${campaign.notes || ""}\n[${new Date().toISOString()}] Customer responded (${analysis.outcome}): "${response_content}"`.trim(),
        })
        .eq("id", campaign.id);

      // Step 5: Notify business owner
      if (settings?.notify_on_response) {
        notificationSent = await sendOwnerNotification(
          supabase,
          tenant_id,
          campaign,
          response_content,
          analysis,
          settings,
          assistantSettings
        );
      }

    } else {
      // Neutral response (not_now) - keep sequence going but log it
      await supabase
        .from("lead_recovery_campaigns")
        .update({
          total_responses: campaign.total_responses + 1,
          last_response_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);
    }

    // If this was an inbound call, link the call session
    if (call_session_id) {
      await supabase
        .from("ai_call_sessions")
        .update({
          is_recovery_call: true,
          recovery_campaign_id: campaign.id,
          recovery_context: {
            campaign_id: campaign.id,
            original_intent: campaign.original_intent,
            original_service: campaign.original_service_interest,
            response_type: response_type,
          },
        })
        .eq("id", call_session_id);
    }

    console.log(`Processed recovery response for campaign ${campaign.id}: ${analysis.outcome}`);

    return jsonResponse({
      success: true,
      campaign_id: campaign.id,
      response_outcome: analysis.outcome,
      campaign_status: newCampaignStatus,
      notification_sent: notificationSent,
    });

  } catch (error) {
    console.error("Error in process-recovery-response:", error);
    return jsonResponse(
      { success: false, reason: "internal_error", message: String(error) },
      500
    );
  }
});

/**
 * Analyze customer response to determine sentiment and outcome
 */
function analyzeResponse(text: string, responseType: string): ResponseAnalysis {
  // Inbound calls are always positive signals
  if (responseType === "inbound_call") {
    return { sentiment: "positive", outcome: "interested" };
  }

  if (!text || text.trim().length === 0) {
    return { sentiment: "neutral", outcome: "not_now" };
  }

  const lowerText = text.toLowerCase().trim();

  // Positive signals
  const positiveKeywords = [
    "yes", "yeah", "yep", "yup", "ok", "okay", "sure", "absolutely",
    "schedule", "book", "appointment", "interested", "call me", "ready",
    "sounds good", "let's do it", "i'm in", "sign me up", "available",
    "perfect", "great", "awesome", "please", "when can", "what time"
  ];
  const isPositive = positiveKeywords.some(k => lowerText.includes(k));

  // Strong negative signals (opt-out)
  const optOutKeywords = ["stop", "unsubscribe", "remove", "opt out", "opt-out"];
  const isOptOut = optOutKeywords.some(k => lowerText.includes(k));

  // Negative signals
  const negativeKeywords = [
    "no", "nope", "not interested", "don't", "dont", "cant", "can't",
    "won't", "wont", "never", "go away", "leave me alone", "wrong number",
    "already", "found someone", "went with", "not now", "busy"
  ];
  const isNegative = negativeKeywords.some(k => lowerText.includes(k)) || isOptOut;

  // Questions
  const questionIndicators = ["?", "how much", "what is", "when", "where", "who", "which", "cost", "price", "available"];
  const isQuestion = questionIndicators.some(q => lowerText.includes(q));

  // Determine outcome
  if (isOptOut) {
    return { sentiment: "negative", outcome: "declined" };
  }
  
  if (isNegative && !isPositive) {
    return { sentiment: "negative", outcome: "declined" };
  }
  
  if (isPositive) {
    return { sentiment: "positive", outcome: "interested" };
  }
  
  if (isQuestion) {
    return { sentiment: "neutral", outcome: "question" };
  }

  return { sentiment: "neutral", outcome: "not_now" };
}

/**
 * Send notification to business owner about customer response
 */
async function sendOwnerNotification(
  supabase: any,
  tenantId: string,
  campaign: any,
  responseContent: string,
  analysis: ResponseAnalysis,
  settings: any,
  assistantSettings: any
): Promise<boolean> {
  try {
    const customer = campaign.customer;
    const customerName = customer?.full_name || "A customer";
    const customerPhone = customer?.phone_e164 || "";

    // Create in-app notification via audit_events
    await supabase.from("audit_events").insert({
      tenant_id: tenantId,
      event_type: "lead.recovery_response",
      entity_type: "lead_recovery_campaign",
      entity_id: campaign.id,
      actor_type: "customer",
      actor_id: customer?.id,
      payload: {
        customer_name: customerName,
        customer_phone: customerPhone,
        response_content: responseContent,
        response_outcome: analysis.outcome,
        response_sentiment: analysis.sentiment,
        campaign_id: campaign.id,
        action_url: `/app/leads/recovery/${campaign.id}`,
        priority: "high",
      },
    });

    // Build notification message
    const outcomeEmoji = analysis.outcome === "interested" ? "🎉" : "❓";
    const message = `${outcomeEmoji} ${customerName} responded to follow-up!\n\n"${responseContent}"\n\nCall them: ${customerPhone}`;

    // Send SMS notification if configured
    if (settings.notification_sms && assistantSettings?.closeloop_number) {
      try {
        await supabase.functions.invoke("send-sms", {
          body: {
            to: settings.notification_sms,
            from: assistantSettings.closeloop_number,
            body: message,
            tenant_id: tenantId,
          },
        });
      } catch (smsError) {
        console.error("Failed to send SMS notification:", smsError);
      }
    }

    // Send email notification if configured
    if (settings.notification_email) {
      console.log(`Would send email notification to ${settings.notification_email}`);
      // TODO: Integrate with email service
    }

    return true;
  } catch (error) {
    console.error("Error sending owner notification:", error);
    return false;
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
