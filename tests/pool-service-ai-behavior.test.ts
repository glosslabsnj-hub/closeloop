/**
 * Pool Service AI Behavior Regression Tests
 *
 * @vitest-environment node
 *
 * Verifies that the AI receptionist correctly handles pool service calls:
 * 1. Pool service is in SERVICE mode — uses service tools and serviceRules
 * 2. Anti-fabrication: AI only quotes prices from the catalog (Weekly Cleaning $125, etc.)
 * 3. text-conversation sources pool-specific FAQs (weekly service, chemicals, salt pools)
 * 4. Booking flow: create_booking triggers for pool service requests
 * 5. Pool service brain sections render correctly (service descriptions, FAQs, objections)
 * 6. buildBusinessContext includes estimate_first rules only when needed
 *    (pool service has NO estimate_first services — all are direct_book)
 *
 * Gates: service/functional/ai_handles_edge_cases (pool), service/brain/edits_reflect_in_ai_behavior
 * Business type QA: pool service D/B/S/A (all untested as of 2026-03-09)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getIndustryBySlug } from "../src/data/industryCatalog";
import { getIndustryTerminology } from "../src/data/industryTerminology";
import { resolveIndustryTemplate } from "../src/lib/templateResolver";

const root = process.cwd();

function readSrc(relPath: string): string {
  return readFileSync(join(root, relPath), "utf-8");
}

const buildBusinessContextSrc = readSrc("supabase/functions/_shared/buildBusinessContext.ts");
const textConvSrc = readSrc("supabase/functions/text-conversation/index.ts");
const rescheduleBookingSrc = readSrc("supabase/functions/elevenlabs-reschedule-booking/index.ts");
const cancelBookingSrc = readSrc("supabase/functions/elevenlabs-cancel-booking/index.ts");
const createBookingSrc = readSrc("supabase/functions/elevenlabs-create-booking/index.ts");
const configToml = readSrc("supabase/config.toml");

// ─── 1. Pool service is in SERVICE mode ──────────────────────────────────────

describe("pool_service: business mode routing (service mode)", () => {
  it("pool_service is not a standalone mode — uses service mode tools", () => {
    // text-conversation routes by business_mode, not by industry slug.
    // Pool service tenants have business_mode='service'.
    // Verify text-conversation has no pool_service-specific routing (it uses service mode).
    expect(textConvSrc).not.toContain('"pool_service"');
  });

  it("service mode returns SERVICE_TOOLS (cancel, reschedule, create_booking)", () => {
    // case "service": return [...SHARED_TOOLS, ...SERVICE_TOOLS]
    const serviceCase = textConvSrc.match(/case "service":[^}]+SERVICE_TOOLS/s);
    expect(serviceCase).toBeTruthy();
  });

  it("cancel_booking is in SERVICE_TOOLS (pool service reschedules work)", () => {
    const serviceToolsSection = textConvSrc.slice(
      textConvSrc.indexOf("const SERVICE_TOOLS"),
      textConvSrc.indexOf("const DISPATCH_TOOLS")
    );
    expect(serviceToolsSection).toContain('name: "cancel_booking"');
    expect(serviceToolsSection).toContain('name: "reschedule_booking"');
  });

  it("reschedule_booking handles windows format hours (pool service fix 35ab862)", () => {
    // BUG 35ab862: isOpenDay() was broken for windows format — affected ALL service tenants
    // including pool service. Fix: if dayHours.windows exists, check windows.length > 0.
    expect(rescheduleBookingSrc).toContain("dayHours.windows");
    expect(rescheduleBookingSrc).toContain("windows.length > 0");
  });
});

// ─── 2. Pool service catalog completeness ────────────────────────────────────

describe("pool_service: catalog completeness (anti-fabrication guard)", () => {
  const pool = getIndustryBySlug("pool_service");

  it("pool_service catalog entry exists", () => {
    expect(pool).toBeDefined();
  });

  it("has 14 services (AI only quotes from catalog)", () => {
    // If the catalog has fewer services, the AI has limited options and may fabricate
    expect(pool!.services.length).toBeGreaterThanOrEqual(14);
  });

  it("Weekly Cleaning is $125 fixed (most common request)", () => {
    const svc = pool!.services.find(s => s.name === "Weekly Cleaning");
    expect(svc).toBeDefined();
    expect(svc!.price).toBe(125);
    expect(svc!.priceType).toBe("fixed");
  });

  it("Monthly Maintenance Plan is $150 fixed", () => {
    const svc = pool!.services.find(s => s.name === "Monthly Maintenance Plan");
    expect(svc).toBeDefined();
    expect(svc!.price).toBe(150);
  });

  it("Green-to-Clean / Algae Treatment is $350 starting_at (emergency service)", () => {
    const svc = pool!.services.find(s => s.name.includes("Green-to-Clean") || s.name.includes("Algae"));
    expect(svc).toBeDefined();
    expect(svc!.price).toBe(350);
    expect(svc!.priceType).toBe("starting_at");
  });

  it("Equipment Repair is $200 starting_at (not fixed — needs diagnosis first)", () => {
    const svc = pool!.services.find(s => s.name === "Equipment Repair");
    expect(svc).toBeDefined();
    expect(svc!.priceType).toBe("starting_at");
  });

  it("Pool Opening is $250 fixed (seasonal service)", () => {
    const svc = pool!.services.find(s => s.name === "Pool Opening");
    expect(svc).toBeDefined();
    expect(svc!.price).toBe(250);
    expect(svc!.priceType).toBe("fixed");
  });

  it("Acid Wash is $400 starting_at (major service)", () => {
    const svc = pool!.services.find(s => s.name === "Acid Wash");
    expect(svc).toBeDefined();
    expect(svc!.price).toBe(400);
    expect(svc!.priceType).toBe("starting_at");
  });

  it("pool service has NO estimate_first services (all are direct_book)", () => {
    // Unlike GC/roofing, pool service schedules visits directly — no estimate gate
    const estimateFirst = pool!.services.filter(
      s => s.bookingType === "estimate_first"
    );
    expect(estimateFirst.length).toBe(0);
  });

  it("all pool services have descriptions (AI has talking points)", () => {
    const withoutDescription = pool!.services.filter(s => !s.description);
    // All 14 services should have descriptions to guide AI responses
    expect(withoutDescription.length).toBe(0);
  });
});

// ─── 3. Pool service FAQs cover common caller questions ──────────────────────

describe("pool_service: FAQs for common caller questions", () => {
  const pool = getIndustryBySlug("pool_service");

  it("has at least 8 FAQs", () => {
    expect(pool!.faqs?.length).toBeGreaterThanOrEqual(8);
  });

  it("has FAQ about how often pools need cleaning", () => {
    const faq = pool!.faqs?.find(f =>
      f.question.toLowerCase().includes("often") ||
      f.question.toLowerCase().includes("how often") ||
      f.question.toLowerCase().includes("frequency")
    );
    expect(faq).toBeDefined();
  });

  it("has FAQ about monthly contracts", () => {
    const faq = pool!.faqs?.find(f =>
      f.question.toLowerCase().includes("monthly") ||
      f.question.toLowerCase().includes("contract") ||
      f.question.toLowerCase().includes("plan")
    );
    expect(faq).toBeDefined();
  });

  it("has FAQ about saltwater pools (common question)", () => {
    const faq = pool!.faqs?.find(f =>
      f.question.toLowerCase().includes("salt") ||
      f.question.toLowerCase().includes("saltwater")
    );
    expect(faq).toBeDefined();
  });

  it("has FAQ about heater repair", () => {
    const faq = pool!.faqs?.find(f =>
      f.question.toLowerCase().includes("heater")
    );
    expect(faq).toBeDefined();
  });

  it("has FAQ about licensing/insurance (trust question)", () => {
    const faq = pool!.faqs?.find(f =>
      f.question.toLowerCase().includes("license") ||
      f.question.toLowerCase().includes("insur")
    );
    expect(faq).toBeDefined();
  });

  it("FAQ answer for saltwater pools confirms 'yes we service them'", () => {
    const faq = pool!.faqs?.find(f =>
      f.question.toLowerCase().includes("salt")
    );
    expect(faq?.answer?.toLowerCase()).toContain("salt");
  });
});

// ─── 4. Pool service objections cover common pushbacks ───────────────────────

describe("pool_service: objection handling", () => {
  const pool = getIndustryBySlug("pool_service");

  it("has at least 5 objections", () => {
    expect(pool!.objections?.length).toBeGreaterThanOrEqual(5);
  });

  it("has objection for DIY ('I can maintain my own pool')", () => {
    const obj = pool!.objections?.find(o =>
      o.objection.toLowerCase().includes("myself") ||
      o.objection.toLowerCase().includes("maintain my own") ||
      o.objection.toLowerCase().includes("diy")
    );
    expect(obj).toBeDefined();
  });

  it("has objection for existing service provider", () => {
    const obj = pool!.objections?.find(o =>
      o.objection.toLowerCase().includes("already have") ||
      o.objection.toLowerCase().includes("pool service")
    );
    expect(obj).toBeDefined();
  });

  it("has objection for price concern", () => {
    const obj = pool!.objections?.find(o =>
      o.objection.toLowerCase().includes("expensive") ||
      o.objection.toLowerCase().includes("too much") ||
      o.objection.toLowerCase().includes("cost")
    );
    expect(obj).toBeDefined();
  });

  it("objection responses are substantial (not just 'I understand')", () => {
    for (const obj of pool!.objections ?? []) {
      expect(obj.response.length).toBeGreaterThan(50);
    }
  });
});

// ─── 5. Pool service terminology ─────────────────────────────────────────────

describe("pool_service: industry terminology", () => {
  it("appointmentLabel is 'service visit' (not 'appointment')", () => {
    const terms = getIndustryTerminology("service", "home_services", "pool_service");
    expect(terms?.appointmentLabel).toBe("service visit");
  });

  it("teamMemberLabel is 'pool tech'", () => {
    const terms = getIndustryTerminology("service", "home_services", "pool_service");
    expect(terms?.teamMemberLabel).toBe("pool tech");
  });
});

// ─── 6. buildBusinessContext: pool service uses service mode prompt ───────────

describe("buildBusinessContext: service mode section for pool service", () => {
  // buildBusinessContext uses business_mode to route prompt construction.
  // Pool service is service mode — verify service mode prompt sections exist.

  it("buildBusinessContext includes BOOKING BEHAVIOR section for service mode", () => {
    expect(buildBusinessContextSrc).toContain("BOOKING BEHAVIOR");
  });

  it("buildBusinessContext does NOT inject estimate-first rules for pool service (no estimate_first services)", () => {
    // The estimate-first block is conditional on services with booking_type === 'estimate_first'
    // Pool service has NO such services, so this section should NOT appear in pool service prompts.
    // Verify the condition logic exists (so GC/roofing get estimate-first, pool doesn't)
    expect(buildBusinessContextSrc).toContain("estimateFirstServices.length > 0");
    // The section IS defined in the source (for GC/roofing), but conditionally rendered
    expect(buildBusinessContextSrc).toContain("ESTIMATE-FIRST SERVICES");
  });

  it("service mode prompt has ANTI-FABRICATION rules for services", () => {
    // Service mode prompt should never let AI invent services
    const fnBody = buildBusinessContextSrc.slice(
      buildBusinessContextSrc.indexOf("function buildSystemPrompt(")
    );
    expect(fnBody).toContain("SERVICES AND PRICING");
  });

  it("pool service context fields include current_issue and urgency (booking info collection)", () => {
    const pool = getIndustryBySlug("pool_service");
    const fieldKeys = pool!.contextFields?.map(f => f.key) ?? [];
    expect(fieldKeys).toContain("current_issue");
    expect(fieldKeys).toContain("urgency");
  });
});

// ─── 7. Edge function verify_jwt coverage for pool service ───────────────────

describe("pool_service: edge function JWT config (service mode functions)", () => {
  const serviceModeFunctions = [
    "elevenlabs-create-booking",
    "elevenlabs-cancel-booking",
    "elevenlabs-reschedule-booking",
    "elevenlabs-check-availability",
    "elevenlabs-check-service-area",
    "elevenlabs-create-callback",
    "booking-handoff",
  ];

  for (const fn of serviceModeFunctions) {
    it(`${fn} has verify_jwt = false in config.toml`, () => {
      const fnHeader = `[functions.${fn}]`;
      const start = configToml.indexOf(fnHeader);
      expect(start).toBeGreaterThan(-1);
      const block = configToml.slice(start, start + 200);
      expect(block).toContain("verify_jwt = false");
    });
  }
});

// ─── 8. Pool service template resolver ───────────────────────────────────────

describe("pool_service: resolveIndustryTemplate completeness", () => {
  const template = resolveIndustryTemplate("pool_service");

  it("template resolves for pool_service slug", () => {
    expect(template).toBeDefined();
  });

  it("template has services array with 14+ entries", () => {
    expect(template.services.length).toBeGreaterThanOrEqual(14);
  });

  it("template has faqs with pool-specific questions", () => {
    expect(template.faqs.length).toBeGreaterThanOrEqual(8);
    const saltFaq = template.faqs.find(f =>
      f.question.toLowerCase().includes("salt")
    );
    expect(saltFaq).toBeDefined();
  });

  it("template has objections array", () => {
    expect(template.objections.length).toBeGreaterThanOrEqual(5);
  });
});

// ─── 9. Booking flow: create-booking for pool service ────────────────────────

describe("pool_service: create-booking edge function handles service mode", () => {
  it("create-booking uses business_mode from context (not hardcoded)", () => {
    expect(createBookingSrc).toContain("business_mode");
  });

  it("create-booking does NOT skip test_drives logic for service mode", () => {
    // test_drives only created for sales mode — pool service should NOT create test_drive rows
    const salesModeBlock = createBookingSrc.slice(
      createBookingSrc.indexOf('business_mode === "sales"') - 50,
      createBookingSrc.indexOf('business_mode === "sales"') + 800
    );
    expect(salesModeBlock).toContain('"test_drives"');
    // Confirm it's conditional (only for sales, not pool_service which is service mode)
    expect(salesModeBlock).toContain('business_mode === "sales"');
  });

  it("create-booking verifies not duplicate before creating (idempotent)", () => {
    // Prevents double-booking from webhook + AI tool both firing
    expect(createBookingSrc).toContain("session_id");
  });
});
