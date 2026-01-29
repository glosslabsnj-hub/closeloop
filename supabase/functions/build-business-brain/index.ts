import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MemoryHint {
  type: string;
  summary: string;
  confidence: number;
  usage: string;
}

interface IntentRuleMatch {
  type: string;
  name: string;
  action: Record<string, any>;
  reason: string;
}

interface IntelligenceSection {
  memory_enabled: boolean;
  hints: MemoryHint[];
  rules: IntentRuleMatch[];
  active_rules_count: number;
  hipaa_restricted: boolean;
}

interface BusinessBrain {
  business: {
    name: string;
    tagline: string | null;
    industry: string;
    phone: string | null;
    website: string | null;
    address: string | null;
    years_in_business: number | null;
    timezone: string;
    brand_voice: string;
  };
  hours: Record<string, { open: string; close: string; closed?: boolean; isOpen?: boolean }>;
  service_area: { type: string; miles?: number; codes?: string[] } | null;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price_type: string;
    price_amount: number | null;
    deposit_required: boolean | null;
    deposit_amount: number | null;
    preparation_instructions: string | null;
    upsell_suggestions: string[] | null;
  }>;
  pricing_rules: {
    quote_only_services: string[];
    starting_at_services: string[];
    deposit_rules: string[];
  };
  policies: {
    cancellation: string | null;
    deposit: string | null;
    refund: string | null;
    after_hours: string | null;
    emergency: string | null;
    warranties: string | null;
    payment_methods: string[] | null;
  };
  booking_rules: {
    min_lead_hours: number | null;
    max_advance_days: number | null;
    buffer_minutes: number | null;
    same_day_allowed: boolean;
    after_hours_behavior: string;
    booking_mode: string;
    closed_dates: string[];
  };
  availability_slots: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>;
  guardrails: {
    never_promise: string[];
    do_not_say: string[];
    escalation_rules: string[];
    ai_enabled: boolean;
  };
  faqs: Array<{ question: string; answer: string; priority: number }>;
  objection_responses: Array<{ objection: string; response: string; priority: number }>;
  intake_fields: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
    required: boolean;
  }>;
  ai_settings: {
    tone: string;
    greeting: string | null;
    fallback: string | null;
  } | null;
  intelligence?: IntelligenceSection;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId } = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all data in parallel for maximum efficiency
    const [
      tenantResult,
      servicesResult,
      faqsResult,
      objectionsResult,
      assistantResult,
      assistantSettingsResult,
      availabilitySlotsResult,
      knowledgeBaseResult,
      intelligenceSettingsResult,
      memoryResult,
      intentRulesResult,
    ] = await Promise.all([
      supabase.from("tenants").select("*").eq("id", tenantId).single(),
      supabase.from("services").select("*").eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("business_faqs").select("*").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }),
      supabase.from("objection_responses").select("*").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }),
      supabase.from("ai_assistants").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("assistant_settings").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("availability_slots").select("*").eq("tenant_id", tenantId).eq("is_available", true).order("day_of_week").order("start_time"),
      supabase.from("ai_knowledge_base").select("*").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }),
      supabase.from("tenant_intelligence_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("business_memory").select("*").eq("tenant_id", tenantId).eq("is_active", true).gte("confidence_score", 0.65).gte("observation_count", 3).order("confidence_score", { ascending: false }).limit(10),
      supabase.from("business_intent_rules").select("*").eq("tenant_id", tenantId).eq("is_enabled", true).eq("is_suggested", false).order("priority", { ascending: false }),
    ]);

    if (tenantResult.error) {
      console.error("Error fetching tenant:", tenantResult.error);
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenant = tenantResult.data;
    const services = servicesResult.data || [];
    const faqs = faqsResult.data || [];
    const objections = objectionsResult.data || [];
    const assistant = assistantResult.data;
    const assistantSettings = assistantSettingsResult.data;
    const availabilitySlots = availabilitySlotsResult.data || [];
    const knowledgeBase = knowledgeBaseResult.data || [];
    const intelligenceSettings = intelligenceSettingsResult.data;
    const memories = memoryResult.data || [];
    const intentRules = intentRulesResult.data || [];

    // Build intelligence section if enabled
    const hipaaMode = tenant.business_mode === "medical" && tenant.hipaa_mode === true;
    let intelligenceSection: IntelligenceSection | undefined;

    if (intelligenceSettings?.memory_enabled || intentRules.length > 0) {
      // Filter memories for HIPAA compliance
      const filteredMemories = hipaaMode 
        ? memories.filter((m: any) => m.memory_type !== "customer_preference")
        : memories;

      const hints: MemoryHint[] = filteredMemories.map((m: any) => ({
        type: m.memory_type,
        summary: m.summary,
        confidence: m.confidence_score,
        usage: m.memory_type === "time_pattern" ? "timing_preference" 
             : m.memory_type === "customer_preference" ? "personalize"
             : m.memory_type === "capacity_pattern" ? "suggest_alternatives"
             : "context",
      }));

      const rules: IntentRuleMatch[] = intentRules.map((r: any) => ({
        type: r.rule_type,
        name: r.name,
        action: r.action_json || {},
        reason: r.description || "Configured rule",
      }));

      intelligenceSection = {
        memory_enabled: intelligenceSettings?.memory_enabled || false,
        hints,
        rules,
        active_rules_count: intentRules.length,
        hipaa_restricted: hipaaMode,
      };
    }

    // Extract pricing rules from services
    const quoteOnlyServices = services
      .filter(s => s.price_type === 'quote_only')
      .map(s => s.name);
    const startingAtServices = services
      .filter(s => s.price_type === 'starting_at')
      .map(s => `${s.name}: starting at $${s.price_amount}`);
    const depositRules = services
      .filter(s => s.deposit_required && s.deposit_amount)
      .map(s => `${s.name}: $${s.deposit_amount} deposit required`);

    // Extract policies from knowledge base
    const policyItems = knowledgeBase.filter(k => k.type === 'policy');
    const emergencyPolicy = policyItems.find(p => p.title.toLowerCase().includes('emergency'))?.content || null;
    const warrantyPolicy = policyItems.find(p => p.title.toLowerCase().includes('warranty'))?.content || null;

    // Build escalation rules
    const escalationRules = [
      "If customer is angry or upset, offer to have the owner call back",
      "If question is about legal matters, escalate immediately",
      "If customer threatens legal action, escalate and don't make any commitments",
      "If customer requests a refund over $500, escalate to owner",
    ];

    // Build the comprehensive business brain
    const brain: BusinessBrain = {
      business: {
        name: tenant.name,
        tagline: tenant.tagline,
        industry: tenant.industry,
        phone: tenant.phone_public,
        website: tenant.website_url,
        address: tenant.address,
        years_in_business: tenant.years_in_business,
        timezone: tenant.timezone,
        brand_voice: assistant?.tone || 'friendly',
      },
      hours: tenant.hours_json || {},
      service_area: tenant.service_area_json,
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration_minutes: s.duration_minutes,
        price_type: s.price_type,
        price_amount: s.price_amount,
        deposit_required: s.deposit_required,
        deposit_amount: s.deposit_amount,
        preparation_instructions: s.preparation_instructions,
        upsell_suggestions: s.upsell_suggestions,
      })),
      pricing_rules: {
        quote_only_services: quoteOnlyServices,
        starting_at_services: startingAtServices,
        deposit_rules: depositRules,
      },
      policies: {
        cancellation: tenant.cancellation_policy,
        deposit: tenant.deposit_policy,
        refund: tenant.refund_policy,
        after_hours: "Leave a message and we'll call back during business hours",
        emergency: emergencyPolicy,
        warranties: warrantyPolicy,
        payment_methods: tenant.payment_methods,
      },
      booking_rules: {
        min_lead_hours: tenant.min_lead_hours,
        max_advance_days: tenant.max_advance_days,
        buffer_minutes: tenant.appointment_buffer_minutes,
        same_day_allowed: (tenant.min_lead_hours || 24) < 12,
        after_hours_behavior: assistantSettings?.missed_call_behavior || 'text_only',
        booking_mode: assistantSettings?.ai_booking_mode || 'auto_book',
        closed_dates: Array.isArray(tenant.closed_dates) ? tenant.closed_dates : [],
      },
      availability_slots: availabilitySlots.map(s => ({
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_available: s.is_available,
      })),
      guardrails: {
        never_promise: tenant.ai_never_promise || [],
        do_not_say: [
          "I guarantee",
          "We promise",
          "100% satisfaction",
          "We're the best",
          "Our competitors...",
        ],
        escalation_rules: escalationRules,
        ai_enabled: tenant.ai_enabled,
      },
      faqs: faqs.map(f => ({
        question: f.question,
        answer: f.answer,
        priority: f.priority_weight || 0,
      })),
      objection_responses: objections.map(o => ({
        objection: o.objection,
        response: o.response,
        priority: o.priority_weight || 0,
      })),
      intake_fields: Array.isArray(tenant.context_fields_json) ? tenant.context_fields_json : [],
      ai_settings: assistant ? {
        tone: assistant.tone,
        greeting: assistant.greeting_script,
        fallback: assistant.fallback_script,
      } : null,
      intelligence: intelligenceSection,
    };

    return new Response(
      JSON.stringify({ brain, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in build-business-brain:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
