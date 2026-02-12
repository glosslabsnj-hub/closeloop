import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, errorResponse, corsResponse } from "../_shared/cors.ts";

interface NotifyJobUpdateRequest {
  job_id: string;
  event_type: "step_complete" | "all_complete" | "status_change";
  message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { job_id, event_type, message } = (await req.json()) as NotifyJobUpdateRequest;

    if (!job_id || !event_type) {
      return errorResponse("Missing required fields: job_id, event_type");
    }

    // Fetch the job
    const { data: job, error: jobError } = await supabase
      .from("active_jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return errorResponse("Job not found", 404);
    }

    // Check per-job notification toggles
    const shouldNotify =
      (event_type === "step_complete" && job.notify_on_step_complete) ||
      (event_type === "all_complete" && job.notify_on_all_complete) ||
      event_type === "status_change";

    if (!shouldNotify) {
      return jsonResponse({ notified: false, reason: "notification_disabled" });
    }

    // Check tenant-level notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("tenant_id", job.tenant_id)
      .maybeSingle();

    // Build notification message
    let notificationMessage = message || "";
    if (!notificationMessage) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("business_name")
        .eq("id", job.tenant_id)
        .single();

      const bizName = tenant?.business_name || "Our shop";

      switch (event_type) {
        case "step_complete":
          notificationMessage = `${bizName}: A service step has been completed on your ${job.title}. We'll keep you updated!`;
          break;
        case "all_complete":
          notificationMessage = `${bizName}: Great news! All work on your ${job.title} is complete. It's ready for pickup!`;
          break;
        case "status_change":
          notificationMessage = `${bizName}: Your ${job.title} status has been updated to ${job.status.replace("_", " ")}.`;
          break;
      }
    }

    // Log the update
    await supabase.from("job_status_updates").insert({
      job_id: job.id,
      tenant_id: job.tenant_id,
      previous_status: job.status,
      new_status: job.status,
      message: notificationMessage,
      triggered_notification: true,
    });

    // Route through universal-delivery if customer phone is available
    if (job.customer_phone) {
      try {
        const deliveryPayload = {
          tenant_id: job.tenant_id,
          entity_type: "job_update",
          entity_id: job.id,
          notification_message: notificationMessage,
          customer_phone: job.customer_phone,
          customer_name: job.customer_name || "Customer",
          event_type,
        };

        // Call universal-delivery
        const deliveryUrl = `${supabaseUrl}/functions/v1/universal-delivery`;
        await fetch(deliveryUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            tenant_id: job.tenant_id,
            entity_type: "job_update",
            entity_id: job.id,
          }),
        });
      } catch (deliveryError) {
        console.error("[notify-job-update] Delivery failed:", deliveryError);
        // Non-fatal — notification was still logged
      }
    }

    return jsonResponse({
      notified: true,
      event_type,
      job_id: job.id,
      customer_phone: job.customer_phone,
    });
  } catch (err) {
    console.error("[notify-job-update] Error:", err);
    return errorResponse("Internal server error", 500);
  }
});
