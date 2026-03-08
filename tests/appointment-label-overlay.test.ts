/**
 * applyAppointmentLabel + Industry Terminology Overlay Tests
 *
 * Tests the 3-tier terminology resolution chain:
 *   getTerminology(mode) → base terms
 *   getIndustryTerminology(mode, category, slug) → appointmentLabel
 *   applyAppointmentLabel(base, appointmentLabel) → overlaid terms
 *
 * This chain controls what every business owner sees in the UI.
 * A plumber sees "Job scheduled", a dentist sees "Visit scheduled",
 * a salon sees "Booking created" (default, no overlay).
 *
 * Gate: dashboard/correct_mode_terminology + cross-mode safety
 */
import { describe, it, expect } from "vitest";
import { getTerminology, applyAppointmentLabel, type IndustryTerms } from "../src/lib/terminology";
import {
  getIndustryTerminology,
  getBookingActionPhrase,
  getAutoBookSummary,
  getReadinessVerb,
  getActiveVerb,
  getDynamicStepTitle,
  resolveCardTitle,
} from "../src/data/industryTerminology";

// ─── applyAppointmentLabel: core mechanics ─────────────────────────────────

describe("applyAppointmentLabel", () => {
  const serviceBase = getTerminology("service");

  it("returns base unchanged when appointmentLabel is undefined", () => {
    const result = applyAppointmentLabel(serviceBase, undefined);
    expect(result).toBe(serviceBase); // same reference
  });

  it("returns base unchanged when appointmentLabel is 'appointment'", () => {
    const result = applyAppointmentLabel(serviceBase, "appointment");
    expect(result).toBe(serviceBase);
  });

  it("returns base unchanged when appointmentLabel is 'booking'", () => {
    const result = applyAppointmentLabel(serviceBase, "booking");
    expect(result).toBe(serviceBase);
  });

  it("returns base unchanged when label already matches (dispatch mode 'job')", () => {
    const dispatchBase = getTerminology("dispatch");
    expect(dispatchBase.booking).toBe("job");
    const result = applyAppointmentLabel(dispatchBase, "job");
    expect(result).toBe(dispatchBase); // same reference, no-op
  });

  it("overlays 'job' onto service mode for plumber", () => {
    const result = applyAppointmentLabel(serviceBase, "job");
    expect(result.booking).toBe("job");
    expect(result.bookings).toBe("jobs");
    expect(result.bookingCreated).toBe("Job scheduled");
    expect(result.bookingConfirmed).toBe("Job confirmed");
    expect(result.newBooking).toBe("New Job");
    expect(result.viewBookings).toBe("View Jobs");
    expect(result.pendingBooking).toBe("pending job");
    expect(result.pendingBookings).toBe("pending jobs");
    expect(result.bookingsMetricLabel).toBe("Jobs");
    expect(result.bookingsPageSubtitle).toBe("Your calendar and upcoming jobs");
  });

  it("overlays 'visit' onto service mode for medical", () => {
    const result = applyAppointmentLabel(serviceBase, "visit");
    expect(result.booking).toBe("visit");
    expect(result.bookings).toBe("visits");
    expect(result.bookingCreated).toBe("Visit scheduled");
    expect(result.bookingConfirmed).toBe("Visit confirmed");
    expect(result.newBooking).toBe("New Visit");
    expect(result.viewBookings).toBe("View Visits");
    expect(result.pendingBooking).toBe("pending visit");
    expect(result.pendingBookings).toBe("pending visits");
    expect(result.bookingsMetricLabel).toBe("Visits");
    expect(result.bookingsPageSubtitle).toBe("Your calendar and upcoming visits");
  });

  it("overlays 'session' onto service mode for fitness", () => {
    const result = applyAppointmentLabel(serviceBase, "session");
    expect(result.booking).toBe("session");
    expect(result.bookings).toBe("sessions");
    expect(result.bookingCreated).toBe("Session scheduled");
    expect(result.newBooking).toBe("New Session");
    expect(result.bookingsMetricLabel).toBe("Sessions");
  });

  it("overlays 'consultation' onto service mode for professional services", () => {
    const result = applyAppointmentLabel(serviceBase, "consultation");
    expect(result.booking).toBe("consultation");
    expect(result.bookings).toBe("consultations");
    expect(result.bookingCreated).toBe("Consultation scheduled");
    expect(result.viewBookings).toBe("View Consultations");
    expect(result.bookingsMetricLabel).toBe("Consultations");
  });

  it("preserves non-booking fields from base", () => {
    const result = applyAppointmentLabel(serviceBase, "job");
    // Non-booking fields should NOT change
    expect(result.service).toBe(serviceBase.service);
    expect(result.services).toBe(serviceBase.services);
    expect(result.customer).toBe(serviceBase.customer);
    expect(result.customers).toBe(serviceBase.customers);
    expect(result.addService).toBe(serviceBase.addService);
    expect(result.servicesPageTitle).toBe(serviceBase.servicesPageTitle);
    expect(result.servicesPageSubtitle).toBe(serviceBase.servicesPageSubtitle);
    expect(result.addServicesStep).toBe(serviceBase.addServicesStep);
    expect(result.addServicesDescription).toBe(serviceBase.addServicesDescription);
    expect(result.inboxPageTitle).toBe(serviceBase.inboxPageTitle);
    expect(result.inboxPageSubtitle).toBe(serviceBase.inboxPageSubtitle);
    // bookingsPageTitle now derives from appointmentLabel (e.g. "Jobs" when label is "job")
    expect(result.bookingsPageTitle).toBe("Jobs");
  });

  it("returns a new object (not mutating base)", () => {
    const result = applyAppointmentLabel(serviceBase, "job");
    expect(result).not.toBe(serviceBase);
    // Base should still be unchanged
    expect(serviceBase.booking).toBe("booking");
    expect(serviceBase.bookingCreated).toBe("Booking created");
  });
});

// ─── Full chain: industry → appointmentLabel → overlay ─────────────────────

describe("Full terminology chain by industry", () => {
  it("plumber (home_services/plumbing) → 'job'", () => {
    const industryTerms = getIndustryTerminology("service", "home_services", "plumbing");
    expect(industryTerms.appointmentLabel).toBe("job");

    const base = getTerminology("service");
    const result = applyAppointmentLabel(base, industryTerms.appointmentLabel);
    expect(result.booking).toBe("job");
    expect(result.bookingCreated).toBe("Job scheduled");
  });

  it("HVAC (home_services/hvac) → 'job'", () => {
    const industryTerms = getIndustryTerminology("service", "home_services", "hvac");
    expect(industryTerms.appointmentLabel).toBe("job");

    const base = getTerminology("service");
    const result = applyAppointmentLabel(base, industryTerms.appointmentLabel);
    expect(result.booking).toBe("job");
    expect(result.bookingsMetricLabel).toBe("Jobs");
  });

  it("electrician (home_services/electrical) → 'job'", () => {
    const industryTerms = getIndustryTerminology("service", "home_services", "electrical");
    expect(industryTerms.appointmentLabel).toBe("job");
  });

  it("lawn care (home_services/lawn-care) → 'job'", () => {
    const industryTerms = getIndustryTerminology("service", "home_services", "lawn-care");
    expect(industryTerms.appointmentLabel).toBe("job");
  });

  it("dentist (health_medical/dental) → 'visit'", () => {
    const industryTerms = getIndustryTerminology("service", "health_medical", "dental");
    expect(industryTerms.appointmentLabel).toBe("visit");

    const base = getTerminology("service");
    const result = applyAppointmentLabel(base, industryTerms.appointmentLabel);
    expect(result.booking).toBe("visit");
    expect(result.bookingCreated).toBe("Visit scheduled");
  });

  it("chiropractor (health_medical/chiropractic) → 'visit'", () => {
    const industryTerms = getIndustryTerminology("service", "health_medical", "chiropractic");
    expect(industryTerms.appointmentLabel).toBe("visit");
  });

  it("hair salon (beauty_wellness/hair-salon) → 'appointment' (no overlay)", () => {
    const industryTerms = getIndustryTerminology("service", "beauty_wellness", "hair-salon");
    expect(industryTerms.appointmentLabel).toBe("appointment");

    const base = getTerminology("service");
    const result = applyAppointmentLabel(base, industryTerms.appointmentLabel);
    // Should NOT be overlaid — appointmentLabel is 'appointment' (default)
    expect(result).toBe(base);
    expect(result.booking).toBe("booking");
  });

  it("barbershop (beauty_wellness/barbershop) → 'appointment' (no overlay)", () => {
    const industryTerms = getIndustryTerminology("service", "beauty_wellness", "barbershop");
    expect(industryTerms.appointmentLabel).toBe("appointment");
  });

  it("personal trainer (fitness_recreation) → 'session'", () => {
    const industryTerms = getIndustryTerminology("service", "fitness_recreation");
    expect(industryTerms.appointmentLabel).toBe("session");

    const base = getTerminology("service");
    const result = applyAppointmentLabel(base, industryTerms.appointmentLabel);
    expect(result.booking).toBe("session");
    expect(result.bookingCreated).toBe("Session scheduled");
  });

  it("lawyer (professional_services) → 'consultation'", () => {
    const industryTerms = getIndustryTerminology("service", "professional_services");
    expect(industryTerms.appointmentLabel).toBe("consultation");

    const base = getTerminology("service");
    const result = applyAppointmentLabel(base, industryTerms.appointmentLabel);
    expect(result.booking).toBe("consultation");
    expect(result.bookingCreated).toBe("Consultation scheduled");
  });

  it("towing (dispatch_logistics/towing) uses dispatch mode base", () => {
    const industryTerms = getIndustryTerminology("dispatch", "dispatch_logistics", "towing");
    // dispatch mode already has "dispatch" as appointmentLabel
    expect(industryTerms.appointmentLabel).toBe("dispatch");

    const base = getTerminology("dispatch");
    // Dispatch base already uses "job" for booking — no overlay needed from 'dispatch' label
    expect(base.booking).toBe("job");
  });

  it("restaurant (food_hospitality) → 'reservation' for food mode", () => {
    const industryTerms = getIndustryTerminology("food", "food_hospitality");
    expect(industryTerms.appointmentLabel).toBe("reservation");

    const base = getTerminology("food");
    // Food base uses "order", overlay with "reservation" changes it
    const result = applyAppointmentLabel(base, industryTerms.appointmentLabel);
    expect(result.booking).toBe("reservation");
    expect(result.bookingCreated).toBe("Reservation scheduled");
  });

  it("bakery (food/bakery slug) → 'order'", () => {
    const industryTerms = getIndustryTerminology("food", "food_hospitality", "bakery");
    expect(industryTerms.appointmentLabel).toBe("order");
  });

  it("auto detailing (auto_services/auto-detailing) → 'appointment' (service default)", () => {
    const industryTerms = getIndustryTerminology("service", "auto_services", "auto-detailing");
    expect(industryTerms.appointmentLabel).toBe("appointment");
  });

  it("medical mode default → 'visit'", () => {
    const industryTerms = getIndustryTerminology("medical");
    expect(industryTerms.appointmentLabel).toBe("visit");

    const base = getTerminology("medical");
    // Medical base already uses "appointment" — overlay with "visit" should change it
    const result = applyAppointmentLabel(base, industryTerms.appointmentLabel);
    expect(result.booking).toBe("visit");
    expect(result.bookingCreated).toBe("Visit scheduled");
  });

  it("sales mode default → 'appointment' (no overlay)", () => {
    const industryTerms = getIndustryTerminology("sales");
    expect(industryTerms.appointmentLabel).toBe("appointment");

    const base = getTerminology("sales");
    const result = applyAppointmentLabel(base, industryTerms.appointmentLabel);
    expect(result).toBe(base); // no change
  });
});

// ─── Booking verb helpers (complete coverage) ──────────────────────────────

describe("Booking verb helpers — full coverage", () => {
  describe("getAutoBookSummary", () => {
    it("job → 'schedule jobs automatically'", () => {
      expect(getAutoBookSummary("job")).toBe("schedule jobs automatically");
    });
    it("reservation → 'take reservations automatically'", () => {
      expect(getAutoBookSummary("reservation")).toBe("take reservations automatically");
    });
    it("visit → 'schedule visits automatically'", () => {
      expect(getAutoBookSummary("visit")).toBe("schedule visits automatically");
    });
    it("session → 'book sessions automatically'", () => {
      expect(getAutoBookSummary("session")).toBe("book sessions automatically");
    });
    it("consultation → 'schedule consultations automatically'", () => {
      expect(getAutoBookSummary("consultation")).toBe("schedule consultations automatically");
    });
    it("dispatch → 'assign dispatches automatically'", () => {
      expect(getAutoBookSummary("dispatch")).toBe("assign dispatches automatically");
    });
    it("appointment → 'book appointments automatically'", () => {
      expect(getAutoBookSummary("appointment")).toBe("book appointments automatically");
    });
    it("unknown → fallback 'book appointments automatically'", () => {
      expect(getAutoBookSummary("xyz")).toBe("book appointments automatically");
    });
  });

  describe("getReadinessVerb", () => {
    it("job → 'schedule jobs'", () => {
      expect(getReadinessVerb("job")).toBe("schedule jobs");
    });
    it("reservation → 'take reservations'", () => {
      expect(getReadinessVerb("reservation")).toBe("take reservations");
    });
    it("visit → 'schedule visits'", () => {
      expect(getReadinessVerb("visit")).toBe("schedule visits");
    });
    it("session → 'book sessions'", () => {
      expect(getReadinessVerb("session")).toBe("book sessions");
    });
    it("consultation → 'schedule consultations'", () => {
      expect(getReadinessVerb("consultation")).toBe("schedule consultations");
    });
    it("dispatch → 'dispatch jobs'", () => {
      expect(getReadinessVerb("dispatch")).toBe("dispatch jobs");
    });
    it("appointment → 'book appointments'", () => {
      expect(getReadinessVerb("appointment")).toBe("book appointments");
    });
    it("unknown → fallback 'book appointments'", () => {
      expect(getReadinessVerb("xyz")).toBe("book appointments");
    });
  });

  describe("getActiveVerb", () => {
    it("job → 'scheduling jobs'", () => {
      expect(getActiveVerb("job")).toBe("scheduling jobs");
    });
    it("reservation → 'taking reservations'", () => {
      expect(getActiveVerb("reservation")).toBe("taking reservations");
    });
    it("visit → 'scheduling visits'", () => {
      expect(getActiveVerb("visit")).toBe("scheduling visits");
    });
    it("session → 'booking sessions'", () => {
      expect(getActiveVerb("session")).toBe("booking sessions");
    });
    it("consultation → 'scheduling consultations'", () => {
      expect(getActiveVerb("consultation")).toBe("scheduling consultations");
    });
    it("dispatch → 'dispatching jobs'", () => {
      expect(getActiveVerb("dispatch")).toBe("dispatching jobs");
    });
    it("appointment → 'booking appointments'", () => {
      expect(getActiveVerb("appointment")).toBe("booking appointments");
    });
    it("unknown → fallback 'booking appointments'", () => {
      expect(getActiveVerb("xyz")).toBe("booking appointments");
    });
  });
});

// ─── getDynamicStepTitle ───────────────────────────────────────────────────

describe("getDynamicStepTitle", () => {
  it("offerings → mode-appropriate services label", () => {
    expect(getDynamicStepTitle("offerings", "service")).toBe("Services & Pricing");
    expect(getDynamicStepTitle("offerings", "food")).toBe("Menu & Pricing");
    expect(getDynamicStepTitle("offerings", "dispatch")).toBe("Tow Rates & Services");
    expect(getDynamicStepTitle("offerings", "medical")).toBe("Procedures & Fee Schedule");
    expect(getDynamicStepTitle("offerings", "sales")).toBe("Products & Pricing");
  });

  it("calendar → mode-specific label", () => {
    expect(getDynamicStepTitle("calendar", "medical")).toBe("Appointment Calendar");
    expect(getDynamicStepTitle("calendar", "service")).toBe("Schedule & Availability");
  });

  it("policies → mode-specific label", () => {
    expect(getDynamicStepTitle("policies", "medical")).toBe("Patient Intake & HIPAA");
    expect(getDynamicStepTitle("policies", "service")).toBe("Booking Policies");
  });

  it("knowledge → mode-specific FAQ label", () => {
    expect(getDynamicStepTitle("knowledge", "service")).toBe("Customer FAQs");
    expect(getDynamicStepTitle("knowledge", "food")).toBe("Guest FAQs");
    expect(getDynamicStepTitle("knowledge", "medical")).toBe("Patient FAQs");
    expect(getDynamicStepTitle("knowledge", "sales")).toBe("Prospect FAQs");
  });

  it("offerings respects slug overrides", () => {
    expect(getDynamicStepTitle("offerings", "service", "auto_services", "auto-detailing")).toBe("Detailing Packages");
    expect(getDynamicStepTitle("offerings", "service", "beauty_wellness", "hair-salon")).toBe("Salon Services");
  });

  it("unknown step returns empty string", () => {
    expect(getDynamicStepTitle("nonexistent", "service")).toBe("");
  });
});

// ─── resolveCardTitle — additional coverage ────────────────────────────────

describe("resolveCardTitle — extended", () => {
  it("policiesCardTitle for home_services → 'Service Policies'", () => {
    const title = resolveCardTitle("policiesCardTitle", "Default", "service", "home_services");
    expect(title).toBe("Service Policies");
  });

  it("policiesCardTitle for medical → 'Practice Policies'", () => {
    const title = resolveCardTitle("policiesCardTitle", "Default", "medical");
    expect(title).toBe("Practice Policies");
  });

  it("servicesCategoryTitle for food/pizza → 'Menu'", () => {
    const title = resolveCardTitle("servicesCategoryTitle", "Default", "food", "food_hospitality", "pizza");
    expect(title).toBe("Menu");
  });

  it("coverageCardTitle for dispatch → 'Coverage Zone'", () => {
    const title = resolveCardTitle("coverageCardTitle", "Default", "dispatch");
    expect(title).toBe("Coverage Zone");
  });

  it("coverageCardTitle for food_truck → 'Where We'll Be'", () => {
    const title = resolveCardTitle("coverageCardTitle", "Default", "food", "food_hospitality", "food_truck");
    expect(title).toBe("Where We'll Be");
  });
});

// ─── Cross-mode: overlay applied to non-service base modes ─────────────────

describe("applyAppointmentLabel on non-service base modes", () => {
  it("food mode + 'order' overlay (bakery slug)", () => {
    const foodBase = getTerminology("food");
    // food base already uses "order"
    expect(foodBase.booking).toBe("order");
    // "order" is not "appointment" or "booking", but it already matches base
    const result = applyAppointmentLabel(foodBase, "order");
    expect(result).toBe(foodBase); // already matches
  });

  it("food mode + 'event' overlay (catering slug)", () => {
    const foodBase = getTerminology("food");
    const result = applyAppointmentLabel(foodBase, "event");
    expect(result.booking).toBe("event");
    expect(result.bookings).toBe("events");
    expect(result.bookingCreated).toBe("Event scheduled");
    expect(result.newBooking).toBe("New Event");
    expect(result.bookingsMetricLabel).toBe("Events");
  });

  it("general mode + 'consultation' overlay", () => {
    const generalBase = getTerminology("general");
    const result = applyAppointmentLabel(generalBase, "consultation");
    expect(result.booking).toBe("consultation");
    expect(result.bookings).toBe("consultations");
    expect(result.bookingCreated).toBe("Consultation scheduled");
  });

  it("medical mode + 'visit' overlay changes 'appointment' base", () => {
    const medicalBase = getTerminology("medical");
    expect(medicalBase.booking).toBe("appointment");
    const result = applyAppointmentLabel(medicalBase, "visit");
    expect(result.booking).toBe("visit");
    expect(result.bookingCreated).toBe("Visit scheduled");
    // Non-booking fields preserved
    expect(result.customer).toBe("patient");
    expect(result.customers).toBe("patients");
  });
});
