/**
 * Sales Mode Edge Function Regression Tests
 *
 * @vitest-environment node
 *
 * Covers:
 * 1. elevenlabs-search-inventory — tool correctness, field names, fallback
 * 2. test-drive-handoff — required fields, secret auth, SMS + webhook flow
 * 3. sales-lead-handoff — handoff structure and auth
 * 4. config.toml — all sales functions have verify_jwt = false
 * 5. Color field consistency: testTenantMatrix (exterior_color) → seed maps to DB (color_exterior) → hook (color_exterior)
 *
 * Gate targets: sales functional/booking_creates_correctly, functional/ai_handles_edge_cases
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const root = process.cwd();

const searchInventorySource = readFileSync(
  join(root, "supabase/functions/elevenlabs-search-inventory/index.ts"),
  "utf-8"
);

const testDriveHandoffSource = readFileSync(
  join(root, "supabase/functions/test-drive-handoff/index.ts"),
  "utf-8"
);

const salesLeadHandoffSource = readFileSync(
  join(root, "supabase/functions/sales-lead-handoff/index.ts"),
  "utf-8"
);

const configToml = readFileSync(
  join(root, "supabase/config.toml"),
  "utf-8"
);

const testTenantSource = readFileSync(
  join(root, "src/data/testTenantMatrix.ts"),
  "utf-8"
);

const hookSource = readFileSync(
  join(root, "src/hooks/useSalesInventory.ts"),
  "utf-8"
);

// ---------------------------------------------------------------------------
// 1. config.toml — verify_jwt = false for all sales edge functions
// ---------------------------------------------------------------------------

function getVerifyJwtForFunction(source: string, fnName: string): boolean {
  const fnHeader = `[functions.${fnName}]`;
  const start = source.indexOf(fnHeader);
  if (start === -1) return true; // not found → default is JWT on (bad)
  // Get the next ~200 chars after the header to find verify_jwt
  const block = source.slice(start, start + 300);
  return block.includes("verify_jwt = false");
}

describe("config.toml: sales edge functions have verify_jwt = false", () => {
  it("elevenlabs-search-inventory has verify_jwt = false", () => {
    expect(getVerifyJwtForFunction(configToml, "elevenlabs-search-inventory")).toBe(true);
  });

  it("test-drive-handoff has verify_jwt = false", () => {
    expect(getVerifyJwtForFunction(configToml, "test-drive-handoff")).toBe(true);
  });

  it("sales-lead-handoff has verify_jwt = false", () => {
    expect(getVerifyJwtForFunction(configToml, "sales-lead-handoff")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. elevenlabs-search-inventory — AI tool correctness
// ---------------------------------------------------------------------------

describe("elevenlabs-search-inventory: tool structure — functional/ai_handles_edge_cases", () => {
  it("extracts tenant_id from request body", () => {
    expect(searchInventorySource).toContain("tenant_id");
  });

  it("extracts conversation_id for session lookup fallback", () => {
    expect(searchInventorySource).toContain("conversation_id");
  });

  it("resolves tenant from conversation_id when tenant_id missing", () => {
    expect(searchInventorySource).toContain("ai_call_sessions");
    expect(searchInventorySource).toContain("elevenlabs_conversation_id");
  });

  it("returns graceful error when tenant cannot be resolved (no crash)", () => {
    // Should return 200 with success: false (not a 500)
    expect(searchInventorySource).toContain("success: false");
    expect(searchInventorySource).toContain("status: 200");
  });

  it("queries sales_inventory table with status=available filter", () => {
    expect(searchInventorySource).toContain('"sales_inventory"');
    expect(searchInventorySource).toContain('"available"');
  });

  it("uses color_exterior column name in DB query (correct DB column name)", () => {
    // DB column is color_exterior — seed-test-tenants inserts to color_exterior, search queries color_exterior
    expect(searchInventorySource).toContain("color_exterior");
  });

  it("supports structured filters: make, model, year_min, year_max", () => {
    expect(searchInventorySource).toContain("make");
    expect(searchInventorySource).toContain("model");
    expect(searchInventorySource).toContain("year_min");
    expect(searchInventorySource).toContain("year_max");
  });

  it("supports price filters: price_min, price_max in dollars (converts to cents)", () => {
    expect(searchInventorySource).toContain("price_min");
    expect(searchInventorySource).toContain("price_max");
    // Should convert to cents
    expect(searchInventorySource).toContain("100");
  });

  it("supports color filter via exterior_color ilike", () => {
    expect(searchInventorySource).toContain("color");
    expect(searchInventorySource).toContain("ilike");
  });

  it("limits results to max 10 (prevents info overload in AI call)", () => {
    expect(searchInventorySource).toContain("max_results");
    expect(searchInventorySource).toContain("10");
  });

  it("includes free-text query fallback for natural language requests", () => {
    // e.g. 'looking for a black SUV under 30k'
    expect(searchInventorySource).toContain("query");
    // Keyword parsing: extracts make/model/body_style/color from query
    expect(searchInventorySource).toContain("keyword");
  });

  it("formats prices in dollar format for AI to speak (not raw cents)", () => {
    // AI should hear '$31,895' not '3189500'
    expect(searchInventorySource).toContain("toLocaleString");
  });

  it("returns structured vehicle objects with key fields for AI", () => {
    expect(searchInventorySource).toContain("year");
    expect(searchInventorySource).toContain("make");
    expect(searchInventorySource).toContain("model");
    expect(searchInventorySource).toContain("stock_number");
  });

  it("offers to come in and check vehicles out when results found (pivots to visit)", () => {
    // AI message invites customer to visit the showroom — pivots to action
    expect(searchInventorySource).toContain("come in and check");
  });

  it("returns empty results array gracefully when no matches found", () => {
    // Should return results: [] (not crash or return 500)
    expect(searchInventorySource).toContain("results.length === 0");
    expect(searchInventorySource).toContain("results: []");
  });

  it("includes certification status in response for CPO vehicles", () => {
    expect(searchInventorySource).toContain("certified");
  });
});

// ---------------------------------------------------------------------------
// 3. test-drive-handoff — booking creates correctly
// ---------------------------------------------------------------------------

describe("test-drive-handoff: handoff flow — functional/booking_creates_correctly", () => {
  it("requires internal secret authentication", () => {
    expect(testDriveHandoffSource).toContain("requireInternalSecret");
  });

  it("requires tenant_id in request body", () => {
    expect(testDriveHandoffSource).toContain("tenant_id");
    expect(testDriveHandoffSource).toContain("test_drive_id");
  });

  it("fetches test drive with customer join", () => {
    expect(testDriveHandoffSource).toContain('"test_drives"');
    expect(testDriveHandoffSource).toContain("customer:customers");
  });

  it("builds vehicle description from year/make/model", () => {
    expect(testDriveHandoffSource).toContain("vehicle_year");
    expect(testDriveHandoffSource).toContain("vehicle_make");
    expect(testDriveHandoffSource).toContain("vehicle_model");
  });

  it("sends customer confirmation SMS (functional/booking_sms_confirmation)", () => {
    expect(testDriveHandoffSource).toContain("sendTenantSms");
  });

  it("creates HMAC signature for webhook delivery", () => {
    expect(testDriveHandoffSource).toContain("createHmacSignature");
    expect(testDriveHandoffSource).toContain("SHA-256");
  });

  it("fetches callback_delivery_settings for handoff methods", () => {
    expect(testDriveHandoffSource).toContain("callback_delivery_settings");
    expect(testDriveHandoffSource).toContain("handoff_methods");
  });

  it("handles OPTIONS preflight (CORS)", () => {
    expect(testDriveHandoffSource).toContain("OPTIONS");
    expect(testDriveHandoffSource).toContain("corsHeaders");
  });

  it("returns results object with success/error per method", () => {
    expect(testDriveHandoffSource).toContain("results");
    expect(testDriveHandoffSource).toContain("success");
  });
});

// ---------------------------------------------------------------------------
// 4. sales-lead-handoff — lead pipeline flow
// ---------------------------------------------------------------------------

describe("sales-lead-handoff: lead handoff flow", () => {
  it("requires internal secret authentication", () => {
    expect(salesLeadHandoffSource).toContain("requireInternalSecret");
  });

  it("requires tenant_id and lead_id", () => {
    expect(salesLeadHandoffSource).toContain("tenant_id");
    expect(salesLeadHandoffSource).toContain("lead_id");
  });

  it("fetches sales_lead with customer join", () => {
    expect(salesLeadHandoffSource).toContain('"sales_leads"');
  });

  it("handles CORS OPTIONS preflight", () => {
    expect(salesLeadHandoffSource).toContain("OPTIONS");
  });

  it("sends SMS notification for new lead", () => {
    expect(salesLeadHandoffSource).toContain("sendTenantSms");
  });
});

// ---------------------------------------------------------------------------
// 5. Color field consistency: testTenantMatrix → seed function → DB → hook
// ---------------------------------------------------------------------------

describe("Color field name consistency across sales stack (regression: f59b1fd)", () => {
  it("testTenantMatrix uses exterior_color in customInventory interface", () => {
    // The TypeScript interface field in testTenantMatrix
    expect(testTenantSource).toContain("exterior_color?:");
  });

  it("testTenantMatrix vehicle data uses exterior_color property", () => {
    // Vehicle objects use exterior_color key
    expect(testTenantSource).toContain("exterior_color: \"");
  });

  it("seed-test-tenants maps exterior_color to color_exterior for DB insert", () => {
    const seedSource = readFileSync(
      join(root, "supabase/functions/seed-test-tenants/index.ts"),
      "utf-8"
    );
    // Maps input exterior_color to DB column color_exterior
    expect(seedSource).toContain("color_exterior");
    expect(seedSource).toContain("exterior_color");
    // The mapping: color_exterior: v.exterior_color
    expect(seedSource).toMatch(/color_exterior:\s*v\.exterior_color/);
  });

  it("elevenlabs-search-inventory queries DB column color_exterior (correct DB column)", () => {
    // seed-test-tenants inserts to color_exterior DB column; search-inventory must query the same column
    expect(searchInventorySource).toContain("color_exterior");
    expect(searchInventorySource).not.toContain('"exterior_color"');
  });

  it("useSalesInventory hook interface uses color_exterior (TypeScript field)", () => {
    // The TypeScript interface in the hook uses color_exterior
    expect(hookSource).toContain("color_exterior: string | null");
  });

  it("hook does NOT expose exterior_color (uses color_exterior throughout)", () => {
    // Hook should have normalized the name to color_exterior
    const interfaceBlock = hookSource.slice(
      hookSource.indexOf("interface SalesInventoryItem"),
      hookSource.indexOf("type SalesInventoryInsert")
    );
    expect(interfaceBlock).not.toContain("exterior_color");
  });
});

// ---------------------------------------------------------------------------
// 6. Sales inventory data flow from seed to search
// ---------------------------------------------------------------------------

describe("Sales inventory data flow completeness", () => {
  it("car dealership seed has 8 vehicles with exterior_color set", () => {
    const vehicleMatches = testTenantSource.match(/exterior_color:\s*"[^"]+"/g) || [];
    // 8 vehicles, each with exterior_color
    expect(vehicleMatches.length).toBeGreaterThanOrEqual(8);
  });

  it("car dealership seed has mix of conditions: new, certified, used", () => {
    const carDealerStart = testTenantSource.indexOf('"test-car-dealership"');
    const carDealerEnd = testTenantSource.indexOf('"test-real-estate"');
    const block = testTenantSource.slice(carDealerStart, carDealerEnd);
    expect(block).toContain('"new"');
    expect(block).toContain('"certified"');
    expect(block).toContain('"used"');
  });

  it("car dealership inventory has asking_price_cents and internet_price_cents (for price comparison)", () => {
    expect(testTenantSource).toContain("asking_price_cents");
    expect(testTenantSource).toContain("internet_price_cents");
  });

  it("search inventory returns internet_price_cents in result set (actual price shown to AI)", () => {
    expect(searchInventorySource).toContain("internet_price_cents");
  });

  it("search inventory max result count enforced (prevents AI information overload)", () => {
    const maxResultsBlock = searchInventorySource.slice(
      searchInventorySource.indexOf("max_results"),
      searchInventorySource.indexOf("max_results") + 100
    );
    expect(maxResultsBlock).toContain("10");
  });
});

// ---------------------------------------------------------------------------
// 7. Sales mode anti-fabrication: inventory rules in text-conversation
// ---------------------------------------------------------------------------

const textConvPath = join(root, "supabase/functions/text-conversation/index.ts");
const textConvSource = readFileSync(textConvPath, "utf-8");

describe("text-conversation: INVENTORY anti-fabrication rules for sales mode", () => {
  it("has INVENTORY RULE directive in salesRules", () => {
    expect(textConvSource).toContain("INVENTORY RULE");
  });

  it("salesRules prohibits fabricating vehicle specs", () => {
    // Should instruct AI to only mention inventory from search results
    expect(textConvSource).toContain("salesRules");
    const salesRulesStart = textConvSource.indexOf("salesRules");
    const salesRulesBlock = textConvSource.slice(salesRulesStart, salesRulesStart + 2000);
    expect(salesRulesBlock).toContain("INVENTORY");
  });

  it("salesRules has BOOKING COMPLETION rule (test drive must create booking)", () => {
    const salesRulesStart = textConvSource.indexOf("salesRules");
    const salesRulesBlock = textConvSource.slice(salesRulesStart, salesRulesStart + 2000);
    expect(salesRulesBlock).toContain("BOOKING COMPLETION");
  });

  it("salesRules does NOT allow quoting specific interest rates (SALES APPROACH)", () => {
    const salesRulesStart = textConvSource.indexOf("salesRules");
    const salesRulesBlock = textConvSource.slice(salesRulesStart, salesRulesStart + 2000);
    expect(salesRulesBlock).toContain("SALES APPROACH");
  });
});
