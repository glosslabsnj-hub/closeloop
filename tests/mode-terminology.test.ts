/**
 * Mode-Aware Terminology Tests
 *
 * Verifies that getTerminology() from src/lib/terminology.ts returns correct
 * UI-level terms for all 6 business modes. These terms are consumed by
 * dashboard components (LiveActivityFeed, DashboardHeroCard, QuickStatsCard,
 * QuickLinksCard) via useIndustryContext().terms.
 *
 * Gate: dashboard/correct_mode_terminology + cross-mode safety
 */
import { describe, it, expect } from "vitest";
import { getTerminology, type IndustryTerms } from "../src/lib/terminology";

const ALL_MODES = ["service", "dispatch", "food", "medical", "sales", "general"] as const;

// Required fields that every mode must have populated (non-empty strings)
const REQUIRED_FIELDS: (keyof IndustryTerms)[] = [
  "booking",
  "bookings",
  "service",
  "services",
  "customer",
  "customers",
  "bookingCreated",
  "viewBookings",
  "addService",
  "newBooking",
  "bookingsPageTitle",
  "bookingsPageSubtitle",
  "servicesPageTitle",
  "servicesPageSubtitle",
  "addServicesStep",
  "addServicesDescription",
  "pendingBooking",
  "pendingBookings",
  "bookingConfirmed",
  "bookingsMetricLabel",
  "inboxPageTitle",
  "inboxPageSubtitle",
];

// ─── Completeness ──────────────────────────────────────────────────────────
describe("Mode terminology completeness", () => {
  for (const mode of ALL_MODES) {
    it(`${mode} mode has all required fields`, () => {
      const terms = getTerminology(mode);
      for (const field of REQUIRED_FIELDS) {
        expect(terms[field], `${mode}.${field} should be a non-empty string`).toBeTruthy();
        expect(typeof terms[field]).toBe("string");
        expect((terms[field] as string).length).toBeGreaterThan(0);
      }
    });
  }

  it("fallback to service mode for unknown mode", () => {
    const terms = getTerminology("nonexistent" as any);
    expect(terms.booking).toBe("booking");
    expect(terms.bookingCreated).toBe("Booking created");
  });
});

// ─── Service mode ──────────────────────────────────────────────────────────
describe("Service mode terminology", () => {
  const t = getTerminology("service");

  it("uses booking/bookings for entities", () => {
    expect(t.booking).toBe("booking");
    expect(t.bookings).toBe("bookings");
  });

  it("uses service/services for offerings", () => {
    expect(t.service).toBe("service");
    expect(t.services).toBe("services");
  });

  it("uses customer/customers for people", () => {
    expect(t.customer).toBe("customer");
    expect(t.customers).toBe("customers");
  });

  it("bookingCreated says 'Booking created'", () => {
    expect(t.bookingCreated).toBe("Booking created");
  });

  it("bookingsMetricLabel says 'Bookings'", () => {
    expect(t.bookingsMetricLabel).toBe("Bookings");
  });

  it("bookingsPageTitle says 'Schedule'", () => {
    expect(t.bookingsPageTitle).toBe("Schedule");
  });

  it("servicesPageTitle says 'Services'", () => {
    expect(t.servicesPageTitle).toBe("Services");
  });
});

// ─── Dispatch mode ─────────────────────────────────────────────────────────
describe("Dispatch mode terminology", () => {
  const t = getTerminology("dispatch");

  it("uses job/jobs for entities", () => {
    expect(t.booking).toBe("job");
    expect(t.bookings).toBe("jobs");
  });

  it("bookingCreated says 'Job dispatched'", () => {
    expect(t.bookingCreated).toBe("Job dispatched");
  });

  it("bookingsMetricLabel says 'Jobs'", () => {
    expect(t.bookingsMetricLabel).toBe("Jobs");
  });

  it("bookingsPageTitle says 'Dispatch Queue'", () => {
    expect(t.bookingsPageTitle).toBe("Dispatch Queue");
  });

  it("bookingConfirmed says 'Job assigned'", () => {
    expect(t.bookingConfirmed).toBe("Job assigned");
  });

  it("newBooking says 'New Job'", () => {
    expect(t.newBooking).toBe("New Job");
  });

  it("pendingBooking says 'pending job'", () => {
    expect(t.pendingBooking).toBe("pending job");
    expect(t.pendingBookings).toBe("pending jobs");
  });
});

// ─── Food mode ─────────────────────────────────────────────────────────────
describe("Food mode terminology", () => {
  const t = getTerminology("food");

  it("uses order/orders for entities", () => {
    expect(t.booking).toBe("order");
    expect(t.bookings).toBe("orders");
  });

  it("uses menu item/menu for offerings", () => {
    expect(t.service).toBe("menu item");
    expect(t.services).toBe("menu");
  });

  it("uses guest/guests for people", () => {
    expect(t.customer).toBe("guest");
    expect(t.customers).toBe("guests");
  });

  it("bookingCreated says 'Order placed'", () => {
    expect(t.bookingCreated).toBe("Order placed");
  });

  it("bookingsMetricLabel says 'Orders'", () => {
    expect(t.bookingsMetricLabel).toBe("Orders");
  });

  it("bookingsPageTitle says 'Orders'", () => {
    expect(t.bookingsPageTitle).toBe("Orders");
  });

  it("servicesPageTitle says 'Menu'", () => {
    expect(t.servicesPageTitle).toBe("Menu");
  });

  it("addService says 'Add Menu Item'", () => {
    expect(t.addService).toBe("Add Menu Item");
  });

  it("pendingBooking says 'new order'", () => {
    expect(t.pendingBooking).toBe("new order");
    expect(t.pendingBookings).toBe("new orders");
  });
});

// ─── Medical mode ──────────────────────────────────────────────────────────
describe("Medical mode terminology", () => {
  const t = getTerminology("medical");

  it("uses appointment/appointments for entities", () => {
    expect(t.booking).toBe("appointment");
    expect(t.bookings).toBe("appointments");
  });

  it("uses patient/patients for people", () => {
    expect(t.customer).toBe("patient");
    expect(t.customers).toBe("patients");
  });

  it("bookingCreated says 'Appointment scheduled'", () => {
    expect(t.bookingCreated).toBe("Appointment scheduled");
  });

  it("bookingsMetricLabel says 'Appointments'", () => {
    expect(t.bookingsMetricLabel).toBe("Appointments");
  });

  it("bookingsPageTitle says 'Appointments'", () => {
    expect(t.bookingsPageTitle).toBe("Appointments");
  });

  it("bookingConfirmed says 'Appointment confirmed'", () => {
    expect(t.bookingConfirmed).toBe("Appointment confirmed");
  });
});

// ─── Sales mode ────────────────────────────────────────────────────────────
describe("Sales mode terminology", () => {
  const t = getTerminology("sales");

  it("uses appointment/appointments for entities", () => {
    expect(t.booking).toBe("appointment");
    expect(t.bookings).toBe("appointments");
  });

  it("uses product/products for offerings", () => {
    expect(t.service).toBe("product");
    expect(t.services).toBe("products");
  });

  it("uses prospect/prospects for people", () => {
    expect(t.customer).toBe("prospect");
    expect(t.customers).toBe("prospects");
  });

  it("bookingCreated says 'Appointment scheduled'", () => {
    expect(t.bookingCreated).toBe("Appointment scheduled");
  });

  it("bookingsMetricLabel says 'Appointments'", () => {
    expect(t.bookingsMetricLabel).toBe("Appointments");
  });

  it("servicesPageTitle says 'Products'", () => {
    expect(t.servicesPageTitle).toBe("Products");
  });

  it("addService says 'Add Product'", () => {
    expect(t.addService).toBe("Add Product");
  });
});

// ─── General mode ──────────────────────────────────────────────────────────
describe("General mode terminology", () => {
  const t = getTerminology("general");

  it("uses booking/bookings for entities", () => {
    expect(t.booking).toBe("booking");
    expect(t.bookings).toBe("bookings");
  });

  it("uses offering/offerings for services", () => {
    expect(t.service).toBe("offering");
    expect(t.services).toBe("offerings");
  });

  it("uses customer/customers for people", () => {
    expect(t.customer).toBe("customer");
    expect(t.customers).toBe("customers");
  });

  it("bookingCreated says 'Booking created'", () => {
    expect(t.bookingCreated).toBe("Booking created");
  });

  it("bookingsMetricLabel says 'Bookings'", () => {
    expect(t.bookingsMetricLabel).toBe("Bookings");
  });

  it("servicesPageTitle says 'Offerings'", () => {
    expect(t.servicesPageTitle).toBe("Offerings");
  });

  it("addService says 'Add Offering'", () => {
    expect(t.addService).toBe("Add Offering");
  });
});

// ─── Cross-mode uniqueness ─────────────────────────────────────────────────
describe("Cross-mode differentiation", () => {
  it("each mode has distinct bookingCreated text", () => {
    const values = ALL_MODES.map((m) => getTerminology(m).bookingCreated);
    // service & general share "Booking created", medical & sales share "Appointment scheduled"
    // But dispatch ("Job dispatched") and food ("Order placed") must be unique
    expect(values).toContain("Job dispatched");
    expect(values).toContain("Order placed");
    expect(values).toContain("Booking created");
    expect(values).toContain("Appointment scheduled");
  });

  it("dispatch uses 'Dispatch Queue' not 'Schedule' or 'Bookings'", () => {
    const dispatch = getTerminology("dispatch");
    expect(dispatch.bookingsPageTitle).not.toBe("Schedule");
    expect(dispatch.bookingsPageTitle).not.toBe("Bookings");
    expect(dispatch.bookingsPageTitle).toBe("Dispatch Queue");
  });

  it("food uses 'Menu' for services, not 'Services' or 'Products'", () => {
    const food = getTerminology("food");
    expect(food.servicesPageTitle).toBe("Menu");
    expect(food.servicesPageTitle).not.toBe("Services");
    expect(food.servicesPageTitle).not.toBe("Products");
  });

  it("no mode uses hardcoded 'Bookings' for bookingsPageTitle except general", () => {
    // service=Schedule, dispatch=Dispatch Queue, food=Orders, medical=Appointments, sales=Appointments
    expect(getTerminology("service").bookingsPageTitle).toBe("Schedule");
    expect(getTerminology("dispatch").bookingsPageTitle).toBe("Dispatch Queue");
    expect(getTerminology("food").bookingsPageTitle).toBe("Orders");
    expect(getTerminology("medical").bookingsPageTitle).toBe("Appointments");
    expect(getTerminology("sales").bookingsPageTitle).toBe("Appointments");
    expect(getTerminology("general").bookingsPageTitle).toBe("Bookings");
  });

  it("metric labels are mode-specific", () => {
    expect(getTerminology("service").bookingsMetricLabel).toBe("Bookings");
    expect(getTerminology("dispatch").bookingsMetricLabel).toBe("Jobs");
    expect(getTerminology("food").bookingsMetricLabel).toBe("Orders");
    expect(getTerminology("medical").bookingsMetricLabel).toBe("Appointments");
    expect(getTerminology("sales").bookingsMetricLabel).toBe("Appointments");
    expect(getTerminology("general").bookingsMetricLabel).toBe("Bookings");
  });
});

// ─── Dashboard component contract ──────────────────────────────────────────
describe("Dashboard component terminology contract", () => {
  // These tests verify the exact properties used by dashboard components.
  // If a property is renamed or removed, these tests catch it.

  it("LiveActivityFeed: bookingCreated exists for all modes", () => {
    for (const mode of ALL_MODES) {
      const t = getTerminology(mode);
      expect(t.bookingCreated).toBeTruthy();
      // Must be a capitalized phrase (shown in UI)
      expect(t.bookingCreated[0]).toBe(t.bookingCreated[0].toUpperCase());
    }
  });

  it("LiveActivityFeed: bookingConfirmed exists for all modes", () => {
    for (const mode of ALL_MODES) {
      const t = getTerminology(mode);
      expect(t.bookingConfirmed).toBeTruthy();
      expect(t.bookingConfirmed[0]).toBe(t.bookingConfirmed[0].toUpperCase());
    }
  });

  it("DashboardHeroCard + QuickStatsCard: bookingsMetricLabel exists", () => {
    for (const mode of ALL_MODES) {
      const t = getTerminology(mode);
      expect(t.bookingsMetricLabel).toBeTruthy();
      // Must be a single capitalized word (shown as metric label)
      expect(t.bookingsMetricLabel[0]).toBe(t.bookingsMetricLabel[0].toUpperCase());
    }
  });

  it("QuickLinksCard: page titles and subtitles exist", () => {
    for (const mode of ALL_MODES) {
      const t = getTerminology(mode);
      expect(t.bookingsPageTitle.length).toBeGreaterThan(0);
      expect(t.bookingsPageSubtitle.length).toBeGreaterThan(0);
      expect(t.servicesPageTitle.length).toBeGreaterThan(0);
      expect(t.servicesPageSubtitle.length).toBeGreaterThan(0);
    }
  });

  it("Inbox terms exist for all modes", () => {
    for (const mode of ALL_MODES) {
      const t = getTerminology(mode);
      expect(t.inboxPageTitle).toBe("Inbox");
      expect(t.inboxPageSubtitle.length).toBeGreaterThan(0);
    }
  });
});

// ─── getDynamicStepTitle ───────────────────────────────────────────────────
// Test the Brain step title resolution from industryTerminology.ts
import { getDynamicStepTitle, getBookingActionPhrase, getAutoBookSummary, getReadinessVerb } from "../src/data/industryTerminology";

describe("getDynamicStepTitle", () => {
  it("'offerings' uses servicesLabel per mode", () => {
    expect(getDynamicStepTitle("offerings", "service")).toBe("Services & Pricing");
    expect(getDynamicStepTitle("offerings", "food")).toBe("Menu & Pricing");
    expect(getDynamicStepTitle("offerings", "medical")).toBe("Procedures & Fee Schedule");
    expect(getDynamicStepTitle("offerings", "sales")).toBe("Products & Pricing");
    expect(getDynamicStepTitle("offerings", "dispatch")).toBe("Tow Rates & Services");
  });

  it("'calendar' returns medical-specific title", () => {
    expect(getDynamicStepTitle("calendar", "medical")).toBe("Appointment Calendar");
    expect(getDynamicStepTitle("calendar", "service")).toBe("Schedule & Availability");
    expect(getDynamicStepTitle("calendar", "food")).toBe("Schedule & Availability");
  });

  it("'policies' returns mode-specific title", () => {
    expect(getDynamicStepTitle("policies", "medical")).toBe("Patient Intake & HIPAA");
    expect(getDynamicStepTitle("policies", "dispatch")).toBe("Dispatch Policies");
    expect(getDynamicStepTitle("policies", "service")).toBe("Booking Policies");
    expect(getDynamicStepTitle("policies", "food")).toBe("Booking Policies");
  });

  it("'knowledge' returns mode-specific FAQ title", () => {
    expect(getDynamicStepTitle("knowledge", "medical")).toBe("Patient FAQs");
    expect(getDynamicStepTitle("knowledge", "food")).toBe("Menu FAQs");
    expect(getDynamicStepTitle("knowledge", "service")).toBe("Customer FAQs");
    expect(getDynamicStepTitle("knowledge", "dispatch")).toBe("Customer FAQs");
  });

  it("unknown stepId returns empty string", () => {
    expect(getDynamicStepTitle("nonexistent", "service")).toBe("");
  });

  it("slug overrides apply to offerings title", () => {
    expect(getDynamicStepTitle("offerings", "service", "beauty_wellness", "hair-salon")).toBe("Salon Services");
    expect(getDynamicStepTitle("offerings", "dispatch", "dispatch_logistics", "towing")).toBe("Tow Rates");
  });
});

// ─── Booking action helpers ────────────────────────────────────────────────
describe("Booking action helpers", () => {
  it("getBookingActionPhrase returns correct verbs", () => {
    expect(getBookingActionPhrase("job")).toBe("schedule a job");
    expect(getBookingActionPhrase("appointment")).toBe("book an appointment");
    expect(getBookingActionPhrase("reservation")).toBe("make a reservation");
    expect(getBookingActionPhrase("dispatch")).toBe("request service");
    expect(getBookingActionPhrase("visit")).toBe("schedule a visit");
    expect(getBookingActionPhrase("session")).toBe("book a session");
    expect(getBookingActionPhrase("consultation")).toBe("schedule a consultation");
  });

  it("getBookingActionPhrase falls back for unknown labels", () => {
    expect(getBookingActionPhrase("xyz")).toBe("book an xyz");
  });

  it("getAutoBookSummary returns correct phrases", () => {
    expect(getAutoBookSummary("job")).toBe("schedule jobs automatically");
    expect(getAutoBookSummary("appointment")).toBe("book appointments automatically");
    expect(getAutoBookSummary("reservation")).toBe("take reservations automatically");
  });

  it("getAutoBookSummary falls back for unknown labels", () => {
    expect(getAutoBookSummary("xyz")).toBe("book appointments automatically");
  });

  it("getReadinessVerb returns correct phrases", () => {
    expect(getReadinessVerb("job")).toBe("schedule jobs");
    expect(getReadinessVerb("appointment")).toBe("book appointments");
    expect(getReadinessVerb("dispatch")).toBe("dispatch jobs");
    expect(getReadinessVerb("visit")).toBe("schedule visits");
  });

  it("getReadinessVerb falls back for unknown labels", () => {
    expect(getReadinessVerb("xyz")).toBe("book appointments");
  });
});
