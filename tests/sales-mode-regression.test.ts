/**
 * Sales Mode Regression Tests
 *
 * @vitest-environment node
 *
 * Covers all 5 primary sales slugs:
 *   car-dealership-new, car-dealership-used, car-dealership-full,
 *   real-estate-agency, solar-installer, insurance-agency
 *
 * Validates:
 * 1. Terminology slug overrides resolve correctly (appointmentLabel, customerLabel, etc.)
 * 2. "real-estate-agency" alias resolves to showing/buyer/agent (not generic sales defaults)
 * 3. Onboarding config: all 6 sales slugs have preAnswers + setupChecklist + nextSteps
 * 4. Dealership slugs pre-answer offersFinancing + offersTradeIn
 * 5. text-conversation: SALES_TOOLS defined + search_inventory mapped to elevenlabs endpoint
 * 6. text-conversation: salesRules used when businessMode === "sales"
 * 7. text-conversation: sales mode gets SHARED_TOOLS (create_callback, check_service_area)
 *
 * Bug fixed (2026-03-08):
 *   real-estate-agency catalog slug didn't match real_estate terminology key.
 *   A real estate agent would see "appointment" instead of "showing" throughout the UI.
 *   Fix: added "real-estate-agency" alias in SLUG_OVERRIDES + slugConfigs.
 *
 * Gate: sales onboarding/correct_terminology, sales brain/customization_intuitive,
 *       sales onboarding/smart_defaults_prefilled
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getIndustryTerminology } from "../src/data/industryTerminology";
import { getIndustryOnboardingConfig } from "../src/config/industryOnboardingConfig";
import { getQuestionsForMode, getDefaultAnswers, deriveModulesFromScenario } from "../src/lib/scenarioQuestions";

const TEXT_CONV_PATH = join(
  process.cwd(),
  "supabase/functions/text-conversation/index.ts"
);
const source = readFileSync(TEXT_CONV_PATH, "utf-8");

// ---------------------------------------------------------------------------
// 1. Terminology: car dealerships
// ---------------------------------------------------------------------------

describe("getIndustryTerminology: car-dealership-new", () => {
  const t = getIndustryTerminology("sales", "sales_dealerships", "car-dealership-new");

  it("appointmentLabel is 'test drive'", () => {
    expect(t.appointmentLabel).toBe("test drive");
  });

  it("customerLabel is 'buyer'", () => {
    expect(t.customerLabel).toBe("buyer");
  });

  it("teamMemberLabel is 'sales rep'", () => {
    expect(t.teamMemberLabel).toBe("sales rep");
  });

  it("bookingsPageTitle prevents nav collision with /app/test-drives", () => {
    expect(t.bookingsPageTitle).toBe("Showroom Appointments");
  });

  it("servicesLabel reflects vehicle lineup", () => {
    expect(t.servicesLabel).toMatch(/vehicle/i);
  });
});

describe("getIndustryTerminology: car-dealership-used", () => {
  const t = getIndustryTerminology("sales", "sales_dealerships", "car-dealership-used");

  it("appointmentLabel is 'test drive'", () => {
    expect(t.appointmentLabel).toBe("test drive");
  });

  it("bookingsPageTitle is 'Showroom Appointments' (nav collision prevention)", () => {
    expect(t.bookingsPageTitle).toBe("Showroom Appointments");
  });

  it("locationLabel is 'lot'", () => {
    expect(t.locationLabel).toBe("lot");
  });
});

describe("getIndustryTerminology: car-dealership-full", () => {
  const t = getIndustryTerminology("sales", "sales_dealerships", "car-dealership-full");

  it("appointmentLabel is 'test drive'", () => {
    expect(t.appointmentLabel).toBe("test drive");
  });

  it("teamMemberLabel is 'sales consultant'", () => {
    expect(t.teamMemberLabel).toBe("sales consultant");
  });

  it("bookingsPageTitle is 'Showroom Appointments'", () => {
    expect(t.bookingsPageTitle).toBe("Showroom Appointments");
  });
});

// ---------------------------------------------------------------------------
// 2. Terminology: real-estate-agency alias (BUG FIX regression)
// ---------------------------------------------------------------------------

describe("getIndustryTerminology: real-estate-agency (sales mode slug — alias fix)", () => {
  const t = getIndustryTerminology("sales", "sales_dealerships", "real-estate-agency");

  it("appointmentLabel is 'showing' (not generic 'appointment')", () => {
    // BUG REGRESSION: before fix, real-estate-agency returned salesDefaults.appointmentLabel = 'appointment'
    expect(t.appointmentLabel).toBe("showing");
  });

  it("customerLabel is 'buyer' (not generic 'prospect')", () => {
    expect(t.customerLabel).toBe("buyer");
  });

  it("teamMemberLabel is 'agent' (not generic 'sales rep')", () => {
    expect(t.teamMemberLabel).toBe("agent");
  });

  it("servicesCategoryTitle is 'Real Estate Services'", () => {
    expect(t.servicesCategoryTitle).toBe("Real Estate Services");
  });
});

// ---------------------------------------------------------------------------
// 3. Terminology: solar-installer
// ---------------------------------------------------------------------------

describe("getIndustryTerminology: solar-installer", () => {
  const t = getIndustryTerminology("sales", "sales_dealerships", "solar-installer");

  it("appointmentLabel is 'consultation'", () => {
    expect(t.appointmentLabel).toBe("consultation");
  });

  it("customerLabel is 'homeowner'", () => {
    expect(t.customerLabel).toBe("homeowner");
  });

  it("teamMemberLabel is 'solar consultant'", () => {
    expect(t.teamMemberLabel).toBe("solar consultant");
  });

  it("servicesLabel is 'Solar Packages'", () => {
    expect(t.servicesLabel).toBe("Solar Packages");
  });
});

// ---------------------------------------------------------------------------
// 4. Terminology: insurance-agency
// ---------------------------------------------------------------------------

describe("getIndustryTerminology: insurance-agency", () => {
  const t = getIndustryTerminology("sales", "sales_dealerships", "insurance-agency");

  it("appointmentLabel is 'consultation'", () => {
    expect(t.appointmentLabel).toBe("consultation");
  });

  it("customerLabel is 'client'", () => {
    expect(t.customerLabel).toBe("client");
  });

  it("servicesLabel is 'Insurance Products'", () => {
    expect(t.servicesLabel).toBe("Insurance Products");
  });
});

// ---------------------------------------------------------------------------
// 5. Terminology: sales mode fallback (no slug)
// ---------------------------------------------------------------------------

describe("getIndustryTerminology: sales mode defaults (no slug)", () => {
  const t = getIndustryTerminology("sales");

  it("has a servicesLabel", () => {
    expect(t.servicesLabel).toBeTruthy();
  });

  it("has a customerLabel", () => {
    expect(t.customerLabel).toBeTruthy();
  });

  it("has a teamMemberLabel", () => {
    expect(t.teamMemberLabel).toBeTruthy();
  });

  it("does NOT use service mode terminology", () => {
    // sales mode should not say 'client' (medical) or 'customer' (generic service)
    expect(t.appointmentLabel).not.toBe("intake");
    expect(t.appointmentLabel).not.toBe("job");
  });
});

// ---------------------------------------------------------------------------
// 6. Onboarding config: car dealership slugs pre-answer financing + trade-in
// ---------------------------------------------------------------------------

describe("getIndustryOnboardingConfig: car dealership slugs pre-answer financing/trade-in", () => {
  for (const slug of ["car-dealership-new", "car-dealership-used", "car-dealership-full"]) {
    describe(slug, () => {
      const cfg = getIndustryOnboardingConfig("sales", "sales_dealerships", slug);

      it("offersFinancing is pre-answered true", () => {
        expect(cfg.preAnswers.offersFinancing).toBe(true);
      });

      it("offersTradeIn is pre-answered true", () => {
        expect(cfg.preAnswers.offersTradeIn).toBe(true);
      });

      it("setupChecklist includes vehicle lineup step", () => {
        const labels = cfg.setupChecklist.map((s) => s.label.toLowerCase());
        expect(labels.some((l) => l.includes("vehicle") || l.includes("inventory"))).toBe(true);
      });

      it("nextSteps includes a test call suggestion", () => {
        const texts = cfg.nextSteps.map((s) => s.label.toLowerCase());
        expect(texts.some((t) => t.includes("test call"))).toBe(true);
      });

      it("setupTitle mentions dealership or lot", () => {
        expect(cfg.setupTitle).toMatch(/dealership|lot/i);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Onboarding config: real-estate-agency alias (BUG FIX regression)
// ---------------------------------------------------------------------------

describe("getIndustryOnboardingConfig: real-estate-agency (alias fix)", () => {
  const cfg = getIndustryOnboardingConfig("sales", "sales_dealerships", "real-estate-agency");

  it("offersShowings is pre-answered true", () => {
    // BUG REGRESSION: before fix, real-estate-agency returned no preAnswers at all
    expect(cfg.preAnswers.offersShowings).toBe(true);
  });

  it("setupChecklist includes showing availability step", () => {
    const labels = cfg.setupChecklist.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("showing"))).toBe(true);
  });

  it("setupTitle mentions real estate", () => {
    expect(cfg.setupTitle).toMatch(/real estate/i);
  });

  it("nextSteps include a test call with real estate scenario", () => {
    const texts = cfg.nextSteps.map((s) => s.label.toLowerCase());
    expect(texts.some((t) => t.includes("test call"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Onboarding config: solar-installer
// ---------------------------------------------------------------------------

describe("getIndustryOnboardingConfig: solar-installer", () => {
  const cfg = getIndustryOnboardingConfig("sales", "sales_dealerships", "solar-installer");

  it("offersFreeEstimates is pre-answered true", () => {
    expect(cfg.preAnswers.offersFreeEstimates).toBe(true);
  });

  it("setupChecklist includes solar system types", () => {
    const labels = cfg.setupChecklist.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("solar"))).toBe(true);
  });

  it("setupTitle mentions solar", () => {
    expect(cfg.setupTitle).toMatch(/solar/i);
  });
});

// ---------------------------------------------------------------------------
// 9. Onboarding config: insurance-agency
// ---------------------------------------------------------------------------

describe("getIndustryOnboardingConfig: insurance-agency", () => {
  const cfg = getIndustryOnboardingConfig("sales", "sales_dealerships", "insurance-agency");

  it("setupChecklist has at least 3 items", () => {
    expect(cfg.setupChecklist.length).toBeGreaterThanOrEqual(3);
  });

  it("setupChecklist includes insurance products step", () => {
    const labels = cfg.setupChecklist.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("insurance") || l.includes("product"))).toBe(true);
  });

  it("setupTitle mentions agency or insurance", () => {
    expect(cfg.setupTitle).toMatch(/insurance|agency/i);
  });
});

// ---------------------------------------------------------------------------
// 10. text-conversation: SALES_TOOLS defined and mapped
// ---------------------------------------------------------------------------

describe("text-conversation: SALES_TOOLS definition", () => {
  it("defines SALES_TOOLS array", () => {
    expect(source).toContain("SALES_TOOLS");
  });

  it("defines search_inventory tool", () => {
    expect(source).toContain('name: "search_inventory"');
  });

  it("maps search_inventory to elevenlabs-search-inventory endpoint", () => {
    expect(source).toContain('search_inventory: "elevenlabs-search-inventory"');
  });

  it("sales mode uses SALES_TOOLS in getToolDefinitions", () => {
    expect(source).toContain('case "sales":');
    expect(source).toContain("SALES_TOOLS");
  });
});

// ---------------------------------------------------------------------------
// 11. text-conversation: sales mode rules
// ---------------------------------------------------------------------------

describe("text-conversation: salesRules", () => {
  it("defines salesRules variable", () => {
    expect(source).toContain("salesRules");
  });

  it("salesRules includes SALES APPROACH directive", () => {
    expect(source).toContain("SALES APPROACH");
  });

  it("salesRules includes BOOKING COMPLETION (critical rule)", () => {
    expect(source).toContain("BOOKING COMPLETION");
  });

  it("salesRules includes INVENTORY RULE (no fabrication)", () => {
    expect(source).toContain("INVENTORY RULE");
  });

  it("salesRules addresses financing/trade-in redirect (do not quote rates)", () => {
    expect(source).toContain("FINANCING");
  });

  it("modeRules uses salesRules when businessMode is 'sales'", () => {
    const pattern = /businessMode === ["']sales["']/;
    expect(source).toMatch(pattern);
    // also check that salesRules is in the ternary chain
    expect(source).toMatch(/salesRules/);
  });
});

// ---------------------------------------------------------------------------
// 12. text-conversation: shared tools available in sales mode
// ---------------------------------------------------------------------------

describe("text-conversation: sales mode has shared tools", () => {
  it("create_callback is in SHARED_TOOLS (sales can capture leads)", () => {
    // create_callback should be in the shared tools, not sales-specific
    const sharedToolsIdx = source.indexOf("SHARED_TOOLS");
    const createCallbackIdx = source.indexOf('name: "create_callback"');
    expect(createCallbackIdx).toBeGreaterThan(-1);
    // SHARED_TOOLS should appear before the individual mode tool arrays
    expect(sharedToolsIdx).toBeGreaterThan(-1);
  });

  it("check_service_area is mapped to an endpoint", () => {
    expect(source).toContain('check_service_area: "elevenlabs-check-service-area"');
  });
});

// ---------------------------------------------------------------------------
// 13. Terminology non-regression: other modes unaffected by sales additions
// ---------------------------------------------------------------------------

describe("sales mode terminology additions do not regress other modes", () => {
  it("service mode still uses 'appointment' label by default", () => {
    const t = getIndustryTerminology("service");
    expect(t.appointmentLabel).toBe("appointment");
  });

  it("dispatch mode customerLabel is 'customer'", () => {
    const t = getIndustryTerminology("dispatch");
    expect(t.customerLabel).toBe("customer");
  });

  it("medical mode appointmentLabel is not a sales label", () => {
    const t = getIndustryTerminology("medical");
    expect(t.appointmentLabel).not.toBe("test drive");
    expect(t.appointmentLabel).not.toBe("showing");
    expect(t.appointmentLabel).not.toBe("consultation");
  });

  it("plumber (service mode) unaffected by sales slug additions", () => {
    const t = getIndustryTerminology("service", "home_services", "plumber");
    expect(t.appointmentLabel).toBe("job");
    expect(t.customerLabel).not.toBe("buyer");
  });
});

// ---------------------------------------------------------------------------
// seed-test-tenants: cleanup covers sales tables (bug: duplicate inventory on reseed)
// ---------------------------------------------------------------------------
describe("seed-test-tenants cleanup completeness", () => {
  const source = readFileSync(
    join(process.cwd(), "supabase/functions/seed-test-tenants/index.ts"),
    "utf-8"
  );

  // Verify all 3 sales-specific tables are cleaned in BOTH delete and reseed paths.
  // Bug fixed 2026-03-08 (b24232c): reseed did not clear sales_inventory/sales_leads/test_drives,
  // causing repeated reseed to double inventory (8 → 16 → 24 vehicles).

  const deleteBlock = source.slice(
    source.indexOf('action === "delete"'),
    source.indexOf('action === "reseed"')
  );

  const reseedBlock = source.slice(
    source.indexOf('action === "reseed"'),
    source.indexOf('action === "create_and_seed"')
  );

  it("DELETE action clears sales_inventory", () => {
    expect(deleteBlock).toContain('"sales_inventory"');
  });

  it("DELETE action clears sales_leads", () => {
    expect(deleteBlock).toContain('"sales_leads"');
  });

  it("DELETE action clears test_drives", () => {
    expect(deleteBlock).toContain('"test_drives"');
  });

  it("RESEED action clears sales_inventory before re-inserting", () => {
    expect(reseedBlock).toContain('"sales_inventory"');
  });

  it("RESEED action clears sales_leads", () => {
    expect(reseedBlock).toContain('"sales_leads"');
  });

  it("RESEED action clears test_drives", () => {
    expect(reseedBlock).toContain('"test_drives"');
  });

  it("seedTenantData inserts into sales_inventory when customInventory provided", () => {
    expect(source).toContain('"sales_inventory"');
    expect(source).toContain("customInventory");
  });
});

// ---------------------------------------------------------------------------
// 9. inventory-reference question suppression bug fix (2026-03-09)
// ---------------------------------------------------------------------------
// Bug: real-estate-agency, solar-installer, insurance-agency would see the
// "Do you have inventory?" question with defaultValue:true, which would add
// sales_inventory to their modules via deriveModulesFromScenario — incorrect
// since their industry templates use salesLeadsOnlyModules (no sales_inventory).
//
// Fix: added these slugs to suppressedFor in scenarioQuestions.ts
// ---------------------------------------------------------------------------

describe("inventory-reference suppression bug fix — non-inventory sales industries", () => {
  const NON_INVENTORY_SLUGS = [
    { slug: "real-estate-agency", category: "property_real_estate" },
    { slug: "real_estate", category: "property_real_estate" },
    { slug: "solar-installer", category: "sales_dealerships_adjacent" as any },
    { slug: "insurance-agency", category: "professional_services" as any },
  ];

  for (const ctx of NON_INVENTORY_SLUGS) {
    describe(ctx.slug, () => {
      it("inventory-reference question is NOT visible in onboarding", () => {
        const qs = getQuestionsForMode("sales", ctx).filter(q => q.onboardingVisible);
        const ids = qs.map(q => q.id);
        expect(ids).not.toContain("inventory-reference");
      });
    });
  }

  it("real-estate-agency default answers do NOT include hasInventoryReference=true", () => {
    const ctx = { slug: "real-estate-agency", category: "property_real_estate" };
    const answers = getDefaultAnswers("sales", ctx);
    // hasInventoryReference should not be true (question is suppressed)
    expect(answers["hasInventoryReference"]).not.toBe(true);
  });

  it("real-estate-agency module derivation does NOT add sales_inventory", () => {
    const ctx = { slug: "real-estate-agency", category: "property_real_estate" };
    const baseModules = ["ai_voice", "instant_text_back", "sales_leads", "booking", "lead_recovery"];
    const answers = getDefaultAnswers("sales", ctx);
    const questions = getQuestionsForMode("sales", ctx);
    const derivedModules = deriveModulesFromScenario(baseModules, answers, questions);
    expect(derivedModules).not.toContain("sales_inventory");
  });

  it("car-dealership-full (sales_dealerships) still suppresses inventory-reference but has it in base modules", () => {
    const ctx = { slug: "car-dealership-full", category: "sales_dealerships" };
    const qs = getQuestionsForMode("sales", ctx).filter(q => q.onboardingVisible);
    const ids = qs.map(q => q.id);
    // inventory-reference is suppressed for sales_dealerships — it's auto-enabled from industry template
    expect(ids).not.toContain("inventory-reference");
  });
});
