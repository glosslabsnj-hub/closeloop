/**
 * Tests for agentBasePrompts module
 */

import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  getBasePromptForMode,
  getModePrompt,
  AGENT_BASE_PROMPTS,
  HUMAN_PHONE_RULES,
  TIME_NUMBER_SPEAKING_RULES,
  SERVICE_AGENT_BASE_PROMPT,
  DISPATCH_AGENT_BASE_PROMPT,
  FOOD_AGENT_BASE_PROMPT,
  MEDICAL_AGENT_BASE_PROMPT,
  GENERAL_AGENT_BASE_PROMPT,
  SALES_AGENT_BASE_PROMPT,
} from "./agentBasePrompts.ts";

Deno.test("getBasePromptForMode returns complete prompt for service mode", () => {
  const prompt = getBasePromptForMode("service");

  // Should include all shared sections
  assert(prompt.includes("HUMAN PHONE RULES"), "Missing HUMAN PHONE RULES");
  assert(prompt.includes("TIME AND NUMBER SPEAKING RULES"), "Missing TIME AND NUMBER SPEAKING RULES");
  assert(prompt.includes("DEBUG MODE"), "Missing DEBUG MODE");
  assert(prompt.includes("BUSYNESS-AWARE BEHAVIOR"), "Missing BUSYNESS-AWARE BEHAVIOR");

  // Should include service-specific content
  assert(prompt.includes("SERVICE + BOOKING AGENT"), "Missing SERVICE + BOOKING AGENT header");
  assert(prompt.includes("TOOL CALLING (6 TOOLS AVAILABLE)"), "Missing tool calling section");

  // Should include all 6 service tools
  assert(prompt.includes("check_availability"), "Missing check_availability tool");
  assert(prompt.includes("suggest_availability"), "Missing suggest_availability tool");
  assert(prompt.includes("create_booking"), "Missing create_booking tool");
  assert(prompt.includes("check_service_area"), "Missing check_service_area tool");
  assert(prompt.includes("create_dispatch_job"), "Missing create_dispatch_job tool");
  assert(prompt.includes("create_callback"), "Missing create_callback tool");
});

Deno.test("getBasePromptForMode returns complete prompt for dispatch mode", () => {
  const prompt = getBasePromptForMode("dispatch");

  assert(prompt.includes("DISPATCH AGENT"), "Missing DISPATCH AGENT header");
  assert(prompt.includes("DISPATCH ETA BEHAVIOR"), "Missing DISPATCH ETA BEHAVIOR");
  assert(prompt.includes("check_service_area"), "Missing check_service_area tool");
  assert(prompt.includes("create_dispatch_job"), "Missing create_dispatch_job tool");
});

Deno.test("getBasePromptForMode returns complete prompt for food mode", () => {
  const prompt = getBasePromptForMode("food");

  // Should include shared sections
  assert(prompt.includes("HUMAN PHONE RULES"), "Missing HUMAN PHONE RULES");
  assert(prompt.includes("TIME AND NUMBER SPEAKING RULES"), "Missing TIME AND NUMBER SPEAKING RULES");
  assert(prompt.includes("DEBUG MODE"), "Missing DEBUG MODE");
  assert(prompt.includes("BUSYNESS-AWARE BEHAVIOR"), "Missing BUSYNESS-AWARE BEHAVIOR");

  // Should include food-specific content
  assert(prompt.includes("phone order specialist"), "Missing food agent role identity");
  assert(prompt.includes("FOOD ORDER FLOW"), "Missing FOOD ORDER FLOW section");
  assert(prompt.includes("RESERVATION FLOW"), "Missing RESERVATION FLOW section");
  assert(prompt.includes("check_service_area"), "Missing check_service_area tool");
});

Deno.test("getBasePromptForMode returns complete prompt for medical mode", () => {
  const prompt = getBasePromptForMode("medical");

  // Should include shared sections
  assert(prompt.includes("HUMAN PHONE RULES"), "Missing HUMAN PHONE RULES");
  assert(prompt.includes("TIME AND NUMBER SPEAKING RULES"), "Missing TIME AND NUMBER SPEAKING RULES");
  assert(prompt.includes("DEBUG OVERRIDE"), "Missing DEBUG OVERRIDE");
  assert(prompt.includes("BUSYNESS-AWARE BEHAVIOR"), "Missing BUSYNESS-AWARE BEHAVIOR");

  // Should include medical-specific content
  assert(prompt.includes("front-desk receptionist"), "Missing medical agent role identity");
  assert(prompt.includes("7 TOOLS AVAILABLE"), "Missing tool count notice");
  assert(prompt.includes("HIPAA"), "Missing HIPAA section");
});

Deno.test("getBasePromptForMode returns complete prompt for general mode", () => {
  const prompt = getBasePromptForMode("general");

  assert(prompt.includes("GENERAL AGENT"), "Missing GENERAL AGENT header");
  assert(prompt.includes("3 TOOLS"), "Missing tool count notice");
});

Deno.test("getBasePromptForMode returns complete prompt for sales mode", () => {
  const prompt = getBasePromptForMode("sales");

  assert(prompt.includes("SALES AGENT"), "Missing SALES AGENT header");
  assert(prompt.includes("check_service_area") || prompt.includes("SALES"), "Missing sales-specific content");
});

Deno.test("getBasePromptForMode defaults to general for unknown mode", () => {
  const prompt = getBasePromptForMode("unknown" as any);

  assert(prompt.includes("GENERAL AGENT"), "Should default to GENERAL AGENT");
});

Deno.test("getModePrompt returns only mode-specific content", () => {
  const prompt = getModePrompt("service");

  assert(prompt.includes("SERVICE + BOOKING AGENT"), "Should include service agent content");
  assert(!prompt.includes("HUMAN PHONE RULES"), "Should NOT include shared rules");
  assert(!prompt.includes("DEBUG MODE"), "Should NOT include debug mode");
});

Deno.test("HUMAN_PHONE_RULES includes natural speech patterns", () => {
  assert(HUMAN_PHONE_RULES.includes("gonna"), "Should mention gonna");
  assert(HUMAN_PHONE_RULES.includes("Yeah"), "Should mention Yeah");
  assert(HUMAN_PHONE_RULES.includes("As an AI"), "Should mention forbidden phrase: As an AI");
  assert(HUMAN_PHONE_RULES.includes("Certainly!"), "Should mention forbidden phrase: Certainly!");
});

Deno.test("TIME_NUMBER_SPEAKING_RULES includes duration conversions", () => {
  assert(TIME_NUMBER_SPEAKING_RULES.includes("90 minutes"), "Should mention 90 minutes");
  assert(TIME_NUMBER_SPEAKING_RULES.includes("hour and a half"), "Should mention hour and a half");
  assert(TIME_NUMBER_SPEAKING_RULES.includes("eighty-five"), "Should mention price speaking");
});

Deno.test("SERVICE_AGENT_BASE_PROMPT includes industry-specific intake", () => {
  assert(SERVICE_AGENT_BASE_PROMPT.includes("SALON/SPA"), "Should include SALON/SPA section");
  assert(SERVICE_AGENT_BASE_PROMPT.includes("HVAC/PLUMBING"), "Should include HVAC section");
  assert(SERVICE_AGENT_BASE_PROMPT.includes("AUTO SERVICE"), "Should include AUTO section");
  assert(SERVICE_AGENT_BASE_PROMPT.includes("CLEANING SERVICES"), "Should include CLEANING section");
});

Deno.test("SERVICE_AGENT_BASE_PROMPT includes emergency flow", () => {
  assert(SERVICE_AGENT_BASE_PROMPT.includes("EMERGENCY/SAME-DAY FLOW"), "Should include emergency flow");
  assert(SERVICE_AGENT_BASE_PROMPT.includes("RECOGNIZE URGENCY"), "Should include urgency recognition");
});

Deno.test("SERVICE_AGENT_BASE_PROMPT includes real-world situations", () => {
  assert(SERVICE_AGENT_BASE_PROMPT.includes("WALK-IN AVAILABILITY"), "Should include walk-in");
  assert(SERVICE_AGENT_BASE_PROMPT.includes("RUNNING LATE"), "Should include running late");
  assert(SERVICE_AGENT_BASE_PROMPT.includes("CANCELLATION/RESCHEDULE"), "Should include cancellation");
  assert(SERVICE_AGENT_BASE_PROMPT.includes("GROUP BOOKINGS"), "Should include group bookings");
  assert(SERVICE_AGENT_BASE_PROMPT.includes("WARRANTY/RECALL"), "Should include warranty");
});

Deno.test("AGENT_BASE_PROMPTS has correct tool counts", () => {
  assertEquals(AGENT_BASE_PROMPTS.service.toolCount, 6, "Service should have 6 tools");
  assertEquals(AGENT_BASE_PROMPTS.dispatch.toolCount, 6, "Dispatch should have 6 tools");
  assertEquals(AGENT_BASE_PROMPTS.food.toolCount, 8, "Food should have 8 tools");
  assertEquals(AGENT_BASE_PROMPTS.medical.toolCount, 7, "Medical should have 7 tools");
  assertEquals(AGENT_BASE_PROMPTS.general.toolCount, 3, "General should have 3 tools");
  assertEquals(AGENT_BASE_PROMPTS.sales.toolCount, 5, "Sales should have 5 tools");
});

Deno.test("All modes are defined in AGENT_BASE_PROMPTS", () => {
  const modes = ["service", "dispatch", "food", "medical", "general", "sales"];
  for (const mode of modes) {
    assert(AGENT_BASE_PROMPTS[mode as keyof typeof AGENT_BASE_PROMPTS], `Missing mode: ${mode}`);
  }
});

Deno.test("No placeholder text in prompts", () => {
  const allPrompts = [
    HUMAN_PHONE_RULES,
    TIME_NUMBER_SPEAKING_RULES,
    SERVICE_AGENT_BASE_PROMPT,
    DISPATCH_AGENT_BASE_PROMPT,
    FOOD_AGENT_BASE_PROMPT,
    MEDICAL_AGENT_BASE_PROMPT,
    GENERAL_AGENT_BASE_PROMPT,
    SALES_AGENT_BASE_PROMPT,
  ];

  for (const prompt of allPrompts) {
    assert(!prompt.includes("TODO"), "Should not contain TODO");
    assert(!prompt.includes("FIXME"), "Should not contain FIXME");
  }
});

// ===== FOOD AGENT SPECIFIC TESTS =====

Deno.test("FOOD_AGENT_BASE_PROMPT has production-grade length", () => {
  // The rewritten food prompt should be substantially longer than the old ~136-line skeleton
  assert(FOOD_AGENT_BASE_PROMPT.length > 3000, `Food prompt too short: ${FOOD_AGENT_BASE_PROMPT.length} chars`);
});

Deno.test("FOOD_AGENT_BASE_PROMPT contains all 25 section headers", () => {
  const requiredSections = [
    "DEBUG OVERRIDE",
    "SYSTEM CONTEXT",
    "BEHAVIOR MODE OVERRIDE",
    "BUSINESS IDENTITY & REPUTATION",
    "BUSINESS BRAIN",
    "MENU KNOWLEDGE",
    "CALLER RECOGNITION & MEMORY",
    "HUMAN PHONE RULES",
    "TIME AND NUMBER SPEAKING RULES",
    "OPENING (ALWAYS)",
    "GOAL ORDER (ALWAYS)",
    "INTENT DETECTION (FAST)",
    "FOOD ORDER FLOW",
    "RESERVATION FLOW",
    "DELIVERY ZONE & FEE HANDLING",
    "CATERING & LARGE ORDERS",
    "SPECIALS & PROMOTIONS",
    "DIETARY & ALLERGY HANDLING",
    "COMPLAINTS & ISSUE RESOLUTION",
    "NEGOTIATION & OBJECTION HANDLING",
    "TOOL CALLING (8 TOOLS AVAILABLE)",
    "BUSYNESS-AWARE BEHAVIOR",
    "COMMON QUESTIONS",
    "NON-NEGOTIABLE TRUTH RULES",
    "ENDING (ALWAYS",
    "GUARDRAILS & ESCALATION",
  ];

  for (const section of requiredSections) {
    assert(FOOD_AGENT_BASE_PROMPT.includes(section), `Missing section: ${section}`);
  }
});

Deno.test("FOOD_AGENT_BASE_PROMPT contains critical dynamic variables", () => {
  const requiredVars = [
    "{{tenant_id}}",
    "{{business_name}}",
    "{{business_mode}}",
    "{{tone}}",
    "{{timezone}}",
    "{{food_ask_pickup_vs_delivery}}",
    "{{food_require_allergy_check}}",
    "{{food_default_order_type}}",
    "{{food_repeat_order_back}}",
    "{{food_confirm_total}}",
    "{{food_confirmation_script}}",
    "{{food_ask_asap_vs_scheduled}}",
    "{{estimated_prep_minutes}}",
    "{{daily_specials_summary}}",
    "{{dietary_tags_available}}",
    "{{menu_categories_summary}}",
    "{{delivery_fee_summary}}",
    "{{food_policies_summary}}",
    "{{has_food_orders}}",
    "{{has_reservations}}",
    "{{has_catering}}",
    "{{accepts_pickup}}",
    "{{accepts_delivery}}",
    "{{order_confirmation_mode}}",
    "{{default_prep_time_minutes}}",
    "{{delivery_radius_miles}}",
    "{{caller_phone}}",
    "{{customer_name_from_lookup}}",
    "{{greeting_script}}",
    "{{ai_behavior_mode}}",
    "{{current_busyness_pct}}",
    "{{ai_guardrails}}",
  ];

  for (const v of requiredVars) {
    assert(FOOD_AGENT_BASE_PROMPT.includes(v), `Missing dynamic variable: ${v}`);
  }
});

Deno.test("FOOD_AGENT_BASE_PROMPT contains all 8 tool names", () => {
  const tools = [
    "check_availability",
    "suggest_availability",
    "create_booking",
    "check_service_area",
    "create_dispatch_job",
    "create_callback",
    "transfer_to_owner",
    "add_to_waitlist",
  ];

  for (const tool of tools) {
    assert(FOOD_AGENT_BASE_PROMPT.includes(tool), `Missing tool: ${tool}`);
  }
});

Deno.test("FOOD_AGENT_BASE_PROMPT does NOT contain banned phrases as instructions", () => {
  // The prompt should list banned phrases (to tell the agent not to use them),
  // but should not use them as actual instructions to the agent
  const bannedAsInstructions = [
    "I don't have access to",
    "I'm just an AI",
    "As your AI assistant",
  ];

  for (const phrase of bannedAsInstructions) {
    assert(!FOOD_AGENT_BASE_PROMPT.includes(phrase), `Should not contain: ${phrase}`);
  }
});

Deno.test("Food toolCount matches AGENT_BASE_PROMPTS", () => {
  assertEquals(AGENT_BASE_PROMPTS.food.toolCount, 8, "Food should have 8 tools");
});

Deno.test("FOOD_AGENT_BASE_PROMPT uses section divider pattern", () => {
  // Should use the same ======================== pattern as SERVICE agent
  const dividerCount = (FOOD_AGENT_BASE_PROMPT.match(/========================/g) || []).length;
  assert(dividerCount >= 40, `Expected at least 40 section dividers (pairs), found ${dividerCount}`);
});

// ===== MEDICAL AGENT SPECIFIC TESTS =====

Deno.test("MEDICAL_AGENT_BASE_PROMPT has production-grade length", () => {
  assert(MEDICAL_AGENT_BASE_PROMPT.length > 3000, `Medical prompt too short: ${MEDICAL_AGENT_BASE_PROMPT.length} chars`);
});

Deno.test("MEDICAL_AGENT_BASE_PROMPT contains all section headers", () => {
  const requiredSections = [
    "DEBUG OVERRIDE",
    "SYSTEM CONTEXT",
    "BEHAVIOR MODE OVERRIDE",
    "BUSINESS IDENTITY & REPUTATION",
    "BUSINESS BRAIN",
    "PROVIDER & SERVICE KNOWLEDGE",
    "CALLER RECOGNITION & MEMORY",
    "HUMAN PHONE RULES",
    "TIME AND NUMBER SPEAKING RULES",
    "OPENING (ALWAYS)",
    "GOAL ORDER (ALWAYS)",
    "INTENT DETECTION (FAST)",
    "HIPAA CONSENT FLOW",
    "EMERGENCY DETECTION & ESCALATION",
    "NEW PATIENT FLOW",
    "RETURNING PATIENT FLOW",
    "APPOINTMENT SCHEDULING FLOW",
    "INSURANCE & BILLING HANDLING",
    "PRESCRIPTION & REFILL HANDLING",
    "TEST RESULTS & RECORDS REQUESTS",
    "TELEHEALTH & HOME VISITS",
    "COMPLAINTS & ISSUE RESOLUTION",
    "TOOL CALLING (7 TOOLS AVAILABLE)",
    "BUSYNESS-AWARE BEHAVIOR",
    "COMMON QUESTIONS",
    "NON-NEGOTIABLE TRUTH RULES",
    "ENDING (SOFT CLOSE)",
    "GUARDRAILS & ESCALATION",
  ];

  for (const section of requiredSections) {
    assert(MEDICAL_AGENT_BASE_PROMPT.includes(section), `Missing section: ${section}`);
  }
});

Deno.test("MEDICAL_AGENT_BASE_PROMPT contains critical dynamic variables", () => {
  const requiredVars = [
    "{{tenant_id}}",
    "{{business_name}}",
    "{{business_mode}}",
    "{{tone}}",
    "{{timezone}}",
    "{{medical_consent_timing}}",
    "{{medical_consent_script}}",
    "{{medical_detect_emergency}}",
    "{{medical_emergency_script}}",
    "{{accepts_insurance}}",
    "{{accepted_carriers_summary}}",
    "{{in_network_insurers_summary}}",
    "{{accepts_medicare}}",
    "{{accepts_medicaid}}",
    "{{offers_telehealth}}",
    "{{offers_home_visits}}",
    "{{home_visit_radius_miles}}",
    "{{new_patient_arrival_minutes}}",
    "{{medical_policies_summary}}",
    "{{after_hours_contact_policy}}",
    "{{medical_cancellation_notice_hours}}",
    "{{prescription_refill_notice_days}}",
    "{{reserves_urgent_slots}}",
    "{{urgent_slots_per_day}}",
    "{{hospital_affiliation}}",
    "{{caller_phone}}",
    "{{customer_name_from_lookup}}",
    "{{greeting_script}}",
    "{{ai_behavior_mode}}",
    "{{current_busyness_pct}}",
    "{{ai_guardrails}}",
    "{{out_of_network_disclosure}}",
    "{{insurance_verification_days_before}}",
    "{{payment_plan_available}}",
  ];

  for (const v of requiredVars) {
    assert(MEDICAL_AGENT_BASE_PROMPT.includes(v), `Missing dynamic variable: ${v}`);
  }
});

Deno.test("MEDICAL_AGENT_BASE_PROMPT contains all 7 tool names", () => {
  const tools = [
    "check_availability",
    "suggest_availability",
    "create_booking",
    "check_service_area",
    "create_callback",
    "transfer_to_owner",
    "add_to_waitlist",
  ];

  for (const tool of tools) {
    assert(MEDICAL_AGENT_BASE_PROMPT.includes(tool), `Missing tool: ${tool}`);
  }
});

Deno.test("MEDICAL_AGENT_BASE_PROMPT does NOT contain banned phrases as instructions", () => {
  const bannedAsInstructions = [
    "I don't have access to",
    "I'm just an AI",
    "As your AI assistant",
  ];

  for (const phrase of bannedAsInstructions) {
    assert(!MEDICAL_AGENT_BASE_PROMPT.includes(phrase), `Should not contain: ${phrase}`);
  }
});

Deno.test("Medical toolCount matches AGENT_BASE_PROMPTS", () => {
  assertEquals(AGENT_BASE_PROMPTS.medical.toolCount, 7, "Medical should have 7 tools");
});

Deno.test("MEDICAL_AGENT_BASE_PROMPT uses section divider pattern", () => {
  const dividerCount = (MEDICAL_AGENT_BASE_PROMPT.match(/========================/g) || []).length;
  assert(dividerCount >= 40, `Expected at least 40 section dividers (pairs), found ${dividerCount}`);
});

Deno.test("MEDICAL_AGENT_BASE_PROMPT has HIPAA compliance assertions", () => {
  assert(MEDICAL_AGENT_BASE_PROMPT.includes("NEVER provide medical advice"), "Missing HIPAA rule: NEVER provide medical advice");
  assert(MEDICAL_AGENT_BASE_PROMPT.includes("NEVER confirm or discuss specific health conditions"), "Missing HIPAA rule: NEVER confirm or discuss specific health conditions");
  assert(MEDICAL_AGENT_BASE_PROMPT.includes("NEVER give test results over the phone"), "Missing HIPAA rule: NEVER give test results over the phone");
  assert(MEDICAL_AGENT_BASE_PROMPT.includes("NEVER confirm what medications a patient takes"), "Missing HIPAA rule: NEVER confirm medications");
});
