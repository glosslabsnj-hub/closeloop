import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type MemoryType = 
  | "customer_preference"
  | "time_pattern"
  | "service_pattern"
  | "capacity_pattern"
  | "exception_pattern";

interface RecordObservationRequest {
  tenantId: string;
  locationId?: string;
  observationType: MemoryType;
  subjectKey: string;
  observation: string;
}

interface RecordObservationResponse {
  success: boolean;
  memory_id?: string;
  is_new: boolean;
  observation_count: number;
  confidence_score: number;
  blocked?: boolean;
  blocked_reason?: string;
}

// Calculate confidence score based on observation count
// Formula: min(1.0, 0.2 + (count * 0.15))
function calculateConfidence(count: number): number {
  return Math.min(1.0, 0.2 + count * 0.15);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, locationId, observationType, subjectKey, observation }: RecordObservationRequest = await req.json();

    if (!tenantId || !observationType || !subjectKey || !observation) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tenantId, observationType, subjectKey, observation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tenant to check HIPAA mode
    const { data: tenant } = await supabase
      .from("tenants")
      .select("business_mode, hipaa_mode")
      .eq("id", tenantId)
      .single();

    // HIPAA compliance: block customer_preference for medical tenants
    const hipaaMode = tenant?.business_mode === "medical" && tenant?.hipaa_mode === true;
    if (hipaaMode && observationType === "customer_preference") {
      return new Response(
        JSON.stringify({
          success: false,
          blocked: true,
          blocked_reason: "HIPAA compliance: customer-specific memory is disabled for medical tenants",
          is_new: false,
          observation_count: 0,
          confidence_score: 0,
        } as RecordObservationResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if similar observation already exists
    const { data: existing } = await supabase
      .from("business_memory")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("memory_type", observationType)
      .eq("subject_key", subjectKey)
      .maybeSingle();

    if (existing) {
      // Update existing memory: increment count, update timestamp, recalculate confidence
      const newCount = existing.observation_count + 1;
      const newConfidence = calculateConfidence(newCount);

      const { error: updateError } = await supabase
        .from("business_memory")
        .update({
          observation_count: newCount,
          confidence_score: newConfidence,
          last_observed_at: new Date().toISOString(),
          // Update summary if new observation provides more detail
          summary: observation.length > existing.summary.length ? observation : existing.summary,
        })
        .eq("id", existing.id);

      if (updateError) {
        throw updateError;
      }

      const response: RecordObservationResponse = {
        success: true,
        memory_id: existing.id,
        is_new: false,
        observation_count: newCount,
        confidence_score: newConfidence,
      };

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Create new memory with initial confidence
      const initialConfidence = calculateConfidence(1);

      const { data: newMemory, error: insertError } = await supabase
        .from("business_memory")
        .insert({
          tenant_id: tenantId,
          location_id: locationId || null,
          memory_type: observationType,
          subject_key: subjectKey,
          summary: observation,
          confidence_score: initialConfidence,
          observation_count: 1,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const response: RecordObservationResponse = {
        success: true,
        memory_id: newMemory.id,
        is_new: true,
        observation_count: 1,
        confidence_score: initialConfidence,
      };

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in record-observation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
