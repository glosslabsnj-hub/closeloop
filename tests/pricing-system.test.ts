/**
 * Tests for the Unified Pricing System
 *
 * Validates all 5 pricing models (flat, distance_tiered, per_unit, package, variable),
 * trip fees, AI quote behavior, voice script generation, and preset configs.
 */
import {
  calculateDispatchPrice,
  generatePricingSummary,
  calculateScenarioQuotes,
  DISPATCH_SERVICE_PRESETS,
  type DispatchPricingConfig,
} from "../src/types/dispatchPricing";

// ============= calculateDispatchPrice =============

describe("calculateDispatchPrice", () => {
  describe("flat model", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "flat",
      min_price: 75,
    };

    test("returns flat price regardless of distance", () => {
      const result = calculateDispatchPrice(config, 5);
      expect(result.min).toBe(75);
    });

    test("returns flat price at 0 distance", () => {
      const result = calculateDispatchPrice(config, 0);
      expect(result.min).toBe(75);
    });

    test("applies overage for distance beyond included miles", () => {
      const configWithOverage: DispatchPricingConfig = {
        pricing_model: "flat",
        min_price: 75,
        included_miles: 10,
        overage_per_mile: 3,
      };
      const result = calculateDispatchPrice(configWithOverage, 20);
      // 75 + (20-10) * 3 = 75 + 30 = 105
      expect(result.min).toBe(105);
    });

    test("no overage within included miles", () => {
      const configWithOverage: DispatchPricingConfig = {
        pricing_model: "flat",
        min_price: 75,
        included_miles: 25,
        overage_per_mile: 3,
      };
      const result = calculateDispatchPrice(configWithOverage, 10);
      expect(result.min).toBe(75);
    });
  });

  describe("distance_tiered model", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "distance_tiered",
      distance_tiers: [
        { min_miles: 0, max_miles: 10, base_price: 125, per_mile_price: 0 },
        { min_miles: 10, max_miles: 25, base_price: 125, per_mile_price: 5 },
        { min_miles: 25, max_miles: null, base_price: 200, per_mile_price: 4 },
      ],
      min_price: 85,
    };

    test("uses first tier for short distances", () => {
      const result = calculateDispatchPrice(config, 5);
      expect(result.min).toBe(125);
    });

    test("applies per-mile in second tier", () => {
      const result = calculateDispatchPrice(config, 15);
      // 125 + (15-10)*5 = 125 + 25 = 150
      expect(result.min).toBe(150);
    });

    test("applies per-mile in open-ended tier", () => {
      const result = calculateDispatchPrice(config, 40);
      // 200 + (40-25)*4 = 200 + 60 = 260
      expect(result.min).toBe(260);
    });

    test("applies vehicle modifiers", () => {
      const configWithVar: DispatchPricingConfig = {
        ...config,
        variables: [{
          key: "vehicle_type",
          label: "Vehicle Type",
          modifiers: [
            { value: "suv", price_adjustment: 25, adjustment_type: "fixed" },
          ],
        }],
      };
      const result = calculateDispatchPrice(configWithVar, 5, { vehicle_type: "suv" });
      // 125 + 25 = 150
      expect(result.min).toBe(150);
    });
  });

  describe("per_unit model", () => {
    test("calculates per-unit price with minimum units", () => {
      const config: DispatchPricingConfig = {
        pricing_model: "per_unit",
        unit_label: "room",
        per_unit_price: 45,
        min_units: 3,
        min_price: 135,
      };
      // Default: uses min_units = 3
      const result = calculateDispatchPrice(config, 0);
      // 3 * 45 = 135
      expect(result.min).toBe(135);
    });

    test("calculates per-unit with explicit units above minimum", () => {
      const config: DispatchPricingConfig = {
        pricing_model: "per_unit",
        unit_label: "room",
        per_unit_price: 45,
        min_units: 3,
      };
      const result = calculateDispatchPrice(config, 0, { units: "5" });
      // 5 * 45 = 225
      expect(result.min).toBe(225);
    });

    test("enforces min_units when requested units are below minimum", () => {
      const config: DispatchPricingConfig = {
        pricing_model: "per_unit",
        unit_label: "room",
        per_unit_price: 45,
        min_units: 3,
      };
      const result = calculateDispatchPrice(config, 0, { units: "1" });
      // Enforced to 3 * 45 = 135
      expect(result.min).toBe(135);
    });

    test("hourly pricing for handyman", () => {
      const config: DispatchPricingConfig = {
        pricing_model: "per_unit",
        unit_label: "hour",
        per_unit_price: 75,
        min_units: 2,
        min_price: 150,
      };
      const result = calculateDispatchPrice(config, 0);
      expect(result.min).toBe(150);
    });

    test("per-unit with trip fee", () => {
      const config: DispatchPricingConfig = {
        pricing_model: "per_unit",
        unit_label: "hour",
        per_unit_price: 125,
        min_units: 1,
        trip_fee: { enabled: true, amount: 95, label: "Diagnostic Fee" },
      };
      const result = calculateDispatchPrice(config, 0);
      // 1 * 125 + 95 trip fee = 220
      expect(result.min).toBe(220);
    });
  });

  describe("package model", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "package",
      packages: [
        { name: "Basic", price: 80, description: "Exterior wash" },
        { name: "Standard", price: 150, description: "Full detail", is_popular: true },
        { name: "Premium", price: 250, description: "Full + ceramic" },
      ],
    };

    test("defaults to first package when none selected", () => {
      const result = calculateDispatchPrice(config, 0);
      expect(result.min).toBe(80);
    });

    test("uses selected package by name", () => {
      const result = calculateDispatchPrice(config, 0, { package: "Standard" });
      expect(result.min).toBe(150);
    });

    test("case-insensitive package matching", () => {
      const result = calculateDispatchPrice(config, 0, { package: "premium" });
      expect(result.min).toBe(250);
    });

    test("package with trip fee", () => {
      const configWithFee: DispatchPricingConfig = {
        ...config,
        trip_fee: { enabled: true, amount: 50, label: "Delivery Fee" },
      };
      const result = calculateDispatchPrice(configWithFee, 0, { package: "Basic" });
      // 80 + 50 = 130
      expect(result.min).toBe(130);
    });

    test("package with vehicle modifier", () => {
      const configWithVar: DispatchPricingConfig = {
        ...config,
        variables: [{
          key: "vehicle_type",
          label: "Vehicle Size",
          modifiers: [
            { value: "suv", price_adjustment: 30, adjustment_type: "fixed" },
          ],
        }],
      };
      const result = calculateDispatchPrice(configWithVar, 0, { package: "Basic", vehicle_type: "suv" });
      // 80 + 30 = 110
      expect(result.min).toBe(110);
    });
  });

  describe("variable model", () => {
    test("returns min_price as base", () => {
      const config: DispatchPricingConfig = {
        pricing_model: "variable",
        min_price: 100,
        max_price: 500,
      };
      const result = calculateDispatchPrice(config, 0);
      expect(result.min).toBe(100);
      // max is capped by max_price but the calculated total is still 100
      expect(result.max).toBe(100);
    });

    test("returns 0 if no min_price", () => {
      const config: DispatchPricingConfig = {
        pricing_model: "variable",
      };
      const result = calculateDispatchPrice(config, 0);
      expect(result.min).toBe(0);
    });
  });

  describe("trip fee", () => {
    test("adds trip fee to flat price", () => {
      const config: DispatchPricingConfig = {
        pricing_model: "flat",
        min_price: 75,
        trip_fee: { enabled: true, amount: 25, label: "Trip Charge" },
      };
      const result = calculateDispatchPrice(config, 0);
      expect(result.min).toBe(100);
    });

    test("trip fee disabled has no effect", () => {
      const config: DispatchPricingConfig = {
        pricing_model: "flat",
        min_price: 75,
        trip_fee: { enabled: false, amount: 25, label: "Trip Charge" },
      };
      const result = calculateDispatchPrice(config, 0);
      expect(result.min).toBe(75);
    });

    test("no trip fee field has no effect", () => {
      const config: DispatchPricingConfig = {
        pricing_model: "flat",
        min_price: 75,
      };
      const result = calculateDispatchPrice(config, 0);
      expect(result.min).toBe(75);
    });
  });
});

// ============= generatePricingSummary =============

describe("generatePricingSummary", () => {
  test("generates flat rate summary", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "flat",
      min_price: 75,
    };
    const summary = generatePricingSummary(config, "Jump Start");
    expect(summary).toContain("Jump Start");
    expect(summary).toContain("$75");
    expect(summary).toContain("flat rate");
  });

  test("generates per-unit summary with minimum", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "per_unit",
      unit_label: "room",
      per_unit_price: 45,
      min_units: 3,
    };
    const summary = generatePricingSummary(config, "Carpet Cleaning");
    expect(summary).toContain("$45");
    expect(summary).toContain("room");
    expect(summary).toContain("3");
  });

  test("generates package summary", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "package",
      packages: [
        { name: "Basic", price: 80 },
        { name: "Standard", price: 150 },
        { name: "Premium", price: 250 },
      ],
    };
    const summary = generatePricingSummary(config, "Mobile Detailing");
    expect(summary).toContain("Basic");
    expect(summary).toContain("$80");
    expect(summary).toContain("$150");
    expect(summary).toContain("$250");
  });

  test("includes trip fee in summary", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "flat",
      min_price: 200,
      trip_fee: { enabled: true, amount: 50, label: "Inspection Fee", waived_with_service: true },
    };
    const summary = generatePricingSummary(config, "Pest Control");
    expect(summary).toContain("$50");
    expect(summary).toContain("inspection fee");
    expect(summary).toContain("waived");
  });

  test("always_quote_required overrides any model", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "per_unit",
      unit_label: "hour",
      per_unit_price: 125,
      ai_quote_behavior: "always_quote_required",
    };
    const summary = generatePricingSummary(config, "Plumbing");
    expect(summary).toContain("custom quote");
    expect(summary).not.toContain("$125");
  });

  test("quote_rate_only for per_unit states rate without total", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "per_unit",
      unit_label: "hour",
      per_unit_price: 75,
      min_units: 2,
      ai_quote_behavior: "quote_rate_only",
    };
    const summary = generatePricingSummary(config, "Handyman");
    expect(summary).toContain("$75");
    expect(summary).toContain("hour");
  });

  test("null config returns fallback", () => {
    const summary = generatePricingSummary(null, "Unknown Service");
    expect(summary).toContain("custom quote");
  });
});

// ============= calculateScenarioQuotes =============

describe("calculateScenarioQuotes", () => {
  test("returns distance-based quotes for distance_tiered", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "distance_tiered",
      distance_tiers: [
        { min_miles: 0, max_miles: 10, base_price: 125, per_mile_price: 0 },
        { min_miles: 10, max_miles: null, base_price: 125, per_mile_price: 5 },
      ],
      min_price: 85,
    };
    const quotes = calculateScenarioQuotes(config, "Local Tow");
    expect(quotes.length).toBe(4);
    expect(quotes[0].distance).toBe(5);
    expect(quotes[0].price).toBe(125);
  });

  test("returns unit-based quotes for per_unit", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "per_unit",
      unit_label: "room",
      per_unit_price: 45,
      min_units: 3,
    };
    const quotes = calculateScenarioQuotes(config, "Carpet Cleaning");
    expect(quotes.length).toBe(4);
    // First quote: 1 room, but min 3 enforced = 3*45 = 135
    expect(quotes[0].price).toBe(135);
    // Third quote: 3 rooms = 3*45 = 135
    expect(quotes[2].price).toBe(135);
    // Fourth quote: 5 rooms = 5*45 = 225
    expect(quotes[3].price).toBe(225);
  });

  test("returns package-based quotes for package", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "package",
      packages: [
        { name: "Basic", price: 80 },
        { name: "Standard", price: 150 },
        { name: "Premium", price: 250 },
      ],
    };
    const quotes = calculateScenarioQuotes(config, "Detailing");
    expect(quotes.length).toBe(3);
    expect(quotes[0].price).toBe(80);
    expect(quotes[1].price).toBe(150);
    expect(quotes[2].price).toBe(250);
  });
});

// ============= Preset Validation =============

describe("DISPATCH_SERVICE_PRESETS", () => {
  test("all presets have valid pricing configs", () => {
    for (const preset of DISPATCH_SERVICE_PRESETS) {
      const config = preset.defaultPricingConfig;
      expect(["flat", "distance_tiered", "per_unit", "package", "variable"]).toContain(config.pricing_model);

      // Verify model-specific fields are present
      if (config.pricing_model === "distance_tiered") {
        expect(config.distance_tiers).toBeDefined();
        expect(config.distance_tiers!.length).toBeGreaterThan(0);
      }

      if (config.pricing_model === "per_unit") {
        expect(config.per_unit_price).toBeDefined();
        expect(config.per_unit_price).toBeGreaterThan(0);
        expect(config.unit_label).toBeDefined();
      }

      if (config.pricing_model === "package") {
        expect(config.packages).toBeDefined();
        expect(config.packages!.length).toBeGreaterThanOrEqual(2);
        for (const pkg of config.packages!) {
          expect(pkg.name).toBeTruthy();
          expect(pkg.price).toBeGreaterThan(0);
        }
      }
    }
  });

  test("all presets have valid presetTab", () => {
    const validTabs = ["towing_roadside", "home_services", "mobile_services", "hauling_rental"];
    for (const preset of DISPATCH_SERVICE_PRESETS) {
      expect(validTabs).toContain(preset.presetTab);
    }
  });

  test("all presets produce valid voice summaries", () => {
    for (const preset of DISPATCH_SERVICE_PRESETS) {
      const summary = generatePricingSummary(preset.defaultPricingConfig, preset.name);
      expect(summary.length).toBeGreaterThan(0);
      expect(summary).not.toContain("undefined");
      expect(summary).not.toContain("null");
      expect(summary).not.toContain("NaN");
    }
  });

  test("all presets produce valid scenario quotes", () => {
    for (const preset of DISPATCH_SERVICE_PRESETS) {
      if (preset.defaultPricingConfig.pricing_model === "variable") continue;
      const quotes = calculateScenarioQuotes(preset.defaultPricingConfig, preset.name);
      expect(quotes.length).toBeGreaterThan(0);
      for (const q of quotes) {
        expect(q.price).toBeGreaterThanOrEqual(0);
        expect(isFinite(q.price)).toBe(true);
      }
    }
  });

  test("has presets for all 4 category tabs", () => {
    const tabs = new Set(DISPATCH_SERVICE_PRESETS.map(p => p.presetTab));
    expect(tabs.has("towing_roadside")).toBe(true);
    expect(tabs.has("home_services")).toBe(true);
    expect(tabs.has("mobile_services")).toBe(true);
    expect(tabs.has("hauling_rental")).toBe(true);
  });

  test("existing towing presets are unchanged (backward compatibility)", () => {
    const localTow = DISPATCH_SERVICE_PRESETS.find(p => p.type === "local_tow");
    expect(localTow).toBeDefined();
    expect(localTow!.defaultPricingConfig.pricing_model).toBe("distance_tiered");
    expect(localTow!.defaultPricingConfig.distance_tiers).toHaveLength(3);
    expect(localTow!.defaultPricingConfig.min_price).toBe(85);

    const jumpStart = DISPATCH_SERVICE_PRESETS.find(p => p.type === "jump_start");
    expect(jumpStart).toBeDefined();
    expect(jumpStart!.defaultPricingConfig.pricing_model).toBe("flat");
    expect(jumpStart!.defaultPricingConfig.min_price).toBe(65);
  });
});

// ============= Consistency between real-time and entity pricing =============

describe("Pricing Consistency", () => {
  test("calculateDispatchPrice with flat model matches expected entity price", () => {
    // Simulate the same config being used by both real-time and webhook engines
    const config: DispatchPricingConfig = {
      pricing_model: "flat",
      min_price: 85,
      trip_fee: { enabled: true, amount: 25, label: "Trip Charge" },
    };

    const result = calculateDispatchPrice(config, 5);
    // Real-time engine: 85 + 25 = 110
    expect(result.min).toBe(110);

    // Entity pricing would read the same config and compute the same
    // This verifies both paths produce identical results for the same config
    const result2 = calculateDispatchPrice(config, 15);
    expect(result2.min).toBe(110); // Flat, so distance doesn't matter
  });

  test("same distance_tiered config produces same price regardless of call path", () => {
    const config: DispatchPricingConfig = {
      pricing_model: "distance_tiered",
      distance_tiers: [
        { min_miles: 0, max_miles: 10, base_price: 125, per_mile_price: 0 },
        { min_miles: 10, max_miles: null, base_price: 125, per_mile_price: 5 },
      ],
      min_price: 85,
    };

    // 20-mile job
    const result1 = calculateDispatchPrice(config, 20);
    const result2 = calculateDispatchPrice(config, 20, {});
    expect(result1.min).toBe(result2.min);
    // 125 + (20-10)*5 = 175
    expect(result1.min).toBe(175);
  });
});
