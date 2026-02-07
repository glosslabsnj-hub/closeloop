/**
 * elevenlabs-create-dispatch-job: ElevenLabs tool endpoint for creating dispatch jobs
 * during voice calls.
 * 
 * Called by ElevenLabs agent when it has collected enough dispatch intake info:
 * - customer_name, customer_phone
 * - pickup_address, dropoff_address (optional)
 * - vehicle_info, service_type, urgency
 * - notes
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeCustomerName, isPlaceholderName, shouldUpdateCustomerName } from "../_shared/sanitizeName.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateDispatchJobRequest {
  // Required
  pickup_address: string;
  service_type: string;
  // Dispatch mode specific
  vehicle_info?: string;
  dropoff_address?: string;
  // Common
  customer_name?: string;
  customer_phone?: string;
  urgency?: "emergency" | "urgent" | "standard" | "same_day" | "scheduled";
  notes?: string;
  // Pricing context from check_service_area
  dispatch_distance_miles?: number;
  tow_distance_miles?: number;
  total_distance_miles?: number;
  service_tier?: string;
  pricing_note?: string;
  price_cents?: number;
  price_breakdown?: Record<string, unknown>;
  // ElevenLabs context
  tenant_id?: string;
  conversation_id?: string;
}

interface CreateDispatchJobResponse {
  success: boolean;
  job_number?: string;
  dispatch_id?: string;
  message: string;
  error?: string;
}

// Normalize phone to E.164 format
function normalizePhone(phone: string | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return digits.length > 0 ? `+${digits}` : "";
}

// Generate job number
function generateJobNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DSP-${dateStr}-${random}`;
}

// Map urgency to priority
function urgencyToPriority(urgency?: string): "low" | "normal" | "high" | "urgent" {
  switch (urgency) {
    case "emergency": return "urgent";
    case "urgent": return "high";
    case "same_day": 
    case "standard": return "normal";
    case "scheduled": return "low";
    default: return "normal";
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body: CreateDispatchJobRequest = await req.json();
    console.log("[elevenlabs-create-dispatch-job] Request:", JSON.stringify({
      ...body,
      customer_phone: body.customer_phone ? "[REDACTED]" : undefined,
    }));

    const { 
      pickup_address, 
      service_type,
      vehicle_info,
      dropoff_address,
      customer_name,
      customer_phone, 
      urgency,
      notes,
      // Pricing from check_service_area
      dispatch_distance_miles,
      tow_distance_miles,
      total_distance_miles,
      service_tier,
      pricing_note,
      price_cents,
      price_breakdown,
      tenant_id,
      conversation_id 
    } = body;

    // Validate required fields
    if (!pickup_address) {
      console.error("[elevenlabs-create-dispatch-job] Missing pickup_address");
      return new Response(
        JSON.stringify({
          success: false,
          message: "I need your pickup location to send help. What's the address or cross streets where you need us?",
          error: "pickup_address is required"
        } as CreateDispatchJobResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!service_type) {
      console.error("[elevenlabs-create-dispatch-job] Missing service_type");
      return new Response(
        JSON.stringify({
          success: false,
          message: "What type of service do you need? Tow, jumpstart, lockout, tire change, or something else?",
          error: "service_type is required"
        } as CreateDispatchJobResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve tenant_id
    let resolvedTenantId: string | null = tenant_id || null;
    let sessionId: string | null = null;
    let sessionCallerPhone: string | null = null;
    
    // Try to get tenant from conversation_id if not provided
    if (!resolvedTenantId && conversation_id) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id, caller_phone")
        .eq("elevenlabs_conversation_id", conversation_id)
        .maybeSingle();
      
      resolvedTenantId = session?.tenant_id || null;
      sessionId = session?.id || null;
      sessionCallerPhone = session?.caller_phone || null;
      console.log(`[elevenlabs-create-dispatch-job] Resolved tenant from conversation: ${resolvedTenantId?.substring(0, 8)}...`);
    }

    // Get session ID if we have tenant but not session
    if (resolvedTenantId && !sessionId && conversation_id) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("id")
        .eq("tenant_id", resolvedTenantId)
        .eq("elevenlabs_conversation_id", conversation_id)
        .maybeSingle();
      sessionId = session?.id || null;
    }

    // Fallback: try to get from most recent active session for this tenant
    if (resolvedTenantId && !sessionId) {
      const { data: recentSession } = await supabase
        .from("ai_call_sessions")
        .select("id")
        .eq("tenant_id", resolvedTenantId)
        .is("ended_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      sessionId = recentSession?.id || null;
    }

    // P0-2: Removed cross-tenant fallback that queried most recent session
    // across ALL tenants. This was a tenant isolation risk.

    if (!resolvedTenantId) {
      console.error("[elevenlabs-create-dispatch-job] Could not resolve tenant_id");
      return new Response(
        JSON.stringify({
          success: false,
          message: "I'm having trouble connecting to the dispatch system. Let me take your information and have someone call you right back.",
          error: "No active voice session found - could not determine tenant"
        } as CreateDispatchJobResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone (prefer caller_id from the active session if the tool didn't send customer_phone)
    const effectivePhoneRaw = (customer_phone || sessionCallerPhone || "").trim();
    const phoneE164 = normalizePhone(effectivePhoneRaw);

    // Sanitize customer name - detect and normalize placeholders
    const rawCustomerName = (customer_name || "").trim();
    const sanitizedName = sanitizeCustomerName(rawCustomerName);

    // Log if placeholder name was detected
    if (isPlaceholderName(rawCustomerName)) {
      console.log(`[elevenlabs-create-dispatch-job] Placeholder name detected: "${rawCustomerName}" - storing as "Unknown"`);
      // Log to ai_event_logs for tracking
      try {
        await supabase.from("ai_event_logs").insert({
          tenant_id: resolvedTenantId,
          session_id: sessionId,
          stage: "dispatch_identity_missing",
          event_data: {
            tool: "elevenlabs-create-dispatch-job",
            placeholder_detected: rawCustomerName || null,
            has_caller_phone: !!phoneE164,
          },
        });
      } catch (e) {
        // Don't block on logging errors
      }
    }

    // Find or create customer
    let customerId: string | null = null;
    if (phoneE164) {
      try {
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id, full_name")
          .eq("tenant_id", resolvedTenantId)
          .eq("phone_e164", phoneE164)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
          // Only update name if new name is better than existing
          if (shouldUpdateCustomerName(existingCustomer.full_name, rawCustomerName)) {
            await supabase
              .from("customers")
              .update({ full_name: sanitizedName, updated_at: new Date().toISOString() })
              .eq("id", customerId);
          }
        } else {
          // Create new customer (name is sanitized)
          const { data: newCustomer, error: newCustomerError } = await supabase
            .from("customers")
            .insert({
              tenant_id: resolvedTenantId,
              full_name: sanitizedName,
              phone_e164: phoneE164,
              phone_raw: customer_phone || null,
              source: "voice_ai"
            })
            .select("id")
            .single();

          if (newCustomerError) {
            console.error("[elevenlabs-create-dispatch-job] Failed to create customer:", newCustomerError);
          } else if (newCustomer) {
            customerId = newCustomer.id;
          }
        }
      } catch (e) {
        console.error("[elevenlabs-create-dispatch-job] Customer lookup/create error:", e);
        // Continue without customer record
      }
    }

    if (!customerId) {
      console.error("[elevenlabs-create-dispatch-job] Missing customerId (cannot create dispatch job)");
      return new Response(
        JSON.stringify({
          success: false,
          message: "I can still get this dispatched — what's the best callback number for you?",
          error: "Unable to resolve or create customer"
        } as CreateDispatchJobResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== DEDUPLICATION: Check for existing job with same session_id ==========
    // This prevents duplicate jobs when the AI calls the tool multiple times during a single call
    if (sessionId) {
      const { data: existingJob } = await supabase
        .from("dispatch_jobs")
        .select("id, job_number, customer_name")
        .eq("tenant_id", resolvedTenantId)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingJob) {
        console.log(`[elevenlabs-create-dispatch-job] Existing job found for session ${sessionId}: ${existingJob.job_number}`);
        
        // Update the existing job with any new information (name, pricing, etc.)
        const updatePayload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        
        // Update name if we now have a better one
        if (shouldUpdateCustomerName(existingJob.customer_name || "", rawCustomerName)) {
          updatePayload.customer_name = sanitizedName;
        }
        
        // Update pricing data if provided
        if (dispatch_distance_miles !== undefined) updatePayload.dispatch_distance_miles = dispatch_distance_miles;
        if (tow_distance_miles !== undefined) updatePayload.tow_distance_miles = tow_distance_miles;
        if (total_distance_miles !== undefined) updatePayload.total_distance_miles = total_distance_miles;
        if (service_tier) updatePayload.service_tier = service_tier;
        if (pricing_note) updatePayload.pricing_note = pricing_note;
        if (price_cents !== undefined) updatePayload.price_cents = price_cents;
        if (price_breakdown) updatePayload.price_breakdown = price_breakdown;
        if (notes) updatePayload.notes = notes;
        if (dropoff_address) updatePayload.dropoff_address = dropoff_address;
        
        await supabase
          .from("dispatch_jobs")
          .update(updatePayload)
          .eq("id", existingJob.id);

        console.log(`[elevenlabs-create-dispatch-job] Updated existing job ${existingJob.job_number} with new data`);

        return new Response(JSON.stringify({
          success: true,
          job_number: existingJob.job_number,
          dispatch_id: existingJob.id,
          message: `Got it! Your job number is ${existingJob.job_number}. A driver is being dispatched to ${pickup_address}.`
        } as CreateDispatchJobResponse), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Generate job number
    const jobNumber = generateJobNumber();

    // Build description from vehicle_info and service_type
    const descriptionParts: string[] = [];
    if (vehicle_info) descriptionParts.push(`Vehicle: ${vehicle_info}`);
    const description = descriptionParts.join(". ") || null;

    // Create dispatch job with sanitized customer name and pricing data
    const { data: dispatch, error: dispatchError } = await supabase
      .from("dispatch_jobs")
      .insert({
        tenant_id: resolvedTenantId,
        job_number: jobNumber,
        customer_id: customerId,
        customer_name: sanitizedName,
        customer_phone: phoneE164 || customer_phone || null,
        pickup_address: pickup_address,
        dropoff_address: dropoff_address || null,
        job_type: service_type || "Tow",
        priority: urgencyToPriority(urgency),
        status: "pending",
        description: description,
        notes: notes || null,
        session_id: sessionId,
        requested_at: new Date().toISOString(),
        // Pricing data from check_service_area
        dispatch_distance_miles: dispatch_distance_miles || null,
        tow_distance_miles: tow_distance_miles || null,
        total_distance_miles: total_distance_miles || null,
        service_tier: service_tier || null,
        pricing_note: pricing_note || null,
        price_cents: price_cents || null,
        price_breakdown: price_breakdown || null,
      })
      .select("id, job_number")
      .single();

    if (dispatchError) {
      console.error("[elevenlabs-create-dispatch-job] Error creating dispatch:", dispatchError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "I'm having trouble submitting the dispatch. Let me take your information and have our dispatcher call you right back to confirm.",
          error: dispatchError.message
        } as CreateDispatchJobResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger dispatch handoff to notify the business
    try {
      await fetch(`${supabaseUrl}/functions/v1/dispatch-handoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          dispatch_id: dispatch.id,
          tenant_id: resolvedTenantId,
        }),
      });
    } catch (e) {
      console.error("[elevenlabs-create-dispatch-job] Failed to trigger handoff:", e);
      // Don't fail the whole request if handoff fails
    }

    // Update session with dispatch outcome
    if (sessionId) {
      try {
        await supabase
          .from("ai_call_sessions")
          .update({
            outcome: "dispatch",
            extracted_payload: {
              dispatch_id: dispatch.id,
              job_number: dispatch.job_number,
              customer_name,
              customer_phone: phoneE164,
              pickup_address,
              dropoff_address,
              vehicle_info,
              service_type,
              urgency,
              notes,
            }
          })
          .eq("id", sessionId);
      } catch (e) {
        console.error("[elevenlabs-create-dispatch-job] Failed to update session:", e);
      }
    }

    console.log(`[elevenlabs-create-dispatch-job] Created dispatch ${dispatch.job_number} for tenant ${resolvedTenantId.substring(0, 8)}...`);

    const response: CreateDispatchJobResponse = {
      success: true,
      job_number: dispatch.job_number,
      dispatch_id: dispatch.id,
      message: `Great! I've dispatched a driver to ${pickup_address}. Your job number is ${dispatch.job_number}. They should arrive within the estimated time I mentioned.`
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[elevenlabs-create-dispatch-job] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "I apologize, I'm having some technical difficulties. Let me take your number and have dispatch call you right back.",
        error: error instanceof Error ? error.message : "Unknown error"
      } as CreateDispatchJobResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
