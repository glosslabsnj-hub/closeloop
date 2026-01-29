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
    it("returns true for new voice SKUs", () => {
      expect(hasVoiceFeature("voice-200")).toBe(true);
      expect(hasVoiceFeature("voice-600")).toBe(true);
      expect(hasVoiceFeature("voice-1500")).toBe(true);
    });

    it("returns true for new both SKUs", () => {
      expect(hasVoiceFeature("both-200-500")).toBe(true);
      expect(hasVoiceFeature("both-600-1500")).toBe(true);
      expect(hasVoiceFeature("both-1500-3500")).toBe(true);
    });

    it("returns true for legacy voice/both codes", () => {
      expect(hasVoiceFeature("voice")).toBe(true);
      expect(hasVoiceFeature("both")).toBe(true);
    });

    it("returns false for SMS-only SKUs", () => {
      expect(hasVoiceFeature("sms-500")).toBe(false);
      expect(hasVoiceFeature("sms-1500")).toBe(false);
      expect(hasVoiceFeature("text")).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(hasVoiceFeature(null)).toBe(false);
      expect(hasVoiceFeature(undefined)).toBe(false);
    });
  });

  describe("hasSmsFeature", () => {
    it("returns true for new SMS SKUs", () => {
      expect(hasSmsFeature("sms-500")).toBe(true);
      expect(hasSmsFeature("sms-1500")).toBe(true);
      expect(hasSmsFeature("sms-3500")).toBe(true);
    });

    it("returns true for new both SKUs", () => {
      expect(hasSmsFeature("both-200-500")).toBe(true);
      expect(hasSmsFeature("both-600-1500")).toBe(true);
    });

    it("returns true for legacy text code", () => {
      expect(hasSmsFeature("text")).toBe(true);
      expect(hasSmsFeature("both")).toBe(true);
    });

    it("returns false for voice-only SKUs", () => {
      expect(hasSmsFeature("voice-200")).toBe(false);
      expect(hasSmsFeature("voice")).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(hasSmsFeature(null)).toBe(false);
      expect(hasSmsFeature(undefined)).toBe(false);
    });
  });

  describe("getPlanFamily", () => {
    it("correctly identifies tier from new SKUs", () => {
      expect(getPlanFamily("voice-200")).toBe("voice");
      expect(getPlanFamily("sms-500")).toBe("sms");
      expect(getPlanFamily("both-200-500")).toBe("both");
    });

    it("correctly identifies tier from legacy codes", () => {
      expect(getPlanFamily("voice")).toBe("voice");
      expect(getPlanFamily("text")).toBe("sms");
      expect(getPlanFamily("both")).toBe("both");
    });

    it("returns unknown for null/undefined/unknown", () => {
      expect(getPlanFamily(null)).toBe("unknown");
      expect(getPlanFamily(undefined)).toBe("unknown");
      expect(getPlanFamily("foobar")).toBe("unknown");
    });
  });

  describe("isEligibleForTwilioProvision", () => {
    it("is an alias for hasVoiceFeature", () => {
      expect(isEligibleForTwilioProvision("voice-200")).toBe(true);
      expect(isEligibleForTwilioProvision("both-200-500")).toBe(true);
      expect(isEligibleForTwilioProvision("sms-500")).toBe(false);
    });
  });

  describe("getLadderStep returns correct included amounts", () => {
    it("includedMinutes for voice-200 is 200", () => {
      const step = getLadderStep("voice-200");
      expect(step?.includedMinutes).toBe(200);
    });

    it("includedSegments for sms-1500 is 1500", () => {
      const step = getLadderStep("sms-1500");
      expect(step?.includedSmsSegments).toBe(1500);
    });

    it("both-200-500 has 200 minutes and 500 segments", () => {
      const step = getLadderStep("both-200-500");
      expect(step?.includedMinutes).toBe(200);
      expect(step?.includedSmsSegments).toBe(500);
    });
  });
});
