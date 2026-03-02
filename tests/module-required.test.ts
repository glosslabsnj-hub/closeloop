/**
 * Module Required Route Protection Tests
 *
 * Tests the core logic of useModuleRequired: whether a user is allowed
 * to access a route based on their enabledModules and/or mode defaults.
 *
 * Critical regression test for commit fa8a462 which fixed the /app/bookings
 * redirect bug — when capabilities_json resolution omitted a module that
 * the mode inherently includes, the route would incorrectly redirect.
 */
import { describe, it, expect } from "vitest";

// Import the actual defaultModulesByMode from the codebase
// This ensures the test stays in sync with production code
import { defaultModulesByMode } from "../src/hooks/useTenantConfig";

type BusinessMode = "service" | "dispatch" | "food" | "medical" | "general" | "sales";

/**
 * Replicates the isAllowed calculation from useModuleRequired.ts
 * This is the exact formula used in production to decide route access.
 */
function isModuleAllowed(
  requiredModules: string[],
  enabledModules: string[],
  businessMode: BusinessMode
): boolean {
  const modeDefaults = defaultModulesByMode[businessMode] || [];
  return (
    requiredModules.length === 0 ||
    requiredModules.some(
      (mod) => enabledModules.includes(mod) || modeDefaults.includes(mod)
    )
  );
}

// ─── Mode Default Module Mapping ─────────────────────────────────────────────

describe("defaultModulesByMode completeness", () => {
  const allModes: BusinessMode[] = ["service", "dispatch", "food", "medical", "general", "sales"];

  it("all 6 business modes have default modules defined", () => {
    for (const mode of allModes) {
      expect(defaultModulesByMode[mode]).toBeDefined();
      expect(defaultModulesByMode[mode].length).toBeGreaterThan(0);
    }
  });

  it("all modes include ai_voice as a base module", () => {
    for (const mode of allModes) {
      expect(defaultModulesByMode[mode]).toContain("ai_voice");
    }
  });

  it("service mode includes booking", () => {
    expect(defaultModulesByMode.service).toContain("booking");
  });

  it("dispatch mode includes dispatch_queue", () => {
    expect(defaultModulesByMode.dispatch).toContain("dispatch_queue");
  });

  it("food mode includes food_orders and menu_knowledge", () => {
    expect(defaultModulesByMode.food).toContain("food_orders");
    expect(defaultModulesByMode.food).toContain("menu_knowledge");
  });

  it("medical mode includes booking and medical_intake", () => {
    expect(defaultModulesByMode.medical).toContain("booking");
    expect(defaultModulesByMode.medical).toContain("medical_intake");
  });

  it("sales mode includes sales_leads and booking", () => {
    expect(defaultModulesByMode.sales).toContain("sales_leads");
    expect(defaultModulesByMode.sales).toContain("booking");
  });
});

// ─── Route Protection: Service Mode ──────────────────────────────────────────

describe("Route protection: service mode", () => {
  const mode: BusinessMode = "service";

  it("allows /app/bookings when booking is in enabledModules", () => {
    expect(isModuleAllowed(["booking"], ["ai_voice", "booking"], mode)).toBe(true);
  });

  it("allows /app/bookings via mode defaults even if enabledModules is empty", () => {
    // This is the critical regression case from fa8a462:
    // capabilities_json resolved but omitted booking, enabledModules was empty
    expect(isModuleAllowed(["booking"], [], mode)).toBe(true);
  });

  it("allows /app/bookings via mode defaults when capabilities resolve without booking", () => {
    // enabledModules derived from capabilities but missing "booking"
    expect(isModuleAllowed(["booking"], ["ai_voice", "instant_text_back"], mode)).toBe(true);
  });

  it("blocks dispatch_queue routes (not in service defaults)", () => {
    expect(isModuleAllowed(["dispatch_queue"], [], mode)).toBe(false);
  });

  it("blocks food_orders routes (not in service defaults)", () => {
    expect(isModuleAllowed(["food_orders"], [], mode)).toBe(false);
  });

  it("allows routes with no required modules (empty array)", () => {
    expect(isModuleAllowed([], [], mode)).toBe(true);
  });
});

// ─── Route Protection: Dispatch Mode ─────────────────────────────────────────

describe("Route protection: dispatch mode", () => {
  const mode: BusinessMode = "dispatch";

  it("allows dispatch_queue routes via mode defaults", () => {
    expect(isModuleAllowed(["dispatch_queue"], [], mode)).toBe(true);
  });

  it("blocks booking routes (not in dispatch defaults)", () => {
    expect(isModuleAllowed(["booking"], [], mode)).toBe(false);
  });

  it("blocks food_orders routes", () => {
    expect(isModuleAllowed(["food_orders"], [], mode)).toBe(false);
  });
});

// ─── Route Protection: Food Mode ─────────────────────────────────────────────

describe("Route protection: food mode", () => {
  const mode: BusinessMode = "food";

  it("allows food_orders routes via mode defaults", () => {
    expect(isModuleAllowed(["food_orders"], [], mode)).toBe(true);
  });

  it("allows reservations routes via mode defaults", () => {
    expect(isModuleAllowed(["reservations"], [], mode)).toBe(true);
  });

  it("allows catering routes via mode defaults", () => {
    expect(isModuleAllowed(["catering"], [], mode)).toBe(true);
  });

  it("blocks booking routes (not in food defaults)", () => {
    expect(isModuleAllowed(["booking"], [], mode)).toBe(false);
  });
});

// ─── Route Protection: Medical Mode ──────────────────────────────────────────

describe("Route protection: medical mode", () => {
  const mode: BusinessMode = "medical";

  it("allows booking routes via mode defaults", () => {
    expect(isModuleAllowed(["booking"], [], mode)).toBe(true);
  });

  it("allows medical_intake routes via mode defaults", () => {
    expect(isModuleAllowed(["medical_intake"], [], mode)).toBe(true);
  });

  it("blocks dispatch_queue routes", () => {
    expect(isModuleAllowed(["dispatch_queue"], [], mode)).toBe(false);
  });
});

// ─── Route Protection: Sales Mode ────────────────────────────────────────────

describe("Route protection: sales mode", () => {
  const mode: BusinessMode = "sales";

  it("allows sales_leads routes via mode defaults", () => {
    expect(isModuleAllowed(["sales_leads"], [], mode)).toBe(true);
  });

  it("allows booking routes via mode defaults", () => {
    expect(isModuleAllowed(["booking"], [], mode)).toBe(true);
  });

  it("blocks food_orders routes", () => {
    expect(isModuleAllowed(["food_orders"], [], mode)).toBe(false);
  });
});

// ─── Route Protection: General Mode ──────────────────────────────────────────

describe("Route protection: general mode", () => {
  const mode: BusinessMode = "general";

  it("allows ai_voice routes via mode defaults", () => {
    expect(isModuleAllowed(["ai_voice"], [], mode)).toBe(true);
  });

  it("blocks booking routes (not in general defaults)", () => {
    expect(isModuleAllowed(["booking"], [], mode)).toBe(false);
  });

  it("blocks dispatch_queue routes", () => {
    expect(isModuleAllowed(["dispatch_queue"], [], mode)).toBe(false);
  });

  it("blocks food_orders routes", () => {
    expect(isModuleAllowed(["food_orders"], [], mode)).toBe(false);
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe("Route protection: edge cases", () => {
  it("enabledModules override mode defaults (explicit enable)", () => {
    // General mode doesn't include booking by default, but if explicitly enabled it works
    expect(isModuleAllowed(["booking"], ["booking"], "general")).toBe(true);
  });

  it("multi-module requirement: allowed if ANY match", () => {
    // Route requires booking OR food_orders, service mode has booking
    expect(isModuleAllowed(["booking", "food_orders"], [], "service")).toBe(true);
  });

  it("multi-module requirement: blocked if NONE match", () => {
    // Route requires dispatch_queue OR food_orders, service mode has neither
    expect(isModuleAllowed(["dispatch_queue", "food_orders"], [], "service")).toBe(false);
  });

  it("unknown mode falls back to empty defaults (safe block)", () => {
    // If somehow business_mode is invalid, modeDefaults should be empty
    const unknownMode = "unknown_mode" as BusinessMode;
    expect(isModuleAllowed(["booking"], [], unknownMode)).toBe(false);
  });

  it("route with no requirements is always allowed regardless of mode", () => {
    const allModes: BusinessMode[] = ["service", "dispatch", "food", "medical", "general", "sales"];
    for (const mode of allModes) {
      expect(isModuleAllowed([], [], mode)).toBe(true);
    }
  });
});

// ─── Page-to-Module Mapping (route protection matrix) ────────────────────────

describe("Route protection matrix: which pages are accessible per mode", () => {
  // Maps each gated page to its required module(s)
  const pageModuleMap: Record<string, string[]> = {
    "/app/bookings": ["booking"],
    "/app/dispatch": ["dispatch_queue"],
    "/app/orders": ["food_orders"],
    "/app/kitchen": ["food_orders"],
    "/app/reservations": ["reservations"],
    "/app/catering": ["catering"],
    "/app/sales-pipeline": ["sales_leads"],
    "/app/medical-intake": ["medical_intake"],
  };

  // Expected accessibility per mode
  const expectedAccess: Record<BusinessMode, string[]> = {
    service: ["/app/bookings"],
    dispatch: ["/app/dispatch"],
    food: ["/app/orders", "/app/kitchen", "/app/reservations", "/app/catering"],
    medical: ["/app/bookings", "/app/medical-intake"],
    sales: ["/app/bookings", "/app/sales-pipeline"],
    general: [], // only ai_voice, no module-gated pages
  };

  const allModes: BusinessMode[] = ["service", "dispatch", "food", "medical", "general", "sales"];

  for (const mode of allModes) {
    it(`${mode} mode: correct pages accessible via defaults`, () => {
      for (const [page, requiredModules] of Object.entries(pageModuleMap)) {
        const allowed = isModuleAllowed(requiredModules, [], mode);
        const shouldBeAllowed = expectedAccess[mode].includes(page);

        if (allowed !== shouldBeAllowed) {
          throw new Error(
            `${mode} mode: ${page} should be ${shouldBeAllowed ? "allowed" : "blocked"} but was ${allowed ? "allowed" : "blocked"}`
          );
        }
      }
    });
  }
});
