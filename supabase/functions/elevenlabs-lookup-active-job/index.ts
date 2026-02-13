/**
 * ElevenLabs Tool: Lookup Active Job
 *
 * Allows the voice AI to look up a customer's active job/vehicle status
 * during a call. Matches by phone (primary), name (fuzzy), job number (exact),
 * or vehicle description (title match).
 *
 * Returns a speech-ready status message the AI can read directly.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LookupRequest {
  tenant_id: string;
  customer_phone?: string;
  customer_name?: string;
  job_number?: string;
  vehicle_description?: string;
  conversation_id?: string;
  params?: {
    tenant_id?: string;
    customer_phone?: string;
    customer_name?: string;
    job_number?: string;
    vehicle_description?: string;
  };
}

interface JobStatusResponse {
  found: boolean;
  job_id?: string;
  job_number?: string;
  status?: string;
  status_message: string;
  title?: string;
  services_total?: number;
  services_completed?: number;
  estimated_completion?: string;
  multiple_jobs?: boolean;
  job_count?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: LookupRequest = await req.json();

    // Handle nested params from ElevenLabs
    const tenantId = body.tenant_id || body.params?.tenant_id || "";
    const customerPhone = body.customer_phone || body.params?.customer_phone || "";
    const customerName = body.customer_name || body.params?.customer_name || "";
    const jobNumber = body.job_number || body.params?.job_number || "";
    const vehicleDescription = body.vehicle_description || body.params?.vehicle_description || "";
    const conversationId = body.conversation_id || "";

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          found: false,
          status_message: "I'm having trouble looking that up. Can I take your info and have someone call you back with an update?",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve caller phone from session if not provided directly
    let resolvedPhone = customerPhone;
    if (!resolvedPhone && conversationId) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("caller_phone")
        .eq("elevenlabs_conversation_id", conversationId)
        .maybeSingle();
      if (session?.caller_phone) {
        resolvedPhone = session.caller_phone;
      }
    }

    console.log(`[lookup-active-job] Searching: tenant=${tenantId.slice(0, 8)}, phone=${resolvedPhone}, name=${customerName}, job#=${jobNumber}, vehicle=${vehicleDescription}`);

    // Strategy 1: Direct job number lookup (most precise)
    if (jobNumber) {
      const { data: job, error } = await supabase
        .from("active_jobs")
        .select("id, job_number, title, status, priority, notes, estimated_completion, actual_completion, is_active, job_service_items(id, title, status, sort_order)")
        .eq("tenant_id", tenantId)
        .eq("job_number", jobNumber)
        .maybeSingle();

      if (error) {
        console.error("[lookup-active-job] Job number query error:", error);
        throw error;
      }

      if (job) {
        const response = buildJobResponse(job);
        console.log(`[lookup-active-job] Found by job_number ${jobNumber} in ${Date.now() - startTime}ms`);
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Job number provided but not found
      return new Response(
        JSON.stringify({
          found: false,
          status_message: "I don't see a job with that number. Could you double-check it? Or I can look it up by your phone number or name.",
        } as JobStatusResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strategy 2: Phone-based lookup (primary for callers)
    if (resolvedPhone) {
      const normalizedPhone = resolvedPhone.replace(/\D/g, "").slice(-10);

      const { data: jobs, error } = await supabase
        .from("active_jobs")
        .select("id, job_number, title, status, priority, notes, estimated_completion, actual_completion, is_active, customer_name, customer_phone, job_service_items(id, title, status, sort_order)")
        .eq("tenant_id", tenantId)
        .ilike("customer_phone", `%${normalizedPhone}%`)
        .eq("is_active", true)
        .in("status", ["intake", "in_progress", "on_hold"])
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("[lookup-active-job] Phone query error:", error);
        throw error;
      }

      if (jobs && jobs.length > 0) {
        const response = buildJobResponse(jobs[0], jobs.length > 1 ? jobs.length : undefined);
        console.log(`[lookup-active-job] Found ${jobs.length} job(s) by phone in ${Date.now() - startTime}ms`);
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Also check recently completed jobs (last 48 hours)
      const { data: completedJobs } = await supabase
        .from("active_jobs")
        .select("id, job_number, title, status, actual_completion, customer_phone, job_service_items(id, title, status, sort_order)")
        .eq("tenant_id", tenantId)
        .ilike("customer_phone", `%${normalizedPhone}%`)
        .eq("status", "completed")
        .order("actual_completion", { ascending: false })
        .limit(1);

      if (completedJobs && completedJobs.length > 0) {
        const job = completedJobs[0];
        return new Response(
          JSON.stringify({
            found: true,
            job_id: job.id,
            job_number: job.job_number,
            status: "completed",
            title: job.title,
            status_message: `Great news! Your ${job.title} is all done and ready for pickup.`,
          } as JobStatusResponse),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Strategy 3: Name-based fuzzy lookup (fallback)
    if (customerName) {
      const firstName = customerName.toLowerCase().split(" ")[0];
      if (firstName.length >= 2) {
        const { data: jobs } = await supabase
          .from("active_jobs")
          .select("id, job_number, title, status, priority, notes, estimated_completion, actual_completion, is_active, customer_name, job_service_items(id, title, status, sort_order)")
          .eq("tenant_id", tenantId)
          .ilike("customer_name", `%${firstName}%`)
          .eq("is_active", true)
          .in("status", ["intake", "in_progress", "on_hold"])
          .order("created_at", { ascending: false })
          .limit(5);

        if (jobs && jobs.length > 0) {
          const response = buildJobResponse(jobs[0], jobs.length > 1 ? jobs.length : undefined);
          console.log(`[lookup-active-job] Found ${jobs.length} job(s) by name in ${Date.now() - startTime}ms`);
          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Strategy 4: Vehicle description match against job title
    if (vehicleDescription) {
      const searchTerms = vehicleDescription.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
      if (searchTerms.length > 0) {
        // Search by first meaningful term in the vehicle description
        const { data: jobs } = await supabase
          .from("active_jobs")
          .select("id, job_number, title, status, priority, notes, estimated_completion, actual_completion, is_active, job_service_items(id, title, status, sort_order)")
          .eq("tenant_id", tenantId)
          .ilike("title", `%${searchTerms[0]}%`)
          .eq("is_active", true)
          .in("status", ["intake", "in_progress", "on_hold"])
          .order("created_at", { ascending: false })
          .limit(5);

        if (jobs && jobs.length > 0) {
          // Score by how many search terms match
          const scored = jobs.map((job: any) => {
            const titleLower = (job.title || "").toLowerCase();
            const matchCount = searchTerms.filter(t => titleLower.includes(t)).length;
            return { ...job, matchScore: matchCount };
          }).filter(j => j.matchScore > 0)
            .sort((a, b) => b.matchScore - a.matchScore);

          if (scored.length > 0) {
            const response = buildJobResponse(scored[0], scored.length > 1 ? scored.length : undefined);
            console.log(`[lookup-active-job] Found ${scored.length} job(s) by vehicle in ${Date.now() - startTime}ms`);
            return new Response(JSON.stringify(response), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    // Nothing found
    console.log(`[lookup-active-job] No jobs found in ${Date.now() - startTime}ms`);
    return new Response(
      JSON.stringify({
        found: false,
        status_message: "I don't see any active work orders on file for you. Do you have a job number, or know what name it might be under?",
      } as JobStatusResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[lookup-active-job] Error:", error);
    return new Response(
      JSON.stringify({
        found: false,
        status_message: "I'm having trouble looking that up right now. Can I take your info and have someone call you back with an update?",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Build a speech-ready response from an active_jobs row with its service items.
 */
function buildJobResponse(job: any, totalJobCount?: number): JobStatusResponse {
  const items = (job.job_service_items || []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );
  const completed = items.filter((i: { status: string }) => i.status === "completed");
  const inProgress = items.filter((i: { status: string }) => i.status === "in_progress");
  const remaining = items.filter((i: { status: string }) => i.status !== "completed" && i.status !== "skipped");

  let statusMessage = "";

  // Handle completed jobs
  if (job.status === "completed" || job.actual_completion) {
    statusMessage = `Great news! Your ${job.title} is all done and ready for pickup.`;
    return {
      found: true,
      job_id: job.id,
      job_number: job.job_number,
      status: "completed",
      title: job.title,
      status_message: statusMessage,
      services_total: items.length,
      services_completed: completed.length,
    };
  }

  // Handle on_hold
  if (job.status === "on_hold") {
    statusMessage = `Your ${job.title} is currently on hold.`;
    if (job.notes) {
      statusMessage += ` The note says: ${job.notes}`;
    }
    statusMessage += " Want me to have someone call you with more details?";
    return {
      found: true,
      job_id: job.id,
      job_number: job.job_number,
      status: job.status,
      title: job.title,
      status_message: statusMessage,
      services_total: items.length,
      services_completed: completed.length,
    };
  }

  // Active job — build progress summary
  if (items.length === 0) {
    statusMessage = `Your ${job.title} is in the shop and being worked on.`;
  } else if (completed.length === items.length) {
    statusMessage = `Your ${job.title} is all done! Everything's been completed.`;
  } else if (completed.length === 0) {
    if (inProgress.length > 0) {
      statusMessage = `Your ${job.title} is in the shop. We're currently working on the ${inProgress[0].title}.`;
    } else {
      statusMessage = `Your ${job.title} is in the queue. We haven't started on it yet but it's coming up.`;
    }
  } else {
    // Partial progress
    const completedNames = completed.map((i: { title: string }) => i.title).join(", ");
    if (inProgress.length > 0) {
      statusMessage = `Your ${job.title} is coming along. We've finished the ${completedNames}, and we're currently working on the ${inProgress[0].title}.`;
    } else {
      const remainingNames = remaining.map((i: { title: string }) => i.title).join(", ");
      statusMessage = `Your ${job.title} is coming along. We've finished the ${completedNames}. Still need to do the ${remainingNames}.`;
    }
  }

  // Add ETA if available
  if (job.estimated_completion) {
    const est = new Date(job.estimated_completion);
    const now = new Date();
    const diffHours = Math.round((est.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (diffHours > 0 && diffHours <= 4) {
      statusMessage += ` Should be ready in about ${diffHours} ${diffHours === 1 ? "hour" : "hours"}.`;
    } else if (diffHours > 4 && diffHours <= 24) {
      statusMessage += " Should be ready later today.";
    } else if (diffHours > 24 && diffHours <= 48) {
      statusMessage += " Looking like it'll be ready tomorrow.";
    }
  }

  // Multiple jobs note
  if (totalJobCount && totalJobCount > 1) {
    statusMessage = `I see you have ${totalJobCount} jobs with us. For the most recent one: ${statusMessage}`;
  }

  return {
    found: true,
    job_id: job.id,
    job_number: job.job_number,
    status: job.status,
    title: job.title,
    status_message: statusMessage,
    services_total: items.length,
    services_completed: completed.length,
    estimated_completion: job.estimated_completion || undefined,
    multiple_jobs: totalJobCount ? totalJobCount > 1 : false,
    job_count: totalJobCount || 1,
  };
}
