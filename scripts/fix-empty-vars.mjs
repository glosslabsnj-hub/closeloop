/**
 * Fix empty dynamic variable defaults on all 7 agents.
 * ElevenLabs dashboard blocks publishing when variables are empty strings.
 * These are all overridden at call time by twilio-inbound, but need non-empty
 * defaults to pass dashboard validation and be safe for playground testing.
 */

const API_KEY = "sk_2b27cfbfbc65aab7bfff4e370c598be68abcbe515e488d68";
const BASE = "https://api.elevenlabs.io/v1/convai/agents";

// Safe defaults for all variables that were empty string ""
// These are spoken-safe and descriptive if the AI ever references them
const SAFE_DEFAULTS = {
  // Core identity (set per-tenant at call time)
  tenant_id: "pending",
  location_id: "default",
  business_tagline: "not set",
  years_in_business: "not set",
  website_url: "not set",
  industry_slug: "general",
  enabled_modules: "ai_voice",
  capabilities_list: "ai_voice",
  business_address: "not set",
  location_summary: "not set",
  service_area_summary: "not set",
  service_area_rules_json: "{}",
  out_of_area_message: "We may not serve your area but let me take your information",

  // Caller info (set per-call)
  caller_phone: "unknown",
  caller_phone_last4: "0000",
  customer_id: "new",
  customer_order_count: "0",
  customer_name_from_lookup: "not recognized",
  active_job_summary: "none",
  twilio_call_sid: "test",

  // Staff & hours
  staff_names: "our team",
  hours_today: "not set",
  booking_link: "not set",

  // Offerings (set from Business Brain)
  service_summary: "not configured yet",
  services_pricing: "not configured yet",
  secondary_services_summary: "none",
  menu_summary: "not configured yet",
  menu_top_categories: "not set",
  packages_summary: "none",
  trip_fee_summary: "none",
  active_promotions: "none currently",
  inventory_summary: "not configured",
  inventory_detail: "not configured",
  sales_rep_names: "our team",

  // Pricing
  pricing_rules_summary: "standard pricing applies",
  eta_rules_summary: "standard response times apply",
  eta_policy_summary: "not configured",
  response_time_spoken: "as soon as possible",
  price_modifiers_summary: "none",

  // Policies
  cancellation_policy: "not set",
  faqs_summary: "not configured yet",
  objection_responses_summary: "none",
  never_promise_list: "none",
  knowledge_base_summary: "not configured yet",
  ai_guidelines_summary: "follow standard procedures",
  ai_guidelines_upselling: "not set",
  ai_guidelines_pricing_negotiation: "not set",
  ai_guidelines_capacity: "not set",
  ai_guidelines_escalation: "not set",
  ai_guidelines_recognition: "not set",

  // AI settings
  greeting_script: "not set",
  fallback_script: "not set",
  emergency_surcharge: "none",
  deposit_amount: "none",
  ai_guardrails: "none",

  // Intelligence
  intent_rules_summary: "none",
  memory_hints_summary: "none",
  required_questions_summary: "none",

  // Food
  delivery_radius_miles: "not set",
  delivery_minimum: "not set",
  estimated_prep_minutes: "not set",

  // Dispatch/Towing knowledge
  vehicle_knowledge_summary: "not configured",
  roadside_safety_scripts: "not configured",
  competitor_positioning_summary: "not configured",
  never_say_list: "none",
  competitive_advantages: "not configured",
  seasonal_events_summary: "none",

  // Debug
  missing_sections: "none",

  // Impound
  impound_lot_id: "not set",
  impound_lot_name: "not set",
  impound_lot_address: "not set",
  impound_lot_phone: "not set",
  impound_lot_hours_today: "not set",
  impound_lot_hours_summary: "not set",
  impound_next_open: "not set",
  impound_base_tow_fee: "not set",
  impound_daily_storage_fee: "not set",
  impound_admin_fee: "not set",
  impound_gate_fee: "not set",
  impound_fee_summary: "not set",
  impound_release_requirements: "not set",
  impound_release_requirements_summary: "not set",
  impound_accepted_payment_summary: "not set",

  // Meta
  business_brain_summary: "not configured yet",
  business_brain_json_compact: "{}",
};

// Catchall for any empty variable not in the map above
const FALLBACK_DEFAULT = "not set";

const AGENTS = [
  { mode: "service",  id: "agent_4701kg1vwhzqfxmvzh032nhvx434" },
  { mode: "dispatch", id: "agent_2601kghfpmckez3t2n6p7bmcpac4" },
  { mode: "food",     id: "agent_6501kghfd7pcf5dte8k61wnn0m58" },
  { mode: "medical",  id: "agent_1001kghfstqzfryadtx3kh9t4ye4" },
  { mode: "general",  id: "agent_9601kghg3djcfbfvwxxfkrxqpmq9" },
  { mode: "sales",    id: "agent_2301kh5ertzwfas9e9badpers2cf" },
  { mode: "impound",  id: "agent_6301kgqscdvyek3a6wgegq8et167" },
];

async function fixAgent(agent) {
  console.log(`\n--- ${agent.mode.toUpperCase()} (${agent.id}) ---`);

  // GET current config
  const getRes = await fetch(`${BASE}/${agent.id}`, { headers: { "xi-api-key": API_KEY } });
  const data = await getRes.json();

  const dvp = data.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders || {};
  const keys = Object.keys(dvp);

  // Find empty variables and fill them
  let fixedCount = 0;
  for (const k of keys) {
    if (dvp[k] === "" || dvp[k] === null || dvp[k] === undefined) {
      dvp[k] = SAFE_DEFAULTS[k] || FALLBACK_DEFAULT;
      fixedCount++;
    }
  }

  console.log(`  Total vars: ${keys.length}, Fixed: ${fixedCount}`);

  if (fixedCount === 0) {
    console.log(`  No empty vars — skipping PATCH`);
    return true;
  }

  // PATCH with updated dynamic variables
  const payload = {
    conversation_config: {
      agent: {
        dynamic_variables: {
          dynamic_variable_placeholders: dvp
        }
      }
    }
  };

  const patchRes = await fetch(`${BASE}/${agent.id}`, {
    method: "PATCH",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (patchRes.ok) {
    const result = await patchRes.json();
    const resultDvp = result.conversation_config?.agent?.dynamic_variables?.dynamic_variable_placeholders || {};
    const resultKeys = Object.keys(resultDvp);
    const stillEmpty = resultKeys.filter(k => resultDvp[k] === "" || resultDvp[k] === null || resultDvp[k] === undefined);
    console.log(`  OK: ${resultKeys.length} vars, ${stillEmpty.length} still empty`);
    if (stillEmpty.length > 0) {
      console.log(`  Still empty: ${JSON.stringify(stillEmpty.slice(0, 10))}`);
    }
    return stillEmpty.length === 0;
  } else {
    const err = await patchRes.text();
    console.log(`  FAILED (${patchRes.status}): ${err.substring(0, 200)}`);
    return false;
  }
}

async function run() {
  let allOk = true;
  for (const agent of AGENTS) {
    const ok = await fixAgent(agent);
    if (!ok) allOk = false;
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("\n" + "=".repeat(60));
  console.log(allOk ? "ALL AGENTS FIXED — NO EMPTY VARIABLES" : "SOME AGENTS STILL HAVE ISSUES");
  console.log("=".repeat(60));
}

run();
