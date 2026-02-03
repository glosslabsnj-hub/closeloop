import { describe, it, expect } from "vitest";
import {
  hasVoiceFeature,
  hasSmsFeature,
  getPlanFamily,
  isEligibleForTwilioProvision,
  getLadderStep,
} from "@/config/pricing";

describe("SKU Feature Gating Helpers", () => {
  describe("hasVoiceFeature", () => {
    it("returns true for voice SKUs", () => {
      expect(hasVoiceFeature("voice-200")).toBe(true);
      expect(hasVoiceFeature("voice-600")).toBe(true);
      expect(hasVoiceFeature("voice-1500")).toBe(true);
    });

    it("returns true for legacy voice codes", () => {
      expect(hasVoiceFeature("voice")).toBe(true);
    });

    it("returns false for null/undefined", () => {
      expect(hasVoiceFeature(null)).toBe(false);
      expect(hasVoiceFeature(undefined)).toBe(false);
    });
  });

  describe("hasSmsFeature", () => {
    // SMS is disabled / coming soon - always returns false
    it("returns false for all SKUs (SMS coming soon)", () => {
      expect(hasSmsFeature("voice-200")).toBe(false);
      expect(hasSmsFeature("voice")).toBe(false);
      expect(hasSmsFeature(null)).toBe(false);
      expect(hasSmsFeature(undefined)).toBe(false);
    });
  });

  describe("getPlanFamily", () => {
    it("correctly identifies voice tier from SKUs", () => {
      expect(getPlanFamily("voice-200")).toBe("voice");
      expect(getPlanFamily("voice-600")).toBe("voice");
    });

    it("correctly identifies tier from legacy codes", () => {
      expect(getPlanFamily("voice")).toBe("voice");
    });

    it("returns unknown for null/undefined/unknown", () => {
      expect(getPlanFamily(null)).toBe("unknown");
      expect(getPlanFamily(undefined)).toBe("unknown");
      expect(getPlanFamily("foobar")).toBe("unknown");
    });
  });

  describe("isEligibleForTwilioProvision", () => {
    it("returns true for voice SKUs", () => {
      expect(isEligibleForTwilioProvision("voice-200")).toBe(true);
      expect(isEligibleForTwilioProvision("voice-600")).toBe(true);
    });
  });

  describe("getLadderStep returns correct included amounts", () => {
    it("includedMinutes for voice-200 is 200", () => {
      const step = getLadderStep("voice-200");
      expect(step?.includedMinutes).toBe(200);
    });

    it("includedMinutes for voice-600 is 600", () => {
      const step = getLadderStep("voice-600");
      expect(step?.includedMinutes).toBe(600);
    });

    it("includedMinutes for voice-1500 is 1500", () => {
      const step = getLadderStep("voice-1500");
      expect(step?.includedMinutes).toBe(1500);
    });
  });
});