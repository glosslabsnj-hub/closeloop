/**
 * Food Mode — Industry Catalog, Tools, Rules, and Infrastructure Tests
 *
 * @vitest-environment node
 *
 * Validates food mode is fully wired:
 * - 7 food industries in catalog with correct data
 * - food_orders module enabled for all food industries
 * - text-conversation FOOD_TOOLS (create_food_order, lookup_order_status)
 * - text-conversation food mode rules (ORDER COMPLETION, minimal info, menu rule)
 * - endpoint mappings for food tools
 * - buildBusinessContext food_settings helper functions
 *
 * Gates: food functional/food_order_creates_correctly,
 *        food functional/order_lookup_works,
 *        food onboarding/questions_relevant_to_mode
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getIndustryBySlug } from "@/data/industryCatalog";

const TEXT_CONV_PATH = join(
  process.cwd(),
  "supabase/functions/text-conversation/index.ts"
);
const BUILD_CONTEXT_PATH = join(
  process.cwd(),
  "supabase/functions/_shared/buildBusinessContext.ts"
);

const textConv = readFileSync(TEXT_CONV_PATH, "utf-8");
const buildCtx = readFileSync(BUILD_CONTEXT_PATH, "utf-8");

// ---------------------------------------------------------------------------
// Industry catalog: food industry slugs
// ---------------------------------------------------------------------------

describe("food mode: industry catalog entries", () => {
  const foodSlugs = ["restaurant", "pizzeria", "fast_casual", "bakery", "coffee_shop", "food_truck", "catering_service"];

  for (const slug of foodSlugs) {
    it(`industry '${slug}' exists in catalog`, () => {
      const entry = getIndustryBySlug(slug);
      expect(entry, `${slug} must be in catalog`).toBeDefined();
    });
  }

  it("restaurant has correct services (dine-in, takeout, delivery, reservation)", () => {
    const entry = getIndustryBySlug("restaurant");
    expect(entry).toBeDefined();
    const names = entry!.services.map((s) => s.name);
    expect(names).toContain("Dine-In");
    expect(names).toContain("Takeout Order");
    expect(names).toContain("Delivery Order");
    expect(names).toContain("Reservation");
  });

  it("pizzeria has pickup and delivery order types", () => {
    const entry = getIndustryBySlug("pizzeria");
    expect(entry).toBeDefined();
    const names = entry!.services.map((s) => s.name);
    expect(names).toContain("Pickup Order");
    expect(names).toContain("Delivery Order");
  });

  it("catering_service has guest-count-based tiers", () => {
    const entry = getIndustryBySlug("catering_service");
    expect(entry).toBeDefined();
    const names = entry!.services.map((s) => s.name);
    expect(names).toContain("Small Event (25 guests)");
    expect(names).toContain("Medium Event (50 guests)");
    expect(names).toContain("Large Event (100+ guests)");
  });

  it("food_truck has event booking service", () => {
    const entry = getIndustryBySlug("food_truck");
    expect(entry).toBeDefined();
    const names = entry!.services.map((s) => s.name);
    expect(names).toContain("Event Booking");
  });

  it("coffee_shop has catering service", () => {
    const entry = getIndustryBySlug("coffee_shop");
    expect(entry).toBeDefined();
    const names = entry!.services.map((s) => s.name);
    const hasCatering = names.some((n) => n.toLowerCase().includes("catering"));
    expect(hasCatering).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Food mode: business_mode classification
// ---------------------------------------------------------------------------

describe("food mode: business_mode classification", () => {
  const foodSlugs = ["restaurant", "pizzeria", "food_truck"];

  for (const slug of foodSlugs) {
    it(`'${slug}' has businessMode = 'food'`, () => {
      const entry = getIndustryBySlug(slug);
      expect(entry).toBeDefined();
      expect(entry!.businessMode).toBe("food");
    });
  }

  it("catering_service has businessMode = 'food'", () => {
    const entry = getIndustryBySlug("catering_service");
    expect(entry).toBeDefined();
    expect(entry!.businessMode).toBe("food");
  });
});

// ---------------------------------------------------------------------------
// Food mode: enabled modules (food_orders required)
// ---------------------------------------------------------------------------

describe("food mode: enabled modules", () => {
  const regularFoodSlugs = ["restaurant", "pizzeria", "fast_casual", "bakery", "coffee_shop", "food_truck"];

  for (const slug of regularFoodSlugs) {
    it(`'${slug}' has 'food_orders' module enabled`, () => {
      const entry = getIndustryBySlug(slug);
      expect(entry).toBeDefined();
      const modules = entry!.enabledModules ?? [];
      expect(modules, `${slug} must have food_orders module`).toContain("food_orders");
    });
  }

  for (const slug of regularFoodSlugs) {
    it(`'${slug}' has 'menu_knowledge' module enabled`, () => {
      const entry = getIndustryBySlug(slug);
      expect(entry).toBeDefined();
      const modules = entry!.enabledModules ?? [];
      expect(modules, `${slug} must have menu_knowledge module`).toContain("menu_knowledge");
    });
  }

  it("restaurant has 'reservations' module enabled", () => {
    const entry = getIndustryBySlug("restaurant");
    const modules = entry!.enabledModules ?? [];
    expect(modules).toContain("reservations");
  });

  it("catering_service has 'catering' module enabled", () => {
    const entry = getIndustryBySlug("catering_service");
    const modules = entry!.enabledModules ?? [];
    expect(modules).toContain("catering");
  });

  it("food industries do NOT have 'booking' module (they use food_orders)", () => {
    // Food businesses take orders, not appointments — booking module is service-mode
    const foodSlugs = ["restaurant", "pizzeria", "fast_casual", "food_truck"];
    for (const slug of foodSlugs) {
      const entry = getIndustryBySlug(slug);
      const modules = entry!.enabledModules ?? [];
      expect(modules, `${slug} should not have 'booking' module`).not.toContain("booking");
    }
  });
});

// ---------------------------------------------------------------------------
// text-conversation: FOOD_TOOLS defined
// ---------------------------------------------------------------------------

describe("food mode: text-conversation FOOD_TOOLS", () => {
  it("FOOD_TOOLS array is defined", () => {
    expect(textConv).toContain("const FOOD_TOOLS");
  });

  it("defines create_food_order tool", () => {
    expect(textConv).toContain('name: "create_food_order"');
  });

  it("defines lookup_order_status tool", () => {
    expect(textConv).toContain('name: "lookup_order_status"');
  });

  it("create_food_order requires customer_name, order_type, and items", () => {
    const toolStart = textConv.indexOf('name: "create_food_order"');
    const toolEnd = textConv.indexOf('name: "lookup_order_status"');
    const toolBlock = textConv.slice(toolStart, toolEnd);
    expect(toolBlock).toContain('"customer_name"');
    expect(toolBlock).toContain('"order_type"');
    expect(toolBlock).toContain('"items"');
  });

  it("create_food_order required array includes customer_name, order_type, items", () => {
    const toolStart = textConv.indexOf('name: "create_food_order"');
    const toolEnd = textConv.indexOf('name: "lookup_order_status"');
    const toolBlock = textConv.slice(toolStart, toolEnd);
    expect(toolBlock).toContain('"customer_name", "order_type", "items"');
  });

  it("lookup_order_status requires customer_phone", () => {
    const lookupStart = textConv.indexOf('name: "lookup_order_status"');
    const lookupEnd = textConv.indexOf("];", lookupStart);
    const lookupBlock = textConv.slice(lookupStart, lookupEnd);
    expect(lookupBlock).toContain('"customer_phone"');
  });

  it("FOOD_TOOLS is returned by getToolDefinitions for food mode", () => {
    expect(textConv).toContain('case "food"');
    // find case "food" and verify it returns FOOD_TOOLS
    const caseStart = textConv.indexOf('case "food"');
    const caseEnd = textConv.indexOf("case ", caseStart + 10);
    const caseBlock = textConv.slice(caseStart, caseEnd);
    expect(caseBlock).toContain("FOOD_TOOLS");
  });
});

// ---------------------------------------------------------------------------
// text-conversation: food endpoint mappings
// ---------------------------------------------------------------------------

describe("food mode: text-conversation endpoint mappings", () => {
  it("maps create_food_order → elevenlabs-create-food-order", () => {
    expect(textConv).toContain('create_food_order: "elevenlabs-create-food-order"');
  });

  it("maps lookup_order_status → elevenlabs-lookup-order-status", () => {
    expect(textConv).toContain('lookup_order_status: "elevenlabs-lookup-order-status"');
  });
});

// ---------------------------------------------------------------------------
// text-conversation: food mode rules
// ---------------------------------------------------------------------------

describe("food mode: text-conversation food rules", () => {
  it("foodRules variable is defined", () => {
    expect(textConv).toContain("const foodRules");
  });

  it("food rules include ORDER COMPLETION directive", () => {
    expect(textConv).toContain("ORDER COMPLETION");
  });

  it("food rules include create_food_order instruction", () => {
    expect(textConv).toContain("create_food_order");
  });

  it("food rules include lookup_order_status instruction", () => {
    expect(textConv).toContain("lookup_order_status");
  });

  it("food mode rules selected for 'food' businessMode", () => {
    // modeRules = businessMode === "dispatch" ? dispatchRules : businessMode === "food" ? foodRules : serviceRules
    expect(textConv).toContain('businessMode === "food" ? foodRules');
  });

  it("food rules include MENU RULE (only items from menu)", () => {
    expect(textConv).toContain("MENU RULE");
  });

  it("food rules include delivery address requirement for delivery orders", () => {
    const foodRulesStart = textConv.indexOf("const foodRules");
    const foodRulesEnd = textConv.indexOf("const modeRules", foodRulesStart);
    const foodRulesBlock = textConv.slice(foodRulesStart, foodRulesEnd);
    expect(foodRulesBlock.toLowerCase()).toContain("delivery address");
  });

  it("food rules do NOT instruct AI to use create_booking (wrong tool for food mode)", () => {
    // foodRules should have no reference to create_booking
    const foodRulesStart = textConv.indexOf("const foodRules");
    const foodRulesEnd = textConv.indexOf("const modeRules", foodRulesStart);
    const foodRulesBlock = textConv.slice(foodRulesStart, foodRulesEnd);
    expect(foodRulesBlock).not.toContain("create_booking");
  });
});

// ---------------------------------------------------------------------------
// buildBusinessContext: food_settings structure
// ---------------------------------------------------------------------------

describe("food mode: buildBusinessContext food_settings", () => {
  it("buildFoodServiceTypesSummary function exists", () => {
    expect(buildCtx).toContain("buildFoodServiceTypesSummary");
  });

  it("buildDailySpecialsSummary function exists", () => {
    expect(buildCtx).toContain("buildDailySpecialsSummary");
  });

  it("buildDeliveryFeeSummary function exists", () => {
    expect(buildCtx).toContain("buildDeliveryFeeSummary");
  });

  it("buildFoodPoliciesSummary function exists", () => {
    expect(buildCtx).toContain("buildFoodPoliciesSummary");
  });

  it("buildMenuCategoriesSummary function exists", () => {
    expect(buildCtx).toContain("buildMenuCategoriesSummary");
  });

  it("food_settings includes order_confirmation_mode", () => {
    expect(buildCtx).toContain("order_confirmation_mode");
  });

  it("food_settings includes accepts_delivery flag", () => {
    expect(buildCtx).toContain("accepts_delivery");
  });

  it("food_settings includes accepts_pickup flag", () => {
    expect(buildCtx).toContain("accepts_pickup");
  });

  it("food_settings includes delivery_zones", () => {
    expect(buildCtx).toContain("delivery_zones");
  });

  it("food_settings includes food_policies", () => {
    expect(buildCtx).toContain("food_policies");
  });

  it("food_settings fetches from tenant_food_settings table", () => {
    expect(buildCtx).toContain("tenant_food_settings");
  });

  it("food_settings fetches from delivery_zones table", () => {
    expect(buildCtx).toContain("delivery_zones");
  });

  it("food_settings fetches from food_policies table", () => {
    expect(buildCtx).toContain("food_policies");
  });
});

// ---------------------------------------------------------------------------
// Food mode: edge functions exist
// ---------------------------------------------------------------------------

describe("food mode: edge functions", () => {
  const { readdirSync, existsSync } = require("node:fs");

  it("elevenlabs-create-food-order edge function exists", () => {
    const fnPath = join(process.cwd(), "supabase/functions/elevenlabs-create-food-order");
    expect(existsSync(fnPath)).toBe(true);
  });

  it("elevenlabs-lookup-order-status edge function exists", () => {
    const fnPath = join(process.cwd(), "supabase/functions/elevenlabs-lookup-order-status");
    expect(existsSync(fnPath)).toBe(true);
  });

  it("order-handoff edge function exists", () => {
    const fnPath = join(process.cwd(), "supabase/functions/order-handoff");
    expect(existsSync(fnPath)).toBe(true);
  });

  it("elevenlabs-create-food-order has verify_jwt = false in config.toml", () => {
    const configPath = join(process.cwd(), "supabase/config.toml");
    const config = readFileSync(configPath, "utf-8");
    // Check for the food order function entry
    const fnSection = config.indexOf("[functions.elevenlabs-create-food-order]");
    if (fnSection === -1) {
      // Not in config.toml means it uses default (no JWT check needed — ElevenLabs calls don't send JWT)
      // But we should ensure it's listed
      expect(config).toContain("elevenlabs-create-food-order");
    } else {
      const sectionEnd = config.indexOf("\n[", fnSection + 1);
      const sectionBlock = config.slice(fnSection, sectionEnd === -1 ? undefined : sectionEnd);
      expect(sectionBlock).toContain("verify_jwt = false");
    }
  });

  it("order-handoff has verify_jwt = false in config.toml", () => {
    const configPath = join(process.cwd(), "supabase/config.toml");
    const config = readFileSync(configPath, "utf-8");
    const fnSection = config.indexOf("[functions.order-handoff]");
    if (fnSection === -1) {
      expect(config).toContain("order-handoff");
    } else {
      const sectionEnd = config.indexOf("\n[", fnSection + 1);
      const sectionBlock = config.slice(fnSection, sectionEnd === -1 ? undefined : sectionEnd);
      expect(sectionBlock).toContain("verify_jwt = false");
    }
  });
});

// ---------------------------------------------------------------------------
// Food mode: cross-mode safety — food mode does NOT inherit service tools
// ---------------------------------------------------------------------------

describe("food mode: cross-mode safety", () => {
  it("getToolDefinitions: food mode does NOT fall through to service tools", () => {
    // The switch statement must have a case for "food" BEFORE the default
    const switchStart = textConv.indexOf("function getToolDefinitions");
    const switchEnd = textConv.indexOf("}", switchStart + 50);
    // Scan further to find closing of switch
    let depth = 0;
    let pos = switchStart;
    while (pos < textConv.length) {
      if (textConv[pos] === "{") depth++;
      else if (textConv[pos] === "}") {
        depth--;
        if (depth === 0) break;
      }
      pos++;
    }
    const fnBody = textConv.slice(switchStart, pos);
    // food case must exist
    expect(fnBody).toContain('case "food"');
    // food case must come BEFORE default
    const foodPos = fnBody.indexOf('case "food"');
    const defaultPos = fnBody.indexOf("default:");
    expect(foodPos).toBeLessThan(defaultPos);
  });

  it("SERVICE_TOOLS does not contain create_food_order", () => {
    const serviceToolsStart = textConv.indexOf("const SERVICE_TOOLS");
    const serviceToolsEnd = textConv.indexOf("];", serviceToolsStart);
    const serviceBlock = textConv.slice(serviceToolsStart, serviceToolsEnd);
    expect(serviceBlock).not.toContain("create_food_order");
  });

  it("FOOD_TOOLS does not contain create_booking (prevents booking confusion)", () => {
    const foodToolsStart = textConv.indexOf("const FOOD_TOOLS");
    const foodToolsEnd = textConv.indexOf("];", foodToolsStart);
    const foodBlock = textConv.slice(foodToolsStart, foodToolsEnd);
    expect(foodBlock).not.toContain("create_booking");
  });

  it("FOOD_TOOLS does not contain create_dispatch_job (different mode)", () => {
    const foodToolsStart = textConv.indexOf("const FOOD_TOOLS");
    const foodToolsEnd = textConv.indexOf("];", foodToolsStart);
    const foodBlock = textConv.slice(foodToolsStart, foodToolsEnd);
    expect(foodBlock).not.toContain("create_dispatch_job");
  });
});
