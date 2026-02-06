import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";

interface ExecuteActionRequest {
  campaign_id: string;
  force_execute?: boolean;
  skip_step?: boolean;
}

interface ExecuteActionResult {
  success: boolean;
  reason?: string;
  action_type?: string;
  action_id?: string;
  delivery_status?: string;
  has_more_steps?: boolean;
  next_action_at?: string | null;
  rescheduled?: boolean;
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ExecuteActionRequest = await req.json();
    const { campaign_id, force_execute = false, skip_step = false } = body;

    if (!campaign_id) {
      return jsonResponse({ success: false, reason: "missing_campaign_id" }, 400);
    }

    // Step 1: Load campaign with all related data
    const { data: campaign, error: campaignError } = await supabase
      .from("lead_recovery_campaigns")
      .select(`
        *,
        customer:customers(*),
        lead:leads!lead_recovery_campaigns_lead_id_fkey(*),
        tenant:tenants(*),
        sequence:lead_recovery_sequences(*)
      `)
      .eq("id", campaign_id)
      .maybeSingle();

    if (campaignError || !campaign) {
      console.error("Campaign not found:", campaignError);
      return jsonResponse({ success: false, reason: "campaign_not_found" }, 404);
    }

    // Get assistant settings
    const { data: assistantSettings } = await supabase
      .from("assistant_settings")
      .select("*")
      .eq("tenant_id", campaign.tenant_id)
      .maybeSingle();

    // Get recovery settings
    const { data: recoverySettings } = await supabase
      .from("lead_recovery_settings")
      .select("*")
      .eq("tenant_id", campaign.tenant_id)
      .maybeSingle();

    // Step 2: Validate campaign state
    if (campaign.status !== "active") {
      return jsonResponse({ success: false, reason: "campaign_not_active" });
    }

    const now = new Date();
    if (!force_execute && campaign.next_action_at) {
      const nextActionAt = new Date(campaign.next_action_at);
      if (nextActionAt > now) {
        return jsonResponse({ 
          success: false, 
          reason: "not_due_yet",
          next_action_at: campaign.next_action_at
        });
      }
    }

    // Step 3: Get current step (next to execute)
    const nextStepOrder = (campaign.current_step || 0) + 1;
    
    const { data: step, error: stepError } = await supabase
      .from("lead_recovery_sequence_steps")
      .select("*")
      .eq("sequence_id", campaign.sequence_id)
      .eq("step_order", nextStepOrder)
      .maybeSingle();

    if (stepError || !step) {
      // No more steps - complete the campaign
      await completeCampaign(supabase, campaign);
      return jsonResponse({
        success: true,
        action_type: "completed",
        has_more_steps: false,
        next_action_at: null,
      });
    }

    // Step 4: Check skip conditions
    let shouldSkip = skip_step;
    let skipReason = skip_step ? "manual_skip" : null;

    if (!shouldSkip && step.skip_if_responded && campaign.total_responses > 0) {
      shouldSkip = true;
      skipReason = "customer_responded";
    }

    if (!shouldSkip && step.skip_if_booked) {
      // Check for recent booking
      const { data: recentBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("tenant_id", campaign.tenant_id)
        .eq("lead_id", campaign.lead_id)
        .eq("status", "scheduled")
        .gte("start_at", now.toISOString())
        .limit(1)
        .maybeSingle();

      if (recentBooking) {
        shouldSkip = true;
        skipReason = "customer_booked";
        // Also mark campaign as converted
        await convertCampaign(supabase, campaign, recentBooking.id, null, null);
        return jsonResponse({
          success: true,
          action_type: "converted",
          has_more_steps: false,
          next_action_at: null,
        });
      }
    }

    if (!shouldSkip && step.skip_if_declined && campaign.status === "declined") {
      shouldSkip = true;
      skipReason = "customer_declined";
    }

    // If skipping, advance to next step
    if (shouldSkip) {
      return await advanceToNextStep(supabase, campaign, step, recoverySettings, skipReason);
    }

    // Step 5: Check business hours
    if (step.respect_business_hours && recoverySettings?.respect_business_hours) {
      if (!isWithinBusinessHours(now, recoverySettings)) {
        const nextBusinessHour = getNextBusinessHour(now, recoverySettings);
        
        await supabase
          .from("lead_recovery_campaigns")
          .update({ next_action_at: nextBusinessHour.toISOString() })
          .eq("id", campaign_id);

        return jsonResponse({
          success: true,
          rescheduled: true,
          reason: "outside_business_hours",
          next_action_at: nextBusinessHour.toISOString(),
        });
      }
    }

    // Step 6: Execute the action
    const customer = campaign.customer;
    const tenant = campaign.tenant;
    let actionResult: ActionResult;

    switch (step.action_type) {
      case "sms":
        actionResult = await executeSmsAction(
          supabase,
          campaign,
          step,
          customer,
          assistantSettings,
          recoverySettings
        );
        break;

      case "email":
        actionResult = await executeEmailAction(
          supabase,
          campaign,
          step,
          customer,
          assistantSettings,
          recoverySettings
        );
        break;

      case "ai_call":
        actionResult = await executeAiCallAction(
          supabase,
          campaign,
          step,
          customer,
          assistantSettings,
          recoverySettings
        );
        break;

      case "internal_task":
        actionResult = await executeInternalTaskAction(
          supabase,
          campaign,
          step,
          customer,
          assistantSettings,
          recoverySettings
        );
        break;

      default:
        actionResult = { success: false, delivery_status: "failed", error: "unknown_action_type" };
    }

    // Step 7: Log the action
    const { data: actionLog } = await supabase
      .from("lead_recovery_actions")
      .insert({
        campaign_id: campaign.id,
        step_id: step.id,
        action_type: step.action_type,
        executed_at: now.toISOString(),
        message_sent: actionResult.messageSent || null,
        call_session_id: actionResult.callSessionId || null,
        delivery_status: actionResult.delivery_status,
        delivery_error: actionResult.error || null,
        external_message_id: actionResult.externalMessageId || null,
      })
      .select("id")
      .single();

    // Step 8: Advance to next step
    return await advanceToNextStep(supabase, campaign, step, recoverySettings, null, actionLog?.id, actionResult);

  } catch (error) {
    console.error("Error in execute-recovery-action:", error);
    return jsonResponse(
      { success: false, reason: "internal_error", message: String(error) },
      500
    );
  }
});

// ============== Action Executors ==============

interface ActionResult {
  success: boolean;
  delivery_status: string;
  messageSent?: string;
  callSessionId?: string;
  externalMessageId?: string;
  error?: string;
}

async function executeSmsAction(
  supabase: any,
  campaign: any,
  step: any,
  customer: any,
  assistantSettings: any,
  recoverySettings: any
): Promise<ActionResult> {
  try {
    if (!customer.phone_e164) {
      return { success: false, delivery_status: "failed", error: "no_phone_number" };
    }

    // Resolve template tokens
    const message = resolveTemplateTokens(
      step.message_template || "",
      campaign,
      customer,
      assistantSettings,
      recoverySettings
    );

    // Get the closeloop number for this tenant
    const fromNumber = assistantSettings?.closeloop_number;
    if (!fromNumber) {
      return { success: false, delivery_status: "failed", error: "no_sending_number" };
    }

    // Call the send-sms function
    const { data: smsResult, error: smsError } = await supabase.functions.invoke("send-sms", {
      body: {
        to: customer.phone_e164,
        from: fromNumber,
        body: message,
        tenant_id: campaign.tenant_id,
      },
    });

    if (smsError) {
      console.error("SMS send error:", smsError);
      return { success: false, delivery_status: "failed", error: smsError.message };
    }

    return {
      success: true,
      delivery_status: smsResult?.success ? "sent" : "failed",
      messageSent: message,
      externalMessageId: smsResult?.messageSid,
      error: smsResult?.error,
    };
  } catch (error) {
    console.error("SMS action error:", error);
    return { success: false, delivery_status: "failed", error: String(error) };
  }
}

async function executeEmailAction(
  supabase: any,
  campaign: any,
  step: any,
  customer: any,
  assistantSettings: any,
  recoverySettings: any
): Promise<ActionResult> {
  try {
    if (!customer.email) {
      return { success: false, delivery_status: "failed", error: "no_email" };
    }

    const message = resolveTemplateTokens(
      step.message_template || "",
      campaign,
      customer,
      assistantSettings,
      recoverySettings
    );

    // For now, log as pending - would integrate with email service
    console.log(`Would send email to ${customer.email}: ${message}`);

    // TODO: Integrate with Resend or SendGrid
    return {
      success: true,
      delivery_status: "pending",
      messageSent: message,
    };
  } catch (error) {
    console.error("Email action error:", error);
    return { success: false, delivery_status: "failed", error: String(error) };
  }
}

async function executeAiCallAction(
  supabase: any,
  campaign: any,
  step: any,
  customer: any,
  assistantSettings: any,
  recoverySettings: any
): Promise<ActionResult> {
  try {
    // Check if AI calls are enabled
    if (!recoverySettings?.ai_calls_enabled) {
      // Fall back to internal task
      return await executeInternalTaskAction(
        supabase,
        campaign,
        { ...step, task_description: `Call ${customer.full_name} about ${campaign.original_intent || "their inquiry"}` },
        customer,
        assistantSettings,
        recoverySettings
      );
    }

    // Check AI call hours
    const now = new Date();
    if (recoverySettings.ai_call_hours_start && recoverySettings.ai_call_hours_end) {
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      if (currentTime < recoverySettings.ai_call_hours_start || currentTime > recoverySettings.ai_call_hours_end) {
        return { success: false, delivery_status: "rescheduled", error: "outside_ai_call_hours" };
      }
    }

    if (!customer.phone_e164) {
      return { success: false, delivery_status: "failed", error: "no_phone_number" };
    }

    // Build recovery context for the AI
    const recoveryContext = {
      is_recovery_call: true,
      original_call_id: campaign.original_call_id,
      original_intent: campaign.original_intent,
      original_service_interest: campaign.original_service_interest,
      original_objection: campaign.original_objection,
      call_purpose: step.ai_call_purpose,
      script_hints: step.ai_call_script_hints,
      campaign_id: campaign.id,
    };

    // Trigger outbound call via the initiate-outbound-call function
    const { data: callResult, error: callError } = await supabase.functions.invoke("initiate-outbound-call", {
      body: {
        tenant_id: campaign.tenant_id,
        customer_id: customer.id,
        to_phone: customer.phone_e164,
        recovery_context: recoveryContext,
        max_duration_seconds: step.ai_call_max_duration_seconds || 120,
      },
    });

    if (callError) {
      console.error("AI call error:", callError);
      // Fall back to internal task
      return await executeInternalTaskAction(
        supabase,
        campaign,
        { ...step, task_description: `AI call failed - manually call ${customer.full_name} about ${campaign.original_intent || "their inquiry"}` },
        customer,
        assistantSettings,
        recoverySettings
      );
    }

    return {
      success: true,
      delivery_status: "sent",
      callSessionId: callResult?.session_id,
    };
  } catch (error) {
    console.error("AI call action error:", error);
    return { success: false, delivery_status: "failed", error: String(error) };
  }
}

async function executeInternalTaskAction(
  supabase: any,
  campaign: any,
  step: any,
  customer: any,
  assistantSettings: any,
  recoverySettings: any
): Promise<ActionResult> {
  try {
    const description = resolveTemplateTokens(
      step.task_description || `Follow up with ${customer.full_name}`,
      campaign,
      customer,
      assistantSettings,
      recoverySettings
    );

    // Create an in-app notification (using audit_events or a notifications table if available)
    await supabase.from("audit_events").insert({
      tenant_id: campaign.tenant_id,
      event_type: "lead.recovery_task",
      entity_type: "lead_recovery_campaign",
      entity_id: campaign.id,
      actor_type: "system",
      payload: {
        task_description: description,
        task_priority: step.task_priority || "normal",
        customer_id: customer.id,
        customer_name: customer.full_name,
        customer_phone: customer.phone_e164,
        campaign_id: campaign.id,
        action_url: `/app/leads/recovery/${campaign.id}`,
      },
    });

    // Send email notification if configured
    if (recoverySettings?.notification_email) {
      console.log(`Would send task notification email to ${recoverySettings.notification_email}`);
      // TODO: Integrate with email service
    }

    // Send SMS notification if configured
    if (recoverySettings?.notification_sms && assistantSettings?.closeloop_number) {
      const notificationMessage = `[CloseLoop Task] ${description}. Customer: ${customer.phone_e164}`;
      
      await supabase.functions.invoke("send-sms", {
        body: {
          to: recoverySettings.notification_sms,
          from: assistantSettings.closeloop_number,
          body: notificationMessage,
          tenant_id: campaign.tenant_id,
        },
      });
    }

    return {
      success: true,
      delivery_status: "sent",
      messageSent: description,
    };
  } catch (error) {
    console.error("Internal task action error:", error);
    return { success: false, delivery_status: "failed", error: String(error) };
  }
}

// ============== Helper Functions ==============

function resolveTemplateTokens(
  template: string,
  campaign: any,
  customer: any,
  assistantSettings: any,
  recoverySettings: any
): string {
  const firstName = customer.full_name?.split(" ")[0] || customer.full_name || "there";
  
  const replacements: Record<string, string> = {
    "{{customer_name}}": customer.full_name || "Valued Customer",
    "{{customer_first_name}}": firstName,
    "{{business_name}}": assistantSettings?.business_name || campaign.tenant?.business_name || "our team",
    "{{business_phone}}": assistantSettings?.business_phone_number || assistantSettings?.closeloop_number || "",
    "{{service_interest}}": campaign.original_service_interest || campaign.original_intent || "your inquiry",
    "{{original_objection}}": campaign.original_objection || "",
    "{{offer_code}}": recoverySettings?.default_offer_code || "",
    "{{offer_description}}": recoverySettings?.default_offer_description || "a special offer",
    "{{booking_link}}": assistantSettings?.booking_url || "",
  };

  let result = template;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(token.replace(/[{}]/g, "\\$&"), "g"), value);
  }

  return result;
}

function isWithinBusinessHours(date: Date, settings: any): boolean {
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayName = dayNames[date.getDay()];
  
  // Check quiet days
  if (settings.quiet_days?.includes(dayName)) {
    return false;
  }

  const currentTime = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  const quietStart = settings.quiet_hours_start || "21:00";
  const quietEnd = settings.quiet_hours_end || "08:00";

  // Handle overnight quiet period
  if (quietStart > quietEnd) {
    // Quiet from 21:00 to 08:00 means active from 08:00 to 21:00
    return currentTime >= quietEnd && currentTime < quietStart;
  } else {
    return currentTime < quietStart || currentTime >= quietEnd;
  }
}

function getNextBusinessHour(date: Date, settings: any): Date {
  const result = new Date(date);
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const quietEnd = settings.quiet_hours_end || "08:00";
  const [quietEndHour, quietEndMin] = quietEnd.split(":").map(Number);

  let iterations = 0;
  while (iterations < 14) {
    const dayName = dayNames[result.getDay()];
    
    if (!settings.quiet_days?.includes(dayName)) {
      // Set to quiet end time
      result.setHours(quietEndHour, quietEndMin, 0, 0);
      
      if (result > date && isWithinBusinessHours(result, settings)) {
        return result;
      }
    }
    
    // Move to next day
    result.setDate(result.getDate() + 1);
    result.setHours(quietEndHour, quietEndMin, 0, 0);
    iterations++;
  }

  return result;
}

async function advanceToNextStep(
  supabase: any,
  campaign: any,
  currentStep: any,
  recoverySettings: any,
  skipReason: string | null,
  actionId?: string,
  actionResult?: ActionResult
): Promise<Response> {
  const newStepNumber = (campaign.current_step || 0) + 1;
  
  // Get next step
  const { data: nextStep } = await supabase
    .from("lead_recovery_sequence_steps")
    .select("*")
    .eq("sequence_id", campaign.sequence_id)
    .eq("step_order", newStepNumber + 1)
    .maybeSingle();

  let nextActionAt: Date | null = null;
  let newStatus = "active";
  let hasMoreSteps = true;

  if (nextStep) {
    nextActionAt = new Date();
    nextActionAt.setMinutes(nextActionAt.getMinutes() + (nextStep.delay_minutes || 60));
    
    // Adjust for business hours if needed
    if (nextStep.respect_business_hours && recoverySettings?.respect_business_hours) {
      nextActionAt = getNextBusinessHour(nextActionAt, recoverySettings);
    }
  } else {
    // No more steps - complete the campaign
    newStatus = "completed";
    hasMoreSteps = false;
  }

  // Update campaign
  await supabase
    .from("lead_recovery_campaigns")
    .update({
      current_step: newStepNumber,
      next_action_at: nextActionAt?.toISOString() || null,
      total_attempts: campaign.total_attempts + (skipReason ? 0 : 1),
      last_attempt_at: skipReason ? campaign.last_attempt_at : new Date().toISOString(),
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  // Update lead status if completed
  if (newStatus === "completed" && campaign.lead_id) {
    await supabase
      .from("leads")
      .update({ recovery_status: "dormant" })
      .eq("id", campaign.lead_id);
  }

  return jsonResponse({
    success: true,
    action_type: skipReason ? "skipped" : currentStep.action_type,
    action_id: actionId,
    delivery_status: actionResult?.delivery_status || (skipReason ? "skipped" : "unknown"),
    skip_reason: skipReason,
    has_more_steps: hasMoreSteps,
    next_action_at: nextActionAt?.toISOString() || null,
  });
}

async function completeCampaign(supabase: any, campaign: any): Promise<void> {
  await supabase
    .from("lead_recovery_campaigns")
    .update({
      status: "completed",
      next_action_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  if (campaign.lead_id) {
    await supabase
      .from("leads")
      .update({ recovery_status: "dormant" })
      .eq("id", campaign.lead_id);
  }
}

async function convertCampaign(
  supabase: any,
  campaign: any,
  bookingId: string | null,
  dispatchJobId: string | null,
  foodOrderId: string | null,
  recoveredValueCents?: number | null
): Promise<void> {
  const now = new Date().toISOString();
  
  // Update campaign status
  await supabase
    .from("lead_recovery_campaigns")
    .update({
      status: "converted",
      converted_at: now,
      converted_booking_id: bookingId,
      converted_dispatch_job_id: dispatchJobId,
      converted_food_order_id: foodOrderId,
      recovered_value_cents: recoveredValueCents || null,
      next_action_at: null,
      updated_at: now,
    })
    .eq("id", campaign.id);

  // Update lead status
  if (campaign.lead_id) {
    await supabase
      .from("leads")
      .update({ recovery_status: "recovered" })
      .eq("id", campaign.lead_id);
  }

  // Create revenue attribution for ROI tracking
  if (recoveredValueCents && recoveredValueCents > 0) {
    const entityType = bookingId ? "booking" : dispatchJobId ? "dispatch_job" : foodOrderId ? "food_order" : "lead_recovery";
    const entityId = bookingId || dispatchJobId || foodOrderId || campaign.id;

    await supabase.from("revenue_attributions").insert({
      tenant_id: campaign.tenant_id,
      session_id: campaign.original_session_id || null,
      entity_type: entityType,
      entity_id: entityId,
      customer_id: campaign.customer_id,
      revenue_cents: recoveredValueCents,
      source_type: "lead_recovery", // New source type for recovery attribution
      status: "pending",
      attributed_at: now,
    });
  }

  // Log the conversion event
  await supabase.from("audit_events").insert({
    tenant_id: campaign.tenant_id,
    event_type: "lead.recovered",
    entity_type: "lead_recovery_campaign",
    entity_id: campaign.id,
    actor_type: "system",
    payload: {
      campaign_id: campaign.id,
      customer_id: campaign.customer_id,
      lead_id: campaign.lead_id,
      recovered_value_cents: recoveredValueCents,
      booking_id: bookingId,
      dispatch_job_id: dispatchJobId,
      food_order_id: foodOrderId,
      total_attempts: campaign.total_attempts,
    },
  });
}

