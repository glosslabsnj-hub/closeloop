import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StartRecoveryRequest {
  tenant_id: string;
  customer_id: string;
  lead_id?: string;
  call_session_id?: string;
  original_intent?: string;
  original_service_interest?: string;
  original_objection?: string;
  original_call_outcome?: string;
  force_start?: boolean;
}

interface RecoveryResult {
  success: boolean;
  reason?: string;
  campaign_id?: string;
  next_action_at?: string;
  sequence_name?: string;
  total_steps?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: StartRecoveryRequest = await req.json();
    const {
      tenant_id,
      customer_id,
      lead_id,
      call_session_id,
      original_intent,
      original_service_interest,
      original_objection,
      original_call_outcome = "followup",
      force_start = false,
    } = body;

    // Validate required fields
    if (!tenant_id || !customer_id) {
      return jsonResponse({ success: false, reason: "missing_required_fields" }, 400);
    }

    // Step 1: Check if recovery is enabled for tenant
    const { data: settings, error: settingsError } = await supabase
      .from("lead_recovery_settings")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return jsonResponse({ success: false, reason: "settings_error" }, 500);
    }

    if (!settings || !settings.recovery_enabled) {
      return jsonResponse({ success: false, reason: "recovery_disabled" });
    }

    // Step 2: Get customer details and check preferences
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customer_id)
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (customerError || !customer) {
      console.error("Error fetching customer:", customerError);
      return jsonResponse({ success: false, reason: "customer_not_found" }, 404);
    }

    // Check do_not_contact
    if (customer.do_not_contact) {
      return jsonResponse({ success: false, reason: "do_not_contact" });
    }

    // Check contact method availability
    const hasPhone = !!customer.phone_e164;
    const hasEmail = !!customer.email;
    if (!hasPhone && !hasEmail) {
      return jsonResponse({ success: false, reason: "no_contact_method" });
    }

    // Step 3: Check for existing active campaign
    if (!force_start) {
      const { data: existingCampaign } = await supabase
        .from("lead_recovery_campaigns")
        .select("id, status")
        .eq("customer_id", customer_id)
        .eq("tenant_id", tenant_id)
        .in("status", ["active", "paused"])
        .maybeSingle();

      if (existingCampaign) {
        return jsonResponse({
          success: false,
          reason: "campaign_exists",
          campaign_id: existingCampaign.id,
        });
      }

      // Step 4: Check cooldown period
      const cooldownDays = settings.cooldown_days || 30;
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);

      const { data: recentCampaign } = await supabase
        .from("lead_recovery_campaigns")
        .select("id, stopped_at, updated_at")
        .eq("customer_id", customer_id)
        .eq("tenant_id", tenant_id)
        .in("status", ["completed", "stopped", "declined", "converted"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentCampaign) {
        const lastCampaignDate = new Date(recentCampaign.stopped_at || recentCampaign.updated_at);
        if (lastCampaignDate > cooldownDate) {
          return jsonResponse({ success: false, reason: "cooldown_active" });
        }
      }

      // Step 5: Check daily rate limit
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: todayCampaigns } = await supabase
        .from("lead_recovery_campaigns")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant_id)
        .gte("created_at", todayStart.toISOString());

      const maxPerDay = settings.max_campaigns_per_day || 50;
      if ((todayCampaigns || 0) >= maxPerDay) {
        return jsonResponse({ success: false, reason: "rate_limited" });
      }
    }

    // Step 6: Check if customer already has a scheduled booking
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("status", "scheduled")
      .gte("start_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    // We need to check if the booking is linked to this customer via lead
    // For now, skip this check if no lead_id provided
    if (existingBooking && lead_id) {
      const { data: linkedBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("lead_id", lead_id)
        .eq("status", "scheduled")
        .gte("start_at", new Date().toISOString())
        .maybeSingle();

      if (linkedBooking) {
        return jsonResponse({ success: false, reason: "already_booked" });
      }
    }

    // Step 7: Get or create lead record
    let finalLeadId = lead_id;
    if (!finalLeadId) {
      // Create a new lead from customer info
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          tenant_id,
          full_name: customer.full_name,
          phone: customer.phone_e164,
          email: customer.email,
          source: "missed_call", // Valid enum value
          status: "new",
          vehicle_or_context: original_intent ? `Original inquiry: ${original_intent}` : null,
        })
        .select("id")
        .single();

      if (leadError) {
        console.error("Error creating lead:", leadError);
        return jsonResponse({ success: false, reason: "lead_creation_failed" }, 500);
      }

      finalLeadId = newLead.id;
    }

    // Step 8: Get the appropriate sequence
    let { data: sequence } = await supabase
      .from("lead_recovery_sequences")
      .select("id, name, trigger_on_outcomes")
      .eq("tenant_id", tenant_id)
      .eq("is_default", true)
      .eq("is_active", true)
      .maybeSingle();

    // If no default sequence, create one
    if (!sequence) {
      const { data: ensureResult, error: ensureError } = await supabase
        .rpc("ensure_tenant_has_default_sequence", { p_tenant_id: tenant_id });

      if (ensureError) {
        console.error("Error ensuring default sequence:", ensureError);
        return jsonResponse({ success: false, reason: "sequence_creation_failed" }, 500);
      }

      // Fetch the newly created sequence
      const { data: newSequence } = await supabase
        .from("lead_recovery_sequences")
        .select("id, name, trigger_on_outcomes")
        .eq("id", ensureResult)
        .single();

      sequence = newSequence;
    }

    if (!sequence) {
      return jsonResponse({ success: false, reason: "no_sequence_available" }, 500);
    }

    // Step 9: Check trigger conditions
    const triggerOutcomes = sequence.trigger_on_outcomes || [];
    if (!triggerOutcomes.includes(original_call_outcome)) {
      return jsonResponse({ success: false, reason: "outcome_not_triggered" });
    }

    // Step 10: Get sequence steps
    const { data: steps, error: stepsError } = await supabase
      .from("lead_recovery_sequence_steps")
      .select("*")
      .eq("sequence_id", sequence.id)
      .order("step_order", { ascending: true });

    if (stepsError || !steps || steps.length === 0) {
      return jsonResponse({ success: false, reason: "empty_sequence" });
    }

    // Step 11: Calculate next_action_at
    const firstStep = steps[0];
    let nextActionAt = new Date();
    nextActionAt.setMinutes(nextActionAt.getMinutes() + (firstStep.delay_minutes || 60));

    // Consider business hours if needed
    if (firstStep.respect_business_hours && settings.respect_business_hours) {
      nextActionAt = adjustForBusinessHours(
        nextActionAt,
        settings.quiet_hours_start,
        settings.quiet_hours_end,
        settings.quiet_days || []
      );
    }

    // Step 12: Create the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("lead_recovery_campaigns")
      .insert({
        tenant_id,
        customer_id,
        lead_id: finalLeadId,
        original_call_id: call_session_id || null,
        sequence_id: sequence.id,
        status: "active",
        current_step: 0,
        next_action_at: nextActionAt.toISOString(),
        original_intent: original_intent || null,
        original_service_interest: original_service_interest || null,
        original_objection: original_objection || null,
        original_call_outcome: original_call_outcome,
      })
      .select("id")
      .single();

    if (campaignError) {
      console.error("Error creating campaign:", campaignError);
      return jsonResponse({ success: false, reason: "campaign_creation_failed" }, 500);
    }

    // Step 13: Update related records
    // Update lead
    await supabase
      .from("leads")
      .update({
        recovery_status: "in_recovery",
        recovery_campaign_id: campaign.id,
        last_recovery_at: new Date().toISOString(),
      })
      .eq("id", finalLeadId);

    // Update call session if provided
    if (call_session_id) {
      await supabase
        .from("ai_call_sessions")
        .update({
          triggered_recovery: true,
          recovery_campaign_id: campaign.id,
        })
        .eq("id", call_session_id);
    }

    // Return success
    const result: RecoveryResult = {
      success: true,
      campaign_id: campaign.id,
      next_action_at: nextActionAt.toISOString(),
      sequence_name: sequence.name,
      total_steps: steps.length,
    };

    console.log(`Started recovery campaign ${campaign.id} for customer ${customer_id}`);

    return jsonResponse(result);

  } catch (error) {
    console.error("Error in start-lead-recovery:", error);
    return jsonResponse(
      { success: false, reason: "internal_error", message: String(error) },
      500
    );
  }
});

/**
 * Adjust a date to fall within business hours
 */
function adjustForBusinessHours(
  date: Date,
  quietStart: string | null,
  quietEnd: string | null,
  quietDays: string[]
): Date {
  const result = new Date(date);
  
  // Default quiet hours: 9 PM to 8 AM
  const quietStartTime = quietStart || "21:00";
  const quietEndTime = quietEnd || "08:00";
  
  const [quietStartHour, quietStartMin] = quietStartTime.split(":").map(Number);
  const [quietEndHour, quietEndMin] = quietEndTime.split(":").map(Number);
  
  // Get day name (lowercase)
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  
  // Keep adjusting until we find a valid time
  let iterations = 0;
  const maxIterations = 14; // Max 2 weeks of adjustment
  
  while (iterations < maxIterations) {
    const dayName = dayNames[result.getDay()];
    const hour = result.getHours();
    const minute = result.getMinutes();
    const currentMinutes = hour * 60 + minute;
    
    const quietStartMinutes = quietStartHour * 60 + quietStartMin;
    const quietEndMinutes = quietEndHour * 60 + quietEndMin;
    
    // Check if it's a quiet day
    if (quietDays.includes(dayName)) {
      // Move to next day at quiet end time
      result.setDate(result.getDate() + 1);
      result.setHours(quietEndHour, quietEndMin, 0, 0);
      iterations++;
      continue;
    }
    
    // Check if we're in quiet hours (handle overnight quiet period)
    let inQuietHours = false;
    
    if (quietStartMinutes > quietEndMinutes) {
      // Overnight quiet period (e.g., 21:00 - 08:00)
      inQuietHours = currentMinutes >= quietStartMinutes || currentMinutes < quietEndMinutes;
    } else {
      // Same-day quiet period
      inQuietHours = currentMinutes >= quietStartMinutes && currentMinutes < quietEndMinutes;
    }
    
    if (inQuietHours) {
      if (currentMinutes >= quietStartMinutes) {
        // Move to next day at quiet end time
        result.setDate(result.getDate() + 1);
        result.setHours(quietEndHour, quietEndMin, 0, 0);
      } else {
        // Move to quiet end time today
        result.setHours(quietEndHour, quietEndMin, 0, 0);
      }
      iterations++;
      continue;
    }
    
    // We're in valid business hours
    break;
  }
  
  return result;
}

/**
 * Helper to create JSON responses with CORS headers
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
