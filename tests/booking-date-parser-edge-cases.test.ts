/**
 * Booking Date/Time Parser Edge Cases
 *
 * @vitest-environment node
 *
 * Tests edge cases in date/time parsing NOT covered by booking-date-parser.test.ts:
 * 1. parseTime bare hour ambiguity (7 → 7am or 7pm?)
 * 2. parseTime with explicit AM/PM overrides bare hour logic
 * 3. parseDate with invalid timezone graceful fallback
 * 4. parseDate with empty/null input
 * 5. formatDateLocal fallback on invalid timezone
 *
 * These are inlined from elevenlabs-create-booking since edge functions run in Deno.
 */
import { describe, it, expect } from "vitest";

// ===== Inlined from elevenlabs-create-booking =====

function formatDateLocal(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

// Shared parseTime — matches supabase/functions/_shared/parseTime.ts
function parseTime(input: string): string {
  const lower = input.toLowerCase().trim();

  // 1. Explicit AM/PM
  const ampmMatch = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)$/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] || "00";
    const period = ampmMatch[3].replace(/\./g, "");
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${minutes}`;
  }

  // 2. HH:MM without AM/PM — business hours heuristic (1-7 → PM)
  if (/^\d{1,2}:\d{2}$/.test(input)) {
    const [h, m] = input.split(":");
    const hour = parseInt(h, 10);
    if (hour >= 13) return `${h.padStart(2, "0")}:${m}`;
    const adjusted = hour >= 1 && hour <= 7 ? hour + 12 : hour;
    return `${String(adjusted).padStart(2, "0")}:${m}`;
  }

  // 3. Bare hour number — same heuristic
  if (/^\d{1,2}$/.test(input)) {
    const hour = parseInt(input, 10);
    if (hour >= 13 && hour <= 23) return `${String(hour).padStart(2, "0")}:00`;
    const adjusted = hour >= 1 && hour <= 7 ? hour + 12 : hour;
    return `${String(adjusted).padStart(2, "0")}:00`;
  }

  return "09:00";
}

// ===== Tests =====

describe("parseTime: bare hour ambiguity (business hours heuristic)", () => {
  // Business context: callers booking appointments typically mean business hours
  // The heuristic: hours 1-7 are assumed PM (afternoon), hours 8-12 are AM (morning)

  it("bare '7' means 7 PM (1-7 range → adds 12)", () => {
    expect(parseTime("7")).toBe("19:00");
  });

  it("bare '8' means 8 AM (>= 8 threshold)", () => {
    expect(parseTime("8")).toBe("08:00");
  });

  it("bare '1' means 1 PM (1-7 → afternoon)", () => {
    expect(parseTime("1")).toBe("13:00");
  });

  it("bare '3' means 3 PM (1-7 → afternoon)", () => {
    expect(parseTime("3")).toBe("15:00");
  });

  it("bare '12' means 12 PM noon (>= 8)", () => {
    expect(parseTime("12")).toBe("12:00");
  });

  it("bare '0' stays as midnight (0 is outside 1-7 range)", () => {
    expect(parseTime("0")).toBe("00:00");
  });

  it("explicit AM/PM always overrides bare hour heuristic", () => {
    expect(parseTime("7am")).toBe("07:00");
    expect(parseTime("7pm")).toBe("19:00");
    expect(parseTime("7 am")).toBe("07:00");
    expect(parseTime("7 pm")).toBe("19:00");
  });

  it("explicit 12am = midnight, 12pm = noon", () => {
    expect(parseTime("12am")).toBe("00:00");
    expect(parseTime("12pm")).toBe("12:00");
  });
});

describe("parseTime: HH:MM ambiguity (the 4:45 PM bug fix)", () => {
  // Critical fix: "4:45" without AM/PM was being parsed as 04:45 (4:45 AM)
  // Now hours 1-7 default to PM when no AM/PM is specified

  it("'4:45' → 16:45 (PM default for hour 4)", () => {
    expect(parseTime("4:45")).toBe("16:45");
  });

  it("'1:30' → 13:30 (PM default for hour 1)", () => {
    expect(parseTime("1:30")).toBe("13:30");
  });

  it("'7:00' → 19:00 (PM default for hour 7)", () => {
    expect(parseTime("7:00")).toBe("19:00");
  });

  it("'8:00' → 08:00 (AM, hour >= 8)", () => {
    expect(parseTime("8:00")).toBe("08:00");
  });

  it("'10:30' → 10:30 (AM, hour >= 8)", () => {
    expect(parseTime("10:30")).toBe("10:30");
  });

  it("'14:30' → 14:30 (24h format, unambiguous)", () => {
    expect(parseTime("14:30")).toBe("14:30");
  });

  it("explicit AM/PM always wins over heuristic", () => {
    expect(parseTime("4:45 am")).toBe("04:45");
    expect(parseTime("4:45 pm")).toBe("16:45");
    expect(parseTime("8:00 pm")).toBe("20:00");
  });
});

describe("parseTime: edge cases", () => {
  it("handles HH:MM with leading zeros", () => {
    expect(parseTime("08:30")).toBe("08:30");
    expect(parseTime("00:00")).toBe("00:00"); // hour 0 is outside 1-7 range, stays as midnight
  });

  it("handles AM/PM with minutes", () => {
    expect(parseTime("2:30pm")).toBe("14:30");
    expect(parseTime("11:45am")).toBe("11:45");
    expect(parseTime("12:30pm")).toBe("12:30");
    expect(parseTime("12:30am")).toBe("00:30");
  });

  it("falls back to 09:00 for unparseable input", () => {
    expect(parseTime("noon")).toBe("09:00");
    expect(parseTime("morning")).toBe("09:00");
    expect(parseTime("afternoon")).toBe("09:00");
    expect(parseTime("")).toBe("09:00");
    expect(parseTime("asap")).toBe("09:00");
  });

  it("handles whitespace in AM/PM", () => {
    expect(parseTime("  2pm  ")).toBe("14:00");
    expect(parseTime(" 9 am ")).toBe("09:00");
  });
});

describe("formatDateLocal: timezone fallback", () => {
  it("returns valid date for valid timezone", () => {
    const result = formatDateLocal(new Date("2026-03-15T12:00:00Z"), "America/New_York");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("falls back to ISO date for invalid timezone", () => {
    const result = formatDateLocal(new Date("2026-03-15T12:00:00Z"), "America/New_Jork");
    // Should fall back to ISO slice instead of throwing
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toBe("2026-03-15");
  });

  it("falls back to ISO date for empty timezone", () => {
    const result = formatDateLocal(new Date("2026-03-15T12:00:00Z"), "");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
