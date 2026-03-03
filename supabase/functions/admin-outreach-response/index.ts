import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get("content-type") || "";
    let from: string | null = null;
    let body: string | null = null;
    let channel: "sms" | "email" = "sms";

    // Handle Twilio SMS webhook (form-encoded)
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      from = formData.get("From") as string;
      body = formData.get("Body") as string;
      channel = "sms";
    } else {
      // Handle JSON (email webhook from Resend or manual)
      const json = await req.json();
      from = json.from_email || json.from || json.From;
      body = json.body || json.text || json.Body;
      channel = json.channel || "email";
    }

    if (!from || !body) {
      return errorResponse("Missing from or body", 400);
    }

    console.log(`[outreach-response] ${channel} reply from ${from}: ${body.substring(0, 100)}`);

    // Find matching enrollment by phone or email
    const field = channel === "sms" ? "lead_phone" : "lead_email";
    const { data: enrollment } = await supabase
      .from("admin_outreach_enrollments")
      .select("*")
      .eq(field, from)
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!enrollment) {
      console.log(`[outreach-response] No active enrollment found for ${from}`);
      return jsonResponse({ success: false, reason: "no_enrollment_found" });
    }

    // Analyze sentiment with AI
    let sentiment = "neutral";
    try {
      sentiment = await analyzeSentiment(body);
    } catch (e) {
      console.error("[outreach-response] Sentiment analysis failed:", e);
    }

    // Update enrollment
    await supabase
      .from("admin_outreach_enrollments")
      .update({
        status: "responded",
        response_text: body,
        response_sentiment: sentiment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", enrollment.id);

    // Atomically increment campaign response count
    await supabase.rpc("admin_increment_campaign_responded", {
      p_campaign_id: enrollment.campaign_id,
    }).catch((err: any) => {
      console.error("[outreach-response] Failed to increment campaign responded:", err);
    });

    // Track sequence-level response rate
    if (enrollment.current_step > 0) {
      const { data: camp } = await supabase
        .from("admin_outreach_campaigns")
        .select("sequence_id")
        .eq("id", enrollment.campaign_id)
        .maybeSingle();

      if (camp?.sequence_id) {
        await supabase.rpc("admin_increment_sequence_responded", {
          p_sequence_id: camp.sequence_id,
        }).catch(() => {});

        // Track which step triggered the response
        await supabase.rpc("admin_increment_step_responded", {
          p_sequence_id: camp.sequence_id,
          p_step_order: enrollment.current_step,
        }).catch(() => {});
      }
    }

    // Log activity
    await supabase.from("admin_growth_activity_log").insert({
      activity_type: "outreach_response",
      title: `${enrollment.lead_name} replied (${sentiment})`,
      description: body.substring(0, 200),
      metadata: {
        enrollment_id: enrollment.id,
        campaign_id: enrollment.campaign_id,
        channel,
        sentiment,
        from,
      },
    });

    // Send notification to admin
    const { data: settings } = await supabase
      .from("admin_growth_settings")
      .select("notification_email, notify_on_response")
      .limit(1)
      .maybeSingle();

    if (settings?.notify_on_response && settings?.notification_email) {
      const { sendEmail } = await import("../_shared/sendEmail.ts");
      await sendEmail({
        to: settings.notification_email,
        subject: `Outreach Response: ${enrollment.lead_name} (${sentiment})`,
        html: `
          <h3>${enrollment.lead_name} replied to outreach</h3>
          <p><strong>Channel:</strong> ${channel}</p>
          <p><strong>Sentiment:</strong> ${sentiment}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 3px solid #ccc; padding-left: 12px; color: #555;">${body}</blockquote>
        `,
      });
    }

    console.log(`[outreach-response] Processed ${channel} response from ${enrollment.lead_name} (${sentiment})`);

    return jsonResponse({ success: true, enrollment_id: enrollment.id, sentiment });
  } catch (error) {
    console.error("[outreach-response] Error:", error);
    return errorResponse(String(error), 500);
  }
});

async function analyzeSentiment(text: string): Promise<string> {
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) return "neutral";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      system: 'Classify the sentiment of this reply to a business outreach message. Reply with ONLY one word: "positive", "neutral", or "negative".',
      messages: [
        { role: "user", content: text },
      ],
      max_tokens: 10,
    }),
  });

  if (!res.ok) return "neutral";
  const data = await res.json();
  const result = (data.content?.[0]?.text || "neutral").toLowerCase().trim();
  if (["positive", "neutral", "negative"].includes(result)) return result;
  return "neutral";
}
