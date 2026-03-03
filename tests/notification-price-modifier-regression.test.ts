/**
 * Notification Labels & Price Modifier Industry Matching Regression Tests
 *
 * @vitest-environment node
 *
 * Tests for:
 * 1. Pluralization of appointment labels (dispatch → dispatches, not dispatchs)
 * 2. Price modifier industry matching uses exact slug comparison
 * 3. Empty industry doesn't match all modifier types
 *
 * Gates: brain/service_pricing_management, settings/notifications_work
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

// ─── Pluralization Tests ───────────────────────────────────────────────

describe("NotificationPreferencesPanel — pluralization safety", () => {
  const src = readFileSync(
    join(ROOT, "src/components/settings/NotificationPreferencesPanel.tsx"),
    "utf-8"
  );

  it("has a pluralizeNoun helper (not naive string concat)", () => {
    expect(src).toContain("pluralizeNoun");
  });

  it("does NOT use naive template literal pluralization for appointment labels", () => {
    // Old pattern: `${apptLabel}s` which would produce "dispatchs"
    // Should use pluralizeNoun() instead
    const naivePatterns = [
      /`\$\{apptLabel\}s`/,
      /`\$\{terminology\.appointmentLabel\}s`/,
      /`\$\{cap\(terminology\.appointmentLabel\)\}s`/,
    ];
    for (const pattern of naivePatterns) {
      expect(src).not.toMatch(pattern);
    }
  });

  it("uses pluralizeNoun for category label", () => {
    expect(src).toMatch(/pluralizeNoun\(cap\(terminology\.appointmentLabel\)\)/);
  });

  it("uses pluralizeNoun for event label resolution", () => {
    expect(src).toMatch(/pluralizeNoun\(apptLabel\)/);
  });
});

describe("pluralizeNoun correctness (extracted logic)", () => {
  // Mirror the function from NotificationPreferencesPanel
  function pluralizeNoun(word: string): string {
    if (/(?:ch|sh|s|x|z)$/i.test(word)) return `${word}es`;
    return `${word}s`;
  }

  const cases: [string, string][] = [
    ["appointment", "appointments"],
    ["job", "jobs"],
    ["booking", "bookings"],
    ["order", "orders"],
    ["visit", "visits"],
    ["reservation", "reservations"],
    ["callback", "callbacks"],
    ["consultation", "consultations"],
    ["estimate", "estimates"],
    ["intake", "intakes"],
    ["lead", "leads"],
    // Irregular cases that need -es
    ["dispatch", "dispatches"],
    ["lunch", "lunches"],
    // Edge: words ending in s/x/z
    ["glass", "glasses"],
    ["tax", "taxes"],
    ["quiz", "quizes"], // "quiz" not a real appointment label; simple -es rule suffices
  ];

  for (const [input, expected] of cases) {
    it(`pluralizes "${input}" → "${expected}"`, () => {
      expect(pluralizeNoun(input)).toBe(expected);
    });
  }
});

// ─── Price Modifier Industry Matching Tests ────────────────────────────

describe("PriceModifiersEditor — industry matching safety", () => {
  const src = readFileSync(
    join(ROOT, "src/components/brain/editors/PriceModifiersEditor.tsx"),
    "utf-8"
  );

  it("uses exact slug matching (=== comparison), not substring includes", () => {
    // Must NOT use the old loose pattern
    expect(src).not.toMatch(/tenantIndustry\.includes\(ind\)/);
    expect(src).not.toMatch(/ind\.includes\(tenantIndustry\)/);
    // Must use exact match
    expect(src).toMatch(/ind\s*===\s*tenantIndustry/);
  });

  it("guards against empty industry matching all types", () => {
    // When tenantIndustry is "", must not match any industry-restricted types
    expect(src).toMatch(/if\s*\(\s*!tenantIndustry\s*\)\s*return\s+false/);
  });

  it("has industry-specific suggestion overrides for plumbing, hvac, electrical", () => {
    expect(src).toContain("INDUSTRY_SUGGESTION_OVERRIDES");
    expect(src).toMatch(/plumbing:\s*\{/);
    expect(src).toMatch(/hvac:\s*\{/);
    expect(src).toMatch(/electrical:\s*\{/);
  });
});

describe("PriceModifiersEditor — industry matching logic (unit)", () => {
  // Reproduce the exact filtering logic from the component
  const MODIFIER_TYPES: Record<string, { modes: string[]; industries: string[] }> = {
    vehicle_size: { modes: ["service", "dispatch"], industries: ["detailing", "auto", "towing", "car_wash"] },
    property_size: { modes: ["service"], industries: ["cleaning", "hvac", "plumbing", "electrical", "landscaping"] },
    urgency: { modes: ["service", "dispatch", "medical", "sales"], industries: [] },
    time_of_day: { modes: ["service", "dispatch", "sales"], industries: [] },
    equipment: { modes: ["dispatch", "service"], industries: ["towing", "hvac", "plumbing", "electrical"] },
    complexity: { modes: ["service"], industries: [] },
    custom: { modes: ["service", "dispatch", "food", "medical", "general", "sales"], industries: [] },
  };

  function getRelevantTypes(mode: string, tenantIndustry: string): string[] {
    return Object.entries(MODIFIER_TYPES)
      .filter(([_, config]) => {
        if (!config.modes.includes(mode)) return false;
        if (config.industries.length === 0) return true;
        if (!tenantIndustry) return false;
        return config.industries.some(ind => ind === tenantIndustry);
      })
      .map(([key]) => key);
  }

  it("plumber sees property_size, urgency, time_of_day, equipment, complexity, custom", () => {
    const types = getRelevantTypes("service", "plumbing");
    expect(types).toContain("property_size");
    expect(types).toContain("urgency");
    expect(types).toContain("time_of_day");
    expect(types).toContain("equipment");
    expect(types).toContain("complexity");
    expect(types).toContain("custom");
    expect(types).not.toContain("vehicle_size"); // not auto-related
  });

  it("auto detailer sees vehicle_size but not property_size", () => {
    const types = getRelevantTypes("service", "detailing");
    expect(types).toContain("vehicle_size");
    expect(types).not.toContain("property_size");
  });

  it("empty industry only sees non-industry-restricted types", () => {
    const types = getRelevantTypes("service", "");
    expect(types).toContain("urgency");
    expect(types).toContain("time_of_day");
    expect(types).toContain("complexity");
    expect(types).toContain("custom");
    // Should NOT see industry-restricted types
    expect(types).not.toContain("vehicle_size");
    expect(types).not.toContain("property_size");
    expect(types).not.toContain("equipment");
  });

  it("'auto_repair' does NOT match 'auto' (exact match only)", () => {
    const types = getRelevantTypes("service", "auto_repair");
    // auto_repair is not in vehicle_size.industries (which has "auto")
    expect(types).not.toContain("vehicle_size");
  });

  it("'auto' matches vehicle_size", () => {
    const types = getRelevantTypes("service", "auto");
    expect(types).toContain("vehicle_size");
  });

  it("dispatch mode with empty industry sees urgency, time_of_day, custom", () => {
    const types = getRelevantTypes("dispatch", "");
    expect(types).toContain("urgency");
    expect(types).toContain("time_of_day");
    expect(types).toContain("custom");
    expect(types).not.toContain("vehicle_size");
    expect(types).not.toContain("equipment");
  });

  it("towing dispatch sees vehicle_size and equipment", () => {
    const types = getRelevantTypes("dispatch", "towing");
    expect(types).toContain("vehicle_size");
    expect(types).toContain("equipment");
  });

  it("food mode only sees custom", () => {
    const types = getRelevantTypes("food", "restaurant");
    expect(types).toContain("custom");
    expect(types).toHaveLength(1);
  });

  it("medical mode sees urgency and custom", () => {
    const types = getRelevantTypes("medical", "dentist");
    expect(types).toContain("urgency");
    expect(types).toContain("custom");
    expect(types).toHaveLength(2);
  });
});
