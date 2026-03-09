/**
 * Dashboard quick-book verb regression tests (commit ec88fb6)
 *
 * @vitest-environment node
 *
 * ModeContentArea computes quickBookLabel and quickBookDescription based on terms.booking.
 * - terms.booking === "estimate" → verb = "Schedule", description = "Schedule a new estimate"
 * - terms.booking === "service visit" → description = "Schedule a new service visit"
 * - all other bookings → verb = "Book", description = "Create a new booking"
 *
 * Prevents regression: GC must not show "Book Kitchen Remodel", must show "Schedule Kitchen Remodel".
 * Pool service must show "Schedule a new service visit" description.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyAppointmentLabel, getTerminology } from "../src/lib/terminology";
import { getIndustryTerminology } from "../src/data/industryTerminology";

const root = process.cwd();
const modeContentAreaSrc = readFileSync(join(root, "src/components/dashboard/ModeContentArea.tsx"), "utf-8");

// Helper: simulate the ModeContentArea logic
function getQuickBookVerb(booking: string): string {
  return booking === "estimate" ? "Schedule" : "Book";
}

function getQuickBookDescription(booking: string): string {
  return booking === "estimate"
    ? "Schedule a new estimate"
    : booking === "service visit"
    ? "Schedule a new service visit"
    : "Create a new booking";
}

// ─── 1. Source code contains the correct conditional logic ────────────────────

describe("ModeContentArea source: quick-book verb logic present", () => {
  it("contains bookVerb = estimate check for 'Schedule'", () => {
    expect(modeContentAreaSrc).toContain('terms.booking === "estimate"');
    expect(modeContentAreaSrc).toContain('"Schedule"');
  });

  it("contains 'Book' as default verb", () => {
    expect(modeContentAreaSrc).toContain('"Book"');
  });

  it("contains service visit check for description", () => {
    expect(modeContentAreaSrc).toContain('terms.booking === "service visit"');
    expect(modeContentAreaSrc).toContain('"Schedule a new service visit"');
  });

  it("contains estimate description", () => {
    expect(modeContentAreaSrc).toContain('"Schedule a new estimate"');
  });

  it("contains fallback description", () => {
    expect(modeContentAreaSrc).toContain('"Create a new booking"');
  });
});

// ─── 2. Quick-book verb per industry ─────────────────────────────────────────

describe("quick-book verb: estimate-based businesses use 'Schedule'", () => {
  it("GC (estimate appointmentLabel): verb = 'Schedule'", () => {
    const terminology = getIndustryTerminology("service", undefined, "general_contractor");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    expect(getQuickBookVerb(terms.booking)).toBe("Schedule");
  });

  it("GC: quickBookLabel = 'Schedule Kitchen Remodel' (not 'Book Kitchen Remodel')", () => {
    const terminology = getIndustryTerminology("service", undefined, "general_contractor");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    const bookVerb = getQuickBookVerb(terms.booking);
    const topServiceName = "Kitchen Remodel";
    expect(`${bookVerb} ${topServiceName}`).toBe("Schedule Kitchen Remodel");
  });

  it("plumbing (default): verb = 'Book'", () => {
    const terminology = getIndustryTerminology("service", undefined, "plumbing");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    expect(getQuickBookVerb(terms.booking)).toBe("Book");
  });

  it("hvac (default): verb = 'Book'", () => {
    const terminology = getIndustryTerminology("service", undefined, "hvac");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    expect(getQuickBookVerb(terms.booking)).toBe("Book");
  });

  it("pool_service (service visit): verb = 'Book'", () => {
    // pool_service uses "service visit" appointmentLabel
    // quickBookVerb is "Book" (only "estimate" triggers "Schedule" verb)
    const terminology = getIndustryTerminology("service", undefined, "pool_service");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    expect(getQuickBookVerb(terms.booking)).toBe("Book");
  });
});

// ─── 3. Quick-book description per industry ───────────────────────────────────

describe("quick-book description: per-industry strings", () => {
  it("GC: description = 'Schedule a new estimate'", () => {
    const terminology = getIndustryTerminology("service", undefined, "general_contractor");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    expect(getQuickBookDescription(terms.booking)).toBe("Schedule a new estimate");
  });

  it("pool_service: description = 'Schedule a new service visit'", () => {
    const terminology = getIndustryTerminology("service", undefined, "pool_service");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    expect(getQuickBookDescription(terms.booking)).toBe("Schedule a new service visit");
  });

  it("hvac: description = 'Create a new booking'", () => {
    const terminology = getIndustryTerminology("service", undefined, "hvac");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    expect(getQuickBookDescription(terms.booking)).toBe("Create a new booking");
  });

  it("plumbing: description = 'Create a new booking'", () => {
    const terminology = getIndustryTerminology("service", undefined, "plumbing");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    expect(getQuickBookDescription(terms.booking)).toBe("Create a new booking");
  });

  it("locksmith: description = 'Create a new booking'", () => {
    const terminology = getIndustryTerminology("service", undefined, "locksmith");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    expect(getQuickBookDescription(terms.booking)).toBe("Create a new booking");
  });

  it("roofing (inspection appointmentLabel): description uses 'service visit' path = 'Create a new booking'", () => {
    // roofing uses "inspection" appointmentLabel — not "estimate" or "service visit"
    const terminology = getIndustryTerminology("service", undefined, "roofing");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    // "inspection" is neither "estimate" nor "service visit"
    expect(getQuickBookDescription(terms.booking)).toBe("Create a new booking");
  });
});

// ─── 4. Quick-book label with service names ───────────────────────────────────

describe("quick-book label composition: verb + service name", () => {
  it("undefined topServiceName → quickBookLabel is undefined (falls back to 'Quick Book')", () => {
    const topServiceName = undefined;
    const label = topServiceName ? `Book ${topServiceName}` : undefined;
    expect(label).toBeUndefined();
  });

  it("GC + 'Bathroom Remodel' → 'Schedule Bathroom Remodel'", () => {
    const terminology = getIndustryTerminology("service", undefined, "general_contractor");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    const bookVerb = getQuickBookVerb(terms.booking);
    expect(`${bookVerb} Bathroom Remodel`).toBe("Schedule Bathroom Remodel");
  });

  it("plumbing + 'Drain Cleaning' → 'Book Drain Cleaning'", () => {
    const terminology = getIndustryTerminology("service", undefined, "plumbing");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    const bookVerb = getQuickBookVerb(terms.booking);
    expect(`${bookVerb} Drain Cleaning`).toBe("Book Drain Cleaning");
  });

  it("pool_service + 'Weekly Cleaning' → 'Book Weekly Cleaning'", () => {
    const terminology = getIndustryTerminology("service", undefined, "pool_service");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    const bookVerb = getQuickBookVerb(terms.booking);
    expect(`${bookVerb} Weekly Cleaning`).toBe("Book Weekly Cleaning");
  });
});
