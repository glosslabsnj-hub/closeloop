/**
 * CANONICAL BUSINESS CONTEXT BUILDER
 * Single source of truth for all AI context (voice, SMS, browser test)
 * 
 * This module is imported by: twilio-inbound, ai-text-reply, elevenlabs-conversation-token
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============= TYPE DEFINITIONS =============

export interface NormalizedService {
  id: string;
  name: string;
  description: string;
  price_type: "fixed" | "starting_at" | "quote_required";
  price_amount: number | null;
  duration_minutes: number;
  deposit_required: boolean;
  deposit_amount: number | null;
  prep_instructions: string;
  synonyms: string[];
}

export interface NormalizedMenuItem {
  id: string;
  name: string;
  category: string;
  price_cents: number | null;
  modifiers: string[];
  is_available: boolean;
}

export interface IntakeField {
  field_key: string;
  label: string;
  type: string;
  required: boolean;
  choices?: string[];
}

export interface IntentRule {
  id: string;
  name: string;
  rule_type: string;
  action: Record<string, unknown>;
  priority: number;
}

export interface MemoryHint {
  type: string;
  summary: string;
  usage: string;
  confidence: number;
}

export interface BusinessContext {
  tenant: {
    tenant_id: string;
    business_name: string;
    tagline: string;
    business_mode: string;
    industry_slug: string;
    timezone: string;
    phone_e164: string;
    website: string;
    address: string;
    years_in_business: number | null;
    service_area: { type: string; miles?: number; zip_codes?: string[] } | null;
    hours: Record<string, { open: string; close: string; is_open: boolean }>;
    hours_today: string;
  };
  offerings: {
    services: NormalizedService[];
    services_summary: string;
    services_for_prompt: string;
    menu: NormalizedMenuItem[];
    menu_summary: string;
  };
  intake: {
    required_fields: IntakeField[];
  };
  policies: {
    cancellation: string;
    deposit: string;
    refund: string;
    payment_methods: string[];
    ai_never_promise: string[];
  };
  knowledge: {
    faqs: Array<{ question: string; answer: string }>;
    faqs_summary: string;
    objections: Array<{ objection: string; response: string }>;
  };
  operations: {
    modules: {
      booking_enabled: boolean;
      dispatch_enabled: boolean;
      orders_enabled: boolean;
      reservations_enabled: boolean;
      catering_enabled: boolean;
      voice_enabled: boolean;
      sms_enabled: boolean;
      medical_intake_enabled: boolean;
    };
    availability: {
      calendar_provider: string | null;
      calendar_connected: boolean;
      booking_url: string;
      booking_mode: string;
    };
  };
  intelligence: {
    settings: {
      memory_enabled: boolean;
      min_confidence: number;
      share_across_locations: boolean;
    };
    intent_rules: IntentRule[];
    intent_rules_summary: string;
    memory_hints: MemoryHint[];
    memory_hints_summary: string;
  };
  safety: {
    hipaa_mode: boolean;
    store_transcripts: boolean;
    store_recordings: boolean;
    store_caller_phone: boolean;
    phi_minimization: boolean;
    allow_customer_memory: boolean;
  };
  ai_settings: {
    tone: string;
    greeting_script: string;
    fallback_script: string;
  };
  // Metadata
  _meta: {
    channel: string;
    session_id: string;
    customer_id: string | null;
    location_id: string | null;
    built_at: string;
    missing_sections: string[];
  };
}

// ============= CONSTANTS =============

const SERVICE_SYNONYMS: Record<string, string[]> = {
  "drain cleaning": ["clogged drain", "drain unclog", "drain clog", "slow drain", "blocked drain", "drain backup"],
  "leak detection": ["water leak", "leak repair", "leaking pipe", "pipe leak"],
  "water heater repair": ["hot water heater", "water heater issue", "no hot water"],
  "toilet repair": ["toilet fix", "running toilet", "clogged toilet", "toilet problem"],
  "faucet installation": ["faucet repair", "faucet replacement", "dripping faucet"],
  "ac tune-up": ["ac service", "air conditioning service", "ac maintenance"],
  "furnace inspection": ["heater inspection", "heating service", "furnace service"],
  "emergency repair": ["emergency service", "urgent repair", "same day service"],
  "oil change": ["oil service", "oil and filter"],
  "tire rotation": ["rotate tires", "tire service"],
  "wheel alignment": ["alignment", "car alignment"],
  "full detail": ["complete detail", "full service detail"],
  "interior detail": ["inside detail", "interior cleaning"],
  "exterior detail": ["outside detail", "exterior wash"],
};

// ============= HELPER FUNCTIONS =============

function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

function getTodayHours(hoursJson: Record<string, unknown> | null): string {
  if (!hoursJson) return "";
  
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = days[new Date().getDay()];
  const todayHours = hoursJson[today] as { open?: string; close?: string; closed?: boolean; isOpen?: boolean } | undefined;
  
  if (!todayHours) return "";
  if (todayHours.closed === true || todayHours.isOpen === false) return "Closed today";
  if (todayHours.open && todayHours.close) {
    return `${todayHours.open} - ${todayHours.close}`;
  }
  return "";
}

function normalizeHours(hoursJson: Record<string, unknown> | null): Record<string, { open: string; close: string; is_open: boolean }> {
  if (!hoursJson) return {};
  
  const result: Record<string, { open: string; close: string; is_open: boolean }> = {};
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  for (const day of days) {
    const dayData = hoursJson[day] as { open?: string; close?: string; closed?: boolean; isOpen?: boolean } | undefined;
    if (dayData) {
      const isOpen = dayData.isOpen !== false && dayData.closed !== true;
      result[day] = {
        open: dayData.open || "",
        close: dayData.close || "",
        is_open: isOpen,
      };
    }
  }
  
  return result;
}

function normalizeServices(services: Array<{
  id: string;
  name: string;
  description?: string | null;
  price_type?: string | null;
  price_amount?: number | null;
  duration_minutes: number;
  deposit_required?: boolean | null;
  deposit_amount?: number | null;
  preparation_instructions?: string | null;
}> | null): NormalizedService[] {
  if (!services || services.length === 0) return [];
  
  return services.map(s => {
    const priceAmount = s.price_amount ?? null;
    const hasPrice = priceAmount !== null && priceAmount > 0;
    
    let priceType: "fixed" | "starting_at" | "quote_required" = "quote_required";
    if (s.price_type === "fixed" && hasPrice) {
      priceType = "fixed";
    } else if (s.price_type === "starting_at" && hasPrice) {
      priceType = "starting_at";
    } else if (s.price_type === "quote_only" || !hasPrice) {
      priceType = "quote_required";
    } else if (hasPrice) {
      priceType = "fixed";
    }
    
    const nameLower = s.name.toLowerCase();
    const synonyms: string[] = [];
    for (const [key, syns] of Object.entries(SERVICE_SYNONYMS)) {
      if (nameLower.includes(key) || key.includes(nameLower)) {
        synonyms.push(...syns);
      }
    }
    
    return {
      id: s.id,
      name: s.name,
      description: s.description || "",
      price_type: priceType,
      price_amount: priceAmount,
      duration_minutes: s.duration_minutes,
      deposit_required: s.deposit_required === true,
      deposit_amount: s.deposit_amount ?? null,
      prep_instructions: s.preparation_instructions || "",
      synonyms,
    };
  });
}

function buildServicesSummary(services: NormalizedService[]): string {
  if (services.length === 0) return "";
  
  const summaries = services.slice(0, 8).map(s => {
    let line = s.name;
    if (s.price_type === "fixed" && s.price_amount) {
      line += ` ($${s.price_amount})`;
    } else if (s.price_type === "starting_at" && s.price_amount) {
      line += ` (from $${s.price_amount})`;
    } else {
      line += ` (quote)`;
    }
    return line;
  });
  
  let result = summaries.join("; ");
  if (services.length > 8) result += `; +${services.length - 8} more`;
  
  return truncate(result, 800);
}

function buildServicesForPrompt(services: NormalizedService[]): string {
  if (services.length === 0) return "No services configured yet.";
  
  return services.map(s => {
    let priceText = "";
    if (s.price_type === "fixed" && s.price_amount) {
      priceText = `$${s.price_amount} (exact price)`;
    } else if (s.price_type === "starting_at" && s.price_amount) {
      priceText = `Starting at $${s.price_amount} (final price varies)`;
    } else {
      priceText = "Quote required";
    }
    
    let line = `• ${s.name}: ${priceText}`;
    if (s.duration_minutes) line += `, ${s.duration_minutes} min`;
    if (s.synonyms.length > 0) line += ` [also: ${s.synonyms.slice(0, 3).join(", ")}]`;
    return line;
  }).join("\n");
}

function normalizeMenuItems(items: Array<{
  id: string;
  name: string;
  category?: string | null;
  price_cents?: number | null;
  modifiers?: string[] | null;
  is_available?: boolean;
}> | null): NormalizedMenuItem[] {
  if (!items || items.length === 0) return [];
  
  return items.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category || "Menu",
    price_cents: item.price_cents ?? null,
    modifiers: item.modifiers || [],
    is_available: item.is_available !== false,
  }));
}

function buildMenuSummary(items: NormalizedMenuItem[]): string {
  if (items.length === 0) return "";
  
  const byCategory: Record<string, string[]> = {};
  for (const item of items.slice(0, 20)) {
    const cat = item.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item.name);
  }
  
  const parts = Object.entries(byCategory).map(([cat, names]) => {
    return `${cat}: ${names.slice(0, 4).join(", ")}${names.length > 4 ? "..." : ""}`;
  });
  
  let result = parts.join(". ");
  if (items.length > 20) result += `. Plus ${items.length - 20} more items.`;
  
  return truncate(result, 600);
}

function buildFaqsSummary(faqs: Array<{ question: string; answer: string }>): string {
  if (faqs.length === 0) return "";
  return faqs.slice(0, 5).map(f => `Q: ${truncate(f.question, 80)} A: ${truncate(f.answer, 120)}`).join(" | ");
}

function buildIntentRulesSummary(rules: IntentRule[]): string {
  if (rules.length === 0) return "";
  return rules.slice(0, 5).map(r => {
    const action = r.action || {};
    if (action.guidance) return `${r.name}: ${truncate(String(action.guidance), 80)}`;
    if (action.max_discount_percent !== undefined) return `${r.name}: Max ${action.max_discount_percent}% discount`;
    return r.name;
  }).join("; ");
}

function buildMemoryHintsSummary(hints: MemoryHint[]): string {
  if (hints.length === 0) return "";
  return hints.slice(0, 3).map(h => {
    if (h.usage === "personalize") return `Personalize: ${truncate(h.summary, 60)}`;
    if (h.usage === "timing_preference") return `Timing: ${truncate(h.summary, 60)}`;
    return truncate(h.summary, 60);
  }).join("; ");
}

function determineUsage(memoryType: string): string {
  switch (memoryType) {
    case "time_pattern": return "timing_preference";
    case "customer_preference": return "personalize";
    case "capacity_pattern": return "suggest_alternatives";
    default: return "context";
  }
}

function hasModule(modules: string[] | null, name: string): boolean {
  if (!modules) return false;
  return modules.includes(name);
}

function parseIntakeFields(contextFieldsJson: unknown): IntakeField[] {
  if (!contextFieldsJson || !Array.isArray(contextFieldsJson)) return [];
  
  return contextFieldsJson.map((field: Record<string, unknown>) => ({
    field_key: String(field.key || field.field_key || ""),
    label: String(field.label || ""),
    type: String(field.type || "text"),
    required: field.required === true,
    choices: Array.isArray(field.options) ? field.options.map(String) : undefined,
  })).filter(f => f.field_key && f.label);
}

// ============= MAIN BUILDER =============

export interface BuildContextOptions {
  tenantId: string;
  locationId?: string | null;
  customerId?: string | null;
  channel: "voice" | "sms" | "browser_test";
  sessionId: string;
  callerPhone?: string | null;
  includeIntelligence?: boolean;
}

export async function buildBusinessContext(
  supabase: SupabaseClient,
  options: BuildContextOptions
): Promise<{ context: BusinessContext; systemPrompt: string }> {
  const { tenantId, locationId, customerId, channel, sessionId, callerPhone, includeIntelligence = true } = options;
  
  const missingSections: string[] = [];
  
  // ===== FETCH ALL DATA IN PARALLEL =====
  const [
    tenantResult,
    servicesResult,
    menuItemsResult,
    faqsResult,
    objectionsResult,
    assistantResult,
    assistantSettingsResult,
    intelligenceSettingsResult,
    retentionSettingsResult,
  ] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", tenantId).single(),
    supabase.from("services").select("*").eq("tenant_id", tenantId).eq("is_active", true).limit(20),
    supabase.from("menu_items").select("id, name, category, price_cents, modifiers, is_available").eq("tenant_id", tenantId).eq("is_available", true).limit(50),
    supabase.from("business_faqs").select("question, answer").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }).limit(15),
    supabase.from("objection_responses").select("objection, response").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }).limit(10),
    supabase.from("ai_assistants").select("tone, greeting_script, fallback_script").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("assistant_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("tenant_intelligence_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("data_retention_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
  ]);
  
  if (tenantResult.error || !tenantResult.data) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }
  
  const tenant = tenantResult.data;
  const services = servicesResult.data || [];
  const menuItems = menuItemsResult.data || [];
  const faqs = faqsResult.data || [];
  const objections = objectionsResult.data || [];
  const assistant = assistantResult.data;
  const assistantSettings = assistantSettingsResult.data;
  const intelligenceSettings = intelligenceSettingsResult.data;
  const retentionSettings = retentionSettingsResult.data;
  
  // Track missing sections
  if (services.length === 0 && tenant.business_mode !== "food") missingSections.push("services");
  if (menuItems.length === 0 && tenant.business_mode === "food") missingSections.push("menu");
  if (faqs.length === 0) missingSections.push("faqs");
  if (objections.length === 0) missingSections.push("objections");
  if (!tenant.hours_json) missingSections.push("hours");
  if (!tenant.cancellation_policy && !tenant.deposit_policy) missingSections.push("policies");
  
  // ===== FETCH INTELLIGENCE LAYERS =====
  let intentRules: IntentRule[] = [];
  let memoryHints: MemoryHint[] = [];
  
  const hipaaMode = tenant.hipaa_mode === true;
  const memoryEnabled = intelligenceSettings?.memory_enabled === true && !hipaaMode;
  
  if (includeIntelligence) {
    const { data: rules } = await supabase
      .from("business_intent_rules")
      .select("id, name, rule_type, action_json, priority")
      .eq("tenant_id", tenantId)
      .eq("is_enabled", true)
      .eq("is_suggested", false)
      .order("priority", { ascending: false })
      .limit(10);
    
    if (rules && rules.length > 0) {
      intentRules = rules.map(r => ({
        id: r.id,
        name: r.name,
        rule_type: r.rule_type,
        action: r.action_json || {},
        priority: r.priority || 0,
      }));
    }
    
    if (memoryEnabled) {
      const minConfidence = intelligenceSettings?.min_confidence_threshold || 0.65;
      const minObservations = intelligenceSettings?.min_observation_threshold || 3;
      
      let memoryQuery = supabase
        .from("business_memory")
        .select("memory_type, summary, confidence_score, observation_count")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .gte("confidence_score", minConfidence)
        .gte("observation_count", minObservations)
        .order("confidence_score", { ascending: false })
        .limit(5);
      
      if (locationId && !intelligenceSettings?.share_memory_across_locations) {
        memoryQuery = memoryQuery.eq("location_id", locationId);
      }
      
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
  
  // ===== NORMALIZE DATA =====
  const normalizedServices = normalizeServices(services);
  const normalizedMenu = normalizeMenuItems(menuItems);
  const enabledModules: string[] = Array.isArray(tenant.enabled_modules) ? tenant.enabled_modules as string[] : [];
  
  // ===== BUILD CONTEXT OBJECT =====
  const context: BusinessContext = {
    tenant: {
      tenant_id: tenantId,
      business_name: tenant.name || "",
      tagline: tenant.tagline || "",
      business_mode: tenant.business_mode || "general",
      industry_slug: tenant.industry || "",
      timezone: tenant.timezone || "America/New_York",
      phone_e164: tenant.phone_public || "",
      website: tenant.website_url || "",
      address: tenant.address || "",
      years_in_business: tenant.years_in_business,
      service_area: tenant.service_area_json as BusinessContext["tenant"]["service_area"],
      hours: normalizeHours(tenant.hours_json as Record<string, unknown>),
      hours_today: getTodayHours(tenant.hours_json as Record<string, unknown>),
    },
    offerings: {
      services: normalizedServices,
      services_summary: buildServicesSummary(normalizedServices),
      services_for_prompt: buildServicesForPrompt(normalizedServices),
      menu: normalizedMenu,
      menu_summary: buildMenuSummary(normalizedMenu),
    },
    intake: {
      required_fields: parseIntakeFields(tenant.context_fields_json),
    },
    policies: {
      cancellation: tenant.cancellation_policy || "",
      deposit: tenant.deposit_policy || "",
      refund: tenant.refund_policy || "",
      payment_methods: tenant.payment_methods || [],
      ai_never_promise: tenant.ai_never_promise || [],
    },
    knowledge: {
      faqs: faqs.map(f => ({ question: f.question, answer: f.answer })),
      faqs_summary: buildFaqsSummary(faqs),
      objections: objections.map(o => ({ objection: o.objection, response: o.response })),
    },
    operations: {
      modules: {
        booking_enabled: hasModule(enabledModules, "booking"),
        dispatch_enabled: hasModule(enabledModules, "dispatch_queue"),
        orders_enabled: hasModule(enabledModules, "food_orders"),
        reservations_enabled: hasModule(enabledModules, "reservations"),
        catering_enabled: hasModule(enabledModules, "catering"),
        voice_enabled: hasModule(enabledModules, "ai_voice"),
        sms_enabled: hasModule(enabledModules, "instant_text_back"),
        medical_intake_enabled: hasModule(enabledModules, "medical_intake"),
      },
      availability: {
        calendar_provider: assistantSettings?.calendar_provider || null,
        calendar_connected: !!assistantSettings?.calendar_provider,
        booking_url: assistantSettings?.booking_url || tenant.website_url || "",
        booking_mode: assistantSettings?.ai_booking_mode || "pending_approval",
      },
    },
    intelligence: {
      settings: {
        memory_enabled: memoryEnabled,
        min_confidence: intelligenceSettings?.min_confidence_threshold || 0.65,
        share_across_locations: intelligenceSettings?.share_memory_across_locations || false,
      },
      intent_rules: intentRules,
      intent_rules_summary: buildIntentRulesSummary(intentRules),
      memory_hints: memoryHints,
      memory_hints_summary: buildMemoryHintsSummary(memoryHints),
    },
    safety: {
      hipaa_mode: hipaaMode,
      store_transcripts: retentionSettings?.store_transcripts !== false && !hipaaMode,
      store_recordings: retentionSettings?.store_recordings !== false && !hipaaMode,
      store_caller_phone: retentionSettings?.store_caller_phone !== false && !hipaaMode,
      phi_minimization: retentionSettings?.phi_minimization_enabled === true || hipaaMode,
      allow_customer_memory: retentionSettings?.allow_customer_memory !== false && !hipaaMode,
    },
    ai_settings: {
      tone: assistant?.tone || "friendly",
      greeting_script: assistant?.greeting_script || "",
      fallback_script: assistant?.fallback_script || "",
    },
    _meta: {
      channel,
      session_id: sessionId,
      customer_id: customerId || null,
      location_id: locationId || null,
      built_at: new Date().toISOString(),
      missing_sections: missingSections,
    },
  };
  
  // ===== BUILD SYSTEM PROMPT =====
  const systemPrompt = buildSystemPrompt(context);
  
  return { context, systemPrompt };
}

// ============= SYSTEM PROMPT BUILDER =============

function buildSystemPrompt(ctx: BusinessContext): string {
  let prompt = `You are an AI voice assistant for ${ctx.tenant.business_name}`;
  if (ctx.tenant.tagline) prompt += ` - ${ctx.tenant.tagline}`;
  prompt += `.\n\nBUSINESS INFORMATION:\n- Industry: ${ctx.tenant.industry_slug || "service business"}\n${ctx.tenant.address ? `- Location: ${ctx.tenant.address}` : ""}\n${ctx.tenant.phone_e164 ? `- Phone: ${ctx.tenant.phone_e164}` : ""}\n${ctx.tenant.website ? `- Website: ${ctx.tenant.website}` : ""}\n${ctx.tenant.years_in_business ? `- In business for ${ctx.tenant.years_in_business} years` : ""}\n\n`;

  if (ctx.ai_settings.tone) {
    prompt += `COMMUNICATION STYLE: Be ${ctx.ai_settings.tone} in your interactions.\\n\\n`;
  }

  // Services section with pricing
  if (ctx.offerings.services.length > 0) {
    prompt += `SERVICES AND PRICING:\nIMPORTANT: You have full access to service pricing. Quote prices when they exist!\n\n${ctx.offerings.services_for_prompt}\n\n`;
  }

  // Menu for food mode
  if (ctx.offerings.menu.length > 0) {
    prompt += `MENU ITEMS:\n${ctx.offerings.menu_summary}\n\n`;
  }

  // Hours
  if (Object.keys(ctx.tenant.hours).length > 0) {
    prompt += `BUSINESS HOURS:\\n`;
    const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const day of dayNames) {
      const dayHours = ctx.tenant.hours[day];
      if (dayHours) {
        const status = dayHours.is_open ? `${dayHours.open} - ${dayHours.close}` : "Closed";
        prompt += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${status}\\n`;
      }
    }
    prompt += `\\n`;
  }

  // Policies
  if (ctx.policies.cancellation || ctx.policies.deposit || ctx.policies.refund) {
    prompt += `POLICIES:\\n`;
    if (ctx.policies.cancellation) prompt += `- Cancellation: ${ctx.policies.cancellation}\\n`;
    if (ctx.policies.deposit) prompt += `- Deposit: ${ctx.policies.deposit}\\n`;
    if (ctx.policies.refund) prompt += `- Refund: ${ctx.policies.refund}\\n`;
    if (ctx.policies.payment_methods.length > 0) prompt += `- Payment methods: ${ctx.policies.payment_methods.join(", ")}\\n`;
    prompt += `\\n`;
  }

  // FAQs
  if (ctx.knowledge.faqs.length > 0) {
    prompt += `FREQUENTLY ASKED QUESTIONS:\\n`;
    for (const faq of ctx.knowledge.faqs.slice(0, 10)) {
      prompt += `Q: ${faq.question}\\nA: ${faq.answer}\\n\\n`;
    }
  }

  // Objection handling
  if (ctx.knowledge.objections.length > 0) {
    prompt += `OBJECTION HANDLING:\\n`;
    for (const obj of ctx.knowledge.objections.slice(0, 5)) {
      prompt += `If customer says: "${obj.objection}"\\nRespond with: "${obj.response}"\\n\\n`;
    }
  }

  // Never promise
  if (ctx.policies.ai_never_promise.length > 0) {
    prompt += `NEVER PROMISE OR GUARANTEE:\\n`;
    for (const item of ctx.policies.ai_never_promise) {
      prompt += `- ${item}\\n`;
    }
    prompt += `\\n`;
  }

  // Decision hierarchy
  prompt += `DECISION PRIORITY (follow this order):
1. HARD CONSTRAINTS - Never violate policies, never promise what's in "never promise" list
2. BUSINESS BRAIN - Use FAQs, services, and objection handling first
3. INTENT RULES - Apply negotiation/behavior rules from business owner
4. MEMORY HINTS - Use for personalization and timing suggestions only

`;

  // Intent rules
  if (ctx.intelligence.intent_rules.length > 0) {
    prompt += `BEHAVIOR RULES (from business owner):\\n`;
    for (const rule of ctx.intelligence.intent_rules) {
      const action = rule.action || {};
      if (action.guidance) {
        prompt += `- ${rule.name}: ${action.guidance}\\n`;
      } else if (action.suggest_alternative) {
        prompt += `- ${rule.name}: Suggest alternatives when applicable\\n`;
      } else if (action.max_discount_percent !== undefined) {
        prompt += `- ${rule.name}: Max discount ${action.max_discount_percent}%\\n`;
      } else {
        prompt += `- ${rule.name}\\n`;
      }
    }
    prompt += `\\n`;
  }

  // Memory hints
  if (ctx.intelligence.memory_hints.length > 0) {
    prompt += `CONTEXT HINTS (use for personalization, NOT for pushing upsells):\\n`;
    for (const hint of ctx.intelligence.memory_hints) {
      if (hint.usage === "personalize") {
        prompt += `- Personalization: ${hint.summary}\\n`;
      } else if (hint.usage === "timing_preference") {
        prompt += `- Timing insight: ${hint.summary}\\n`;
      } else {
        prompt += `- Context: ${hint.summary}\\n`;
      }
    }
    prompt += `\\n`;
  }

  // Critical pricing behavior
  prompt += `PRICING BEHAVIOR (CRITICAL):
1. If a service has an exact price listed → Quote it directly: "Drain cleaning is $149"
2. If a service says "Starts at" → Say "starts at $X" and briefly mention what affects final price
3. If a service says "Quote required" OR no price exists → Ask 1-2 clarifying questions, then offer to schedule an estimate
4. NEVER say "I don't have access to pricing" when pricing exists in the services list above
5. Match service requests by synonyms (e.g., "clogged drain" = "drain cleaning")
6. If a service is not found → Ask what they need help with and offer to connect them with a specialist

IMPORTANT GUIDELINES:
1. Be helpful, friendly, and professional
2. If you don't know something specific, offer to have someone call them back
3. Try to book appointments when appropriate
4. Collect caller's name and phone number if they want a callback
5. Never make up information about services, prices, or availability
6. If a question is outside your knowledge, use the fallback script
7. Use memory hints ONLY for personalization - never push upsells based on them
8. NEVER vocalize placeholders like "None" or empty fields - skip them or ask a follow-up
9. NEVER claim "I don't have access to..." unless the data truly doesn't exist in your context

`;

  if (ctx.ai_settings.greeting_script) {
    prompt += `GREETING: "${ctx.ai_settings.greeting_script}"\\n\\n`;
  }

  if (ctx.ai_settings.fallback_script) {
    prompt += `FALLBACK (use when you can't help): "${ctx.ai_settings.fallback_script}"\\n`;
  }

  return prompt;
}

// ============= SNAPSHOT STORAGE =============

export async function storeContextSnapshot(
  supabase: SupabaseClient,
  context: BusinessContext
): Promise<void> {
  try {
    // Redact sensitive data for storage
    const redactedContext = {
      ...context,
      _meta: {
        ...context._meta,
        // Keep customer_id but redact actual caller phone from logs
      },
    };
    
    await supabase.from("ai_context_snapshots").insert({
      tenant_id: context.tenant.tenant_id,
      channel: context._meta.channel,
      session_id: context._meta.session_id,
      customer_id: context._meta.customer_id,
      location_id: context._meta.location_id,
      context_json: redactedContext,
      missing_sections: context._meta.missing_sections,
    });
  } catch (error) {
    console.error("Failed to store context snapshot:", error);
    // Non-blocking - don't fail the call
  }
}
