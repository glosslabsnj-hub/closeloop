/**
 * cron-process-outbound-queue
 *
 * Runs every 5 minutes. Processes the outbound_call_queue:
 * - Picks up queued calls where scheduled_at <= now
 * - Checks tenant business hours
 * - Calls outbound-call for each
 * - On failure: increments attempt_count, reschedules
 * - Respects rate limits (max 2 attempts per customer per day)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, corsResponse, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get queued items ready to process
    const { data: queueItems, error: fetchError } = await supabase
      .from("outbound_call_queue")
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(20); // Process max 20 per batch

    if (fetchError) {
      console.error("[cron-outbound] Fetch error:", fetchError);
      return jsonResponse({ success: false, error: fetchError.message }, 500);
    }

    if (!queueItems || queueItems.length === 0) {
      return jsonResponse({ success: true, processed: 0 });
    }

    console.log(`[cron-outbound] Processing ${queueItems.length} queued outbound calls`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of queueItems) {
      // Check if max attempts exceeded
      if (item.attempt_count >= item.max_attempts) {
        await supabase
          .from("outbound_call_queue")
          .update({ status: "failed", error_message: "Max attempts exceeded" })
          .eq("id", item.id);
        failed++;
        continue;
      }

      // Rate limit: max 2 attempts per customer per day
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayAttempts } = await supabase
        .from("outbound_call_queue")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", item.tenant_id)
        .eq("customer_phone", item.customer_phone)
        .gte("last_attempt_at", todayStart.toISOString())
        .not("status", "eq", "queued");

      if ((todayAttempts || 0) >= 2) {
        // Reschedule for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        await supabase
          .from("outbound_call_queue")
          .update({ scheduled_at: tomorrow.toISOString() })
          .eq("id", item.id);
        skipped++;
        continue;
      }

      // Increment attempt counter
      await supabase
        .from("outbound_call_queue")
        .update({
          attempt_count: (item.attempt_count || 0) + 1,
          last_attempt_at: new Date().toISOString(),
          status: "calling",
        })
        .eq("id", item.id);

      // Call the outbound-call function
      try {
        const callResponse = await fetch(`${supabaseUrl}/functions/v1/outbound-call`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            tenant_id: item.tenant_id,
            customer_phone: item.customer_phone,
            call_purpose: item.call_purpose,
            context: item.context_json || {},
            queue_item_id: item.id,
          }),
        });

        if (callResponse.ok) {
          const result = await callResponse.json();
          if (result.success) {
            processed++;
          } else {
            // Returned success: false (e.g., opted out, outside hours)
            // Status is already updated by outbound-call
            skipped++;
          }
        } else {
          // HTTP error — mark as failed for this attempt, re-queue
          const errText = await callResponse.text();
          console.error(`[cron-outbound] Call failed for ${item.id}:`, errText);

          if ((item.attempt_count || 0) + 1 < item.max_attempts) {
            // Reschedule for 1 hour later
            const retryAt = new Date(Date.now() + 60 * 60 * 1000);
            await supabase
              .from("outbound_call_queue")
              .update({
                status: "queued",
                scheduled_at: retryAt.toISOString(),
                error_message: `Attempt ${(item.attempt_count || 0) + 1} failed: ${errText.substring(0, 200)}`,
              })
              .eq("id", item.id);
          } else {
            await supabase
              .from("outbound_call_queue")
              .update({ status: "failed", error_message: `Final attempt failed: ${errText.substring(0, 200)}` })
              .eq("id", item.id);
          }
          failed++;
        }
      } catch (e) {
        console.error(`[cron-outbound] Error processing ${item.id}:`, e);
        // Re-queue with delay
        const retryAt = new Date(Date.now() + 60 * 60 * 1000);
        await supabase
          .from("outbound_call_queue")
          .update({
            status: "queued",
            scheduled_at: retryAt.toISOString(),
            error_message: `Error: ${(e as Error).message}`,
          })
          .eq("id", item.id);
        failed++;
      }
    }

    console.log(`[cron-outbound] Done: ${processed} processed, ${skipped} skipped, ${failed} failed`);

    return jsonResponse({
      success: true,
      processed,
      skipped,
      failed,
      total: queueItems.length,
    });

  } catch (error) {
    console.error("[cron-outbound] Error:", error);
    return jsonResponse({ success: false, error: (error as Error).message }, 500);
  }
});
