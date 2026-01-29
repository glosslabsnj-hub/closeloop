import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MemoryHint {
  id: string;
  type: string;
  summary: string;
  confidence: number;
  subject_key: string | null;
  observation_count: number;
  usage: "suggest_alternatives" | "personalize" | "timing_preference" | "context";
}

interface RetrieveMemoryRequest {
  tenantId: string;
  locationId?: string;
  customerId?: string;
  context?: {
    intent?: string;
    service_id?: string;
    day_of_week?: number;
    hour?: number;
  };
}

interface RetrieveMemoryResponse {
  hints: MemoryHint[];
  memory_enabled: boolean;
  hipaa_restricted: boolean;
}

// Determine how AI should use this memory type
function determineUsage(memoryType: string): MemoryHint["usage"] {
  switch (memoryType) {
    case "time_pattern":
      return "timing_preference";
    case "customer_preference":
      return "personalize";
    case "capacity_pattern":
      return "suggest_alternatives";
    case "service_pattern":
    case "exception_pattern":
    default:
      return "context";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, locationId, customerId, context }: RetrieveMemoryRequest = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tenant and intelligence settings in parallel
    const [tenantResult, settingsResult] = await Promise.all([
      supabase.from("tenants").select("business_mode, hipaa_mode").eq("id", tenantId).single(),
      supabase.from("tenant_intelligence_settings").select("*").eq("tenant_id", tenantId).single(),
    ]);

    const tenant = tenantResult.data;
    const settings = settingsResult.data;

    // If no settings or memory disabled, return empty
    if (!settings || !settings.memory_enabled) {
      return new Response(
        JSON.stringify({ 
          hints: [], 
          memory_enabled: false, 
          hipaa_restricted: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hipaaMode = tenant?.business_mode === "medical" && tenant?.hipaa_mode === true;
    const minConfidence = settings.min_confidence_threshold || 0.65;
    const minObservations = settings.min_observation_threshold || 3;

    // Build memory query
    let query = supabase
      .from("business_memory")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .gte("confidence_score", minConfidence)
      .gte("observation_count", minObservations)
      .order("confidence_score", { ascending: false })
      .limit(10);

    // Location scoping
    if (locationId && !settings.share_memory_across_locations) {
      query = query.eq("location_id", locationId);
    } else if (settings.share_memory_across_locations) {
      // Include both location-specific and shared (null location) memories
      if (locationId) {
        query = query.or(`location_id.eq.${locationId},location_id.is.null`);
      }
    }

    // HIPAA mode: exclude customer-specific memories
    if (hipaaMode) {
      query = query.neq("memory_type", "customer_preference");
    }

    const { data: memories, error: memoryError } = await query;

    if (memoryError) {
      console.error("Error fetching memories:", memoryError);
      throw memoryError;
    }

    // Filter and rank memories based on context
    let relevantMemories = memories || [];

    // If customer ID provided and not in HIPAA mode, prioritize customer-specific memories
    if (customerId && !hipaaMode) {
      relevantMemories = relevantMemories.sort((a, b) => {
        const aIsCustomerSpecific = a.subject_key === `customer_${customerId}`;
        const bIsCustomerSpecific = b.subject_key === `customer_${customerId}`;
        if (aIsCustomerSpecific && !bIsCustomerSpecific) return -1;
        if (bIsCustomerSpecific && !aIsCustomerSpecific) return 1;
        return b.confidence_score - a.confidence_score;
      });
    }

    // If context provided, filter for relevance
    if (context) {
      relevantMemories = relevantMemories.filter((m) => {
        // Time patterns are relevant if they match day or hour
        if (m.memory_type === "time_pattern" && m.subject_key) {
          if (context.day_of_week !== undefined && m.subject_key.includes(`day_${context.day_of_week}`)) {
            return true;
          }
          if (context.hour !== undefined && m.subject_key.includes(`hour_${context.hour}`)) {
            return true;
          }
        }
        // Service patterns are relevant if they match service
        if (m.memory_type === "service_pattern" && context.service_id && m.subject_key === `service_${context.service_id}`) {
          return true;
        }
        // Capacity patterns are always relevant
        if (m.memory_type === "capacity_pattern") {
          return true;
        }
        // Exception patterns are always relevant
        if (m.memory_type === "exception_pattern") {
          return true;
        }
        // Customer preferences for specific customer
        if (m.memory_type === "customer_preference" && customerId && m.subject_key === `customer_${customerId}`) {
          return true;
        }
        // Include if no specific filter matched but confidence is high
        return m.confidence_score >= 0.8;
      });
    }

    // Transform to hints
    const hints: MemoryHint[] = relevantMemories.slice(0, 5).map((m) => ({
      id: m.id,
      type: m.memory_type,
      summary: m.summary,
      confidence: m.confidence_score,
      subject_key: m.subject_key,
      observation_count: m.observation_count,
      usage: determineUsage(m.memory_type),
    }));

    const response: RetrieveMemoryResponse = {
      hints,
      memory_enabled: true,
      hipaa_restricted: hipaaMode,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in retrieve-business-memory:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
