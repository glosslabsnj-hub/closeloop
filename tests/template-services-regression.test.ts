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
  it("plumbing template resolves all 11 services", () => {
    const config = resolveIndustryTemplate("plumbing");
    expect(config.services).toHaveLength(11);
    const names = config.services.map((s) => s.name);
    expect(names).toContain("Drain Cleaning");
    expect(names).toContain("Leak Detection");
    expect(names).toContain("Water Heater Repair");
    expect(names).toContain("Toilet Repair");
    expect(names).toContain("Faucet Installation");
    expect(names).toContain("Sewer Line Inspection");
    expect(names).toContain("Emergency Service");
    expect(names).toContain("Whole-House Repipe");
    expect(names).toContain("Water Filtration Install");
    expect(names).toContain("Sewer Line Repair");
    expect(names).toContain("Water Heater Installation");
  });

  it("legacy 'plumber' slug also resolves all 11 services", () => {
    const config = resolveIndustryTemplate("plumber");
    expect(config.services).toHaveLength(11);
    expect(config.services.map((s) => s.name)).toContain("Toilet Repair");
    expect(config.services.map((s) => s.name)).toContain("Sewer Line Inspection");
    expect(config.services.map((s) => s.name)).toContain("Whole-House Repipe");
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

  it("whole-house repipe has multi-day duration (not 1h)", () => {
    const config = resolveIndustryTemplate("plumbing");
    const repipe = config.services.find((s) => s.name === "Whole-House Repipe");
    expect(repipe).toBeDefined();
    expect(repipe!.duration).toBeGreaterThanOrEqual(960); // 16+ hours
    expect(repipe!.priceType).toBe("starting_at");
  });

  it("water filtration price is consistent ($550 starting)", () => {
    const config = resolveIndustryTemplate("plumbing");
    const filtration = config.services.find((s) => s.name === "Water Filtration Install");
    expect(filtration).toBeDefined();
    expect(filtration!.price).toBe(550);
    expect(filtration!.priceType).toBe("starting_at");
  });

  // ─── HVAC ───────────────────────────────────────────────────────
  it("HVAC template resolves all expected services", () => {
    const config = resolveIndustryTemplate("hvac");
    expect(config.services.length).toBeGreaterThanOrEqual(5);
    const names = config.services.map((s) => s.name);
    expect(names).toContain("AC Repair");
    expect(names).toContain("Furnace Repair");
  });

  // ─── Electrical ─────────────────────────────────────────────────
  it("electrical template resolves all 7 services", () => {
    const config = resolveIndustryTemplate("electrical");
    expect(config.services).toHaveLength(7);
    const names = config.services.map((s) => s.name);
    expect(names).toContain("Electrical Inspection");
    expect(names).toContain("Outlet Installation");
    expect(names).toContain("Panel Upgrade");
    expect(names).toContain("EV Charger Installation");
    expect(names).toContain("Emergency Service");
  });

  // ─── Cleaning ──────────────────────────────────────────────────
  it("cleaning template resolves all 6 services", () => {
    const config = resolveIndustryTemplate("cleaning");
    expect(config.services).toHaveLength(6);
    const names = config.services.map((s) => s.name);
    expect(names).toContain("Standard Cleaning");
    expect(names).toContain("Deep Cleaning");
    expect(names).toContain("Move In/Out Cleaning");
  });

  // ─── Landscaping / Lawn Care ───────────────────────────────────
  it("landscaping template resolves all 6 services", () => {
    const config = resolveIndustryTemplate("landscaping");
    expect(config.services).toHaveLength(6);
    const names = config.services.map((s) => s.name);
    expect(names).toContain("Lawn Mowing");
    expect(names).toContain("Landscape Design");
  });

  // ─── Pest Control ──────────────────────────────────────────────
  it("pest_control template resolves all 6 services", () => {
    const config = resolveIndustryTemplate("pest_control");
    expect(config.services).toHaveLength(6);
    const names = config.services.map((s) => s.name);
    expect(names).toContain("General Pest Treatment");
    expect(names).toContain("Termite Inspection");
    expect(names).toContain("Bed Bug Treatment");
  });

  // ─── Auto Detailing ────────────────────────────────────────────
  it("auto_detailing template resolves all 6 services", () => {
    const config = resolveIndustryTemplate("auto_detailing");
    expect(config.services).toHaveLength(6);
    const names = config.services.map((s) => s.name);
    expect(names).toContain("Basic Wash");
    expect(names).toContain("Full Detail");
    expect(names).toContain("Ceramic Coating");
  });

  // ─── Auto Repair ───────────────────────────────────────────────
  it("auto_repair template resolves all 6 services", () => {
    const config = resolveIndustryTemplate("auto_repair");
    expect(config.services).toHaveLength(6);
    const names = config.services.map((s) => s.name);
    expect(names).toContain("Diagnostic");
    expect(names).toContain("Oil Change");
    expect(names).toContain("Brake Service");
  });

  // ─── Salon ─────────────────────────────────────────────────────
  it("salon template resolves all 6 services", () => {
    const config = resolveIndustryTemplate("salon");
    expect(config.services).toHaveLength(6);
    const names = config.services.map((s) => s.name);
    expect(names).toContain("Haircut");
    expect(names).toContain("Hair Color");
    expect(names).toContain("Blowout");
  });

  // ─── Service data quality: all services have valid fields ──────
  it("all service-mode industries have valid price types and durations", () => {
    const slugs = [
      "plumbing", "hvac", "electrical", "cleaning", "landscaping",
      "pest_control", "auto_detailing", "auto_repair", "salon",
    ];
    const validPriceTypes = ["fixed", "starting_at", "quote_only"];

    for (const slug of slugs) {
      const config = resolveIndustryTemplate(slug);
      for (const svc of config.services) {
        expect(svc.name.length, `${slug}/${svc.name} name`).toBeGreaterThan(0);
        expect(svc.duration, `${slug}/${svc.name} duration`).toBeGreaterThan(0);
        expect(validPriceTypes, `${slug}/${svc.name} priceType`).toContain(svc.priceType);
        // quote_only services can have price=0 (pricing varies per job)
        if (svc.priceType !== "quote_only") {
          expect(svc.price, `${slug}/${svc.name} price`).toBeGreaterThan(0);
        }
      }
    }
  });

  // ─── FAQs and policies exist for key industries ────────────────
  it("key service industries have at least 3 FAQs defined", () => {
    const slugs = ["plumbing", "hvac", "electrical", "cleaning", "salon", "auto_repair"];
    for (const slug of slugs) {
      const config = resolveIndustryTemplate(slug);
      expect(
        config.faqs.length,
        `${slug} should have at least 3 FAQs`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("key service industries have default policies", () => {
    const slugs = ["plumbing", "hvac", "electrical", "cleaning", "salon"];
    for (const slug of slugs) {
      const config = resolveIndustryTemplate(slug);
      expect(config.defaultPolicies).toBeDefined();
      expect(config.defaultPolicies.cancellation.length).toBeGreaterThan(0);
    }
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
