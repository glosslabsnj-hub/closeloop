/**
 * Tests for check-availability business hours comparison logic.
 * Ensures numeric comparison is robust to non-padded time formats.
 */
import { describe, it, expect } from "vitest";

// Mirror the timeToMinutes helper from check-availability edge functions
function timeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || "00:00").split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

// Mirror the addMinutesToTimeStr helper
function addMinutesToTimeStr(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Business hours check using numeric comparison (matches edge function logic)
function isWithinBusinessHours(
  requestedTime: string,
  durationMinutes: number,
  bufferMinutes: number,
  openTime: string,
  closeTime: string
): boolean {
  const openMin = timeToMinutes(openTime);
  const closeMin = timeToMinutes(closeTime);
  const requestedMin = timeToMinutes(requestedTime);
  const requestedEndMin = requestedMin + durationMinutes + bufferMinutes;
  return requestedMin >= openMin && requestedEndMin <= closeMin;
}

describe("timeToMinutes", () => {
  it("parses zero-padded HH:MM", () => {
    expect(timeToMinutes("09:00")).toBe(540);
    expect(timeToMinutes("17:00")).toBe(1020);
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("parses non-padded H:MM (critical regression)", () => {
    expect(timeToMinutes("9:00")).toBe(540);
    expect(timeToMinutes("8:30")).toBe(510);
    expect(timeToMinutes("1:00")).toBe(60);
  });

  it("handles edge cases", () => {
    expect(timeToMinutes("")).toBe(0);
    expect(timeToMinutes("12:00")).toBe(720);
    expect(timeToMinutes("14:30")).toBe(870);
  });
});

describe("isWithinBusinessHours — numeric comparison", () => {
  const DURATION = 60;
  const BUFFER = 15;

  it("accepts 2pm within 9am-5pm hours", () => {
    expect(isWithinBusinessHours("14:00", DURATION, BUFFER, "09:00", "17:00")).toBe(true);
  });

  it("accepts 9am at opening", () => {
    expect(isWithinBusinessHours("09:00", DURATION, BUFFER, "09:00", "17:00")).toBe(true);
  });

  it("rejects 8am before opening", () => {
    expect(isWithinBusinessHours("08:00", DURATION, BUFFER, "09:00", "17:00")).toBe(false);
  });

  it("rejects 4:30pm when duration+buffer exceeds closing", () => {
    // 16:30 + 60 + 15 = 17:45 > 17:00
    expect(isWithinBusinessHours("16:30", DURATION, BUFFER, "09:00", "17:00")).toBe(false);
  });

  it("accepts last valid slot", () => {
    // 15:45 + 60 + 15 = 17:00 <= 17:00
    expect(isWithinBusinessHours("15:45", DURATION, BUFFER, "09:00", "17:00")).toBe(true);
  });

  it("works with non-padded open time (the actual bug)", () => {
    // Before fix: "14:00" < "9:00" → true (string) → WRONGLY REJECTED
    // After fix: 840 < 540 → false → CORRECTLY ACCEPTED
    expect(isWithinBusinessHours("14:00", DURATION, BUFFER, "9:00", "17:00")).toBe(true);
  });

  it("works with non-padded close time", () => {
    expect(isWithinBusinessHours("14:00", DURATION, BUFFER, "09:00", "5:00")).toBe(false);
    // 5:00 = 300 minutes, 14:00 + 75 = 15:15 = 915 > 300
  });

  it("handles 24/7 hours", () => {
    expect(isWithinBusinessHours("03:00", DURATION, BUFFER, "00:00", "23:59")).toBe(true);
    expect(isWithinBusinessHours("22:00", DURATION, BUFFER, "00:00", "23:59")).toBe(true);
  });

  it("handles restaurant late hours", () => {
    expect(isWithinBusinessHours("20:00", DURATION, BUFFER, "11:00", "23:00")).toBe(true);
    expect(isWithinBusinessHours("22:30", DURATION, BUFFER, "11:00", "23:00")).toBe(false);
    // 22:30 + 75 = 23:45 > 23:00
  });
});

describe("addMinutesToTimeStr", () => {
  it("adds minutes correctly", () => {
    expect(addMinutesToTimeStr("14:00", 75)).toBe("15:15");
    expect(addMinutesToTimeStr("23:00", 120)).toBe("01:00"); // wraps
    expect(addMinutesToTimeStr("09:00", 60)).toBe("10:00");
  });
});

describe("string comparison regression — why numeric fix was needed", () => {
  it("string comparison fails with non-padded times", () => {
    // This demonstrates the bug that was in production
    // String comparison: "14:00" < "9:00" → true (because "1" < "9")
    expect("14:00" < "9:00").toBe(true); // WRONG! 2pm is not before 9am!

    // Numeric comparison: 840 < 540 → false (correct)
    expect(timeToMinutes("14:00") < timeToMinutes("9:00")).toBe(false);
  });

  it("string comparison fails for all double-digit hours vs single-digit", () => {
    // ALL times 10:xx through 19:xx would be "before" 9:00 in string comparison
    expect("10:00" < "9:00").toBe(true); // WRONG
    expect("11:00" < "9:00").toBe(true); // WRONG
    expect("15:00" < "9:00").toBe(true); // WRONG

    // Numeric comparison gets it right
    expect(timeToMinutes("10:00") < timeToMinutes("9:00")).toBe(false);
    expect(timeToMinutes("11:00") < timeToMinutes("9:00")).toBe(false);
    expect(timeToMinutes("15:00") < timeToMinutes("9:00")).toBe(false);
  });
});
