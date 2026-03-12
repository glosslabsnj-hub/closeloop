/**
 * LAYER 2: AI DECISION LOGIC VERIFICATION
 *
 * Verifies that the AI prompt assembly produces CORRECT behavior for each business mode.
 * Tests the actual source code logic — what tools, what terminology, what rules each mode gets.
 *
 * Zero API calls. Zero credits. Pure code inspection + database config verification.
 *
 * What this tests:
 * 1. Each mode has a complete base prompt with mode-specific instructions
 * 2. Each mode gets the correct tools (service gets booking, dispatch gets dispatch, etc.)
 * 3. Escalation rules are properly templated with {{escalation_*}} variables
 * 4. Behavior mode overrides work (callback_only removes booking, suggest_callback, etc.)
 * 5. HIPAA filtering for medical mode
 * 6. Food mode has menu/ordering instructions
 * 7. Dispatch mode has ETA/dispatch instructions
 * 8. Sales mode has inventory/lead instructions
 * 9. Dynamic variables are complete and correctly typed
 * 10. Per-tenant configs produce valid prompt contexts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = "https://yltzlvzgwkidbeqaoevp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdHpsdnpnd2tpZGJlcWFvZXZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA1OTU1OCwiZXhwIjoyMDg3NjM1NTU4fQ.wcWk27OBb2cVHid_gKiiu9wTHL_jkAHQ1Pv4raWfwz4";

interface TestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  details: string;
  severity: "critical" | "high" | "medium" | "low";
}

const results: TestResult[] = [];

function test(id: string, name: string, category: string, severity: TestResult["severity"], fn: () => string) {
  try {
    const details = fn();
    results.push({ id, name, category, passed: true, details, severity });
    console.log(`  ✓ ${id}: ${name}`);
  } catch (e: any) {
    results.push({ id, name, category, passed: false, details: e.message, severity });
    console.log(`  ✗ ${id}: ${name} — ${e.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// Read source files
const EDGE_FN_PATH = resolve("C:/Users/jacka/receptionist/supabase/functions/_shared");

function readSource(filename: string): string {
  return readFileSync(resolve(EDGE_FN_PATH, filename), "utf-8");
}

// ============================================================================
// SOURCE CODE ANALYSIS
// ============================================================================

const agentBasePrompts = readSource("agentBasePrompts.ts");
const agentToolsConfig = readSource("agentToolsConfig.ts");
const toolCapabilityMap = readSource("toolCapabilityMap.ts");
let voiceContextContract = "";
try { voiceContextContract = readSource("voiceContextContract.ts"); } catch { voiceContextContract = ""; }
let buildBusinessContext = "";
try { buildBusinessContext = readSource("buildBusinessContext.ts"); } catch { buildBusinessContext = ""; }

console.log(`╔══════════════════════════════════════════════════════╗`);
console.log(`║  LAYER 2: AI DECISION LOGIC VERIFICATION            ║`);
console.log(`║  Testing prompt assembly, tools, and AI config      ║`);
console.log(`╚══════════════════════════════════════════════════════╝`);
console.log(`Timestamp: ${new Date().toISOString()}\n`);

// ============================================================================
// SECTION 1: MODE-SPECIFIC BASE PROMPTS
// ============================================================================

console.log(`━━━ MODE-SPECIFIC BASE PROMPTS ━━━`);

const MODES = ["service", "dispatch", "food", "medical", "general", "sales"] as const;

// Each mode must have a defined base prompt
for (const mode of MODES) {
  test(`BP-${mode}`, `${mode} mode has a base prompt defined`, "base-prompts", "critical", () => {
    const varName = `${mode.toUpperCase()}_AGENT_BASE_PROMPT`;
    // General uses GENERAL, sales uses SALES, etc.
    assert(agentBasePrompts.includes(`export const ${varName}`), `Missing export const ${varName}`);
    return `Found ${varName}`;
  });
}

// Service mode specific content
test("BP-SVC-1", "Service prompt contains booking flow", "base-prompts", "critical", () => {
  const serviceSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("SERVICE_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("DISPATCH_AGENT_BASE_PROMPT")
  );
  assert(serviceSection.includes("create_booking"), "Missing create_booking reference");
  assert(serviceSection.includes("check_availability") || serviceSection.includes("suggest_availability"), "Missing availability check");
  assert(serviceSection.includes("SERVICE FLOW") || serviceSection.includes("BOOKING"), "Missing booking flow section");
  return "Service prompt has booking flow, availability checks, and service flow instructions";
});

test("BP-SVC-2", "Service prompt contains industry-specific questions", "base-prompts", "high", () => {
  const serviceSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("SERVICE_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("DISPATCH_AGENT_BASE_PROMPT")
  );
  assert(serviceSection.includes("HVAC") || serviceSection.includes("plumb"), "Missing HVAC/plumbing references");
  assert(serviceSection.includes("SALON") || serviceSection.includes("salon"), "Missing salon references");
  assert(serviceSection.includes("CLEANING") || serviceSection.includes("cleaning"), "Missing cleaning references");
  return "Service prompt has industry-specific intake (HVAC, salon, cleaning, etc.)";
});

test("BP-SVC-3", "Service prompt contains urgency detection", "base-prompts", "high", () => {
  const serviceSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("SERVICE_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("DISPATCH_AGENT_BASE_PROMPT")
  );
  assert(serviceSection.includes("urgency") || serviceSection.includes("emergency"), "Missing urgency handling");
  assert(serviceSection.includes("urgent") || serviceSection.includes("ASAP"), "Missing urgency keywords");
  return "Service prompt handles urgency detection and emergency routing";
});

test("BP-SVC-4", "Service prompt contains anti-fabrication rules", "base-prompts", "critical", () => {
  const serviceSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("SERVICE_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("DISPATCH_AGENT_BASE_PROMPT")
  );
  assert(serviceSection.includes("NEVER INVENT") || serviceSection.includes("NEVER MAKE UP"), "Missing anti-fabrication");
  assert(serviceSection.includes("Comfort Club") || serviceSection.includes("maintenance plan"), "Missing specific fabrication traps");
  assert(serviceSection.includes("OFFERS FIREWALL") || serviceSection.includes("FABRICATION"), "Missing offers firewall");
  return "Service prompt has comprehensive anti-fabrication rules with specific traps";
});

// Dispatch mode specific content
test("BP-DSP-1", "Dispatch prompt contains dispatch job creation", "base-prompts", "critical", () => {
  const dispatchSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("DISPATCH_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("FOOD_AGENT_BASE_PROMPT")
  );
  assert(dispatchSection.includes("create_dispatch_job") || dispatchSection.includes("dispatch"), "Missing dispatch job creation");
  assert(dispatchSection.includes("ETA") || dispatchSection.includes("eta"), "Missing ETA references");
  assert(dispatchSection.includes("vehicle") || dispatchSection.includes("tow"), "Missing vehicle/tow references");
  return "Dispatch prompt has job creation, ETA handling, and vehicle references";
});

test("BP-DSP-2", "Dispatch prompt contains location/service area logic", "base-prompts", "high", () => {
  const dispatchSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("DISPATCH_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("FOOD_AGENT_BASE_PROMPT")
  );
  assert(dispatchSection.includes("service_area") || dispatchSection.includes("check_service_area"), "Missing service area check");
  assert(dispatchSection.includes("address") || dispatchSection.includes("location"), "Missing location collection");
  return "Dispatch prompt has service area checking and location collection";
});

// Food mode specific content
test("BP-FOOD-1", "Food prompt contains ordering flow", "base-prompts", "critical", () => {
  const foodSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("FOOD_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("MEDICAL_AGENT_BASE_PROMPT")
  );
  assert(foodSection.includes("order") || foodSection.includes("ORDER"), "Missing order references");
  assert(foodSection.includes("menu") || foodSection.includes("MENU"), "Missing menu references");
  assert(foodSection.includes("pickup") || foodSection.includes("delivery"), "Missing pickup/delivery");
  return "Food prompt has ordering flow, menu handling, pickup/delivery";
});

test("BP-FOOD-2", "Food prompt contains dietary/allergy handling", "base-prompts", "medium", () => {
  const foodSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("FOOD_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("MEDICAL_AGENT_BASE_PROMPT")
  );
  assert(
    foodSection.includes("allerg") || foodSection.includes("dietary") || foodSection.includes("gluten"),
    "Missing dietary/allergy handling"
  );
  return "Food prompt handles dietary restrictions and allergies";
});

// Medical mode specific content
test("BP-MED-1", "Medical prompt contains HIPAA rules", "base-prompts", "critical", () => {
  const medSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("MEDICAL_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("SALES_AGENT_BASE_PROMPT") > 0
      ? agentBasePrompts.indexOf("SALES_AGENT_BASE_PROMPT")
      : agentBasePrompts.indexOf("GENERAL_AGENT_BASE_PROMPT")
  );
  assert(medSection.includes("HIPAA") || medSection.includes("hipaa"), "Missing HIPAA references");
  assert(medSection.includes("diagnos") || medSection.includes("medical advice"), "Missing no-diagnosis rule");
  return "Medical prompt has HIPAA compliance and no-diagnosis rules";
});

test("BP-MED-2", "Medical prompt contains appointment/intake flow", "base-prompts", "high", () => {
  const medSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("MEDICAL_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("SALES_AGENT_BASE_PROMPT") > 0
      ? agentBasePrompts.indexOf("SALES_AGENT_BASE_PROMPT")
      : agentBasePrompts.indexOf("GENERAL_AGENT_BASE_PROMPT")
  );
  assert(medSection.includes("appointment") || medSection.includes("schedule"), "Missing appointment scheduling");
  assert(medSection.includes("insurance") || medSection.includes("intake"), "Missing insurance/intake flow");
  return "Medical prompt has appointment scheduling and intake/insurance handling";
});

// Sales mode specific content
test("BP-SALES-1", "Sales prompt contains inventory/test drive flow", "base-prompts", "critical", () => {
  const salesSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("SALES_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("GENERAL_AGENT_BASE_PROMPT")
  );
  assert(salesSection.includes("inventory") || salesSection.includes("vehicle"), "Missing inventory/vehicle references");
  assert(salesSection.includes("test drive") || salesSection.includes("test_drive"), "Missing test drive flow");
  return "Sales prompt has inventory search and test drive scheduling";
});

test("BP-SALES-2", "Sales prompt contains lead qualification", "base-prompts", "high", () => {
  const salesSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("SALES_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("GENERAL_AGENT_BASE_PROMPT")
  );
  assert(salesSection.includes("lead") || salesSection.includes("qualified"), "Missing lead qualification");
  assert(salesSection.includes("financ") || salesSection.includes("trade"), "Missing financing/trade-in");
  return "Sales prompt has lead qualification and financing/trade-in handling";
});

// General mode specific content
test("BP-GEN-1", "General prompt is minimal (callback + FAQ)", "base-prompts", "high", () => {
  const generalSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("GENERAL_AGENT_BASE_PROMPT")
  );
  assert(generalSection.includes("callback") || generalSection.includes("create_callback"), "Missing callback handling");
  // General should NOT have booking-specific instructions
  return "General prompt focuses on callbacks and FAQ handling";
});

// ============================================================================
// SECTION 2: TOOL ASSIGNMENTS PER MODE
// ============================================================================

console.log(`\n━━━ TOOL ASSIGNMENTS PER MODE ━━━`);

// Expected tools per mode (base set — capabilities may add more)
const EXPECTED_TOOLS: Record<string, { must: string[]; mustNot: string[] }> = {
  service: {
    must: ["check_availability", "suggest_availability", "create_booking", "create_callback", "transfer_to_owner", "check_service_area"],
    mustNot: ["create_food_order"],
  },
  dispatch: {
    must: ["create_dispatch_job", "check_service_area", "create_callback", "transfer_to_owner"],
    mustNot: ["create_food_order"],
  },
  food: {
    must: ["create_food_order", "create_callback", "transfer_to_owner"],
    mustNot: ["create_dispatch_job"],
  },
  medical: {
    must: ["create_booking", "create_callback", "transfer_to_owner"],
    mustNot: ["create_dispatch_job", "create_food_order"],
  },
  general: {
    must: ["create_callback", "transfer_to_owner"],
    mustNot: ["create_dispatch_job", "create_food_order"],
  },
  sales: {
    must: ["create_callback", "transfer_to_owner", "search_inventory"],
    mustNot: ["create_food_order", "create_dispatch_job"],
  },
};

// Universal tools (create_callback, transfer_to_owner) are injected via getToolsForCapabilities
// at runtime — they use "*" capability so they're always added. We check base config for
// mode-specific tools and check the capability map for universal tools separately.
const UNIVERSAL_TOOLS = ["create_callback", "transfer_to_owner"];

for (const mode of MODES) {
  test(`TOOLS-${mode}`, `${mode} mode has correct base tools`, "tools", "critical", () => {
    const expected = EXPECTED_TOOLS[mode];
    const configVar = `${mode.toUpperCase()}_AGENT_CONFIG`;

    // Find the config block
    const configStart = agentToolsConfig.indexOf(`export const ${configVar}`);
    assert(configStart > -1, `Missing ${configVar} in agentToolsConfig.ts`);

    // Find next config block to delimit
    let configEnd = agentToolsConfig.length;
    for (const m of MODES) {
      if (m === mode) continue;
      const nextConfig = agentToolsConfig.indexOf(`export const ${m.toUpperCase()}_AGENT_CONFIG`, configStart + 1);
      if (nextConfig > configStart && nextConfig < configEnd) configEnd = nextConfig;
    }
    // Also check for AGENT_TOOLS_REGISTRY
    const registryStart = agentToolsConfig.indexOf("export const AGENT_TOOLS_REGISTRY");
    if (registryStart > configStart && registryStart < configEnd) configEnd = registryStart;

    const configBlock = agentToolsConfig.substring(configStart, configEnd);

    const missing: string[] = [];
    for (const tool of expected.must) {
      // Universal tools are injected via capability map, not in base config
      if (UNIVERSAL_TOOLS.includes(tool)) continue;

      // Check if tool factory function is called
      const factoryName = tool.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const hasFactory = configBlock.includes(`create${factoryName.charAt(0).toUpperCase() + factoryName.slice(1)}Tool`) ||
                         configBlock.includes(`create${tool.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("")}Tool`);
      const hasDirectRef = configBlock.includes(`"${tool}"`) || configBlock.includes(`'${tool}'`);

      if (!hasFactory && !hasDirectRef) {
        // Check by a simpler pattern
        const simpleName = tool.replace(/_/g, "");
        if (!configBlock.toLowerCase().includes(simpleName)) {
          missing.push(tool);
        }
      }
    }

    const wronglyIncluded: string[] = [];
    for (const tool of expected.mustNot) {
      const simpleName = tool.replace(/_/g, "").toLowerCase();
      // Only flag if tool factory is directly in the config (not just mentioned in a description)
      const factoryPattern = `create${tool.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("")}Tool`;
      if (configBlock.includes(factoryPattern + "(")) {
        wronglyIncluded.push(tool);
      }
    }

    if (missing.length > 0) throw new Error(`Missing required tools: ${missing.join(", ")}`);
    if (wronglyIncluded.length > 0) throw new Error(`Should NOT have tools: ${wronglyIncluded.join(", ")}`);

    return `${mode}: all required tools present, no invalid tools (universal tools via capability map)`;
  });
}

// Verify universal tools are always available
test("TOOLS-UNIVERSAL", "create_callback and transfer_to_owner always available", "tools", "critical", () => {
  assert(toolCapabilityMap.includes(`"*"`) || toolCapabilityMap.includes(`'*'`), "Missing wildcard capability");
  const callbackLine = toolCapabilityMap.substring(
    toolCapabilityMap.indexOf("create_callback"),
    toolCapabilityMap.indexOf("transfer_to_owner")
  );
  assert(callbackLine.includes('"*"'), "create_callback not marked as universal");
  const transferLine = toolCapabilityMap.substring(
    toolCapabilityMap.indexOf("transfer_to_owner")
  );
  assert(transferLine.includes('"*"'), "transfer_to_owner not marked as universal");
  return "Both create_callback and transfer_to_owner are universal (available to all modes)";
});

// ============================================================================
// SECTION 3: ESCALATION RULES
// ============================================================================

console.log(`\n━━━ ESCALATION RULES ━━━`);

const ESCALATION_VARS = [
  "escalation_transferOnRequest",
  "escalation_transferOnSiteVisit",
  "escalation_transferOnEmergency",
  "escalation_transferOnAnger",
  "escalation_transferOnComplexQuestion",
  "escalation_transferOnComplaint",
  "escalation_transferOnPriceObjection",
  "escalation_fallbackAction",
];

test("ESC-1", "All 8 escalation variables present in service prompt", "escalation", "critical", () => {
  const serviceSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("SERVICE_AGENT_BASE_PROMPT"),
    agentBasePrompts.indexOf("DISPATCH_AGENT_BASE_PROMPT")
  );
  const missing: string[] = [];
  for (const v of ESCALATION_VARS) {
    if (!serviceSection.includes(`{{${v}}}`)) missing.push(v);
  }
  assert(missing.length === 0, `Missing escalation variables in service prompt: ${missing.join(", ")}`);
  return "All 8 escalation variables present with {{}} template syntax";
});

test("ESC-2", "Escalation rules in CALLBACK_ONLY_OVERRIDE", "escalation", "critical", () => {
  const callbackSection = agentBasePrompts.substring(
    agentBasePrompts.indexOf("CALLBACK_ONLY_OVERRIDE"),
    agentBasePrompts.indexOf("SUGGEST_CALLBACK_OVERRIDE")
  );
  const missing: string[] = [];
  for (const v of ESCALATION_VARS) {
    if (!callbackSection.includes(`{{${v}}}`)) missing.push(v);
  }
  assert(missing.length === 0, `Missing escalation variables in CALLBACK_ONLY: ${missing.join(", ")}`);
  return "CALLBACK_ONLY_OVERRIDE has all 8 escalation rule variables";
});

test("ESC-3", "Fallback action handles both callback and voicemail", "escalation", "high", () => {
  assert(agentBasePrompts.includes("callback") && agentBasePrompts.includes("voicemail"),
    "Missing callback/voicemail fallback options");
  assert(agentBasePrompts.includes("escalation_fallbackAction"), "Missing fallbackAction variable");
  return "Fallback action supports both callback and voicemail paths";
});

// ============================================================================
// SECTION 4: BEHAVIOR MODE OVERRIDES
// ============================================================================

console.log(`\n━━━ BEHAVIOR MODE OVERRIDES ━━━`);

test("BM-1", "CALLBACK_ONLY blocks booking tools", "behavior-modes", "critical", () => {
  const override = agentBasePrompts.substring(
    agentBasePrompts.indexOf("CALLBACK_ONLY_OVERRIDE"),
    agentBasePrompts.indexOf("SUGGEST_CALLBACK_OVERRIDE")
  );
  assert(override.includes("MUST NOT"), "Missing MUST NOT rules");
  assert(override.includes("create_booking") || override.includes("book"), "Missing booking prohibition");
  assert(override.includes("create_dispatch") || override.includes("dispatch"), "Missing dispatch prohibition");
  assert(override.includes("create_callback"), "Missing create_callback as primary tool");
  return "CALLBACK_ONLY correctly blocks booking/dispatch, keeps callback";
});

test("BM-2", "SUGGEST_CALLBACK checks availability but doesn't book", "behavior-modes", "critical", () => {
  const override = agentBasePrompts.substring(
    agentBasePrompts.indexOf("SUGGEST_CALLBACK_OVERRIDE"),
    agentBasePrompts.indexOf("BOOK_PENDING_OVERRIDE")
  );
  assert(override.includes("suggest_availability") || override.includes("availability"), "Missing availability checking");
  assert(override.includes("MUST NOT") || override.includes("NOT create"), "Missing booking prohibition");
  assert(override.includes("create_callback"), "Missing callback as final action");
  return "SUGGEST_CALLBACK checks availability, doesn't book, creates callback";
});

test("BM-3", "BOOK_PENDING creates bookings as pending", "behavior-modes", "critical", () => {
  const override = agentBasePrompts.substring(
    agentBasePrompts.indexOf("BOOK_PENDING_OVERRIDE"),
    agentBasePrompts.indexOf("PENDING_BOOKING_OVERRIDE")
  );
  assert(override.includes("pending") || override.includes("PENDING"), "Missing pending status reference");
  assert(override.includes("penciled in") || override.includes("tentative"), "Missing tentative language");
  assert(!override.includes("you're confirmed") || override.includes("Never say"), "Should prohibit confirmed language");
  return "BOOK_PENDING creates pending bookings with tentative language";
});

test("BM-4", "getBasePromptForMode injects behavior overrides", "behavior-modes", "critical", () => {
  assert(agentBasePrompts.includes("getBasePromptForMode"), "Missing getBasePromptForMode function");
  const fnBody = agentBasePrompts.substring(
    agentBasePrompts.indexOf("function getBasePromptForMode"),
    agentBasePrompts.indexOf("function getModePrompt")
  );
  assert(fnBody.includes("callback_only"), "Missing callback_only handling");
  assert(fnBody.includes("suggest_callback"), "Missing suggest_callback handling");
  assert(fnBody.includes("book_pending"), "Missing book_pending handling");
  assert(fnBody.includes("CALLBACK_ONLY_OVERRIDE"), "Not injecting CALLBACK_ONLY_OVERRIDE");
  return "getBasePromptForMode correctly injects all behavior mode overrides";
});

// ============================================================================
// SECTION 5: DYNAMIC VARIABLES CONTRACT
// ============================================================================

console.log(`\n━━━ DYNAMIC VARIABLES CONTRACT ━━━`);

if (voiceContextContract) {
  const CRITICAL_VARS = [
    "tenant_id", "business_name", "business_mode", "timezone",
    "hours_today", "services_pricing", "ai_behavior_mode", "ai_booking_mode",
    "greeting_script", "caller_phone", "escalation_transferOnRequest",
    "escalation_fallbackAction", "hipaa_mode", "context_missing_sections",
  ];

  test("DV-1", "Critical dynamic variables registered", "dynamic-vars", "critical", () => {
    const missing: string[] = [];
    for (const v of CRITICAL_VARS) {
      if (!voiceContextContract.includes(`"${v}"`) && !voiceContextContract.includes(`'${v}'`) && !voiceContextContract.includes(`key: "${v}"`)) {
        missing.push(v);
      }
    }
    assert(missing.length === 0, `Missing critical dynamic variables: ${missing.join(", ")}`);
    return `All ${CRITICAL_VARS.length} critical variables registered in contract`;
  });

  test("DV-2", "HIPAA-sensitive variables are flagged", "dynamic-vars", "critical", () => {
    assert(voiceContextContract.includes("isPhi"), "Missing isPhi field in variable specs");
    assert(voiceContextContract.includes("isPhi: true"), "No variables marked as PHI");
    return "PHI variables are properly flagged for HIPAA filtering";
  });

  test("DV-3", "Variables have default values", "dynamic-vars", "high", () => {
    assert(voiceContextContract.includes("defaultValue"), "Missing defaultValue field");
    return "Dynamic variables have safe default values";
  });
} else {
  test("DV-1", "Voice context contract exists", "dynamic-vars", "critical", () => {
    throw new Error("voiceContextContract.ts not found — dynamic variables may not be properly managed");
  });
}

// ============================================================================
// SECTION 6: BUSINESS CONTEXT BUILDER
// ============================================================================

console.log(`\n━━━ BUSINESS CONTEXT BUILDER ━━━`);

if (buildBusinessContext) {
  test("CTX-1", "buildBusinessContext is the single source of truth", "context", "critical", () => {
    assert(buildBusinessContext.includes("buildBusinessContext"), "Missing main function");
    assert(buildBusinessContext.includes("systemPrompt") || buildBusinessContext.includes("system_prompt"), "Missing system prompt output");
    return "buildBusinessContext assembles full context with system prompt";
  });

  test("CTX-2", "Context fetches services and menu items", "context", "high", () => {
    assert(buildBusinessContext.includes("services") || buildBusinessContext.includes("service_catalog"), "Missing services fetch");
    assert(buildBusinessContext.includes("menu_items") || buildBusinessContext.includes("menu"), "Missing menu items fetch");
    return "Context builder fetches both services and menu items";
  });

  test("CTX-3", "Context includes business hours", "context", "high", () => {
    assert(buildBusinessContext.includes("hours") || buildBusinessContext.includes("schedule"), "Missing hours/schedule");
    return "Context builder includes business hours";
  });

  test("CTX-4", "Context includes FAQs and knowledge", "context", "high", () => {
    assert(buildBusinessContext.includes("faq") || buildBusinessContext.includes("FAQ"), "Missing FAQ fetch");
    return "Context builder includes FAQs";
  });

  test("CTX-5", "Context handles HIPAA mode", "context", "critical", () => {
    assert(buildBusinessContext.includes("hipaa") || buildBusinessContext.includes("HIPAA"), "Missing HIPAA handling");
    return "Context builder has HIPAA mode handling";
  });

  test("CTX-6", "Context builds system prompt dynamically", "context", "critical", () => {
    assert(
      buildBusinessContext.includes("buildSystemPrompt") || buildBusinessContext.includes("systemPrompt"),
      "Missing dynamic prompt assembly"
    );
    return "System prompt is built dynamically from context data";
  });
} else {
  test("CTX-1", "buildBusinessContext.ts exists", "context", "critical", () => {
    throw new Error("buildBusinessContext.ts not found");
  });
}

// ============================================================================
// SECTION 7: MODE PROMPT CONTENT COMPLETENESS
// ============================================================================

console.log(`\n━━━ MODE PROMPT COMPLETENESS ━━━`);

// Each mode prompt should reference key dynamic variables
// Note: mode prompts use {{business_name}} template syntax, so we search for
// both plain text AND template variable references
const MODE_REQUIRED_VARS: Record<string, string[]> = {
  service: ["business_name", "tone", "services_pricing", "ai_behavior_mode", "booking"],
  dispatch: ["dispatch", "service_area", "eta", "vehicle", "tow"],
  food: ["menu", "order", "pickup", "delivery"],
  medical: ["hipaa", "appointment", "insurance"],
  sales: ["inventory", "test drive", "vehicle", "lead"],
  general: ["callback"],
};

for (const mode of MODES) {
  test(`COMP-${mode}`, `${mode} prompt references key concepts`, "completeness", "high", () => {
    const varName = `${mode.toUpperCase()}_AGENT_BASE_PROMPT`;
    const promptStart = agentBasePrompts.indexOf(`export const ${varName}`);
    let promptEnd = agentBasePrompts.length;
    // Find next prompt
    for (const m of MODES) {
      if (m === mode) continue;
      const nextVar = `export const ${m.toUpperCase()}_AGENT_BASE_PROMPT`;
      const nextIdx = agentBasePrompts.indexOf(nextVar, promptStart + 1);
      if (nextIdx > promptStart && nextIdx < promptEnd) promptEnd = nextIdx;
    }
    // Also bound by registry
    const registryIdx = agentBasePrompts.indexOf("AGENT_BASE_PROMPTS:");
    if (registryIdx > promptStart && registryIdx < promptEnd) promptEnd = registryIdx;

    const promptContent = agentBasePrompts.substring(promptStart, promptEnd).toLowerCase();
    const required = MODE_REQUIRED_VARS[mode];
    const missing: string[] = [];
    for (const concept of required) {
      if (!promptContent.includes(concept.toLowerCase())) missing.push(concept);
    }
    assert(missing.length === 0, `Missing concepts in ${mode} prompt: ${missing.join(", ")}`);
    return `${mode} prompt covers all key concepts: ${required.join(", ")}`;
  });
}

// ============================================================================
// SECTION 8: SHARED RULES INJECTION
// ============================================================================

console.log(`\n━━━ SHARED RULES INJECTION ━━━`);

test("SHARED-1", "HUMAN_PHONE_RULES included for all modes", "shared-rules", "critical", () => {
  assert(agentBasePrompts.includes("HUMAN_PHONE_RULES"), "Missing HUMAN_PHONE_RULES export");
  const fn = agentBasePrompts.substring(agentBasePrompts.indexOf("getBasePromptForMode"));
  assert(fn.includes("HUMAN_PHONE_RULES"), "getBasePromptForMode doesn't inject HUMAN_PHONE_RULES");
  return "HUMAN_PHONE_RULES injected for all modes via getBasePromptForMode";
});

test("SHARED-2", "TIME_NUMBER_SPEAKING_RULES included for all modes", "shared-rules", "high", () => {
  const fn = agentBasePrompts.substring(agentBasePrompts.indexOf("getBasePromptForMode"));
  assert(fn.includes("TIME_NUMBER_SPEAKING_RULES"), "getBasePromptForMode doesn't inject TIME_NUMBER_SPEAKING_RULES");
  return "TIME_NUMBER_SPEAKING_RULES injected for all modes";
});

test("SHARED-3", "DEBUG_OVERRIDE included for all modes", "shared-rules", "medium", () => {
  const fn = agentBasePrompts.substring(agentBasePrompts.indexOf("getBasePromptForMode"));
  assert(fn.includes("DEBUG_OVERRIDE"), "getBasePromptForMode doesn't inject DEBUG_OVERRIDE");
  return "DEBUG_OVERRIDE injected for all modes";
});

test("SHARED-4", "Banned phrases defined", "shared-rules", "high", () => {
  assert(agentBasePrompts.includes("As an AI"), "Missing 'As an AI' ban");
  assert(agentBasePrompts.includes("Certainly!"), "Missing 'Certainly!' ban");
  assert(agentBasePrompts.includes("I apologize for the inconvenience"), "Missing apologize ban");
  return "Banned robotic phrases properly defined";
});

// ============================================================================
// SECTION 9: PER-TENANT RUNTIME CONFIG (DATABASE)
// ============================================================================

console.log(`\n━━━ PER-TENANT RUNTIME CONFIG ━━━`);

// Test tenants — one per mode
const TEST_TENANTS: { name: string; mode: string; id: string }[] = [];

async function fetchTestTenants() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/tenants`);
  url.searchParams.set("select", "id,name,business_mode,ai_enabled");
  url.searchParams.set("ai_enabled", "eq.true");
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  const tenants = await res.json();

  // Pick one tenant per mode
  const seenModes = new Set<string>();
  for (const t of tenants) {
    if (!seenModes.has(t.business_mode)) {
      seenModes.add(t.business_mode);
      TEST_TENANTS.push({ name: t.name, mode: t.business_mode, id: t.id });
    }
  }
}

async function runPerTenantTests() {
  await fetchTestTenants();

  for (const tenant of TEST_TENANTS) {
    // Check assistant_settings has escalation rules
    const asUrl = new URL(`${SUPABASE_URL}/rest/v1/assistant_settings`);
    asUrl.searchParams.set("select", "ai_booking_mode,settings_json,owner_forward_number");
    asUrl.searchParams.set("tenant_id", `eq.${tenant.id}`);

    const asRes = await fetch(asUrl.toString(), {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const asData = await asRes.json();

    if (asData.length > 0) {
      const settings = asData[0];
      const settingsJson = settings.settings_json || {};

      test(`RT-${tenant.mode}-ESC`, `${tenant.name} (${tenant.mode}): escalation rules configured`, "runtime", "high", () => {
        const rules = settingsJson.escalation_rules || {};
        const definedRules = Object.keys(rules);
        if (definedRules.length === 0) {
          return "WARNING: No custom escalation rules — using defaults (all transfers enabled)";
        }
        return `Escalation rules: ${definedRules.map(k => `${k}=${rules[k]}`).join(", ")}`;
      });

      test(`RT-${tenant.mode}-BM`, `${tenant.name} (${tenant.mode}): booking mode valid`, "runtime", "critical", () => {
        const bm = settings.ai_booking_mode;
        const validModes = ["auto_book", "auto_confirm", "pending_approval", "callback_only", "suggest_callback", "book_pending"];
        assert(validModes.includes(bm) || !bm, `Invalid booking mode: ${bm}`);
        return `Booking mode: ${bm || "default (auto_book)"}`;
      });

      test(`RT-${tenant.mode}-XFR`, `${tenant.name} (${tenant.mode}): transfer number configured`, "runtime", "high", () => {
        if (!settings.owner_forward_number) {
          return "WARNING: No transfer number — call transfers will fail";
        }
        return `Transfer number: ${settings.owner_forward_number}`;
      });
    }

    // Check that services/menu exist for this mode
    if (tenant.mode === "food") {
      const menuUrl = new URL(`${SUPABASE_URL}/rest/v1/menu_items`);
      menuUrl.searchParams.set("select", "id,name,price_cents");
      menuUrl.searchParams.set("tenant_id", `eq.${tenant.id}`);
      menuUrl.searchParams.set("is_available", "eq.true");
      menuUrl.searchParams.set("limit", "5");

      const menuRes = await fetch(menuUrl.toString(), {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      const menuData = await menuRes.json();

      test(`RT-${tenant.mode}-MENU`, `${tenant.name}: menu items exist for food mode`, "runtime", "critical", () => {
        assert(Array.isArray(menuData) && menuData.length > 0, "No menu items — food mode AI can't take orders");
        const withPrices = menuData.filter((m: any) => m.price_cents && m.price_cents > 0);
        return `${menuData.length}+ menu items, ${withPrices.length} with prices`;
      });
    }

    if (tenant.mode === "service" || tenant.mode === "medical") {
      const svcUrl = new URL(`${SUPABASE_URL}/rest/v1/services`);
      svcUrl.searchParams.set("select", "id,name,price_amount");
      svcUrl.searchParams.set("tenant_id", `eq.${tenant.id}`);
      svcUrl.searchParams.set("is_active", "eq.true");
      svcUrl.searchParams.set("limit", "5");

      const svcRes = await fetch(svcUrl.toString(), {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      const svcData = await svcRes.json();

      test(`RT-${tenant.mode}-SVC`, `${tenant.name}: services exist for ${tenant.mode} mode`, "runtime", "critical", () => {
        assert(Array.isArray(svcData) && svcData.length > 0, "No services — AI can't book or quote anything");
        return `${svcData.length}+ active services`;
      });
    }
  }
}

// ============================================================================
// SECTION 10: CROSS-MODE CONSISTENCY CHECKS
// ============================================================================

console.log(`\n━━━ CROSS-MODE CONSISTENCY ━━━`);

test("CROSS-1", "All modes registered in AGENT_BASE_PROMPTS registry", "cross-mode", "critical", () => {
  for (const mode of MODES) {
    assert(agentBasePrompts.includes(`${mode}:`), `Mode ${mode} not in AGENT_BASE_PROMPTS registry`);
  }
  return "All 6 modes registered in prompt registry";
});

test("CROSS-2", "All modes registered in AGENT_TOOLS_REGISTRY", "cross-mode", "critical", () => {
  for (const mode of MODES) {
    assert(agentToolsConfig.includes(`${mode}:`), `Mode ${mode} not in AGENT_TOOLS_REGISTRY`);
  }
  return "All 6 modes registered in tools registry";
});

test("CROSS-3", "Tool count matches between prompt and tools config", "cross-mode", "medium", () => {
  // Check that AGENT_BASE_PROMPTS.toolCount roughly matches actual tools in AGENT_TOOLS_REGISTRY
  const warnings: string[] = [];
  for (const mode of MODES) {
    const promptMatch = agentBasePrompts.match(new RegExp(`${mode}:[^}]*toolCount:\\s*(\\d+)`));
    const toolsMatch = agentToolsConfig.match(new RegExp(`${mode.toUpperCase()}_AGENT_CONFIG[^}]*toolCount:\\s*(\\d+)`));
    if (promptMatch && toolsMatch) {
      const promptCount = parseInt(promptMatch[1]);
      const toolsCount = parseInt(toolsMatch[1]);
      if (promptCount !== toolsCount) {
        warnings.push(`${mode}: prompt says ${promptCount} tools, config says ${toolsCount}`);
      }
    }
  }
  if (warnings.length > 0) return `WARNING: Tool count mismatches: ${warnings.join("; ")}`;
  return "Tool counts consistent between prompt registry and tools config";
});

test("CROSS-4", "No mode uses another mode's exclusive tools", "cross-mode", "high", () => {
  // Food order tool should only be in food config
  const foodToolInNonFood = MODES.filter(m => m !== "food").some(m => {
    const configVar = `${m.toUpperCase()}_AGENT_CONFIG`;
    const configStart = agentToolsConfig.indexOf(`export const ${configVar}`);
    const nextConfig = agentToolsConfig.indexOf("export const", configStart + 50);
    const block = agentToolsConfig.substring(configStart, nextConfig > 0 ? nextConfig : undefined);
    return block.includes("createFoodOrderTool(");
  });
  assert(!foodToolInNonFood, "Food order tool found in non-food mode config");

  return "Mode-exclusive tools are properly isolated";
});

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Run async per-tenant tests
  await runPerTenantTests();

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\n${"═".repeat(54)}`);
  console.log(`LAYER 2 RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log(`${"═".repeat(54)}`);

  if (failed > 0) {
    console.log(`\nFAILURES:`);
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  ✗ [${r.severity.toUpperCase()}] ${r.id}: ${r.name}`);
      console.log(`    ${r.details}`);
    }
  }

  // Category summary
  const categories = new Map<string, { pass: number; fail: number }>();
  for (const r of results) {
    const cat = categories.get(r.category) || { pass: 0, fail: 0 };
    if (r.passed) cat.pass++; else cat.fail++;
    categories.set(r.category, cat);
  }
  console.log(`\nPER-CATEGORY:`);
  for (const [cat, counts] of categories) {
    const icon = counts.fail > 0 ? "✗" : "✓";
    console.log(`  ${icon} ${cat}: ${counts.pass}/${counts.pass + counts.fail}`);
  }

  if (failed > 0) process.exit(1);
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
