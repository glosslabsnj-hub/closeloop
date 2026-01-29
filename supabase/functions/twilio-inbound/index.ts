import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to create TwiML response
function twimlResponse(twiml: string): Response {
  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

// Helper to create a polite hangup TwiML
function hangupTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Get current day's hours from hours_json
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

// Truncate text to max length with ellipsis
function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// Normalized service type for AI context
interface NormalizedService {
  id: string;
  name: string;
  description: string;
  price_type: "fixed" | "starting_at" | "quote_required";
  price_amount: number | null;
  duration_minutes: number;
  synonyms: string[];
}

// Common service synonyms for better matching
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

// Normalize raw service data into AI-ready format
function normalizeServices(services: Array<{
  id: string;
  name: string;
  description?: string | null;
  price_type?: string | null;
  price_amount?: number | null;
  duration_minutes: number;
}> | null): NormalizedService[] {
  if (!services || services.length === 0) return [];
  
  return services.map(s => {
    const priceAmount = s.price_amount ?? null;
    const hasPrice = priceAmount !== null && priceAmount > 0;
    
    // Determine price_type
    let priceType: "fixed" | "starting_at" | "quote_required" = "quote_required";
    if (s.price_type === "fixed" && hasPrice) {
      priceType = "fixed";
    } else if (s.price_type === "starting_at" && hasPrice) {
      priceType = "starting_at";
    } else if (s.price_type === "quote_only" || !hasPrice) {
      priceType = "quote_required";
    } else if (hasPrice) {
      // Legacy: if price exists but no type, assume fixed
      priceType = "fixed";
    }
    
    // Find synonyms for this service
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
      price_amount: s.price_amount ?? null,
      duration_minutes: s.duration_minutes,
      synonyms,
    };
  });
}

// Build service summary from services array (for dynamic variable - compact)
function buildServiceSummary(services: NormalizedService[] | null): string {
  if (!services || services.length === 0) return "";
  
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

// Build detailed service JSON for AI prompt injection
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

// Build menu summary from menu items
function buildMenuSummary(menuItems: Array<{ name: string; category?: string | null; price_cents?: number | null }> | null): string {
  if (!menuItems || menuItems.length === 0) return "";
  
  // Group by category
  const byCategory: Record<string, string[]> = {};
  for (const item of menuItems.slice(0, 20)) {
    const cat = item.category || "Menu";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item.name);
  }
  
  const parts = Object.entries(byCategory).map(([cat, items]) => {
    return `${cat}: ${items.slice(0, 4).join(", ")}${items.length > 4 ? "..." : ""}`;
  });
  
  let result = parts.join(". ");
  if (menuItems.length > 20) result += `. Plus ${menuItems.length - 20} more items.`;
  
  return truncate(result, 600);
}

// Build policies summary
function buildPoliciesSummary(tenant: {
  cancellation_policy?: string | null;
  deposit_policy?: string | null;
  refund_policy?: string | null;
  payment_methods?: string[] | null;
}): string {
  const parts: string[] = [];
  
  if (tenant.cancellation_policy) {
    parts.push(`Cancellation: ${truncate(tenant.cancellation_policy, 150)}`);
  }
  if (tenant.deposit_policy) {
    parts.push(`Deposit: ${truncate(tenant.deposit_policy, 150)}`);
  }
  if (tenant.payment_methods && tenant.payment_methods.length > 0) {
    parts.push(`Payment: ${tenant.payment_methods.join(", ")}`);
  }
  
  if (parts.length === 0) return "";
  return truncate(parts.join(". "), 600);
}

// Check if module is enabled
function hasModule(enabledModules: string[] | null, moduleName: string): boolean {
  if (!enabledModules) return false;
  return enabledModules.includes(moduleName);
}

// Normalize phone number to E.164 format
function normalizeToE164(phone: string): string {
  if (!phone) return "";
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  // If starts with 1 and has 11 digits, format with +
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  // If 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  // If already starts with +, return as-is
  if (phone.startsWith("+")) {
    return phone;
  }
  // Default: return with + prefix
  return digits.length > 0 ? `+${digits}` : "";
}

// Build FAQs summary for AI
function buildFAQsSummary(faqs: Array<{ question: string; answer: string }> | null): string {
  if (!faqs || faqs.length === 0) return "";
  return faqs.slice(0, 5).map(f => `Q: ${truncate(f.question, 80)} A: ${truncate(f.answer, 120)}`).join(" | ");
}

// Build intent rules summary for AI prompt
function buildIntentRulesSummary(rules: Array<{ name: string; type: string; action: Record<string, unknown>; priority: number }> | null): string {
  if (!rules || rules.length === 0) return "";
  return rules.slice(0, 5).map(r => {
    const action = r.action || {};
    if (action.guidance) return `${r.name}: ${truncate(String(action.guidance), 80)}`;
    if (action.max_discount_percent !== undefined) return `${r.name}: Max ${action.max_discount_percent}% discount`;
    return r.name;
  }).join("; ");
}

// Build memory hints summary for AI prompt (non-HIPAA only)
function buildMemoryHintsSummary(hints: Array<{ type: string; summary: string; usage: string; confidence: number }> | null): string {
  if (!hints || hints.length === 0) return "";
  return hints.slice(0, 3).map(h => {
    if (h.usage === "personalize") return `Personalize: ${truncate(h.summary, 60)}`;
    if (h.usage === "timing_preference") return `Timing: ${truncate(h.summary, 60)}`;
    return truncate(h.summary, 60);
  }).join("; ");
}

// Helper to mask phone number for PHI compliance
function maskPhone(phone: string, shouldMask: boolean): string {
  if (!shouldMask || !phone) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "[REDACTED]";
  return `+***-***-${digits.slice(-4)}`;
}

// Helper to log events to twilio_event_logs table
async function logTwilioEvent(
  supabaseUrl: string,
  supabaseKey: string,
  tenantId: string | null,
  callSid: string,
  toNumber: string,
  fromNumber: string,
  stage: string,
  httpStatus: number | null,
  errorMessage: string | null,
  rawPayload: Record<string, unknown> | null,
  maskPhi: boolean = false
) {
  try {
    const sb = createClient(supabaseUrl, supabaseKey);
    await sb.from("twilio_event_logs").insert({
      tenant_id: tenantId,
      twilio_call_sid: callSid,
      to_number: toNumber, // Twilio number, not PHI
      from_number: maskPhi ? maskPhone(fromNumber, true) : fromNumber,
      stage,
      http_status: httpStatus,
      error_message: errorMessage,
      raw_payload: maskPhi ? null : rawPayload, // Don't store raw payload in HIPAA mode
    });
  } catch (e) {
    console.error("Failed to log twilio event:", e);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_2") || Deno.env.get("ELEVENLABS_API_KEY");
  const ELEVENLABS_AGENT_ID = Deno.env.get("ELEVENLABS_AGENT_ID");

  // Parse Twilio's form data
  let formData: URLSearchParams;
  let toNumber = "";
  let fromNumber = "";
  let callSid = "";

  try {
    const body = await req.text();
    formData = new URLSearchParams(body);
    toNumber = formData.get("To") || "";
    fromNumber = formData.get("From") || "";
    callSid = formData.get("CallSid") || "";
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }

  console.log(`Inbound call: From=${fromNumber}, To=${toNumber}, CallSid=${callSid}`);

  // Validate required environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase configuration");
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Log initial event
  await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, null, callSid, toNumber, fromNumber, "request_received", null, null, { method: req.method });

  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    console.error("Missing ElevenLabs configuration");
    await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, null, callSid, toNumber, fromNumber, "config_error", null, "Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID", null);
    return twimlResponse(hangupTwiml("Our voice assistant is currently unavailable. Please leave a message or try again later."));
  }

  const callerPhoneE164 = normalizeToE164(fromNumber);

  try {
    // Lookup tenant by the "To" number
    const { data: phoneRecord, error: phoneError } = await supabase
      .from("phone_numbers")
      .select("tenant_id, status, location_id")
      .eq("phone_e164", toNumber)
      .maybeSingle();

    if (phoneError) {
      console.error("Database error looking up phone number:", phoneError);
      await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, null, callSid, toNumber, fromNumber, "db_error_phone_lookup", null, phoneError.message, { code: phoneError.code });
      return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
    }

    if (!phoneRecord) {
      console.error(`No tenant found for number: ${toNumber}`);
      await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, null, callSid, toNumber, fromNumber, "no_tenant_found", null, `No tenant found for number: ${toNumber}`, null);
      return twimlResponse(hangupTwiml("This number is not currently in service. Please check the number and try again."));
    }

    const tenantId = phoneRecord.tenant_id;
    const locationId = phoneRecord.location_id || null;
    console.log(`Resolved tenant: ${tenantId}, location: ${locationId}`);

    // Fetch all required data in parallel for comprehensive context
    const [
      tenantResult,
      settingsResult,
      servicesResult,
      menuItemsResult,
      faqsResult,
      assistantResult,
      intelligenceSettingsResult,
      retentionSettingsResult,
    ] = await Promise.all([
      supabase
        .from("tenants")
        .select("name, tagline, timezone, hours_json, website_url, business_mode, enabled_modules, hipaa_mode, cancellation_policy, deposit_policy, refund_policy, payment_methods")
        .eq("id", tenantId)
        .single(),
      supabase
        .from("assistant_settings")
        .select("voice_ai_enabled, voice_mode, connect_status, booking_url, calendar_provider")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      supabase
        .from("services")
        .select("id, name, description, price_type, price_amount, duration_minutes")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .limit(15),
      supabase
        .from("menu_items")
        .select("name, category, price_cents")
        .eq("tenant_id", tenantId)
        .eq("is_available", true)
        .limit(30),
      supabase
        .from("business_faqs")
        .select("question, answer")
        .eq("tenant_id", tenantId)
        .order("priority_weight", { ascending: false })
        .limit(10),
      supabase
        .from("ai_assistants")
        .select("greeting_script, fallback_script, tone")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      supabase
        .from("tenant_intelligence_settings")
        .select("memory_enabled, min_confidence_threshold, min_observation_threshold, share_memory_across_locations")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
      supabase
        .from("data_retention_settings")
        .select("store_caller_phone, phi_minimization_enabled, allow_customer_memory")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);

    const tenant = tenantResult.data;
    const settings = settingsResult.data;
    const services = servicesResult.data;
    const menuItems = menuItemsResult.data;
    const faqs = faqsResult.data;
    const assistant = assistantResult.data;
    const intelligenceSettings = intelligenceSettingsResult.data;
    const retentionSettings = retentionSettingsResult.data;

    if (tenantResult.error || !tenant) {
      console.error("Error fetching tenant:", tenantResult.error);
      return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
    }

    // Update connect_status to forwarding_verified on first real call
    if (settings?.connect_status !== "forwarding_verified") {
      await supabase
        .from("assistant_settings")
        .update({ connect_status: "forwarding_verified", updated_at: new Date().toISOString() })
        .eq("tenant_id", tenantId);
      console.log(`Updated connect_status to forwarding_verified for tenant ${tenantId}`);
    }

    // Check if voice AI is enabled
    if (settings && settings.voice_ai_enabled === false) {
      console.log(`Voice AI disabled for tenant ${tenantId}`);
      return twimlResponse(hangupTwiml("Thank you for calling. We're currently unavailable. Please try again later or visit our website."));
    }

    // Check voice_mode
    const voiceMode = settings?.voice_mode || "always_on";
    if (voiceMode === "off") {
      console.log(`Voice mode is off for tenant ${tenantId}`);
      return twimlResponse(hangupTwiml("Thank you for calling. We're currently unavailable. Please try again later."));
    }

    // Parse enabled_modules
    const enabledModules: string[] = Array.isArray(tenant.enabled_modules) 
      ? tenant.enabled_modules as string[]
      : [];
    
    const businessMode = tenant.business_mode || "general";
    const hipaaMode = tenant.hipaa_mode === true;
    
    // Determine PHI handling based on retention settings and HIPAA mode
    const storeCallerPhone = retentionSettings?.store_caller_phone !== false && !hipaaMode;
    const phiMinimization = retentionSettings?.phi_minimization_enabled === true || hipaaMode;
    const allowCustomerMemory = retentionSettings?.allow_customer_memory !== false && !hipaaMode;

    // ===== CUSTOMER RESOLUTION =====
    // Resolve or create customer by phone number (dedupe by phone_e164)
    let customerId: string | null = null;
    if (callerPhoneE164) {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone_e164", callerPhoneE164)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update last_seen timestamp
        await supabase
          .from("customers")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", customerId);
        console.log(`Resolved existing customer: ${customerId}`);
      }
    }

    // ===== FETCH INTELLIGENCE LAYERS =====
    let intentRules: Array<{ name: string; type: string; action: Record<string, unknown>; priority: number }> = [];
    let memoryHints: Array<{ type: string; summary: string; usage: string; confidence: number }> = [];
    
    // Fetch active intent rules (priority sorted, owner-created only)
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
        name: r.name,
        type: r.rule_type,
        action: r.action_json || {},
        priority: r.priority || 0,
      }));
    }

    // Fetch memory hints (only if memory enabled AND not HIPAA mode for customer prefs)
    const memoryEnabled = intelligenceSettings?.memory_enabled === true;
    if (memoryEnabled) {
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

      // HIPAA: exclude customer preferences entirely
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

    // ===== BUILD BUSINESS CONTEXT =====
    const hoursToday = getTodayHours(tenant.hours_json as Record<string, unknown> | null);
    
    // Normalize services for consistent pricing handling
    const normalizedServices = normalizeServices(services);
    
    // Build summaries based on business mode
    let serviceSummary = "";
    let servicesForPrompt = "";
    let menuSummary = "";
    let policiesSummary = "";
    let faqsSummary = "";

    // Include service_summary for service/dispatch/general/medical modes
    if (["service", "dispatch", "general", "medical"].includes(businessMode)) {
      serviceSummary = buildServiceSummary(normalizedServices);
      servicesForPrompt = buildServicesForPrompt(normalizedServices);
    }

    // Include menu_summary for food mode
    if (businessMode === "food") {
      menuSummary = buildMenuSummary(menuItems);
    }

    // Build policies and FAQs summaries
    policiesSummary = buildPoliciesSummary(tenant);
    faqsSummary = buildFAQsSummary(faqs);

    // Build intent rules and memory hints summaries
    const intentRulesSummary = buildIntentRulesSummary(intentRules);
    // Only include memory hints summary if NOT in HIPAA mode (general business insights are OK)
    const memoryHintsSummary = hipaaMode ? "" : buildMemoryHintsSummary(memoryHints);

    // Determine booking_link based on enabled modules
    let bookingLink = "";
    if (hasModule(enabledModules, "booking") || hasModule(enabledModules, "reservations")) {
      bookingLink = settings?.booking_url || tenant.website_url || "";
    }

    // Calendar/availability status
    const calendarConnected = !!settings?.calendar_provider;

    // ===== PREPARE DYNAMIC VARIABLES (ALL STRINGS, NO NULLS) =====
    // ElevenLabs only accepts primitive types - ensure no nulls/undefined
    const dynamicVariables: Record<string, string | number | boolean> = {
      // Core identifiers
      tenant_id: tenantId,
      location_id: locationId || "",
      business_name: tenant.name || "Our Business",
      business_mode: businessMode,
      enabled_modules: enabledModules.join(","),
      hipaa_mode: hipaaMode,
      timezone: tenant.timezone || "America/New_York",
      
      // Caller info
      caller_phone: hipaaMode ? "" : callerPhoneE164, // Redact for HIPAA
      customer_id: customerId || "",
      
      // Hours and availability
      hours_today: hoursToday,
      calendar_connected: calendarConnected,
      booking_link: bookingLink,
      
      // Business Brain content (truncated for token efficiency)
      service_summary: serviceSummary,
      services_pricing: servicesForPrompt, // Detailed pricing for AI quoting
      menu_summary: menuSummary,
      policies_summary: policiesSummary,
      faqs_summary: faqsSummary,
      
      // AI assistant settings
      greeting_script: assistant?.greeting_script || "",
      fallback_script: assistant?.fallback_script || "",
      tone: assistant?.tone || "friendly",
      
      // Intelligence layers
      intent_rules_summary: intentRulesSummary,
      memory_hints_summary: memoryHintsSummary,
      memory_enabled: memoryEnabled,
    };

    console.log(`Building context for tenant ${tenantId}:`, {
      business_mode: businessMode,
      enabled_modules: enabledModules,
      hipaa_mode: hipaaMode,
      customer_id: customerId,
      services_count: normalizedServices.length,
      has_service_summary: !!serviceSummary,
      has_services_pricing: !!servicesForPrompt,
      has_menu_summary: !!menuSummary,
      has_faqs: !!faqsSummary,
      intent_rules_count: intentRules.length,
      memory_hints_count: memoryHints.length,
    });

    // ===== PREPARE CONTEXT FOR STORAGE =====
    const contextForStorage: Record<string, unknown> = {
      tenant_id: tenantId,
      location_id: locationId,
      business_mode: businessMode,
      enabled_modules: enabledModules,
      hipaa_mode: hipaaMode,
      customer_id: customerId,
      caller_phone: phiMinimization ? "[REDACTED]" : callerPhoneE164,
      hours_today: hoursToday,
      booking_link: bookingLink,
      intent_rules_count: intentRules.length,
      memory_hints_count: memoryHints.length,
      intelligence_settings: {
        memory_enabled: memoryEnabled,
        min_confidence: intelligenceSettings?.min_confidence_threshold || 0.65,
      },
      data_retention: {
        store_caller_phone: storeCallerPhone,
        phi_minimization: phiMinimization,
        allow_customer_memory: allowCustomerMemory,
      },
    };

    // ===== CREATE CALL SESSION RECORD =====
    const { data: callSession, error: sessionError } = await supabase
      .from("ai_call_sessions")
      .insert({
        tenant_id: tenantId,
        call_direction: "inbound",
        twilio_call_sid: callSid,
        // Respect retention settings: mask phone if PHI minimization enabled
        caller_phone: storeCallerPhone ? (callerPhoneE164 || fromNumber) : maskPhone(callerPhoneE164 || fromNumber, true),
        customer_id: customerId,
        started_at: new Date().toISOString(),
        context_json: contextForStorage,
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error("Error creating call session:", sessionError);
      // Continue anyway - call tracking is not critical
    } else {
      console.log(`Created call session: ${callSession?.id}`);
    }

    // ===== CALL ELEVENLABS REGISTER-CALL API =====
    const registerCallPayload = {
      agent_id: ELEVENLABS_AGENT_ID,
      from_number: fromNumber,
      to_number: toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: dynamicVariables,
      },
    };
    
    console.log("Sending to ElevenLabs:", JSON.stringify(registerCallPayload, null, 2));
    
    const registerCallResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/twilio/register-call`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerCallPayload),
      }
    );

    if (!registerCallResponse.ok) {
      const errorText = await registerCallResponse.text();
      console.error(`ElevenLabs register-call failed [${registerCallResponse.status}]:`, errorText);
      await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, tenantId, callSid, toNumber, fromNumber, "elevenlabs_register_failed", registerCallResponse.status, errorText.substring(0, 500), null, phiMinimization);
      return twimlResponse(hangupTwiml("Our voice assistant is temporarily unavailable. Please try again later."));
    }

    // Log successful ElevenLabs call (with PHI masking if applicable)
    await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, tenantId, callSid, toNumber, fromNumber, "elevenlabs_register_success", 200, null, null, phiMinimization);

    // Parse ElevenLabs response to get conversation_id for webhook linkage
    const responseText = await registerCallResponse.text();
    
    // Try to extract conversation_id from response headers or embedded data
    const conversationIdHeader = registerCallResponse.headers.get("x-conversation-id");
    let conversationId: string | null = conversationIdHeader;
    
    // If no header, try to parse conversation_id from TwiML
    if (!conversationId) {
      const match = responseText.match(/conversation[_-]?id[="':]+([a-zA-Z0-9_-]+)/i);
      if (match) {
        conversationId = match[1];
      }
    }

    // Update call session with conversation_id if we got one
    if (conversationId && callSession?.id) {
      await supabase
        .from("ai_call_sessions")
        .update({ elevenlabs_conversation_id: conversationId })
        .eq("id", callSession.id);
      console.log(`Updated call session ${callSession.id} with conversation_id: ${conversationId}`);
    }

    console.log(`ElevenLabs returned TwiML (${responseText.length} chars)`);

    return new Response(responseText, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });

  } catch (error) {
    console.error("Error handling inbound call:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    // Try to log even on catch
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        await logTwilioEvent(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, null, callSid || "unknown", toNumber || "unknown", fromNumber || "unknown", "unhandled_exception", 500, errorMsg, null);
      }
    } catch { /* ignore logging errors */ }
    return twimlResponse(hangupTwiml("We're experiencing technical difficulties. Please try again later."));
  }
});

// Helper to determine usage for memory type
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
