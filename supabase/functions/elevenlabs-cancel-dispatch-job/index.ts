/**
 * elevenlabs-cancel-dispatch-job: ElevenLabs tool endpoint for cancelling
 * dispatch jobs during voice calls.
 *
 * Finds the dispatch job by customer phone/name and cancels it.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhoneE164 } from "../_shared/phoneNormalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log(`[cancel-dispatch-job] Request:`, JSON.stringify(body));

    const p = body.params ?? {};
    const tenantId = body.tenant_id || p.tenant_id || "";
    const conversationId = body.conversation_id || p.conversation_id || "";
    const customerName = body.customer_name || p.customer_name || "";
    const customerPhone = body.customer_phone || p.customer_phone || "";
    const jobId = body.job_id || p.job_id || "";
    const jobNumber = body.job_number || p.job_number || "";
    const reason = body.reason || p.reason || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve tenant
    let resolvedTenantId = tenantId;
    if (conversationId && !resolvedTenantId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      resolvedTenantId = session?.tenant_id || "";
    }

    if (!resolvedTenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unable to cancel the job right now.",
          error: "No tenant context",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find the dispatch job
    let job: { id: string; job_number: string; status: string } | null = null;

    if (jobId) {
      const { data } = await supabase
        .from("dispatch_jobs")
        .select("id, job_number, status")
        .eq("id", jobId)
        .eq("tenant_id", resolvedTenantId)
        .maybeSingle();
      job = data;
    } else if (jobNumber) {
      const { data } = await supabase
        .from("dispatch_jobs")
        .select("id, job_number, status")
        .eq("job_number", jobNumber)
        .eq("tenant_id", resolvedTenantId)
        .maybeSingle();
      job = data;
    }

    if (!job) {
      // Find by customer phone
      const phoneE164 = normalizePhoneE164(customerPhone);
      if (phoneE164) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("tenant_id", resolvedTenantId)
          .eq("phone_e164", phoneE164)
          .maybeSingle();

        if (customer) {
          const { data } = await supabase
            .from("dispatch_jobs")
            .select("id, job_number, status")
            .eq("tenant_id", resolvedTenantId)
            .eq("customer_id", customer.id)
            .not("status", "eq", "cancelled")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          job = data;
        }
      }
    }

    // Last resort: find most recent active job via conversation session
    if (!job && conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("customer_id")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      if (session?.customer_id) {
        const { data } = await supabase
          .from("dispatch_jobs")
          .select("id, job_number, status")
          .eq("tenant_id", resolvedTenantId)
          .eq("customer_id", session.customer_id)
          .not("status", "eq", "cancelled")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        job = data;
      }
    }

    // Final fallback: most recent active job for this tenant (text-conversation / QA testing context)
    // When no phone/conversationId is available, the caller almost certainly means their most recent job.
    if (!job) {
      const { data } = await supabase
        .from("dispatch_jobs")
        .select("id, job_number, status")
        .eq("tenant_id", resolvedTenantId)
        .not("status", "in", "(cancelled,completed)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        job = data;
        console.log(`[cancel-dispatch-job] Using most-recent-active-job fallback: ${data.job_number}`);
      }
    }

    if (!job) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `I couldn't find an active job for ${customerName || "you"}. Can you give me the job number?`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if job can be cancelled
    if (job.status === "completed" || job.status === "cancelled") {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            job.status === "completed"
              ? "That job has already been completed."
              : "That job has already been cancelled.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (job.status === "on_site") {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "The driver is already on site. I'll have dispatch call you to discuss.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Cancel the job
    await supabase
      .from("dispatch_jobs")
      .update({
        status: "cancelled",
        notes: reason
          ? `Cancelled by caller: ${reason}`
          : "Cancelled by caller",
      })
      .eq("id", job.id);

    console.log(
      `[cancel-dispatch-job] Cancelled job ${job.id} (${job.job_number})`
    );

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        job_number: job.job_number,
        message: `Job ${job.job_number} has been cancelled. Is there anything else I can help with?`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[cancel-dispatch-job] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message:
          "I'm having trouble cancelling the job. Let me have dispatch call you.",
        error:
          error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
