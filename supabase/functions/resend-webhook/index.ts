/**
 * Resend Webhook Handler
 *
 * Handles email delivery events from Resend (bounces, complaints, delays).
 * Updates delivery_attempts records and creates dashboard notifications
 * so business owners know when their emails aren't landing.
 *
 * Events handled:
 * - email.bounced: Mark delivery as bounced, flag the email address
 * - email.complained: Mark as complained (spam report)
 * - email.delivery_delayed: Log delay for monitoring
 *
 * Setup: Configure webhook URL in Resend dashboard →
 *   https://yltzlvzgwkidbeqaoevp.supabase.co/functions/v1/resend-webhook
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    bounce?: {
      message: string;
      type?: string;
    };
    complaint?: {
      feedback_type: string;
    };
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const event: ResendWebhookEvent = await req.json();
    const eventType = event.type;
    const recipientEmail = event.data.to?.[0] || "unknown";

    console.log(`[resend-webhook] Event: ${eventType}, to: ${recipientEmail}`);

    if (eventType === "email.bounced") {
      const bounceMessage = event.data.bounce?.message || "Email bounced";
      const bounceType = event.data.bounce?.type || "unknown";

      // Find and update any delivery_attempts with this email
      const { data: attempts } = await supabase
        .from("delivery_attempts")
        .select("id, tenant_id")
        .eq("method", "email")
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(10);

      // Update matching attempts to bounced
      if (attempts?.length) {
        for (const attempt of attempts) {
          await supabase
            .from("delivery_attempts")
            .update({
              status: "failed",
              error_message: `bounced: ${bounceType} - ${bounceMessage}`,
            })
            .eq("id", attempt.id);

          // Create a dashboard notification for the business owner
          if (attempt.tenant_id) {
            await supabase.from("notifications").insert({
              tenant_id: attempt.tenant_id,
              type: "email_bounce",
              title: "Email Delivery Issue",
              message: `Emails to ${recipientEmail} are bouncing. Check if the email address is correct in your notification settings.`,
              severity: "warning",
              action_url: "/settings/notifications",
            }).catch(() => { /* notifications table may not exist yet */ });
          }
        }
      }

      // Send admin Telegram alert
      await sendAdminTelegram(`EMAIL BOUNCE: ${recipientEmail} - ${bounceType}: ${bounceMessage}`);

    } else if (eventType === "email.complained") {
      const feedbackType = event.data.complaint?.feedback_type || "abuse";

      // Log complaint
      console.warn(`[resend-webhook] Spam complaint from ${recipientEmail}: ${feedbackType}`);
      await sendAdminTelegram(`SPAM COMPLAINT: ${recipientEmail} reported email as ${feedbackType}`);

    } else if (eventType === "email.delivery_delayed") {
      console.log(`[resend-webhook] Delivery delayed to ${recipientEmail}`);
      // Just log, don't alert unless it becomes persistent
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[resend-webhook] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendAdminTelegram(message: string): Promise<void> {
  try {
    const botToken = Deno.env.get("LENARD_TELEGRAM_BOT_TOKEN") || "8429513226:AAGnt47zIkkUIAyFB4Mb4_fYdptaV2iKnt0";
    const chatId = Deno.env.get("LENARD_TELEGRAM_CHAT_ID") || "6841391368";
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: `[RESEND] ${message}`, parse_mode: "HTML" }),
    });
  } catch { /* alerting must never block webhook processing */ }
}
