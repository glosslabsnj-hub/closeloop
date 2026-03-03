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

    // Load enrollment (including lead_metadata for personalization)
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

    // Build rich context from lead_metadata for token resolution and personalization
    const meta = enrollment.lead_metadata || {};
    const frictionSignals: string[] = meta.friction_signals || [];
    const industry: string = meta.industry || "";
    const score: number = meta.score || 0;
    const scoreReasons: string[] = meta.score_reasons || frictionSignals;
    const website: string = meta.website || "";

    // Build a smart reason_snippet from actual friction signals
    const reasonSnippet = buildReasonSnippet(enrollment.lead_name, frictionSignals, industry);

    // Resolve tokens with real lead data
    const fromName = settings?.outreach_from_name || "Flux Receptionist";
    const fromEmail = settings?.outreach_from_email || "jack@getfluxdata.com";
    const demoLink = settings?.demo_link || "https://getfluxdata.com";
    const trialLink = settings?.trial_link || "https://getfluxdata.com/signup";
    let message = resolveTokens(step.message_template || "", enrollment, fromName, reasonSnippet, demoLink, trialLink);
    const subject = resolveTokens(step.subject || "", enrollment, fromName, reasonSnippet, demoLink, trialLink);

    // AI personalization with full lead context
    if (step.use_ai_personalization) {
      try {
        const personalized = await personalizeWithAI(message, enrollment, { industry, frictionSignals, score, scoreReasons, website });
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

    // Track step-level performance
    if (deliveryStatus === "sent") {
      await supabase.rpc("admin_increment_step_sent", {
        p_sequence_id: campaign.sequence_id,
        p_step_order: nextStepOrder,
      }).catch(() => {});

      await supabase.rpc("admin_increment_sequence_sent", {
        p_sequence_id: campaign.sequence_id,
      }).catch(() => {});
    }

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

function buildReasonSnippet(leadName: string, frictionSignals: string[], industry: string): string {
  const snippets: string[] = [];

  if (frictionSignals.includes("no_online_booking")) snippets.push("no online booking system");
  if (frictionSignals.includes("poor_responsiveness")) snippets.push("slow phone response times");
  if (frictionSignals.includes("small_team")) snippets.push("a small team handling all incoming calls");
  if (frictionSignals.includes("high_volume")) snippets.push("high call volume that's hard to keep up with");
  if (frictionSignals.includes("after_hours_demand")) snippets.push("customers calling after business hours");
  if (frictionSignals.includes("growth_signals")) snippets.push("strong growth that could overwhelm phone capacity");

  if (snippets.length > 0) {
    return `we noticed ${leadName} has ${snippets.slice(0, 2).join(" and ")}`;
  }

  if (industry) {
    return `we work with ${industry} businesses like ${leadName} to make sure every call gets answered`;
  }

  return `we noticed ${leadName} could benefit from AI phone answering`;
}

function resolveTokens(
  template: string,
  enrollment: any,
  fromName: string,
  reasonSnippet: string,
  demoLink: string,
  trialLink: string
): string {
  return template
    .replace(/\{\{business_name\}\}/g, enrollment.lead_name || "your business")
    .replace(/\{\{from_name\}\}/g, fromName)
    .replace(/\{\{reason_snippet\}\}/g, reasonSnippet)
    .replace(/\{\{demo_link\}\}/g, demoLink)
    .replace(/\{\{trial_link\}\}/g, trialLink)
    .replace(/\{\{link\}\}/g, demoLink);
}

async function personalizeWithAI(
  message: string,
  enrollment: any,
  context: { industry: string; frictionSignals: string[]; score: number; scoreReasons: string[]; website: string }
): Promise<string | null> {
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) return null;

  const contextLines = [
    `Business: ${enrollment.lead_name}`,
    context.industry ? `Industry: ${context.industry}` : null,
    context.website ? `Website: ${context.website}` : null,
    context.frictionSignals.length > 0 ? `Pain points: ${context.frictionSignals.join(", ")}` : null,
    context.score ? `Lead score: ${context.score}/100` : null,
    context.scoreReasons.length > 0 ? `Why they're a fit: ${context.scoreReasons.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      system: `You personalize cold outreach messages for an AI phone receptionist SaaS called Flux Receptionist. Use the business context to make the message feel genuinely written for this specific business. Reference their industry, specific pain points, or situation naturally. Keep the same structure, length, and call-to-action. Return ONLY the rewritten message, no quotes or explanation.`,
      messages: [
        {
          role: "user",
          content: `Business context:\n${contextLines}\n\nOriginal message:\n${message}`,
        },
      ],
      max_tokens: 500,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.content?.[0]?.text || null;
}

async function logActivity(supabase: any, type: string, title: string, description?: string, metadata?: any) {
  await supabase.from("admin_growth_activity_log").insert({
    activity_type: type,
    title,
    description: description || null,
    metadata: metadata || {},
  });
}
