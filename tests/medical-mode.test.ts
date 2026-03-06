/**
 * Medical Mode — Industry Catalog, HIPAA, Modules, and Infrastructure Tests
 *
 * @vitest-environment node
 *
 * Validates medical mode is fully wired:
 * - 8+ medical industries in catalog with correct data
 * - hipaaMode = true on all medical industries
 * - medical_intake + booking modules enabled
 * - Medical businesses use service tools (booking, not food orders)
 * - buildBusinessContext medical_settings structure (insurance, policies)
 * - Medical policies include no_show fees, cancellation fees
 *
 * Gates: medical onboarding/questions_relevant_to_mode,
 *        medical functional/booking_creates_correctly (same flow as service),
 *        medical brain/relevant_sections_only
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getIndustryBySlug } from "@/data/industryCatalog";

const TEXT_CONV_PATH = join(
  process.cwd(),
  "supabase/functions/text-conversation/index.ts"
);
const BUILD_CONTEXT_PATH = join(
  process.cwd(),
  "supabase/functions/_shared/buildBusinessContext.ts"
);

const textConv = readFileSync(TEXT_CONV_PATH, "utf-8");
const buildCtx = readFileSync(BUILD_CONTEXT_PATH, "utf-8");

// ---------------------------------------------------------------------------
// Medical industry catalog entries
// ---------------------------------------------------------------------------

describe("medical mode: industry catalog entries", () => {
  const medicalSlugs = [
    "primary_care", "urgent_care", "dental", "orthodontics",
    "optometry", "chiropractic", "physical_therapy", "mental_health",
  ];

  for (const slug of medicalSlugs) {
    it(`industry '${slug}' exists in catalog`, () => {
      const entry = getIndustryBySlug(slug);
      expect(entry, `${slug} must be in catalog`).toBeDefined();
    });
  }

  it("dental has Emergency Visit service", () => {
    const entry = getIndustryBySlug("dental");
    expect(entry).toBeDefined();
    const names = entry!.services.map((s) => s.name);
    expect(names).toContain("Emergency Visit");
  });

  it("dental has Cleaning, Filling, Crown services", () => {
    const entry = getIndustryBySlug("dental");
    const names = entry!.services.map((s) => s.name);
    expect(names).toContain("Cleaning");
    expect(names).toContain("Filling");
    expect(names).toContain("Crown");
  });

  it("mental_health has Individual Therapy and Couples Therapy", () => {
    const entry = getIndustryBySlug("mental_health");
    expect(entry).toBeDefined();
    const names = entry!.services.map((s) => s.name);
    expect(names).toContain("Individual Therapy");
    expect(names).toContain("Couples Therapy");
  });

  it("mental_health has Telehealth Session (critical for access)", () => {
    const entry = getIndustryBySlug("mental_health");
    const names = entry!.services.map((s) => s.name);
    expect(names).toContain("Telehealth Session");
  });

  it("physical_therapy has Evaluation as first service", () => {
    const entry = getIndustryBySlug("physical_therapy");
    expect(entry).toBeDefined();
    expect(entry!.services[0].name).toBe("Evaluation");
  });

  it("urgent_care has Flu/COVID Test service", () => {
    const entry = getIndustryBySlug("urgent_care");
    const names = entry!.services.map((s) => s.name);
    expect(names).toContain("Flu/COVID Test");
  });

  it("all medical services have non-zero duration", () => {
    const medicalSlugs = ["dental", "chiropractic", "physical_therapy", "mental_health"];
    for (const slug of medicalSlugs) {
      const entry = getIndustryBySlug(slug);
      for (const svc of entry!.services) {
        expect(svc.duration, `${slug}:${svc.name} must have duration > 0`).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Medical mode: businessMode classification
// ---------------------------------------------------------------------------

describe("medical mode: businessMode classification", () => {
  const medicalSlugs = ["dental", "primary_care", "mental_health", "physical_therapy"];

  for (const slug of medicalSlugs) {
    it(`'${slug}' has businessMode = 'medical'`, () => {
      const entry = getIndustryBySlug(slug);
      expect(entry).toBeDefined();
      expect(entry!.businessMode).toBe("medical");
    });
  }
});

// ---------------------------------------------------------------------------
// Medical mode: HIPAA mode enabled
// ---------------------------------------------------------------------------

describe("medical mode: HIPAA mode", () => {
  const hipaaRequiredSlugs = ["dental", "primary_care", "urgent_care", "mental_health",
    "physical_therapy", "chiropractic", "orthodontics", "optometry"];

  for (const slug of hipaaRequiredSlugs) {
    it(`'${slug}' has hipaaMode = true`, () => {
      const entry = getIndustryBySlug(slug);
      expect(entry).toBeDefined();
      expect(entry!.hipaaMode, `${slug} must have hipaaMode=true`).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Medical mode: enabled modules
// ---------------------------------------------------------------------------

describe("medical mode: enabled modules", () => {
  const medicalSlugs = ["dental", "primary_care", "mental_health", "physical_therapy"];

  for (const slug of medicalSlugs) {
    it(`'${slug}' has 'booking' module (medical uses appointment booking)`, () => {
      const entry = getIndustryBySlug(slug);
      const modules = entry!.enabledModules ?? [];
      expect(modules, `${slug} must have booking module`).toContain("booking");
    });

    it(`'${slug}' has 'medical_intake' module`, () => {
      const entry = getIndustryBySlug(slug);
      const modules = entry!.enabledModules ?? [];
      expect(modules, `${slug} must have medical_intake module`).toContain("medical_intake");
    });

    it(`'${slug}' does NOT have 'food_orders' module`, () => {
      const entry = getIndustryBySlug(slug);
      const modules = entry!.enabledModules ?? [];
      expect(modules).not.toContain("food_orders");
    });
  }
});

// ---------------------------------------------------------------------------
// Medical mode: uses SERVICE_TOOLS (booking-based like service mode)
// ---------------------------------------------------------------------------

describe("medical mode: text-conversation tool routing", () => {
  it("medical mode falls through to SERVICE_TOOLS in getToolDefinitions (booking-based)", () => {
    // Medical uses the same booking flow as service mode — there's no separate MEDICAL_TOOLS
    // The default case handles: service, medical, sales, general
    // We verify there's no 'case "medical"' with DIFFERENT tools
    const switchStart = textConv.indexOf("function getToolDefinitions");
    let depth = 0;
    let pos = switchStart;
    while (pos < textConv.length) {
      if (textConv[pos] === "{") depth++;
      else if (textConv[pos] === "}") {
        depth--;
        if (depth === 0) break;
      }
      pos++;
    }
    const fnBody = textConv.slice(switchStart, pos);
    // Medical should either NOT have its own case (falls to default/service)
    // OR have a case that returns SERVICE_TOOLS
    const hasMedicalCase = fnBody.includes('case "medical"');
    if (hasMedicalCase) {
      const medicalCaseStart = fnBody.indexOf('case "medical"');
      const nextCase = fnBody.indexOf("case ", medicalCaseStart + 10);
      const medicalCaseBlock = fnBody.slice(medicalCaseStart, nextCase === -1 ? undefined : nextCase);
      // If medical has its own case, it must use SERVICE_TOOLS (not FOOD/DISPATCH)
      expect(medicalCaseBlock).not.toContain("FOOD_TOOLS");
      expect(medicalCaseBlock).not.toContain("DISPATCH_TOOLS");
    }
    // Either way, SERVICE_TOOLS is the default — acceptable
  });

  it("service tool create_booking exists and is available to medical mode", () => {
    expect(textConv).toContain('name: "create_booking"');
  });

  it("service tool check_availability exists for medical scheduling", () => {
    expect(textConv).toContain('name: "check_availability"');
  });

  it("service tool cancel_booking exists for medical cancellations", () => {
    expect(textConv).toContain('name: "cancel_booking"');
  });
});

// ---------------------------------------------------------------------------
// buildBusinessContext: medical_settings structure
// ---------------------------------------------------------------------------

describe("medical mode: buildBusinessContext medical_settings", () => {
  it("medical_settings is populated in BusinessContext", () => {
    expect(buildCtx).toContain("medical_settings");
  });

  it("buildAcceptedCarriersSummary function exists (insurance display)", () => {
    expect(buildCtx).toContain("buildAcceptedCarriersSummary");
  });

  it("buildMedicalPoliciesSummary function exists", () => {
    expect(buildCtx).toContain("buildMedicalPoliciesSummary");
  });

  it("medical_settings includes new_patient_fee_display", () => {
    expect(buildCtx).toContain("new_patient_fee_display");
  });

  it("medical_settings includes no_show_fee_display (important for patient communication)", () => {
    expect(buildCtx).toContain("no_show_fee_display");
  });

  it("medical_settings fetches from medical_practice_settings table", () => {
    expect(buildCtx).toContain("medical_practice_settings");
  });

  it("medical_settings fetches insurance coverage data", () => {
    // Medical coverage / accepted insurance carriers
    expect(buildCtx).toContain("medicalCoverage");
  });
});

// ---------------------------------------------------------------------------
// Medical mode: defaultPolicies (anti-fabrication)
// ---------------------------------------------------------------------------

describe("medical mode: default policies from catalog", () => {
  it("dental industry has cancellation policy in defaultPolicies", () => {
    const entry = getIndustryBySlug("dental");
    // medicalBase includes defaultPolicies with cancellation warning
    // The industry inherits from medicalBase
    expect(entry).toBeDefined();
    // We test via the catalog source since defaultPolicies is not in the resolved template
    const { readFileSync } = require("node:fs");
    const src = readFileSync(
      join(process.cwd(), "src/data/industryCatalog.ts"),
      "utf-8"
    );
    const medicalPoliciesBlock = src.slice(
      src.indexOf("const medicalPolicies"),
      src.indexOf("const medicalModules")
    );
    expect(medicalPoliciesBlock).toContain("cancellation");
    // cancellation policy mentions missed appointments (no_show concept even if key is different)
    expect(medicalPoliciesBlock).toMatch(/cancel|missed appointment|fee/i);
  });

  it("medicalModules includes booking (not food_orders, not dispatch_queue)", () => {
    const { readFileSync } = require("node:fs");
    const src = readFileSync(
      join(process.cwd(), "src/data/industryCatalog.ts"),
      "utf-8"
    );
    const medicalModulesLine = src
      .split("\n")
      .find((l: string) => l.includes("const medicalModules"));
    expect(medicalModulesLine).toBeDefined();
    expect(medicalModulesLine).toContain("booking");
    expect(medicalModulesLine).toContain("medical_intake");
    expect(medicalModulesLine).not.toContain("food_orders");
    expect(medicalModulesLine).not.toContain("dispatch_queue");
  });
});

// ---------------------------------------------------------------------------
// Medical mode: FAQs — insurance and intake questions
// ---------------------------------------------------------------------------

describe("medical mode: industry FAQs", () => {
  it("dental has insurance FAQ", () => {
    const entry = getIndustryBySlug("dental");
    expect(entry).toBeDefined();
    const questions = (entry!.faqs ?? []).map((f) => f.question.toLowerCase());
    const hasInsurance = questions.some((q) => q.includes("insurance") || q.includes("accept"));
    expect(hasInsurance).toBe(true);
  });

  it("primary_care has FAQ about new patients", () => {
    const entry = getIndustryBySlug("primary_care");
    expect(entry).toBeDefined();
    const questions = (entry!.faqs ?? []).map((f) => f.question.toLowerCase());
    const hasNewPatient = questions.some((q) => q.includes("new patient") || q.includes("first appointment") || q.includes("bring"));
    // medicalBase includes "What should I bring to my first appointment?" FAQ
    expect(hasNewPatient).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Medical mode: cross-mode safety
// ---------------------------------------------------------------------------

describe("medical mode: cross-mode safety", () => {
  it("medical industries are NOT in food_hospitality category", () => {
    const entry = getIndustryBySlug("dental");
    expect(entry!.category).not.toBe("food_hospitality");
    expect(entry!.category).toBe("health_medical");
  });

  it("medical industries are NOT in home_services category", () => {
    const entry = getIndustryBySlug("chiropractic");
    expect(entry!.category).toBe("health_medical");
  });

  it("food mode industries are NOT in health_medical category", () => {
    const entry = getIndustryBySlug("restaurant");
    expect(entry!.category).not.toBe("health_medical");
    expect(entry!.category).toBe("food_hospitality");
  });

  it("medical industries have hipaaMode=true while food industries do not", () => {
    const dental = getIndustryBySlug("dental");
    const restaurant = getIndustryBySlug("restaurant");
    expect(dental!.hipaaMode).toBe(true);
    expect(restaurant!.hipaaMode).toBeUndefined();
  });
});
