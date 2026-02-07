/**
 * CANONICAL BUSINESS BRAIN SNAPSHOT FETCHER
 * 
 * Single source of truth for fetching all Business Brain data from the database.
 * Used by buildBusinessContext and voice initialization flows.
 * 
 * NON-NEGOTIABLES:
 * - No hardcoded demo data
 * - All queries are tenant-scoped
 * - Arrays default to []
 * - Objects default to {}
 * - Strings default to ""
 * - Never return null/undefined
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============= TYPE DEFINITIONS =============

export interface AiPoliciesJson {
  upselling?: string;
  pricing_negotiation?: string;
  capacity?: string;
  escalation?: string;
  [key: string]: string | undefined;
}

export interface TenantSnapshot {
  id: string;
  name: string;
  tagline: string;
  business_mode: string;
  industry: string;
  timezone: string;
  phone_public: string;
  website_url: string;
  address: string;
  years_in_business: number | null;
  hours_json: Record<string, { open: string; close: string; closed?: boolean; isOpen?: boolean }>;
  service_area_json: { type?: string; miles?: number; zip_codes?: string[]; mode?: string; radius_miles?: number; include?: { zips?: string[] } } | null;
  /**
   * NOTE: Not a physical column on tenants in the current schema.
   * Kept for backwards compatibility; will be empty unless computed elsewhere.
   */
  out_of_area_message: string;
  cancellation_policy: string;
  deposit_policy: string;
  refund_policy: string;
  payment_methods: string[];
  ai_never_promise: string[];
  ai_policies_json: AiPoliciesJson | null;
  enabled_modules: string[];
  hipaa_mode: boolean;
  pricing_rules_jsonb: any;
  busyness_rules_jsonb: any;
  /**
   * NOTE: Legacy field (tenant_distance_settings is now canonical for ETA).
   * Kept for backwards compatibility.
   */
  eta_policy_jsonb: any;
  context_fields_json: any[];
}

export interface ServiceSnapshot {
  id: string;
  name: string;
  description: string;
  price_type: string;
  price_amount: number | null;
  duration_minutes: number;
  deposit_required: boolean;
  deposit_amount: number | null;
  preparation_instructions: string;
  upsell_suggestions: string[];
  is_active: boolean;
  /** Category for grouping (e.g., "Towing", "Body Work", "Auto Repair") */
  service_category: string;
  /** Type: "primary" (core business) or "secondary" (additional services offered) */
  service_type: string;
  /** Complex pricing configuration for variable/distance-tiered pricing */
  pricing_config_json: any;
}

export interface FAQSnapshot {
  id: string;
  question: string;
  answer: string;
  priority_weight: number;
}

export interface ObjectionSnapshot {
  id: string;
  objection: string;
  response: string;
  priority_weight: number;
}

export interface KnowledgeSnapshot {
  id: string;
  type: string;
  title: string;
  content: string;
  priority_weight: number;
}

export interface AssistantSettingsSnapshot {
  voice_ai_enabled: boolean;
  instant_text_enabled: boolean;
  go_live_enabled: boolean;
  missed_call_behavior: string;
  ai_booking_mode: string;
  booking_url: string;
  calendar_provider: string;
  busy_toggle: boolean;
  overflow_rings: number;
  sms_first_delay_seconds: number;
  owner_forward_number: string;
  owner_forward_verified: boolean;
}

export interface IntelligenceSettingsSnapshot {
  memory_enabled: boolean;
  min_confidence_threshold: number;
  min_observation_threshold: number;
  share_memory_across_locations: boolean;
}

export interface IntentRuleSnapshot {
  id: string;
  name: string;
  rule_type: string;
  description: string;
  condition_json: Record<string, any>;
  action_json: Record<string, any>;
  priority: number;
  is_enabled: boolean;
}

export interface RequiredQuestionSnapshot {
  intent: string;
  required_inputs: Array<{
    key: string;
    label: string;
    ask_prompt: string;
    why_needed: string;
  }>;
  optional_inputs: Array<{
    key: string;
    label: string;
    ask_prompt: string;
    why_needed: string;
  }>;
}

export interface AvailabilitySlotSnapshot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface PricingRuleSnapshot {
  type: string;
  service_name: string;
  base_price: number | null;
  per_unit_price: number | null;
  unit_label: string;
  required_inputs: string[];
  min_price: number | null;
  max_price: number | null;
}

export interface MenuCategorySnapshot {
  id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

export interface MenuItemSnapshot {
  id: string;
  name: string;
  description: string;
  category: string;
  price_cents: number | null;
  modifiers: string[];
  dietary_tags: string[];
  is_available: boolean;
  prep_time_minutes: number | null;
}

export interface FoodOrderSettingsSnapshot {
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
}

// ============= MODE-SPECIFIC KNOWLEDGE SNAPSHOTS =============

export interface MenuKnowledgeSnapshot {
  item_name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  dietary_tags: string[];
  pairing_suggestions: string;
  chef_notes: string;
  spice_level: number;
  is_signature: boolean;
}

export interface CateringKnowledgeSnapshot {
  event_type: string;
  min_guests: number | null;
  max_guests: number | null;
  lead_time_days: number | null;
  deposit_percentage: number | null;
  ai_script: string;
}

export interface VehicleKnowledgeSnapshot {
  vehicle_category: string;
  equipment_required: string[];
  weight_class: string;
  special_instructions: string;
  additional_fees_apply: boolean;
  fee_notes: string;
}

export interface RoadsideKnowledgeSnapshot {
  situation_type: string;
  safety_instructions: string;
  estimated_service_time_minutes: number | null;
  escalation_triggers: string[];
  priority_level: string;
  ai_script: string;
}

export interface SymptomTriageSnapshot {
  symptom_category: string;
  symptom_name: string;
  severity_indicators: string[];
  escalation_action: string;
  can_be_telehealth: boolean;
  hipaa_safe_response: string;
}

export interface InsuranceKnowledgeSnapshot {
  carrier_name: string;
  plan_types: string[];
  is_accepted: boolean;
  copay_typical_range: string;
  patient_script: string;
}

export interface ProductKnowledgeSnapshot {
  product_name: string;
  brand: string;
  benefits: string[];
  is_premium: boolean;
  upsell_script: string;
}

export interface AftercareSnapshot {
  service_name: string;
  immediate_care: string[];
  things_to_avoid: string[];
  warning_signs: string[];
  follow_up_timeframe: string;
}

export interface CompetitorKnowledgeSnapshot {
  competitor_name: string;
  our_advantage: string[];
  response_script: string;
}

export interface SeasonalKnowledgeSnapshot {
  event_name: string;
  special_hours: string;
  special_pricing_notes: string;
  ai_announcement: string;
}

export interface BusinessBrainSnapshot {
  tenant: TenantSnapshot;
  services: ServiceSnapshot[];
  faqs: FAQSnapshot[];
  objections: ObjectionSnapshot[];
  knowledge: KnowledgeSnapshot[];
  assistant_settings: AssistantSettingsSnapshot;
  tenant_intelligence_settings: IntelligenceSettingsSnapshot;
  intent_rules: IntentRuleSnapshot[];
  required_questions: RequiredQuestionSnapshot[];
  availability_slots: AvailabilitySlotSnapshot[];
  pricing_rules: PricingRuleSnapshot[];
  food: {
    menu_categories: MenuCategorySnapshot[];
    menu_items: MenuItemSnapshot[];
    food_order_settings: FoodOrderSettingsSnapshot;
  };
  // Mode-specific knowledge sections
  mode_knowledge: {
    // Food mode
    menu_knowledge: MenuKnowledgeSnapshot[];
    catering_knowledge: CateringKnowledgeSnapshot[];
    // Dispatch mode
    vehicle_knowledge: VehicleKnowledgeSnapshot[];
    roadside_knowledge: RoadsideKnowledgeSnapshot[];
    // Medical mode
    symptom_triage: SymptomTriageSnapshot[];
    insurance_knowledge: InsuranceKnowledgeSnapshot[];
    // Service mode
    product_knowledge: ProductKnowledgeSnapshot[];
    // Shared (all modes)
    aftercare: AftercareSnapshot[];
    competitors: CompetitorKnowledgeSnapshot[];
    seasonal: SeasonalKnowledgeSnapshot[];
  };
  _meta: {
    fetched_at: string;
    tenant_id: string;
    business_mode: string;
    section_counts: {
      services: number;
      faqs: number;
      objections: number;
      knowledge: number;
      intent_rules: number;
      required_questions: number;
      availability_slots: number;
      pricing_rules: number;
      menu_items: number;
      mode_knowledge: number;
    };
  };
}

// ============= SAFE DEFAULT FACTORIES =============

function safeString(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

function safeNumber(val: unknown, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

function safeBoolean(val: unknown, fallback: boolean = false): boolean {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.toLowerCase() === "true";
  return Boolean(val);
}

function safeArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  return [];
}

function safeObject<T extends Record<string, unknown>>(val: unknown): T {
  if (val && typeof val === "object" && !Array.isArray(val)) return val as T;
  return {} as T;
}

function getDefaultTenantSnapshot(): TenantSnapshot {
  return {
    id: "",
    name: "",
    tagline: "",
    business_mode: "general",
    industry: "",
    timezone: "America/New_York",
    phone_public: "",
    website_url: "",
    address: "",
    years_in_business: null,
    hours_json: {},
    service_area_json: null,
    out_of_area_message: "",
    cancellation_policy: "",
    deposit_policy: "",
    refund_policy: "",
    payment_methods: [],
    ai_never_promise: [],
    ai_policies_json: null,
    enabled_modules: [],
    hipaa_mode: false,
    pricing_rules_jsonb: null,
    busyness_rules_jsonb: null,
    eta_policy_jsonb: null,
    context_fields_json: [],
  };
}

function getDefaultAssistantSettings(): AssistantSettingsSnapshot {
  return {
    voice_ai_enabled: false,
    instant_text_enabled: false,
    go_live_enabled: false,
    missed_call_behavior: "text_only",
    ai_booking_mode: "pending_approval",
    booking_url: "",
    calendar_provider: "",
    busy_toggle: false,
    overflow_rings: 3,
    sms_first_delay_seconds: 5,
    owner_forward_number: "",
    owner_forward_verified: false,
  };
}

function getDefaultIntelligenceSettings(): IntelligenceSettingsSnapshot {
  return {
    memory_enabled: false,
    min_confidence_threshold: 0.65,
    min_observation_threshold: 3,
    share_memory_across_locations: false,
  };
}

function getDefaultFoodOrderSettings(): FoodOrderSettingsSnapshot {
  return {
    estimated_prep_minutes: 15,
    accepts_pickup: true,
    accepts_delivery: false,
    accepts_dine_in: true,
    delivery_radius_miles: null,
    delivery_minimum_cents: null,
    accepts_catering: false,
    catering_min_guests: null,
    catering_lead_days: null,
    order_confirmation_mode: "auto_confirm",
  };
}

// ============= MAIN FETCHER =============

export interface GetSnapshotOptions {
  tenantId: string;
  locationId?: string | null;
}

/**
 * Fetches complete Business Brain snapshot from database.
 * All data is tenant-scoped. Returns stable shape with safe defaults.
 */
export async function getBusinessBrainSnapshot(
  supabase: SupabaseClient,
  options: GetSnapshotOptions
): Promise<BusinessBrainSnapshot> {
  const { tenantId, locationId } = options;

  // STEP 1: Fetch tenant first to get business_mode
  const { data: tenantData, error: tenantError } = await supabase
    .from("tenants")
    .select(`
      id, name, tagline, business_mode, industry, timezone,
      phone_public, website_url, address, years_in_business,
      hours_json, service_area_json,
      cancellation_policy, deposit_policy, refund_policy, payment_methods,
      ai_never_promise, ai_policies_json, enabled_modules, hipaa_mode,
      pricing_rules_jsonb, busyness_rules_jsonb, context_fields_json
    `)
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenantData) {
    console.error(`[getBusinessBrainSnapshot] Tenant not found: ${tenantId}`, tenantError);
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  const businessMode = safeString(tenantData.business_mode) || "general";
  const isFoodMode = businessMode === "food";

  // STEP 2: Fetch all Business Brain data in parallel (typed separately to avoid inference issues)
  const servicesQuery = supabase
    .from("services")
    .select("id, name, description, price_type, price_amount, duration_minutes, deposit_required, deposit_amount, preparation_instructions, upsell_suggestions, is_active, service_category, service_type, pricing_config_json")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(100);

  const faqsQuery = supabase
    .from("business_faqs")
    .select("id, question, answer, priority_weight")
    .eq("tenant_id", tenantId)
    .order("priority_weight", { ascending: false })
    .limit(30);

  const objectionsQuery = supabase
    .from("objection_responses")
    .select("id, objection, response, priority_weight")
    .eq("tenant_id", tenantId)
    .order("priority_weight", { ascending: false })
    .limit(20);

  const knowledgeQuery = supabase
    .from("ai_knowledge_base")
    .select("id, type, title, content, priority_weight")
    .eq("tenant_id", tenantId)
    .order("priority_weight", { ascending: false })
    .limit(30);

  const assistantSettingsQuery = supabase
    .from("assistant_settings")
    .select("voice_ai_enabled, instant_text_enabled, go_live_enabled, missed_call_behavior, ai_booking_mode, booking_url, calendar_provider, busy_toggle, overflow_rings, sms_first_delay_seconds, owner_forward_number, owner_forward_verified")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const intelligenceSettingsQuery = supabase
    .from("tenant_intelligence_settings")
    .select("memory_enabled, min_confidence_threshold, min_observation_threshold, share_memory_across_locations")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const intentRulesQuery = supabase
    .from("business_intent_rules")
    .select("id, name, rule_type, description, condition_json, action_json, priority, is_enabled")
    .eq("tenant_id", tenantId)
    .eq("is_enabled", true)
    .order("priority", { ascending: false })
    .limit(30);

  const availabilitySlotsQuery = supabase
    .from("availability_slots")
    .select("id, day_of_week, start_time, end_time, is_available")
    .eq("tenant_id", tenantId)
    .order("day_of_week")
    .order("start_time");

  // Mode-specific knowledge queries
  const menuKnowledgeQuery = supabase
    .from("menu_knowledge")
    .select("item_name, detailed_description, ingredients, allergens, dietary_tags, pairing_suggestions, chef_notes, spice_level, is_signature")
    .eq("tenant_id", tenantId)
    .order("is_signature", { ascending: false })
    .limit(50);

  const cateringKnowledgeQuery = supabase
    .from("catering_knowledge")
    .select("event_type, min_guests, max_guests, lead_time_days, deposit_percentage, ai_script")
    .eq("tenant_id", tenantId)
    .limit(20);

  const vehicleKnowledgeQuery = supabase
    .from("vehicle_knowledge")
    .select("vehicle_category, equipment_required, weight_class, special_instructions, additional_fees_apply, fee_notes")
    .eq("tenant_id", tenantId)
    .limit(30);

  const roadsideKnowledgeQuery = supabase
    .from("roadside_knowledge")
    .select("situation_type, safety_instructions, estimated_service_time_minutes, escalation_triggers, priority_level, ai_script")
    .eq("tenant_id", tenantId)
    .order("priority_level", { ascending: false })
    .limit(20);

  const symptomTriageQuery = supabase
    .from("symptom_triage")
    .select("symptom_category, symptom_name, severity_indicators, escalation_action, can_be_telehealth, hipaa_safe_response")
    .eq("tenant_id", tenantId)
    .limit(50);

  const insuranceKnowledgeQuery = supabase
    .from("insurance_knowledge")
    .select("carrier_name, plan_types, is_accepted, copay_typical_range, patient_script")
    .eq("tenant_id", tenantId)
    .limit(30);

  const productKnowledgeQuery = supabase
    .from("product_knowledge")
    .select("product_name, brand, benefits, is_premium, upsell_script")
    .eq("tenant_id", tenantId)
    .order("is_premium", { ascending: false })
    .limit(30);

  const aftercareQuery = supabase
    .from("aftercare_instructions")
    .select("service_name, immediate_care, things_to_avoid, warning_signs, follow_up_timeframe")
    .eq("tenant_id", tenantId)
    .limit(30);

  const competitorQuery = supabase
    .from("competitor_knowledge")
    .select("competitor_name, our_advantage, response_script")
    .eq("tenant_id", tenantId)
    .limit(20);

  const seasonalQuery = supabase
    .from("seasonal_knowledge")
    .select("event_name, special_hours, special_pricing_notes, ai_announcement")
    .eq("tenant_id", tenantId)
    .limit(20);

  // Execute core queries in parallel
  const [
    servicesResult,
    faqsResult,
    objectionsResult,
    knowledgeResult,
    assistantSettingsResult,
    intelligenceSettingsResult,
    intentRulesResult,
    availabilitySlotsResult,
    // Mode-specific knowledge
    menuKnowledgeResult,
    cateringKnowledgeResult,
    vehicleKnowledgeResult,
    roadsideKnowledgeResult,
    symptomTriageResult,
    insuranceKnowledgeResult,
    productKnowledgeResult,
    aftercareResult,
    competitorResult,
    seasonalResult,
  ] = await Promise.all([
    servicesQuery,
    faqsQuery,
    objectionsQuery,
    knowledgeQuery,
    assistantSettingsQuery,
    intelligenceSettingsQuery,
    intentRulesQuery,
    availabilitySlotsQuery,
    // Mode-specific knowledge
    menuKnowledgeQuery,
    cateringKnowledgeQuery,
    vehicleKnowledgeQuery,
    roadsideKnowledgeQuery,
    symptomTriageQuery,
    insuranceKnowledgeQuery,
    productKnowledgeQuery,
    aftercareQuery,
    competitorQuery,
    seasonalQuery,
  ]);

  // Conditionally fetch food-specific data
  let menuItemsResult: { data: any[] | null } = { data: null };
  let foodSettingsResult: { data: any | null } = { data: null };

  if (isFoodMode) {
    const [menuResult, foodResult] = await Promise.all([
      supabase
        .from("menu_items")
        .select("id, name, description, category, price_cents, modifiers, dietary_tags, is_available, prep_time_minutes")
        .eq("tenant_id", tenantId)
        .eq("is_available", true)
        .limit(100),
      supabase
        .from("food_order_settings")
        .select("estimated_prep_minutes, accepts_pickup, accepts_delivery, accepts_dine_in, delivery_radius_miles, delivery_minimum_cents, accepts_catering, catering_min_guests, catering_lead_days, order_confirmation_mode")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);
    menuItemsResult = menuResult;
    foodSettingsResult = foodResult;
  }

  // STEP 3: Transform data with safe defaults

  const tenant: TenantSnapshot = {
    id: safeString(tenantData.id),
    name: safeString(tenantData.name),
    tagline: safeString(tenantData.tagline),
    business_mode: businessMode,
    industry: safeString(tenantData.industry),
    timezone: safeString(tenantData.timezone) || "America/New_York",
    phone_public: safeString(tenantData.phone_public),
    website_url: safeString(tenantData.website_url),
    address: safeString(tenantData.address),
    years_in_business: tenantData.years_in_business,
    hours_json: safeObject(tenantData.hours_json),
    service_area_json: tenantData.service_area_json || null,
    // Not present in tenants table; kept for backwards compatibility
    out_of_area_message: "",
    cancellation_policy: safeString(tenantData.cancellation_policy),
    deposit_policy: safeString(tenantData.deposit_policy),
    refund_policy: safeString(tenantData.refund_policy),
    payment_methods: safeArray(tenantData.payment_methods),
    ai_never_promise: safeArray(tenantData.ai_never_promise),
    ai_policies_json: tenantData.ai_policies_json || null,
    enabled_modules: safeArray(tenantData.enabled_modules),
    hipaa_mode: safeBoolean(tenantData.hipaa_mode),
    pricing_rules_jsonb: tenantData.pricing_rules_jsonb || null,
    busyness_rules_jsonb: tenantData.busyness_rules_jsonb || null,
    // Legacy field; tenant_distance_settings is now canonical for ETA
    eta_policy_jsonb: null,
    context_fields_json: safeArray(tenantData.context_fields_json),
  };

  const services: ServiceSnapshot[] = safeArray(servicesResult.data).map((s: any) => ({
    id: safeString(s.id),
    name: safeString(s.name),
    description: safeString(s.description),
    price_type: safeString(s.price_type) || "quote_only",
    price_amount: s.price_amount,
    duration_minutes: safeNumber(s.duration_minutes, 60),
    deposit_required: safeBoolean(s.deposit_required),
    deposit_amount: s.deposit_amount,
    preparation_instructions: safeString(s.preparation_instructions),
    upsell_suggestions: safeArray(s.upsell_suggestions),
    is_active: safeBoolean(s.is_active, true),
    service_category: safeString(s.service_category),
    service_type: safeString(s.service_type) || "primary",
    pricing_config_json: s.pricing_config_json || null,
  }));

  const faqs: FAQSnapshot[] = safeArray(faqsResult.data).map((f: any) => ({
    id: safeString(f.id),
    question: safeString(f.question),
    answer: safeString(f.answer),
    priority_weight: safeNumber(f.priority_weight),
  }));

  const objections: ObjectionSnapshot[] = safeArray(objectionsResult.data).map((o: any) => ({
    id: safeString(o.id),
    objection: safeString(o.objection),
    response: safeString(o.response),
    priority_weight: safeNumber(o.priority_weight),
  }));

  const knowledge: KnowledgeSnapshot[] = safeArray(knowledgeResult.data).map((k: any) => ({
    id: safeString(k.id),
    type: safeString(k.type),
    title: safeString(k.title),
    content: safeString(k.content),
    priority_weight: safeNumber(k.priority_weight),
  }));

  const assistantSettingsRaw = assistantSettingsResult?.data;
  const assistant_settings: AssistantSettingsSnapshot = assistantSettingsRaw
    ? {
        voice_ai_enabled: safeBoolean(assistantSettingsRaw.voice_ai_enabled),
        instant_text_enabled: safeBoolean(assistantSettingsRaw.instant_text_enabled),
        go_live_enabled: safeBoolean(assistantSettingsRaw.go_live_enabled),
        missed_call_behavior: safeString(assistantSettingsRaw.missed_call_behavior) || "text_only",
        ai_booking_mode: safeString(assistantSettingsRaw.ai_booking_mode) || "pending_approval",
        booking_url: safeString(assistantSettingsRaw.booking_url),
        calendar_provider: safeString(assistantSettingsRaw.calendar_provider),
        busy_toggle: safeBoolean(assistantSettingsRaw.busy_toggle),
        overflow_rings: safeNumber(assistantSettingsRaw.overflow_rings, 3),
        sms_first_delay_seconds: safeNumber(assistantSettingsRaw.sms_first_delay_seconds, 5),
        owner_forward_number: safeString(assistantSettingsRaw.owner_forward_number),
        owner_forward_verified: safeBoolean(assistantSettingsRaw.owner_forward_verified),
      }
    : getDefaultAssistantSettings();

  const intelligenceSettingsRaw = intelligenceSettingsResult?.data;
  const tenant_intelligence_settings: IntelligenceSettingsSnapshot = intelligenceSettingsRaw
    ? {
        memory_enabled: safeBoolean(intelligenceSettingsRaw.memory_enabled),
        min_confidence_threshold: safeNumber(intelligenceSettingsRaw.min_confidence_threshold, 0.65),
        min_observation_threshold: safeNumber(intelligenceSettingsRaw.min_observation_threshold, 3),
        share_memory_across_locations: safeBoolean(intelligenceSettingsRaw.share_memory_across_locations),
      }
    : getDefaultIntelligenceSettings();

  const intent_rules: IntentRuleSnapshot[] = safeArray(intentRulesResult.data).map((r: any) => ({
    id: safeString(r.id),
    name: safeString(r.name),
    rule_type: safeString(r.rule_type),
    description: safeString(r.description),
    condition_json: safeObject(r.condition_json),
    action_json: safeObject(r.action_json),
    priority: safeNumber(r.priority),
    is_enabled: safeBoolean(r.is_enabled, true),
  }));

  // Extract required questions from intent rules
  const required_questions: RequiredQuestionSnapshot[] = intent_rules
    .filter((r) => r.rule_type === "required_inputs" && r.action_json)
    .map((r) => {
      const action = r.action_json as any;
      return {
        intent: safeString(action.intent),
        required_inputs: safeArray(action.required_inputs).map((input: any) => ({
          key: safeString(input.key),
          label: safeString(input.label),
          ask_prompt: safeString(input.ask_prompt),
          why_needed: safeString(input.why_needed),
        })),
        optional_inputs: safeArray(action.optional_inputs).map((input: any) => ({
          key: safeString(input.key),
          label: safeString(input.label),
          ask_prompt: safeString(input.ask_prompt),
          why_needed: safeString(input.why_needed),
        })),
      };
    })
    .filter((q) => q.intent);

  const availability_slots: AvailabilitySlotSnapshot[] = safeArray(availabilitySlotsResult.data).map((s: any) => ({
    id: safeString(s.id),
    day_of_week: safeNumber(s.day_of_week),
    start_time: safeString(s.start_time),
    end_time: safeString(s.end_time),
    is_available: safeBoolean(s.is_available, true),
  }));

  // Extract pricing rules from tenant JSON
  const pricingRulesRaw = tenant.pricing_rules_jsonb?.rules || tenant.pricing_rules_jsonb || [];
  const pricing_rules: PricingRuleSnapshot[] = safeArray(pricingRulesRaw).map((r: any) => ({
    type: safeString(r.type) || "quote_only",
    service_name: safeString(r.service_name),
    base_price: r.base_price,
    per_unit_price: r.per_unit_price,
    unit_label: safeString(r.unit_label),
    required_inputs: safeArray(r.required_inputs),
    min_price: r.min_price,
    max_price: r.max_price,
  }));

  // Food-specific data (empty if not food mode)
  let menu_items: MenuItemSnapshot[] = [];
  let food_order_settings: FoodOrderSettingsSnapshot = getDefaultFoodOrderSettings();

  if (isFoodMode) {
    menu_items = safeArray(menuItemsResult.data).map((m: any) => ({
      id: safeString(m.id),
      name: safeString(m.name),
      description: safeString(m.description),
      category: safeString(m.category) || "Menu",
      price_cents: m.price_cents,
      modifiers: safeArray(m.modifiers),
      dietary_tags: safeArray(m.dietary_tags),
      is_available: safeBoolean(m.is_available, true),
      prep_time_minutes: m.prep_time_minutes,
    }));

    const foodSettingsRaw = foodSettingsResult?.data;
    if (foodSettingsRaw) {
      food_order_settings = {
        estimated_prep_minutes: safeNumber(foodSettingsRaw.estimated_prep_minutes, 15),
        accepts_pickup: safeBoolean(foodSettingsRaw.accepts_pickup, true),
        accepts_delivery: safeBoolean(foodSettingsRaw.accepts_delivery),
        accepts_dine_in: safeBoolean(foodSettingsRaw.accepts_dine_in, true),
        delivery_radius_miles: foodSettingsRaw.delivery_radius_miles,
        delivery_minimum_cents: foodSettingsRaw.delivery_minimum_cents,
        accepts_catering: safeBoolean(foodSettingsRaw.accepts_catering),
        catering_min_guests: foodSettingsRaw.catering_min_guests,
        catering_lead_days: foodSettingsRaw.catering_lead_days,
        order_confirmation_mode: safeString(foodSettingsRaw.order_confirmation_mode) || "auto_confirm",
      };
    }
  }

  // Transform mode-specific knowledge with safe defaults
  const menu_knowledge: MenuKnowledgeSnapshot[] = safeArray(menuKnowledgeResult.data).map((m: any) => ({
    item_name: safeString(m.item_name),
    description: safeString(m.detailed_description),
    ingredients: safeArray(m.ingredients),
    allergens: safeArray(m.allergens),
    dietary_tags: safeArray(m.dietary_tags),
    pairing_suggestions: safeString(m.pairing_suggestions),
    chef_notes: safeString(m.chef_notes),
    spice_level: safeNumber(m.spice_level),
    is_signature: safeBoolean(m.is_signature),
  }));

  const catering_knowledge: CateringKnowledgeSnapshot[] = safeArray(cateringKnowledgeResult.data).map((c: any) => ({
    event_type: safeString(c.event_type),
    min_guests: c.min_guests,
    max_guests: c.max_guests,
    lead_time_days: c.lead_time_days,
    deposit_percentage: c.deposit_percentage,
    ai_script: safeString(c.ai_script),
  }));

  const vehicle_knowledge: VehicleKnowledgeSnapshot[] = safeArray(vehicleKnowledgeResult.data).map((v: any) => ({
    vehicle_category: safeString(v.vehicle_category),
    equipment_required: safeArray(v.equipment_required),
    weight_class: safeString(v.weight_class),
    special_instructions: safeString(v.special_instructions),
    additional_fees_apply: safeBoolean(v.additional_fees_apply),
    fee_notes: safeString(v.fee_notes),
  }));

  const roadside_knowledge: RoadsideKnowledgeSnapshot[] = safeArray(roadsideKnowledgeResult.data).map((r: any) => ({
    situation_type: safeString(r.situation_type),
    safety_instructions: safeString(r.safety_instructions),
    estimated_service_time_minutes: r.estimated_service_time_minutes,
    escalation_triggers: safeArray(r.escalation_triggers),
    priority_level: safeString(r.priority_level),
    ai_script: safeString(r.ai_script),
  }));

  const symptom_triage: SymptomTriageSnapshot[] = safeArray(symptomTriageResult.data).map((s: any) => ({
    symptom_category: safeString(s.symptom_category),
    symptom_name: safeString(s.symptom_name),
    severity_indicators: safeArray(s.severity_indicators),
    escalation_action: safeString(s.escalation_action),
    can_be_telehealth: safeBoolean(s.can_be_telehealth, true),
    hipaa_safe_response: safeString(s.hipaa_safe_response),
  }));

  const insurance_knowledge: InsuranceKnowledgeSnapshot[] = safeArray(insuranceKnowledgeResult.data).map((i: any) => ({
    carrier_name: safeString(i.carrier_name),
    plan_types: safeArray(i.plan_types),
    is_accepted: safeBoolean(i.is_accepted, true),
    copay_typical_range: safeString(i.copay_typical_range),
    patient_script: safeString(i.patient_script),
  }));

  const product_knowledge: ProductKnowledgeSnapshot[] = safeArray(productKnowledgeResult.data).map((p: any) => ({
    product_name: safeString(p.product_name),
    brand: safeString(p.brand),
    benefits: safeArray(p.benefits),
    is_premium: safeBoolean(p.is_premium),
    upsell_script: safeString(p.upsell_script),
  }));

  const aftercare: AftercareSnapshot[] = safeArray(aftercareResult.data).map((a: any) => ({
    service_name: safeString(a.service_name),
    immediate_care: safeArray(a.immediate_care),
    things_to_avoid: safeArray(a.things_to_avoid),
    warning_signs: safeArray(a.warning_signs),
    follow_up_timeframe: safeString(a.follow_up_timeframe),
  }));

  const competitors: CompetitorKnowledgeSnapshot[] = safeArray(competitorResult.data).map((c: any) => ({
    competitor_name: safeString(c.competitor_name),
    our_advantage: safeArray(c.our_advantage),
    response_script: safeString(c.response_script),
  }));

  const seasonal: SeasonalKnowledgeSnapshot[] = safeArray(seasonalResult.data).map((s: any) => ({
    event_name: safeString(s.event_name),
    special_hours: safeString(s.special_hours),
    special_pricing_notes: safeString(s.special_pricing_notes),
    ai_announcement: safeString(s.ai_announcement),
  }));

  // Count total mode-specific knowledge items
  const modeKnowledgeCount = menu_knowledge.length + catering_knowledge.length + 
    vehicle_knowledge.length + roadside_knowledge.length + 
    symptom_triage.length + insurance_knowledge.length + 
    product_knowledge.length + aftercare.length + 
    competitors.length + seasonal.length;

  // Build section counts for logging
  const section_counts = {
    services: services.length,
    faqs: faqs.length,
    objections: objections.length,
    knowledge: knowledge.length,
    intent_rules: intent_rules.length,
    required_questions: required_questions.length,
    availability_slots: availability_slots.length,
    pricing_rules: pricing_rules.length,
    menu_items: menu_items.length,
    mode_knowledge: modeKnowledgeCount,
  };

  // STEP 4: Return complete snapshot
  return {
    tenant,
    services,
    faqs,
    objections,
    knowledge,
    assistant_settings,
    tenant_intelligence_settings,
    intent_rules,
    required_questions,
    availability_slots,
    pricing_rules,
    food: {
      menu_categories: [], // menu_categories table doesn't exist - derived from menu_items
      menu_items,
      food_order_settings,
    },
    mode_knowledge: {
      menu_knowledge,
      catering_knowledge,
      vehicle_knowledge,
      roadside_knowledge,
      symptom_triage,
      insurance_knowledge,
      product_knowledge,
      aftercare,
      competitors,
      seasonal,
    },
    _meta: {
      fetched_at: new Date().toISOString(),
      tenant_id: tenantId,
      business_mode: businessMode,
      section_counts,
    },
  };
}

// ============= SUMMARY BUILDER =============

/**
 * Build a compact AI-facing summary string from Business Brain snapshot.
 * This summary enumerates key facts for the voice AI.
 */
export function buildBusinessBrainSummary(snapshot: BusinessBrainSnapshot): string {
  const parts: string[] = [];
  const t = snapshot.tenant;

  // Business identity
  parts.push(`Business: ${t.name || "Unknown"}`);
  if (t.address) parts.push(`Location: ${t.address}`);

  // Service area
  if (t.service_area_json) {
    const sa = t.service_area_json;
    if (sa.radius_miles || sa.miles) {
      parts.push(`Service area: ${sa.radius_miles || sa.miles}-mile radius`);
    } else if (sa.zip_codes?.length) {
      parts.push(`Service area: ${sa.zip_codes.length} ZIP codes`);
    }
  }

  // Hours
  if (Object.keys(t.hours_json).length > 0) {
    parts.push(`Hours: configured`);
  }

  // Mode and modules
  parts.push(`Mode: ${t.business_mode}`);
  if (t.enabled_modules.length > 0) {
    parts.push(`Modules: ${t.enabled_modules.join(", ")}`);
  }

  // Policies
  const policiesCount = [t.cancellation_policy, t.deposit_policy, t.refund_policy].filter(Boolean).length;
  if (policiesCount > 0) {
    parts.push(`Policies: ${policiesCount} configured`);
  }

  // Booking mode
  if (snapshot.assistant_settings.ai_booking_mode) {
    parts.push(`Booking: ${snapshot.assistant_settings.ai_booking_mode}`);
  }

  // Section counts
  const counts = snapshot._meta.section_counts;
  const countParts: string[] = [];
  if (counts.services > 0) countParts.push(`${counts.services} services`);
  if (counts.menu_items > 0) countParts.push(`${counts.menu_items} menu items`);
  if (counts.faqs > 0) countParts.push(`${counts.faqs} FAQs`);
  if (counts.objections > 0) countParts.push(`${counts.objections} objection responses`);
  if (counts.intent_rules > 0) countParts.push(`${counts.intent_rules} intent rules`);
  if (counts.required_questions > 0) countParts.push(`${counts.required_questions} required question configs`);
  if (counts.pricing_rules > 0) countParts.push(`${counts.pricing_rules} pricing rules`);

  if (countParts.length > 0) {
    parts.push(`Knowledge: ${countParts.join(", ")}`);
  }

  return parts.join(". ") + ".";
}

/**
 * Serialize Business Brain snapshot to JSON with size awareness.
 * Returns truncated version if exceeds safe limit.
 */
export function serializeBusinessBrainSnapshot(
  snapshot: BusinessBrainSnapshot,
  maxSize: number = 20000
): { json: string; truncated: boolean } {
  // First try full serialization
  const fullJson = JSON.stringify(snapshot);

  if (fullJson.length <= maxSize) {
    return { json: fullJson, truncated: false };
  }

  // Reduce to essential fields only
  const reduced = {
    tenant: {
      id: snapshot.tenant.id,
      name: snapshot.tenant.name,
      business_mode: snapshot.tenant.business_mode,
      timezone: snapshot.tenant.timezone,
      address: snapshot.tenant.address,
      hours_json: snapshot.tenant.hours_json,
      enabled_modules: snapshot.tenant.enabled_modules,
    },
    services: snapshot.services.slice(0, 15).map((s) => ({
      name: s.name,
      price_type: s.price_type,
      price_amount: s.price_amount,
      duration_minutes: s.duration_minutes,
    })),
    assistant_settings: snapshot.assistant_settings,
    required_questions: snapshot.required_questions.slice(0, 5),
    intent_rules: snapshot.intent_rules.slice(0, 10).map((r) => ({
      name: r.name,
      rule_type: r.rule_type,
      action_json: r.action_json,
    })),
    _meta: snapshot._meta,
  };

  const reducedJson = JSON.stringify(reduced);

  // Final safety truncation
  if (reducedJson.length > maxSize) {
    return {
      json: reducedJson.substring(0, maxSize - 20) + '..."truncated"}',
      truncated: true,
    };
  }

  return { json: reducedJson, truncated: true };
}
