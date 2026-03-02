import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuthedTenant, serviceClient } from "../_shared/tenant.ts";

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
  
  // Mode-specific knowledge sections
  menu_knowledge?: Array<{
    name: string;
    description: string | null;
    ingredients: string[];
    allergens: string[];
    dietary_tags: string[];
    pairing_suggestions: string | null;
    spice_level: number;
    is_signature: boolean;
    is_seasonal: boolean;
  }>;
  catering_knowledge?: Array<{
    event_type: string;
    min_guests: number | null;
    max_guests: number | null;
    lead_time_days: number | null;
    deposit_percentage: number | null;
    setup_requirements: string | null;
    staffing_included: boolean;
    ai_script: string | null;
  }>;
  vehicle_knowledge?: Array<{
    category: string;
    equipment_required: string[];
    weight_class: string | null;
    special_instructions: string | null;
    hookup_minutes: number | null;
    requires_permit: boolean;
    extra_fees: boolean;
    fee_notes: string | null;
  }>;
  roadside_knowledge?: Array<{
    situation: string;
    priority: string;
    safety_script: string | null;
    service_time_minutes: number | null;
    escalation_triggers: string[];
    self_service_tips: string | null;
    ai_script: string | null;
  }>;
  symptom_triage?: Array<{
    category: string;
    symptom: string;
    severity_indicators: string[];
    escalation_action: string | null;
    pre_visit_instructions: string | null;
    questions_to_ask: string[];
    can_telehealth: boolean;
    hipaa_response: string | null;
  }>;
  insurance_knowledge?: Array<{
    carrier: string;
    plan_types: string[];
    is_accepted: boolean;
    copay_range: string | null;
    verification_process: string | null;
    patient_script: string | null;
  }>;
  product_knowledge?: Array<{
    name: string;
    brand: string | null;
    category: string | null;
    benefits: string[];
    is_premium: boolean;
    upsell_script: string | null;
    usage_instructions: string | null;
  }>;
  aftercare_instructions?: Array<{
    service_name: string;
    immediate_care: string[];
    ongoing_care: string[];
    things_to_avoid: string[];
    warning_signs: string[];
    follow_up_timeframe: string | null;
    ai_script: string | null;
  }>;
  competitor_positioning?: Array<{
    competitor: string;
    our_advantages: string[];
    response_script: string | null;
    never_say: string[];
  }>;
  seasonal_events?: Array<{
    event_name: string;
    start_date: string | null;
    end_date: string | null;
    special_hours: string | null;
    special_pricing: string | null;
    booking_tips: string | null;
    ai_announcement: string | null;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const requestedTenantId = body.tenantId ?? body.tenant_id ?? null;

    // SECURITY: Validate user has access to the requested tenant
    const { tenantId } = await requireAuthedTenant(req, requestedTenantId);

    const supabase = serviceClient();

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
      // Mode-specific knowledge
      menuKnowledgeResult,
      cateringKnowledgeResult,
      vehicleKnowledgeResult,
      roadsideKnowledgeResult,
      symptomTriageResult,
      insuranceKnowledgeResult,
      productKnowledgeResult,
      // Shared knowledge
      aftercareResult,
      competitorResult,
      seasonalResult,
      intakeRequirementsResult,
      intakeTemplatesResult,
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
      // Mode-specific knowledge tables
      supabase.from("menu_knowledge").select("*").eq("tenant_id", tenantId).order("is_signature", { ascending: false }),
      supabase.from("catering_knowledge").select("*").eq("tenant_id", tenantId).order("event_type"),
      supabase.from("vehicle_knowledge").select("*").eq("tenant_id", tenantId).order("vehicle_category"),
      supabase.from("roadside_knowledge").select("*").eq("tenant_id", tenantId).order("priority_level", { ascending: false }),
      supabase.from("symptom_triage").select("*").eq("tenant_id", tenantId).order("symptom_category"),
      supabase.from("insurance_knowledge").select("*").eq("tenant_id", tenantId).order("carrier_name"),
      supabase.from("product_knowledge").select("*").eq("tenant_id", tenantId).order("is_premium", { ascending: false }),
      // Shared knowledge tables
      supabase.from("aftercare_instructions").select("*").eq("tenant_id", tenantId).order("service_name"),
      supabase.from("competitor_knowledge").select("*").eq("tenant_id", tenantId).order("competitor_name"),
      supabase.from("seasonal_knowledge").select("*").eq("tenant_id", tenantId).order("event_name"),
      // Intake requirements (tenant-specific)
      supabase.from("intake_requirements").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("ask_order"),
      // Intake field templates (global templates based on industry)
      supabase.from("intake_field_templates").select("*").order("display_order"),
    ]);

    if (tenantResult.error) {
      console.error("Error fetching tenant:", tenantResult.error);
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log any table-level errors for debugging (non-fatal — use empty arrays)
    const queryResults = [
      ['services', servicesResult],
      ['business_faqs', faqsResult],
      ['objection_responses', objectionsResult],
      ['ai_assistants', assistantResult],
      ['assistant_settings', assistantSettingsResult],
      ['availability_slots', availabilitySlotsResult],
      ['ai_knowledge_base', knowledgeBaseResult],
      ['tenant_intelligence_settings', intelligenceSettingsResult],
      ['business_memory', memoryResult],
      ['business_intent_rules', intentRulesResult],
      ['menu_knowledge', menuKnowledgeResult],
      ['catering_knowledge', cateringKnowledgeResult],
      ['vehicle_knowledge', vehicleKnowledgeResult],
      ['roadside_knowledge', roadsideKnowledgeResult],
      ['symptom_triage', symptomTriageResult],
      ['insurance_knowledge', insuranceKnowledgeResult],
      ['product_knowledge', productKnowledgeResult],
      ['aftercare_instructions', aftercareResult],
      ['competitor_knowledge', competitorResult],
      ['seasonal_knowledge', seasonalResult],
      ['intake_requirements', intakeRequirementsResult],
      ['intake_field_templates', intakeTemplatesResult],
    ] as const;
    for (const [name, result] of queryResults) {
      if ((result as any).error) {
        console.warn(`Non-fatal query error for ${name}:`, (result as any).error.message || (result as any).error);
      }
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
    
    // Mode-specific knowledge
    const menuKnowledge = menuKnowledgeResult.data || [];
    const cateringKnowledge = cateringKnowledgeResult.data || [];
    const vehicleKnowledge = vehicleKnowledgeResult.data || [];
    const roadsideKnowledge = roadsideKnowledgeResult.data || [];
    const symptomTriage = symptomTriageResult.data || [];
    const insuranceKnowledge = insuranceKnowledgeResult.data || [];
    const productKnowledge = productKnowledgeResult.data || [];
    
    // Shared knowledge
    const aftercareInstructions = aftercareResult.data || [];
    const competitorKnowledge = competitorResult.data || [];
    const seasonalKnowledge = seasonalResult.data || [];
    const intakeRequirements = intakeRequirementsResult.data || [];
    const intakeTemplates = intakeTemplatesResult.data || [];

    // Build intake fields: combine tenant-specific requirements with industry templates
    const tenantIndustry = tenant.industry?.toLowerCase().replace(/[\s-]/g, "_") || "";
    const industryTemplateFields = intakeTemplates
      .filter((t: any) => t.industry_key === tenantIndustry)
      .map((t: any) => ({
        key: t.field_key,
        label: t.field_label,
        type: t.field_type,
        options: t.options_json,
        required: t.is_required,
        ai_prompt: t.ai_prompt_hint,
      }));

    // Merge tenant-specific intake requirements with template fields (tenant fields take precedence)
    const tenantFieldKeys = intakeRequirements.map((r: any) => r.field_key);
    const mergedIntakeFields = [
      ...intakeRequirements.map((r: any) => ({
        key: r.field_key,
        label: r.field_label,
        type: r.field_type || "text",
        options: r.options_json,
        required: r.is_required,
        ai_prompt: r.ai_prompt_hint,
      })),
      ...industryTemplateFields.filter((f: any) => !tenantFieldKeys.includes(f.key)),
    ];

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

    // Extract policies from knowledge base (safe null access on title)
    const policyItems = knowledgeBase.filter(k => k.type === 'policy');
    const emergencyPolicy = policyItems.find(p => p.title?.toLowerCase()?.includes('emergency'))?.content || null;
    const warrantyPolicy = policyItems.find(p => p.title?.toLowerCase()?.includes('warranty'))?.content || null;

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
      intake_fields: mergedIntakeFields.length > 0 ? mergedIntakeFields : (Array.isArray(tenant.context_fields_json) ? tenant.context_fields_json : []),
      ai_settings: assistant ? {
        tone: assistant.tone,
        greeting: assistant.greeting_script,
        fallback: assistant.fallback_script,
      } : null,
      intelligence: intelligenceSection,
      
      // Mode-specific knowledge (only include if relevant to business mode)
      ...(tenant.business_mode === "food" && {
        menu_knowledge: menuKnowledge.map((m: any) => ({
          name: m.item_name,
          description: m.detailed_description,
          ingredients: m.ingredients || [],
          allergens: m.allergens || [],
          dietary_tags: m.dietary_tags || [],
          pairing_suggestions: m.pairing_suggestions,
          spice_level: m.spice_level || 0,
          is_signature: m.is_signature,
          is_seasonal: m.is_seasonal,
        })),
        catering_knowledge: cateringKnowledge.map((c: any) => ({
          event_type: c.event_type,
          min_guests: c.min_guests,
          max_guests: c.max_guests,
          lead_time_days: c.lead_time_days,
          deposit_percentage: c.deposit_percentage,
          setup_requirements: c.setup_requirements,
          staffing_included: c.staffing_included,
          ai_script: c.ai_script,
        })),
      }),
      
      ...(tenant.business_mode === "dispatch" && {
        vehicle_knowledge: vehicleKnowledge.map((v: any) => ({
          category: v.vehicle_category,
          equipment_required: v.equipment_required || [],
          weight_class: v.weight_class,
          special_instructions: v.special_instructions,
          hookup_minutes: v.estimated_hookup_minutes,
          requires_permit: v.requires_special_permit,
          extra_fees: v.additional_fees_apply,
          fee_notes: v.fee_notes,
        })),
        roadside_knowledge: roadsideKnowledge.map((r: any) => ({
          situation: r.situation_type,
          priority: r.priority_level || "standard",
          safety_script: r.safety_instructions,
          service_time_minutes: r.estimated_service_time_minutes,
          escalation_triggers: r.escalation_triggers || [],
          self_service_tips: r.self_service_tips,
          ai_script: r.ai_script,
        })),
      }),
      
      ...(tenant.business_mode === "medical" && {
        symptom_triage: symptomTriage.map((s: any) => ({
          category: s.symptom_category,
          symptom: s.symptom_name,
          severity_indicators: s.severity_indicators || [],
          escalation_action: s.escalation_action,
          pre_visit_instructions: s.pre_visit_instructions,
          questions_to_ask: s.questions_to_ask || [],
          can_telehealth: s.can_be_telehealth,
          hipaa_response: s.hipaa_safe_response,
        })),
        insurance_knowledge: insuranceKnowledge.map((i: any) => ({
          carrier: i.carrier_name,
          plan_types: i.plan_types || [],
          is_accepted: i.is_accepted,
          copay_range: i.copay_typical_range,
          verification_process: i.verification_process,
          patient_script: i.patient_script,
        })),
      }),
      
      ...((tenant.business_mode === "service" || tenant.business_mode === "general") && {
        product_knowledge: productKnowledge.map((p: any) => ({
          name: p.product_name,
          brand: p.brand,
          category: p.category,
          benefits: p.benefits || [],
          is_premium: p.is_premium,
          upsell_script: p.upsell_script,
          usage_instructions: p.usage_instructions,
        })),
      }),
      
      // Shared knowledge (all modes)
      aftercare_instructions: aftercareInstructions.map((a: any) => ({
        service_name: a.service_name,
        immediate_care: a.immediate_care || [],
        ongoing_care: a.ongoing_care || [],
        things_to_avoid: a.things_to_avoid || [],
        warning_signs: a.warning_signs || [],
        follow_up_timeframe: a.follow_up_timeframe,
        ai_script: a.ai_verbatim_script,
      })),
      competitor_positioning: competitorKnowledge.map((c: any) => ({
        competitor: c.competitor_name,
        our_advantages: c.our_advantage || [],
        response_script: c.response_script,
        never_say: c.never_say || [],
      })),
      seasonal_events: seasonalKnowledge.map((s: any) => ({
        event_name: s.event_name,
        start_date: s.start_date,
        end_date: s.end_date,
        special_hours: s.special_hours,
        special_pricing: s.special_pricing_notes,
        booking_tips: s.booking_tips,
        ai_announcement: s.ai_announcement,
      })),
    };

    return new Response(
      JSON.stringify({ brain, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : '';
    console.error("Error in build-business-brain:", errMsg, errStack);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
