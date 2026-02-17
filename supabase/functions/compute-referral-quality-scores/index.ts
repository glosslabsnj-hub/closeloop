/**
 * compute-referral-quality-scores: Daily cron job.
 *
 * Updates quality_score for all opted-in referral network tenants.
 * Also resets daily referral counters and syncs go_live_ready + voice_ai_active.
 *
 * Scoring signals:
 *  - Brain completion %  (25 weight)
 *  - 30-day conversion rate (25)
 *  - AI handled rate (20)
 *  - Services configured (15)
 *  - Hours configured (10)
 *  - Calendar connected (5)
 *
 * Auth: service role (cron invocation)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all opted-in tenants
    const { data: settings, error } = await supabase
      .from("referral_network_settings")
      .select("tenant_id")
      .eq("enabled", true);

    if (error) {
      console.error("[quality-scores] Failed to fetch settings:", error);
      throw error;
    }

    if (!settings || settings.length === 0) {
      return new Response(
        JSON.stringify({ updated: 0, message: "No opted-in tenants" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantIds = settings.map((s) => s.tenant_id);
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let updatedCount = 0;

    for (const tenantId of tenantIds) {
      try {
        // Fetch all scoring data in parallel
        const [
          servicesResult,
          tenantResult,
          assistantResult,
          calendarResult,
          callOutcomesResult,
          faqsResult,
        ] = await Promise.all([
          supabase
            .from("services")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("is_active", true),
          supabase
            .from("tenants")
            .select("hours_json")
            .eq("id", tenantId)
            .single(),
          supabase
            .from("assistant_settings")
            .select("voice_ai_enabled")
            .eq("tenant_id", tenantId)
            .maybeSingle(),
          supabase
            .from("calendar_connections")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("status", "active"),
          supabase
            .from("call_outcomes")
            .select("outcome_type, ai_handled_fully")
            .eq("tenant_id", tenantId)
            .gte("created_at", thirtyDaysAgo),
          supabase
            .from("business_faqs")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId),
        ]);

        // Score: Services configured (0-15)
        const serviceCount = servicesResult.count || 0;
        const serviceScore =
          serviceCount >= 5 ? 15 : serviceCount >= 3 ? 12 : serviceCount >= 1 ? 8 : 0;

        // Score: Hours configured (0-10)
        const hoursJson = tenantResult.data?.hours_json;
        const hasHours =
          hoursJson && typeof hoursJson === "object" && Object.keys(hoursJson).length > 0;
        const hoursScore = hasHours ? 10 : 0;

        // Score: Calendar connected (0-5)
        const calendarScore = (calendarResult.count || 0) > 0 ? 5 : 0;

        // Score: Brain completion (0-25) — FAQs + services as proxy
        const faqCount = faqsResult.count || 0;
        let brainScore = 0;
        if (serviceCount >= 3 && faqCount >= 3) brainScore = 25;
        else if (serviceCount >= 1 && faqCount >= 1) brainScore = 15;
        else if (serviceCount >= 1 || faqCount >= 1) brainScore = 8;

        // Score: Conversion rate (0-25) and AI handled rate (0-20)
        const outcomes = callOutcomesResult.data || [];
        const totalCalls = outcomes.length;
        let conversionScore = 0;
        let aiHandledScore = 0;

        if (totalCalls > 0) {
          const booked = outcomes.filter(
            (o) =>
              o.outcome_type === "booked" ||
              o.outcome_type === "order" ||
              o.outcome_type === "dispatched"
          ).length;
          const conversionRate = booked / totalCalls;
          conversionScore = Math.min(25, Math.round(conversionRate * 50));

          const aiHandled = outcomes.filter((o) => o.ai_handled_fully).length;
          const aiRate = aiHandled / totalCalls;
          aiHandledScore = Math.min(20, Math.round(aiRate * 25));
        }

        const totalQuality = Math.min(
          100,
          brainScore + conversionScore + aiHandledScore + serviceScore + hoursScore + calendarScore
        );

        // Determine go_live_ready and voice_ai_active
        const voiceAiActive = assistantResult.data?.voice_ai_enabled === true;
        const goLiveReady = serviceCount >= 1 && hasHours && voiceAiActive;

        // Update
        await supabase
          .from("referral_network_settings")
          .update({
            quality_score: totalQuality,
            go_live_ready: goLiveReady,
            voice_ai_active: voiceAiActive,
            // Reset daily counter
            referrals_today: 0,
            referrals_today_reset: today,
          })
          .eq("tenant_id", tenantId);

        updatedCount++;
      } catch (e) {
        console.error(
          `[quality-scores] Failed for tenant ${tenantId.slice(0, 8)}:`,
          e
        );
      }
    }

    console.log(
      `[quality-scores] Updated ${updatedCount}/${tenantIds.length} tenants`
    );

    return new Response(
      JSON.stringify({
        updated: updatedCount,
        total: tenantIds.length,
        date: today,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[quality-scores] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
