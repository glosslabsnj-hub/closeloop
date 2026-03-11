/**
 * cron-callback-escalation: Prevent lost leads by reminding business owners
 * about unclaimed callback requests.
 *
 * Escalation tiers (based on how long the callback has been pending):
 *   - 2-4 hours  -> Level 1: Reminder SMS
 *   - 4-8 hours  -> Level 2: Urgent reminder SMS
 *   - 8+ hours   -> Level 3: Critical SMS, status set to "escalated"
 *
 * Each tier sends exactly one SMS. The escalation_level column on
 * callback_requests tracks which tier has already been sent.
 *
 * Designed to run every 30 minutes via pg_cron or Supabase cron.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { serviceClient } from "../_shared/tenant.ts";
import { sendTenantSms } from "../_shared/sms-sender.ts";

interface EscalationResult {
  checked: number;
  reminders_sent: number;
  urgent_sent: number;
  critical_sent: number;
  sms_skipped: number;
  errors: number;
  error_details: { callback_id: string; tenant_id: string; error: string }[];
}

serve(async (_req: Request) => {
  const results: EscalationResult = {
    checked: 0,
    reminders_sent: 0,
    urgent_sent: 0,
    critical_sent: 0,
    sms_skipped: 0,
    errors: 0,
    error_details: [],
  };

  try {
    const supabase = serviceClient();
    const now = new Date();

    // Threshold timestamps
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();

    // Fetch all pending callbacks older than 2 hours that haven't been fully escalated
    const { data: callbacks, error: fetchErr } = await supabase
      .from("callback_requests")
      .select("id, tenant_id, customer_name, customer_phone, created_at, escalation_level, urgency")
      .eq("status", "pending")
      .lt("created_at", twoHoursAgo)
      .lt("escalation_level", 3)
      .order("created_at", { ascending: true });

    if (fetchErr) {
      console.error("[cron-callback-escalation] Failed to fetch callbacks:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!callbacks || callbacks.length === 0) {
      console.log("[cron-callback-escalation] No pending callbacks needing escalation.");
      return new Response(JSON.stringify({ message: "No callbacks to escalate", ...results }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    results.checked = callbacks.length;

    // Pre-fetch notification phones for all relevant tenants (batch lookup)
    const tenantIds = [...new Set(callbacks.map((cb) => cb.tenant_id))];
    const notifyPhoneMap = new Map<string, string>();
    const tenantNameMap = new Map<string, string>();

    // Get callback delivery settings
    const { data: deliveryRows } = await supabase
      .from("callback_delivery_settings")
      .select("tenant_id, sms_enabled, sms_recipient_phone")
      .in("tenant_id", tenantIds);

    if (deliveryRows) {
      for (const row of deliveryRows) {
        if (row.sms_recipient_phone) {
          notifyPhoneMap.set(row.tenant_id, row.sms_recipient_phone);
        }
      }
    }

    // For tenants without callback delivery settings, try booking_delivery_settings
    const missingTenants = tenantIds.filter((id) => !notifyPhoneMap.has(id));
    if (missingTenants.length > 0) {
      const { data: bookingRows } = await supabase
        .from("booking_delivery_settings")
        .select("tenant_id, notify_phone")
        .in("tenant_id", missingTenants);

      if (bookingRows) {
        for (const row of bookingRows) {
          if (row.notify_phone && !notifyPhoneMap.has(row.tenant_id)) {
            notifyPhoneMap.set(row.tenant_id, row.notify_phone);
          }
        }
      }
    }

    // Get tenant names for message personalization
    const { data: tenantRows } = await supabase
      .from("tenants")
      .select("id, name")
      .in("id", tenantIds);

    if (tenantRows) {
      for (const t of tenantRows) {
        tenantNameMap.set(t.id, t.name);
      }
    }

    // Process each callback
    for (const cb of callbacks) {
      try {
        const createdAt = new Date(cb.created_at);
        const ageMs = now.getTime() - createdAt.getTime();
        const ageHours = ageMs / (1000 * 60 * 60);

        // Determine which escalation level this callback qualifies for now
        let targetLevel: number;
        if (ageHours >= 8) {
          targetLevel = 3;
        } else if (ageHours >= 4) {
          targetLevel = 2;
        } else {
          targetLevel = 1; // 2-4 hours (already filtered by query)
        }

        // Skip if already at or above this escalation level
        if (cb.escalation_level >= targetLevel) {
          continue;
        }

        const notifyPhone = notifyPhoneMap.get(cb.tenant_id);
        if (!notifyPhone) {
          console.log(
            `[cron-callback-escalation] No notify phone for tenant ${cb.tenant_id}, skipping callback ${cb.id}`
          );
          results.sms_skipped++;
          // Still update escalation_level so we don't retry every cycle
          await supabase
            .from("callback_requests")
            .update({
              escalation_level: targetLevel,
              updated_at: now.toISOString(),
              ...(targetLevel === 3 ? { status: "escalated" } : {}),
            })
            .eq("id", cb.id);
          continue;
        }

        const tenantName = tenantNameMap.get(cb.tenant_id) || "your business";
        const customerDesc = cb.customer_name
          ? `${cb.customer_name}${cb.customer_phone ? ` (${cb.customer_phone})` : ""}`
          : cb.customer_phone || "a customer";
        const hoursWaiting = Math.round(ageHours * 10) / 10;

        // Build the SMS message based on escalation tier
        let smsBody: string;
        if (targetLevel === 1) {
          smsBody =
            `Reminder: ${customerDesc} requested a callback from ${tenantName} ${hoursWaiting}h ago and is still waiting. ` +
            `Please call them back soon. Reply STOP to opt out.`;
        } else if (targetLevel === 2) {
          smsBody =
            `URGENT: ${customerDesc} has been waiting ${hoursWaiting}h for a callback from ${tenantName}. ` +
            `This lead may go cold if not contacted soon. Reply STOP to opt out.`;
        } else {
          smsBody =
            `CRITICAL: ${customerDesc} requested a callback from ${tenantName} over ${hoursWaiting}h ago with NO response. ` +
            `This callback is now marked as escalated. Please respond immediately. Reply STOP to opt out.`;
        }

        // Send the SMS
        const smsResult = await sendTenantSms({
          tenantId: cb.tenant_id,
          to: notifyPhone,
          body: smsBody,
          entityType: "callback",
          entityId: cb.id,
        });

        if (!smsResult.success && !smsResult.skipped) {
          console.error(
            `[cron-callback-escalation] SMS failed for callback ${cb.id}:`,
            smsResult.error
          );
          results.errors++;
          results.error_details.push({
            callback_id: cb.id,
            tenant_id: cb.tenant_id,
            error: smsResult.error || "SMS send failed",
          });
          // Don't update escalation_level on SMS failure so we retry next cycle
          continue;
        }

        // Update the callback record
        const updatePayload: Record<string, unknown> = {
          escalation_level: targetLevel,
          updated_at: now.toISOString(),
        };

        // Mark as escalated at level 3
        if (targetLevel === 3) {
          updatePayload.status = "escalated";
        }

        const { error: updateErr } = await supabase
          .from("callback_requests")
          .update(updatePayload)
          .eq("id", cb.id);

        if (updateErr) {
          console.error(
            `[cron-callback-escalation] Failed to update callback ${cb.id}:`,
            updateErr
          );
          results.errors++;
          results.error_details.push({
            callback_id: cb.id,
            tenant_id: cb.tenant_id,
            error: `DB update failed: ${updateErr.message}`,
          });
          continue;
        }

        // Track which tier was sent
        if (targetLevel === 1) {
          results.reminders_sent++;
        } else if (targetLevel === 2) {
          results.urgent_sent++;
        } else {
          results.critical_sent++;
        }

        const levelLabel = targetLevel === 1 ? "REMINDER" : targetLevel === 2 ? "URGENT" : "CRITICAL";
        console.log(
          `[cron-callback-escalation] Sent ${levelLabel} for callback ${cb.id} ` +
            `(tenant ${cb.tenant_id}, ${hoursWaiting}h old)`
        );
      } catch (cbErr) {
        const errMsg = cbErr instanceof Error ? cbErr.message : String(cbErr);
        console.error(`[cron-callback-escalation] Error processing callback ${cb.id}:`, errMsg);
        results.errors++;
        results.error_details.push({
          callback_id: cb.id,
          tenant_id: cb.tenant_id,
          error: errMsg,
        });
      }
    }

    console.log("[cron-callback-escalation] Done:", JSON.stringify(results));
    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[cron-callback-escalation] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: String(error), ...results }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
