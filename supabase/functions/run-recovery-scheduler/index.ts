import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SchedulerResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  expired: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const result: SchedulerResult = {
      success: true,
      processed: 0,
      succeeded: 0,
      failed: 0,
      expired: 0,
      errors: [],
    };

    const now = new Date().toISOString();
    console.log(`[Recovery Scheduler] Starting run at ${now}`);

    // Step 1: Find all due campaigns
    const { data: dueCampaigns, error: queryError } = await supabase
      .from("lead_recovery_campaigns")
      .select("id, tenant_id, next_action_at")
      .eq("status", "active")
      .not("next_action_at", "is", null)
      .lte("next_action_at", now)
      .order("next_action_at", { ascending: true })
      .limit(100);

    if (queryError) {
      console.error("Error querying campaigns:", queryError);
      return jsonResponse({ success: false, error: queryError.message }, 500);
    }

    console.log(`[Recovery Scheduler] Found ${dueCampaigns?.length || 0} due campaigns`);

    // Step 2: Process each campaign
    for (const campaign of dueCampaigns || []) {
      result.processed++;
      
      try {
        const { data: actionResult, error: actionError } = await supabase.functions.invoke(
          "execute-recovery-action",
          {
            body: {
              campaign_id: campaign.id,
              force_execute: false,
            },
          }
        );

        if (actionError) {
          console.error(`[Recovery Scheduler] Error processing campaign ${campaign.id}:`, actionError);
          result.failed++;
          result.errors.push(`Campaign ${campaign.id}: ${actionError.message}`);
        } else if (actionResult?.success) {
          console.log(`[Recovery Scheduler] Successfully processed campaign ${campaign.id}`);
          result.succeeded++;
        } else {
          console.warn(`[Recovery Scheduler] Campaign ${campaign.id} returned:`, actionResult?.reason);
          // Count as succeeded if it was processed (even if skipped/rescheduled)
          if (actionResult?.reason === "not_due_yet" || actionResult?.rescheduled) {
            result.succeeded++;
          } else {
            result.failed++;
            result.errors.push(`Campaign ${campaign.id}: ${actionResult?.reason || "unknown"}`);
          }
        }
      } catch (error) {
        console.error(`[Recovery Scheduler] Exception processing campaign ${campaign.id}:`, error);
        result.failed++;
        result.errors.push(`Campaign ${campaign.id}: ${String(error)}`);
      }
    }

    // Step 3: Handle stuck/expired campaigns
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: expiredCampaigns, error: expireError } = await supabase
      .from("lead_recovery_campaigns")
      .update({
        status: "expired",
        stopped_at: now,
        stopped_reason: "No progress for 30 days",
      })
      .eq("status", "active")
      .lt("updated_at", thirtyDaysAgo.toISOString())
      .select("id");

    if (!expireError && expiredCampaigns) {
      result.expired = expiredCampaigns.length;
      
      if (expiredCampaigns.length > 0) {
        console.log(`[Recovery Scheduler] Expired ${expiredCampaigns.length} stuck campaigns`);
        
        // Update related leads
        for (const expired of expiredCampaigns) {
          await supabase
            .from("leads")
            .update({ recovery_status: "dormant" })
            .eq("recovery_campaign_id", expired.id);
        }
      }
    }

    // Step 4: Clean up very old campaigns (optional - mark as dormant if > 90 days old)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    await supabase
      .from("lead_recovery_campaigns")
      .update({
        status: "expired",
        stopped_at: now,
        stopped_reason: "Campaign exceeded 90-day maximum age",
      })
      .in("status", ["active", "paused"])
      .lt("created_at", ninetyDaysAgo.toISOString());

    console.log(`[Recovery Scheduler] Run complete:`, result);

    return jsonResponse(result);

  } catch (error) {
    console.error("[Recovery Scheduler] Fatal error:", error);
    return jsonResponse(
      { success: false, error: String(error) },
      500
    );
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
