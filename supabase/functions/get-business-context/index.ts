import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, locationId, customerId, includeIntelligence = true } = await req.json();
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Tenant ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all business context in parallel
    const [
      tenantResult,
      servicesResult,
      faqsResult,
      objectionsResult,
      assistantResult,
      intelligenceSettingsResult
    ] = await Promise.all([
      supabase.from("tenants").select("*").eq("id", tenantId).single(),
      supabase.from("services").select("*").eq("tenant_id", tenantId).eq("is_active", true),
      supabase.from("business_faqs").select("*").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }),
      supabase.from("objection_responses").select("*").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }),
      supabase.from("ai_assistants").select("*").eq("tenant_id", tenantId).single(),
      supabase.from("tenant_intelligence_settings").select("*").eq("tenant_id", tenantId).single()
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
    const intelligenceSettings = intelligenceSettingsResult.data;

    // Fetch intent rules and memory hints if intelligence is enabled
    let intentRules: Array<{ name: string; type: string; action: Record<string, unknown>; priority: number }> = [];
    let memoryHints: Array<{ type: string; summary: string; usage: string; confidence: number }> = [];
    
    if (includeIntelligence) {
      // Fetch active intent rules (owner-created, not suggested)
      const { data: rules } = await supabase
        .from("business_intent_rules")
        .select("id, name, rule_type, action_json, priority")
        .eq("tenant_id", tenantId)
        .eq("is_enabled", true)
        .eq("is_suggested", false)
        .order("priority", { ascending: false });

      if (rules && rules.length > 0) {
        intentRules = rules.map(r => ({
          name: r.name,
          type: r.rule_type,
          action: r.action_json || {},
          priority: r.priority || 0,
        }));
      }

      // Fetch memory hints if memory is enabled
      const memoryEnabled = intelligenceSettings?.memory_enabled === true;
      const hipaaMode = tenant.business_mode === "medical" && tenant.hipaa_mode === true;
      
      if (memoryEnabled && !hipaaMode) {
        const minConfidence = intelligenceSettings?.min_confidence_threshold || 0.65;
        const minObservations = intelligenceSettings?.min_observation_threshold || 3;
        
        let memoryQuery = supabase
          .from("business_memory")
          .select("memory_type, summary, confidence_score, subject_key, observation_count")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .gte("confidence_score", minConfidence)
          .gte("observation_count", minObservations)
          .order("confidence_score", { ascending: false })
          .limit(5);

        // Location scoping
        if (locationId && !intelligenceSettings?.share_memory_across_locations) {
          memoryQuery = memoryQuery.eq("location_id", locationId);
        }

        // HIPAA: exclude customer preferences
        if (hipaaMode) {
          memoryQuery = memoryQuery.neq("memory_type", "customer_preference");
        }

        const { data: memories } = await memoryQuery;

        if (memories && memories.length > 0) {
          memoryHints = memories.map(m => ({
            type: m.memory_type,
            summary: m.summary,
            usage: determineUsage(m.memory_type),
            confidence: m.confidence_score,
          }));
        }
      }
    }

    // Build comprehensive context for AI
    const context = {
      business: {
        name: tenant.name,
        tagline: tenant.tagline,
        industry: tenant.industry,
        address: tenant.address,
        phone: tenant.phone_public,
        website: tenant.website_url,
        yearsInBusiness: tenant.years_in_business,
        timezone: tenant.timezone,
        mode: tenant.business_mode || "general",
      },
      hours: tenant.hours_json,
      policies: {
        cancellation: tenant.cancellation_policy,
        deposit: tenant.deposit_policy,
        refund: tenant.refund_policy,
        paymentMethods: tenant.payment_methods,
      },
      scheduling: {
        minLeadHours: tenant.min_lead_hours,
        maxAdvanceDays: tenant.max_advance_days,
        bufferMinutes: tenant.appointment_buffer_minutes,
      },
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration_minutes,
        priceType: s.price_type,
        priceAmount: s.price_amount,
        depositRequired: s.deposit_required,
        depositAmount: s.deposit_amount,
        preparation: s.preparation_instructions,
        upsells: s.upsell_suggestions,
      })),
      faqs: faqs.map(f => ({
        question: f.question,
        answer: f.answer,
      })),
      objectionHandling: objections.map(o => ({
        objection: o.objection,
        response: o.response,
      })),
      aiSettings: assistant ? {
        tone: assistant.tone,
        greeting: assistant.greeting_script,
        fallback: assistant.fallback_script,
      } : null,
      neverPromise: tenant.ai_never_promise || [],
      // Intelligence layers
      intent_rules: intentRules,
      memory_hints: memoryHints,
      intelligence_settings: intelligenceSettings ? {
        memory_enabled: intelligenceSettings.memory_enabled || false,
        min_confidence: intelligenceSettings.min_confidence_threshold || 0.65,
        share_memory_across_locations: intelligenceSettings.share_memory_across_locations || false,
      } : { memory_enabled: false, min_confidence: 0.65, share_memory_across_locations: false },
    };

    // Generate system prompt for AI agent
    const systemPrompt = buildSystemPrompt(context);

    return new Response(
      JSON.stringify({ context, systemPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-business-context:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function determineUsage(memoryType: string): string {
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

// deno-lint-ignore no-explicit-any
function buildSystemPrompt(context: any): string {
  const { business, services, faqs, objectionHandling, aiSettings, neverPromise, policies, hours, intent_rules, memory_hints } = context;
  
  let prompt = `You are an AI voice assistant for ${business.name}`;
  if (business.tagline) prompt += ` - ${business.tagline}`;
  prompt += `.

BUSINESS INFORMATION:
- Industry: ${business.industry}
${business.address ? `- Location: ${business.address}` : ""}
${business.phone ? `- Phone: ${business.phone}` : ""}
${business.website ? `- Website: ${business.website}` : ""}
${business.yearsInBusiness ? `- In business for ${business.yearsInBusiness} years` : ""}

`;

  if (aiSettings?.tone) {
    prompt += `COMMUNICATION STYLE: Be ${aiSettings.tone} in your interactions.\n\n`;
  }

  if (services.length > 0) {
    prompt += `SERVICES OFFERED:\n`;
    // deno-lint-ignore no-explicit-any
    services.forEach((s: any) => {
      prompt += `- ${s.name}`;
      if (s.duration) prompt += ` (${s.duration} minutes)`;
      if (s.priceType === "fixed" && s.priceAmount) prompt += ` - $${s.priceAmount}`;
      else if (s.priceType === "starting_at" && s.priceAmount) prompt += ` - Starting at $${s.priceAmount}`;
      else if (s.priceType === "quote_only") prompt += ` - Quote required`;
      prompt += `\n`;
      if (s.description) prompt += `  ${s.description}\n`;
    });
    prompt += `\n`;
  }

  if (hours) {
    prompt += `BUSINESS HOURS:\n`;
    const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    dayNames.forEach(day => {
      const dayHours = hours[day];
      if (dayHours?.isOpen) {
        prompt += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayHours.open} - ${dayHours.close}\n`;
      } else {
        prompt += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: Closed\n`;
      }
    });
    prompt += `\n`;
  }

  if (policies.cancellation || policies.deposit || policies.refund) {
    prompt += `POLICIES:\n`;
    if (policies.cancellation) prompt += `- Cancellation: ${policies.cancellation}\n`;
    if (policies.deposit) prompt += `- Deposit: ${policies.deposit}\n`;
    if (policies.refund) prompt += `- Refund: ${policies.refund}\n`;
    if (policies.paymentMethods?.length) prompt += `- Payment methods: ${policies.paymentMethods.join(", ")}\n`;
    prompt += `\n`;
  }

  if (faqs.length > 0) {
    prompt += `FREQUENTLY ASKED QUESTIONS:\n`;
    // deno-lint-ignore no-explicit-any
    faqs.slice(0, 10).forEach((f: any) => {
      prompt += `Q: ${f.question}\nA: ${f.answer}\n\n`;
    });
  }

  if (objectionHandling.length > 0) {
    prompt += `OBJECTION HANDLING:\n`;
    // deno-lint-ignore no-explicit-any
    objectionHandling.slice(0, 5).forEach((o: any) => {
      prompt += `If customer says: "${o.objection}"\nRespond with: "${o.response}"\n\n`;
    });
  }

  if (neverPromise.length > 0) {
    prompt += `NEVER PROMISE OR GUARANTEE:\n`;
    neverPromise.forEach((item: string) => {
      prompt += `- ${item}\n`;
    });
    prompt += `\n`;
  }

  // DECISION HIERARCHY: Hard constraints → Business Brain → Intent Rules → Memory hints
  prompt += `DECISION PRIORITY (follow this order):\n`;
  prompt += `1. HARD CONSTRAINTS - Never violate policies, never promise what's in "never promise" list\n`;
  prompt += `2. BUSINESS BRAIN - Use FAQs, services, and objection handling first\n`;
  prompt += `3. INTENT RULES - Apply negotiation/behavior rules from business owner\n`;
  prompt += `4. MEMORY HINTS - Use for personalization and timing suggestions only\n\n`;

  // Add intent rules (behavior policies from owner)
  if (intent_rules && intent_rules.length > 0) {
    prompt += `BEHAVIOR RULES (from business owner):\n`;
    // deno-lint-ignore no-explicit-any
    intent_rules.forEach((rule: any) => {
      const action = rule.action || {};
      if (action.guidance) {
        prompt += `- ${rule.name}: ${action.guidance}\n`;
      } else if (action.suggest_alternative) {
        prompt += `- ${rule.name}: Suggest alternatives when applicable\n`;
      } else if (action.max_discount_percent !== undefined) {
        prompt += `- ${rule.name}: Max discount ${action.max_discount_percent}%\n`;
      } else {
        prompt += `- ${rule.name}\n`;
      }
    });
    prompt += `\n`;
  }

  // Add memory hints (for personalization, NOT upsells)
  if (memory_hints && memory_hints.length > 0) {
    prompt += `CONTEXT HINTS (use for personalization, NOT for pushing upsells):\n`;
    // deno-lint-ignore no-explicit-any
    memory_hints.forEach((hint: any) => {
      if (hint.usage === "personalize") {
        prompt += `- Personalization: ${hint.summary}\n`;
      } else if (hint.usage === "timing_preference") {
        prompt += `- Timing insight: ${hint.summary}\n`;
      } else if (hint.usage === "suggest_alternatives") {
        prompt += `- Alternative suggestion: ${hint.summary}\n`;
      } else {
        prompt += `- Context: ${hint.summary}\n`;
      }
    });
    prompt += `\n`;
  }

  prompt += `IMPORTANT GUIDELINES:
1. Be helpful, friendly, and professional
2. If you don't know something specific, offer to have someone call them back
3. Try to book appointments when appropriate
4. Collect caller's name and phone number if they want a callback
5. Never make up information about services, prices, or availability
6. If a question is outside your knowledge, use the fallback script
7. Use memory hints ONLY for personalization - never push upsells based on them

`;

  if (aiSettings?.greeting) {
    prompt += `GREETING: "${aiSettings.greeting}"\n\n`;
  }

  if (aiSettings?.fallback) {
    prompt += `FALLBACK (use when you can't help): "${aiSettings.fallback}"\n`;
  }

  return prompt;
}
