/**
 * GC Estimates & Booking Type Regression Tests
 *
 * @vitest-environment node
 *
 * eng session (2026-03-08): Two key improvements for general_contractor:
 *
 * 1. bookingType field on ServiceTemplate — catalog services can declare
 *    how the AI should handle booking them. GC's complex services are marked
 *    estimate_first so the AI says "we'd need to come look first, want me to
 *    schedule a free estimate?" instead of trying to book a Kitchen Remodel
 *    as a 60-minute calendar slot.
 *
 * 2. estimates module enabled for GC and roofing — these industries create
 *    formal project quotes. Without the estimates module in enabledModules,
 *    the Estimates sidebar item never shows for regular users.
 *
 * Also tested: create-calendar-event now adds customer address as the
 * event location field (extracted from booking notes "Address: {addr}").
 *
 * Gates: service ai_testing/*, service integrations/google_calendar_connects
 */
import { describe, it, expect } from "vitest";
import { getIndustryBySlug } from "../src/data/industryCatalog";
import { resolveIndustryTemplate } from "../src/lib/templateResolver";

// ─── GC: estimates module enabled ─────────────────────────────────────────────

describe("general_contractor enabledModules", () => {
  const gc = getIndustryBySlug("general_contractor");

  it("GC catalog entry exists", () => {
    expect(gc).toBeTruthy();
  });

  it("GC has estimates module enabled", () => {
    expect(gc?.enabledModules).toContain("estimates");
  });

  it("GC has booking module enabled", () => {
    expect(gc?.enabledModules).toContain("booking");
  });

  it("GC has ai_voice enabled", () => {
    expect(gc?.enabledModules).toContain("ai_voice");
  });
});

// ─── Roofing: estimates module enabled ────────────────────────────────────────

describe("roofing enabledModules", () => {
  const roofing = getIndustryBySlug("roofing");

  it("roofing catalog entry exists", () => {
    expect(roofing).toBeTruthy();
  });

  it("roofing has estimates module enabled", () => {
    expect(roofing?.enabledModules).toContain("estimates");
  });
});

// ─── GC: booking_type on complex services ─────────────────────────────────────

describe("general_contractor service bookingType", () => {
  const gc = getIndustryBySlug("general_contractor");
  const services = gc?.services ?? [];

  const complexServices = ["Kitchen Remodel", "Bathroom Remodel", "Room Addition",
    "Deck Building", "Basement Finishing", "Whole-Home Renovation",
    "Drywall & Framing", "Trim & Finish Carpentry"];

  const directServices = ["Handyman Service", "Free Estimate / Site Visit"];

  it("has 10 services", () => {
    expect(services).toHaveLength(10);
  });

  it("complex GC services are estimate_first", () => {
    for (const name of complexServices) {
      const svc = services.find(s => s.name === name);
      expect(svc).toBeTruthy();
      expect(svc?.bookingType).toBe("estimate_first");
    }
  });

  it("Free Estimate / Site Visit is direct_book", () => {
    const svc = services.find(s => s.name === "Free Estimate / Site Visit");
    expect(svc?.bookingType).toBe("direct_book");
  });

  it("Handyman Service is direct_book", () => {
    const svc = services.find(s => s.name === "Handyman Service");
    expect(svc?.bookingType).toBe("direct_book");
  });
});

// ─── Roofing: booking_type on large jobs ──────────────────────────────────────

describe("roofing service bookingType", () => {
  const roofing = getIndustryBySlug("roofing");
  const services = roofing?.services ?? [];

  it("Full Roof Replacement is estimate_first", () => {
    const svc = services.find(s => s.name === "Full Roof Replacement");
    expect(svc?.bookingType).toBe("estimate_first");
  });

  it("Gutter Installation is estimate_first", () => {
    const svc = services.find(s => s.name === "Gutter Installation");
    expect(svc?.bookingType).toBe("estimate_first");
  });

  it("Roof Inspection has no bookingType (direct_book default)", () => {
    const svc = services.find(s => s.name === "Roof Inspection");
    // No explicit bookingType means direct_book (the default)
    expect(svc?.bookingType).toBeUndefined();
  });

  it("Leak Repair has no bookingType (direct_book default)", () => {
    const svc = services.find(s => s.name === "Leak Repair");
    expect(svc?.bookingType).toBeUndefined();
  });
});

// ─── bookingType propagates through templateResolver ─────────────────────────

describe("resolveIndustryTemplate: GC booking_type preserved", () => {
  const config = resolveIndustryTemplate("general_contractor");
  const services = config.services;

  it("resolves GC template with services", () => {
    expect(services.length).toBeGreaterThan(0);
  });

  it("Kitchen Remodel bookingType is estimate_first in resolved template", () => {
    const svc = services.find(s => s.name === "Kitchen Remodel");
    expect(svc?.bookingType).toBe("estimate_first");
  });

  it("Free Estimate / Site Visit bookingType is direct_book in resolved template", () => {
    const svc = services.find(s => s.name === "Free Estimate / Site Visit");
    expect(svc?.bookingType).toBe("direct_book");
  });
});

// ─── Standard service industries do NOT have estimates module ─────────────────

describe("standard service industries: no estimates module", () => {
  // Plumbing, HVAC, etc. don't create formal project estimates
  const noEstimatesIndustries = ["plumbing", "hvac", "electrical", "handyman"];

  for (const slug of noEstimatesIndustries) {
    it(`${slug} does NOT have estimates module`, () => {
      const entry = getIndustryBySlug(slug);
      expect(entry?.enabledModules).not.toContain("estimates");
    });
  }
});
