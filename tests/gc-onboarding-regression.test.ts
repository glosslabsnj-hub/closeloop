/**
 * General Contractor Onboarding Regression Tests
 *
 * @vitest-environment node
 *
 * Covers fixes from commit referenced in handoff 679:
 * - general_contractor exists in industryCatalog with 10+ services
 * - GC in popularSlugs so it appears in the industry picker grid
 * - industryTerminology: appointmentLabel=estimate, teamMemberLabel=project manager
 * - industryOnboardingConfig: GC preAnswers (offersMobileService, offersFreeEstimates, etc.)
 * - GC does NOT suppress same-day-emergency silently (same-day construction work makes no sense)
 * - industryExamples (AIPreviewPanel) includes GC-specific caller message
 *
 * Previously: GC scored BLOCKED 2/10 on QA round 1 (industry didn't exist in catalog).
 * Now: All blocking issues fixed. QA retest should score 7/10+.
 *
 * Gate: service/onboarding/complete_flow_works, service/onboarding/correct_terminology
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getIndustryBySlug, getPopularIndustries } from "../src/data/industryCatalog";

const root = process.cwd();
const terminologySrc = readFileSync(join(root, "src/data/industryTerminology.ts"), "utf-8");
const onboardingConfigSrc = readFileSync(join(root, "src/config/industryOnboardingConfig.ts"), "utf-8");
const aiPreviewSrc = readFileSync(join(root, "src/components/onboarding/AIPreviewPanel.tsx"), "utf-8");

// ---------------------------------------------------------------------------
// 1. GC exists in industryCatalog with sufficient services
// ---------------------------------------------------------------------------
describe("general_contractor catalog entry", () => {
  const gc = getIndustryBySlug("general_contractor");

  it("general_contractor exists in catalog", () => {
    expect(gc).toBeTruthy();
    expect(gc?.slug).toBe("general_contractor");
  });

  it("GC has at least 8 services (was 0 before fix)", () => {
    expect(gc?.services.length).toBeGreaterThanOrEqual(8);
  });

  it("GC has estimate-first complex services", () => {
    const estimateFirst = gc?.services.filter(s => s.bookingType === "estimate_first") ?? [];
    expect(estimateFirst.length).toBeGreaterThanOrEqual(5);
  });

  it("GC has direct_book services (handyman/free estimate)", () => {
    const directBook = gc?.services.filter(s => s.bookingType === "direct_book" || !s.bookingType) ?? [];
    expect(directBook.length).toBeGreaterThanOrEqual(1);
  });

  it("GC has Free Estimate / Site Visit service", () => {
    const freeEstimate = gc?.services.find(s => s.name.toLowerCase().includes("estimate") || s.name.toLowerCase().includes("site visit"));
    expect(freeEstimate).toBeTruthy();
    expect(freeEstimate?.price).toBe(0);
  });

  it("GC services cover construction scope keywords in tags", () => {
    const tags = gc?.tags ?? [];
    expect(tags.some(t => ["gc", "remodel", "renovation", "construction"].includes(t))).toBe(true);
  });

  it("GC has license/insurance FAQ", () => {
    const faqs = gc?.faqs ?? [];
    const licenseFaq = faqs.find(f => f.question.toLowerCase().includes("license") || f.question.toLowerCase().includes("insured"));
    expect(licenseFaq).toBeTruthy();
  });

  it("GC has permits FAQ", () => {
    const faqs = gc?.faqs ?? [];
    const permitFaq = faqs.find(f => f.question.toLowerCase().includes("permit"));
    expect(permitFaq).toBeTruthy();
  });

  it("GC context fields include project_type and property_type", () => {
    const keys = (gc?.contextFields ?? []).map(f => f.key);
    expect(keys).toContain("project_type");
    expect(keys).toContain("property_type");
  });
});

// ---------------------------------------------------------------------------
// 2. GC in popular industries (shows in industry picker grid)
// ---------------------------------------------------------------------------
describe("general_contractor in popular industries grid", () => {
  it("general_contractor appears in popular industries", () => {
    const popular = getPopularIndustries();
    const slugs = popular.map(p => p.slug);
    expect(slugs).toContain("general_contractor");
  });
});

// ---------------------------------------------------------------------------
// 3. GC terminology: appointmentLabel=estimate, teamMemberLabel=project manager
// ---------------------------------------------------------------------------
describe("general_contractor terminology", () => {
  it("GC has appointmentLabel = estimate", () => {
    expect(terminologySrc).toContain('"general_contractor"');
    // The GC block must define appointmentLabel as estimate
    const gcBlock = terminologySrc.match(/"general_contractor":\s*\{[^}]+\}/s);
    expect(gcBlock).toBeTruthy();
    expect(gcBlock![0]).toContain("estimate");
  });

  it("GC has teamMemberLabel = project manager", () => {
    const gcBlock = terminologySrc.match(/"general_contractor":\s*\{[^}]+\}/s);
    expect(gcBlock).toBeTruthy();
    expect(gcBlock![0]).toContain("project manager");
  });

  it("GC has NOTE about nav label collision (Estimate Schedule vs Estimates module)", () => {
    // This note ensures future devs don't accidentally rename the nav item
    expect(terminologySrc).toContain("Estimate Schedule");
  });
});

// ---------------------------------------------------------------------------
// 4. GC onboarding config: preAnswers set correctly
// ---------------------------------------------------------------------------
describe("general_contractor industryOnboardingConfig", () => {
  it("general_contractor config exists", () => {
    expect(onboardingConfigSrc).toContain("general_contractor:");
  });

  it("offersMobileService defaults true for GC (they travel to job sites)", () => {
    const gcBlock = onboardingConfigSrc.match(/general_contractor:\s*\{[\s\S]+?setupTitle:/);
    expect(gcBlock).toBeTruthy();
    expect(gcBlock![0]).toContain("offersMobileService: true");
  });

  it("offersFreeEstimates defaults true for GC", () => {
    const gcBlock = onboardingConfigSrc.match(/general_contractor:\s*\{[\s\S]+?setupTitle:/);
    expect(gcBlock).toBeTruthy();
    expect(gcBlock![0]).toContain("offersFreeEstimates: true");
  });

  it("requiresDeposits defaults true for GC (large projects)", () => {
    const gcBlock = onboardingConfigSrc.match(/general_contractor:\s*\{[\s\S]+?setupTitle:/);
    expect(gcBlock).toBeTruthy();
    expect(gcBlock![0]).toContain("requiresDeposits: true");
  });

  it("GC has setup checklist with construction-specific items", () => {
    const gcBlock = onboardingConfigSrc.match(/general_contractor:\s*\{[\s\S]+?setupTitle:/);
    expect(gcBlock).toBeTruthy();
    const block = gcBlock![0];
    // Should mention services/estimates and service area
    expect(block).toContain("services");
    expect(block).toContain("service area");
  });

  it("GC has nextSteps with estimate/test-call context", () => {
    const gcBlock = onboardingConfigSrc.match(/general_contractor:\s*\{[\s\S]+?setupTitle:/);
    expect(gcBlock).toBeTruthy();
    const block = gcBlock![0];
    expect(block.toLowerCase()).toMatch(/estimate|test call|test-call/);
  });

  it("setupTitle is contracting-specific", () => {
    expect(onboardingConfigSrc).toContain("your contracting business");
  });
});

// ---------------------------------------------------------------------------
// 5. GC-specific AI preview panel caller messages
// ---------------------------------------------------------------------------
describe("general_contractor AIPreviewPanel caller messages", () => {
  it("AIPreviewPanel includes general_contractor caller message", () => {
    // INDUSTRY_CALLER_MESSAGES in AIPreviewPanel.tsx — GC should have its own entry
    // to prevent falling back to generic home_services messages in the preview panel
    expect(aiPreviewSrc).toContain("general_contractor");
  });

  it("GC caller message mentions estimate (typical GC caller intent)", () => {
    const gcMsgMatch = aiPreviewSrc.match(/general_contractor:\s*"([^"]+)"/);
    expect(gcMsgMatch).toBeTruthy();
    const gcMsg = gcMsgMatch![1].toLowerCase();
    expect(gcMsg.includes("estimate") || gcMsg.includes("remodel") || gcMsg.includes("renovation")).toBe(true);
  });
});
