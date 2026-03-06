/**
 * cron-weekly-ops-digest: Build weekly digest and notify owner via Telegram/SMS.
 *
 * Calls build-weekly-digest internally, then formats and sends
 * the results to the business owner. Runs weekly (Monday mornings).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTenantSms } from "../_shared/sms-sender.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Jack's Telegram for Gloss Labs notifications
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "8429513226:AAGnt47zIkkUIAyFB4Mb4_fYdptaV2iKnt0";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "6841391368";

async function sendTelegram(text: string): Promise<boolean> {
  try {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Trigger the digest builder (fire-and-forget if it fails, we still send what's available)
    let buildResult: any = {};
    try {
      const buildResp = await fetch(`${SUPABASE_URL}/functions/v1/build-weekly-digest`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
      });
      if (buildResp.ok) {
        buildResult = await buildResp.json();
      } else {
        console.warn("[weekly-ops-digest] Digest builder returned:", buildResp.status);
      }
    } catch (e) {
      console.warn("[weekly-ops-digest] Digest builder failed, using existing data:", e);
    }

    // Now fetch the latest digest for each tenant
    const periodEnd = new Date();
    periodEnd.setHours(23, 59, 59, 999);
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodStartDate = periodStart.toISOString().split("T")[0];
    const periodEndDate = periodEnd.toISOString().split("T")[0];

    const { data: digests } = await supabase
      .from("intelligence_digest")
      .select("*, tenants(name, business_mode)")
      .eq("digest_type", "weekly")
      .eq("period_start", periodStartDate)
      .eq("period_end", periodEndDate);

    if (!digests?.length) {
      return new Response(JSON.stringify({ message: "No digests to send", buildResult }));
    }

    const sent: string[] = [];

    for (const digest of digests) {
      const tenant = (digest as any).tenants;
      const metrics = digest.metrics_json as Record<string, number>;
      const highlights = digest.highlights_json as Array<{ title: string; value: string }>;
      const recs = digest.recommendations_json as Array<{ action: string; priority: string }>;

      if (!metrics?.total_calls && metrics?.total_calls !== 0) continue;

      // Format Telegram message
      const lines: string[] = [];
      lines.push(`<b>Weekly Report: ${tenant?.name || "Unknown"}</b>`);
      lines.push(`${periodStartDate} to ${periodEndDate}`);
      lines.push("");

      // Key metrics
      lines.push(`Calls: ${metrics.total_calls}`);
      if (metrics.total_calls > 0) {
        lines.push(`AI handled: ${metrics.ai_handled_calls}/${metrics.total_calls} (${(metrics.ai_handle_rate * 100).toFixed(0)}%)`);
      }
      if (metrics.bookings_created > 0) lines.push(`Bookings: ${metrics.bookings_created}`);
      if (metrics.orders_placed > 0) lines.push(`Orders: ${metrics.orders_placed}`);
      if (metrics.dispatches_created > 0) lines.push(`Dispatches: ${metrics.dispatches_created}`);
      if (metrics.callbacks_scheduled > 0) lines.push(`Callbacks: ${metrics.callbacks_scheduled}`);
      if (metrics.escalations > 0) lines.push(`Escalations: ${metrics.escalations}`);
      if (metrics.estimated_revenue_cents > 0) {
        lines.push(`Est. revenue: $${(metrics.estimated_revenue_cents / 100).toFixed(0)}`);
      }
      if (metrics.avg_call_duration_seconds > 0) {
        const mins = Math.floor(metrics.avg_call_duration_seconds / 60);
        const secs = metrics.avg_call_duration_seconds % 60;
        lines.push(`Avg call: ${mins}m ${secs}s`);
      }

      // Recommendations
      if (recs?.length) {
        lines.push("");
        lines.push("<b>Action items:</b>");
        for (const rec of recs.slice(0, 3)) {
          const icon = rec.priority === "high" ? "!" : "-";
          lines.push(`${icon} ${rec.action}`);
        }
      }

      const message = lines.join("\n");

      // Send to Telegram
      const telegramSent = await sendTelegram(message);
      if (telegramSent) {
        sent.push(digest.tenant_id);
        console.log(`[weekly-ops-digest] Sent Telegram digest for ${tenant?.name}`);
      }

      // Also send SMS summary to owner if configured
      const { data: ownerSettings } = await supabase
        .from("assistant_settings")
        .select("owner_forward_number, settings_json")
        .eq("tenant_id", digest.tenant_id)
        .maybeSingle();

      if (ownerSettings?.owner_forward_number) {
        const smsJson = (ownerSettings.settings_json as Record<string, any>)?.weekly_digest_sms;
        if (smsJson?.enabled !== false) {
          const smsMsg = `${tenant?.name} Weekly: ${metrics.total_calls} calls, ${metrics.bookings_created} bookings, ${(metrics.ai_handle_rate * 100).toFixed(0)}% AI handled. Check Telegram for full report.`;
          await sendTenantSms({
            tenantId: digest.tenant_id,
            to: ownerSettings.owner_forward_number,
            body: smsMsg,
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      digestsBuilt: buildResult.digestsCreated,
      notificationsSent: sent.length,
    }));
  } catch (err) {
    console.error("[cron-weekly-ops-digest] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500 },
    );
  }
});
