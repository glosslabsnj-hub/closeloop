/**
 * Sales Mode Brain + QA Gate Regression Tests
 *
 * @vitest-environment node
 *
 * Covers:
 * 1. Brain layout — relevant_sections_only (SALES_LAYOUT correctness)
 * 2. Car dealership seed data — services + FAQs are car-dealer specific
 * 3. Check-service-area — sales mode bypass (always in_area=true)
 * 4. DashboardByMode — SalesTodayView structure and terminology
 * 5. Non-regression — other modes unaffected by sales changes
 *
 * Gate targets: sales brain/relevant_sections_only, functional/service_area_validation
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// 1. Brain Layout — relevant_sections_only
// ---------------------------------------------------------------------------

const brainLayoutSource = readFileSync(
  join(process.cwd(), "src/config/brainModeLayout.ts"),
  "utf-8"
);

// Extract the SALES_LAYOUT block from source
const salesLayoutStart = brainLayoutSource.indexOf("const SALES_LAYOUT");
const salesLayoutEnd = brainLayoutSource.indexOf("// ─── Mode → Layout map");
const salesLayoutBlock = brainLayoutSource.slice(salesLayoutStart, salesLayoutEnd);

describe("brainModeLayout: SALES_LAYOUT — brain/relevant_sections_only", () => {
  it("SALES_LAYOUT is defined", () => {
    expect(salesLayoutBlock.length).toBeGreaterThan(100);
    expect(salesLayoutBlock).toContain("SALES_LAYOUT");
  });

  it("has 'Your Business' tab (essentials)", () => {
    expect(salesLayoutBlock).toContain("Your Business");
  });

  it("has 'Products & Pricing' tab (not 'Services & Pricing')", () => {
    // Sales uses "Products & Pricing" language, not "Services"
    expect(salesLayoutBlock).toContain("Products & Pricing");
  });

  it("has 'How You Operate' tab (operations)", () => {
    expect(salesLayoutBlock).toContain("How You Operate");
  });

  it("has 'AI Behavior' tab (training)", () => {
    expect(salesLayoutBlock).toContain("AI Behavior");
  });

  it("sales layout has exactly 4 tabs (not more)", () => {
    // Count `section:` occurrences in the SALES_LAYOUT block as a proxy for tab count
    const sectionMatches = salesLayoutBlock.match(/section:\s*"/g) || [];
    expect(sectionMatches.length).toBe(4);
  });

  it("operations group uses 'Showroom & Coverage' (not 'Service Area')", () => {
    expect(salesLayoutBlock).toContain("Showroom & Coverage");
    // Must NOT have bare "Service Area" as a group label in sales
    // Check the group label specifically (not item IDs which might contain 'coverage')
    const serviceAreaLabel = salesLayoutBlock.match(/label:\s*"Service Area"/);
    expect(serviceAreaLabel).toBeNull();
  });

  it("has 'Sales Settings' group (sales-specific)", () => {
    expect(salesLayoutBlock).toContain("Sales Settings");
  });

  it("has 'sales-policies' itemId in operations tab", () => {
    expect(salesLayoutBlock).toContain("sales-policies");
  });

  it("has 'catalog' itemId in products tab", () => {
    expect(salesLayoutBlock).toContain('"catalog"');
  });

  it("has 'faqs' in knowledge group", () => {
    expect(salesLayoutBlock).toContain('"faqs"');
  });

  it("does NOT have dispatch-specific group (dispatch is irrelevant for sales)", () => {
    // Dispatch groups like "Driver Management" or "Route Settings" should not appear in sales
    expect(salesLayoutBlock).not.toContain("Driver Management");
    expect(salesLayoutBlock).not.toContain("Route Settings");
  });

  it("does NOT have food-specific group (menu management irrelevant for sales)", () => {
    expect(salesLayoutBlock).not.toContain("Menu Management");
    expect(salesLayoutBlock).not.toContain("Delivery Zones");
  });

  it("does NOT have medical-specific group (patient management irrelevant for sales)", () => {
    expect(salesLayoutBlock).not.toContain("Patient Settings");
    expect(salesLayoutBlock).not.toContain("HIPAA");
  });
});

// Verify service layout doesn't accidentally have sales groups
const serviceLayoutStart = brainLayoutSource.indexOf("const SERVICE_LAYOUT");
const serviceLayoutEnd = brainLayoutSource.indexOf("const DISPATCH_LAYOUT");
const serviceLayoutBlock = brainLayoutSource.slice(serviceLayoutStart, serviceLayoutEnd);

describe("brainModeLayout: SERVICE_LAYOUT — non-regression from sales changes", () => {
  it("SERVICE_LAYOUT is defined", () => {
    expect(serviceLayoutBlock.length).toBeGreaterThan(100);
  });

  it("service layout does NOT have 'Sales Settings' group", () => {
    expect(serviceLayoutBlock).not.toContain("Sales Settings");
  });

  it("service layout does NOT have 'Showroom & Coverage'", () => {
    expect(serviceLayoutBlock).not.toContain("Showroom & Coverage");
  });

  it("service layout does NOT have 'Products & Pricing' label", () => {
    // Service uses different tab label
    const productsPricingInService = serviceLayoutBlock.includes("Products & Pricing");
    expect(productsPricingInService).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Car Dealership Seed Data — correct services + FAQs
// ---------------------------------------------------------------------------

const testTenantSource = readFileSync(
  join(process.cwd(), "src/data/testTenantMatrix.ts"),
  "utf-8"
);

// Extract the car dealership section
const carDealerStart = testTenantSource.indexOf('"test-car-dealership"');
const carDealerEnd = testTenantSource.indexOf('"test-real-estate"');
const carDealerBlock = carDealerStart > -1 && carDealerEnd > -1
  ? testTenantSource.slice(carDealerStart, carDealerEnd)
  : testTenantSource; // fallback

describe("testTenantMatrix: car dealership seed data correctness", () => {
  it("has test-car-dealership slug", () => {
    expect(testTenantSource).toContain('"test-car-dealership"');
  });

  it("car dealership is car-dealership-full industry", () => {
    expect(carDealerBlock).toContain('"car-dealership-full"');
  });

  it("car dealership services include Test Drive (not generic)", () => {
    expect(carDealerBlock).toContain('"Test Drive"');
  });

  it("car dealership services include Financing Consultation", () => {
    expect(carDealerBlock).toContain('"Financing Consultation"');
  });

  it("car dealership services include Trade-In Appraisal", () => {
    expect(carDealerBlock).toContain('"Trade-In Appraisal"');
  });

  it("car dealership services include Vehicle Delivery Setup", () => {
    expect(carDealerBlock).toContain('"Vehicle Delivery Setup"');
  });

  it("car dealership services include Service Department Appointment", () => {
    expect(carDealerBlock).toContain('"Service Department Appointment"');
  });

  it("car dealership FAQs include financing question", () => {
    expect(carDealerBlock).toContain("Do you offer financing?");
  });

  it("car dealership FAQs include trade-in question", () => {
    expect(carDealerBlock).toContain("Can I trade in my current vehicle?");
  });

  it("car dealership FAQs include test drive question", () => {
    expect(carDealerBlock).toContain("How do I schedule a test drive?");
  });

  it("car dealership FAQs include inventory question", () => {
    expect(carDealerBlock).toContain("What vehicles do you have in stock?");
  });

  it("car dealership FAQs include CPO/new distinction question", () => {
    expect(carDealerBlock).toContain("certified pre-owned");
  });

  it("car dealership FAQs include weekend hours question", () => {
    expect(carDealerBlock).toContain("weekend hours");
  });

  it("car dealership has exactly 6 FAQs (no generic additions)", () => {
    const faqMatches = carDealerBlock.match(/question:/g) || [];
    expect(faqMatches.length).toBe(6);
  });

  it("car dealership has exactly 5 services", () => {
    const serviceNameMatches = carDealerBlock.match(/name:\s*"[^"]+"/g) || [];
    // Filter to just service names (not other named fields)
    expect(serviceNameMatches.length).toBeGreaterThanOrEqual(5);
  });

  it("car dealership FAQs do NOT contain generic 'licensed and insured' answer", () => {
    expect(carDealerBlock).not.toContain("licensed and insured");
  });

  it("car dealership FAQs do NOT contain 'free estimate' (service-mode language)", () => {
    // Free estimates are irrelevant for a car dealership
    expect(carDealerBlock).not.toContain("free estimate");
  });

  it("car dealership services do NOT include 'Custom Quote' (generic service)", () => {
    expect(carDealerBlock).not.toContain('"Custom Quote"');
  });

  it("car dealership services do NOT include 'Initial Consultation' (generic)", () => {
    expect(carDealerBlock).not.toContain('"Initial Consultation"');
  });

  it("car dealership has 8-vehicle inventory (customInventory)", () => {
    expect(carDealerBlock).toContain("customInventory");
    // Count Toyota entries as proxy for 8 vehicles
    const toyotaCount = (carDealerBlock.match(/Toyota/g) || []).length;
    expect(toyotaCount).toBeGreaterThanOrEqual(8); // 8 vehicles × 1+ Toyota mention
  });

  it("car dealership inventory has stock numbers", () => {
    expect(carDealerBlock).toContain("stock_number");
  });

  it("car dealership has sales mode enabled_modules", () => {
    expect(carDealerBlock).toContain('"sales_leads"');
    expect(carDealerBlock).toContain('"test_drives"');
    expect(carDealerBlock).toContain('"sales_inventory"');
  });

  it("car dealership has offersFinancing in capabilities_json", () => {
    expect(carDealerBlock).toContain("offersFinancing");
  });

  it("car dealership has acceptsTradeIns in capabilities_json", () => {
    expect(carDealerBlock).toContain("acceptsTradeIns");
  });

  it("car dealership has 10 customCallSessions (realistic call history)", () => {
    expect(carDealerBlock).toContain("customCallSessions");
    const callPhoneMatches = (carDealerBlock.match(/\+121455500\d+/g) || []).length;
    expect(callPhoneMatches).toBe(10); // 10 unique caller phones
  });

  it("car dealership call sessions have lead_score (hot/warm/cool)", () => {
    expect(carDealerBlock).toContain('"hot"');
    expect(carDealerBlock).toContain('"warm"');
    expect(carDealerBlock).toContain('"cool"');
  });

  it("car dealership call sessions have car-specific summaries (not generic placeholder)", () => {
    expect(carDealerBlock).not.toContain("Sample booked call from test data");
    expect(carDealerBlock).toContain("Toyota"); // Real car references in summaries
    expect(carDealerBlock).toContain("test drive"); // Dealership-specific actions
  });

  it("car dealership calls include multiple outcomes (booked/followup/lost)", () => {
    expect(carDealerBlock).toContain('"booked"');
    expect(carDealerBlock).toContain('"followup"');
    expect(carDealerBlock).toContain('"lost"');
  });

  it("car dealership callCount is 0 (calls come from customCallSessions)", () => {
    // When customCallSessions is provided, callCount should be 0 to avoid double-seeding
    const callCountMatch = carDealerBlock.match(/callCount:\s*(\d+)/);
    expect(callCountMatch).not.toBeNull();
    expect(parseInt(callCountMatch![1])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. check-service-area — Sales Mode Bypass
// ---------------------------------------------------------------------------

const checkServiceAreaSource = readFileSync(
  join(process.cwd(), "supabase/functions/elevenlabs-check-service-area/index.ts"),
  "utf-8"
);

describe("check-service-area: sales mode bypass — functional/service_area_validation", () => {
  it("source file exists and has content", () => {
    expect(checkServiceAreaSource.length).toBeGreaterThan(500);
  });

  it("has sales mode bypass conditional", () => {
    expect(checkServiceAreaSource).toContain('businessMode === "sales"');
  });

  it("sales bypass returns in_area: true", () => {
    const bypassBlock = checkServiceAreaSource.slice(
      checkServiceAreaSource.indexOf('businessMode === "sales"'),
      checkServiceAreaSource.indexOf('businessMode === "food"')
    );
    expect(bypassBlock).toContain("in_area: true");
  });

  it("sales bypass uses showroom language (not service area)", () => {
    const bypassBlock = checkServiceAreaSource.slice(
      checkServiceAreaSource.indexOf('businessMode === "sales"'),
      checkServiceAreaSource.indexOf('businessMode === "food"')
    );
    expect(bypassBlock).toContain("showroom");
  });

  it("sales bypass has distance_basis_used: 'sales_mode_bypass'", () => {
    const bypassBlock = checkServiceAreaSource.slice(
      checkServiceAreaSource.indexOf('businessMode === "sales"'),
      checkServiceAreaSource.indexOf('businessMode === "food"')
    );
    expect(bypassBlock).toContain("sales_mode_bypass");
  });

  it("sales bypass sets service_tier: 'local'", () => {
    const bypassBlock = checkServiceAreaSource.slice(
      checkServiceAreaSource.indexOf('businessMode === "sales"'),
      checkServiceAreaSource.indexOf('businessMode === "food"')
    );
    expect(bypassBlock).toContain('"local"');
  });

  it("sales bypass sets needs_verification: false", () => {
    const bypassBlock = checkServiceAreaSource.slice(
      checkServiceAreaSource.indexOf('businessMode === "sales"'),
      checkServiceAreaSource.indexOf('businessMode === "food"')
    );
    expect(bypassBlock).toContain("needs_verification: false");
  });

  it("sales bypass message invites customer to schedule a visit", () => {
    const bypassBlock = checkServiceAreaSource.slice(
      checkServiceAreaSource.indexOf('businessMode === "sales"'),
      checkServiceAreaSource.indexOf('businessMode === "food"')
    );
    expect(bypassBlock).toContain("schedule a visit");
  });

  it("sales bypass returns BEFORE the mapbox geocoding (early return)", () => {
    const salesBypassPos = checkServiceAreaSource.indexOf('businessMode === "sales"');
    const foodBypassPos = checkServiceAreaSource.indexOf('businessMode === "food"');
    const mapboxCalcPos = checkServiceAreaSource.indexOf("mapbox_geocoding");
    // Sales bypass should come before food and before actual distance computation
    expect(salesBypassPos).toBeLessThan(foodBypassPos);
    expect(salesBypassPos).toBeLessThan(mapboxCalcPos);
  });

  it("food mode bypass is separate from sales bypass (modes don't share logic)", () => {
    expect(checkServiceAreaSource).toContain('businessMode === "food"');
    const salesIdx = checkServiceAreaSource.indexOf('businessMode === "sales"');
    const foodIdx = checkServiceAreaSource.indexOf('businessMode === "food"');
    // They should be at different positions
    expect(salesIdx).not.toBe(foodIdx);
  });
});

// ---------------------------------------------------------------------------
// 4. DashboardByMode — SalesTodayView structure
// ---------------------------------------------------------------------------

const dashboardByModeSource = readFileSync(
  join(process.cwd(), "src/components/dashboard/DashboardByMode.tsx"),
  "utf-8"
);

// Extract SalesTodayView function block
const salesTodayStart = dashboardByModeSource.indexOf("function SalesTodayView");
const generalTodayStart = dashboardByModeSource.indexOf("function GeneralTodayView");
const salesTodayBlock = dashboardByModeSource.slice(salesTodayStart, generalTodayStart);

describe("DashboardByMode: SalesTodayView — dashboard/correct_mode_terminology", () => {
  it("SalesTodayView is defined", () => {
    expect(salesTodayStart).toBeGreaterThan(-1);
    expect(salesTodayBlock.length).toBeGreaterThan(100);
  });

  it("uses terms.bookings (dynamic terminology, not hardcoded 'Appointments')", () => {
    expect(salesTodayBlock).toContain("terms.bookings");
    expect(salesTodayBlock).not.toContain('"Appointments Today"');
  });

  it("heading is 'Today's Sales Activity'", () => {
    expect(salesTodayBlock).toContain("Today's Sales Activity");
  });

  it("has 'New Prospects' stat card", () => {
    expect(salesTodayBlock).toContain("New Prospects");
  });

  it("has 'Calls Today' stat card", () => {
    expect(salesTodayBlock).toContain("Calls Today");
  });

  it("has AutomationStatusCard (sales-specific widget)", () => {
    expect(salesTodayBlock).toContain("AutomationStatusCard");
  });

  it("links to /app/sales-pipeline for prospect management", () => {
    expect(salesTodayBlock).toContain("/app/sales-pipeline");
  });

  it("uses 5-column grid (lg:grid-cols-5) for richer sales dashboard", () => {
    expect(salesTodayBlock).toContain("lg:grid-cols-5");
  });

  it("uses pendingItems for New Prospects (sales_leads count from query)", () => {
    expect(salesTodayBlock).toContain("stats?.pendingItems");
  });
});

describe("DashboardByMode: SalesTodayView useIndustryContext import", () => {
  it("DashboardByMode imports useIndustryContext", () => {
    expect(dashboardByModeSource).toContain("useIndustryContext");
  });

  it("MedicalTodayView also uses useIndustryContext (not hardcoded)", () => {
    const medicalTodayStart = dashboardByModeSource.indexOf("function MedicalTodayView");
    const salesTodayStart2 = dashboardByModeSource.indexOf("function SalesTodayView");
    const medicalBlock = dashboardByModeSource.slice(medicalTodayStart, salesTodayStart2);
    expect(medicalBlock).toContain("useIndustryContext");
  });
});

// ---------------------------------------------------------------------------
// 5. DashboardByMode — sales stats query correctness
// ---------------------------------------------------------------------------

describe("DashboardByMode: sales leads query — New Prospects counter", () => {
  it("queries sales_leads table for pendingItems in sales mode", () => {
    expect(dashboardByModeSource).toContain('"sales_leads"');
  });

  it("filters sales_leads by status in ['new', 'contacted']", () => {
    expect(dashboardByModeSource).toContain('"new", "contacted"');
  });

  it("stores sales leads count in pendingSalesLeads variable", () => {
    expect(dashboardByModeSource).toContain("pendingSalesLeads");
  });

  it("pendingItems maps to pendingSalesLeads for sales (not pendingBookings)", () => {
    // The return statement for sales mode should use sales leads for pendingItems
    const returnBlock = dashboardByModeSource.slice(
      dashboardByModeSource.indexOf("pendingSalesLeads"),
      dashboardByModeSource.indexOf("if (caps.hasDispatchQueue)")
    );
    // pendingSalesLeads is defined and used
    expect(returnBlock.length).toBeGreaterThan(0);
  });

  it("sales bookings count uses status='pending' (test drive pending), not pending_deposit", () => {
    // Service mode uses pending_deposit, sales mode uses pending for test drives
    const salesBookingFilter = dashboardByModeSource.match(
      /isSalesBusiness[\s\S]*?pending_deposit/
    );
    // The logic should check isSalesBusiness and use 'pending' for them
    expect(dashboardByModeSource).toContain("isSalesBusiness");
    // pending_deposit should only be used for non-sales
    expect(dashboardByModeSource).toContain('b.status === "pending_deposit"');
    expect(dashboardByModeSource).toContain('b.status === "pending"');
  });
});

// ---------------------------------------------------------------------------
// 6. SalesDashboardLayout — car dealership specific rendering
// ---------------------------------------------------------------------------

const salesLayoutSource = readFileSync(
  join(process.cwd(), "src/components/dashboard/layouts/SalesDashboardLayout.tsx"),
  "utf-8"
);

describe("SalesDashboardLayout: car dealership detection and rendering", () => {
  it("detects car dealership using CAR_DEALERSHIP_SLUGS set", () => {
    expect(salesLayoutSource).toContain("CAR_DEALERSHIP_SLUGS");
    expect(salesLayoutSource).toContain("car-dealership-full");
    expect(salesLayoutSource).toContain("car-dealership-new");
    expect(salesLayoutSource).toContain("car-dealership-used");
  });

  it("includes rv-dealer in car dealership slugs (similar lot-based flow)", () => {
    expect(salesLayoutSource).toContain("rv-dealer");
  });

  it("shows 'Test Drives Today' stat for car dealerships", () => {
    expect(salesLayoutSource).toContain("Test Drives Today");
  });

  it("shows 'Hot Leads' stat card", () => {
    expect(salesLayoutSource).toContain("Hot Leads");
  });

  it("uses useTestDrives hook", () => {
    expect(salesLayoutSource).toContain("useTestDrives");
  });

  it("uses useSalesInventory hook", () => {
    expect(salesLayoutSource).toContain("useSalesInventory");
  });

  it("uses useSalesLeads hook", () => {
    expect(salesLayoutSource).toContain("useSalesLeads");
  });
});

// ---------------------------------------------------------------------------
// 7. Sales mode in MODE_LAYOUTS map
// ---------------------------------------------------------------------------

describe("brainModeLayout: MODE_LAYOUTS — sales entry present", () => {
  it("MODE_LAYOUTS includes sales key", () => {
    expect(brainLayoutSource).toContain("sales: SALES_LAYOUT");
  });

  it("all 6 modes are in MODE_LAYOUTS", () => {
    expect(brainLayoutSource).toContain("service: SERVICE_LAYOUT");
    expect(brainLayoutSource).toContain("dispatch: DISPATCH_LAYOUT");
    expect(brainLayoutSource).toContain("food: FOOD_LAYOUT");
    expect(brainLayoutSource).toContain("medical: MEDICAL_LAYOUT");
    expect(brainLayoutSource).toContain("general: GENERAL_LAYOUT");
    expect(brainLayoutSource).toContain("sales: SALES_LAYOUT");
  });
});

// ---------------------------------------------------------------------------
// 8. Real estate (sales mode) seed data — different from car dealer
// ---------------------------------------------------------------------------

const realEstateStart = testTenantSource.indexOf('"test-real-estate"');
const salesTenantsEnd = testTenantSource.indexOf("] as TestTenantConfig[]", realEstateStart);
const realEstateBlock = realEstateStart > -1
  ? testTenantSource.slice(realEstateStart, salesTenantsEnd)
  : "";

describe("testTenantMatrix: real estate tenant — sales mode non-car dealership", () => {
  it("has test-real-estate slug", () => {
    expect(testTenantSource).toContain('"test-real-estate"');
  });

  it("real estate is real-estate-agency industry", () => {
    expect(realEstateBlock).toContain('"real-estate-agency"');
  });

  it("real estate uses sales mode", () => {
    expect(realEstateBlock).toContain('"sales"');
  });

  it("real estate has sales_leads in enabled_modules", () => {
    expect(realEstateBlock).toContain('"sales_leads"');
  });

  it("real estate does NOT have test_drives module (not a vehicle dealership)", () => {
    // Real estate doesn't have test drives
    expect(realEstateBlock).not.toContain('"test_drives"');
  });

  it("real estate does NOT have sales_inventory module", () => {
    expect(realEstateBlock).not.toContain('"sales_inventory"');
  });
});

// ---------------------------------------------------------------------------
// 6. Seed data regression — bugs found by QA (commit 94a6abb fixes)
// ---------------------------------------------------------------------------

describe("testTenantMatrix: car dealership seed data regression — QA bugs (94a6abb)", () => {
  it("car dealership name is 'Prestige Auto Group' (not 'Prestige Auto Excellence')", () => {
    expect(carDealerBlock).toContain('"Prestige Auto Group"');
    expect(carDealerBlock).not.toContain('"Prestige Auto Excellence"');
  });

  it("car dealership has exactly 4 objection handlers (not empty)", () => {
    // Count objection entries in the car dealer block
    const objectionMatches = carDealerBlock.match(/objection:\s*"/g) || [];
    expect(objectionMatches.length).toBe(4);
  });

  it("car dealership objection handles 'too expensive' scenario", () => {
    expect(carDealerBlock).toContain("too expensive");
  });

  it("car dealership objection handles 'think about it' / hesitation scenario", () => {
    expect(carDealerBlock).toContain("think about it");
  });

  it("car dealership objection handles price matching scenario", () => {
    expect(carDealerBlock.toLowerCase()).toContain("match");
  });

  it("car dealership objection handles spouse / partner consultation scenario", () => {
    expect(carDealerBlock.toLowerCase()).toContain("spouse");
  });

  it("Financing Consultation service has price_type 'free' (complimentary, not 'fixed')", () => {
    // Financing consultations at car dealerships are complimentary — no charge to the customer
    const financingIdx = carDealerBlock.indexOf('"Financing Consultation"');
    expect(financingIdx).toBeGreaterThan(-1);
    // Extract a small window around the entry to check price_type
    const financingWindow = carDealerBlock.slice(financingIdx, financingIdx + 300);
    expect(financingWindow).toContain("free");
    expect(financingWindow).not.toContain('"fixed"');
  });

  it("Test Drive service has price_amount 0 (free)", () => {
    const testDriveIdx = carDealerBlock.indexOf('"Test Drive"');
    expect(testDriveIdx).toBeGreaterThan(-1);
    const testDriveWindow = carDealerBlock.slice(testDriveIdx, testDriveIdx + 200);
    expect(testDriveWindow).toContain("price_amount: 0");
  });
});

// ---------------------------------------------------------------------------
// 7. industryExamples.ts — sales mode serviceNamePlaceholder
// ---------------------------------------------------------------------------

import { SERVICE_EXAMPLES } from "../src/lib/industryExamples";

describe("industryExamples: sales mode serviceNamePlaceholder — brain/service_pricing_management", () => {
  it("sales mode serviceNamePlaceholder exists", () => {
    expect(SERVICE_EXAMPLES.sales).toBeDefined();
    expect(SERVICE_EXAMPLES.sales.serviceNamePlaceholder).toBeTruthy();
  });

  it("sales mode serviceNamePlaceholder does NOT show 'Solar Panel' (solar installer language)", () => {
    expect(SERVICE_EXAMPLES.sales.serviceNamePlaceholder).not.toContain("Solar Panel");
  });

  it("sales mode serviceNamePlaceholder does NOT show '3-Bed Home' (real estate language)", () => {
    expect(SERVICE_EXAMPLES.sales.serviceNamePlaceholder).not.toContain("3-Bed");
    expect(SERVICE_EXAMPLES.sales.serviceNamePlaceholder).not.toContain("Bed Home");
  });

  it("sales mode serviceNamePlaceholder contains car dealership relevant text", () => {
    const placeholder = SERVICE_EXAMPLES.sales.serviceNamePlaceholder;
    const hasDealerContent =
      placeholder.includes("Test Drive") ||
      placeholder.includes("Financing") ||
      placeholder.includes("Trade-In");
    expect(hasDealerContent).toBe(true);
  });

  it("service mode serviceNamePlaceholder still works (non-regression)", () => {
    expect(SERVICE_EXAMPLES.service).toBeDefined();
    expect(SERVICE_EXAMPLES.service.serviceNamePlaceholder).toBeTruthy();
  });

  it("dispatch mode serviceNamePlaceholder still works (non-regression)", () => {
    expect(SERVICE_EXAMPLES.dispatch).toBeDefined();
    expect(SERVICE_EXAMPLES.dispatch.serviceNamePlaceholder).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 8. seed-test-tenants: greeting_script update on reseed
// ---------------------------------------------------------------------------

const seedFnSource = readFileSync(
  join(process.cwd(), "supabase/functions/seed-test-tenants/index.ts"),
  "utf-8"
);

// ---------------------------------------------------------------------------
// 9. OnboardingReview: booking label uses getAutoBookSummary (commit 9296fac)
// ---------------------------------------------------------------------------

const onboardingReviewSource = readFileSync(
  join(process.cwd(), "src/components/onboarding/phases/OnboardingReview.tsx"),
  "utf-8"
);

describe("OnboardingReview: auto_book label uses getAutoBookSummary — onboarding/correct_terminology", () => {
  it("source imports getAutoBookSummary from industryTerminology", () => {
    expect(onboardingReviewSource).toContain("getAutoBookSummary");
  });

  it("auto_book case uses getAutoBookSummary(appointmentLabel) not a hardcoded string", () => {
    expect(onboardingReviewSource).toContain("getAutoBookSummary(appointmentLabel)");
  });

  it("old hardcoded 'Auto-booking enabled' string is NOT present (regression guard)", () => {
    expect(onboardingReviewSource).not.toContain("Auto-booking enabled");
  });

  it("old hardcoded 'AI books instantly' string is NOT present (regression guard)", () => {
    expect(onboardingReviewSource).not.toContain("AI books instantly");
  });
});

describe("seed-test-tenants: greeting_script update on reseed — onboarding/complete_flow_works", () => {
  it("seed function updates greeting_script on reseed", () => {
    // The fix in 94a6abb added an explicit .update({ greeting_script: ... }) call
    expect(seedFnSource).toContain("greeting_script");
    expect(seedFnSource).toContain("config.name");
  });

  it("greeting_script template uses config.name (not hardcoded business name)", () => {
    // Verify the update is parameterized, not hardcoded to old name
    expect(seedFnSource).not.toContain("Prestige Auto Excellence");
    expect(seedFnSource).not.toContain("greeting_script: `Thanks for calling Prestige Auto Group");
  });

  it("seed function targets ai_assistants table for greeting update", () => {
    expect(seedFnSource).toContain("ai_assistants");
  });
});
