import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";

interface EnrollRequest {
  campaign_id: string;
  leads: Array<{
    lead_id: string;
    lead_type: string;
    lead_name: string;
    lead_email?: string;
    lead_phone?: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await anonClient.auth.getUser();
      if (authErr || !user) return errorResponse("Unauthorized", 401);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      if (!roleData) return errorResponse("Forbidden", 403);
    }

    const body: EnrollRequest = await req.json();
    const { campaign_id, leads } = body;

    if (!campaign_id || !leads?.length) {
      return errorResponse("campaign_id and leads[] required", 400);
    }

    // Load campaign
    const { data: campaign } = await supabase
      .from("admin_outreach_campaigns")
      .select("sequence_id")
      .eq("id", campaign_id)
      .maybeSingle();

    if (!campaign) return errorResponse("Campaign not found", 404);

    // Get first step to calculate initial next_action_at
    const { data: firstStep } = await supabase
      .from("admin_outreach_sequence_steps")
      .select("delay_hours")
      .eq("sequence_id", campaign.sequence_id)
      .eq("step_order", 1)
      .maybeSingle();

    const initialDelay = (firstStep?.delay_hours || 0) * 3600_000;
    const nextActionAt = new Date(Date.now() + initialDelay).toISOString();

    // Build enrollment rows
    const rows = leads.map((lead) => ({
      campaign_id,
      lead_type: lead.lead_type,
      lead_id: lead.lead_id,
      lead_name: lead.lead_name,
      lead_email: lead.lead_email || null,
      lead_phone: lead.lead_phone || null,
      status: "active",
      current_step: 0,
      next_action_at: nextActionAt,
    }));

    // Upsert (skip already-enrolled)
    const { data: inserted, error: insertErr } = await supabase
      .from("admin_outreach_enrollments")
      .upsert(rows, { onConflict: "campaign_id,lead_id", ignoreDuplicates: true })
      .select("id");

    if (insertErr) {
      console.error("[outreach-enroll] Insert error:", insertErr);
      return errorResponse(insertErr.message, 500);
    }

    const enrolled = (inserted ?? []).length;

    // Update campaign total
    await supabase.rpc("admin_increment_campaign_enrolled" as any, {
      p_campaign_id: campaign_id,
      p_count: enrolled,
    }).catch(() => {
      // Fallback: manual update if RPC doesn't exist
      supabase
        .from("admin_outreach_campaigns")
        .update({
          total_enrolled: (rows.length),
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign_id);
    });

    // Log activity
    await supabase.from("admin_growth_activity_log").insert({
      activity_type: "enrollment",
      title: `${enrolled} lead(s) enrolled in outreach`,
      description: `Campaign: ${campaign_id}`,
      metadata: { campaign_id, enrolled, total_submitted: leads.length },
    });

    console.log(`[outreach-enroll] Enrolled ${enrolled}/${leads.length} leads into campaign ${campaign_id}`);

    return jsonResponse({ success: true, enrolled, skipped: leads.length - enrolled });
  } catch (error) {
    console.error("[outreach-enroll] Error:", error);
    return errorResponse(String(error), 500);
  }
});
