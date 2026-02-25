import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, errorResponse, jsonResponse } from "../_shared/cors.ts";

interface CompleteRecoveryRequest {
  campaign_id: string;
  outcome: "converted" | "declined" | "stopped";
  recovered_value_cents?: number;
  booking_id?: string;
  dispatch_job_id?: string;
  food_order_id?: string;
  stop_reason?: string;
}

interface CompleteRecoveryResult {
  success: boolean;
  reason?: string;
  campaign_id?: string;
  status?: string;
  recovered_value_cents?: number;
  revenue_attribution_id?: string;
  audit_event_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CompleteRecoveryRequest = await req.json();
    const {
      campaign_id,
      outcome,
      recovered_value_cents,
      booking_id,
      dispatch_job_id,
      food_order_id,
      stop_reason,
    } = body;

    if (!campaign_id) {
      return jsonResponse({ success: false, reason: "missing_campaign_id" }, 400);
    }

    if (!outcome || !["converted", "declined", "stopped"].includes(outcome)) {
      return jsonResponse({ success: false, reason: "invalid_outcome" }, 400);
    }

    // Load campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("lead_recovery_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .maybeSingle();

    if (campaignError || !campaign) {
      console.error("Campaign not found:", campaignError);
      return jsonResponse({ success: false, reason: "campaign_not_found" }, 404);
    }

    if (campaign.status === "converted") {
      return jsonResponse({ success: false, reason: "already_converted" });
    }

    const now = new Date().toISOString();
    const result: CompleteRecoveryResult = {
      success: true,
      campaign_id,
      status: outcome,
    };

    if (outcome === "converted") {
      // Update campaign as converted
      await supabase
        .from("lead_recovery_campaigns")
        .update({
          status: "converted",
          converted_at: now,
          converted_booking_id: booking_id || null,
          converted_dispatch_job_id: dispatch_job_id || null,
          converted_food_order_id: food_order_id || null,
          recovered_value_cents: recovered_value_cents || null,
          next_action_at: null,
          updated_at: now,
        })
        .eq("id", campaign_id);

      // Update lead status
      if (campaign.lead_id) {
        await supabase
          .from("leads")
          .update({ 
            recovery_status: "recovered",
            status: "won"
          })
          .eq("id", campaign.lead_id);
      }

      result.recovered_value_cents = recovered_value_cents;

      // Create revenue attribution for ROI tracking
      if (recovered_value_cents && recovered_value_cents > 0) {
        const entityType = booking_id
          ? "booking"
          : dispatch_job_id
          ? "dispatch_job"
          : food_order_id
          ? "food_order"
          : "lead_recovery";
        const entityId = booking_id || dispatch_job_id || food_order_id || campaign_id;

        const { data: attribution } = await supabase
          .from("revenue_attributions")
          .insert({
            tenant_id: campaign.tenant_id,
            session_id: campaign.original_session_id || null,
            entity_type: entityType,
            entity_id: entityId,
            customer_id: campaign.customer_id,
            revenue_cents: recovered_value_cents,
            source_type: "lead_recovery",
            status: "pending",
            attributed_at: now,
          })
          .select("id")
          .single();

        if (attribution) {
          result.revenue_attribution_id = attribution.id;
        }
      }

      // Log audit event
      const { data: auditEvent } = await supabase
        .from("audit_events")
        .insert({
          tenant_id: campaign.tenant_id,
          event_type: "lead.recovered",
          entity_type: "lead_recovery_campaign",
          entity_id: campaign_id,
          actor_type: "system",
          payload: {
            campaign_id,
            customer_id: campaign.customer_id,
            lead_id: campaign.lead_id,
            recovered_value_cents,
            booking_id,
            dispatch_job_id,
            food_order_id,
            total_attempts: campaign.total_attempts,
          },
        })
        .select("id")
        .single();

      if (auditEvent) {
        result.audit_event_id = auditEvent.id;
      }

      console.log(`Campaign ${campaign_id} converted with value ${recovered_value_cents}`);

    } else {
      // Declined or stopped
      await supabase
        .from("lead_recovery_campaigns")
        .update({
          status: outcome,
          stopped_at: now,
          stopped_reason: stop_reason || (outcome === "declined" ? "Customer declined" : "Manually stopped"),
          next_action_at: null,
          updated_at: now,
        })
        .eq("id", campaign_id);

      // Update lead status
      if (campaign.lead_id) {
        await supabase
          .from("leads")
          .update({
            recovery_status: outcome === "declined" ? "declined" : "dormant",
            status: "lost"
          })
          .eq("id", campaign.lead_id);
      }

      console.log(`Campaign ${campaign_id} ${outcome}: ${stop_reason}`);
    }

    return jsonResponse(result);

  } catch (error) {
    console.error("Error in complete-lead-recovery:", error);
    return jsonResponse(
      { success: false, reason: "internal_error", message: String(error) },
      500
    );
  }
});

