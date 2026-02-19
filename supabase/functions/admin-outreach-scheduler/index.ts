import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`[outreach-scheduler] Starting run at ${now.toISOString()}`);

    // Load settings
    const { data: settings } = await supabase
      .from("admin_growth_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings?.auto_outreach_enabled) {
      console.log("[outreach-scheduler] Auto outreach disabled");
      return jsonResponse({ success: true, reason: "disabled", processed: 0 });
    }

    // Check quiet hours
    if (isQuietTime(now, settings)) {
      console.log("[outreach-scheduler] Currently in quiet hours");
      return jsonResponse({ success: true, reason: "quiet_hours", processed: 0 });
    }

    // Check daily send limits
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const { count: emailsSentToday } = await supabase
      .from("admin_outreach_actions")
      .select("id", { count: "exact", head: true })
      .eq("action_type", "email")
      .eq("delivery_status", "sent")
      .gte("executed_at", todayStart.toISOString());

    const { count: smsSentToday } = await supabase
      .from("admin_outreach_actions")
      .select("id", { count: "exact", head: true })
      .eq("action_type", "sms")
      .eq("delivery_status", "sent")
      .gte("executed_at", todayStart.toISOString());

    const emailLimit = settings.outreach_daily_email_limit || 50;
    const smsLimit = settings.outreach_daily_sms_limit || 20;
    const emailsRemaining = Math.max(0, emailLimit - (emailsSentToday ?? 0));
    const smsRemaining = Math.max(0, smsLimit - (smsSentToday ?? 0));

    if (emailsRemaining === 0 && smsRemaining === 0) {
      console.log("[outreach-scheduler] Daily limits reached");
      return jsonResponse({ success: true, reason: "daily_limit_reached", processed: 0 });
    }

    // Find due enrollments
    const { data: dueEnrollments, error: queryErr } = await supabase
      .from("admin_outreach_enrollments")
      .select("id")
      .eq("status", "active")
      .not("next_action_at", "is", null)
      .lte("next_action_at", now.toISOString())
      .order("next_action_at", { ascending: true })
      .limit(50);

    if (queryErr) {
      console.error("[outreach-scheduler] Query error:", queryErr);
      return jsonResponse({ success: false, error: queryErr.message }, 500);
    }

    console.log(`[outreach-scheduler] Found ${dueEnrollments?.length ?? 0} due enrollments`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const enrollment of dueEnrollments ?? []) {
      processed++;
      try {
        const { data: result, error: execErr } = await supabase.functions.invoke(
          "admin-outreach-execute",
          { body: { enrollment_id: enrollment.id } }
        );

        if (execErr) {
          console.error(`[outreach-scheduler] Error for ${enrollment.id}:`, execErr);
          failed++;
          errors.push(`${enrollment.id}: ${execErr.message}`);
        } else if (result?.success) {
          succeeded++;
        } else {
          failed++;
          errors.push(`${enrollment.id}: ${result?.reason || "unknown"}`);
        }
      } catch (err) {
        failed++;
        errors.push(`${enrollment.id}: ${String(err)}`);
      }
    }

    console.log(`[outreach-scheduler] Complete: ${processed} processed, ${succeeded} succeeded, ${failed} failed`);

    return jsonResponse({ success: true, processed, succeeded, failed, errors: errors.slice(0, 10) });
  } catch (error) {
    console.error("[outreach-scheduler] Fatal error:", error);
    return jsonResponse({ success: false, error: String(error) }, 500);
  }
});

function isQuietTime(now: Date, settings: any): boolean {
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayName = dayNames[now.getDay()];

  if ((settings.outreach_quiet_days || []).includes(dayName)) return true;

  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const quietStart = settings.outreach_quiet_hours_start || "21:00";
  const quietEnd = settings.outreach_quiet_hours_end || "08:00";

  if (quietStart > quietEnd) {
    return currentTime >= quietStart || currentTime < quietEnd;
  }
  return currentTime >= quietStart && currentTime < quietEnd;
}
