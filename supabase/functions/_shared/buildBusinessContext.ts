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

export interface RequiredQuestionField {
  key: string;
  label: string;
  ask_prompt: string;
  why_needed: string;
}

export interface RequiredQuestionsConfig {
  intent: string;
  required_inputs: RequiredQuestionField[];
  optional_inputs: RequiredQuestionField[];
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
  food_settings: {
    estimated_prep_minutes: number;
    accepts_pickup: boolean;
    accepts_delivery: boolean;
    accepts_dine_in: boolean;
    delivery_radius_miles: number | null;
    delivery_minimum_cents: number | null;
    accepts_catering: boolean;
    catering_min_guests: number | null;
    catering_lead_days: number | null;
    order_confirmation_mode: string;
  } | null;
  knowledge: {
    faqs: Array<{ question: string; answer: string }>;
    faqs_summary: string;
    objections: Array<{ objection: string; response: string }>;
    supplementary: Array<{ type: string; title: string; content: string }>;
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
    required_questions: RequiredQuestionsConfig[];
    required_questions_summary: string;
    memory_hints: MemoryHint[];
    memory_hints_summary: string;
  };
  pricing: {
    rules_summary: string;
    busyness_config: {
      base_prep_minutes: number;
      busy_buffer_minutes: number;
      manual_busyness_pct: number;
    } | null;
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

// Optimized summaries for voice channel - shorter to reduce latency
function buildFaqsSummary(faqs: Array<{ question: string; answer: string }>, forVoice = false): string {
  if (faqs.length === 0) return "";
  const limit = forVoice ? 3 : 5;
  const qLen = forVoice ? 50 : 80;
  const aLen = forVoice ? 80 : 120;
  return faqs.slice(0, limit).map(f => `Q: ${truncate(f.question, qLen)} A: ${truncate(f.answer, aLen)}`).join(" | ");
}

function buildIntentRulesSummary(rules: IntentRule[], forVoice = false): string {
  if (rules.length === 0) return "";
  const limit = forVoice ? 3 : 5;
  return rules.slice(0, limit).map(r => {
    const action = r.action || {};
    if (action.guidance) return `${r.name}: ${truncate(String(action.guidance), forVoice ? 50 : 80)}`;
    if (action.max_discount_percent !== undefined) return `${r.name}: Max ${action.max_discount_percent}% discount`;
    return r.name;
  }).join("; ");
}

function buildMemoryHintsSummary(hints: MemoryHint[], forVoice = false): string {
  if (hints.length === 0) return "";
  const limit = forVoice ? 2 : 3;
  const len = forVoice ? 40 : 60;
  return hints.slice(0, limit).map(h => {
    if (h.usage === "personalize") return `Personalize: ${truncate(h.summary, len)}`;
    if (h.usage === "timing_preference") return `Timing: ${truncate(h.summary, len)}`;
    return truncate(h.summary, len);
  }).join("; ");
}

function buildRequiredQuestionsSummary(configs: RequiredQuestionsConfig[]): string {
  if (configs.length === 0) return "No required questions configured";

  const summaries: string[] = [];
  for (const config of configs) {
    const requiredCount = config.required_inputs.length;
    const optionalCount = config.optional_inputs.length;

    if (requiredCount > 0) {
      const fields = config.required_inputs.slice(0, 3).map(f => f.label).join(", ");
      summaries.push(`${config.intent}: ${requiredCount} required (${fields}${requiredCount > 3 ? '...' : ''})`);
    }
  }

  return summaries.length > 0 ? summaries.join("; ") : "No required questions configured";
}

function buildPricingRulesSummary(pricingRulesJsonb: any): string {
  if (!pricingRulesJsonb || !pricingRulesJsonb.rules || !Array.isArray(pricingRulesJsonb.rules)) {
    return "No pricing rules configured";
  }

  const rules = pricingRulesJsonb.rules;
  if (rules.length === 0) {
    return "No pricing rules configured";
  }

  const summaries: string[] = [];
  for (const rule of rules.slice(0, 5)) { // Show first 5 rules
    const serviceLabel = rule.service_name || "All services";
    const typeLabel = rule.type === "distance-based" ? "distance-based" :
                      rule.type === "flat" ? "flat rate" :
                      rule.type === "per-unit" ? "per-unit" :
                      rule.type === "tiered" ? "tiered" :
                      rule.type === "range-only" ? "price range" :
                      "quote only";

    const requiredInputs = rule.required_inputs || [];
    const inputsStr = requiredInputs.length > 0 ? ` (needs: ${requiredInputs.join(", ")})` : "";

    summaries.push(`${serviceLabel}: ${typeLabel}${inputsStr}`);
  }

  const remaining = rules.length - 5;
  if (remaining > 0) {
    summaries.push(`+${remaining} more`);
  }

  return summaries.join("; ");
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

// ============= PRICING HELPER FUNCTIONS =============

/**
 * Format price from a service object
 * Returns human-readable price string for AI to use
 */
export function formatPriceFromService(service: NormalizedService): string {
  if (service.price_type === "fixed" && service.price_amount) {
    return `$${service.price_amount}`;
  } else if (service.price_type === "starting_at" && service.price_amount) {
    return `starting at $${service.price_amount}`;
  } else {
    return "quote required";
  }
}

/**
 * Format price from a menu item object
 * Returns human-readable price string for AI to use
 */
export function formatPriceFromMenuItem(item: NormalizedMenuItem): string {
  if (item.price_cents && item.price_cents > 0) {
    return `$${(item.price_cents / 100).toFixed(2)}`;
  } else {
    return "market price";
  }
}

/**
 * Find matching service or menu item by query string
 * Uses fuzzy matching on name and synonyms
 * Returns the best match with formatted price
 */
export function findMatchingServiceOrMenuItem(
  query: string,
  services: NormalizedService[],
  menuItems: NormalizedMenuItem[]
): { type: "service" | "menu" | null; name: string; price: string } | null {
  const queryLower = query.toLowerCase().trim();

  if (!queryLower) return null;

  // First try exact service match by name
  for (const service of services) {
    if (service.name.toLowerCase() === queryLower) {
      return {
        type: "service",
        name: service.name,
        price: formatPriceFromService(service),
      };
    }
  }

  // Try service name contains match
  for (const service of services) {
    if (service.name.toLowerCase().includes(queryLower) || queryLower.includes(service.name.toLowerCase())) {
      return {
        type: "service",
        name: service.name,
        price: formatPriceFromService(service),
      };
    }
  }

  // Try service synonyms
  for (const service of services) {
    for (const synonym of service.synonyms) {
      if (synonym.toLowerCase() === queryLower || synonym.toLowerCase().includes(queryLower)) {
        return {
          type: "service",
          name: service.name,
          price: formatPriceFromService(service),
        };
      }
    }
  }

  // Try menu item exact match
  for (const item of menuItems) {
    if (item.is_available && item.name.toLowerCase() === queryLower) {
      return {
        type: "menu",
        name: item.name,
        price: formatPriceFromMenuItem(item),
      };
    }
  }

  // Try menu item contains match
  for (const item of menuItems) {
    if (item.is_available && (item.name.toLowerCase().includes(queryLower) || queryLower.includes(item.name.toLowerCase()))) {
      return {
        type: "menu",
        name: item.name,
        price: formatPriceFromMenuItem(item),
      };
    }
  }

  return null;
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
    knowledgeBaseResult,
    assistantResult,
    assistantSettingsResult,
    intelligenceSettingsResult,
    retentionSettingsResult,
    foodSettingsResult,
  ] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", tenantId).single(),
    supabase.from("services").select("*").eq("tenant_id", tenantId).eq("is_active", true).limit(20),
    supabase.from("menu_items").select("id, name, description, category, price_cents, modifiers, dietary_tags, is_available").eq("tenant_id", tenantId).eq("is_available", true).limit(50),
    supabase.from("business_faqs").select("question, answer").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }).limit(15),
    supabase.from("objection_responses").select("objection, response").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }).limit(10),
    supabase.from("ai_knowledge_base").select("type, title, content").eq("tenant_id", tenantId).order("priority_weight", { ascending: false }).limit(20),
    supabase.from("ai_assistants").select("tone, greeting_script, fallback_script").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("assistant_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("tenant_intelligence_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("data_retention_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("tenant_food_settings").select("*").eq("tenant_id", tenantId).maybeSingle(),
  ]);
  
  if (tenantResult.error || !tenantResult.data) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }
  
  const tenant = tenantResult.data;
  const services = servicesResult.data || [];
  const menuItems = menuItemsResult.data || [];
  const faqs = faqsResult.data || [];
  const objections = objectionsResult.data || [];
  const knowledgeBase = knowledgeBaseResult.data || [];
  const assistant = assistantResult.data;
  const assistantSettings = assistantSettingsResult.data;
  const intelligenceSettings = intelligenceSettingsResult.data;
  const retentionSettings = retentionSettingsResult.data;
  const foodSettings = foodSettingsResult.data;
  
  // Track missing sections
  if (services.length === 0 && tenant.business_mode !== "food") missingSections.push("services");
  if (menuItems.length === 0 && tenant.business_mode === "food") missingSections.push("menu");
  if (faqs.length === 0) missingSections.push("faqs");
  if (objections.length === 0) missingSections.push("objections");
  if (!tenant.hours_json) missingSections.push("hours");
  if (!tenant.cancellation_policy && !tenant.deposit_policy) missingSections.push("policies");
  
  // ===== FETCH INTELLIGENCE LAYERS =====
  let intentRules: IntentRule[] = [];
  let requiredQuestions: RequiredQuestionsConfig[] = [];
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
      intentRules = rules.filter(r => r.rule_type !== "required_inputs").map(r => ({
        id: r.id,
        name: r.name,
        rule_type: r.rule_type,
        action: r.action_json || {},
        priority: r.priority || 0,
      }));

      // Extract required questions rules
      requiredQuestions = rules
        .filter(r => r.rule_type === "required_inputs" && r.action_json)
        .map(r => r.action_json as unknown as RequiredQuestionsConfig)
        .filter(config => config.intent && Array.isArray(config.required_inputs));
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
    food_settings: foodSettings ? {
      estimated_prep_minutes: foodSettings.estimated_prep_minutes || 15,
      accepts_pickup: foodSettings.accepts_pickup !== false,
      accepts_delivery: foodSettings.accepts_delivery === true,
      accepts_dine_in: foodSettings.accepts_dine_in !== false,
      delivery_radius_miles: foodSettings.delivery_radius_miles || null,
      delivery_minimum_cents: foodSettings.delivery_minimum_cents || null,
      accepts_catering: foodSettings.accepts_catering === true,
      catering_min_guests: foodSettings.catering_min_guests || null,
      catering_lead_days: foodSettings.catering_lead_days || null,
      order_confirmation_mode: foodSettings.order_confirmation_mode || "auto_confirm",
    } : null,
    knowledge: {
      faqs: faqs.map(f => ({ question: f.question, answer: f.answer })),
      faqs_summary: buildFaqsSummary(faqs),
      objections: objections.map(o => ({ objection: o.objection, response: o.response })),
      // Additional knowledge from ai_knowledge_base table (policies, upsells, custom info)
      supplementary: knowledgeBase.map(k => ({ type: k.type, title: k.title, content: k.content })),
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
      required_questions: requiredQuestions,
      required_questions_summary: buildRequiredQuestionsSummary(requiredQuestions),
      memory_hints: memoryHints,
      memory_hints_summary: buildMemoryHintsSummary(memoryHints),
    },
    pricing: {
      rules_summary: buildPricingRulesSummary(tenant.pricing_rules_jsonb),
      busyness_config: tenant.busyness_rules_jsonb || null,
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
    
    // Add food settings information
    const prepTime = ctx.food_settings?.estimated_prep_minutes || 15;
    const orderTypes: string[] = [];
    if (ctx.food_settings?.accepts_pickup !== false) orderTypes.push("pickup");
    if (ctx.food_settings?.accepts_delivery) orderTypes.push("delivery");
    if (ctx.food_settings?.accepts_dine_in !== false) orderTypes.push("dine-in");
    
    prompt += `FOOD ORDERING SETTINGS:
- Estimated prep time: ${prepTime} minutes
- Order types accepted: ${orderTypes.join(", ") || "pickup"}
${ctx.food_settings?.accepts_delivery ? `- Delivery radius: ${ctx.food_settings.delivery_radius_miles || 5} miles` : ""}
${ctx.food_settings?.delivery_minimum_cents ? `- Delivery minimum: $${(ctx.food_settings.delivery_minimum_cents / 100).toFixed(2)}` : ""}
${ctx.food_settings?.accepts_catering ? `- Catering available (min ${ctx.food_settings.catering_min_guests || 10} guests, ${ctx.food_settings.catering_lead_days || 3} days notice)` : ""}

`;
    
    // Add food-specific ordering instructions
    prompt += `FOOD ORDERING FLOW:
You are ENABLED to take food orders. When a customer wants to order:

1. GREET & ASK ORDER TYPE: "Would you like ${orderTypes.slice(0, 2).join(" or ")} today?"
2. TAKE THE ORDER: Listen for items. Confirm each item and any modifications.
3. ASK FOR MODIFICATIONS: "Would you like to add anything to that?" or "Any special instructions?"
4. CONFIRM THE ORDER: Repeat the full order back: "So that's [items]. Did I get that right?"
5. GET CUSTOMER INFO: Ask for name and phone number for the order.
6. IF DELIVERY: Ask for the delivery address.
7. GIVE TIME ESTIMATE: "Your order will be ready in about ${prepTime} minutes." (for pickup) or "Your order will arrive in about ${prepTime + 15}-${prepTime + 25} minutes." (for delivery)
8. CLOSE: "Thank you! We'll have that ready for you."

IMPORTANT ORDER RULES:
- You CAN and SHOULD take orders when the menu is available
- Confirm the order summary with the customer before completing
- If an item isn't on the menu, politely say "I don't see that on our menu, but let me suggest..."
- For unclear items, ask clarifying questions
- Always collect: items, name, phone, and address (if delivery)
- ALWAYS give the time estimate (${prepTime} minutes prep time) when confirming orders

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

  // Supplementary knowledge (from ai_knowledge_base - policies, upsells, custom info)
  if (ctx.knowledge.supplementary.length > 0) {
    prompt += `ADDITIONAL BUSINESS KNOWLEDGE:\\n`;
    for (const item of ctx.knowledge.supplementary.slice(0, 10)) {
      prompt += `[${item.type.toUpperCase()}] ${item.title}: ${item.content}\\n\\n`;
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

  // Required questions
  if (ctx.intelligence.required_questions.length > 0) {
    prompt += `REQUIRED QUESTIONS (CRITICAL - MUST COLLECT BEFORE PROVIDING PRICES/ETA/BOOKING):

Before you can provide a price quote, ETA, or complete a booking/order/dispatch, you MUST collect all required information first.

`;

    for (const config of ctx.intelligence.required_questions) {
      const intent = config.intent;
      const requiredFields = config.required_inputs || [];

      if (requiredFields.length > 0) {
        prompt += `FOR ${intent.toUpperCase()} REQUESTS, YOU MUST ASK:\\n`;

        for (const field of requiredFields) {
          prompt += `- ${field.label}: "${field.ask_prompt}"\\n`;
          if (field.why_needed) {
            prompt += `  (Why: ${field.why_needed})\\n`;
          }
        }

        prompt += `\\n`;
      }
    }

    prompt += `WORKFLOW:
1. Customer expresses intent (e.g., "I need a plumber" or "Can I book an appointment?")
2. YOU MUST ask each required question BEFORE providing pricing or confirming availability
3. Once you have ALL required inputs, THEN you can:
   - Provide exact pricing (if service has fixed price)
   - Provide estimate (if service is "starting at")
   - Check availability and confirm booking
   - Complete the order/dispatch

CORRECT EXAMPLE:
Customer: "How much does drain cleaning cost?"
You: "I'd be happy to help with that! May I have your name and phone number first?" [collect required inputs]
Customer: "Sure, it's John at 555-1234"
You: "Thanks John! And what's the address where you need the drain cleaning?" [continue collecting]
Customer: "123 Main St"
You: "Perfect! Drain cleaning is $149. When would work best for you?"

WRONG EXAMPLE:
Customer: "How much does drain cleaning cost?"
You: "Drain cleaning is $149" [WRONG - didn't collect required info first]

DISPATCH-SPECIFIC REQUIREMENT (CRITICAL):
For DISPATCH requests, address fields MUST be collected with exact specificity:
1. ALWAYS ask for exact street address first (e.g., "123 Main Street, Chicago")
2. If customer cannot provide exact address, ask for nearest cross streets + city (e.g., "corner of Main and Oak in Springfield")
3. FALLBACK: If customer has neither exact address nor cross streets, collect:
   - Pickup ZIP code
   - Dropoff ZIP code
   - Estimated miles between locations
4. When using fallback (ZIP + miles), you MUST label any quote as an ESTIMATE and explain exact pricing requires exact addresses

DISPATCH CORRECT EXAMPLE:
Customer: "How much to tow my car?"
You: "I can help with that! What's the exact street address where your car is located?"
Customer: "I'm not sure of the exact address, I'm on the highway"
You: "No problem! Can you tell me the nearest cross streets or exit number and the city?"
Customer: "I'm near exit 42 on I-94 in Detroit"
You: "Got it. And where would you like us to tow it to? What's that address?"
[Collects exact dropoff or cross streets]
You: "Perfect! Based on that route, it'll be approximately $150-$180. I can give you an exact quote once our driver confirms the precise pickup location."

DISPATCH WRONG EXAMPLE:
Customer: "How much to tow from downtown to the airport?"
You: "That'll be about $75" [WRONG - no exact addresses or cross streets collected]

VALIDATION REQUIREMENTS (CRITICAL - ENFORCE DATA QUALITY):
Required inputs must meet validation rules, not just be "non-empty":

1. ADDRESS FIELDS (pickup_address, dropoff_address, delivery_address):
   ✓ Valid: "123 Main Street, Chicago" (street number + city)
   ✓ Valid: "123 Main St, 60601" (street number + ZIP)
   ✓ Valid: "Corner of Main and Oak, Springfield" (cross streets + city)
   ✓ Valid: "Main & 5th, 62701" (cross streets + ZIP)
   ✗ Invalid: "downtown" (too vague)
   ✗ Invalid: "Main Street" (no number or cross streets)
   ✗ Invalid: "123 Main" (no city or ZIP)
   → If invalid, re-ask: "I need a more specific address. Can you provide the street number and city, or the nearest cross streets?"

2. DATE FIELDS (reservation_date, preferred_date):
   ✓ Valid: "tomorrow", "December 25th", "12/25", "next Monday"
   ✗ Invalid: "soon", "later", "sometime"
   → If invalid, re-ask: "I need a specific date. Would you prefer tomorrow, a day this week, or a specific date?"

3. TIME FIELDS (reservation_time, preferred_time):
   ✓ Valid: "2pm", "2:30pm", "morning", "around 3pm"
   ✗ Invalid: "later", "sometime", "whenever"
   → If invalid, re-ask: "What time would work best? Morning, afternoon, or a specific time like 2pm?"

4. MILES/DISTANCE (estimated_miles):
   ✓ Valid: "5", "5 miles", "about 10 miles", "5-10 miles"
   ✗ Invalid: "not far", "close by" (no number)
   → If invalid, re-ask: "About how many miles would you estimate? Just a rough number is fine."

5. PARTY SIZE (party_size):
   ✓ Valid: "2", "4 people", "party of 6"
   ✗ Invalid: "a few", "some people" (not specific)
   → If invalid, re-ask: "How many people exactly? Just need a number."

6. PHONE NUMBERS (customer_phone, phone):
   ✓ Valid: "555-1234", "(555) 123-4567", "555.123.4567"
   ✗ Invalid: Fewer than 7 digits
   → If invalid, re-ask: "I need a complete phone number to reach you. What's the full number?"

7. EMAIL (customer_email, email):
   ✓ Valid: "john@example.com"
   ✗ Invalid: Missing @ or domain
   → If invalid, re-ask: "I need a valid email address like yourname@example.com"

RE-ASK WORKFLOW:
1. Customer provides vague/invalid input
2. You recognize it doesn't meet validation (e.g., "downtown" for address)
3. You politely re-ask with specific guidance: "I need a more specific address with a street number and city, like '123 Main Street, Chicago'. What's the exact address?"
4. Customer provides valid input
5. Continue to next required field

VALIDATION EXAMPLE:
Customer: "I need a reservation"
You: "Great! What date would you like?" [asking for date]
Customer: "sometime next week" [INVALID - too vague]
You: "I need a specific date to hold your reservation. Would you prefer Monday, Tuesday, or another day next week?" [RE-ASK with guidance]
Customer: "Tuesday"
You: "Perfect! And what time on Tuesday?" [VALID - proceed to next field]

EXCEPTION: If customer ONLY asks for general information (hours, location, general services), you don't need all required fields. But for pricing, booking, ordering, or dispatch, you MUST collect required inputs first AND ensure they meet validation requirements.

`;
  }

  // Pricing resolution contract
  prompt += `PRICING RESOLUTION CONTRACT (CRITICAL - FOLLOW DETERMINISTIC WATERFALL):

When a customer asks for pricing, you MUST follow this exact sequence:

STEP 1: CHECK REQUIRED INPUTS
- First, ensure ALL required inputs for the intent are collected AND VALID (see REQUIRED QUESTIONS above)
- If any required inputs are missing or invalid, ask for them FIRST before attempting pricing
- Do NOT proceed to pricing until validation passes

STEP 2: MATCH PRICING RULES
- If pricing rules are configured, attempt to match and calculate:
  ${ctx.pricing?.rules_summary || "No pricing rules configured"}
- Example: Distance-based rule requires "miles" + "vehicle_type"
- If rule matches AND inputs are valid → Provide calculated price
- If rule is range-only → Provide price range
- If rule is quote-only → Explain that custom quote is needed

STEP 3: FALLBACK TO SERVICE PRICE
- If no pricing rule matched, check if service has fixed price
- Fixed price → Provide exact price: "That will be $X"
- Starting at price → Provide estimate: "That starts at $X"
- Quote only → Explain custom quote needed

STEP 4: UNKNOWN - COLLECT MORE INFO
- If neither pricing rules nor service price available → Ask for missing information
- Examples:
  * "I need to know the distance to provide an exact price. About how many miles is it?"
  * "Let me get some information to provide accurate pricing. What's the pickup address?"
  * "I'll need to provide a custom quote. Let me collect your details and we'll follow up."

PRICING EXAMPLES:

CORRECT - Distance-based dispatch:
Customer: "How much to tow my car?"
You: "I can help! What's the exact address where your car is?"
Customer: "123 Main Street, Chicago"
You: "And where would you like us to tow it?"
Customer: "456 Oak Ave, same city - about 5 miles"
You: [Validates: addresses valid, miles valid]
You: [Matches: distance-based rule, calculates: $50 base + $8/mile * 5 = $90]
You: "That will be $90 for a 5-mile tow from Main Street to Oak Avenue."

CORRECT - Missing required inputs:
Customer: "How much to tow from downtown to airport?"
You: [Checks: addresses are vague, no exact miles]
You: "I need more specific addresses to provide accurate pricing. What's the exact street address downtown where your car is?"

CORRECT - Fallback to service price:
Customer: "How much for drain cleaning?"
You: [Checks: no pricing rules for drain cleaning]
You: [Checks: drain cleaning service has fixed price $149]
You: "Drain cleaning is $149. When would work best for you?"

WRONG - Pricing without validation:
Customer: "How much to tow?"
You: "Towing starts at $75" [WRONG - didn't collect addresses or validate]

WRONG - Vague pricing:
Customer: "What's your towing rate?"
You: "It depends on distance" [WRONG - be specific: "Our rate is $50 base plus $8 per mile"]

LOGGING REQUIREMENT:
When pricing fails (missing inputs, no rules, no service price), the system logs:
- Reason for failure
- Missing inputs
- Deep link to fix configuration
This helps the business owner improve pricing setup.

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
  const hasPricing = ctx.offerings.services.length > 0 || ctx.offerings.menu.length > 0;

  prompt += `PRICING BEHAVIOR (CRITICAL - READ CAREFULLY):

YOU HAVE FULL ACCESS TO PRICING INFORMATION. The services and menu items listed above include prices.

WHEN A CUSTOMER ASKS ABOUT PRICING:

1. IF THE SERVICE/ITEM HAS A FIXED PRICE:
   ✅ CORRECT: "Drain cleaning is $149"
   ✅ CORRECT: "The burger is $12.50"
   ❌ WRONG: "I don't have access to pricing"
   ❌ WRONG: "Let me have someone call you back with pricing"

2. IF THE SERVICE SAYS "STARTING AT $X":
   ✅ CORRECT: "That service starts at $X. The final price depends on [brief factor like size/complexity]"
   ❌ WRONG: "I'm not sure about the exact price"

3. IF THE SERVICE SAYS "QUOTE REQUIRED":
   ✅ CORRECT: "We'll need to provide a custom quote for that. Can I ask a few quick questions about what you need?"
   ✅ CORRECT: "For that service, we provide custom estimates. Would you like me to schedule someone to assess the job?"
   ❌ WRONG: "I don't know the price" (instead, explain WHY it requires a quote)

4. IF THE CUSTOMER ASKS ABOUT A SERVICE NOT ON YOUR LIST:
   ❌ WRONG: "I don't have pricing for that"
   ✅ CORRECT: "I don't see that specific service in my system. Let me connect you with someone who can help. What exactly are you looking for?"

5. MATCH CUSTOMER QUERIES INTELLIGENTLY:
   - Use synonyms: "clogged drain" = "drain cleaning", "burger" = "hamburger"
   - Be flexible: "how much is X?" = pricing question
   - Check both services AND menu items for the answer

CRITICAL RULES:
${hasPricing ? "- YOU HAVE PRICING DATA ABOVE. Use it! Never say you don't have access to pricing when it's listed." : "- This business has not configured pricing yet. Politely explain and offer a callback."}
- If pricing exists for an item → STATE IT DIRECTLY
- If pricing doesn't exist for an item → Explain why and offer the next step (quote, callback, etc.)
- NEVER vocalize "None", "null", or empty placeholders
- NEVER make up prices that aren't in your data

IMPORTANT GUIDELINES:
1. Be helpful, friendly, and professional
2. If you don't know something specific, offer to have someone call them back
3. Try to book appointments when appropriate
4. Collect caller's name and phone number if they want a callback
5. Never make up information about services, prices, or availability
6. If a question is outside your knowledge, use the fallback script
7. Use memory hints ONLY for personalization - never push upsells based on them
8. NEVER claim "I don't have access to..." unless the data truly doesn't exist in your context

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
    businessname: ctx.tenant.business_name || "Our Business", // Alias for ElevenLabs compatibility
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
    
    // Food settings (for food mode businesses)
    estimated_prep_minutes: ctx.food_settings?.estimated_prep_minutes || 15,
    accepts_pickup: ctx.food_settings?.accepts_pickup !== false ? "true" : "false",
    accepts_delivery: ctx.food_settings?.accepts_delivery === true ? "true" : "false",
    accepts_dine_in: ctx.food_settings?.accepts_dine_in !== false ? "true" : "false",
    delivery_radius_miles: String(ctx.food_settings?.delivery_radius_miles || ""),
    delivery_minimum_dollars: ctx.food_settings?.delivery_minimum_cents 
      ? String((ctx.food_settings.delivery_minimum_cents / 100).toFixed(2)) 
      : "",
    accepts_catering: ctx.food_settings?.accepts_catering === true ? "true" : "false",
    
    // AI assistant settings (NEVER null)
    greeting_script: ctx.ai_settings.greeting_script || "",
    fallback_script: ctx.ai_settings.fallback_script || "",
    tone: ctx.ai_settings.tone || "friendly",
    
    // Intelligence layers
    intent_rules_summary: ctx.intelligence.intent_rules_summary || "",
    required_questions_summary: ctx.intelligence.required_questions_summary || "No required questions configured",
    memory_hints_summary: ctx.safety.hipaa_mode ? "" : (ctx.intelligence.memory_hints_summary || ""),
    memory_enabled: ctx.intelligence.settings.memory_enabled,

    // Pricing & ETA
    pricing_rules_summary: ctx.pricing.rules_summary || "No pricing rules configured",
    base_prep_minutes: ctx.pricing.busyness_config?.base_prep_minutes || 30,
    busy_buffer_minutes: ctx.pricing.busyness_config?.busy_buffer_minutes || 15,
    current_busyness_pct: ctx.pricing.busyness_config?.manual_busyness_pct || 0,

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
