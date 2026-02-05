import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { captureException, captureMessage } from "../_shared/sentry.ts";

/**
 * Retry Failed Deliveries
 *
 * This function should be called on a schedule (e.g., every 5 minutes) to retry
 * failed handoff deliveries with exponential backoff.
 *
 * Configuration:
 * - MAX_RETRIES: Maximum number of retry attempts (default: 3)
 * - BASE_DELAY_MINUTES: Initial delay before first retry (default: 5)
 * - BACKOFF_MULTIPLIER: How much to multiply delay for each retry (default: 2)
 *
 * Retry schedule with defaults:
 * - 1st retry: 5 minutes after failure
 * - 2nd retry: 10 minutes after 1st retry
 * - 3rd retry: 20 minutes after 2nd retry
 * - After 3rd failure: Marked as permanently failed, alert triggered
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 3;
const BASE_DELAY_MINUTES = 5;
const BACKOFF_MULTIPLIER = 2;

interface FailedDelivery {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  method: string;
  error_message: string | null;
  created_at: string;
  retry_count: number;
  last_retry_at: string | null;
  next_retry_at: string | null;
}

// Calculate next retry time based on retry count
function calculateNextRetryTime(retryCount: number): Date {
  const delayMinutes = BASE_DELAY_MINUTES * Math.pow(BACKOFF_MULTIPLIER, retryCount);
  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
  return nextRetry;
}

// Check if a delivery is ready for retry
function isReadyForRetry(delivery: FailedDelivery): boolean {
  if (delivery.retry_count >= MAX_RETRIES) {
    return false; // Already exhausted retries
  }

  if (!delivery.next_retry_at) {
    return true; // No next retry time set, ready for first retry
  }

  const nextRetryTime = new Date(delivery.next_retry_at);
  return new Date() >= nextRetryTime;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase configuration");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log("Starting failed delivery retry job...");

    // Fetch failed deliveries that are ready for retry
    const { data: failedDeliveries, error: fetchError } = await supabase
      .from("delivery_attempts")
      .select("*")
      .eq("status", "failed")
      .lt("retry_count", MAX_RETRIES)
      .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("Failed to fetch deliveries:", fetchError);
      throw fetchError;
    }

    if (!failedDeliveries || failedDeliveries.length === 0) {
      console.log("No failed deliveries ready for retry");
      return new Response(
        JSON.stringify({ status: "success", retried: 0, message: "No deliveries to retry" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${failedDeliveries.length} failed deliveries to retry`);

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const delivery of failedDeliveries) {
      const { id, tenant_id, entity_type, entity_id, retry_count } = delivery;
      console.log(`Retrying delivery ${id}: ${entity_type}/${entity_id} (attempt ${retry_count + 1})`);

      try {
        // Call universal-delivery to retry the delivery
        const response = await fetch(`${SUPABASE_URL}/functions/v1/universal-delivery`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            tenant_id,
            entity_type,
            entity_id,
            retry_attempt: retry_count + 1,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Mark as successful
          await supabase
            .from("delivery_attempts")
            .update({
              status: "success",
              retry_count: retry_count + 1,
              last_retry_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", id);

          results.push({ id, success: true });
          console.log(`Retry successful for delivery ${id}`);
        } else {
          // Retry failed - update retry count and schedule next retry
          const newRetryCount = retry_count + 1;
          const nextRetryAt = newRetryCount < MAX_RETRIES
            ? calculateNextRetryTime(newRetryCount)
            : null;

          await supabase
            .from("delivery_attempts")
            .update({
              retry_count: newRetryCount,
              last_retry_at: new Date().toISOString(),
              next_retry_at: nextRetryAt?.toISOString() || null,
              error_message: result.error || "Retry failed",
            })
            .eq("id", id);

          results.push({ id, success: false, error: result.error });
          console.log(`Retry failed for delivery ${id}: ${result.error}`);

          // If max retries exhausted, trigger alert
          if (newRetryCount >= MAX_RETRIES) {
            console.log(`Max retries exhausted for delivery ${id}, triggering alert`);
            await triggerDeliveryFailureAlert(supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, delivery);
          }
        }
      } catch (error) {
        console.error(`Error retrying delivery ${id}:`, error);

        // Update retry tracking even on exceptions
        const newRetryCount = retry_count + 1;
        const nextRetryAt = newRetryCount < MAX_RETRIES
          ? calculateNextRetryTime(newRetryCount)
          : null;

        await supabase
          .from("delivery_attempts")
          .update({
            retry_count: newRetryCount,
            last_retry_at: new Date().toISOString(),
            next_retry_at: nextRetryAt?.toISOString() || null,
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", id);

        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        await captureException(error, {
          tags: { function: "retry-failed-deliveries", delivery_id: id },
          extra: { entity_type, entity_id, tenant_id },
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`Retry job complete: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        status: "success",
        retried: failedDeliveries.length,
        successful,
        failed,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Retry job error:", error);

    await captureException(error, {
      tags: { function: "retry-failed-deliveries" },
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Trigger an alert when max retries are exhausted
 async function triggerDeliveryFailureAlert(
   supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  delivery: FailedDelivery
): Promise<void> {
  const { tenant_id, entity_type, entity_id, error_message } = delivery;

   // Log to audit_events
   try {
     await supabase.from("audit_events").insert({
       tenant_id,
       event_type: "handoff.failed",
       entity_type,
       entity_id,
       actor_type: "system",
       payload: {
         error: error_message,
         retry_count: MAX_RETRIES,
         permanently_failed: true,
       },
     });
   } catch (e) {
     console.error("Failed to log audit event:", e);
   }

  // Send to Sentry for monitoring
  await captureMessage(
    `Handoff permanently failed: ${entity_type}/${entity_id}`,
    "error",
    {
      tags: {
        function: "retry-failed-deliveries",
        tenant_id,
        entity_type,
      },
      extra: { delivery },
    }
  );

  // Get tenant details for notification
  const { data: tenant } = await supabase
    .from("tenants")
    .select("business_name, owner_email")
    .eq("id", tenant_id)
    .single();
   
   const tenantData = tenant as { business_name: string; owner_email: string | null } | null;

  // Trigger notification workflow
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        tenant_id,
        trigger: "handoff.permanently_failed",
        entity_type,
        entity_id,
        is_critical: true,
        details: {
          error: error_message,
          retry_count: MAX_RETRIES,
           business_name: tenantData?.business_name,
           owner_email: tenantData?.owner_email,
        },
      }),
    });
  } catch (e) {
    console.error("Failed to trigger failure notification workflow:", e);
  }
}
