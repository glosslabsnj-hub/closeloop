/**
 * Regression tests for reschedule-booking date parsing bugs (commit 3db84fa)
 *
 * @vitest-environment node
 *
 * BUG 1: "Wednesday March 11" was falling through all parseDate patterns
 * and defaulting to today (Sunday March 8). The weekdayMonthDay pattern
 * ("weekday month day") was added to fix this.
 *
 * BUG 2: reschedule_booking was not validating against tenant business hours.
 * A customer could reschedule to Sunday even if the business is closed on Sundays.
 * Fixed by adding isOpenDay check + nextOpenDay suggestion.
 *
 * Gates: functional/reschedule_booking_works
 */
import { describe, it, expect } from "vitest";

// ===== Inlined from supabase/functions/elevenlabs-reschedule-booking/index.ts =====
// These must stay in sync with the edge function's actual implementation.

const MONTH_NAMES: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
  november: 10, nov: 10, december: 11, dec: 11,
};

const DAY_NAMES: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};

const DAY_LABELS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function nextWeekday(targetDay: number): Date {
  const now = new Date();
  const result = new Date(now);
  result.setDate(now.getDate() + 1);
  while (result.getDay() !== targetDay) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

function formatDate(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function parseDate(input: string, timezone: string): string {
  const now = new Date();
  const lower = input.toLowerCase().trim();

  if (!input || lower === "today" || lower === "now") {
    return formatDate(now, timezone);
  }
  if (lower === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return formatDate(d, timezone);
  }

  // ISO date: 2026-03-05
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  // MM/DD/YYYY or M/D/YYYY
  const slashDate = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const [, m, d, y] = slashDate;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // MM/DD or M/D (assume current/next year)
  const slashShort = input.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashShort) {
    const [, m, d] = slashShort;
    const year = now.getFullYear();
    const candidate = new Date(Date.UTC(year, parseInt(m) - 1, parseInt(d), 12, 0, 0));
    if (candidate < now) candidate.setUTCFullYear(year + 1);
    return formatDate(candidate, timezone);
  }

  // "Wednesday March 11" / "Tuesday June 5th" — weekday prefix then month + day
  const weekdayMonthDay = lower.match(/^[a-z]+\s+([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/);
  if (weekdayMonthDay) {
    const monthIndex = MONTH_NAMES[weekdayMonthDay[1]];
    if (monthIndex !== undefined) {
      const year = now.getFullYear();
      const candidate = new Date(Date.UTC(year, monthIndex, parseInt(weekdayMonthDay[2]), 12, 0, 0));
      if (candidate < now) candidate.setUTCFullYear(year + 1);
      return formatDate(candidate, timezone);
    }
  }

  // "March 5" / "March 5th" / "5th of March"
  const monthDay = lower.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/) ||
                   lower.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]+)$/);
  if (monthDay) {
    let monthStr: string, dayStr: string;
    if (/^[a-z]/.test(monthDay[1])) {
      [, monthStr, dayStr] = monthDay;
    } else {
      [, dayStr, monthStr] = monthDay;
    }
    const monthIndex = MONTH_NAMES[monthStr];
    if (monthIndex !== undefined) {
      const year = now.getFullYear();
      const candidate = new Date(Date.UTC(year, monthIndex, parseInt(dayStr), 12, 0, 0));
      if (candidate < now) candidate.setUTCFullYear(year + 1);
      return formatDate(candidate, timezone);
    }
  }

  // "next Monday" / "this Friday" / just "friday"
  const dayMatch = lower.match(/^(?:next\s+|this\s+)?([a-z]+)$/);
  if (dayMatch) {
    const dayIndex = DAY_NAMES[dayMatch[1]];
    if (dayIndex !== undefined) {
      return formatDate(nextWeekday(dayIndex), timezone);
    }
  }

  return formatDate(now, timezone);
}

function getDayLabel(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return DAY_LABELS[new Date(Date.UTC(y, mo - 1, d, 12, 0, 0)).getUTCDay()];
}

function isOpenDay(dateStr: string, hoursJson: Record<string, unknown> | null | undefined): boolean {
  if (!hoursJson) return true;
  const dayLabel = getDayLabel(dateStr);
  const dayHours = hoursJson[dayLabel] as { open?: string; close?: string; closed?: boolean } | undefined;
  if (!dayHours) return false;
  if (dayHours.closed === true) return false;
  return !!(dayHours.open && dayHours.close);
}

function nextOpenDay(fromDateStr: string, hoursJson: Record<string, unknown> | null | undefined): string | null {
  const [y, mo, d] = fromDateStr.split("-").map(Number);
  const base = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  for (let i = 1; i <= 7; i++) {
    const next = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
    const iso = next.toISOString().slice(0, 10);
    if (isOpenDay(iso, hoursJson)) return iso;
  }
  return null;
}

// ===== Test helpers =====

const TZ = "America/New_York";

// Pool service: Mon-Sat open, Sunday closed
const POOL_HOURS: Record<string, unknown> = {
  monday:    { open: "08:00", close: "17:00" },
  tuesday:   { open: "08:00", close: "17:00" },
  wednesday: { open: "08:00", close: "17:00" },
  thursday:  { open: "08:00", close: "17:00" },
  friday:    { open: "08:00", close: "17:00" },
  saturday:  { open: "08:00", close: "14:00" },
  sunday:    { closed: true },
};

// Standard M-F hours
const WEEKDAY_HOURS: Record<string, unknown> = {
  monday:    { open: "09:00", close: "17:00" },
  tuesday:   { open: "09:00", close: "17:00" },
  wednesday: { open: "09:00", close: "17:00" },
  thursday:  { open: "09:00", close: "17:00" },
  friday:    { open: "09:00", close: "17:00" },
  saturday:  { closed: true },
  sunday:    { closed: true },
};

// ===== BUG 1: "weekday month day" format regression =====

describe("parseDate: weekday + month + day format (BUG 3db84fa)", () => {
  // THE ACTUAL BUG: Before the fix, "Wednesday March 11" fell through all
  // patterns and returned today (2026-03-08, a Sunday). After the fix,
  // it correctly returns 2026-03-11 (Wednesday).

  it("parses 'Wednesday March 11' to March 11", () => {
    const result = parseDate("Wednesday March 11", TZ);
    expect(result).toMatch(/-03-11$/);
  });

  it("parses 'Tuesday June 5th' to June 5", () => {
    const result = parseDate("Tuesday June 5th", TZ);
    expect(result).toMatch(/-06-05$/);
  });

  it("parses 'Monday January 20' to January 20", () => {
    const result = parseDate("Monday January 20", TZ);
    expect(result).toMatch(/-01-20$/);
  });

  it("parses 'Friday December 25' to December 25", () => {
    const result = parseDate("Friday December 25", TZ);
    expect(result).toMatch(/-12-25$/);
  });

  it("parses 'Saturday March 14th' to March 14", () => {
    const result = parseDate("Saturday March 14th", TZ);
    expect(result).toMatch(/-03-14$/);
  });

  it("parses abbreviated weekday 'Wed March 11' correctly", () => {
    // Abbreviated weekday still matches the [a-z]+ prefix
    const result = parseDate("Wed March 11", TZ);
    expect(result).toMatch(/-03-11$/);
  });

  it("parses 'Thursday November 1st' to November 1", () => {
    const result = parseDate("Thursday November 1st", TZ);
    expect(result).toMatch(/-11-01$/);
  });

  it("parses 'Sunday April 2nd' to April 2", () => {
    const result = parseDate("Sunday April 2nd", TZ);
    expect(result).toMatch(/-04-02$/);
  });

  it("does NOT return today for 'Wednesday March 11' (the regression)", () => {
    // The bug: parseDate returned today (2026-03-08) for this input
    // It must never return 2026-03-08 when given "Wednesday March 11"
    const result = parseDate("Wednesday March 11", TZ);
    // Today is 2026-03-08 — result must be March 11, not March 8
    expect(result).not.toMatch(/-03-08$/);
    expect(result).toMatch(/-03-11$/);
  });

  it("returned ISO date is valid YYYY-MM-DD format", () => {
    const inputs = [
      "Monday March 9",
      "Wednesday March 11",
      "Friday April 15",
      "Saturday June 7th",
    ];
    for (const input of inputs) {
      const result = parseDate(input, TZ);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("works across all US timezones (no day-shift)", () => {
    const timezones = [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
    ];
    for (const tz of timezones) {
      const result = parseDate("Wednesday March 11", tz);
      expect(result).toMatch(/-03-11$/);
    }
  });
});

// ===== BUG 2: Closed-day validation regression =====

describe("isOpenDay: closed-day validation (BUG 3db84fa)", () => {
  // THE ACTUAL BUG: Before the fix, reschedule_booking accepted any date
  // including Sundays for businesses closed on Sundays. A customer's booking
  // was silently moved to Sunday (a closed day), causing a no-show.

  it("returns false for Sunday when hoursJson marks sunday as closed", () => {
    expect(isOpenDay("2026-03-08", POOL_HOURS)).toBe(false); // Sunday
  });

  it("returns false for Saturday when weekday-only hours", () => {
    expect(isOpenDay("2026-03-07", WEEKDAY_HOURS)).toBe(false); // Saturday
    expect(isOpenDay("2026-03-08", WEEKDAY_HOURS)).toBe(false); // Sunday
  });

  it("returns true for Monday (open day)", () => {
    expect(isOpenDay("2026-03-09", POOL_HOURS)).toBe(true); // Monday
  });

  it("returns true for Saturday in pool hours (Mon-Sat open)", () => {
    expect(isOpenDay("2026-03-07", POOL_HOURS)).toBe(true); // Saturday
  });

  it("returns true for all weekdays in pool hours", () => {
    // 2026-03-09 is Monday through 2026-03-13 is Friday
    expect(isOpenDay("2026-03-09", POOL_HOURS)).toBe(true); // Mon
    expect(isOpenDay("2026-03-10", POOL_HOURS)).toBe(true); // Tue
    expect(isOpenDay("2026-03-11", POOL_HOURS)).toBe(true); // Wed
    expect(isOpenDay("2026-03-12", POOL_HOURS)).toBe(true); // Thu
    expect(isOpenDay("2026-03-13", POOL_HOURS)).toBe(true); // Fri
  });

  it("returns true when hoursJson is null (no restriction configured)", () => {
    // No hours configured = always open (safe default)
    expect(isOpenDay("2026-03-08", null)).toBe(true);
    expect(isOpenDay("2026-03-08", undefined)).toBe(true);
  });

  it("returns false when day key is missing from hoursJson (unconfigured = closed)", () => {
    const partialHours = { monday: { open: "09:00", close: "17:00" } };
    expect(isOpenDay("2026-03-08", partialHours)).toBe(false); // Sunday not in object
  });
});

describe("getDayLabel: day name resolution", () => {
  it("returns 'sunday' for 2026-03-08 (known Sunday)", () => {
    expect(getDayLabel("2026-03-08")).toBe("sunday");
  });

  it("returns 'monday' for 2026-03-09", () => {
    expect(getDayLabel("2026-03-09")).toBe("monday");
  });

  it("returns 'wednesday' for 2026-03-11", () => {
    expect(getDayLabel("2026-03-11")).toBe("wednesday");
  });

  it("returns 'saturday' for 2026-03-07", () => {
    expect(getDayLabel("2026-03-07")).toBe("saturday");
  });
});

describe("nextOpenDay: finds next available slot", () => {
  it("from Sunday, returns Monday for Mon-Sat business", () => {
    // Sunday 2026-03-08 → next open = Monday 2026-03-09
    const result = nextOpenDay("2026-03-08", POOL_HOURS);
    expect(result).toBe("2026-03-09");
  });

  it("from Saturday, returns Monday for M-F only business", () => {
    // Saturday 2026-03-07 → next open = Monday 2026-03-09
    const result = nextOpenDay("2026-03-07", WEEKDAY_HOURS);
    expect(result).toBe("2026-03-09");
  });

  it("from Sunday, returns Monday for M-F only business", () => {
    // Sunday 2026-03-08 → next open = Monday 2026-03-09
    const result = nextOpenDay("2026-03-08", WEEKDAY_HOURS);
    expect(result).toBe("2026-03-09");
  });

  it("from Monday, returns Tuesday for Mon-Sat business", () => {
    // Monday is open, so next open from Monday = Tuesday
    const result = nextOpenDay("2026-03-09", POOL_HOURS);
    expect(result).toBe("2026-03-10");
  });

  it("returns null when no open day found within 7 days (all-closed scenario)", () => {
    const allClosed: Record<string, unknown> = {
      monday: { closed: true }, tuesday: { closed: true }, wednesday: { closed: true },
      thursday: { closed: true }, friday: { closed: true }, saturday: { closed: true },
      sunday: { closed: true },
    };
    const result = nextOpenDay("2026-03-08", allClosed);
    expect(result).toBeNull();
  });

  it("result is always a valid ISO date", () => {
    const result = nextOpenDay("2026-03-08", POOL_HOURS);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ===== Integration: complete reschedule scenario =====

describe("reschedule-booking: complete date validation flow", () => {
  it("scenario: customer requests 'Wednesday March 11' — parses correctly, open day passes", () => {
    const parsed = parseDate("Wednesday March 11", TZ);
    expect(parsed).toMatch(/-03-11$/);
    // Wednesday = open for pool service
    expect(isOpenDay(parsed, POOL_HOURS)).toBe(true);
  });

  it("scenario: customer requests Sunday — closed, next open day is Monday", () => {
    const parsed = parseDate("2026-03-08", TZ); // Sunday ISO
    expect(isOpenDay(parsed, POOL_HOURS)).toBe(false);
    const nextDay = nextOpenDay(parsed, POOL_HOURS);
    expect(nextDay).toBe("2026-03-09"); // Monday
  });

  it("scenario: customer says 'Sunday' (bare weekday) — closed-day error triggered", () => {
    const parsed = parseDate("sunday", TZ);
    // Result is some future Sunday
    const dayLabel = getDayLabel(parsed);
    expect(dayLabel).toBe("sunday");
    expect(isOpenDay(parsed, POOL_HOURS)).toBe(false);
  });

  it("scenario: 'next Wednesday' parses to a Wednesday that is open", () => {
    const parsed = parseDate("next wednesday", TZ);
    expect(getDayLabel(parsed)).toBe("wednesday");
    expect(isOpenDay(parsed, POOL_HOURS)).toBe(true);
  });
});

// ===== Source code structure safety checks =====

import { readFileSync } from "node:fs";
import { join } from "node:path";

const reschedSource = readFileSync(
  join(process.cwd(), "supabase/functions/elevenlabs-reschedule-booking/index.ts"),
  "utf-8"
);

describe("reschedule-booking source: weekdayMonthDay pattern present", () => {
  it("has the weekdayMonthDay regex pattern", () => {
    expect(reschedSource).toContain("weekdayMonthDay");
  });

  it("matches the expected regex pattern for weekday + month + day", () => {
    expect(reschedSource).toContain("[a-z]+\\s+([a-z]+)\\s+(\\d{1,2})");
  });
});

describe("reschedule-booking source: closed-day validation present", () => {
  it("calls isOpenDay before processing reschedule", () => {
    expect(reschedSource).toContain("isOpenDay");
  });

  it("calls nextOpenDay to suggest alternative", () => {
    expect(reschedSource).toContain("nextOpenDay");
  });

  it("fetches hours_json from tenant", () => {
    expect(reschedSource).toContain("hours_json");
  });

  it("returns closed-day error message", () => {
    expect(reschedSource).toMatch(/closed on.*s\./i);
  });

  it("returns next available day in error message", () => {
    expect(reschedSource).toMatch(/next available day/i);
  });
});

const availSource = readFileSync(
  join(process.cwd(), "supabase/functions/elevenlabs-check-availability/index.ts"),
  "utf-8"
);

describe("check-availability source: weekdayMonthDay pattern also patched", () => {
  // The same fix was applied to elevenlabs-check-availability (same parseDate gap)
  it("has the weekdayMonthDay regex pattern", () => {
    expect(availSource).toContain("weekdayMonthDay");
  });
});
