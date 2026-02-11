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

    // Fetch failed deliveries from BOTH tables that are ready for retry
    const nowIso = new Date().toISOString();
    const [deliveryResult, handoffResult] = await Promise.all([
      supabase
        .from("delivery_attempts")
        .select("*")
        .eq("status", "failed")
        .lt("retry_count", MAX_RETRIES)
        .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
        .order("created_at", { ascending: true })
        .limit(50),
      supabase
        .from("handoff_attempts")
        .select("*")
        .eq("status", "failed")
        .lt("retry_count", MAX_RETRIES)
        .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
        .order("created_at", { ascending: true })
        .limit(25),
    ]);

    if (deliveryResult.error) {
      console.error("Failed to fetch delivery_attempts:", deliveryResult.error);
    }
    if (handoffResult.error) {
      console.error("Failed to fetch handoff_attempts:", handoffResult.error);
    }

    // Tag each with source table for correct update path
    const deliveryItems = (deliveryResult.data || []).map((d: FailedDelivery) => ({ ...d, _table: "delivery_attempts" as const }));
    const handoffItems = (handoffResult.data || []).map((h: Record<string, unknown>) => ({
      id: h.id as string,
      tenant_id: h.tenant_id as string,
      entity_type: (h.entity_type as string) || "order",
      entity_id: (h.entity_id as string) || (h.order_id as string) || "",
      method: h.method as string,
      error_message: h.error_message as string | null,
      created_at: h.created_at as string,
      retry_count: (h.retry_count as number) || 0,
      last_retry_at: h.last_retry_at as string | null,
      next_retry_at: h.next_retry_at as string | null,
      _table: "handoff_attempts" as const,
    }));

    const failedDeliveries = [...deliveryItems, ...handoffItems];

    if (failedDeliveries.length === 0) {
      console.log("No failed deliveries ready for retry");
      return new Response(
        JSON.stringify({ status: "success", retried: 0, message: "No deliveries to retry" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${failedDeliveries.length} failed deliveries to retry (${deliveryItems.length} from delivery_attempts, ${handoffItems.length} from handoff_attempts)`);

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const delivery of failedDeliveries) {
      const { id, tenant_id, entity_type, entity_id, retry_count, _table } = delivery;
      console.log(`Retrying ${_table}/${id}: ${entity_type}/${entity_id} (attempt ${retry_count + 1})`);

      // Determine retry endpoint: handoff_attempts uses entity-specific functions,
      // delivery_attempts uses universal-delivery
      let retryEndpoint: string;
      let retryBody: Record<string, unknown>;

      if (_table === "handoff_attempts") {
        // Route to correct handoff function
        const handoffMap: Record<string, string> = {
          booking: "booking-handoff",
          dispatch: "dispatch-handoff",
          order: "order-handoff",
        };
        const handoffFn = handoffMap[entity_type] || "universal-delivery";
        retryEndpoint = `${SUPABASE_URL}/functions/v1/${handoffFn}`;

        if (entity_type === "booking") {
          retryBody = { booking_id: entity_id, tenant_id };
        } else if (entity_type === "dispatch") {
          retryBody = { dispatch_id: entity_id, tenant_id };
        } else if (entity_type === "order") {
          retryBody = { order_id: entity_id, tenant_id };
        } else {
          retryBody = { tenant_id, entity_type, entity_id, retry_attempt: retry_count + 1 };
        }
      } else {
        retryEndpoint = `${SUPABASE_URL}/functions/v1/universal-delivery`;
        retryBody = { tenant_id, entity_type, entity_id, retry_attempt: retry_count + 1 };
      }

      try {
        const response = await fetch(retryEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify(retryBody),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          await supabase
            .from(_table)
            .update({
              status: "success",
              retry_count: retry_count + 1,
              last_retry_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", id);

          results.push({ id, success: true });
          console.log(`Retry successful for ${_table}/${id}`);
        } else {
          const newRetryCount = retry_count + 1;
          const nextRetryAt = newRetryCount < MAX_RETRIES
            ? calculateNextRetryTime(newRetryCount)
            : null;

          await supabase
            .from(_table)
            .update({
              retry_count: newRetryCount,
              last_retry_at: new Date().toISOString(),
              next_retry_at: nextRetryAt?.toISOString() || null,
              error_message: result.error || "Retry failed",
            })
            .eq("id", id);

          results.push({ id, success: false, error: result.error });
          console.log(`Retry failed for ${_table}/${id}: ${result.error}`);

          if (newRetryCount >= MAX_RETRIES) {
            console.log(`Max retries exhausted for ${_table}/${id}, triggering alert`);
            await triggerDeliveryFailureAlert(supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, delivery);
          }
        }
      } catch (error) {
        console.error(`Error retrying ${_table}/${id}:`, error);

        const newRetryCount = retry_count + 1;
        const nextRetryAt = newRetryCount < MAX_RETRIES
          ? calculateNextRetryTime(newRetryCount)
          : null;

        await supabase
          .from(_table)
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
