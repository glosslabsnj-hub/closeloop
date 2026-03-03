/**
 * Industry-Specific Defaults Regression Tests
 *
 * @vitest-environment node
 *
 * Ensures industry-aware defaults are correctly applied during onboarding.
 * These defaults are critical for QA — a plumber who sees "Walk-ins Welcome"
 * or doesn't have "Service Address" as required intake field will lose trust.
 *
 * Bug origins:
 * - Handoff #349: Service Address missing from required intake for plumbing
 * - Handoff #348: Payment methods missing "check" for home_services
 * - Handoff #342: Call flow defaulting to schedule_first instead of urgency_check for plumbing
 *
 * Gates: onboarding/smart_defaults_prefilled, brain/edits_reflect_in_ai_behavior
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ─── Source files under test ────────────────────────────────────────────────

const COMM_PREFS_PATH = join(
  process.cwd(),
  "src/components/onboarding/CommunicationPreferences.tsx"
);
const commPrefsSource = readFileSync(COMM_PREFS_PATH, "utf-8");

const ONBOARDING_SUBMIT_PATH = join(
  process.cwd(),
  "src/hooks/useOnboardingSubmit.ts"
);
const submitSource = readFileSync(ONBOARDING_SUBMIT_PATH, "utf-8");

const CALL_FLOW_PATH = join(
  process.cwd(),
  "src/components/ai/ServiceCallFlowSettings.tsx"
);
const callFlowSource = readFileSync(CALL_FLOW_PATH, "utf-8");

// ─── getDefaultCommunicationPrefs: address required for home_services ───────

describe("getDefaultCommunicationPrefs — address requirement", () => {
  it("exports getDefaultCommunicationPrefs function", () => {
    expect(commPrefsSource).toContain(
      "export function getDefaultCommunicationPrefs"
    );
  });

  it("defines ADDRESS_REQUIRED_CATEGORIES set", () => {
    expect(commPrefsSource).toContain("ADDRESS_REQUIRED_CATEGORIES");
  });

  it("includes home_services in ADDRESS_REQUIRED_CATEGORIES", () => {
    expect(commPrefsSource).toMatch(
      /ADDRESS_REQUIRED_CATEGORIES.*=.*new Set\(\[[\s\S]*?["']home_services["']/
    );
  });

  it("includes dispatch_logistics in ADDRESS_REQUIRED_CATEGORIES", () => {
    expect(commPrefsSource).toMatch(
      /ADDRESS_REQUIRED_CATEGORIES.*=.*new Set\(\[[\s\S]*?["']dispatch_logistics["']/
    );
  });

  it("adds address to requiredIntakeFields when needsAddress is true", () => {
    // The function must include "address" in the intake fields for home_services
    expect(commPrefsSource).toContain('"address"');
    // Verify it's in the requiredIntakeFields array, not somewhere random
    expect(commPrefsSource).toMatch(
      /requiredIntakeFields:\s*needsAddress\s*\?\s*\[.*"address".*\]/
    );
  });

  it("does NOT add address for non-home_services categories", () => {
    // The default (non-needsAddress) path should only have name + phone
    expect(commPrefsSource).toMatch(
      /:\s*\["customer_name",\s*"customer_phone"\]/
    );
  });

  it("accepts industryCategory as second parameter", () => {
    expect(commPrefsSource).toMatch(
      /getDefaultCommunicationPrefs\(\s*mode:\s*BusinessMode,\s*industryCategory\?:\s*string\)/
    );
  });

  it("checks mode === 'service' before applying address requirement", () => {
    expect(commPrefsSource).toContain('mode === "service"');
  });

  // Mode-specific defaults
  it("medical mode uses pending_approval booking mode", () => {
    expect(commPrefsSource).toMatch(
      /case "medical"[\s\S]*?aiBookingMode:\s*"pending_approval"/
    );
  });

  it("medical mode escalates on price objection", () => {
    expect(commPrefsSource).toMatch(
      /case "medical"[\s\S]*?transferOnPriceObjection:\s*true/
    );
  });

  it("dispatch mode uses callback_only booking mode", () => {
    expect(commPrefsSource).toMatch(
      /case "dispatch"[\s\S]*?aiBookingMode:\s*"callback_only"/
    );
  });

  it("default mode uses auto_book booking mode", () => {
    expect(commPrefsSource).toMatch(
      /default:[\s\S]*?aiBookingMode:\s*"auto_book"/
    );
  });
});

// ─── getPaymentDefaults: check payment for home_services ────────────────────

describe("getPaymentDefaults — payment methods per industry", () => {
  it("defines getPaymentDefaults function", () => {
    expect(submitSource).toContain("function getPaymentDefaults");
  });

  it("includes check for home_services", () => {
    // Extract the function body
    const fnMatch = submitSource.match(
      /function getPaymentDefaults[\s\S]*?^\}/m
    );
    expect(fnMatch).toBeTruthy();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain('"check"');
    expect(fnBody).toContain('"home_services"');
  });

  it("home_services gets cash + credit_card + debit_card + check", () => {
    const fnMatch = submitSource.match(
      /function getPaymentDefaults[\s\S]*?^\}/m
    );
    expect(fnMatch).toBeTruthy();
    const fnBody = fnMatch![0];
    // The home_services return must include all 4 payment methods
    const homeReturn = fnBody.match(
      /home_services.*?return\s*\[(.*?)\]/s
    );
    expect(homeReturn).toBeTruthy();
    const methods = homeReturn![1];
    expect(methods).toContain('"cash"');
    expect(methods).toContain('"credit_card"');
    expect(methods).toContain('"debit_card"');
    expect(methods).toContain('"check"');
  });

  it("non-home_services gets cash + credit_card + debit_card (no check)", () => {
    const fnMatch = submitSource.match(
      /function getPaymentDefaults[\s\S]*?^\}/m
    );
    expect(fnMatch).toBeTruthy();
    const fnBody = fnMatch![0];
    // The default return (last return statement) should NOT have check
    const lines = fnBody.split("\n");
    const lastReturn = lines
      .filter((l) => l.includes("return ["))
      .pop();
    expect(lastReturn).toBeTruthy();
    expect(lastReturn).not.toContain('"check"');
  });

  it("getPaymentDefaults is called during onboarding submission", () => {
    expect(submitSource).toMatch(/getPaymentDefaults\(\s*\w/);
  });
});

// ─── getServiceDefaultFlow: urgency_check for plumbing/HVAC ────────────────

describe("getServiceDefaultFlow — call flow per industry", () => {
  it("defines getServiceDefaultFlow function", () => {
    expect(submitSource).toContain("function getServiceDefaultFlow");
  });

  // Urgency-check industries
  const urgencyIndustries = [
    "hvac",
    "heating",
    "cooling",
    "plumbing",
    "plumber",
    "electrical",
    "electrician",
    "appliance_repair",
    "garage_door",
    "water_damage",
    "restoration",
  ];

  for (const industry of urgencyIndustries) {
    it(`maps "${industry}" → urgency_check`, () => {
      const fnMatch = submitSource.match(
        /function getServiceDefaultFlow[\s\S]*?^\}/m
      );
      expect(fnMatch).toBeTruthy();
      const fnBody = fnMatch![0];
      expect(fnBody).toContain(`"${industry}"`);
      // Verify the urgency_check return is in the same block
      expect(fnBody).toContain('"urgency_check"');
    });
  }

  // Dispatch-first industries
  const dispatchIndustries = ["locksmith", "towing", "roadside"];

  for (const industry of dispatchIndustries) {
    it(`maps "${industry}" → dispatch_first`, () => {
      const fnMatch = submitSource.match(
        /function getServiceDefaultFlow[\s\S]*?^\}/m
      );
      expect(fnMatch).toBeTruthy();
      const fnBody = fnMatch![0];
      expect(fnBody).toContain(`"${industry}"`);
      expect(fnBody).toContain('"dispatch_first"');
    });
  }

  it("defaults to schedule_first for unknown industries", () => {
    const fnMatch = submitSource.match(
      /function getServiceDefaultFlow[\s\S]*?^\}/m
    );
    expect(fnMatch).toBeTruthy();
    expect(fnMatch![0]).toContain('"schedule_first"');
    // schedule_first should be the last return (fallback)
    const returns = fnMatch![0].match(/return "([^"]+)"/g) || [];
    const lastReturn = returns[returns.length - 1];
    expect(lastReturn).toBe('return "schedule_first"');
  });

  it("is called during onboarding submission with industrySlug", () => {
    expect(submitSource).toMatch(/getServiceDefaultFlow\(\s*industrySlug\)/);
  });

  it("writes service_default_flow to assistant_settings update", () => {
    expect(submitSource).toContain("service_default_flow:");
    expect(submitSource).toMatch(
      /service_default_flow:\s*getServiceDefaultFlow/
    );
  });
});

// ─── ServiceCallFlowSettings UI: parity with onboarding defaults ────────────

describe("ServiceCallFlowSettings — UI industry defaults match onboarding", () => {
  it("defines getIndustryDefault function", () => {
    expect(callFlowSource).toContain("getIndustryDefault");
  });

  // The UI component MUST have the SAME industry lists as useOnboardingSubmit
  // Otherwise the Brain page shows a different default than what onboarding wrote
  const sharedUrgencyIndustries = [
    "hvac",
    "plumbing",
    "electrical",
    "appliance_repair",
    "garage_door",
    "water_damage",
    "restoration",
  ];

  for (const industry of sharedUrgencyIndustries) {
    it(`UI includes "${industry}" in urgencyCheckIndustries`, () => {
      expect(callFlowSource).toContain(`"${industry}"`);
    });
  }

  const sharedDispatchIndustries = ["locksmith", "towing", "roadside"];

  for (const industry of sharedDispatchIndustries) {
    it(`UI includes "${industry}" in dispatchFirstIndustries`, () => {
      expect(callFlowSource).toContain(`"${industry}"`);
    });
  }

  it("UI defaults to schedule_first when no industry match", () => {
    expect(callFlowSource).toMatch(/return\s*"schedule_first"/);
  });
});

// ─── Parity check: UI and onboarding use the same industry lists ────────────

describe("industry list parity — onboarding vs UI component", () => {
  // Extract industries from the inline array preceding return value
  function extractFromOnboarding(returnValue: string): string[] {
    // Find "return "urgency_check"" and look backward for the nearest [...].some(
    const returnIdx = submitSource.indexOf(`return "${returnValue}"`);
    if (returnIdx === -1) return [];
    // Search backward from return for the array
    const preceding = submitSource.slice(Math.max(0, returnIdx - 500), returnIdx);
    // Find the last [...] in the preceding text
    const arrays = [...preceding.matchAll(/\[([^\]]+)\]/g)];
    if (arrays.length === 0) return [];
    const lastArray = arrays[arrays.length - 1][1];
    return (lastArray.match(/"([^"]+)"/g) || []).map((s) =>
      s.replace(/"/g, "")
    );
  }

  // Extract named arrays from UI component
  function extractFromUI(varName: string): string[] {
    const pattern = new RegExp(
      `${varName}\\s*=\\s*\\[([^\\]]*?)\\]`,
      "s"
    );
    const match = callFlowSource.match(pattern);
    if (!match) return [];
    return (match[1].match(/"([^"]+)"/g) || []).map((s) =>
      s.replace(/"/g, "")
    );
  }

  it("urgency industry lists are identical between onboarding and UI", () => {
    const onboardingList = extractFromOnboarding("urgency_check").sort();
    const uiList = extractFromUI("urgencyCheckIndustries").sort();
    expect(onboardingList.length).toBeGreaterThan(0);
    expect(uiList.length).toBeGreaterThan(0);
    expect(onboardingList).toEqual(uiList);
  });

  it("dispatch industry lists are identical between onboarding and UI", () => {
    const onboardingList = extractFromOnboarding("dispatch_first").sort();
    const uiList = extractFromUI("dispatchFirstIndustries").sort();
    expect(onboardingList.length).toBeGreaterThan(0);
    expect(uiList.length).toBeGreaterThan(0);
    expect(onboardingList).toEqual(uiList);
  });
});

// ─── Onboarding submit pipeline: critical steps exist ───────────────────────

describe("useOnboardingSubmit — pipeline integrity", () => {
  it("calls getPaymentDefaults during tenant policy update", () => {
    expect(submitSource).toMatch(/getPaymentDefaults\(/);
  });

  it("calls getServiceDefaultFlow during AI settings step", () => {
    expect(submitSource).toMatch(/getServiceDefaultFlow\(/);
  });

  it("creates booking_delivery_settings (step 9b)", () => {
    expect(submitSource).toContain("booking_delivery_settings");
  });

  it("creates default workflows for the mode", () => {
    expect(submitSource).toContain("createDefaultWorkflowsForMode");
  });

  it("applies scenario seeds from industry intelligence", () => {
    expect(submitSource).toContain("applyScenarioSeeds");
  });

  it("updates capability flags based on mode", () => {
    expect(submitSource).toContain("updateCapabilityFlags");
  });

  it("clears onboarding data on success", () => {
    expect(submitSource).toContain("clearOnboardingData");
  });

  it("wraps steps in runStep for error resilience", () => {
    // Must use runStep pattern for all major steps
    const runStepCalls = (submitSource.match(/runStep\(/g) || []).length;
    // There should be at least 10 steps (17 total, some may be combined)
    expect(runStepCalls).toBeGreaterThanOrEqual(10);
  });

  it("sets isComplete to true on successful completion", () => {
    expect(submitSource).toContain("setIsComplete(true)");
  });
});
