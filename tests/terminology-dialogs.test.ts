/**
 * Terminology Dialog & Component Contract Tests
 *
 * @vitest-environment node
 *
 * Verifies that booking-related dialog components and calendar components
 * use mode-aware terminology instead of hardcoded strings.
 *
 * Bug caught: CreateBookingDialog, EditBookingDialog, CancelBookingDialog,
 * and DayAvailabilityTimeline all used hardcoded "Booking"/"Appointment"
 * instead of mode-aware terms from useIndustryContext().
 *
 * Also verifies food_orders status enum values are correct.
 *
 * Gates: dashboard/correct_mode_terminology, overall/no_console_errors
 */
import { describe, it, expect } from "vitest";
import { getTerminology } from "../src/lib/terminology";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const ALL_MODES = ["service", "dispatch", "food", "medical", "sales", "general"] as const;

// ─── Terminology capitalization helper ──────────────────────────────────────
describe("Terminology capitalization for dialogs", () => {
  for (const mode of ALL_MODES) {
    it(`${mode}: booking term capitalizes correctly for dialog titles`, () => {
      const t = getTerminology(mode);
      const capitalized = t.booking.charAt(0).toUpperCase() + t.booking.slice(1);
      // Dialog titles like "Create Booking" / "Edit Job" / "Cancel Order"
      expect(capitalized.length).toBeGreaterThan(0);
      expect(capitalized[0]).toBe(capitalized[0].toUpperCase());
      // Verify the term is a real word, not empty
      expect(t.booking.trim().length).toBeGreaterThan(2);
    });

    it(`${mode}: customer term works in labels`, () => {
      const t = getTerminology(mode);
      // Used in form labels via capitalization: "Customer Name" / "Patient Name" / "Guest Name"
      expect(t.customer.length).toBeGreaterThan(0);
      // Verify capitalized version is valid for UI labels
      const capitalized = t.customer.charAt(0).toUpperCase() + t.customer.slice(1);
      expect(capitalized.length).toBeGreaterThan(2);
    });
  }
});

// ─── Dialog components use useIndustryContext ──────────────────────────────
describe("Dialog components import useIndustryContext", () => {
  const dialogFiles = [
    "src/components/calendar/CreateBookingDialog.tsx",
    "src/components/bookings/EditBookingDialog.tsx",
    "src/components/bookings/CancelBookingDialog.tsx",
  ];

  for (const file of dialogFiles) {
    it(`${file.split("/").pop()} imports useIndustryContext`, () => {
      const content = readFileSync(resolve(file), "utf-8");
      expect(content).toContain("useIndustryContext");
    });

    it(`${file.split("/").pop()} does not have hardcoded "Create Booking" or "Edit Booking" or "Cancel Booking" title`, () => {
      const content = readFileSync(resolve(file), "utf-8");
      // Should use terms.booking instead of hardcoded "Booking"
      expect(content).not.toMatch(/DialogTitle>Create Booking</);
      expect(content).not.toMatch(/DialogTitle>Edit Booking</);
      expect(content).not.toMatch(/AlertDialogTitle>Cancel Booking</);
    });
  }
});

// ─── DayAvailabilityTimeline uses mode-aware label ──────────────────────────
describe("DayAvailabilityTimeline mode-aware labels", () => {
  it("imports useIndustryContext", () => {
    const content = readFileSync(
      resolve("src/components/availability/DayAvailabilityTimeline.tsx"),
      "utf-8"
    );
    expect(content).toContain("useIndustryContext");
  });

  it('does not have hardcoded "Appointment" fallback', () => {
    const content = readFileSync(
      resolve("src/components/availability/DayAvailabilityTimeline.tsx"),
      "utf-8"
    );
    // Should use bookingLabel from terms, not hardcoded "Appointment"
    expect(content).not.toMatch(/reason \|\| "Appointment"/);
  });
});

// ─── DashboardByMode uses mode-aware "Today" title ──────────────────────────
describe("DashboardByMode mode-aware stat titles", () => {
  it('does not have hardcoded "Appointments Today"', () => {
    const content = readFileSync(
      resolve("src/components/dashboard/DashboardByMode.tsx"),
      "utf-8"
    );
    expect(content).not.toContain('"Appointments Today"');
  });
});

// ─── Food order status enum correctness ─────────────────────────────────────
describe("Food order status enum", () => {
  // Valid status values from migration 20260128124807
  const VALID_STATUSES = [
    "pending", "confirmed", "preparing", "ready",
    "out_for_delivery", "completed", "cancelled",
  ];

  it("useFoodDashboard only uses valid order_status enum values", () => {
    const content = readFileSync(
      resolve("src/hooks/useFoodDashboard.ts"),
      "utf-8"
    );
    // Extract all status string comparisons
    const statusMatches = content.match(/o\.status === "([^"]+)"/g) || [];
    const usedStatuses = statusMatches.map(m => {
      const match = m.match(/"([^"]+)"/);
      return match ? match[1] : "";
    });

    for (const status of usedStatuses) {
      expect(
        VALID_STATUSES,
        `"${status}" is not a valid order_status enum value`
      ).toContain(status);
    }
  });

  it("does not reference non-existent 'ready_for_pickup' status", () => {
    const content = readFileSync(
      resolve("src/hooks/useFoodDashboard.ts"),
      "utf-8"
    );
    expect(content).not.toContain("ready_for_pickup");
  });
});

// ─── CreateBookingDialog date/time input types (regression: booking_date_picker_works) ──
describe("CreateBookingDialog: date and time inputs (regression: functional/booking_date_picker_works)", () => {
  // Root cause of gate failure: dialog previously had no date/time inputs at all.
  // Fix (commit 3887730): added type="date" and type="time" Input fields.
  // These tests prevent regression — if someone replaces the inputs with non-editable text,
  // the date picker gate will fail again.
  const source = readFileSync(
    resolve("src/components/calendar/CreateBookingDialog.tsx"),
    "utf-8"
  );

  it('has a type="date" input for date selection', () => {
    expect(source).toContain('type="date"');
  });

  it('has a type="time" input for time selection', () => {
    expect(source).toContain('type="time"');
  });

  it("date input has onChange handler (is editable, not display-only)", () => {
    const lines = source.split("\n");
    const dateLine = lines.findIndex(l => l.includes('type="date"'));
    expect(dateLine).toBeGreaterThan(-1);
    const dateBlock = lines.slice(dateLine - 2, dateLine + 5).join("\n");
    expect(dateBlock).toContain("onChange");
  });

  it("time input has onChange handler (is editable, not display-only)", () => {
    const lines = source.split("\n");
    const timeLine = lines.findIndex(l => l.includes('type="time"'));
    expect(timeLine).toBeGreaterThan(-1);
    const timeBlock = lines.slice(timeLine - 2, timeLine + 5).join("\n");
    expect(timeBlock).toContain("onChange");
  });

  it("derives startTime and endTime from user-selected date and time", () => {
    expect(source).toContain("startTime");
    expect(source).toContain("endTime");
    expect(source).toContain("start_at: startTime.toISOString()");
    expect(source).toContain("end_at: endTime.toISOString()");
  });
});

// ─── Error boundary coverage on high-risk pages ─────────────────────────────
describe("Error boundary coverage on data-heavy pages", () => {
  const criticalPages = [
    { file: "src/pages/app/CustomersPage.tsx", name: "CustomersPage" },
    { file: "src/pages/app/CallsPage.tsx", name: "CallsPage" },
    { file: "src/pages/app/LeadsPage.tsx", name: "LeadsPage" },
    { file: "src/pages/app/ReportsROIPage.tsx", name: "ReportsROIPage" },
  ];

  for (const { file, name } of criticalPages) {
    it(`${name} imports ErrorBoundary`, () => {
      const content = readFileSync(resolve(file), "utf-8");
      expect(content).toContain("ErrorBoundary");
    });

    it(`${name} uses <ErrorBoundary in render`, () => {
      const content = readFileSync(resolve(file), "utf-8");
      expect(content).toContain("<ErrorBoundary");
    });
  }
});
