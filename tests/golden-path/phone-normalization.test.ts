import { describe, it, expect } from "vitest";

/**
 * Phone normalization tests.
 *
 * These tests validate the canonical normalizePhoneE164() logic
 * defined in supabase/functions/_shared/phoneNormalize.ts.
 *
 * The function is copied here for testability since edge functions
 * use Deno imports that aren't compatible with the Node vitest runner.
 */

// Mirror of _shared/phoneNormalize.ts
function normalizePhoneE164(phone: string | undefined | null): string {
  if (!phone || typeof phone !== "string") return "";

  const withoutExtension = phone.replace(/\s*(x|ext\.?|extension)\s*\d+$/i, "");
  const hasPlus = withoutExtension.trim().startsWith("+");
  const digits = withoutExtension.replace(/\D/g, "");

  if (digits.length === 0) return "";
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (hasPlus) return `+${digits}`;
  if (digits.length >= 7) return `+${digits}`;

  return "";
}

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

describe("normalizePhoneE164", () => {
  describe("US numbers", () => {
    it("normalizes 10-digit US number", () => {
      expect(normalizePhoneE164("4155551234")).toBe("+14155551234");
    });

    it("normalizes 10-digit with formatting", () => {
      expect(normalizePhoneE164("(415) 555-1234")).toBe("+14155551234");
    });

    it("normalizes 10-digit with dots", () => {
      expect(normalizePhoneE164("415.555.1234")).toBe("+14155551234");
    });

    it("normalizes 11-digit starting with 1", () => {
      expect(normalizePhoneE164("14155551234")).toBe("+14155551234");
    });

    it("normalizes 11-digit with formatting", () => {
      expect(normalizePhoneE164("1-415-555-1234")).toBe("+14155551234");
    });

    it("preserves +1 prefix", () => {
      expect(normalizePhoneE164("+14155551234")).toBe("+14155551234");
    });

    it("handles +1 with formatting", () => {
      expect(normalizePhoneE164("+1 (415) 555-1234")).toBe("+14155551234");
    });
  });

  describe("international numbers", () => {
    it("preserves UK number with +44", () => {
      expect(normalizePhoneE164("+442071234567")).toBe("+442071234567");
    });

    it("preserves international with formatting", () => {
      expect(normalizePhoneE164("+44 20 7123 4567")).toBe("+442071234567");
    });

    it("handles Australian number", () => {
      expect(normalizePhoneE164("+61412345678")).toBe("+61412345678");
    });
  });

  describe("extensions", () => {
    it("strips x123 extension", () => {
      expect(normalizePhoneE164("4155551234 x123")).toBe("+14155551234");
    });

    it("strips ext. extension", () => {
      expect(normalizePhoneE164("4155551234 ext. 456")).toBe("+14155551234");
    });

    it("strips extension keyword", () => {
      expect(normalizePhoneE164("4155551234 extension 789")).toBe("+14155551234");
    });
  });

  describe("edge cases", () => {
    it("returns empty string for null", () => {
      expect(normalizePhoneE164(null)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(normalizePhoneE164(undefined)).toBe("");
    });

    it("returns empty string for empty string", () => {
      expect(normalizePhoneE164("")).toBe("");
    });

    it("returns empty string for non-string", () => {
      // @ts-expect-error testing runtime behavior
      expect(normalizePhoneE164(12345)).toBe("");
    });

    it("returns empty string for garbage input", () => {
      expect(normalizePhoneE164("hello world")).toBe("");
    });

    it("returns empty string for too few digits", () => {
      expect(normalizePhoneE164("123")).toBe("");
    });

    it("handles number with only spaces", () => {
      expect(normalizePhoneE164("   ")).toBe("");
    });
  });
});

describe("isValidE164", () => {
  it("validates correct E.164", () => {
    expect(isValidE164("+14155551234")).toBe(true);
  });

  it("rejects without +", () => {
    expect(isValidE164("14155551234")).toBe(false);
  });

  it("rejects starting with +0", () => {
    expect(isValidE164("+04155551234")).toBe(false);
  });

  it("rejects too short", () => {
    expect(isValidE164("+1234")).toBe(false);
  });

  it("rejects too long", () => {
    expect(isValidE164("+1234567890123456")).toBe(false);
  });
});
