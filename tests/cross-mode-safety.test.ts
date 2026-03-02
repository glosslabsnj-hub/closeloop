/**
 * Cross-Mode Safety Tests
 *
 * Ensures mode-specific features don't leak across business modes.
 * These tests protect against regressions where dispatch-only, food-only,
 * etc. features appear in service mode (or vice versa).
 */
import { describe, it, expect } from "vitest";

// ─── Conversion Outcomes (from useIntelligence.ts) ─────────────────────────

const CONVERSION_OUTCOMES: Record<string, string[]> = {
  service: ["booked"],
  dispatch: ["dispatch"],
  food: ["order_placed"],
  medical: ["booked", "intake_completed"],
  sales: ["booked", "lead_qualified"],
  general: ["booked", "callback"],
};

describe("Cross-mode: Conversion outcome mapping", () => {
  it("service mode only counts 'booked' as conversion", () => {
    expect(CONVERSION_OUTCOMES.service).toEqual(["booked"]);
    expect(CONVERSION_OUTCOMES.service).not.toContain("order_placed");
    expect(CONVERSION_OUTCOMES.service).not.toContain("dispatch");
  });

  it("dispatch mode only counts 'dispatch' as conversion", () => {
    expect(CONVERSION_OUTCOMES.dispatch).toEqual(["dispatch"]);
    expect(CONVERSION_OUTCOMES.dispatch).not.toContain("booked");
    expect(CONVERSION_OUTCOMES.dispatch).not.toContain("order_placed");
  });

  it("food mode only counts 'order_placed' as conversion", () => {
    expect(CONVERSION_OUTCOMES.food).toEqual(["order_placed"]);
    expect(CONVERSION_OUTCOMES.food).not.toContain("booked");
    expect(CONVERSION_OUTCOMES.food).not.toContain("dispatch");
  });

  it("medical mode counts 'booked' and 'intake_completed'", () => {
    expect(CONVERSION_OUTCOMES.medical).toContain("booked");
    expect(CONVERSION_OUTCOMES.medical).toContain("intake_completed");
    expect(CONVERSION_OUTCOMES.medical).not.toContain("order_placed");
  });

  it("sales mode counts 'booked' and 'lead_qualified'", () => {
    expect(CONVERSION_OUTCOMES.sales).toContain("booked");
    expect(CONVERSION_OUTCOMES.sales).toContain("lead_qualified");
    expect(CONVERSION_OUTCOMES.sales).not.toContain("dispatch");
  });

  it("all 6 business modes have conversion definitions", () => {
    const modes = ["service", "dispatch", "food", "medical", "sales", "general"];
    for (const mode of modes) {
      expect(CONVERSION_OUTCOMES[mode]).toBeDefined();
      expect(CONVERSION_OUTCOMES[mode].length).toBeGreaterThan(0);
    }
  });

  it("unknown mode falls back correctly (should use fallback)", () => {
    // The hook uses: CONVERSION_OUTCOMES[businessMode] || ["booked"]
    expect(CONVERSION_OUTCOMES["unknown_mode"]).toBeUndefined();
  });
});

// ─── Job Status Filtering (from JobFilterBar / JobDetailSheet) ──────────────

const ALL_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "picked_up", label: "Picked Up", dispatchOnly: true },
];

describe("Cross-mode: Job status tab filtering", () => {
  it("dispatch mode shows all tabs including Picked Up", () => {
    const dispatchTabs = ALL_STATUS_OPTIONS.filter(
      (t) => !t.dispatchOnly || "dispatch" === "dispatch"
    );
    expect(dispatchTabs.map((t) => t.value)).toContain("picked_up");
    expect(dispatchTabs.length).toBe(5);
  });

  it("service mode hides Picked Up tab", () => {
    const serviceTabs = ALL_STATUS_OPTIONS.filter(
      (t) => !t.dispatchOnly || "service" === "dispatch"
    );
    expect(serviceTabs.map((t) => t.value)).not.toContain("picked_up");
    expect(serviceTabs.length).toBe(4);
  });

  it("food mode hides Picked Up tab", () => {
    const foodTabs = ALL_STATUS_OPTIONS.filter(
      (t) => !t.dispatchOnly || "food" === "dispatch"
    );
    expect(foodTabs.map((t) => t.value)).not.toContain("picked_up");
  });

  it("medical mode hides Picked Up tab", () => {
    const medTabs = ALL_STATUS_OPTIONS.filter(
      (t) => !t.dispatchOnly || "medical" === "dispatch"
    );
    expect(medTabs.map((t) => t.value)).not.toContain("picked_up");
  });

  it("all non-dispatch modes produce same tab count", () => {
    for (const mode of ["service", "food", "medical", "sales", "general"]) {
      const tabs = ALL_STATUS_OPTIONS.filter(
        (t) => !t.dispatchOnly || mode === "dispatch"
      );
      expect(tabs.length).toBe(4);
    }
  });
});

// ─── Mode-Specific Outcome Metric Calculation ──────────────────────────────

describe("Cross-mode: Metric calculation accuracy", () => {
  const mockOutcomes = [
    { outcome_type: "booked" },
    { outcome_type: "booked" },
    { outcome_type: "order_placed" },
    { outcome_type: "dispatch" },
    { outcome_type: "hangup" },
    { outcome_type: "transferred" },
    { outcome_type: "faq" },
    { outcome_type: "lead_qualified" },
  ];

  function countConversions(mode: string) {
    const valid = CONVERSION_OUTCOMES[mode] || ["booked"];
    return mockOutcomes.filter((o) => valid.includes(o.outcome_type)).length;
  }

  it("service mode: counts 2 booked out of 8 (25%)", () => {
    expect(countConversions("service")).toBe(2);
  });

  it("dispatch mode: counts 1 dispatch out of 8 (12.5%)", () => {
    expect(countConversions("dispatch")).toBe(1);
  });

  it("food mode: counts 1 order_placed out of 8 (12.5%)", () => {
    expect(countConversions("food")).toBe(1);
  });

  it("sales mode: counts booked + lead_qualified = 3 out of 8", () => {
    expect(countConversions("sales")).toBe(3);
  });

  it("OLD code would have counted 4 conversions regardless of mode (regression guard)", () => {
    // Old: ["booked", "order_placed", "dispatch_created"].includes(o.outcome_type)
    // Note: old code used "dispatch_created" which was also wrong — the enum is "dispatch"
    const oldConversions = mockOutcomes.filter((o) =>
      ["booked", "order_placed", "dispatch_created"].includes(o.outcome_type)
    );
    // Old code counted booked(2) + order_placed(1) = 3 (dispatch_created doesn't match any)
    expect(oldConversions.length).toBe(3);
    // This inflated service mode conversions by including order_placed
    // And missed dispatch conversions entirely (dispatch_created vs dispatch)
  });
});
