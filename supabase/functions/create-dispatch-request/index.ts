/**
 * create-dispatch-request: ElevenLabs tool endpoint for creating dispatch jobs
 * during voice calls.
 * 
 * Called by ElevenLabs agent when it has collected enough dispatch intake info:
 * - customer_name, customer_phone
 * - pickup_address, dropoff_address (optional)
 * - vehicle_type, drivable, urgency
 * - notes
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, jsonResponse } from "../_shared/cors.ts";
import { sanitizeCustomerName, isPlaceholderName, shouldUpdateCustomerName } from "../_shared/sanitizeName.ts";

interface CreateDispatchRequest {
  // Customer info (name is optional; phone is required to link/create a customer)
  customer_name?: string;
  customer_phone?: string;

  // Dispatch info
  pickup_address: string;
  dropoff_address?: string;
  vehicle_type?: string;
  drivable?: boolean;
  urgency?: "emergency" | "same_day" | "scheduled";
  notes?: string;

  // ElevenLabs context
  conversation_id?: string;
  agent_id?: string;
}

interface CreateDispatchResponse {
  success: boolean;
  job_number?: string;
  dispatch_id?: string;
  message: string;
  error?: string;
}

// Normalize phone to E.164 format
function normalizePhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.startsWith("+")) return phone;
  return `+${digits}`;
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
    case "same_day": return "normal";
    case "scheduled": return "low";
    default: return "normal";
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsResponse();
  }

  try {
    const body: CreateDispatchRequest = await req.json();
    const { 
      customer_name, 
      customer_phone, 
      pickup_address, 
      dropoff_address,
      vehicle_type,
      drivable,
      urgency,
      notes,
      conversation_id 
    } = body;

    const pickupAddress = (pickup_address || "").trim();

    // Validate required fields
    if (!pickupAddress) {
      return jsonResponse({
        success: false,
        message: "Missing required information",
        error: "pickup_address is required"
      } as CreateDispatchResponse);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get tenant_id from active conversation
    let tenantId: string | null = null;
    let sessionId: string | null = null;
    let sessionCallerPhone: string | null = null;
    
    // Strategy 1: Find by conversation_id
    if (conversation_id) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id, caller_phone")
        .eq("elevenlabs_conversation_id", conversation_id)
        .maybeSingle();
      
      tenantId = session?.tenant_id || null;
      sessionId = session?.id || null;
      sessionCallerPhone = session?.caller_phone || null;
      if (tenantId) {
        console.log(`[create-dispatch] Found session by conversation_id: ${conversation_id}`);
      }
    }

    // P0-2: Removed cross-tenant fallback (Strategy 2) that queried most
    // recent session across ALL tenants. This was a tenant isolation risk.
    
    // Strategy 3: Find by caller phone from body (recent session in last 5 min)
    if (!tenantId && customer_phone) {
      const phoneE164 = normalizePhone(customer_phone);
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: phoneSession } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id, caller_phone")
        .eq("caller_phone", phoneE164)
        .gte("created_at", fiveMinAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      tenantId = phoneSession?.tenant_id || null;
      sessionId = phoneSession?.id || null;
      sessionCallerPhone = phoneSession?.caller_phone || phoneE164 || null;
      if (tenantId) {
        console.log(`[create-dispatch] Found session by phone ${phoneE164}: ${sessionId}`);
      }
    }

    if (!tenantId) {
      console.error(`[create-dispatch] No session found. conv_id=${conversation_id}, phone=${customer_phone}`);
      return jsonResponse({
        success: false,
        message: "Unable to identify business",
        error: "No active voice session found"
      } as CreateDispatchResponse);
    }
    
    console.log(`[create-dispatch] Processing for tenant ${tenantId}, session ${sessionId}`);

    const rawCustomerName = (customer_name || "").trim();
    const effectivePhoneRaw = (customer_phone || sessionCallerPhone || "").trim();
    const phoneE164 = normalizePhone(effectivePhoneRaw);

    // Log if placeholder name was detected
    if (isPlaceholderName(rawCustomerName)) {
      console.log(`[create-dispatch] Placeholder name detected: "${rawCustomerName}" - will store as "Unknown"`);
      // Log to ai_event_logs for tracking
      try {
        await supabase.from("ai_event_logs").insert({
          tenant_id: tenantId,
          session_id: sessionId,
          stage: "dispatch_identity_missing",
          event_data: {
            tool: "create-dispatch-request",
            placeholder_detected: rawCustomerName || null,
            has_caller_phone: !!phoneE164,
          },
        });
      } catch (e) {
        // Don't block on logging errors
      }
    }

    // Sanitize customer name (converts placeholders to "Unknown")
    const sanitizedName = sanitizeCustomerName(rawCustomerName);

    if (!phoneE164) {
      return jsonResponse({
        success: false,
        message: "Missing phone number",
        error: "customer_phone is required to create a dispatch job"
      } as CreateDispatchResponse);
    }

    // Find or create customer (dispatch_jobs.customer_id is NOT NULL)
    let customerId: string | null = null;

    const { data: existingCustomer, error: existingCustomerError } = await supabase
      .from("customers")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("phone_e164", phoneE164)
      .maybeSingle();

    if (existingCustomerError) {
      console.error("[create-dispatch-request] Customer lookup error:", existingCustomerError);
    }

    if (existingCustomer) {
      customerId = existingCustomer.id;

      // Only update name if new name is better than existing
      if (shouldUpdateCustomerName(existingCustomer.full_name, rawCustomerName)) {
        await supabase
          .from("customers")
          .update({ full_name: sanitizedName, updated_at: new Date().toISOString() })
          .eq("id", customerId);
      } else {
        await supabase
          .from("customers")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", customerId);
      }
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenantId,
          full_name: sanitizedName,
          phone_e164: phoneE164,
          phone_raw: effectivePhoneRaw || null,
          source: "voice_ai",
        })
        .select("id")
        .single();

      if (customerError) {
        console.error("[create-dispatch-request] Failed to create customer:", customerError);
      } else {
        customerId = newCustomer?.id || null;
      }
    }

    if (!customerId) {
      return jsonResponse({
        success: false,
        message: "Unable to create dispatch request",
        error: "Could not resolve or create customer"
      } as CreateDispatchResponse);
    }

    // Use sanitized name for dispatch job
    const dispatchCustomerName = sanitizedName;

    // ========== DEDUPLICATION: Check for existing job with same session_id ==========
    // This prevents duplicate jobs when the AI calls the tool multiple times during a single call
    if (sessionId) {
      const { data: existingJob } = await supabase
        .from("dispatch_jobs")
        .select("id, job_number, customer_name")
        .eq("tenant_id", tenantId)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingJob) {
        console.log(`[create-dispatch-request] Existing job found for session ${sessionId}: ${existingJob.job_number}`);
        
        // Update the existing job with any new information (name, notes, etc.)
        const updatePayload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        
        // Update name if we now have a better one
        if (shouldUpdateCustomerName(existingJob.customer_name || "", rawCustomerName)) {
          updatePayload.customer_name = sanitizedName;
        }
        
        if (notes) updatePayload.notes = notes;
        if (dropoff_address) updatePayload.dropoff_address = dropoff_address;
        
        await supabase
          .from("dispatch_jobs")
          .update(updatePayload)
          .eq("id", existingJob.id);

        console.log(`[create-dispatch-request] Updated existing job ${existingJob.job_number} with new data`);

        return jsonResponse({
          success: true,
          job_number: existingJob.job_number,
          dispatch_id: existingJob.id,
          message: `Dispatch ${existingJob.job_number} updated successfully`
        } as CreateDispatchResponse);
      }
    }

    // Generate job number
    const jobNumber = generateJobNumber();

    // Build description
    const descriptionParts: string[] = [];
    if (vehicle_type) descriptionParts.push(`Vehicle: ${vehicle_type}`);
    if (typeof drivable === "boolean") descriptionParts.push(`Drivable: ${drivable ? "Yes" : "No"}`);
    const description = descriptionParts.join(". ") || null;

    // Create dispatch job
    const { data: dispatch, error: dispatchError } = await supabase
      .from("dispatch_jobs")
      .insert({
        tenant_id: tenantId,
        job_number: jobNumber,
        customer_id: customerId,
        customer_name: dispatchCustomerName,
        customer_phone: phoneE164,
        pickup_address: pickupAddress,
        dropoff_address: dropoff_address || null,
        job_type: vehicle_type ? "Tow" : "Dispatch",
        priority: urgencyToPriority(urgency),
        status: "pending",
        description: description,
        notes: notes || null,
        session_id: sessionId,
        requested_at: new Date().toISOString(),
      })
      .select("id, job_number")
      .single();

    if (dispatchError) {
      console.error("[create-dispatch-request] Error creating dispatch:", dispatchError);
      return jsonResponse({
        success: false,
        message: "Failed to create dispatch request",
        error: dispatchError.message
      } as CreateDispatchResponse);
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
          tenant_id: tenantId,
        }),
      });
    } catch (e) {
      console.error("[create-dispatch-request] Failed to trigger handoff:", e);
      // Don't fail the whole request if handoff fails
    }

    // Update session with dispatch outcome
    if (sessionId) {
      await supabase
        .from("ai_call_sessions")
        .update({
          outcome: "dispatch",
          extracted_payload: {
            dispatch_id: dispatch.id,
            job_number: dispatch.job_number,
            customer_name: sanitizedName || null,
            customer_phone: phoneE164,
            pickup_address: pickupAddress,
            dropoff_address: dropoff_address || null,
            vehicle_type,
            drivable,
            urgency,
            notes,
          }
        })
        .eq("id", sessionId);
    }

    console.log(`[create-dispatch-request] Created dispatch ${dispatch.job_number} for tenant ${tenantId.substring(0, 8)}...`);

    const response: CreateDispatchResponse = {
      success: true,
      job_number: dispatch.job_number,
      dispatch_id: dispatch.id,
      message: `Dispatch ${dispatch.job_number} created successfully`
    };

    return jsonResponse(response);

  } catch (error) {
    console.error("[create-dispatch-request] Error:", error);
    return jsonResponse({
      success: false,
      message: "Unable to submit dispatch request",
      error: error instanceof Error ? error.message : "Unknown error"
    } as CreateDispatchResponse);
  }
});
