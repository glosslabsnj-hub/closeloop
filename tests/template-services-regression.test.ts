/**
 * Template Services Regression Tests
 *
 * Verifies that industry templates correctly resolve all expected services.
 * Prevents regressions where template services get silently dropped.
 *
 * Triggered by QA handoff #310: plumbing template was reporting 5/7 services
 * in Brain guided setup. Root cause: review preview was slicing to 4 (fixed
 * in commit 6136367). These tests ensure the template resolution layer always
 * returns the full service set for each industry.
 */
import { describe, it, expect } from "vitest";
import { resolveIndustryTemplate } from "@/lib/templateResolver";
import { getIndustryBySlug } from "@/data/industryCatalog";

describe("resolveIndustryTemplate — service completeness", () => {
  // ─── Plumbing ───────────────────────────────────────────────────
  it("plumbing template resolves all 7 services", () => {
    const config = resolveIndustryTemplate("plumbing");
    expect(config.services).toHaveLength(7);
    const names = config.services.map((s) => s.name);
    expect(names).toContain("Drain Cleaning");
    expect(names).toContain("Leak Detection");
    expect(names).toContain("Water Heater Repair");
    expect(names).toContain("Toilet Repair");
    expect(names).toContain("Faucet Installation");
    expect(names).toContain("Sewer Line Inspection");
    expect(names).toContain("Emergency Service");
  });

  it("legacy 'plumber' slug also resolves all 7 services", () => {
    const config = resolveIndustryTemplate("plumber");
    expect(config.services).toHaveLength(7);
    expect(config.services.map((s) => s.name)).toContain("Toilet Repair");
    expect(config.services.map((s) => s.name)).toContain("Sewer Line Inspection");
  });

  it("plumbing services have valid prices and durations", () => {
    const config = resolveIndustryTemplate("plumbing");
    for (const svc of config.services) {
      expect(svc.name.length).toBeGreaterThan(0);
      expect(svc.duration).toBeGreaterThan(0);
      expect(svc.price).toBeGreaterThan(0);
      expect(["fixed", "starting_at", "quote_only"]).toContain(svc.priceType);
    }
  });

  // ─── HVAC ───────────────────────────────────────────────────────
  it("HVAC template resolves all expected services", () => {
    const config = resolveIndustryTemplate("hvac");
    expect(config.services.length).toBeGreaterThanOrEqual(5);
    const names = config.services.map((s) => s.name);
    expect(names).toContain("AC Repair");
    expect(names).toContain("Furnace Repair");
  });

  // ─── Cross-industry: all catalog entries have services ──────────
  it("every catalog industry has at least 1 service defined", () => {
    const allSlugs = [
      "plumbing", "hvac", "electrical", "pest_control", "roofing",
      "landscaping", "cleaning", "pool_service", "moving",
      "auto_detailing", "tire_shop", "auto_repair", "oil_change",
      "salon", "barbershop", "nail_salon", "medspa",
      "dental", "chiropractic", "veterinary",
      "pizza", "restaurant", "cafe", "bakery",
      "towing", "courier",
      "personal_training", "yoga_studio",
      "photography", "dj",
      "auto_dealership", "real_estate",
    ];

    for (const slug of allSlugs) {
      const entry = getIndustryBySlug(slug);
      if (entry) {
        expect(
          entry.services.length,
          `${slug} should have at least 1 service`,
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });

  // ─── Template resolver fallback ─────────────────────────────────
  it("unknown slug falls back to 'other' template", () => {
    const config = resolveIndustryTemplate("unknown_industry_xyz");
    expect(config.label).toBe("Other");
    expect(config.services.length).toBeGreaterThanOrEqual(1);
  });

  // ─── All services have required fields ──────────────────────────
  it("all plumbing services have name, duration, and price", () => {
    const config = resolveIndustryTemplate("plumbing");
    for (const svc of config.services) {
      expect(svc).toHaveProperty("name");
      expect(svc).toHaveProperty("duration");
      expect(svc).toHaveProperty("price");
    }
  });
});
