import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/sendEmail.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`[social-poster] Starting run at ${now.toISOString()}`);

    // Load settings
    const { data: settings } = await supabase
      .from("admin_growth_settings")
      .select("auto_social_enabled, social_auto_post, notification_email")
      .limit(1)
      .maybeSingle();

    if (!settings?.auto_social_enabled) {
      return jsonResponse({ success: true, reason: "disabled", processed: 0 });
    }

    // Find due posts
    const { data: duePosts, error: queryErr } = await supabase
      .from("admin_social_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", now.toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(20);

    if (queryErr) {
      console.error("[social-poster] Query error:", queryErr);
      return jsonResponse({ success: false, error: queryErr.message }, 500);
    }

    console.log(`[social-poster] Found ${duePosts?.length ?? 0} due posts`);

    let processed = 0;

    for (const post of duePosts ?? []) {
      processed++;

      // Currently: mark as "posted" with note (admin manually posts)
      // Future: API posting for connected platforms
      await supabase
        .from("admin_social_posts")
        .update({
          status: "posted",
          notes: "Ready to post — copy content and post manually",
          updated_at: now.toISOString(),
        })
        .eq("id", post.id);

      // Log activity
      await supabase.from("admin_growth_activity_log").insert({
        activity_type: "social_posted",
        title: `${post.platform} post ready`,
        description: post.content.substring(0, 100),
        metadata: { post_id: post.id, platform: post.platform },
      });
    }

    // Notify admin about posts ready to publish
    if (processed > 0 && settings.notification_email) {
      const postList = (duePosts ?? [])
        .map((p: any) => `<li><strong>${p.platform}:</strong> ${p.content.substring(0, 100)}...</li>`)
        .join("");

      await sendEmail({
        to: settings.notification_email,
        subject: `${processed} social post(s) ready to publish`,
        html: `
          <h3>Social Posts Ready</h3>
          <p>${processed} scheduled post(s) are ready to be published:</p>
          <ul>${postList}</ul>
          <p>Visit the Growth Engine dashboard to copy content.</p>
        `,
      });
    }

    console.log(`[social-poster] Processed ${processed} posts`);

    return jsonResponse({ success: true, processed });
  } catch (error) {
    console.error("[social-poster] Fatal error:", error);
    return jsonResponse({ success: false, error: String(error) }, 500);
  }
});
