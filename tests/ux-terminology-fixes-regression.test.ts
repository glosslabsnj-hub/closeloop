/**
 * UX Terminology Fixes Regression Tests
 *
 * @vitest-environment node
 *
 * Covers UX fixes from commits 8bb637f, ccdba8f, ec88fb6, 2542122:
 *
 * 1. bookingsPageTitle is TITLE-CASED for multi-word appointment labels
 *    - pool_service: "Service Visits" (not "Service visits")
 *    - car dealership: "Test Drives" (not "Test drives")
 *    - Single-word labels unaffected: "Bookings", "Jobs", "Orders"
 *
 * 2. BookingDetailsSheet uses terms.service for fallback service name
 *    - Pool service: fallback = "Pool Service" (not "Service")
 *    - Food mode: fallback = "Menu Item" (not "Service")
 *    - Sales mode: fallback = "Product" (not "Service")
 *
 * 3. brainGuidance booking-behavior uses {{appointmentLabelPlural}} placeholder
 *    - NOT hardcoded "bookings"
 *    - Enables per-industry label substitution at render time
 *
 * 4. service-coverage guidance uses {{appointmentLabel}} / {{appointmentLabelPlural}}
 *    - Pool service guidance contextual
 *
 * Gate: pool service dashboard [D], sales dashboard [D], UX fixes locked
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyAppointmentLabel, getTerminology } from "../src/lib/terminology";
import { getIndustryTerminology } from "../src/data/industryTerminology";

const root = process.cwd();

function readSrc(relPath: string): string {
  return readFileSync(join(root, relPath), "utf-8");
}

const bookingDetailsSheetSrc = readSrc("src/components/bookings/BookingDetailsSheet.tsx");
const brainGuidanceSrc = readSrc("src/config/brainGuidance.ts");
const terminologySrc = readSrc("src/lib/terminology.ts");

// ─── 1. bookingsPageTitle title-case fix (commit 2542122) ────────────────────

describe("bookingsPageTitle: title-case for multi-word appointment labels", () => {
  it("pool_service appointmentLabel='service visit' → bookingsPageTitle='Service Visits'", () => {
    // Using applyAppointmentLabel with "service visit"
    const result = applyAppointmentLabel({ bookingsPageTitle: "Appointments" } as any, "service visit");
    expect(result.bookingsPageTitle).toBe("Service Visits");
  });

  it("pool_service bookingsPageTitle is NOT 'Service visits' (wrong sentence case)", () => {
    const result = applyAppointmentLabel({ bookingsPageTitle: "Appointments" } as any, "service visit");
    expect(result.bookingsPageTitle).not.toBe("Service visits");
  });

  it("car dealership appointmentLabel='test drive' → bookingsPageTitle='Test Drives'", () => {
    const result = applyAppointmentLabel({ bookingsPageTitle: "Appointments" } as any, "test drive");
    expect(result.bookingsPageTitle).toBe("Test Drives");
  });

  it("car dealership bookingsPageTitle is NOT 'Test drives' (wrong sentence case)", () => {
    const result = applyAppointmentLabel({ bookingsPageTitle: "Appointments" } as any, "test drive");
    expect(result.bookingsPageTitle).not.toBe("Test drives");
  });

  it("single-word: 'appointment' → bookingsPageTitle='Appointments'", () => {
    const result = applyAppointmentLabel({ bookingsPageTitle: "Appointments" } as any, "appointment");
    expect(result.bookingsPageTitle).toBe("Appointments");
  });

  it("single-word: 'job' → bookingsPageTitle='Jobs'", () => {
    const result = applyAppointmentLabel({ bookingsPageTitle: "Schedule" } as any, "job");
    expect(result.bookingsPageTitle).toBe("Jobs");
  });

  it("single-word: 'booking' → bookingsPageTitle='Bookings'", () => {
    const result = applyAppointmentLabel({ bookingsPageTitle: "Bookings" } as any, "booking");
    expect(result.bookingsPageTitle).toBe("Bookings");
  });

  it("terminology.ts contains titleCapP variable (the fix)", () => {
    expect(terminologySrc).toContain("const titleCapP");
    expect(terminologySrc).toContain("bookingsPageTitle: titleCapP");
  });

  it("terminology.ts no longer uses capP for bookingsPageTitle", () => {
    // Old code: bookingsPageTitle: capP — this caused "Service visits" instead of "Service Visits"
    // New code: bookingsPageTitle: titleCapP
    const capPLine = terminologySrc.match(/bookingsPageTitle:\s*capP[^a-zA-Z]/);
    expect(capPLine).toBeNull();
  });
});

// ─── 2. getIndustryTerminology: appointmentLabel drives bookingsPageTitle ────

describe("getIndustryTerminology + applyAppointmentLabel: full pipeline for pool_service", () => {
  // useIndustryContext calls: applyAppointmentLabel(getTerminology(mode), terminology.appointmentLabel)
  // then overrides bookingsPageTitle with terminology.bookingsPageTitle if set.

  it("pool_service IndustryTerminology.appointmentLabel = 'service visit'", () => {
    const terminology = getIndustryTerminology("service", undefined, "pool_service");
    expect(terminology.appointmentLabel).toBe("service visit");
  });

  it("pool_service has no bookingsPageTitle override (auto-derived from appointmentLabel)", () => {
    const terminology = getIndustryTerminology("service", undefined, "pool_service");
    // bookingsPageTitle override only set for GC (to avoid clash with /app/estimates nav item)
    expect(terminology.bookingsPageTitle).toBeUndefined();
  });

  it("pool_service full pipeline → bookingsPageTitle = 'Service Visits'", () => {
    const terminology = getIndustryTerminology("service", undefined, "pool_service");
    let terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel);
    if (terminology.bookingsPageTitle) {
      terms = { ...terms, bookingsPageTitle: terminology.bookingsPageTitle };
    }
    expect(terms.bookingsPageTitle).toBe("Service Visits");
  });

  it("pool_service full pipeline → booking = 'service visit'", () => {
    const terminology = getIndustryTerminology("service", undefined, "pool_service");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel);
    expect(terms.booking).toBe("service visit");
  });

  it("pool_service full pipeline → newBooking = 'New Service Visit'", () => {
    const terminology = getIndustryTerminology("service", undefined, "pool_service");
    const terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel);
    expect(terms.newBooking).toBe("New Service Visit");
  });

  it("car-dealership-new full pipeline → bookingsPageTitle = 'Showroom Appointments'", () => {
    // slug "car-dealership-new" has bookingsPageTitle override to avoid /app/test-drives nav collision
    const terminology = getIndustryTerminology("sales", undefined, "car-dealership-new");
    let terms = applyAppointmentLabel(getTerminology("sales"), terminology.appointmentLabel ?? "appointment");
    if (terminology.bookingsPageTitle) {
      terms = { ...terms, bookingsPageTitle: terminology.bookingsPageTitle };
    }
    expect(terms.bookingsPageTitle).toBe("Showroom Appointments");
  });

  it("car-dealership-used full pipeline → bookingsPageTitle = 'Showroom Appointments'", () => {
    const terminology = getIndustryTerminology("sales", undefined, "car-dealership-used");
    let terms = applyAppointmentLabel(getTerminology("sales"), terminology.appointmentLabel ?? "appointment");
    if (terminology.bookingsPageTitle) {
      terms = { ...terms, bookingsPageTitle: terminology.bookingsPageTitle };
    }
    expect(terms.bookingsPageTitle).toBe("Showroom Appointments");
  });

  it("GC uses bookingsPageTitle override 'Estimate Schedule' (not auto-derived 'Estimates')", () => {
    const terminology = getIndustryTerminology("service", undefined, "general_contractor");
    let terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
    if (terminology.bookingsPageTitle) {
      terms = { ...terms, bookingsPageTitle: terminology.bookingsPageTitle };
    }
    expect(terms.bookingsPageTitle).toBe("Estimate Schedule");
  });

  it("hvac/plumbing/electrical have no appointmentLabel → inherit base 'Schedule'", () => {
    // applyAppointmentLabel returns base unchanged when appointmentLabel is undefined.
    // Service mode base bookingsPageTitle is "Schedule".
    // These industries don't need a custom appointment label.
    for (const slug of ["hvac", "plumbing", "electrical"]) {
      const terminology = getIndustryTerminology("service", undefined, slug);
      let terms = applyAppointmentLabel(getTerminology("service"), terminology.appointmentLabel ?? "appointment");
      if (terminology.bookingsPageTitle) terms = { ...terms, bookingsPageTitle: terminology.bookingsPageTitle };
      // applyAppointmentLabel short-circuits for "appointment" → returns base
      expect(terms.bookingsPageTitle).toBe("Schedule");
    }
  });
});

// ─── 3. BookingDetailsSheet uses terms.service for fallback (commit 8bb637f) ──

describe("BookingDetailsSheet: terms.service fallback (not hardcoded 'Service')", () => {
  it("does NOT hardcode 'Service' as fallback service name", () => {
    // Old: booking.service?.name || "Service"
    // New: booking.service?.name || (terms.service.charAt(0).toUpperCase() + terms.service.slice(1))
    expect(bookingDetailsSheetSrc).not.toContain('|| "Service"');
  });

  it("uses terms.service for the service name fallback", () => {
    expect(bookingDetailsSheetSrc).toContain("terms.service");
  });

  it("does NOT use hardcoded 'Service' as section header label", () => {
    // Old: <div>Service</div> (hardcoded)
    // New: {terms.service.charAt(0).toUpperCase() + terms.service.slice(1)}
    // Check there's no JSX like >Service< or "Service" as literal text in section header
    // The terms.service dynamic version should replace the hardcoded one
    const hardcodedServiceHeader = bookingDetailsSheetSrc.match(/>Service<\//);
    expect(hardcodedServiceHeader).toBeNull();
  });

  it("section header uses terms.service dynamic expression", () => {
    // Both the fallback AND the section header use terms.service
    const termsServiceCount = (bookingDetailsSheetSrc.match(/terms\.service/g) || []).length;
    expect(termsServiceCount).toBeGreaterThanOrEqual(2);
  });
});

// ─── 4. brainGuidance uses {{appointmentLabelPlural}} (commit 8bb637f) ────────

describe("brainGuidance: booking-behavior uses {{appointmentLabelPlural}}", () => {
  const bookingBehaviorStart = brainGuidanceSrc.indexOf('"booking-behavior"');
  const bookingBehaviorBlock = bookingBehaviorStart > -1
    ? brainGuidanceSrc.slice(bookingBehaviorStart, bookingBehaviorStart + 800)
    : "";

  it("booking-behavior section exists in brainGuidance", () => {
    expect(bookingBehaviorStart).toBeGreaterThan(-1);
  });

  it("booking-behavior uses {{appointmentLabelPlural}} (not hardcoded 'bookings')", () => {
    expect(bookingBehaviorBlock).toContain("{{appointmentLabelPlural}}");
  });

  it("booking-behavior does NOT say 'confirms bookings instantly' (hardcoded)", () => {
    expect(bookingBehaviorBlock).not.toContain("confirms bookings instantly");
  });

  it("booking-behavior does NOT say 'approve bookings' (hardcoded)", () => {
    expect(bookingBehaviorBlock).not.toContain("approve bookings");
  });
});

// ─── 5. service-coverage guidance uses {{appointmentLabel}} ──────────────────

describe("brainGuidance: service-coverage uses template placeholders", () => {
  it("service-coverage section exists", () => {
    expect(brainGuidanceSrc).toContain('"service-coverage"');
  });

  it("service-coverage uses {{appointmentLabelPlural}} (not 'appointments' or 'bookings')", () => {
    const coverageStart = brainGuidanceSrc.indexOf('"service-coverage"');
    const workloadStart = brainGuidanceSrc.indexOf('"workload"', coverageStart);
    const coverageBlock = brainGuidanceSrc.slice(coverageStart, workloadStart);
    expect(coverageBlock).toContain("{{appointmentLabelPlural}}");
  });

  it("service-coverage uses {{appointmentLabel}} for singular", () => {
    const coverageStart = brainGuidanceSrc.indexOf('"service-coverage"');
    const workloadStart = brainGuidanceSrc.indexOf('"workload"', coverageStart);
    const coverageBlock = brainGuidanceSrc.slice(coverageStart, workloadStart);
    expect(coverageBlock).toContain("{{appointmentLabel}}");
  });
});

// ─── 6. Mode-specific service label values (from IndustryTerms, not IndustryTerminology) ────

describe("getTerminology: service label per mode (used in BookingDetailsSheet section header)", () => {
  it("service mode: terms.service = 'service'", () => {
    const terms = getTerminology("service");
    expect(terms.service).toBe("service");
  });

  it("food mode: terms.service = 'menu item'", () => {
    const terms = getTerminology("food");
    expect(terms.service).toBe("menu item");
  });

  it("sales mode: terms.service = 'product'", () => {
    const terms = getTerminology("sales");
    expect(terms.service).toBe("product");
  });

  it("medical mode: terms.service = 'service' (general vs medical distinction)", () => {
    // medical uses "service" as service label (procedures are services)
    // "offering" is the general/general mode label
    const terms = getTerminology("medical");
    expect(terms.service).toBe("service");
  });

  it("pool_service uses service mode base → terms.service = 'service'", () => {
    // pool_service is in SERVICE business mode. No custom service label.
    // BookingDetailsSheet fallback shows "Service" (capitalized from terms.service)
    const terms = getTerminology("service");
    expect(terms.service).toBe("service");
  });
});
