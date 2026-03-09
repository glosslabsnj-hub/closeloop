/**
 * Pool Service industry configuration regression tests (commits 8c5ac3c, 646845c)
 *
 * @vitest-environment node
 *
 * Verifies:
 * 1. pool_service has rich services in industryCatalog (14 services)
 * 2. pool_service context fields are pool-specific (not generic property_type/issue_description)
 * 3. pool_service has pool-specific FAQs (8+), not generic commonFAQs
 * 4. pool_service has pool-specific objections
 * 5. pool_service in popularIndustries (appears in industry picker)
 * 6. industryTerminology: appointmentLabel='service visit', teamMemberLabel='pool tech'
 * 7. industryOnboardingConfig: pool_service slug entry exists
 * 8. SLUG_OBJECTION_OVERRIDES: pool_service has quick-add objections
 *
 * Business impact: Pool service owners must feel $49/mo is justified by seeing
 * pool-specific services, FAQs, and terminology — not generic home service content.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ===== Import actual modules =====

import {
  industryCatalog,
  getIndustryBySlug,
  getPopularIndustries,
} from "../src/data/industryCatalog";
import { industryConfigs } from "../src/data/industryTemplates";
import { getIndustryTerminology } from "../src/data/industryTerminology";
import { getIndustryOnboardingConfig } from "../src/config/industryOnboardingConfig";

// ===== Helper =====

function readSrc(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

// ===== industryCatalog: pool_service entry =====

describe("industryCatalog: pool_service services enrichment (8c5ac3c)", () => {
  const poolEntry = getIndustryBySlug("pool_service");

  it("pool_service entry exists in industryCatalog", () => {
    expect(poolEntry).toBeDefined();
  });

  it("has at least 12 services", () => {
    expect(poolEntry!.services.length).toBeGreaterThanOrEqual(12);
  });

  it("includes Weekly Cleaning as a service", () => {
    const service = poolEntry!.services.find((s) => s.name === "Weekly Cleaning");
    expect(service).toBeDefined();
    expect(service!.price).toBe(125);
    expect(service!.priceType).toBe("fixed");
  });

  it("includes Green-to-Clean / Algae Treatment (was missing before)", () => {
    const service = poolEntry!.services.find(
      (s) => s.name.includes("Green-to-Clean") || s.name.includes("Algae")
    );
    expect(service).toBeDefined();
    expect(service!.price).toBe(350);
    expect(service!.priceType).toBe("starting_at");
  });

  it("includes Filter Cleaning", () => {
    const service = poolEntry!.services.find((s) => s.name === "Filter Cleaning");
    expect(service).toBeDefined();
  });

  it("includes Heater Repair", () => {
    const service = poolEntry!.services.find((s) => s.name === "Heater Repair");
    expect(service).toBeDefined();
  });

  it("includes Salt System Service", () => {
    const service = poolEntry!.services.find((s) => s.name === "Salt System Service");
    expect(service).toBeDefined();
    expect(service!.price).toBe(125);
  });

  it("includes Pool Inspection", () => {
    const service = poolEntry!.services.find((s) => s.name === "Pool Inspection");
    expect(service).toBeDefined();
    expect(service!.price).toBe(100);
  });

  it("includes Acid Wash", () => {
    const service = poolEntry!.services.find((s) => s.name === "Acid Wash");
    expect(service).toBeDefined();
  });

  it("includes Leak Detection", () => {
    const service = poolEntry!.services.find((s) => s.name === "Leak Detection");
    expect(service).toBeDefined();
  });

  it("includes Monthly Maintenance Plan", () => {
    const service = poolEntry!.services.find(
      (s) => s.name.includes("Monthly") || s.name.includes("Maintenance Plan")
    );
    expect(service).toBeDefined();
  });
});

describe("industryCatalog: pool_service context fields (8c5ac3c)", () => {
  const poolEntry = getIndustryBySlug("pool_service");

  it("has pool-specific context fields (not generic property_type/issue_description)", () => {
    const fieldKeys = poolEntry!.contextFields?.map((f) => f.key) ?? [];
    // Pool-specific fields that were added
    expect(fieldKeys).toContain("current_issue");
    expect(fieldKeys).toContain("urgency");
    // Must NOT have old generic fields
    expect(fieldKeys).not.toContain("property_type");
    expect(fieldKeys).not.toContain("issue_description");
  });

  it("has surface_type context field for pool type", () => {
    const field = poolEntry!.contextFields?.find((f) => f.key === "surface_type");
    expect(field).toBeDefined();
    expect(field!.type).toBe("select");
  });

  it("has has_heater context field", () => {
    const field = poolEntry!.contextFields?.find((f) => f.key === "has_heater");
    expect(field).toBeDefined();
  });

  it("has has_salt_system context field", () => {
    const field = poolEntry!.contextFields?.find((f) => f.key === "has_salt_system");
    expect(field).toBeDefined();
  });

  it("urgency field has correct options", () => {
    const field = poolEntry!.contextFields?.find((f) => f.key === "urgency");
    expect(field?.options).toContain("Routine");
    expect(field?.options).toContain("Urgent");
  });
});

describe("industryCatalog: pool_service FAQs (8c5ac3c)", () => {
  const poolEntry = getIndustryBySlug("pool_service");

  it("has at least 8 pool-specific FAQs", () => {
    expect(poolEntry!.faqs.length).toBeGreaterThanOrEqual(8);
  });

  it("FAQ about hours says Mon-Sat not 'check website'", () => {
    const hoursFaq = poolEntry!.faqs.find(
      (f) =>
        f.question.toLowerCase().includes("hour") ||
        f.question.toLowerCase().includes("monday")
    );
    expect(hoursFaq).toBeDefined();
    expect(hoursFaq!.answer).not.toMatch(/check.*website|website.*hours/i);
    expect(hoursFaq!.answer).toMatch(/monday|mon.*sat/i);
  });

  it("has FAQ about pool cleaning frequency", () => {
    const faq = poolEntry!.faqs.find(
      (f) =>
        f.question.toLowerCase().includes("how often") ||
        f.question.toLowerCase().includes("frequent")
    );
    expect(faq).toBeDefined();
  });

  it("has FAQ about contracts/service plans", () => {
    const faq = poolEntry!.faqs.find(
      (f) =>
        f.question.toLowerCase().includes("contract") ||
        f.question.toLowerCase().includes("plan")
    );
    expect(faq).toBeDefined();
  });

  it("has FAQ about saltwater pools", () => {
    const faq = poolEntry!.faqs.find(
      (f) => f.question.toLowerCase().includes("salt")
    );
    expect(faq).toBeDefined();
  });

  it("has FAQ about chemicals", () => {
    const faq = poolEntry!.faqs.find(
      (f) => f.question.toLowerCase().includes("chemical")
    );
    expect(faq).toBeDefined();
  });
});

describe("industryCatalog: pool_service objections (8c5ac3c)", () => {
  const poolEntry = getIndustryBySlug("pool_service");

  it("has pool-specific objections", () => {
    expect(poolEntry!.objections.length).toBeGreaterThan(0);
  });

  it("has 'I can maintain my own pool' objection", () => {
    const obj = poolEntry!.objections.find((o) =>
      o.objection.toLowerCase().includes("maintain my own pool")
    );
    expect(obj).toBeDefined();
  });

  it("has 'I already have a pool service' objection", () => {
    const obj = poolEntry!.objections.find((o) =>
      o.objection.toLowerCase().includes("already have a pool service")
    );
    expect(obj).toBeDefined();
  });

  it("has seasonal objection", () => {
    const obj = poolEntry!.objections.find((o) =>
      o.objection.toLowerCase().includes("seasonal")
    );
    expect(obj).toBeDefined();
  });
});

describe("industryCatalog: pool_service in popular industries (8c5ac3c)", () => {
  it("pool_service appears in getPopularIndustries()", () => {
    const popular = getPopularIndustries(20);
    const slugs = popular.map((e) => e.slug);
    expect(slugs).toContain("pool_service");
  });
});

// ===== industryTemplates: pool_service entry =====

describe("industryTemplates: pool_service rich template (8c5ac3c)", () => {
  const poolTemplate = industryConfigs["pool_service" as keyof typeof industryConfigs];

  it("pool_service template exists", () => {
    expect(poolTemplate).toBeDefined();
  });

  it("template has at least 10 services", () => {
    expect(poolTemplate!.services.length).toBeGreaterThanOrEqual(10);
  });

  it("template has pool-specific context fields", () => {
    const fieldKeys = poolTemplate!.contextFields?.map((f) => f.key) ?? [];
    expect(fieldKeys).toContain("current_issue");
    expect(fieldKeys).toContain("urgency");
    expect(fieldKeys).toContain("has_salt_system");
  });

  it("template has at least 8 FAQs", () => {
    expect(poolTemplate!.faqs.length).toBeGreaterThanOrEqual(8);
  });

  it("template has pool-specific objections", () => {
    const poolSpecific = poolTemplate!.objections.filter((o) =>
      o.objection.toLowerCase().includes("pool")
    );
    expect(poolSpecific.length).toBeGreaterThanOrEqual(3);
  });
});

// ===== industryTerminology: pool_service overrides =====

describe("industryTerminology: pool_service slug overrides (646845c)", () => {
  // getIndustryTerminology signature: (mode, category?, slug?)
  const terminology = getIndustryTerminology("service", undefined, "pool_service");

  it("appointmentLabel is 'service visit'", () => {
    expect(terminology.appointmentLabel).toBe("service visit");
  });

  it("teamMemberLabel is 'pool tech'", () => {
    expect(terminology.teamMemberLabel).toBe("pool tech");
  });

  it("customerLabel is 'customer'", () => {
    expect(terminology.customerLabel).toBe("customer");
  });

  it("catalogCardTitle is 'Your Pool Services'", () => {
    expect(terminology.catalogCardTitle).toBe("Your Pool Services");
  });
});

// ===== industryOnboardingConfig: pool_service slug config =====

describe("industryOnboardingConfig: pool_service slug entry (646845c)", () => {
  // getIndustryOnboardingConfig signature: (mode, category?, slug?)
  const poolConfig = getIndustryOnboardingConfig("service", undefined, "pool_service");

  it("pool_service has a slug config resolved", () => {
    expect(poolConfig).toBeDefined();
  });

  it("setupChecklist includes pool-specific items", () => {
    const checklist = poolConfig?.setupChecklist ?? [];
    expect(checklist.length).toBeGreaterThan(0);
    // At least one item should be pool or service related
    const hasPoolItem = checklist.some(
      (item) =>
        item.label.toLowerCase().includes("pool") ||
        item.label.toLowerCase().includes("service") ||
        item.label.toLowerCase().includes("faq")
    );
    expect(hasPoolItem).toBe(true);
  });

  it("nextSteps includes items (NextStepItem objects with label/icon)", () => {
    const nextSteps = poolConfig?.nextSteps ?? [];
    expect(nextSteps.length).toBeGreaterThan(0);
    // NextStepItem has label + icon fields
    const hasTestCall = nextSteps.some(
      (step) =>
        step.label.toLowerCase().includes("call") ||
        step.label.toLowerCase().includes("test") ||
        step.label.toLowerCase().includes("pool") ||
        step.label.toLowerCase().includes("green")
    );
    expect(hasTestCall).toBe(true);
  });
});

// ===== industryExamples: SLUG_OBJECTION_OVERRIDES for pool_service =====

describe("industryExamples: pool_service objection quick-add (646845c)", () => {
  const examplesSource = readSrc("src/lib/industryExamples.ts");

  it("SLUG_OBJECTION_OVERRIDES contains pool_service key", () => {
    expect(examplesSource).toContain("pool_service");
  });

  it("pool_service objection entry has 'maintain my own pool'", () => {
    expect(examplesSource).toMatch(/maintain.*own.*pool|own.*pool/i);
  });

  it("pool_service has at least 3 objection entries", () => {
    // Find the pool_service block in SLUG_OBJECTION_OVERRIDES
    const slugObjIdx = examplesSource.indexOf("SLUG_OBJECTION_OVERRIDES");
    const poolIdx = examplesSource.indexOf('"pool_service"', slugObjIdx);
    // Count objection entries in the pool_service block by counting 'objection:' strings
    // until the next top-level key (another slug or closing brace at same level)
    const poolBlock = examplesSource.slice(poolIdx, poolIdx + 1500);
    const objectionCount = (poolBlock.match(/objection:/g) || []).length;
    expect(objectionCount).toBeGreaterThanOrEqual(3);
  });
});

// ===== Cross-mode safety =====

describe("cross-mode safety: pool_service changes don't break other industries", () => {
  const nonPoolSlugs = ["hvac", "plumbing", "locksmith", "electrical", "landscaping"];

  it("other industries still have their services intact", () => {
    for (const slug of nonPoolSlugs) {
      const entry = getIndustryBySlug(slug);
      expect(entry, `${slug} should still exist in industryCatalog`).toBeDefined();
      expect(entry!.services.length, `${slug} should have services`).toBeGreaterThan(0);
    }
  });

  it("pool_service contextFields do NOT appear on hvac entry", () => {
    const hvacEntry = getIndustryBySlug("hvac");
    const hvacFieldKeys = hvacEntry!.contextFields?.map((f) => f.key) ?? [];
    // Pool-specific fields must not bleed into hvac
    expect(hvacFieldKeys).not.toContain("has_salt_system");
    expect(hvacFieldKeys).not.toContain("surface_type");
  });

  it("hvac still has HVAC-specific context fields", () => {
    const hvacEntry = getIndustryBySlug("hvac");
    const hvacFieldKeys = hvacEntry!.contextFields?.map((f) => f.key) ?? [];
    expect(hvacFieldKeys.length).toBeGreaterThan(0);
  });

  it("total industry count didn't decrease (no deletions)", () => {
    // Should have at least the expected number of industries
    expect(industryCatalog.length).toBeGreaterThanOrEqual(25);
  });
});

// ===== Brain fix: service descriptions + objection quality (brain-r1-fixes) =====

describe("industryCatalog: pool_service service descriptions (brain-r1-fixes)", () => {
  const poolEntry = getIndustryBySlug("pool_service");

  it("all pool_service services have descriptions", () => {
    const servicesWithoutDesc = poolEntry!.services.filter(
      (s) => !s.description || s.description.trim() === ""
    );
    expect(servicesWithoutDesc).toHaveLength(0);
  });

  it("Weekly Cleaning description mentions key activities", () => {
    const svc = poolEntry!.services.find((s) => s.name === "Weekly Cleaning");
    expect(svc!.description).toBeTruthy();
    expect(svc!.description!.toLowerCase()).toMatch(/skim|brush|vacuum|chemical/);
  });

  it("Green-to-Clean description mentions urgency/timeline", () => {
    const svc = poolEntry!.services.find((s) => s.name.includes("Green-to-Clean"));
    expect(svc!.description).toBeTruthy();
    expect(svc!.description!.toLowerCase()).toMatch(/hour|shock|algae/);
  });

  it("Equipment Repair description mentions upfront quote", () => {
    const svc = poolEntry!.services.find((s) => s.name === "Equipment Repair");
    expect(svc!.description).toBeTruthy();
    expect(svc!.description!.toLowerCase()).toMatch(/quote|upfront/);
  });

  it("Monthly Maintenance Plan description mentions chemicals included", () => {
    const svc = poolEntry!.services.find(
      (s) => s.name.includes("Monthly") || s.name.includes("Maintenance Plan")
    );
    expect(svc!.description).toBeTruthy();
    expect(svc!.description!.toLowerCase()).toMatch(/chemical|plan|include/);
  });
});

describe("industryCatalog: pool_service objection quality (brain-r1-fixes)", () => {
  const poolEntry = getIndustryBySlug("pool_service");

  it("has at least 4 pool-specific objections", () => {
    expect(poolEntry!.objections.length).toBeGreaterThanOrEqual(4);
  });

  it("has pool-maintenance-specific price objection (not generic 'That's too expensive')", () => {
    const priceObj = poolEntry!.objections.find((o) =>
      o.objection.toLowerCase().includes("expensive") ||
      o.objection.toLowerCase().includes("too expensive")
    );
    expect(priceObj).toBeDefined();
    // Pool-specific response should mention pool costs or pool maintenance
    expect(priceObj!.response.toLowerCase()).toMatch(/pool|green|repair|chemical|\$125|\$150/);
  });

  it("does NOT have generic 'I'll call back later' objection", () => {
    const generic = poolEntry!.objections.find((o) =>
      o.objection.toLowerCase() === "i'll call back later" ||
      o.objection.toLowerCase() === "i'll call back later"
    );
    expect(generic).toBeUndefined();
  });

  it("does NOT have generic 'I'm just shopping around' objection", () => {
    const generic = poolEntry!.objections.find((o) =>
      o.objection.toLowerCase().includes("shopping around")
    );
    expect(generic).toBeUndefined();
  });

  it("seasonal objection response mentions packages or discount", () => {
    const seasonal = poolEntry!.objections.find((o) =>
      o.objection.toLowerCase().includes("seasonal")
    );
    expect(seasonal).toBeDefined();
    expect(seasonal!.response.toLowerCase()).toMatch(/package|discount|bundle|swim/);
  });
});
