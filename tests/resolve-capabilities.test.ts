/**
 * resolveCapabilities Tests
 *
 * @vitest-environment node
 *
 * Tests the critical capability resolution function used by ALL edge functions
 * to determine what features a tenant has enabled. Zero test coverage prior
 * to this file.
 *
 * The function parses raw tenant data (mode, modules, capabilities_json)
 * and returns a Capabilities object used for prompt building and feature gating.
 */
import { describe, it, expect } from "vitest";

// Import the actual function (it's pure TypeScript, no Deno-specific imports)
// We need to handle the .ts extension import for Vitest
const { resolveCapabilities } = await import(
  "../supabase/functions/_shared/resolveCapabilities.ts"
);

describe("resolveCapabilities: mode defaults", () => {
  it("defaults to service mode when rawMode is null", () => {
    const caps = resolveCapabilities(null, null, null);
    expect(caps.derivedPrimaryMode).toBe("service");
    expect(caps.hasAiVoice).toBe(true);
    expect(caps.hasInstantTextBack).toBe(true);
    expect(caps.hasBooking).toBe(true);
  });

  it("defaults to service mode when rawMode is undefined", () => {
    const caps = resolveCapabilities(undefined, null, null);
    expect(caps.derivedPrimaryMode).toBe("service");
  });

  it("defaults to service mode when rawMode is invalid string", () => {
    const caps = resolveCapabilities("invalid_mode", null, null);
    expect(caps.derivedPrimaryMode).toBe("service");
  });

  it("service mode has booking capability by default", () => {
    const caps = resolveCapabilities("service", null, null);
    expect(caps.hasBooking).toBe(true);
    expect(caps.hasDispatchQueue).toBe(false);
    expect(caps.hasFoodOrders).toBe(false);
    expect(caps.hasMedicalIntake).toBe(false);
    expect(caps.hasSalesLeads).toBe(false);
    expect(caps.isServiceBusiness).toBe(true);
  });

  it("dispatch mode has dispatch_queue capability by default", () => {
    const caps = resolveCapabilities("dispatch", null, null);
    expect(caps.hasDispatchQueue).toBe(true);
    expect(caps.isDispatchBusiness).toBe(true);
    expect(caps.hasBooking).toBe(false);
  });

  it("food mode has food-specific capabilities by default", () => {
    const caps = resolveCapabilities("food", null, null);
    expect(caps.hasFoodOrders).toBe(true);
    expect(caps.hasMenuKnowledge).toBe(true);
    expect(caps.hasReservations).toBe(true);
    expect(caps.hasCatering).toBe(true);
    expect(caps.isFoodBusiness).toBe(true);
  });

  it("medical mode has medical_intake + booking by default", () => {
    const caps = resolveCapabilities("medical", null, null);
    expect(caps.hasMedicalIntake).toBe(true);
    expect(caps.hasBooking).toBe(true);
    expect(caps.isMedicalBusiness).toBe(true);
  });

  it("sales mode has sales_leads + booking by default", () => {
    const caps = resolveCapabilities("sales", null, null);
    expect(caps.hasSalesLeads).toBe(true);
    expect(caps.hasBooking).toBe(true);
    expect(caps.isSalesBusiness).toBe(true);
  });

  it("general mode has only ai_voice + instant_text_back by default", () => {
    const caps = resolveCapabilities("general", null, null);
    expect(caps.hasAiVoice).toBe(true);
    expect(caps.hasInstantTextBack).toBe(true);
    expect(caps.hasBooking).toBe(false);
    expect(caps.hasDispatchQueue).toBe(false);
    expect(caps.hasFoodOrders).toBe(false);
  });

  it("all modes have ai_voice and instant_text_back", () => {
    for (const mode of ["service", "dispatch", "food", "medical", "general", "sales"]) {
      const caps = resolveCapabilities(mode, null, null);
      expect(caps.hasAiVoice, `${mode} should have ai_voice`).toBe(true);
      expect(caps.hasInstantTextBack, `${mode} should have instant_text_back`).toBe(true);
    }
  });
});

describe("resolveCapabilities: enabled_modules parsing", () => {
  it("parses array of modules", () => {
    const caps = resolveCapabilities("service", ["booking", "estimates", "calendar_sync"], null);
    expect(caps.hasBooking).toBe(true);
    expect(caps.hasEstimates).toBe(true);
    expect(caps.hasCalendarSync).toBe(true);
    expect(caps.hasDispatchQueue).toBe(false);
  });

  it("parses JSON string of modules", () => {
    const caps = resolveCapabilities("service", '["booking", "dispatch_queue"]', null);
    expect(caps.hasBooking).toBe(true);
    expect(caps.hasDispatchQueue).toBe(true);
  });

  it("parses object keys (truthy values only)", () => {
    const caps = resolveCapabilities("service", { booking: true, estimates: true, dispatch_queue: false }, null);
    expect(caps.hasBooking).toBe(true);
    expect(caps.hasEstimates).toBe(true);
    expect(caps.hasDispatchQueue).toBe(false);
  });

  it("falls back to mode defaults when modules is null", () => {
    const caps = resolveCapabilities("food", null, null);
    expect(caps.hasFoodOrders).toBe(true);
    expect(caps.hasMenuKnowledge).toBe(true);
  });

  it("falls back to mode defaults when modules is empty array", () => {
    const caps = resolveCapabilities("dispatch", [], null);
    expect(caps.hasDispatchQueue).toBe(true);
  });

  it("handles invalid JSON string gracefully", () => {
    const caps = resolveCapabilities("service", "not valid json", null);
    // Should fall back to mode defaults
    expect(caps.hasBooking).toBe(true);
    expect(caps.hasAiVoice).toBe(true);
  });

  it("handles number input gracefully", () => {
    const caps = resolveCapabilities("service", 42 as any, null);
    // Should fall back to mode defaults
    expect(caps.hasBooking).toBe(true);
  });
});

describe("resolveCapabilities: capabilities_json parsing", () => {
  it("uses explicit capabilities_json when provided", () => {
    const caps = resolveCapabilities("service", null, {
      booking: true,
      dispatch_queue: true,
      food_orders: false,
    });
    expect(caps.hasBooking).toBe(true);
    expect(caps.hasDispatchQueue).toBe(true);
    expect(caps.hasFoodOrders).toBe(false);
  });

  it("parses capabilities_json from JSON string", () => {
    const caps = resolveCapabilities("service", null, '{"booking": true, "sales_leads": true}');
    expect(caps.hasBooking).toBe(true);
    expect(caps.hasSalesLeads).toBe(true);
  });

  it("capabilities_json overrides module defaults", () => {
    // Service mode default has booking=true, but caps_json says false
    const caps = resolveCapabilities("service", null, {
      booking: false,
      ai_voice: true,
    });
    expect(caps.hasBooking).toBe(false);
  });

  it("falls back to modules when capabilities_json key not present", () => {
    // booking not in caps_json, so should use module default
    const caps = resolveCapabilities("service", ["booking", "estimates"], {
      ai_voice: true,
    });
    expect(caps.hasBooking).toBe(true);
    expect(caps.hasEstimates).toBe(true);
    expect(caps.hasAiVoice).toBe(true);
  });

  it("handles invalid JSON string gracefully", () => {
    const caps = resolveCapabilities("service", null, "not valid json");
    // Should fall back to mode defaults
    expect(caps.hasBooking).toBe(true);
  });

  it("ignores array capabilities_json", () => {
    const caps = resolveCapabilities("service", null, ["booking"]);
    // Array should be ignored (not a Record<string, boolean>)
    expect(caps.hasBooking).toBe(true); // falls back to mode default
  });

  it("handles empty object", () => {
    // Empty object means hasExplicitCaps is false (0 keys)
    const caps = resolveCapabilities("service", null, {});
    expect(caps.hasBooking).toBe(true); // falls back to mode default
  });
});

describe("resolveCapabilities: derived business type flags", () => {
  it("isFoodBusiness when hasFoodOrders", () => {
    const caps = resolveCapabilities("food", null, null);
    expect(caps.isFoodBusiness).toBe(true);
    expect(caps.isServiceBusiness).toBe(false);
  });

  it("isFoodBusiness when hasMenuKnowledge only", () => {
    const caps = resolveCapabilities("service", ["menu_knowledge"], null);
    expect(caps.isFoodBusiness).toBe(true);
  });

  it("isFoodBusiness when hasReservations only", () => {
    const caps = resolveCapabilities("service", ["reservations"], null);
    expect(caps.isFoodBusiness).toBe(true);
  });

  it("isFoodBusiness when hasCatering only", () => {
    const caps = resolveCapabilities("service", ["catering"], null);
    expect(caps.isFoodBusiness).toBe(true);
  });

  it("isDispatchBusiness when hasDispatchQueue", () => {
    const caps = resolveCapabilities("dispatch", null, null);
    expect(caps.isDispatchBusiness).toBe(true);
  });

  it("isMedicalBusiness when hasMedicalIntake", () => {
    const caps = resolveCapabilities("medical", null, null);
    expect(caps.isMedicalBusiness).toBe(true);
  });

  it("isSalesBusiness when hasSalesLeads", () => {
    const caps = resolveCapabilities("sales", null, null);
    expect(caps.isSalesBusiness).toBe(true);
  });

  it("isSalesBusiness when hasTestDrives only", () => {
    const caps = resolveCapabilities("service", ["test_drives"], null);
    expect(caps.isSalesBusiness).toBe(true);
  });

  it("isSchedulingBusiness when hasBooking", () => {
    const caps = resolveCapabilities("service", null, null);
    expect(caps.isSchedulingBusiness).toBe(true);
  });

  it("isSchedulingBusiness when hasReservations", () => {
    const caps = resolveCapabilities("food", null, null);
    expect(caps.isSchedulingBusiness).toBe(true);
  });

  it("isServiceBusiness only when booking + not food/dispatch/medical/sales", () => {
    const caps = resolveCapabilities("service", null, null);
    expect(caps.isServiceBusiness).toBe(true);

    // Food with booking should NOT be isServiceBusiness
    const foodCaps = resolveCapabilities("food", ["booking", "food_orders"], null);
    expect(foodCaps.isServiceBusiness).toBe(false);
    expect(foodCaps.isFoodBusiness).toBe(true);
  });
});

describe("resolveCapabilities: derivedPrimaryMode from capabilities_json", () => {
  it("derives medical mode when hasMedicalIntake (highest priority)", () => {
    const caps = resolveCapabilities("service", null, {
      medical_intake: true,
      sales_leads: true,
      dispatch_queue: true,
      food_orders: true,
      booking: true,
    });
    expect(caps.derivedPrimaryMode).toBe("medical");
  });

  it("derives sales mode when hasSalesLeads (second priority)", () => {
    const caps = resolveCapabilities("service", null, {
      sales_leads: true,
      dispatch_queue: true,
      food_orders: true,
      booking: true,
    });
    expect(caps.derivedPrimaryMode).toBe("sales");
  });

  it("derives dispatch mode when hasDispatchQueue (third priority)", () => {
    const caps = resolveCapabilities("service", null, {
      dispatch_queue: true,
      food_orders: true,
      booking: true,
    });
    expect(caps.derivedPrimaryMode).toBe("dispatch");
  });

  it("derives food mode when hasFoodOrders (fourth priority)", () => {
    const caps = resolveCapabilities("service", null, {
      food_orders: true,
      booking: true,
    });
    expect(caps.derivedPrimaryMode).toBe("food");
  });

  it("derives service mode when only hasBooking", () => {
    const caps = resolveCapabilities("general", null, {
      booking: true,
    });
    expect(caps.derivedPrimaryMode).toBe("service");
  });

  it("derives service when capsJson has only ai_voice + text_back (booking from mode defaults)", () => {
    // When capsJson is provided but doesn't include "booking", the cap() function
    // falls through to modules (which come from MODE_DEFAULTS["service"] including "booking").
    // So hasBooking=true → isServiceBusiness=true → derivedPrimaryMode="service"
    const caps = resolveCapabilities("service", null, {
      ai_voice: true,
      instant_text_back: true,
    });
    expect(caps.derivedPrimaryMode).toBe("service");
    expect(caps.hasBooking).toBe(true); // from mode defaults fallback
  });

  it("derives general mode when capsJson explicitly disables booking", () => {
    const caps = resolveCapabilities("service", null, {
      ai_voice: true,
      instant_text_back: true,
      booking: false,
    });
    expect(caps.derivedPrimaryMode).toBe("general");
    expect(caps.hasBooking).toBe(false);
  });

  it("does NOT derive mode when capabilities_json is absent (uses rawMode)", () => {
    // Without capabilities_json, derivedPrimaryMode should match rawMode
    const caps = resolveCapabilities("dispatch", null, null);
    expect(caps.derivedPrimaryMode).toBe("dispatch");

    const caps2 = resolveCapabilities("food", null, null);
    expect(caps2.derivedPrimaryMode).toBe("food");
  });

  it("does NOT derive mode from empty capabilities_json (uses rawMode)", () => {
    const caps = resolveCapabilities("medical", null, {});
    expect(caps.derivedPrimaryMode).toBe("medical");
  });
});

describe("resolveCapabilities: real-world tenant scenarios", () => {
  it("HVAC company: service mode with emergency + estimates", () => {
    const caps = resolveCapabilities("service", ["ai_voice", "instant_text_back", "booking", "estimates"], null);
    expect(caps.hasBooking).toBe(true);
    expect(caps.hasEstimates).toBe(true);
    expect(caps.isServiceBusiness).toBe(true);
    expect(caps.derivedPrimaryMode).toBe("service");
  });

  it("Pizza restaurant: food mode with delivery", () => {
    const caps = resolveCapabilities("food", null, null);
    expect(caps.hasFoodOrders).toBe(true);
    expect(caps.hasMenuKnowledge).toBe(true);
    expect(caps.hasReservations).toBe(true);
    expect(caps.hasCatering).toBe(true);
    expect(caps.isFoodBusiness).toBe(true);
    expect(caps.derivedPrimaryMode).toBe("food");
  });

  it("Tow truck company: dispatch mode", () => {
    const caps = resolveCapabilities("dispatch", ["ai_voice", "instant_text_back", "dispatch_queue", "eta_tracking"], null);
    expect(caps.hasDispatchQueue).toBe(true);
    expect(caps.hasEtaTracking).toBe(true);
    expect(caps.isDispatchBusiness).toBe(true);
    expect(caps.derivedPrimaryMode).toBe("dispatch");
  });

  it("Dental clinic: medical mode with intake + scheduling", () => {
    const caps = resolveCapabilities("medical", null, null);
    expect(caps.hasMedicalIntake).toBe(true);
    expect(caps.hasBooking).toBe(true);
    expect(caps.isMedicalBusiness).toBe(true);
    expect(caps.isSchedulingBusiness).toBe(true);
  });

  it("Car dealership: sales mode with test drives + inventory", () => {
    const caps = resolveCapabilities("sales", ["ai_voice", "instant_text_back", "sales_leads", "test_drives", "sales_inventory", "booking"], null);
    expect(caps.hasSalesLeads).toBe(true);
    expect(caps.hasTestDrives).toBe(true);
    expect(caps.hasSalesInventory).toBe(true);
    expect(caps.hasBooking).toBe(true);
    expect(caps.isSalesBusiness).toBe(true);
  });

  it("Answering service: general mode, minimal capabilities", () => {
    const caps = resolveCapabilities("general", null, null);
    expect(caps.hasAiVoice).toBe(true);
    expect(caps.hasInstantTextBack).toBe(true);
    expect(caps.hasBooking).toBe(false);
    expect(caps.hasDispatchQueue).toBe(false);
    expect(caps.hasFoodOrders).toBe(false);
    expect(caps.hasMedicalIntake).toBe(false);
    expect(caps.hasSalesLeads).toBe(false);
  });

  it("New tenant with no data at all", () => {
    const caps = resolveCapabilities(null, null, null);
    // Should default to service mode safely
    expect(caps.derivedPrimaryMode).toBe("service");
    expect(caps.hasBooking).toBe(true);
    expect(caps.hasAiVoice).toBe(true);
  });
});
