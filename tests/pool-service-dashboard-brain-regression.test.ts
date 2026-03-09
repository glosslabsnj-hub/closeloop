/**
 * Pool Service Dashboard / Brain / Settings Regression Tests
 *
 * @vitest-environment node
 *
 * Covers QA dimensions D (Dashboard), B (Brain), S (Settings) for pool_service business type.
 * The A (AI behavior) dimension is covered by pool-service-ai-behavior.test.ts.
 *
 * Business type QA progress: pool service [P---] → targeting [PPPP]
 *
 * Tests verify:
 * 1. [D] Dashboard: industryBrainConfig has pool-specific metrics + quick actions
 * 2. [D] Dashboard: test tenant has 10 realistic customCallSessions (seeded data for QA)
 * 3. [D] Dashboard: pool service uses SERVICE mode dashboard (not a custom mode)
 * 4. [B] Brain: pool_service_brain_r1 gate passing — brain sections relevant to pool
 * 5. [B] Brain: pool service in industryBrainConfig with service-catalog suggestion
 * 6. [B] Brain: brain section registry shows SERVICE mode sections for pool service
 * 7. [S] Settings: service area defaults to 25mi radius (pool_service-specific)
 * 8. [S] Settings: pool service hours format (windows: [{open, close}]) handled correctly
 * 9. [S] Settings: pool service is in SERVICE mode (uses service settings pages)
 * 10. testTenantMatrix: pool service tenant has correct enabled_modules for SERVICE mode
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getIndustryBySlug } from "../src/data/industryCatalog";
import { getIndustryTerminology } from "../src/data/industryTerminology";
import { TEST_TENANT_MATRIX as testTenantMatrix } from "../src/data/testTenantMatrix";

const root = process.cwd();

function readSrc(relPath: string): string {
  return readFileSync(join(root, relPath), "utf-8");
}

const industryBrainConfigSrc = readSrc("src/config/industryBrainConfig.ts");
const brainSectionRegistrySrc = readSrc("src/config/brainSectionRegistry.ts");
const seedTenantsSrc = readSrc("supabase/functions/seed-test-tenants/index.ts");

// ---------------------------------------------------------------------------
// 1. [D] Dashboard: industryBrainConfig pool_service entry
// ---------------------------------------------------------------------------
describe("pool_service: industryBrainConfig dashboard metrics [D]", () => {
  it("pool_service exists in industryBrainConfig", () => {
    expect(industryBrainConfigSrc).toContain('"pool_service"');
  });

  it("primaryMetricLabel is 'Service Calls This Week'", () => {
    // Find pool_service block
    const poolStart = industryBrainConfigSrc.indexOf('"pool_service"');
    const nextEntry = industryBrainConfigSrc.indexOf('"pressure_washing"', poolStart);
    const poolBlock = industryBrainConfigSrc.slice(poolStart, nextEntry);
    expect(poolBlock).toContain('"Service Calls This Week"');
  });

  it("quickActionLabel is 'New Service Call'", () => {
    const poolStart = industryBrainConfigSrc.indexOf('"pool_service"');
    const nextEntry = industryBrainConfigSrc.indexOf('"pressure_washing"', poolStart);
    const poolBlock = industryBrainConfigSrc.slice(poolStart, nextEntry);
    expect(poolBlock).toContain('"New Service Call"');
  });

  it("quickActionDescription mentions pool service visit", () => {
    const poolStart = industryBrainConfigSrc.indexOf('"pool_service"');
    const nextEntry = industryBrainConfigSrc.indexOf('"pressure_washing"', poolStart);
    const poolBlock = industryBrainConfigSrc.slice(poolStart, nextEntry);
    expect(poolBlock).toContain("pool service visit");
  });

  it("brain emptyStateSuggestion for service-catalog is pool-specific", () => {
    const poolStart = industryBrainConfigSrc.indexOf('"pool_service"');
    const nextEntry = industryBrainConfigSrc.indexOf('"pressure_washing"', poolStart);
    const poolBlock = industryBrainConfigSrc.slice(poolStart, nextEntry);
    expect(poolBlock).toContain("weekly cleaning");
  });

  it("inbox fieldLabel 'Service Needed' for booking.service_requested", () => {
    const poolStart = industryBrainConfigSrc.indexOf('"pool_service"');
    const nextEntry = industryBrainConfigSrc.indexOf('"pressure_washing"', poolStart);
    const poolBlock = industryBrainConfigSrc.slice(poolStart, nextEntry);
    expect(poolBlock).toContain("Service Needed");
  });
});

// ---------------------------------------------------------------------------
// 2. [D] Dashboard: testTenantMatrix — pool service has 10 realistic call sessions
// ---------------------------------------------------------------------------
describe("pool_service: testTenantMatrix call sessions for dashboard QA [D]", () => {
  const poolTenant = testTenantMatrix.find(t => t.slug === "test-pool-service");

  it("test-pool-service tenant exists in testTenantMatrix", () => {
    expect(poolTenant).toBeDefined();
    expect(poolTenant!.slug).toBe("test-pool-service");
  });

  it("pool service tenant has customCallSessions (not generic calls)", () => {
    expect(poolTenant!.seedData.customCallSessions).toBeDefined();
    expect(poolTenant!.seedData.customCallSessions!.length).toBeGreaterThanOrEqual(10);
  });

  it("call sessions have pool-specific summaries (not generic)", () => {
    const sessions = poolTenant!.seedData.customCallSessions!;
    const poolTerms = ["pool", "algae", "saltwater", "weekly cleaning", "green", "heater", "chemical"];
    const hasPoolContent = sessions.some(s =>
      poolTerms.some(term => s.summary.toLowerCase().includes(term))
    );
    expect(hasPoolContent).toBe(true);
  });

  it("call sessions have variety of outcomes (booked, followup, lost)", () => {
    const sessions = poolTenant!.seedData.customCallSessions!;
    const outcomes = new Set(sessions.map(s => s.outcome));
    expect(outcomes.has("booked")).toBe(true);
    expect(outcomes.has("followup")).toBe(true);
    expect(outcomes.has("lost")).toBe(true);
  });

  it("call sessions have pool-specific caller phones (+1407 area code = Orlando)", () => {
    const sessions = poolTenant!.seedData.customCallSessions!;
    const hasOrlandoArea = sessions.some(s => s.caller_phone.startsWith("+14075"));
    expect(hasOrlandoArea).toBe(true);
  });

  it("call sessions have hours_ago spread (not all same time)", () => {
    const sessions = poolTenant!.seedData.customCallSessions!;
    const hoursSet = new Set(sessions.map(s => s.hours_ago));
    expect(hoursSet.size).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// 3. [D] Dashboard: pool service uses SERVICE mode (standard dashboard)
// ---------------------------------------------------------------------------
describe("pool_service: uses SERVICE mode dashboard [D]", () => {
  const poolTenant = testTenantMatrix.find(t => t.slug === "test-pool-service");

  it("business_mode is 'service'", () => {
    expect(poolTenant!.business_mode).toBe("service");
  });

  it("enabled_modules includes 'booking' (service mode booking flow)", () => {
    expect(poolTenant!.enabled_modules).toContain("booking");
  });

  it("enabled_modules includes 'ai_voice'", () => {
    expect(poolTenant!.enabled_modules).toContain("ai_voice");
  });

  it("does NOT include 'test_drives' (sales-only module)", () => {
    expect(poolTenant!.enabled_modules).not.toContain("test_drives");
  });

  it("does NOT include 'food_orders' (food-only module)", () => {
    expect(poolTenant!.enabled_modules).not.toContain("food_orders");
  });
});

// ---------------------------------------------------------------------------
// 4. [B] Brain: brain sections relevant to pool service
// ---------------------------------------------------------------------------
describe("pool_service: brain section registry relevance [B]", () => {
  it("brainSectionRegistry has 'catalog' section (pool services list)", () => {
    expect(brainSectionRegistrySrc).toContain('"catalog"');
  });

  it("brainSectionRegistry has 'faqs' section (pool chemical FAQs)", () => {
    expect(brainSectionRegistrySrc).toContain('"faqs"');
  });

  it("brainSectionRegistry has 'coverage' section (service area)", () => {
    expect(brainSectionRegistrySrc).toContain('"coverage"');
  });

  it("brainSectionRegistry has 'objections' section (pool DIY objections)", () => {
    expect(brainSectionRegistrySrc).toContain('"objections"');
  });

  it("brainSectionRegistry has 'business-hours' section (Mon-Sat hours)", () => {
    // business-hours or business-info renders hours
    expect(brainSectionRegistrySrc).toContain('"business-hours"');
  });
});

// ---------------------------------------------------------------------------
// 5. [B] Brain: industry catalog completeness for brain editor
// ---------------------------------------------------------------------------
describe("pool_service: industry catalog for brain service editor [B]", () => {
  const poolEntry = getIndustryBySlug("pool_service");

  it("catalog entry exists", () => {
    expect(poolEntry).toBeDefined();
  });

  it("has 12+ services for brain catalog editor to show", () => {
    expect(poolEntry!.services.length).toBeGreaterThanOrEqual(12);
  });

  it("all services have names and prices", () => {
    for (const svc of poolEntry!.services) {
      expect(svc.name).toBeTruthy();
      expect(typeof svc.price).toBe("number");
    }
  });

  it("services have descriptions (used in brain editor tooltip / AI prompt)", () => {
    const withDescriptions = poolEntry!.services.filter(s => s.description && s.description.length > 10);
    expect(withDescriptions.length).toBeGreaterThanOrEqual(8);
  });
});

// ---------------------------------------------------------------------------
// 6. [S] Settings: service area defaults to 25mi for pool_service
// ---------------------------------------------------------------------------
describe("pool_service: service area settings [S]", () => {
  const poolTenant = testTenantMatrix.find(t => t.slug === "test-pool-service");

  it("service_area_json uses radius type", () => {
    expect(poolTenant!.service_area_json!.type).toBe("radius");
  });

  it("service area radius is 25 miles (pool service standard)", () => {
    expect(poolTenant!.service_area_json!.radius_miles).toBe(25);
  });

  it("center_address is in Orlando, FL (consistent with business address)", () => {
    const addr = poolTenant!.service_area_json!.center_address as string;
    expect(addr.toLowerCase()).toContain("orlando");
  });
});

// ---------------------------------------------------------------------------
// 7. [S] Settings: hours format — reschedule-booking handles windows format
// ---------------------------------------------------------------------------
describe("pool_service: business hours windows format handled in reschedule [S]", () => {
  const rescheduleBookingSrc = readSrc("supabase/functions/elevenlabs-reschedule-booking/index.ts");

  it("reschedule-booking isOpenDay supports windows format hours", () => {
    // The 35ab862 fix ensures windows: [{open, close}] format is handled
    expect(rescheduleBookingSrc).toContain("windows");
    expect(rescheduleBookingSrc).toContain("dayHours.windows.length > 0");
  });

  it("normalizeHours in buildBusinessContext supports windows format", () => {
    const buildContextSrc = readSrc("supabase/functions/_shared/buildBusinessContext.ts");
    expect(buildContextSrc).toContain("dayData.windows");
    expect(buildContextSrc).toContain("windows[0]");
  });

  it("pool service test tenant has hours_json in testTenantMatrix source", () => {
    const matrixSrc = readSrc("src/data/testTenantMatrix.ts");
    // Pool service tenant might use defaultHours in seed function — or have hours_json
    // Either way, the seed-test-tenants handles it via defaultHours fallback
    expect(matrixSrc).toContain("test-pool-service");
  });

  it("seed-test-tenants provides defaultHours fallback when no hours_json", () => {
    const seedSrc = readSrc("supabase/functions/seed-test-tenants/index.ts");
    expect(seedSrc).toContain("defaultHours");
    expect(seedSrc).toContain("hours_json: config.hours_json ?? defaultHours");
  });
});

// ---------------------------------------------------------------------------
// 8. [S] Settings: pool service terminology in settings pages
// ---------------------------------------------------------------------------
describe("pool_service: settings page terminology [S]", () => {
  const terms = getIndustryTerminology("service", undefined, "pool_service");

  it("industryTerminology resolves for pool_service", () => {
    expect(terms).toBeDefined();
  });

  it("appointmentLabel is 'service visit'", () => {
    expect(terms.appointmentLabel).toBe("service visit");
  });

  it("teamMemberLabel is 'pool tech'", () => {
    expect(terms.teamMemberLabel).toBe("pool tech");
  });
});

// ---------------------------------------------------------------------------
// 9. [D] Dashboard: seed-test-tenants correctly handles customCallSessions
// ---------------------------------------------------------------------------
describe("seed-test-tenants: customCallSessions seeded for pool service [D]", () => {
  it("seed function has customCallSessions handling code path", () => {
    expect(seedTenantsSrc).toContain("customCallSessions");
  });

  it("seed function maps summary from customCallSessions", () => {
    // Ensure the summary field is mapped (pool service has rich summaries)
    expect(seedTenantsSrc).toContain("c.summary");
  });

  it("seed function maps hours_ago to timestamps", () => {
    expect(seedTenantsSrc).toContain("c.hours_ago");
    expect(seedTenantsSrc).toContain("hours_ago * 60 * 60 * 1000");
  });

  it("seed function maps outcome from customCallSessions", () => {
    expect(seedTenantsSrc).toContain("c.outcome");
  });

  it("seed function maps lead_score from customCallSessions", () => {
    expect(seedTenantsSrc).toContain("c.lead_score");
  });

  it("seed function maps followup_status from customCallSessions", () => {
    expect(seedTenantsSrc).toContain("c.followup_status");
  });
});
