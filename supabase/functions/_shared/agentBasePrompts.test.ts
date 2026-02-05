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

  assert(prompt.includes("FOOD AGENT"), "Missing FOOD AGENT header");
  assert(prompt.includes("FOOD ORDERING FLOW"), "Missing FOOD ORDERING FLOW");
  assert(prompt.includes("check_service_area"), "Missing check_service_area tool");
});

Deno.test("getBasePromptForMode returns complete prompt for medical mode", () => {
  const prompt = getBasePromptForMode("medical");

  assert(prompt.includes("MEDICAL AGENT"), "Missing MEDICAL AGENT header");
  assert(prompt.includes("HIPAA COMPLIANCE"), "Missing HIPAA COMPLIANCE");
  assert(prompt.includes("5 TOOLS - NO DISPATCH"), "Missing tool count notice");
});

Deno.test("getBasePromptForMode returns complete prompt for general mode", () => {
  const prompt = getBasePromptForMode("general");

  assert(prompt.includes("GENERAL AGENT"), "Missing GENERAL AGENT header");
  assert(prompt.includes("3 TOOLS"), "Missing tool count notice");
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
  assertEquals(AGENT_BASE_PROMPTS.food.toolCount, 6, "Food should have 6 tools");
  assertEquals(AGENT_BASE_PROMPTS.medical.toolCount, 5, "Medical should have 5 tools");
  assertEquals(AGENT_BASE_PROMPTS.general.toolCount, 3, "General should have 3 tools");
});

Deno.test("All modes are defined in AGENT_BASE_PROMPTS", () => {
  const modes = ["service", "dispatch", "food", "medical", "general"];
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
  ];

  for (const prompt of allPrompts) {
    assert(!prompt.includes("TODO"), "Should not contain TODO");
    assert(!prompt.includes("FIXME"), "Should not contain FIXME");
    assert(!prompt.includes("{{"), "Should not contain handlebars placeholders");
  }
});
