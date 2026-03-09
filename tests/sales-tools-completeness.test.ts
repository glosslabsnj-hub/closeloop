/**
 * Sales Mode Tools Completeness Regression Tests
 *
 * @vitest-environment node
 *
 * Verifies that the text-conversation edge function has ALL required tools
 * for the sales mode (car dealership, real estate, etc.) and that the salesRules
 * include explicit instructions for each tool.
 *
 * Context: Car dealership AI behavior was marked A=X (failing) in QA.
 * Root causes discovered and fixed:
 * 1. cancel_booking not in SALES_TOOLS (commit cbdc9e3) — now in SALES_TOOLS
 * 2. reschedule_booking not in SALES_TOOLS (commit cbdc9e3) — now in SALES_TOOLS
 * 3. salesRules now explicitly instructs AI to call cancel/reschedule tools
 * 4. test_drives.scheduled_date not updated on reschedule (commit ca1d757)
 * 5. isOpenDay() windows format bug (commit 35ab862) — affected ALL service modes
 *
 * Gates: sales/functional/cancel_booking_works, sales/functional/reschedule_booking_works,
 *        sales/functional/booking_creates_correctly, sales/functional/ai_handles_edge_cases
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const textConvSrc = readFileSync(
  join(root, "supabase/functions/text-conversation/index.ts"),
  "utf-8"
);

// Extract SALES_TOOLS section
const salesToolsStart = textConvSrc.indexOf("const SALES_TOOLS");
const salesToolsEnd = textConvSrc.indexOf("const FOOD_TOOLS");
const salesToolsSection = textConvSrc.slice(salesToolsStart, salesToolsEnd);

// Extract salesRules string
const salesRulesStart = textConvSrc.indexOf("const salesRules");
const salesRulesEnd = textConvSrc.indexOf("\n  const modeRules =");
const salesRulesSection = textConvSrc.slice(salesRulesStart, salesRulesEnd);

// Extract service case in getToolDefinitions
const serviceCase = textConvSrc.match(/case "service":[^}]+SERVICE_TOOLS/s)?.[0] ?? "";
const salesCase = textConvSrc.match(/case "sales":[^}]+SALES_TOOLS/s)?.[0] ?? "";

// ─── 1. SALES_TOOLS completeness ─────────────────────────────────────────────

describe("SALES_TOOLS: all required tools present (functional/cancel+reschedule regression)", () => {
  const requiredSalesTools = [
    "search_inventory",
    "suggest_availability",
    "create_booking",
    "check_availability",
    "cancel_booking",
    "reschedule_booking",
  ];

  for (const toolName of requiredSalesTools) {
    it(`SALES_TOOLS includes '${toolName}'`, () => {
      expect(salesToolsSection).toContain(`name: "${toolName}"`);
    });
  }
});

describe("SALES_TOOLS: tool descriptions are sales-appropriate (not generic service terms)", () => {
  it("create_booking mentions test drive or showing (not just 'appointment')", () => {
    const createBookingInSales = salesToolsSection.slice(
      salesToolsSection.indexOf('name: "create_booking"'),
      salesToolsSection.indexOf('name: "create_booking"') + 800
    );
    const desc = createBookingInSales.toLowerCase();
    expect(
      desc.includes("test drive") || desc.includes("showing") || desc.includes("visit")
    ).toBe(true);
  });

  it("cancel_booking description mentions test drive (sales-specific cancel)", () => {
    const cancelInSales = salesToolsSection.slice(
      salesToolsSection.indexOf('name: "cancel_booking"'),
      salesToolsSection.indexOf('name: "cancel_booking"') + 600
    );
    const desc = cancelInSales.toLowerCase();
    expect(desc.includes("test drive") || desc.includes("appointment")).toBe(true);
  });

  it("reschedule_booking description mentions test drive (sales-specific reschedule)", () => {
    const rescheduleInSales = salesToolsSection.slice(
      salesToolsSection.indexOf('name: "reschedule_booking"'),
      salesToolsSection.indexOf('name: "reschedule_booking"') + 600
    );
    const desc = rescheduleInSales.toLowerCase();
    expect(desc.includes("test drive") || desc.includes("appointment")).toBe(true);
  });
});

// ─── 2. salesRules completeness ──────────────────────────────────────────────

describe("salesRules: explicit tool invocation instructions", () => {
  it("salesRules instructs AI to call cancel_booking for cancellations", () => {
    expect(salesRulesSection).toContain("cancel_booking");
  });

  it("salesRules instructs AI to call reschedule_booking for reschedules", () => {
    expect(salesRulesSection).toContain("reschedule_booking");
  });

  it("salesRules instructs AI to call search_inventory for inventory questions", () => {
    expect(salesRulesSection).toContain("search_inventory");
  });

  it("salesRules instructs AI to call create_booking for test drive scheduling", () => {
    expect(salesRulesSection).toContain("create_booking");
  });

  it("salesRules has BOOKING COMPLETION rule (no re-confirmation after check_availability)", () => {
    expect(salesRulesSection).toContain("BOOKING COMPLETION");
    expect(salesRulesSection).toContain("IMMEDIATELY");
  });

  it("salesRules has EMERGENCY ROUTING for vehicle breakdowns", () => {
    // Sales AI should handle emergency vehicle situations
    expect(salesRulesSection).toContain("EMERGENCY ROUTING");
  });

  it("salesRules explicitly says 'they already said they want to cancel' (no re-confirm)", () => {
    // AI should NOT ask "are you sure?" when customer says they want to cancel
    const lower = salesRulesSection.toLowerCase();
    expect(lower).toContain("already said they want to cancel");
  });
});

// ─── 3. sales mode tool routing in getToolDefinitions ────────────────────────

describe("getToolDefinitions: sales mode correctly merges SHARED + SALES tools", () => {
  it("sales case returns [...SHARED_TOOLS, ...SALES_TOOLS]", () => {
    expect(salesCase).toContain("SHARED_TOOLS");
    expect(salesCase).toContain("SALES_TOOLS");
  });

  it("SHARED_TOOLS includes create_callback (for non-booking leads)", () => {
    const sharedToolsSection = textConvSrc.slice(
      textConvSrc.indexOf("const SHARED_TOOLS"),
      textConvSrc.indexOf("const SERVICE_TOOLS")
    );
    expect(sharedToolsSection).toContain('name: "create_callback"');
    expect(sharedToolsSection).toContain('name: "check_service_area"');
  });

  it("sales mode has check_service_area (via SHARED_TOOLS) — returns showroom bypass", () => {
    // For sales mode, check-service-area returns in_area=true for all callers
    // (customers don't need to be in a service area to visit a dealership)
    const checkServiceAreaSrc = readFileSync(
      join(root, "supabase/functions/elevenlabs-check-service-area/index.ts"),
      "utf-8"
    );
    expect(checkServiceAreaSrc).toContain("sales");
    expect(checkServiceAreaSrc).toContain("showroom");
  });
});

// ─── 4. endpointMap covers all sales tool names ──────────────────────────────

describe("endpointMap: sales tools map to correct edge functions", () => {
  const expectedMappings: Record<string, string> = {
    search_inventory: "elevenlabs-search-inventory",
    create_booking: "elevenlabs-create-booking",
    check_availability: "elevenlabs-check-availability",
    cancel_booking: "elevenlabs-cancel-booking",
    reschedule_booking: "elevenlabs-reschedule-booking",
    create_callback: "elevenlabs-create-callback",
    check_service_area: "elevenlabs-check-service-area",
  };

  for (const [tool, endpoint] of Object.entries(expectedMappings)) {
    it(`endpointMap maps '${tool}' → '${endpoint}'`, () => {
      expect(textConvSrc).toContain(`${tool}: "${endpoint}"`);
    });
  }
});

// ─── 5. test_drives sync on reschedule (commit ca1d757 regression guard) ──────

describe("elevenlabs-reschedule-booking: syncs all 3 test_drive date fields (ca1d757)", () => {
  const rescheduleSrc = readFileSync(
    join(root, "supabase/functions/elevenlabs-reschedule-booking/index.ts"),
    "utf-8"
  );

  it("updates test_drives table for sales mode", () => {
    expect(rescheduleSrc).toContain('"test_drives"');
  });

  it("updates scheduled_date (DATE column used by dashboard filter)", () => {
    const testDrivesBlock = rescheduleSrc.slice(
      rescheduleSrc.indexOf('"test_drives"'),
      rescheduleSrc.indexOf('"test_drives"') + 500
    );
    expect(testDrivesBlock).toContain("scheduled_date");
  });

  it("updates scheduled_time (TIME column used by dashboard display)", () => {
    const testDrivesBlock = rescheduleSrc.slice(
      rescheduleSrc.indexOf('"test_drives"'),
      rescheduleSrc.indexOf('"test_drives"') + 500
    );
    expect(testDrivesBlock).toContain("scheduled_time");
  });

  it("updates scheduled_at (TIMESTAMP for ordering)", () => {
    const testDrivesBlock = rescheduleSrc.slice(
      rescheduleSrc.indexOf('"test_drives"'),
      rescheduleSrc.indexOf('"test_drives"') + 500
    );
    expect(testDrivesBlock).toContain("scheduled_at");
  });
});

// ─── 6. cancel-booking syncs test_drives for sales mode ─────────────────────

describe("elevenlabs-cancel-booking: cancels linked test_drive record (ca1d757)", () => {
  const cancelSrc = readFileSync(
    join(root, "supabase/functions/elevenlabs-cancel-booking/index.ts"),
    "utf-8"
  );

  it("updates test_drives table on booking cancellation", () => {
    expect(cancelSrc).toContain('"test_drives"');
  });

  it("sets test_drive status to 'cancelled'", () => {
    const testDrivesBlock = cancelSrc.slice(
      cancelSrc.indexOf('"test_drives"'),
      cancelSrc.indexOf('"test_drives"') + 400
    );
    expect(testDrivesBlock).toContain("cancelled");
  });

  it("links cancel by booking_id (not tenant_id alone)", () => {
    const testDrivesBlock = cancelSrc.slice(
      cancelSrc.indexOf('"test_drives"'),
      cancelSrc.indexOf('"test_drives"') + 400
    );
    expect(testDrivesBlock).toContain("booking_id");
  });
});

// ─── 7. search_inventory: category filtering works (commit a95c017) ──────────

describe("elevenlabs-search-inventory: category filter handles condition keywords", () => {
  const searchInvSrc = readFileSync(
    join(root, "supabase/functions/elevenlabs-search-inventory/index.ts"),
    "utf-8"
  );

  it("handles 'used' category as condition filter (not body_style)", () => {
    // Bug a95c017: category='used' was being applied as ilike('body_style', '%used%')
    // Fix: detect new/used/certified and route to condition column
    expect(searchInvSrc).toContain("CONDITION_KEYWORDS");
    expect(searchInvSrc).toContain("used");
    expect(searchInvSrc).toContain("condition");
  });

  it("handles 'new' category as condition filter", () => {
    expect(searchInvSrc).toContain('"new"');
  });

  it("handles 'certified' category as condition filter", () => {
    expect(searchInvSrc).toContain("certified");
  });

  it("non-condition categories are used as body_style filter", () => {
    // 'suv', 'sedan', 'truck' etc. should still filter on body_style
    expect(searchInvSrc).toContain("body_style");
  });
});

// ─── 8. test-drive-handoff: notifies owner on test drive booking ─────────────

describe("test-drive-handoff: callback_delivery_settings used for owner notification", () => {
  const handoffSrc = readFileSync(
    join(root, "supabase/functions/test-drive-handoff/index.ts"),
    "utf-8"
  );

  it("test-drive-handoff reads callback_delivery_settings", () => {
    expect(handoffSrc).toContain("callback_delivery_settings");
  });

  it("test-drive-handoff sends email notification to owner", () => {
    expect(handoffSrc).toContain("email");
  });

  it("test-drive-handoff uses x-closeloop-secret for internal auth", () => {
    expect(handoffSrc).toContain("x-closeloop-secret");
  });
});
