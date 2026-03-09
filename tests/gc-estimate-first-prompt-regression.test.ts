/**
 * GC Estimate-First AI Prompt Regression Tests
 *
 * @vitest-environment node
 *
 * Verifies that buildBusinessContext.ts correctly generates the ESTIMATE-FIRST
 * SERVICES prompt section when services have booking_type === "estimate_first".
 * This is the critical bridge between the catalog data and AI behavior.
 *
 * Also verifies the testTenantMatrix GC entry (test-gc-joe) has the correct
 * booking_type values that would trigger this behavior when seeded.
 *
 * Gate targets: service ai_testing/gc_estimate_flow,
 *               service onboarding/gc_services_correct_booking_type
 *
 * Why this matters: Without the ESTIMATE-FIRST SERVICES block in the system
 * prompt, the AI would try to book a "Kitchen Remodel" as a direct calendar
 * slot instead of explaining "we start with a free on-site estimate."
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readSrc(relPath: string): string {
  return readFileSync(join(root, relPath), "utf-8");
}

const buildContextSrc = readSrc("supabase/functions/_shared/buildBusinessContext.ts");
const testTenantMatrixSrc = readSrc("src/data/testTenantMatrix.ts");
const seedTestTenantsSrc = readSrc("supabase/functions/seed-test-tenants/index.ts");

// ---------------------------------------------------------------------------
// 1. buildBusinessContext — ESTIMATE-FIRST SERVICES prompt section exists
// ---------------------------------------------------------------------------

describe("buildBusinessContext: ESTIMATE-FIRST SERVICES prompt section", () => {
  it("contains the ESTIMATE-FIRST SERVICES keyword (triggers on estimate_first services)", () => {
    expect(buildContextSrc).toContain("ESTIMATE-FIRST SERVICES");
  });

  it("contains CRITICAL RULE label for estimate-first section", () => {
    expect(buildContextSrc).toContain("ESTIMATE-FIRST SERVICES (CRITICAL RULE)");
  });

  it("filters services by booking_type === estimate_first", () => {
    expect(buildContextSrc).toContain('booking_type === "estimate_first"');
  });

  it("provides instruction to NOT book a regular appointment for estimate-first services", () => {
    expect(buildContextSrc).toContain("Do NOT attempt to book a regular appointment");
  });

  it("provides instruction to explain the free on-site estimate process", () => {
    expect(buildContextSrc).toContain("free on-site estimate");
  });

  it("provides the service_requested pattern for estimate visits", () => {
    // The AI should use "Free Estimate - [service name]" as service_requested
    expect(buildContextSrc).toContain("Free Estimate - [service name]");
  });

  it("includes instruction to use check_availability and create_booking for estimates", () => {
    expect(buildContextSrc).toContain("check_availability and create_booking");
  });

  it("forbids quoting a fixed final price for estimate-first services", () => {
    expect(buildContextSrc).toContain("NEVER quote a fixed final price for these services");
  });

  it("collects address for estimate visit", () => {
    // Address is critical — field tech needs location for on-site estimate
    expect(buildContextSrc).toContain("address/location");
  });
});

// ---------------------------------------------------------------------------
// 2. buildBusinessContext — booking_type normalization
// ---------------------------------------------------------------------------

describe("buildBusinessContext: booking_type normalization in NormalizeService", () => {
  it("defines booking_type as optional field on service input type", () => {
    expect(buildContextSrc).toContain("booking_type?: string | null");
  });

  it("normalizes booking_type to 'direct_book' | 'estimate_first' | 'consultation'", () => {
    expect(buildContextSrc).toContain('"direct_book", "estimate_first", "consultation"');
  });

  it("adds [ESTIMATE FIRST] tag to service label in services_for_prompt", () => {
    expect(buildContextSrc).toContain('[ESTIMATE FIRST]');
  });

  it("adds [CONSULTATION] tag for consultation booking_type", () => {
    expect(buildContextSrc).toContain('[CONSULTATION]');
  });
});

// ---------------------------------------------------------------------------
// 3. testTenantMatrix — GC test tenant has estimate_first services
// ---------------------------------------------------------------------------

describe("testTenantMatrix: GC test tenant (test-gc-joe) estimate_first services", () => {
  it("test-gc-joe tenant definition includes booking_type field", () => {
    expect(testTenantMatrixSrc).toContain('booking_type: "estimate_first"');
  });

  it("Kitchen Remodel is estimate_first in testTenantMatrix", () => {
    // Verify the catalog service name and its booking_type appear together
    // Use 400-char window to accommodate long description fields before booking_type
    const kitchenIdx = testTenantMatrixSrc.indexOf('"Kitchen Remodel"');
    expect(kitchenIdx).toBeGreaterThan(-1);
    const nearbyText = testTenantMatrixSrc.slice(kitchenIdx, kitchenIdx + 400);
    expect(nearbyText).toContain("estimate_first");
  });

  it("Bathroom Remodel is estimate_first in testTenantMatrix", () => {
    const idx = testTenantMatrixSrc.indexOf('"Bathroom Remodel"');
    expect(idx).toBeGreaterThan(-1);
    const nearbyText = testTenantMatrixSrc.slice(idx, idx + 400);
    expect(nearbyText).toContain("estimate_first");
  });

  it("Handyman Service is direct_book in testTenantMatrix", () => {
    const idx = testTenantMatrixSrc.indexOf('"Handyman Service"');
    expect(idx).toBeGreaterThan(-1);
    const nearbyText = testTenantMatrixSrc.slice(idx, idx + 400);
    expect(nearbyText).toContain("direct_book");
  });

  it("Free Estimate / Site Visit is direct_book in testTenantMatrix", () => {
    const idx = testTenantMatrixSrc.indexOf('"Free Estimate / Site Visit"');
    expect(idx).toBeGreaterThan(-1);
    const nearbyText = testTenantMatrixSrc.slice(idx, idx + 400);
    expect(nearbyText).toContain("direct_book");
  });
});

// ---------------------------------------------------------------------------
// 4. seed-test-tenants — booking_type is propagated to DB
// ---------------------------------------------------------------------------

describe("seed-test-tenants: booking_type field included in services insert", () => {
  it("seed function accepts booking_type on custom services", () => {
    expect(seedTestTenantsSrc).toContain("booking_type?:");
  });

  it("seed function includes booking_type in services .insert()", () => {
    expect(seedTestTenantsSrc).toContain("booking_type: s.booking_type");
  });

  it("seed function defaults to direct_book when booking_type is unset", () => {
    expect(seedTestTenantsSrc).toContain('"direct_book"');
  });
});

// ---------------------------------------------------------------------------
// 5. buildBusinessContext — estimate-first section only renders when applicable
// ---------------------------------------------------------------------------

describe("buildBusinessContext: estimate-first section is conditional", () => {
  it("checks estimateFirstServices.length > 0 before adding prompt section", () => {
    expect(buildContextSrc).toContain("estimateFirstServices.length > 0");
  });

  it("builds list of estimate-first service names for the prompt", () => {
    // Should map service names for inclusion in the prompt section
    expect(buildContextSrc).toContain("estimateFirstNames");
  });
});

// ---------------------------------------------------------------------------
// 6. bookingTag — services_for_prompt marks estimate_first services
// ---------------------------------------------------------------------------

describe("buildBusinessContext: services_for_prompt tags estimate_first services", () => {
  it("uses bookingTag variable to annotate services in the prompt", () => {
    expect(buildContextSrc).toContain("bookingTag");
  });

  it("[ESTIMATE FIRST] tag is set for estimate_first booking_type", () => {
    const idx = buildContextSrc.indexOf('[ESTIMATE FIRST]');
    expect(idx).toBeGreaterThan(-1);
    // The tag should appear in the conditional block checking booking_type
    const prevText = buildContextSrc.slice(Math.max(0, idx - 200), idx);
    expect(prevText).toContain("estimate_first");
  });
});
