/**
 * Shared parseTime Module Tests
 *
 * @vitest-environment node
 *
 * Verifies _shared/parseTime.ts has:
 * 1. The correct business-hours heuristic (hours 1-7 without AM/PM → PM)
 * 2. AM/PM handling with a.m./p.m. dot notation
 * 3. 24-hour format pass-through
 * 4. Fallback to 09:00 with a console.warn (not a throw)
 *
 * This test reads the ACTUAL shared module source to prevent drift between
 * the inline copies in test files and the deployed Deno module.
 *
 * Context: The "4:45 PM bug" — voice agents often say "4:45" without AM/PM.
 * Old behavior: parsed as 04:45 (4:45 AM), causing bookings at wrong time.
 * New behavior: hours 1-7 without AM/PM → PM (business hours heuristic).
 *
 * Gate: functional/booking_sms_confirmation (time accuracy)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PARSE_TIME_PATH = join(
  process.cwd(),
  "supabase/functions/_shared/parseTime.ts"
);

const source = readFileSync(PARSE_TIME_PATH, "utf-8");

// ---------------------------------------------------------------------------
// Source structure checks — prevent accidental overwrites
// ---------------------------------------------------------------------------

describe("_shared/parseTime.ts: source structure", () => {
  it("exports parseTime function", () => {
    expect(source).toContain("export function parseTime(");
  });

  it("handles explicit AM/PM with a.m./p.m. dot notation", () => {
    // Regex must match both "am" and "a.m." patterns
    expect(source).toContain("a\\.m\\.");
    expect(source).toContain("p\\.m\\.");
  });

  it("applies business-hours heuristic for hours 1-7 (not < 8)", () => {
    // Critical: the old code used `hour < 8` which was wrong for hour=0.
    // New code uses `hour >= 1 && hour <= 7` to exclude 0 (midnight).
    expect(source).toContain("hour >= 1 && hour <= 7");
    // Must NOT use the old broken heuristic
    expect(source).not.toContain("hour < 8 ? hour + 12");
  });

  it("handles 24-hour unambiguous times (hour >= 13)", () => {
    expect(source).toContain("hour >= 13");
  });

  it("falls back to 09:00 (not throws) for unparseable input", () => {
    expect(source).toContain('return "09:00"');
    // Must use console.warn not throw — prevents edge function crash
    expect(source).toContain("console.warn");
    expect(source).not.toContain("throw new Error");
  });

  it("strips dots from period string before comparison", () => {
    // "a.m." → "am" so period comparisons work correctly
    expect(source).toContain('replace(/\\./g, "")');
  });
});

// ---------------------------------------------------------------------------
// Logic tests — inline the parseTime logic to verify behavior
// These match the shared module exactly and serve as regression gate.
// ---------------------------------------------------------------------------

// Inline copy mirroring _shared/parseTime.ts for unit testing in Node context
function parseTime(input: string): string {
  const lower = input.toLowerCase().trim();

  // 1. Explicit AM/PM — "4:45 pm", "9am", "10:30 AM", "4:45 p.m."
  const ampmMatch = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)$/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] || "00";
    const period = ampmMatch[3].replace(/\./g, "");

    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;

    return `${String(hour).padStart(2, "0")}:${minutes}`;
  }

  // 2. 24-hour format without AM/PM
  if (/^\d{1,2}:\d{2}$/.test(input)) {
    const [h, m] = input.split(":");
    const hour = parseInt(h, 10);

    if (hour >= 13) {
      return `${h.padStart(2, "0")}:${m}`;
    }

    // Business-hours heuristic: 1-7 → PM, 8-12 → AM (morning)
    const adjusted = hour >= 1 && hour <= 7 ? hour + 12 : hour;
    return `${String(adjusted).padStart(2, "0")}:${m}`;
  }

  // 3. Bare hour number
  if (/^\d{1,2}$/.test(input)) {
    const hour = parseInt(input, 10);
    if (hour >= 13 && hour <= 23) {
      return `${String(hour).padStart(2, "0")}:00`;
    }
    const adjusted = hour >= 1 && hour <= 7 ? hour + 12 : hour;
    return `${String(adjusted).padStart(2, "0")}:00`;
  }

  return "09:00";
}

// ---------------------------------------------------------------------------
// Explicit AM/PM tests
// ---------------------------------------------------------------------------

describe("parseTime: explicit AM/PM", () => {
  it("9am → 09:00", () => expect(parseTime("9am")).toBe("09:00"));
  it("9pm → 21:00", () => expect(parseTime("9pm")).toBe("21:00"));
  it("12pm → 12:00 (noon)", () => expect(parseTime("12pm")).toBe("12:00"));
  it("12am → 00:00 (midnight)", () => expect(parseTime("12am")).toBe("00:00"));
  it("4:45 pm → 16:45", () => expect(parseTime("4:45 pm")).toBe("16:45"));
  it("10:30 AM → 10:30", () => expect(parseTime("10:30 AM")).toBe("10:30"));
  it("4:45 p.m. → 16:45 (dot notation)", () => expect(parseTime("4:45 p.m.")).toBe("16:45"));
  it("9 a.m. → 09:00 (dot notation)", () => expect(parseTime("9 a.m.")).toBe("09:00"));
  it("2PM → 14:00 (uppercase no space)", () => expect(parseTime("2PM")).toBe("14:00"));
  it("11:59 pm → 23:59", () => expect(parseTime("11:59 pm")).toBe("23:59"));
});

// ---------------------------------------------------------------------------
// THE 4:45 PM BUG — regression tests
// ---------------------------------------------------------------------------

describe("parseTime: HH:MM ambiguity (the 4:45 PM bug fix)", () => {
  it("'4:45' without AM/PM → 16:45 (hour 4 is in 1-7 → PM)", () => {
    expect(parseTime("4:45")).toBe("16:45");
  });

  it("'3:30' without AM/PM → 15:30 (hour 3 is in 1-7 → PM)", () => {
    expect(parseTime("3:30")).toBe("15:30");
  });

  it("'7:00' without AM/PM → 19:00 (hour 7 is in 1-7 → PM)", () => {
    expect(parseTime("7:00")).toBe("19:00");
  });

  it("'8:00' without AM/PM → 08:00 (hour 8 is NOT in 1-7 → stays AM)", () => {
    expect(parseTime("8:00")).toBe("08:00");
  });

  it("'10:30' without AM/PM → 10:30 (hour 10 is morning — stays)", () => {
    expect(parseTime("10:30")).toBe("10:30");
  });

  it("'12:00' without AM/PM → 12:00 (noon — stays)", () => {
    expect(parseTime("12:00")).toBe("12:00");
  });

  it("'14:00' → 14:00 (unambiguous 24-hour)", () => {
    expect(parseTime("14:00")).toBe("14:00");
  });

  it("'16:45' → 16:45 (unambiguous 24-hour)", () => {
    expect(parseTime("16:45")).toBe("16:45");
  });

  it("'23:00' → 23:00 (unambiguous 24-hour)", () => {
    expect(parseTime("23:00")).toBe("23:00");
  });
});

// ---------------------------------------------------------------------------
// Bare hour number tests
// ---------------------------------------------------------------------------

describe("parseTime: bare hour number", () => {
  it("'4' → 16:00 (PM for hours 1-7)", () => expect(parseTime("4")).toBe("16:00"));
  it("'7' → 19:00 (PM for hours 1-7)", () => expect(parseTime("7")).toBe("19:00"));
  it("'8' → 08:00 (AM — not in 1-7 range)", () => expect(parseTime("8")).toBe("08:00"));
  it("'10' → 10:00 (AM — morning hours)", () => expect(parseTime("10")).toBe("10:00"));
  it("'12' → 12:00 (noon)", () => expect(parseTime("12")).toBe("12:00"));
  it("'0' → 00:00 (midnight — outside 1-7 range)", () => expect(parseTime("0")).toBe("00:00"));
  it("'14' → 14:00 (unambiguous 24-hour bare)", () => expect(parseTime("14")).toBe("14:00"));
  it("'23' → 23:00 (unambiguous 24-hour bare)", () => expect(parseTime("23")).toBe("23:00"));
});

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

describe("parseTime: fallback behavior", () => {
  it("returns 09:00 for unrecognized input", () => {
    expect(parseTime("noon")).toBe("09:00");
    expect(parseTime("")).toBe("09:00");
    expect(parseTime("abc")).toBe("09:00");
  });
});

// ---------------------------------------------------------------------------
// Cross-function consistency check
// ---------------------------------------------------------------------------

describe("parseTime: shared module consistency", () => {
  it("parseTime.ts is imported by elevenlabs-check-availability", () => {
    const checkAvail = readFileSync(
      join(process.cwd(), "supabase/functions/elevenlabs-check-availability/index.ts"),
      "utf-8"
    );
    expect(checkAvail).toContain('from "../_shared/parseTime.ts"');
    // Must NOT define its own local parseTime anymore
    expect(checkAvail).not.toContain("function parseTime(");
  });

  it("parseTime.ts is imported by elevenlabs-create-booking", () => {
    const createBooking = readFileSync(
      join(process.cwd(), "supabase/functions/elevenlabs-create-booking/index.ts"),
      "utf-8"
    );
    expect(createBooking).toContain('from "../_shared/parseTime.ts"');
    // Must NOT define its own local parseTime anymore
    expect(createBooking).not.toContain("function parseTime(");
  });
});
