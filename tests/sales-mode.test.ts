/**
 * Tests for the Sales business mode
 *
 * Validates:
 * 1. Capability resolution for sales mode
 * 2. Routing target determination for sales intents
 * 3. No regression on existing modes
 */

// Inline resolveCapabilities logic for testing (mirrors _shared/resolveCapabilities.ts)
type BusinessMode = "service" | "dispatch" | "food" | "medical" | "general" | "sales";

const MODE_DEFAULTS: Record<BusinessMode, string[]> = {
  service: ["ai_voice", "instant_text_back", "booking"],
  dispatch: ["ai_voice", "instant_text_back", "dispatch_queue"],
  food: ["ai_voice", "instant_text_back", "food_orders", "menu_knowledge", "reservations", "catering"],
  medical: ["ai_voice", "instant_text_back", "booking", "medical_intake"],
  general: ["ai_voice", "instant_text_back"],
  sales: ["ai_voice", "instant_text_back", "sales_leads", "booking"],
};

function resolveCapabilities(mode: BusinessMode, modules: string[]) {
  const effectiveModules = modules.length > 0 ? modules : MODE_DEFAULTS[mode] ?? [];
  const has = (m: string) => effectiveModules.includes(m);

  const hasBooking = has("booking");
  const hasDispatchQueue = has("dispatch_queue");
  const hasFoodOrders = has("food_orders");
  const hasMedicalIntake = has("medical_intake");
  const hasSalesLeads = has("sales_leads");
  const hasTestDrives = has("test_drives");
  const hasSalesInventory = has("sales_inventory");

  const isFoodBusiness = hasFoodOrders;
  const isDispatchBusiness = hasDispatchQueue;
  const isMedicalBusiness = hasMedicalIntake;
  const isSalesBusiness = hasSalesLeads || hasTestDrives;
  const isServiceBusiness = hasBooking && !isDispatchBusiness && !isFoodBusiness && !isMedicalBusiness && !isSalesBusiness;

  let derivedPrimaryMode: BusinessMode = mode;
  if (isMedicalBusiness) derivedPrimaryMode = "medical";
  else if (isSalesBusiness) derivedPrimaryMode = "sales";
  else if (isDispatchBusiness) derivedPrimaryMode = "dispatch";
  else if (isFoodBusiness) derivedPrimaryMode = "food";
  else if (isServiceBusiness) derivedPrimaryMode = "service";
  else derivedPrimaryMode = "general";

  return {
    hasBooking,
    hasDispatchQueue,
    hasFoodOrders,
    hasMedicalIntake,
    hasSalesLeads,
    hasTestDrives,
    hasSalesInventory,
    isFoodBusiness,
    isDispatchBusiness,
    isMedicalBusiness,
    isSalesBusiness,
    isServiceBusiness,
    derivedPrimaryMode,
  };
}

// Inline deterministic routing logic (mirrors elevenlabs-webhook determineRoutingTarget)
type Intent = "order" | "reservation" | "booking" | "dispatch" | "callback" | "faq" | "other" | "test_drive" | "sales_lead";
type RoutingTarget = "food_orders" | "reservations" | "bookings" | "dispatch_jobs" | "test_drives" | "sales_leads" | null;

function determineRoutingTarget(intent: Intent, enabledModules: string[]): RoutingTarget {
  const has = (m: string) => enabledModules.includes(m);

  switch (intent) {
    case "order":
      return has("food_orders") ? "food_orders" : null;
    case "reservation":
      return has("reservations") ? "reservations" : has("booking") ? "bookings" : null;
    case "booking":
      return has("booking") ? "bookings" : null;
    case "dispatch":
      return has("dispatch_queue") ? "dispatch_jobs" : null;
    case "test_drive":
      return has("test_drives") ? "test_drives" : has("booking") ? "bookings" : null;
    case "sales_lead":
      return has("sales_leads") ? "sales_leads" : null;
    case "callback":
    case "faq":
    case "other":
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Sales Mode — Capability Resolution", () => {
  test("sales mode with no explicit modules uses correct defaults", () => {
    const caps = resolveCapabilities("sales", []);
    expect(caps.hasSalesLeads).toBe(true);
    expect(caps.hasTestDrives).toBe(false);
    expect(caps.hasBooking).toBe(true);
    expect(caps.isSalesBusiness).toBe(true);
    expect(caps.derivedPrimaryMode).toBe("sales");
  });

  test("sales mode with explicit modules resolves correctly", () => {
    const caps = resolveCapabilities("sales", ["sales_leads", "test_drives", "sales_inventory", "booking"]);
    expect(caps.hasSalesLeads).toBe(true);
    expect(caps.hasTestDrives).toBe(true);
    expect(caps.hasSalesInventory).toBe(true);
    expect(caps.hasBooking).toBe(true);
    expect(caps.isSalesBusiness).toBe(true);
    expect(caps.derivedPrimaryMode).toBe("sales");
  });

  test("service mode does not have isSalesBusiness", () => {
    const caps = resolveCapabilities("service", ["booking"]);
    expect(caps.isSalesBusiness).toBe(false);
    expect(caps.hasSalesLeads).toBe(false);
    expect(caps.hasTestDrives).toBe(false);
    expect(caps.isServiceBusiness).toBe(true);
    expect(caps.derivedPrimaryMode).toBe("service");
  });

  test("dispatch mode is unaffected by sales addition", () => {
    const caps = resolveCapabilities("dispatch", []);
    expect(caps.isDispatchBusiness).toBe(true);
    expect(caps.isSalesBusiness).toBe(false);
    expect(caps.derivedPrimaryMode).toBe("dispatch");
  });

  test("food mode is unaffected by sales addition", () => {
    const caps = resolveCapabilities("food", []);
    expect(caps.isFoodBusiness).toBe(true);
    expect(caps.isSalesBusiness).toBe(false);
    expect(caps.derivedPrimaryMode).toBe("food");
  });

  test("medical mode is unaffected by sales addition", () => {
    const caps = resolveCapabilities("medical", []);
    expect(caps.isMedicalBusiness).toBe(true);
    expect(caps.isSalesBusiness).toBe(false);
    expect(caps.derivedPrimaryMode).toBe("medical");
  });

  test("medical takes priority over sales in derivedPrimaryMode", () => {
    const caps = resolveCapabilities("medical", ["medical_intake", "sales_leads"]);
    expect(caps.isMedicalBusiness).toBe(true);
    expect(caps.isSalesBusiness).toBe(true);
    expect(caps.derivedPrimaryMode).toBe("medical");
  });

  test("sales takes priority over dispatch in derivedPrimaryMode", () => {
    const caps = resolveCapabilities("sales", ["sales_leads", "dispatch_queue"]);
    expect(caps.isSalesBusiness).toBe(true);
    expect(caps.isDispatchBusiness).toBe(true);
    expect(caps.derivedPrimaryMode).toBe("sales");
  });

  test("isServiceBusiness is false when isSalesBusiness is true", () => {
    const caps = resolveCapabilities("sales", ["sales_leads", "booking"]);
    expect(caps.isSalesBusiness).toBe(true);
    expect(caps.hasBooking).toBe(true);
    expect(caps.isServiceBusiness).toBe(false);
  });
});

describe("Sales Mode — Deterministic Routing", () => {
  test("test_drive intent routes to test_drives when module enabled", () => {
    const target = determineRoutingTarget("test_drive", ["test_drives", "sales_leads", "booking"]);
    expect(target).toBe("test_drives");
  });

  test("test_drive intent falls back to bookings when test_drives module not enabled", () => {
    const target = determineRoutingTarget("test_drive", ["booking", "sales_leads"]);
    expect(target).toBe("bookings");
  });

  test("test_drive intent returns null when neither test_drives nor booking enabled", () => {
    const target = determineRoutingTarget("test_drive", ["sales_leads"]);
    expect(target).toBeNull();
  });

  test("sales_lead intent routes to sales_leads when module enabled", () => {
    const target = determineRoutingTarget("sales_lead", ["sales_leads", "test_drives", "booking"]);
    expect(target).toBe("sales_leads");
  });

  test("sales_lead intent returns null when module not enabled", () => {
    const target = determineRoutingTarget("sales_lead", ["booking"]);
    expect(target).toBeNull();
  });
});

describe("Sales Mode — No Regression on Existing Modes", () => {
  test("booking intent still routes to bookings for service mode", () => {
    const target = determineRoutingTarget("booking", ["booking"]);
    expect(target).toBe("bookings");
  });

  test("dispatch intent still routes to dispatch_jobs for dispatch mode", () => {
    const target = determineRoutingTarget("dispatch", ["dispatch_queue"]);
    expect(target).toBe("dispatch_jobs");
  });

  test("order intent still routes to food_orders for food mode", () => {
    const target = determineRoutingTarget("order", ["food_orders", "menu_knowledge"]);
    expect(target).toBe("food_orders");
  });

  test("reservation intent still routes to reservations when enabled", () => {
    const target = determineRoutingTarget("reservation", ["reservations", "food_orders"]);
    expect(target).toBe("reservations");
  });

  test("reservation intent falls back to bookings when reservations not enabled", () => {
    const target = determineRoutingTarget("reservation", ["booking"]);
    expect(target).toBe("bookings");
  });

  test("callback intent returns null (no entity created)", () => {
    const target = determineRoutingTarget("callback", ["booking", "sales_leads"]);
    expect(target).toBeNull();
  });

  test("faq intent returns null (no entity created)", () => {
    const target = determineRoutingTarget("faq", ["booking", "sales_leads"]);
    expect(target).toBeNull();
  });
});

describe("Sales Mode — MODE_DEFAULTS", () => {
  test("sales mode defaults include expected modules", () => {
    const salesDefaults = MODE_DEFAULTS.sales;
    expect(salesDefaults).toContain("ai_voice");
    expect(salesDefaults).toContain("instant_text_back");
    expect(salesDefaults).toContain("sales_leads");
    expect(salesDefaults).not.toContain("test_drives");
    expect(salesDefaults).toContain("booking");
  });

  test("existing mode defaults are unchanged", () => {
    expect(MODE_DEFAULTS.service).toEqual(["ai_voice", "instant_text_back", "booking"]);
    expect(MODE_DEFAULTS.dispatch).toEqual(["ai_voice", "instant_text_back", "dispatch_queue"]);
    expect(MODE_DEFAULTS.food).toContain("food_orders");
    expect(MODE_DEFAULTS.medical).toContain("medical_intake");
    expect(MODE_DEFAULTS.general).toEqual(["ai_voice", "instant_text_back"]);
  });
});
