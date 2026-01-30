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

/**
 * Get today's hours with timezone-aware computation
 * Returns a human-readable string like "9:00 AM - 5:00 PM" or "Closed today"
 */
function getTodayHours(hoursJson: Record<string, unknown> | null, timezone?: string): string {
  if (!hoursJson) return "";
  
  // Get current day in the tenant's timezone
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  let todayIndex: number;
  
  try {
    // Use tenant timezone if provided
    const tz = timezone || "America/New_York";
    const now = new Date();
    // Get day name in the tenant's timezone
    const dayName = now.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" }).toLowerCase();
    todayIndex = days.indexOf(dayName);
    if (todayIndex === -1) todayIndex = now.getDay();
  } catch {
    todayIndex = new Date().getDay();
  }
  
  const today = days[todayIndex];
  const todayHours = hoursJson[today] as { open?: string; close?: string; closed?: boolean; isOpen?: boolean } | undefined;
  
  if (!todayHours) {
    // Try to find ANY hours data to provide a fallback
    for (const day of days) {
      const dayData = hoursJson[day] as { open?: string; close?: string; closed?: boolean; isOpen?: boolean } | undefined;
      if (dayData?.open && dayData?.close && dayData.closed !== true && dayData.isOpen !== false) {
        // Has hours data but not for today - business might be closed today
        return `Closed today (${today.charAt(0).toUpperCase() + today.slice(1)})`;
      }
    }
    return "";
  }
  
  if (todayHours.closed === true || todayHours.isOpen === false) {
    return `Closed today (${today.charAt(0).toUpperCase() + today.slice(1)})`;
  }
  
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
  description?: string | null;
  category?: string | null;
  price_cents?: number | null;
  modifiers?: string[] | null;
  dietary_tags?: string[] | null;
  is_available?: boolean;
  prep_time_minutes?: number | null;
}> | null): NormalizedMenuItem[] {
  if (!items || items.length === 0) return [];
  
  return items.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category || "Menu",
    price_cents: item.price_cents ?? null,
    modifiers: item.modifiers || item.dietary_tags || [],
    is_available: item.is_available !== false,
  }));
}

// Maximum menu summary length for ElevenLabs dynamic variables
const MENU_SUMMARY_MAX_LENGTH = 1500;

/**
 * Build menu summary for AI context with strict size constraints
 * Creates a structured menu listing that allows the AI to take orders
 * Format: "Category: Item ($X.XX), Item ($X.XX). Category: Item..."
 * 
 * CRITICAL: Output must be <= 1500 chars to fit ElevenLabs context
 * For large menus, compression is applied: top categories + representative items
 */
function buildMenuSummary(items: NormalizedMenuItem[]): string {
  if (items.length === 0) return "";
  
  // Group items by category
  const byCategory: Record<string, Array<{ name: string; price: string; modifiers: string[] }>> = {};
  
  for (const item of items) {
    if (!item.is_available) continue;
    
    const cat = item.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    
    const priceStr = item.price_cents ? `$${(item.price_cents / 100).toFixed(2)}` : "market price";
    byCategory[cat].push({
      name: item.name,
      price: priceStr,
      modifiers: item.modifiers || [],
    });
  }
  
  const categoryNames = Object.keys(byCategory);
  const totalItems = Object.values(byCategory).reduce((sum, arr) => sum + arr.length, 0);
  
  if (totalItems === 0) return "";
  
  // Determine if compression is needed (estimate: ~40 chars per item)
  const estimatedSize = totalItems * 40;
  const needsCompression = estimatedSize > MENU_SUMMARY_MAX_LENGTH;
  
  // Build the summary - compress for large menus
  const itemsPerCategory = needsCompression ? 5 : 8;
  const categoriesToInclude = needsCompression ? Math.min(categoryNames.length, 6) : categoryNames.length;
  
  const parts: string[] = [];
  let usedCategories = 0;
  
  for (const [cat, categoryItems] of Object.entries(byCategory)) {
    if (usedCategories >= categoriesToInclude) break;
    
    const itemStrings = categoryItems.slice(0, itemsPerCategory).map(item => {
      let str = `${item.name} (${item.price})`;
      // Include modifiers hint if they exist (only if not compressing)
      if (!needsCompression && item.modifiers.length > 0) {
        const modHint = item.modifiers.slice(0, 2).join("/");
        str += ` [${modHint}]`;
      }
      return str;
    });
    const suffix = categoryItems.length > itemsPerCategory ? `, +${categoryItems.length - itemsPerCategory} more` : "";
    parts.push(`${cat}: ${itemStrings.join(", ")}${suffix}`);
    usedCategories++;
  }
  
  let result = parts.join(". ");
  
  // Add header with count and compression indicator
  if (needsCompression) {
    const remainingCategories = categoryNames.length - categoriesToInclude;
    result = `[${totalItems} items, ${categoryNames.length} categories${remainingCategories > 0 ? `, showing top ${categoriesToInclude}` : ""}] ` + result;
  } else {
    result = `[${totalItems} items available] ` + result;
  }
  
  // Final safety truncation to ensure we never exceed limit
  return truncate(result, MENU_SUMMARY_MAX_LENGTH);
}

/**
 * Extract menu metadata for dynamic variables
 */
function getMenuMetadata(items: NormalizedMenuItem[]): { hasMore: boolean; topCategories: string[] } {
  const byCategory: Record<string, number> = {};
  for (const item of items) {
    if (!item.is_available) continue;
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  }
  
  const sortedCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);
  
  return {
    hasMore: Object.keys(byCategory).length > 6 || items.length > 30,
    topCategories: sortedCategories.slice(0, 6),
  };
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
    supabase.from("menu_items").select("id, name, description, category, price_cents, modifiers, dietary_tags, is_available").eq("tenant_id", tenantId).eq("is_available", true).limit(50),
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
      hours_today: getTodayHours(tenant.hours_json as Record<string, unknown>, tenant.timezone),
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

  // Menu for food mode - with detailed ordering instructions
  if (ctx.offerings.menu.length > 0) {
    prompt += `MENU ITEMS (YOU CAN TAKE ORDERS):\n${ctx.offerings.menu_summary}\n\n`;
    
    // Add food-specific ordering instructions
    prompt += `FOOD ORDERING FLOW:
You are ENABLED to take food orders. When a customer wants to order:

1. GREET & ASK ORDER TYPE: "Would you like pickup or delivery today?"
2. TAKE THE ORDER: Listen for items. Confirm each item and any modifications.
3. ASK FOR MODIFICATIONS: "Would you like to add anything to that?" or "Any special instructions?"
4. CONFIRM THE ORDER: Repeat the full order back: "So that's [items]. Did I get that right?"
5. GET CUSTOMER INFO: Ask for name and phone number for the order.
6. IF DELIVERY: Ask for the delivery address.
7. GIVE TIME ESTIMATE: "Your order will be ready in about [15-20] minutes."
8. CLOSE: "Thank you! We'll have that ready for you."

IMPORTANT ORDER RULES:
- You CAN and SHOULD take orders when the menu is available
- Confirm the order summary with the customer before completing
- If an item isn't on the menu, politely say "I don't see that on our menu, but let me suggest..."
- For unclear items, ask clarifying questions
- Always collect: items, name, phone, and address (if delivery)

`;
  } else if (ctx.tenant.business_mode === "food") {
    // Food mode but no menu - explain limitation and offer alternative
    prompt += `MENU STATUS: Menu items are not yet configured for this business.
If a customer asks to place an order, politely say: "I apologize, but I don't have our menu available at the moment. Would you like me to have someone call you back with our menu options, or you can visit our website?"
Do NOT claim you cannot take orders if menu IS available above.

`;
  }

  // Hours - ALWAYS include if available
  if (Object.keys(ctx.tenant.hours).length > 0) {
    prompt += `BUSINESS HOURS (YOU KNOW THIS - ANSWER WHEN ASKED):\\n`;
    const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const day of dayNames) {
      const dayHours = ctx.tenant.hours[day];
      if (dayHours) {
        const status = dayHours.is_open ? `${dayHours.open} - ${dayHours.close}` : "Closed";
        prompt += `- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${status}\\n`;
      }
    }
    prompt += `\\nIMPORTANT: When customers ask about hours, you HAVE this information. Tell them the hours directly. Never say "I don't have access to hours" when hours are listed above.\\n\\n`;
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

  // Booking behavior - CRITICAL for availability checking
  if (ctx.operations.modules.booking_enabled) {
    prompt += `BOOKING BEHAVIOR (CRITICAL - READ CAREFULLY):
When a customer requests a specific appointment time, you MUST verify availability before confirming.

NEVER say "I can book you for [time]" or "That works" without checking first.

Instead, use these phrases:
- "Let me check if [time] is available..."
- "I'll verify that slot is open..."

If the slot is NOT available, explain why and offer alternatives:
- "I'm sorry, that time is already booked. Would [alternative time] work instead?"
- "We have an appointment at that time. I do have [time] or [time] available."

The system automatically checks busy_blocks (synced calendars + existing bookings) to prevent double-booking.

`;
  }

  // Decision hierarchy
  prompt += `DECISION PRIORITY (follow this order):
1. HARD CONSTRAINTS - Never violate policies, never promise what's in "never promise" list
2. AVAILABILITY CHECK - Always verify slot availability before confirming bookings
3. BUSINESS BRAIN - Use FAQs, services, and objection handling first
4. INTENT RULES - Apply negotiation/behavior rules from business owner
5. MEMORY HINTS - Use for personalization and timing suggestions only

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

// ============= DYNAMIC VARIABLES BUILDER (for ElevenLabs injection) =============

/**
 * Flattens BusinessContext into key-value pairs for ElevenLabs dynamic_variables
 * Used by both twilio-inbound (voice calls) and elevenlabs-conversation-token (browser tests)
 */
export function buildDynamicVariables(
  ctx: BusinessContext, 
  callerPhoneE164: string, 
  customerId: string | null
): Record<string, string | number | boolean> {
  const enabledModulesArray: string[] = [];
  if (ctx.operations.modules.booking_enabled) enabledModulesArray.push("booking");
  if (ctx.operations.modules.dispatch_enabled) enabledModulesArray.push("dispatch_queue");
  if (ctx.operations.modules.orders_enabled) enabledModulesArray.push("food_orders");
  if (ctx.operations.modules.reservations_enabled) enabledModulesArray.push("reservations");
  if (ctx.operations.modules.catering_enabled) enabledModulesArray.push("catering");
  if (ctx.operations.modules.voice_enabled) enabledModulesArray.push("ai_voice");
  if (ctx.operations.modules.sms_enabled) enabledModulesArray.push("instant_text_back");
  if (ctx.operations.modules.medical_intake_enabled) enabledModulesArray.push("medical_intake");

  // Compute debug flags for context completeness
  const hasHours = Object.keys(ctx.tenant.hours).length > 0 || Boolean(ctx.tenant.hours_today);
  const hasMenu = ctx.offerings.menu.length > 0;
  const hasServices = ctx.offerings.services.length > 0;
  
  // Get menu metadata for large menus
  const menuMetadata = getMenuMetadata(ctx.offerings.menu);
  
  return {
    // Core identifiers (NEVER null - always default to empty string)
    tenant_id: ctx.tenant.tenant_id || "",
    location_id: ctx._meta.location_id || "",
    business_name: ctx.tenant.business_name || "Our Business",
    business_mode: ctx.tenant.business_mode || "general",
    enabled_modules: enabledModulesArray.join(",") || "",
    hipaa_mode: ctx.safety.hipaa_mode,
    timezone: ctx.tenant.timezone || "America/New_York",
    
    // Caller info (respect PHI settings) - NEVER null
    caller_phone: ctx.safety.hipaa_mode ? "" : (callerPhoneE164 || ""),
    customer_id: customerId || "",
    
    // Hours and availability - CRITICAL for answering hours questions
    hours_today: ctx.tenant.hours_today || "",
    calendar_connected: ctx.operations.availability.calendar_connected,
    booking_link: ctx.operations.availability.booking_url || "",
    
    // Business Brain content - CRITICAL: these power the AI's knowledge
    // For food mode, menu_summary is primary; for service mode, services_pricing is primary
    service_summary: ctx.offerings.services_summary || "",
    services_pricing: ctx.offerings.services_for_prompt || "",
    menu_summary: ctx.offerings.menu_summary || "",
    policies_summary: [
      ctx.policies.cancellation && `Cancellation: ${ctx.policies.cancellation}`,
      ctx.policies.deposit && `Deposit: ${ctx.policies.deposit}`,
      ctx.policies.payment_methods.length > 0 && `Payment: ${ctx.policies.payment_methods.join(", ")}`,
    ].filter(Boolean).join(". ") || "",
    faqs_summary: ctx.knowledge.faqs_summary || "",
    
    // Menu metadata for large menus (allows AI to ask about specific categories)
    menu_has_more: menuMetadata.hasMore ? "true" : "false",
    menu_top_categories: menuMetadata.topCategories.join(", ") || "",
    menu_summary_length: String(ctx.offerings.menu_summary?.length || 0),
    
    // AI assistant settings (NEVER null)
    greeting_script: ctx.ai_settings.greeting_script || "",
    fallback_script: ctx.ai_settings.fallback_script || "",
    tone: ctx.ai_settings.tone || "friendly",
    
    // Intelligence layers
    intent_rules_summary: ctx.intelligence.intent_rules_summary || "",
    memory_hints_summary: ctx.safety.hipaa_mode ? "" : (ctx.intelligence.memory_hints_summary || ""),
    memory_enabled: ctx.intelligence.settings.memory_enabled,
    
    // DEBUG flags - for /debug/ai-context page verification (NEVER null)
    context_has_hours: hasHours ? "true" : "false",
    context_has_menu: hasMenu ? "true" : "false",
    context_has_services: hasServices ? "true" : "false",
    context_menu_count: String(ctx.offerings.menu.length),
    context_services_count: String(ctx.offerings.services.length),
    context_missing_sections: ctx._meta.missing_sections.join(",") || "",
  };
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
