/**
 * ElevenLabs Tool: Lookup Dispatch Status
 * 
 * Allows the voice AI to look up a caller's dispatch job status
 * by matching at least 2 of 3 identifiers: name, phone, pickup address.
 * 
 * Returns job status with appropriate ETA information.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LookupRequest {
  tenant_id: string;
  customer_name?: string;
  customer_phone?: string;
  pickup_address?: string;
}

interface JobStatusResponse {
  found: boolean;
  job_id?: string;
  job_number?: string;
  status?: string;
  status_message?: string;
  driver_assigned?: boolean;
  en_route_since_minutes?: number;
  estimated_arrival_minutes?: number;
  pickup_address?: string;
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
    const { tenant_id, customer_name, customer_phone, pickup_address } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count how many identifiers were provided
    const identifiers = [customer_name, customer_phone, pickup_address].filter(Boolean);
    if (identifiers.length < 2) {
      return new Response(
        JSON.stringify({
          found: false,
          status_message: "I need at least two pieces of information to look up your job - your name, phone number, or pickup address. Could you provide another detail?",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query for active jobs
    let query = supabase
      .from("dispatch_jobs")
      .select(`
        id,
        job_number,
        status,
        customer_name,
        customer_phone,
        pickup_address,
        driver_id,
        en_route_at,
        on_site_at,
        estimated_arrival_at,
        created_at,
        fleet_drivers:driver_id (
          full_name,
          location_enabled,
          last_known_lat,
          last_known_lng,
          location_updated_at
        )
      `)
      .eq("tenant_id", tenant_id)
      .not("status", "in", '("completed","cancelled")')
      .order("created_at", { ascending: false });

    // Add filters based on provided identifiers
    // We use ilike for flexible matching
    const filters: string[] = [];
    
    if (customer_phone) {
      // Normalize phone for matching
      const normalizedPhone = customer_phone.replace(/\D/g, "");
      filters.push(`customer_phone.ilike.%${normalizedPhone.slice(-10)}%`);
    }
    
    if (customer_name) {
      // Fuzzy match on name
      const nameParts = customer_name.toLowerCase().split(" ");
      filters.push(`customer_name.ilike.%${nameParts[0]}%`);
    }
    
    if (pickup_address) {
      // Match key parts of address
      const addressParts = pickup_address.toLowerCase().split(" ").slice(0, 3).join("%");
      filters.push(`pickup_address.ilike.%${addressParts}%`);
    }

    // Apply OR filters
    if (filters.length > 0) {
      query = query.or(filters.join(","));
    }

    const { data: jobs, error } = await query.limit(5);

    if (error) {
      console.error("Query error:", error);
      throw error;
    }

    // Score jobs by how many identifiers match
    const scoredJobs = (jobs || []).map((job: any) => {
      let score = 0;
      
      if (customer_phone) {
        const normalizedInput = customer_phone.replace(/\D/g, "").slice(-10);
        const normalizedJob = (job.customer_phone || "").replace(/\D/g, "").slice(-10);
        if (normalizedInput === normalizedJob) score += 1;
      }
      
      if (customer_name) {
        const inputName = customer_name.toLowerCase();
        const jobName = (job.customer_name || "").toLowerCase();
        if (jobName.includes(inputName) || inputName.includes(jobName.split(" ")[0])) score += 1;
      }
      
      if (pickup_address) {
        const inputAddr = pickup_address.toLowerCase().replace(/[^a-z0-9]/g, "");
        const jobAddr = (job.pickup_address || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        // Check if significant overlap
        if (inputAddr.includes(jobAddr.slice(0, 10)) || jobAddr.includes(inputAddr.slice(0, 10))) score += 1;
      }
      
      return { ...job, matchScore: score };
    }).filter((job: any) => job.matchScore >= 2);

    if (scoredJobs.length === 0) {
      return new Response(
        JSON.stringify({
          found: false,
          status_message: "I couldn't find an active job matching that information. Could you double-check the details, or let me know if this is a new request?",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If multiple jobs, note it but use the most recent
    const multipleJobs = scoredJobs.length > 1;
    const job = scoredJobs[0];

    // Calculate ETA information
    let enRouteSinceMinutes: number | undefined;
    let estimatedArrivalMinutes: number | undefined;

    if (job.status === "en_route" && job.en_route_at) {
      const enRouteTime = new Date(job.en_route_at).getTime();
      const now = Date.now();
      enRouteSinceMinutes = Math.round((now - enRouteTime) / 60000);

      // If we have a calculated ETA, use it
      if (job.estimated_arrival_at) {
        const etaTime = new Date(job.estimated_arrival_at).getTime();
        estimatedArrivalMinutes = Math.max(0, Math.round((etaTime - now) / 60000));
      }
    }

    // Build status message
    let statusMessage = "";
    const driverAssigned = !!job.driver_id;

    switch (job.status) {
      case "pending":
        statusMessage = "We have your request logged. A driver hasn't been assigned yet, but we're working on getting someone to you as soon as possible.";
        break;
      case "assigned":
        statusMessage = "Good news! A driver has been assigned to your job and should be heading your way shortly.";
        break;
      case "en_route":
        if (enRouteSinceMinutes !== undefined && estimatedArrivalMinutes !== undefined) {
          if (estimatedArrivalMinutes <= 5) {
            statusMessage = `Your driver left about ${enRouteSinceMinutes} minutes ago and should be arriving any moment now.`;
          } else {
            statusMessage = `Your driver left about ${enRouteSinceMinutes} minutes ago and should arrive in roughly ${estimatedArrivalMinutes} minutes, give or take.`;
          }
        } else if (enRouteSinceMinutes !== undefined) {
          statusMessage = `Your driver has been on the way for about ${enRouteSinceMinutes} minutes. They should be there soon.`;
        } else {
          statusMessage = "Your driver is currently on the way to you.";
        }
        break;
      case "on_site":
        statusMessage = "Our driver is at the pickup location right now. They should be with you!";
        break;
      default:
        statusMessage = `Your job status is: ${job.status}. Is there something specific I can help with?`;
    }

    // Add note about multiple jobs if applicable
    if (multipleJobs) {
      statusMessage = `I found ${scoredJobs.length} active jobs for you. For the most recent one: ${statusMessage}`;
    }

    const response: JobStatusResponse = {
      found: true,
      job_id: job.id,
      job_number: job.job_number,
      status: job.status,
      status_message: statusMessage,
      driver_assigned: driverAssigned,
      en_route_since_minutes: enRouteSinceMinutes,
      estimated_arrival_minutes: estimatedArrivalMinutes,
      pickup_address: job.pickup_address,
      multiple_jobs: multipleJobs,
      job_count: multipleJobs ? scoredJobs.length : 1,
    };

    console.log(`[lookup-dispatch-status] Found job ${job.job_number} in ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[lookup-dispatch-status] Error:", error);
    return new Response(
      JSON.stringify({
        found: false,
        status_message: "I'm having trouble looking up your job right now. Can I take a message and have someone call you back with an update?",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
