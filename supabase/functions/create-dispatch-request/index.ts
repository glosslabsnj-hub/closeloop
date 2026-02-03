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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateDispatchRequest {
  customer_name: string;
  customer_phone: string;
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
    return new Response(null, { headers: corsHeaders });
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

    // Validate required fields
    if (!customer_name || !pickup_address) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required information",
          error: "customer_name and pickup_address are required"
        } as CreateDispatchResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get tenant_id from active conversation
    let tenantId: string | null = null;
    let sessionId: string | null = null;
    
    if (conversation_id) {
      const { data: session } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id")
        .eq("elevenlabs_conversation_id", conversation_id)
        .maybeSingle();
      
      tenantId = session?.tenant_id || null;
      sessionId = session?.id || null;
    }

    // Fallback: try to get from most recent active session
    if (!tenantId) {
      const { data: recentSession } = await supabase
        .from("ai_call_sessions")
        .select("tenant_id, id")
        .is("ended_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      tenantId = recentSession?.tenant_id || null;
      sessionId = recentSession?.id || null;
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unable to identify business",
          error: "No active voice session found"
        } as CreateDispatchResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone
    const phoneE164 = normalizePhone(customer_phone);

    // Find or create customer
    let customerId: string | null = null;
    if (phoneE164) {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone_e164", phoneE164)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update name if provided
        if (customer_name) {
          await supabase
            .from("customers")
            .update({ full_name: customer_name, updated_at: new Date().toISOString() })
            .eq("id", customerId);
        }
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            tenant_id: tenantId,
            full_name: customer_name,
            phone_e164: phoneE164,
            phone_raw: customer_phone,
            source: "voice_ai"
          })
          .select("id")
          .single();

        if (!customerError && newCustomer) {
          customerId = newCustomer.id;
        }
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
        customer_name: customer_name,
        customer_phone: phoneE164 || customer_phone,
        pickup_address: pickup_address,
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
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to create dispatch request",
          error: dispatchError.message
        } as CreateDispatchResponse),
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
            customer_name,
            customer_phone: phoneE164,
            pickup_address,
            dropoff_address,
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

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[create-dispatch-request] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Unable to submit dispatch request",
        error: error instanceof Error ? error.message : "Unknown error"
      } as CreateDispatchResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
