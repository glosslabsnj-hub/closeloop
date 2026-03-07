/**
 * Slug-Aware Industry Examples Regression Tests
 *
 * @vitest-environment node
 *
 * Commit 13e7229 (2026-03-06): Added SLUG_PROFILE_OVERRIDES and
 * getSlugProfileExamples() so industry-specific business name placeholder
 * examples appear in the Brain profile editor.
 *
 * Before: An electrician saw "Acme Plumbing, Elite Detailing" in the
 * business name placeholder. A plumber saw the same generic service examples.
 *
 * After: getSlugProfileExamples("service", "electrical") returns
 * "Bright Spark Electric, Reliable Wiring Co., Power Pro Electrical".
 *
 * These tests verify:
 * 1. getSlugProfileExamples() merges slug overrides on top of mode defaults
 * 2. Slug overrides are present for all key home_services industries
 * 3. Non-overridden slugs fall back to mode defaults
 * 4. getSlugServiceExamples() returns slug-specific service examples
 * 5. SLUG_COMPLEXITY_OVERRIDES and SLUG_PRICE_FACTOR_OVERRIDES have key slugs
 *
 * Business impact: Each industry sees realistic placeholder examples that match
 * their actual business. This improves onboarding quality and builds trust.
 *
 * Gate: service onboarding/non_technical_usable (Brain profile UX)
 */
import { describe, it, expect } from "vitest";
import {
  getSlugProfileExamples,
  getSlugServiceExamples,
  getProfileExamples,
  getServiceExamples,
  SLUG_COMPLEXITY_OVERRIDES,
  SLUG_PRICE_FACTOR_OVERRIDES,
} from "../src/lib/industryExamples";

// ---------------------------------------------------------------------------
// getSlugProfileExamples: slug overrides applied correctly
// ---------------------------------------------------------------------------

describe("getSlugProfileExamples: electrical slug", () => {
  const result = getSlugProfileExamples("service", "electrical");

  it("returns electrical-specific business name placeholder", () => {
    expect(result.businessNamePlaceholder).toContain("Electric");
    expect(result.businessNamePlaceholder).not.toContain("Acme Plumbing");
    expect(result.businessNamePlaceholder).not.toContain("Elite Detailing");
  });

  it("returns electrical-specific tagline placeholder", () => {
    expect(result.taglinePlaceholder.toLowerCase()).toContain("electric");
  });

  it("returns electrical-specific tagline hint", () => {
    expect(result.taglineHint.toLowerCase()).toMatch(/licensed|bonded|insured|electrical/);
  });
});

describe("getSlugProfileExamples: plumbing slug", () => {
  const result = getSlugProfileExamples("service", "plumbing");

  it("returns plumbing-specific business name placeholder", () => {
    expect(result.businessNamePlaceholder.toLowerCase()).toContain("plumb");
    expect(result.businessNamePlaceholder).not.toContain("Acme Plumbing");
  });

  it("returns plumbing-specific tagline", () => {
    expect(result.taglinePlaceholder.toLowerCase()).toContain("plumb");
  });
});

describe("getSlugProfileExamples: hvac slug", () => {
  const result = getSlugProfileExamples("service", "hvac");

  it("returns HVAC-specific business name placeholder", () => {
    const lower = result.businessNamePlaceholder.toLowerCase();
    expect(lower).toMatch(/hvac|heating|cooling|comfort/);
    expect(result.businessNamePlaceholder).not.toContain("Acme Plumbing");
  });
});

describe("getSlugProfileExamples: hair-salon slug", () => {
  const result = getSlugProfileExamples("service", "hair-salon");

  it("returns salon-specific business name placeholder", () => {
    const lower = result.businessNamePlaceholder.toLowerCase();
    expect(lower).toMatch(/salon|studio|beauty|hair/);
  });

  it("has salon-appropriate tagline", () => {
    const lower = result.taglinePlaceholder.toLowerCase();
    expect(lower).toMatch(/hair|salon|beauty/);
  });
});

describe("getSlugProfileExamples: towing slug", () => {
  const result = getSlugProfileExamples("dispatch", "towing");

  it("returns towing-specific business name placeholder", () => {
    const lower = result.businessNamePlaceholder.toLowerCase();
    expect(lower).toMatch(/tow|roadside/);
  });
});

describe("getSlugProfileExamples: dental slug", () => {
  const result = getSlugProfileExamples("medical", "dental");

  it("returns dental-specific business name placeholder", () => {
    const lower = result.businessNamePlaceholder.toLowerCase();
    expect(lower).toMatch(/dental|smile/);
  });

  it("has patient-friendly tagline", () => {
    const lower = result.taglinePlaceholder.toLowerCase();
    expect(lower).toMatch(/dental|care|gentle|comfortable/);
  });
});

// ---------------------------------------------------------------------------
// Fallback: unknown slug returns mode default
// ---------------------------------------------------------------------------

describe("getSlugProfileExamples: unknown slug falls back to mode default", () => {
  it("unknown slug → mode base (no crash, no empty result)", () => {
    const result = getSlugProfileExamples("service", "unknown-industry-xyz");
    const modeDefault = getProfileExamples("service");
    expect(result.businessNamePlaceholder).toBe(modeDefault.businessNamePlaceholder);
    expect(result.taglinePlaceholder).toBe(modeDefault.taglinePlaceholder);
  });

  it("null slug → mode base", () => {
    const result = getSlugProfileExamples("service", null);
    const modeDefault = getProfileExamples("service");
    expect(result.businessNamePlaceholder).toBe(modeDefault.businessNamePlaceholder);
  });

  it("undefined slug → mode base", () => {
    const result = getSlugProfileExamples("service", undefined);
    const modeDefault = getProfileExamples("service");
    expect(result.businessNamePlaceholder).toBe(modeDefault.businessNamePlaceholder);
  });
});

// ---------------------------------------------------------------------------
// getSlugServiceExamples: slug-specific service catalog placeholders
// ---------------------------------------------------------------------------

describe("getSlugServiceExamples: electrical slug", () => {
  const result = getSlugServiceExamples("service", "electrical");

  it("returns electrical-specific service name placeholder", () => {
    expect(result.serviceNamePlaceholder.toLowerCase()).toMatch(/outlet|panel|ev charger|wiring/);
  });

  it("returns electrical-specific price examples (EV charger, outlet install)", () => {
    expect(result.priceExamples.toLowerCase()).toMatch(/outlet|ev charger|panel/);
  });

  it("includes permit mention in description placeholder", () => {
    expect(result.descriptionPlaceholder.toLowerCase()).toContain("permit");
  });
});

describe("getSlugServiceExamples: plumbing slug", () => {
  const result = getSlugServiceExamples("service", "plumbing");

  it("returns plumbing-specific service name placeholder", () => {
    expect(result.serviceNamePlaceholder.toLowerCase()).toMatch(/drain|water heater|pipe/);
  });

  it("price examples reference plumbing services", () => {
    expect(result.priceExamples.toLowerCase()).toMatch(/drain|water heater/);
  });
});

describe("getSlugServiceExamples: hair-salon slug", () => {
  const result = getSlugServiceExamples("service", "hair-salon");

  it("returns salon-specific service name placeholder", () => {
    const lower = result.serviceNamePlaceholder.toLowerCase();
    expect(lower).toMatch(/cut|balayage|keratin|blowout/);
  });

  it("price examples reference salon services", () => {
    const lower = result.priceExamples.toLowerCase();
    expect(lower).toMatch(/cut|balayage/);
  });
});

describe("getSlugServiceExamples: auto-detailing slug", () => {
  const result = getSlugServiceExamples("service", "auto-detailing");

  it("serviceName is 'package' for auto detailing", () => {
    expect(result.serviceName).toBe("package");
  });

  it("service name placeholder references detailing services", () => {
    const lower = result.serviceNamePlaceholder.toLowerCase();
    expect(lower).toMatch(/wash|detail|ceramic/);
  });
});

describe("getSlugServiceExamples: unknown slug falls back to mode default", () => {
  it("unknown slug → mode base (no crash)", () => {
    const result = getSlugServiceExamples("service", "unknown-xyz");
    const modeDefault = getServiceExamples("service");
    expect(result.serviceNamePlaceholder).toBe(modeDefault.serviceNamePlaceholder);
  });
});

// ---------------------------------------------------------------------------
// SLUG_COMPLEXITY_OVERRIDES: key industries have complexity hints
// ---------------------------------------------------------------------------

describe("SLUG_COMPLEXITY_OVERRIDES: key home_services industries covered", () => {
  const requiredSlugs = ["electrical", "plumbing", "hvac", "auto-repair", "auto-detailing", "cleaning", "landscaping"];

  for (const slug of requiredSlugs) {
    it(`${slug} has complexity override`, () => {
      expect(SLUG_COMPLEXITY_OVERRIDES[slug]).toBeDefined();
    });

    it(`${slug} simple hint is non-empty string`, () => {
      expect(SLUG_COMPLEXITY_OVERRIDES[slug].simple.length).toBeGreaterThan(0);
    });

    it(`${slug} complex hint is non-empty string`, () => {
      expect(SLUG_COMPLEXITY_OVERRIDES[slug].complex.length).toBeGreaterThan(0);
    });
  }

  it("electrical simple hint references small jobs (outlet/fixture)", () => {
    const hint = SLUG_COMPLEXITY_OVERRIDES["electrical"].simple.toLowerCase();
    expect(hint).toMatch(/outlet|light|fixture|switch/);
  });

  it("electrical complex hint references panel/rewiring", () => {
    const hint = SLUG_COMPLEXITY_OVERRIDES["electrical"].complex.toLowerCase();
    expect(hint).toMatch(/panel|rewir|inspection/);
  });
});

// ---------------------------------------------------------------------------
// SLUG_PRICE_FACTOR_OVERRIDES: pricing context hints per industry
// ---------------------------------------------------------------------------

describe("SLUG_PRICE_FACTOR_OVERRIDES: key industries have pricing context", () => {
  const requiredSlugs = ["electrical", "plumbing", "hvac", "roofing", "cleaning", "auto-repair"];

  for (const slug of requiredSlugs) {
    it(`${slug} has price factor override`, () => {
      expect(SLUG_PRICE_FACTOR_OVERRIDES[slug]).toBeDefined();
    });

    it(`${slug} price factor hint is non-empty`, () => {
      expect(SLUG_PRICE_FACTOR_OVERRIDES[slug].length).toBeGreaterThan(0);
    });
  }

  it("electrical price factor hint mentions permit or commercial/residential", () => {
    const hint = SLUG_PRICE_FACTOR_OVERRIDES["electrical"].toLowerCase();
    expect(hint).toMatch(/permit|commercial|residential|panel/);
  });

  it("towing price factor hint mentions distance", () => {
    const hint = SLUG_PRICE_FACTOR_OVERRIDES["towing"].toLowerCase();
    expect(hint).toContain("distance");
  });
});

// ---------------------------------------------------------------------------
// Cross-check: no slug has an empty businessNamePlaceholder override
// ---------------------------------------------------------------------------

describe("SLUG_PROFILE_OVERRIDES quality: no empty placeholders", () => {
  // Test key slugs that have overrides
  const slugsWithOverrides = [
    { slug: "electrical", mode: "service" as const },
    { slug: "plumbing", mode: "service" as const },
    { slug: "hvac", mode: "service" as const },
    { slug: "hair-salon", mode: "service" as const },
    { slug: "barbershop", mode: "service" as const },
    { slug: "auto-repair", mode: "service" as const },
    { slug: "dental", mode: "medical" as const },
    { slug: "towing", mode: "dispatch" as const },
    { slug: "cleaning", mode: "service" as const },
    { slug: "roofing", mode: "service" as const },
    { slug: "landscaping", mode: "service" as const },
  ];

  for (const { slug, mode } of slugsWithOverrides) {
    it(`${slug} (${mode}) businessNamePlaceholder is non-empty`, () => {
      const result = getSlugProfileExamples(mode, slug);
      expect(result.businessNamePlaceholder.length).toBeGreaterThan(0);
    });

    it(`${slug} (${mode}) does NOT show generic 'Acme Plumbing' for non-service slugs`, () => {
      if (slug !== "plumbing") {
        const result = getSlugProfileExamples(mode, slug);
        expect(result.businessNamePlaceholder).not.toBe("Acme Plumbing, Elite Detailing, Sunrise Cleaning");
      }
    });
  }
});
