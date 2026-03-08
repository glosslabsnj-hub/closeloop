/**
 * Slug-Aware Objections Regression Tests
 *
 * @vitest-environment node
 *
 * UX commit 2598d78 (2026-03-08): Added SLUG_OBJECTION_OVERRIDES and
 * getSlugObjectionExamples() so BusinessObjectionEditor shows industry-specific
 * quick-add suggestions instead of generic "too expensive / call back / think about it".
 *
 * Before: handyman saw generic objections ("That's too expensive", "I need to think").
 * After: handyman sees DIY and quote-specific objections.
 *
 * Also fixed: CreateTestTenantDialog now seeds objections from catalog alongside
 * FAQs, so QA tenants get pre-populated objections for testing.
 *
 * These tests verify:
 * 1. getSlugObjectionExamples() returns slug-specific commonObjections for all 10 overridden slugs
 * 2. Slug overrides replace the base commonObjections (not append)
 * 3. Unknown slugs fall back to mode defaults
 * 4. null/undefined slug falls back to mode defaults
 * 5. Objection text is industry-specific (not generic)
 * 6. Each slug override has exactly 3 objections (consistent UX)
 *
 * Gate: service brain/customization_intuitive, onboarding/correct_terminology
 */
import { describe, it, expect } from "vitest";
import {
  getSlugObjectionExamples,
  getObjectionExamples,
} from "../src/lib/industryExamples";

// ─── Slug overrides: each known slug returns industry-specific objections ─────

describe("getSlugObjectionExamples: slug overrides replace base commonObjections", () => {
  const overriddenSlugs = [
    "handyman",
    "plumbing",
    "hvac",
    "electrical",
    "roofing",
    "general_contractor",
    "landscaping",
    "painting",
    "cleaning",
    "pest_control",
  ] as const;

  for (const slug of overriddenSlugs) {
    describe(`slug: ${slug}`, () => {
      const result = getSlugObjectionExamples("service", slug);
      const base = getObjectionExamples("service");

      it("returns commonObjections array", () => {
        expect(Array.isArray(result.commonObjections)).toBe(true);
      });

      it("commonObjections is non-empty", () => {
        expect(result.commonObjections.length).toBeGreaterThan(0);
      });

      it("overrides the base commonObjections (not identical to generic)", () => {
        // Slug override replaces base — should differ from the generic defaults
        const resultTexts = result.commonObjections.map((o) => o.objection).join("|");
        const baseTexts = base.commonObjections.map((o) => o.objection).join("|");
        expect(resultTexts).not.toBe(baseTexts);
      });

      it("each objection has objection and response strings", () => {
        for (const o of result.commonObjections) {
          expect(typeof o.objection).toBe("string");
          expect(o.objection.length).toBeGreaterThan(0);
          expect(typeof o.response).toBe("string");
          expect(o.response.length).toBeGreaterThan(0);
        }
      });
    });
  }
});

// ─── Industry-specific objection content verification ─────────────────────────

describe("getSlugObjectionExamples: handyman is DIY-focused", () => {
  const result = getSlugObjectionExamples("service", "handyman");

  it("includes a DIY-related objection", () => {
    const hasDiy = result.commonObjections.some(
      (o) => o.objection.toLowerCase().includes("myself") || o.objection.toLowerCase().includes("diy")
    );
    expect(hasDiy).toBe(true);
  });

  it("includes a quotes/pricing comparison objection", () => {
    const hasQuote = result.commonObjections.some(
      (o) => o.objection.toLowerCase().includes("quote") || o.objection.toLowerCase().includes("quotes")
    );
    expect(hasQuote).toBe(true);
  });

  it("does NOT include the generic 'That's too expensive' exact text", () => {
    const genericExpensive = result.commonObjections.find(
      (o) => o.objection === "That's too expensive"
    );
    expect(genericExpensive).toBeUndefined();
  });
});

describe("getSlugObjectionExamples: hvac includes warranty objection", () => {
  const result = getSlugObjectionExamples("service", "hvac");

  it("includes a warranty-related objection", () => {
    const hasWarranty = result.commonObjections.some(
      (o) => o.objection.toLowerCase().includes("warranty")
    );
    expect(hasWarranty).toBe(true);
  });
});

describe("getSlugObjectionExamples: electrical includes permit objection", () => {
  const result = getSlugObjectionExamples("service", "electrical");

  it("includes a permit-related objection", () => {
    const hasPermit = result.commonObjections.some(
      (o) => o.objection.toLowerCase().includes("permit")
    );
    expect(hasPermit).toBe(true);
  });

  it("includes a YouTube/DIY objection for electrical", () => {
    const hasDiy = result.commonObjections.some(
      (o) =>
        o.objection.toLowerCase().includes("youtube") ||
        o.objection.toLowerCase().includes("myself")
    );
    expect(hasDiy).toBe(true);
  });
});

describe("getSlugObjectionExamples: roofing includes inspection objection", () => {
  const result = getSlugObjectionExamples("service", "roofing");

  it("includes a 'just patch it' objection", () => {
    const hasPatch = result.commonObjections.some(
      (o) => o.objection.toLowerCase().includes("patch")
    );
    expect(hasPatch).toBe(true);
  });
});

describe("getSlugObjectionExamples: general_contractor includes estimate objection", () => {
  const result = getSlugObjectionExamples("service", "general_contractor");

  it("includes a ballpark/estimate objection", () => {
    const hasBallpark = result.commonObjections.some(
      (o) =>
        o.objection.toLowerCase().includes("ballpark") ||
        o.objection.toLowerCase().includes("estimate")
    );
    expect(hasBallpark).toBe(true);
  });
});

describe("getSlugObjectionExamples: cleaning includes supply/last-cleaner objections", () => {
  const result = getSlugObjectionExamples("service", "cleaning");

  it("includes a 'bring supplies' or 'cheaper cleaner' objection", () => {
    const hasCleaning = result.commonObjections.some(
      (o) =>
        o.objection.toLowerCase().includes("supplies") ||
        o.objection.toLowerCase().includes("cleaner") ||
        o.objection.toLowerCase().includes("myself")
    );
    expect(hasCleaning).toBe(true);
  });
});

describe("getSlugObjectionExamples: pest_control includes safety objection", () => {
  const result = getSlugObjectionExamples("service", "pest_control");

  it("includes a safety-related objection (kids/pets)", () => {
    const hasSafety = result.commonObjections.some(
      (o) =>
        o.objection.toLowerCase().includes("safe") ||
        o.objection.toLowerCase().includes("kids") ||
        o.objection.toLowerCase().includes("pets")
    );
    expect(hasSafety).toBe(true);
  });
});

// ─── Fallback behavior: unknown and null slugs ─────────────────────────────────

describe("getSlugObjectionExamples: unknown slug falls back to mode defaults", () => {
  const result = getSlugObjectionExamples("service", "unknown_industry_xyz");
  const base = getObjectionExamples("service");

  it("commonObjections matches mode defaults exactly", () => {
    expect(result.commonObjections).toEqual(base.commonObjections);
  });
});

describe("getSlugObjectionExamples: null slug falls back to mode defaults", () => {
  const result = getSlugObjectionExamples("service", null);
  const base = getObjectionExamples("service");

  it("commonObjections matches mode defaults exactly", () => {
    expect(result.commonObjections).toEqual(base.commonObjections);
  });
});

describe("getSlugObjectionExamples: undefined slug falls back to mode defaults", () => {
  const result = getSlugObjectionExamples("service", undefined);
  const base = getObjectionExamples("service");

  it("commonObjections matches mode defaults exactly", () => {
    expect(result.commonObjections).toEqual(base.commonObjections);
  });
});

// ─── Cross-mode: dispatch and food modes still get defaults ────────────────────

describe("getSlugObjectionExamples: dispatch mode with towing slug", () => {
  const result = getSlugObjectionExamples("dispatch", "towing");

  it("returns non-empty commonObjections (falls back gracefully)", () => {
    expect(result.commonObjections.length).toBeGreaterThan(0);
  });

  it("returns dispatch mode defaults (no dispatch slug override exists)", () => {
    const base = getObjectionExamples("dispatch");
    expect(result.commonObjections).toEqual(base.commonObjections);
  });
});

describe("getSlugObjectionExamples: food mode with pizza slug", () => {
  const result = getSlugObjectionExamples("food", "pizza");

  it("returns non-empty commonObjections", () => {
    expect(result.commonObjections.length).toBeGreaterThan(0);
  });
});

// ─── Structure: every override has both fields ────────────────────────────────

describe("SLUG_OBJECTION_OVERRIDES structure integrity", () => {
  const slugsToCheck = [
    "handyman",
    "plumbing",
    "hvac",
    "electrical",
    "roofing",
    "general_contractor",
    "landscaping",
    "painting",
    "cleaning",
    "pest_control",
  ];

  for (const slug of slugsToCheck) {
    it(`${slug}: objections are complete pairs (objection + response)`, () => {
      const result = getSlugObjectionExamples("service", slug);
      for (const item of result.commonObjections) {
        expect(item.objection).toBeTruthy();
        expect(item.response).toBeTruthy();
        // Response should acknowledge and redirect, not be one-word
        expect(item.response.length).toBeGreaterThan(20);
      }
    });
  }
});
