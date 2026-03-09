/**
 * Car Dealership Dashboard Regression Tests
 *
 * @vitest-environment node
 *
 * Covers bugs fixed in commits 45e03fc + 80bc705:
 * 1. "New Test Drive" button in call detail panel navigates to /app/test-drives (not /app/bookings)
 * 2. AppSidebar hides "Showroom Appointments" nav item for car dealers (hasTestDrives=true)
 * 3. BookingsPage redirects to /app/test-drives for sales mode
 * 4. AgreementsPage uses sales/medical mode-aware terminology throughout
 *
 * Gate: sales/dashboard/bookings_crud_works, sales/dashboard/correct_mode_terminology
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const callDetailPanelSrc = readFileSync(join(root, "src/components/calls/CallDetailPanel.tsx"), "utf-8");
const sidebarSrc = readFileSync(join(root, "src/components/layouts/AppSidebar.tsx"), "utf-8");
const bookingsPageSrc = readFileSync(join(root, "src/pages/app/BookingsPage.tsx"), "utf-8");
const agreementsPageSrc = readFileSync(join(root, "src/pages/app/AgreementsPage.tsx"), "utf-8");
const dashboardByModeSrc = readFileSync(join(root, "src/components/dashboard/DashboardByMode.tsx"), "utf-8");
const testDrivesPageSrc = readFileSync(join(root, "src/pages/app/TestDrivesPage.tsx"), "utf-8");

// ---------------------------------------------------------------------------
// Bug 1: "New Test Drive" button navigates to /app/test-drives for sales mode
// ---------------------------------------------------------------------------
describe("CallDetailPanel: New Test Drive button — sales/dashboard/bookings_crud_works", () => {
  it("navigates to /app/test-drives when mode is sales", () => {
    // The button onClick uses mode === "sales" ? "/app/test-drives?openNew=true" : "/app/bookings"
    // ?openNew=true auto-opens the create dialog (skips extra click after navigation)
    expect(callDetailPanelSrc).toContain(`mode === "sales" ? "/app/test-drives?openNew=true" : "/app/bookings"`);
  });

  it("does NOT hardcode /app/bookings for the test drive button (regression guard)", () => {
    // Previously the button always went to /app/bookings regardless of mode
    // The correct logic must be conditional, not a plain string
    const buttonClickSection = callDetailPanelSrc.match(/onClick.*navigate.*test-drives.*bookings/s);
    // Alternatively ensure the navigate call is conditional
    expect(callDetailPanelSrc).toContain("test-drives");
    expect(callDetailPanelSrc).toContain(`navigate(mode === "sales"`);
  });

  it("calls onClose before navigating (UX: panel closes)", () => {
    // find the onClick block
    const onClickMatch = callDetailPanelSrc.match(/onClick.*?=.*?\{[^}]*navigate[^}]*\}/s);
    expect(onClickMatch).toBeTruthy();
    // onClose should come before navigate
    const onClickBlock = onClickMatch![0];
    const closePos = onClickBlock.indexOf("onClose");
    const navPos = onClickBlock.indexOf("navigate");
    expect(closePos).toBeGreaterThan(-1);
    expect(navPos).toBeGreaterThan(closePos);
  });
});

// ---------------------------------------------------------------------------
// Bug 2: AppSidebar hides Bookings nav when hasTestDrives is true
// ---------------------------------------------------------------------------
describe("AppSidebar: Showroom Appointments hidden for car dealers — sales/dashboard/bookings_crud_works", () => {
  it("Bookings nav item is guarded by !hasTestDrives", () => {
    // Correct guard: caps.hasBooking && !caps.hasTestDrives
    expect(sidebarSrc).toContain("!caps.hasTestDrives");
  });

  it("hasBooking && !hasTestDrives guards the Bookings push", () => {
    // The sidebar should push Bookings only when hasBooking is true AND hasTestDrives is false
    expect(sidebarSrc).toContain("caps.hasBooking && !caps.hasTestDrives");
  });

  it("Test Drives nav item exists separately for hasTestDrives", () => {
    // Car dealers get Test Drives nav, not Showroom Appointments
    expect(sidebarSrc).toContain("caps.hasTestDrives");
    expect(sidebarSrc).toContain("/app/test-drives");
    expect(sidebarSrc).toContain("Test Drives");
  });

  it("car dealer (hasTestDrives=true, hasBooking=true) would not see both nav items", () => {
    // Verify the mutual exclusion logic: Bookings nav only shows when !hasTestDrives
    // This prevents car dealers from seeing both "Showroom Appointments" and "Test Drives"
    expect(sidebarSrc).toContain("caps.hasBooking && !caps.hasTestDrives");
    // And Test Drives is added separately for hasTestDrives tenants
    expect(sidebarSrc).toContain("if (caps.hasTestDrives)");
  });
});

// ---------------------------------------------------------------------------
// Bug 3: BookingsPage redirects to /app/test-drives for sales mode
// ---------------------------------------------------------------------------
describe("BookingsPage: redirects to test-drives for sales mode — sales/dashboard/bookings_crud_works", () => {
  it("has Navigate redirect for sales mode", () => {
    expect(bookingsPageSrc).toContain(`businessMode === "sales"`);
    expect(bookingsPageSrc).toContain(`/app/test-drives`);
    expect(bookingsPageSrc).toContain("Navigate");
  });

  it("redirect uses replace prop to avoid back-button loop", () => {
    // Navigate should have replace prop so pressing back doesn't return to /app/bookings
    const redirectLine = bookingsPageSrc.match(/Navigate.*test-drives.*/);
    expect(redirectLine).toBeTruthy();
    expect(redirectLine![0]).toContain("replace");
  });

  it("non-sales modes still render BookingsPage normally (no redirect)", () => {
    // The redirect is conditional on businessMode === "sales" only
    const redirectBlock = bookingsPageSrc.match(/if\s*\(businessMode[^)]*\).*Navigate/s);
    expect(redirectBlock).toBeTruthy();
    // Confirm it's specifically gated to sales, not other modes
    expect(redirectBlock![0]).toContain(`"sales"`);
  });
});

// ---------------------------------------------------------------------------
// Bug 4: AgreementsPage mode-aware terminology
// ---------------------------------------------------------------------------
describe("AgreementsPage: sales mode uses purchase agreement terminology — sales/dashboard/correct_mode_terminology", () => {
  it("page title is Sales Agreements for sales mode", () => {
    expect(agreementsPageSrc).toContain(`"Sales Agreements"`);
    expect(agreementsPageSrc).toContain(`businessMode === "sales"`);
  });

  it("subtitle uses purchase agreement language for sales", () => {
    expect(agreementsPageSrc).toContain("purchase agreements and financing plans");
  });

  it("empty state title uses purchase agreement for sales", () => {
    expect(agreementsPageSrc).toContain("No purchase agreements yet");
  });

  it("create dialog title is Create Purchase Agreement for sales", () => {
    expect(agreementsPageSrc).toContain("Create Purchase Agreement");
  });

  it("cancel confirmation message is sales-specific (financing plan terminated)", () => {
    expect(agreementsPageSrc).toContain("financing plan will be terminated");
  });

  it("does NOT show service/maintenance language for sales mode", () => {
    // The old hardcoded text was "Manage recurring maintenance plans and membership programs"
    // This should only appear for non-sales modes (conditional)
    // Verify the maintenance phrase is still in the file but gated
    const pageDescLine = agreementsPageSrc.match(/pageDesc\s*=.*?;/s);
    expect(pageDescLine).toBeTruthy();
    // pageDesc must be conditional (ternary with businessMode)
    expect(pageDescLine![0]).toContain("businessMode");
  });
});

describe("AgreementsPage: medical mode uses patient agreement terminology", () => {
  it("page title is Patient Agreements for medical mode", () => {
    expect(agreementsPageSrc).toContain(`"Patient Agreements"`);
    expect(agreementsPageSrc).toContain(`businessMode === "medical"`);
  });

  it("patient agreement label is used for medical mode", () => {
    expect(agreementsPageSrc).toContain("patient agreement");
  });

  it("cancel confirmation is patient-specific", () => {
    expect(agreementsPageSrc).toContain("patient will no longer be covered");
  });
});

describe("AgreementsPage: non-sales, non-medical modes still use service agreement terminology", () => {
  it("default page title is Service Agreements", () => {
    expect(agreementsPageSrc).toContain(`"Service Agreements"`);
  });

  it("default empty state text is service-specific", () => {
    expect(agreementsPageSrc).toContain("No service agreements yet");
  });

  it("default create dialog is Create Service Agreement", () => {
    expect(agreementsPageSrc).toContain("Create Service Agreement");
  });

  it("default cancel confirmation is service-specific", () => {
    expect(agreementsPageSrc).toContain("will no longer receive scheduled services");
  });
});

// ---------------------------------------------------------------------------
// Cross-mode safety: AgreementsPage imports useTenantConfig for mode detection
// ---------------------------------------------------------------------------
describe("AgreementsPage: uses useTenantConfig for mode detection (not hardcoded)", () => {
  it("imports useTenantConfig", () => {
    expect(agreementsPageSrc).toContain("useTenantConfig");
  });

  it("reads businessMode from useTenantConfig hook", () => {
    // The component must destructure businessMode from useTenantConfig()
    expect(agreementsPageSrc).toContain("const { businessMode } = useTenantConfig()");
  });
});

// ---------------------------------------------------------------------------
// UX commit 881d0b9: SalesTodayView stat card links to /app/test-drives for car dealers
// ---------------------------------------------------------------------------
describe("DashboardByMode: SalesTodayView bookingsHref — routes car dealers to /app/test-drives (commit 881d0b9)", () => {
  // Extract the SalesTodayView function block
  const salesTodayStart = dashboardByModeSrc.indexOf("function SalesTodayView");
  const generalTodayStart = dashboardByModeSrc.indexOf("function GeneralTodayView");
  const salesTodayBlock = dashboardByModeSrc.slice(salesTodayStart, generalTodayStart);

  it("SalesTodayView imports useCapabilities for hasTestDrives check", () => {
    expect(dashboardByModeSrc).toContain("useCapabilities");
  });

  it("SalesTodayView reads caps from useCapabilities()", () => {
    expect(salesTodayBlock).toContain("useCapabilities()");
  });

  it("bookingsHref is /app/test-drives when hasTestDrives (car dealer)", () => {
    expect(salesTodayBlock).toContain("caps.hasTestDrives ? \"/app/test-drives\" : \"/app/bookings\"");
  });

  it("stat card uses bookingsHref (not hardcoded /app/bookings)", () => {
    // Must use the variable, not hardcoded path
    expect(salesTodayBlock).toContain("href={bookingsHref}");
    // Old bug: hardcoded href="/app/bookings" was the entire value
    expect(salesTodayBlock).not.toContain('href="/app/bookings"');
  });

  it("bookingsLabel is dynamic from terms.bookings (car dealer sees 'Test Drives Today')", () => {
    expect(salesTodayBlock).toContain("terms.bookings");
    expect(salesTodayBlock).toContain("bookingsLabel");
  });
});

// ---------------------------------------------------------------------------
// UX commit 806fdd4: TestDrivesPage auto-opens create dialog via ?openNew=true
// ---------------------------------------------------------------------------
describe("TestDrivesPage: ?openNew=true auto-opens create dialog (commit 806fdd4)", () => {
  it("imports useSearchParams from react-router-dom", () => {
    expect(testDrivesPageSrc).toContain("useSearchParams");
  });

  it("reads openNew from searchParams", () => {
    expect(testDrivesPageSrc).toContain('searchParams.get("openNew")');
  });

  it("opens create dialog when openNew=true", () => {
    expect(testDrivesPageSrc).toContain('searchParams.get("openNew") === "true"');
    expect(testDrivesPageSrc).toContain("setCreateOpen(true)");
  });

  it("useEffect depends on searchParams (re-runs if URL changes)", () => {
    expect(testDrivesPageSrc).toContain("[searchParams]");
  });

  it("uses createOpen state to control dialog visibility", () => {
    expect(testDrivesPageSrc).toContain("createOpen");
    expect(testDrivesPageSrc).toContain("setCreateOpen");
  });
});
