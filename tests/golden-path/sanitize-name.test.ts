import { describe, it, expect } from "vitest";

/**
 * Customer name sanitization tests.
 *
 * Mirrors _shared/sanitizeName.ts logic to validate placeholder detection
 * and the fix allowing short (1-2 char) alphabetic names.
 */

const PLACEHOLDER_PATTERNS = [
  /^unknown$/i,
  /^not provided$/i,
  /^not specified$/i,
  /^n\/a$/i,
  /^na$/i,
  /^none$/i,
  /^caller$/i,
  /^customer$/i,
  /^anonymous$/i,
  /^guest$/i,
  /^user$/i,
  /^phone customer$/i,
  /^no name$/i,
  /^-$/,
  /^\?+$/,
  /^\.+$/,
];

function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (trimmed.length === 0) return true;

  // Check placeholder patterns first (catches "na", "NA" which are 2-char but placeholders)
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;

  // Allow short (1-2 char) names if purely alphabetic
  if (trimmed.length <= 2) {
    return !/^[a-zA-Z]+$/.test(trimmed);
  }

  return false;
}

function sanitizeCustomerName(name: string | null | undefined): string {
  if (isPlaceholderName(name)) return "Unknown";
  return name!.trim();
}

function shouldUpdateCustomerName(
  existingName: string | null | undefined,
  newName: string | null | undefined,
): boolean {
  if (isPlaceholderName(newName)) return false;
  return isPlaceholderName(existingName);
}

describe("isPlaceholderName", () => {
  describe("detects placeholders", () => {
    it.each([
      "unknown",
      "Unknown",
      "UNKNOWN",
      "not provided",
      "Not Provided",
      "not specified",
      "n/a",
      "N/A",
      "na",
      "NA",
      "none",
      "caller",
      "customer",
      "anonymous",
      "guest",
      "user",
      "phone customer",
      "no name",
      "-",
      "?",
      "???",
      "...",
    ])("detects '%s' as placeholder", (name) => {
      expect(isPlaceholderName(name)).toBe(true);
    });
  });

  describe("accepts valid names", () => {
    it.each([
      "John",
      "Sarah Smith",
      "Li",
      "Jo",
      "Al",
      "Mr. Johnson",
      "María",
      "Jean-Pierre",
      "O'Brien",
    ])("accepts '%s' as valid", (name) => {
      expect(isPlaceholderName(name)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("rejects null", () => {
      expect(isPlaceholderName(null)).toBe(true);
    });

    it("rejects undefined", () => {
      expect(isPlaceholderName(undefined)).toBe(true);
    });

    it("rejects empty string", () => {
      expect(isPlaceholderName("")).toBe(true);
    });

    it("rejects whitespace only", () => {
      expect(isPlaceholderName("   ")).toBe(true);
    });

    it("rejects single digit", () => {
      expect(isPlaceholderName("5")).toBe(true);
    });

    it("rejects single punctuation", () => {
      expect(isPlaceholderName("!")).toBe(true);
    });

    it("accepts single letter", () => {
      expect(isPlaceholderName("J")).toBe(false);
    });

    it("accepts two letters", () => {
      expect(isPlaceholderName("Li")).toBe(false);
    });
  });
});

describe("sanitizeCustomerName", () => {
  it("returns 'Unknown' for placeholders", () => {
    expect(sanitizeCustomerName("unknown")).toBe("Unknown");
    expect(sanitizeCustomerName(null)).toBe("Unknown");
    expect(sanitizeCustomerName("")).toBe("Unknown");
  });

  it("returns trimmed name for valid names", () => {
    expect(sanitizeCustomerName("  John Smith  ")).toBe("John Smith");
  });
});

describe("shouldUpdateCustomerName", () => {
  it("updates placeholder with valid name", () => {
    expect(shouldUpdateCustomerName("Unknown", "John")).toBe(true);
  });

  it("does NOT update valid name with another valid name", () => {
    expect(shouldUpdateCustomerName("John", "Jane")).toBe(false);
  });

  it("does NOT update with placeholder", () => {
    expect(shouldUpdateCustomerName("Unknown", "unknown")).toBe(false);
  });

  it("does NOT update with null", () => {
    expect(shouldUpdateCustomerName("John", null)).toBe(false);
  });
});
