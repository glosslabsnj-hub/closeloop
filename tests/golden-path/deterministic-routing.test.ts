import { describe, it, expect } from "vitest";

/**
 * Deterministic routing tests.
 *
 * Validates that intent × enabled_modules produces correct routing targets.
 * This mirrors the determineRoutingTarget() logic from elevenlabs-webhook.
 *
 * RULE: Never create entities for disabled modules.
 */

type Intent = "order" | "reservation" | "booking" | "dispatch" | "callback" | "faq" | "other";
type RoutingTarget = "food_orders" | "reservations" | "bookings" | "dispatch_jobs" | null;

/**
 * Mirror of determineRoutingTarget() from elevenlabs-webhook.
 * Given an intent and the tenant's enabled modules, returns the entity table
 * that should be written to, or null if no entity should be created.
 */
function determineRoutingTarget(
  intent: Intent,
  enabledModules: string[],
  hasItems: boolean = false,
  hasPartySize: boolean = false,
): RoutingTarget {
  switch (intent) {
    case "order":
      if (enabledModules.includes("food_orders") && hasItems) return "food_orders";
      return null;

    case "reservation":
      if (enabledModules.includes("reservations")) return "reservations";
      // Fallback: reservations can fall back to bookings
      if (enabledModules.includes("booking")) return "bookings";
      return null;

    case "booking":
      if (enabledModules.includes("booking")) return "bookings";
      return null;

    case "dispatch":
      if (enabledModules.includes("dispatch_queue")) return "dispatch_jobs";
      return null;

    case "callback":
    case "faq":
    case "other":
      return null;

    default:
      return null;
  }
}

// Default modules per business mode
const MODE_DEFAULTS: Record<string, string[]> = {
  service: ["ai_voice", "instant_text_back", "booking"],
  dispatch: ["ai_voice", "instant_text_back", "dispatch_queue"],
  food: ["ai_voice", "instant_text_back", "food_orders", "menu_knowledge", "reservations"],
  medical: ["ai_voice", "instant_text_back", "booking", "medical_intake"],
  general: ["ai_voice", "instant_text_back"],
};

describe("determineRoutingTarget", () => {
  describe("service mode (booking enabled)", () => {
    const modules = MODE_DEFAULTS.service;

    it("routes booking intent → bookings", () => {
      expect(determineRoutingTarget("booking", modules)).toBe("bookings");
    });

    it("routes reservation intent → bookings (fallback)", () => {
      expect(determineRoutingTarget("reservation", modules)).toBe("bookings");
    });

    it("does NOT route order intent (food_orders disabled)", () => {
      expect(determineRoutingTarget("order", modules, true)).toBeNull();
    });

    it("does NOT route dispatch intent (dispatch_queue disabled)", () => {
      expect(determineRoutingTarget("dispatch", modules)).toBeNull();
    });

    it("callback creates no entity", () => {
      expect(determineRoutingTarget("callback", modules)).toBeNull();
    });

    it("faq creates no entity", () => {
      expect(determineRoutingTarget("faq", modules)).toBeNull();
    });

    it("other creates no entity", () => {
      expect(determineRoutingTarget("other", modules)).toBeNull();
    });
  });

  describe("dispatch mode (dispatch_queue enabled)", () => {
    const modules = MODE_DEFAULTS.dispatch;

    it("routes dispatch intent → dispatch_jobs", () => {
      expect(determineRoutingTarget("dispatch", modules)).toBe("dispatch_jobs");
    });

    it("does NOT route booking intent (booking disabled)", () => {
      expect(determineRoutingTarget("booking", modules)).toBeNull();
    });

    it("does NOT route order intent (food_orders disabled)", () => {
      expect(determineRoutingTarget("order", modules, true)).toBeNull();
    });
  });

  describe("food mode (food_orders + reservations enabled)", () => {
    const modules = MODE_DEFAULTS.food;

    it("routes order intent → food_orders (with items)", () => {
      expect(determineRoutingTarget("order", modules, true)).toBe("food_orders");
    });

    it("does NOT route order intent without items", () => {
      expect(determineRoutingTarget("order", modules, false)).toBeNull();
    });

    it("routes reservation intent → reservations", () => {
      expect(determineRoutingTarget("reservation", modules)).toBe("reservations");
    });

    it("does NOT route booking intent (booking disabled)", () => {
      expect(determineRoutingTarget("booking", modules)).toBeNull();
    });

    it("does NOT route dispatch intent (dispatch_queue disabled)", () => {
      expect(determineRoutingTarget("dispatch", modules)).toBeNull();
    });
  });

  describe("medical mode (booking enabled)", () => {
    const modules = MODE_DEFAULTS.medical;

    it("routes booking intent → bookings", () => {
      expect(determineRoutingTarget("booking", modules)).toBe("bookings");
    });

    it("does NOT route dispatch intent", () => {
      expect(determineRoutingTarget("dispatch", modules)).toBeNull();
    });
  });

  describe("general mode (no entity modules)", () => {
    const modules = MODE_DEFAULTS.general;

    it("does NOT route any entity intents", () => {
      expect(determineRoutingTarget("booking", modules)).toBeNull();
      expect(determineRoutingTarget("dispatch", modules)).toBeNull();
      expect(determineRoutingTarget("order", modules, true)).toBeNull();
      expect(determineRoutingTarget("reservation", modules)).toBeNull();
    });

    it("callback/faq/other always null", () => {
      expect(determineRoutingTarget("callback", modules)).toBeNull();
      expect(determineRoutingTarget("faq", modules)).toBeNull();
      expect(determineRoutingTarget("other", modules)).toBeNull();
    });
  });

  describe("module gating rule", () => {
    it("never creates entities for disabled modules", () => {
      const allIntents: Intent[] = ["order", "reservation", "booking", "dispatch", "callback", "faq", "other"];
      const emptyModules: string[] = [];

      for (const intent of allIntents) {
        expect(determineRoutingTarget(intent, emptyModules, true, true)).toBeNull();
      }
    });

    it("custom module combination works", () => {
      // A tenant with both booking and dispatch enabled
      const modules = ["ai_voice", "booking", "dispatch_queue"];
      expect(determineRoutingTarget("booking", modules)).toBe("bookings");
      expect(determineRoutingTarget("dispatch", modules)).toBe("dispatch_jobs");
      expect(determineRoutingTarget("order", modules, true)).toBeNull();
    });
  });
});
