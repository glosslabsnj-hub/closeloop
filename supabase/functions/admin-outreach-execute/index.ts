import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { sendEmail } from "../_shared/sendEmail.ts";

interface ExecuteRequest {
  enrollment_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { enrollment_id }: ExecuteRequest = await req.json();
    if (!enrollment_id) return errorResponse("missing enrollment_id", 400);

    // Load enrollment
    const { data: enrollment, error: enrollErr } = await supabase
      .from("admin_outreach_enrollments")
      .select("*")
      .eq("id", enrollment_id)
      .maybeSingle();

    if (enrollErr || !enrollment) return errorResponse("enrollment not found", 404);
    if (enrollment.status !== "active") return jsonResponse({ success: false, reason: "not_active" });

    // Load campaign
    const { data: campaign } = await supabase
      .from("admin_outreach_campaigns")
      .select("*")
      .eq("id", enrollment.campaign_id)
      .maybeSingle();

    if (!campaign || campaign.status !== "active") {
      return jsonResponse({ success: false, reason: "campaign_not_active" });
    }

    // Load settings
    const { data: settings } = await supabase
      .from("admin_growth_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    // Get current step
    const nextStepOrder = enrollment.current_step + 1;
    const { data: step } = await supabase
      .from("admin_outreach_sequence_steps")
      .select("*")
      .eq("sequence_id", campaign.sequence_id)
      .eq("step_order", nextStepOrder)
      .maybeSingle();

    if (!step) {
      // No more steps — complete
      await supabase
        .from("admin_outreach_enrollments")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", enrollment_id);

      await logActivity(supabase, "outreach_sent", `Sequence completed for ${enrollment.lead_name}`, enrollment.lead_name);
      return jsonResponse({ success: true, action: "completed" });
    }

    // Handle wait steps — just advance
    if (step.step_type === "wait") {
      const nextAt = new Date(Date.now() + step.delay_hours * 3600_000);
      await supabase
        .from("admin_outreach_enrollments")
        .update({
          current_step: nextStepOrder,
          next_action_at: nextAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", enrollment_id);

      return jsonResponse({ success: true, action: "wait", next_action_at: nextAt.toISOString() });
    }

    // Handle condition steps — skip remaining if responded
    if (step.step_type === "condition") {
      if (enrollment.response_text) {
        await supabase
          .from("admin_outreach_enrollments")
          .update({ status: "responded", updated_at: new Date().toISOString() })
          .eq("id", enrollment_id);
        return jsonResponse({ success: true, action: "condition_skipped" });
      }
      // Advance past condition
      await supabase
        .from("admin_outreach_enrollments")
        .update({ current_step: nextStepOrder, next_action_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", enrollment_id);
      return jsonResponse({ success: true, action: "condition_passed" });
    }

    // Skip if responded and step says so
    if (step.skip_if_responded && enrollment.response_text) {
      await supabase
        .from("admin_outreach_enrollments")
        .update({ current_step: nextStepOrder, next_action_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", enrollment_id);
      return jsonResponse({ success: true, action: "skipped_responded" });
    }

    // Resolve tokens
    const fromName = settings?.outreach_from_name || "CloseLoop";
    const fromEmail = settings?.outreach_from_email || "hello@closeloop.ai";
    let message = resolveTokens(step.message_template || "", enrollment, fromName);
    let subject = resolveTokens(step.subject || "", enrollment, fromName);

    // AI personalization
    if (step.use_ai_personalization) {
      try {
        const personalized = await personalizeWithAI(message, enrollment);
        if (personalized) message = personalized;
      } catch (e) {
        console.error("[outreach-execute] AI personalization failed, using template:", e);
      }
    }

    // Execute send
    let deliveryStatus = "failed";
    let deliveryError: string | null = null;
    let externalMessageId: string | null = null;

    if (step.step_type === "email" && enrollment.lead_email) {
      const result = await sendEmail({
        to: enrollment.lead_email,
        subject: subject || `${fromName} - Quick note`,
        html: `<div style="font-family: sans-serif; max-width: 600px;">${message.replace(/\n/g, "<br>")}</div>`,
        from: `${fromName} <${fromEmail}>`,
      });
      deliveryStatus = result.success ? "sent" : "failed";
      deliveryError = result.error || null;
      externalMessageId = result.resendId || null;
    } else if (step.step_type === "sms" && enrollment.lead_phone) {
      // Direct SMS via Twilio (admin-level, not tenant-scoped)
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioFrom = Deno.env.get("ADMIN_SMS_FROM_NUMBER");

      if (twilioSid && twilioAuth && twilioFrom) {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const smsRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: enrollment.lead_phone, From: twilioFrom, Body: message }),
        });
        if (smsRes.ok) {
          const smsData = await smsRes.json();
          deliveryStatus = "sent";
          externalMessageId = smsData.sid;
        } else {
          deliveryError = await smsRes.text();
        }
      } else {
        deliveryError = "Twilio admin SMS not configured";
      }
    } else {
      deliveryError = `No ${step.step_type === "email" ? "email" : "phone"} for lead`;
    }

    // Log action
    await supabase.from("admin_outreach_actions").insert({
      enrollment_id,
      campaign_id: campaign.id,
      step_order: nextStepOrder,
      action_type: step.step_type,
      message_sent: message,
      subject_sent: subject || null,
      delivery_status: deliveryStatus,
      delivery_error: deliveryError,
      external_message_id: externalMessageId,
    });

    // Advance enrollment
    const nextNextStep = await supabase
      .from("admin_outreach_sequence_steps")
      .select("delay_hours")
      .eq("sequence_id", campaign.sequence_id)
      .eq("step_order", nextStepOrder + 1)
      .maybeSingle();

    const nextActionAt = nextNextStep?.data
      ? new Date(Date.now() + (nextNextStep.data.delay_hours || 0) * 3600_000)
      : null;

    await supabase
      .from("admin_outreach_enrollments")
      .update({
        current_step: nextStepOrder,
        last_action_at: new Date().toISOString(),
        next_action_at: nextActionAt?.toISOString() || null,
        status: nextActionAt ? "active" : "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", enrollment_id);

    // Log activity
    await logActivity(
      supabase,
      "outreach_sent",
      `${step.step_type.toUpperCase()} sent to ${enrollment.lead_name}`,
      `Step ${nextStepOrder} - ${deliveryStatus}`,
      { enrollment_id, campaign_id: campaign.id, step_order: nextStepOrder, delivery_status: deliveryStatus }
    );

    return jsonResponse({
      success: true,
      action: step.step_type,
      delivery_status: deliveryStatus,
      next_action_at: nextActionAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("[outreach-execute] Error:", error);
    return errorResponse(String(error), 500);
  }
});

function resolveTokens(template: string, enrollment: any, fromName: string): string {
  return template
    .replace(/\{\{business_name\}\}/g, enrollment.lead_name || "your business")
    .replace(/\{\{from_name\}\}/g, fromName)
    .replace(/\{\{reason_snippet\}\}/g, "we noticed your business could benefit from AI phone answering")
    .replace(/\{\{demo_link\}\}/g, "https://closeloop.ai")
    .replace(/\{\{trial_link\}\}/g, "https://closeloop.ai/signup")
    .replace(/\{\{link\}\}/g, "https://closeloop.ai");
}

async function personalizeWithAI(message: string, enrollment: any): Promise<string | null> {
  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
  if (!apiKey) return null;

  const res = await fetch("https://ai.gateway.lovable.dev/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You personalize outreach messages. Keep the same structure and length but make it feel personally written for this specific business. Return ONLY the rewritten message, no quotes or explanation.",
        },
        {
          role: "user",
          content: `Personalize this message for "${enrollment.lead_name}":\n\n${message}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function logActivity(supabase: any, type: string, title: string, description?: string, metadata?: any) {
  await supabase.from("admin_growth_activity_log").insert({
    activity_type: type,
    title,
    description: description || null,
    metadata: metadata || {},
  });
}
