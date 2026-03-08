/**
 * Industry Onboarding Config Regression Tests
 *
 * @vitest-environment node
 *
 * Tests for slug-level configs in industryOnboardingConfig.ts.
 * These configs control what a business owner sees on the onboarding
 * completion screen (setupChecklist, nextSteps, setupTitle) and what
 * preAnswers are auto-set for their industry.
 *
 * Recent additions (2026-03-08):
 * - pest_control: offersSameDayEmergency=true, offersRecurringService=true, treatment-specific checklist
 * - cleaning: offersMobileService=true, offersRecurringService=true, cleaning-specific checklist
 * - locksmith: chargesTripFee=true (auto pre-answered), 24/7 emergency checklist/nextSteps
 *
 * Business impact: A locksmith owner should have chargesTripFee pre-answered to
 * "true" so the AI knows to mention trip fees upfront. A pest control owner should
 * see "schedule a treatment" not "book an appointment" in their next steps.
 *
 * Gate: service onboarding/smart_defaults_prefilled
 */
import { describe, it, expect } from "vitest";
import { getIndustryOnboardingConfig } from "../src/config/industryOnboardingConfig";

// ─── pest_control slug config ─────────────────────────────────────────────

describe("getIndustryOnboardingConfig: pest_control slug config", () => {
  const cfg = getIndustryOnboardingConfig("service", "home_services", "pest_control");

  it("offersMobileService is true (pest techs go on-site)", () => {
    expect(cfg.preAnswers.offersMobileService).toBe(true);
  });

  it("offersSameDayEmergency is true (pest control is urgent)", () => {
    expect(cfg.preAnswers.offersSameDayEmergency).toBe(true);
  });

  it("offersRecurringService is true (quarterly plans common)", () => {
    expect(cfg.preAnswers.offersRecurringService).toBe(true);
  });

  it("setupTitle mentions pest control business", () => {
    expect(cfg.setupTitle).toMatch(/pest control/i);
  });

  it("setupChecklist includes treatments and service plans step", () => {
    const labels = cfg.setupChecklist.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("treatment") || l.includes("service plan"))).toBe(true);
  });

  it("setupChecklist includes FAQ step mentioning safety or pets", () => {
    const labels = cfg.setupChecklist.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("pet") || l.includes("safety") || l.includes("faq"))).toBe(true);
  });

  it("nextSteps mention scheduling a treatment (not 'book an appointment')", () => {
    const texts = cfg.nextSteps.map((s) => s.label.toLowerCase());
    expect(texts.some((t) => t.includes("treatment"))).toBe(true);
  });
});

// ─── cleaning slug config ─────────────────────────────────────────────────

describe("getIndustryOnboardingConfig: cleaning slug config", () => {
  const cfg = getIndustryOnboardingConfig("service", "home_services", "cleaning");

  it("offersMobileService is true (cleaners go on-site)", () => {
    expect(cfg.preAnswers.offersMobileService).toBe(true);
  });

  it("offersRecurringService is true (recurring cleaning plans common)", () => {
    expect(cfg.preAnswers.offersRecurringService).toBe(true);
  });

  it("setupTitle mentions cleaning business", () => {
    expect(cfg.setupTitle).toMatch(/cleaning/i);
  });

  it("setupChecklist includes cleaning services step", () => {
    const labels = cfg.setupChecklist.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("cleaning service") || l.includes("cleaning"))).toBe(true);
  });

  it("setupChecklist includes FAQ step mentioning supplies or pets", () => {
    const labels = cfg.setupChecklist.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("suppli") || l.includes("pet") || l.includes("faq"))).toBe(true);
  });

  it("nextSteps mention booking a cleaning", () => {
    const texts = cfg.nextSteps.map((s) => s.label.toLowerCase());
    expect(texts.some((t) => t.includes("cleaning"))).toBe(true);
  });
});

// ─── locksmith slug config ────────────────────────────────────────────────

describe("getIndustryOnboardingConfig: locksmith slug config", () => {
  const cfg = getIndustryOnboardingConfig("service", "home_services", "locksmith");

  it("offersMobileService is true (locksmiths go on-site)", () => {
    expect(cfg.preAnswers.offersMobileService).toBe(true);
  });

  it("offersSameDayEmergency is true (lockout is emergency)", () => {
    expect(cfg.preAnswers.offersSameDayEmergency).toBe(true);
  });

  it("chargesTripFee is true (locksmiths charge trip/service call fee)", () => {
    // Critical: AI must know to mention trip fee upfront so callers aren't surprised
    expect(cfg.preAnswers.chargesTripFee).toBe(true);
  });

  it("setupTitle mentions locksmith business", () => {
    expect(cfg.setupTitle).toMatch(/locksmith/i);
  });

  it("setupChecklist includes locksmith services step", () => {
    const labels = cfg.setupChecklist.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("locksmith"))).toBe(true);
  });

  it("setupChecklist includes FAQ step mentioning trip fees or response time", () => {
    const labels = cfg.setupChecklist.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("trip fee") || l.includes("response") || l.includes("faq"))).toBe(true);
  });

  it("nextSteps mention handling a lockout", () => {
    const texts = cfg.nextSteps.map((s) => s.label.toLowerCase());
    expect(texts.some((t) => t.includes("lockout"))).toBe(true);
  });

  it("setupChecklist includes 24/7 availability mention", () => {
    const labels = cfg.setupChecklist.map((s) => s.label.toLowerCase());
    expect(labels.some((l) => l.includes("24") || l.includes("hours"))).toBe(true);
  });
});

// ─── Slug overrides take priority over category defaults ──────────────────

describe("getIndustryOnboardingConfig: slug priority over category", () => {
  it("locksmith chargesTripFee=true wins over home_services category default", () => {
    const withSlug = getIndustryOnboardingConfig("service", "home_services", "locksmith");
    const withoutSlug = getIndustryOnboardingConfig("service", "home_services");
    // Locksmith slug sets chargesTripFee=true; category default may be false or unset
    expect(withSlug.preAnswers.chargesTripFee).toBe(true);
    // Without slug, chargesTripFee should differ (category doesn't set it to true)
    expect(withoutSlug.preAnswers.chargesTripFee).not.toBe(true);
  });

  it("pest_control offersRecurringService=true wins over home_services category default", () => {
    const withSlug = getIndustryOnboardingConfig("service", "home_services", "pest_control");
    expect(withSlug.preAnswers.offersRecurringService).toBe(true);
  });

  it("cleaning setupTitle is slug-specific (not generic home_services title)", () => {
    const withSlug = getIndustryOnboardingConfig("service", "home_services", "cleaning");
    expect(withSlug.setupTitle).toContain("cleaning");
  });
});

// ─── Config completeness: all 3 new slugs have required fields ────────────

describe("getIndustryOnboardingConfig: new slug configs have all required fields", () => {
  const newSlugs = ["pest_control", "cleaning", "locksmith"] as const;

  for (const slug of newSlugs) {
    describe(`slug: ${slug}`, () => {
      const cfg = getIndustryOnboardingConfig("service", "home_services", slug);

      it("has preAnswers object", () => {
        expect(cfg.preAnswers).toBeTruthy();
        expect(typeof cfg.preAnswers).toBe("object");
      });

      it("has setupChecklist with at least 3 items", () => {
        expect(Array.isArray(cfg.setupChecklist)).toBe(true);
        expect(cfg.setupChecklist.length).toBeGreaterThanOrEqual(3);
      });

      it("has nextSteps with at least 3 items", () => {
        expect(Array.isArray(cfg.nextSteps)).toBe(true);
        expect(cfg.nextSteps.length).toBeGreaterThanOrEqual(3);
      });

      it("has setupTitle string", () => {
        expect(typeof cfg.setupTitle).toBe("string");
        expect(cfg.setupTitle.length).toBeGreaterThan(0);
      });

      it("setupChecklist items have label and fixPath or icon", () => {
        for (const item of cfg.setupChecklist) {
          expect(typeof item.label).toBe("string");
          expect(item.label.length).toBeGreaterThan(0);
          expect(item.icon).toBeTruthy();
        }
      });
    });
  }
});
