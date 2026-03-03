/**
 * Tests for the booking date/time parsing logic in elevenlabs-create-booking.
 * These are unit tests for the pure parsing functions, inlined here since
 * the edge function runs in Deno.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ===== Inlined from supabase/functions/elevenlabs-create-booking/index.ts =====

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

function nextWeekday(targetDay: number): Date {
  const now = new Date();
  const result = new Date(now);
  result.setDate(now.getDate() + 1);
  while (result.getDay() !== targetDay) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

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

function parseDate(input: string, timezone: string): string {
  const now = new Date();
  const lower = input.toLowerCase().trim();

  if (!input || lower === "today" || lower === "now") {
    return formatDateLocal(now, timezone);
  }
  if (lower === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateLocal(tomorrow, timezone);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const slashDate = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const [, m, d, y] = slashDate;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const slashShort = input.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashShort) {
    const [, m, d] = slashShort;
    const year = now.getFullYear();
    // Use noon UTC to avoid timezone day-shift when formatting in local tz
    const candidate = new Date(Date.UTC(year, parseInt(m) - 1, parseInt(d), 12, 0, 0));
    if (candidate < now) candidate.setUTCFullYear(year + 1);
    return formatDateLocal(candidate, timezone);
  }

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
      // Use noon UTC to avoid timezone day-shift
      const candidate = new Date(Date.UTC(year, monthIndex, parseInt(dayStr), 12, 0, 0));
      if (candidate < now) candidate.setUTCFullYear(year + 1);
      return formatDateLocal(candidate, timezone);
    }
  }

  const dayMatch = lower.match(/^(?:next\s+|this\s+)?([a-z]+)$/);
  if (dayMatch) {
    const dayIndex = DAY_NAMES[dayMatch[1]];
    if (dayIndex !== undefined) {
      return formatDateLocal(nextWeekday(dayIndex), timezone);
    }
  }

  return formatDateLocal(now, timezone);
}

function parseTime(input: string): string {
  const lower = input.toLowerCase().trim();

  if (/^\d{1,2}:\d{2}$/.test(input)) {
    const [h, m] = input.split(":");
    return `${h.padStart(2, "0")}:${m}`;
  }

  const ampmMatch = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] || "00";
    const period = ampmMatch[3];
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${minutes}`;
  }

  if (/^\d{1,2}$/.test(input)) {
    const hour = parseInt(input, 10);
    const adjustedHour = hour < 8 ? hour + 12 : hour;
    return `${String(adjustedHour).padStart(2, "0")}:00`;
  }

  return "09:00";
}

// ===== Tests =====

const TZ = "America/New_York";

describe("parseDate", () => {
  it("handles ISO format directly", () => {
    expect(parseDate("2026-03-15", TZ)).toBe("2026-03-15");
    expect(parseDate("2026-12-25", TZ)).toBe("2026-12-25");
  });

  it("handles 'today'", () => {
    const today = formatDateLocal(new Date(), TZ);
    expect(parseDate("today", TZ)).toBe(today);
    expect(parseDate("Today", TZ)).toBe(today);
  });

  it("handles 'tomorrow'", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expected = formatDateLocal(tomorrow, TZ);
    expect(parseDate("tomorrow", TZ)).toBe(expected);
    expect(parseDate("Tomorrow", TZ)).toBe(expected);
  });

  it("handles MM/DD/YYYY format", () => {
    expect(parseDate("3/15/2026", TZ)).toBe("2026-03-15");
    expect(parseDate("12/25/2026", TZ)).toBe("2026-12-25");
    expect(parseDate("1/5/2026", TZ)).toBe("2026-01-05");
  });

  it("handles month name + day", () => {
    // These dates should be parsed as 2026 dates (future)
    const result = parseDate("March 15", TZ);
    expect(result).toMatch(/^\d{4}-03-15$/);

    const result2 = parseDate("December 25", TZ);
    expect(result2).toMatch(/^\d{4}-12-25$/);
  });

  it("handles ordinal day formats", () => {
    const result = parseDate("March 5th", TZ);
    expect(result).toMatch(/^\d{4}-03-05$/);

    const result2 = parseDate("March 1st", TZ);
    expect(result2).toMatch(/^\d{4}-03-01$/);

    const result3 = parseDate("March 2nd", TZ);
    expect(result3).toMatch(/^\d{4}-03-02$/);
  });

  it("handles abbreviated month names", () => {
    const result = parseDate("Mar 15", TZ);
    expect(result).toMatch(/^\d{4}-03-15$/);

    const result2 = parseDate("Dec 25", TZ);
    expect(result2).toMatch(/^\d{4}-12-25$/);
  });

  it("returns a valid date for weekday names", () => {
    const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const day of weekdays) {
      const result = parseDate(day, TZ);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("handles 'next Monday' etc", () => {
    const result = parseDate("next Monday", TZ);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Must be a Monday
    const dayOfWeek = new Date(result + "T12:00:00").getDay();
    expect(dayOfWeek).toBe(1);
  });

  it("falls back to today for unknown formats", () => {
    const today = formatDateLocal(new Date(), TZ);
    expect(parseDate("", TZ)).toBe(today);
    expect(parseDate("unknown garbage", TZ)).toBe(today);
  });
});

describe("parseTime", () => {
  it("handles HH:MM 24-hour format", () => {
    expect(parseTime("14:00")).toBe("14:00");
    expect(parseTime("09:30")).toBe("09:30");
    expect(parseTime("9:30")).toBe("09:30");
  });

  it("handles 12-hour AM/PM format", () => {
    expect(parseTime("2:00pm")).toBe("14:00");
    expect(parseTime("2:00 pm")).toBe("14:00");
    expect(parseTime("9:30am")).toBe("09:30");
    expect(parseTime("12:00pm")).toBe("12:00");
    expect(parseTime("12:00am")).toBe("00:00");
    expect(parseTime("1:30pm")).toBe("13:30");
  });

  it("handles bare hour numbers", () => {
    expect(parseTime("9")).toBe("09:00"); // 9 >= 8 → morning
    expect(parseTime("2")).toBe("14:00"); // 2 < 8 → afternoon
    expect(parseTime("11")).toBe("11:00");
  });

  it("falls back to 09:00 for unknown formats", () => {
    expect(parseTime("noon")).toBe("09:00"); // fallback
    expect(parseTime("")).toBe("09:00");
  });
});

// ===== Regression tests for date bugs =====

describe("parseDate - timezone day-shift regression (#360)", () => {
  // Bug: new Date(year, month, day) creates midnight LOCAL/UTC time.
  // When formatted in America/New_York (UTC-5), midnight UTC = previous day 7 PM.
  // Fix: Use Date.UTC with noon (12:00) so any timezone stays on same calendar day.

  it("'March 15' must parse to day 15 in any US timezone", () => {
    const timezones = [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Pacific/Honolulu",
    ];
    for (const tz of timezones) {
      const result = parseDate("March 15", tz);
      expect(result).toMatch(/-03-15$/);
    }
  });

  it("'December 25' must parse to day 25 regardless of timezone", () => {
    expect(parseDate("December 25", "America/New_York")).toMatch(/-12-25$/);
    expect(parseDate("December 25", "America/Los_Angeles")).toMatch(/-12-25$/);
  });

  it("'3/15' must parse to day 15 regardless of timezone", () => {
    expect(parseDate("3/15", "America/New_York")).toMatch(/-03-15$/);
    expect(parseDate("3/15", "America/Los_Angeles")).toMatch(/-03-15$/);
  });

  it("'March 1st' must parse to day 01 not previous month", () => {
    expect(parseDate("March 1st", "America/New_York")).toMatch(/-03-01$/);
    expect(parseDate("March 1st", "Pacific/Honolulu")).toMatch(/-03-01$/);
  });

  it("ordinals parse to correct day in all timezones", () => {
    expect(parseDate("April 2nd", "America/New_York")).toMatch(/-04-02$/);
    expect(parseDate("June 3rd", "America/Los_Angeles")).toMatch(/-06-03$/);
    expect(parseDate("July 22nd", "Pacific/Honolulu")).toMatch(/-07-22$/);
  });
});

describe("parseDate - comprehensive format support regression (#359)", () => {
  // Bug: check-availability only handled "today", "tomorrow", ISO format.
  // Natural language dates like "March 15" fell through to today,
  // causing the min_lead_hours check to reject all future dates.

  it("handles full month names with day", () => {
    expect(parseDate("January 10", TZ)).toMatch(/^\d{4}-01-10$/);
    expect(parseDate("February 28", TZ)).toMatch(/^\d{4}-02-28$/);
    expect(parseDate("April 1", TZ)).toMatch(/^\d{4}-04-01$/);
    expect(parseDate("May 5", TZ)).toMatch(/^\d{4}-05-05$/);
    expect(parseDate("June 15", TZ)).toMatch(/^\d{4}-06-15$/);
    expect(parseDate("July 4", TZ)).toMatch(/^\d{4}-07-04$/);
    expect(parseDate("August 20", TZ)).toMatch(/^\d{4}-08-20$/);
    expect(parseDate("September 1", TZ)).toMatch(/^\d{4}-09-01$/);
    expect(parseDate("October 31", TZ)).toMatch(/^\d{4}-10-31$/);
    expect(parseDate("November 11", TZ)).toMatch(/^\d{4}-11-11$/);
    expect(parseDate("December 25", TZ)).toMatch(/^\d{4}-12-25$/);
  });

  it("handles abbreviated month names with day", () => {
    expect(parseDate("Jan 10", TZ)).toMatch(/^\d{4}-01-10$/);
    expect(parseDate("Feb 14", TZ)).toMatch(/^\d{4}-02-14$/);
    expect(parseDate("Sep 1", TZ)).toMatch(/^\d{4}-09-01$/);
    expect(parseDate("Oct 31", TZ)).toMatch(/^\d{4}-10-31$/);
    expect(parseDate("Nov 11", TZ)).toMatch(/^\d{4}-11-11$/);
    expect(parseDate("Dec 25", TZ)).toMatch(/^\d{4}-12-25$/);
  });

  it("handles 'Xth of Month' format", () => {
    expect(parseDate("15th of March", TZ)).toMatch(/^\d{4}-03-15$/);
    expect(parseDate("1st of April", TZ)).toMatch(/^\d{4}-04-01$/);
    expect(parseDate("2nd of May", TZ)).toMatch(/^\d{4}-05-02$/);
    expect(parseDate("3rd of June", TZ)).toMatch(/^\d{4}-06-03$/);
  });

  it("handles weekday names", () => {
    const result = parseDate("friday", TZ);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const dayOfWeek = new Date(result + "T12:00:00").getDay();
    expect(dayOfWeek).toBe(5); // Friday
  });

  it("handles 'next [weekday]'", () => {
    const result = parseDate("next wednesday", TZ);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const dayOfWeek = new Date(result + "T12:00:00").getDay();
    expect(dayOfWeek).toBe(3); // Wednesday
  });

  it("handles 'this [weekday]'", () => {
    const result = parseDate("this saturday", TZ);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const dayOfWeek = new Date(result + "T12:00:00").getDay();
    expect(dayOfWeek).toBe(6); // Saturday
  });

  it("handles MM/DD short format", () => {
    expect(parseDate("3/15", TZ)).toMatch(/^\d{4}-03-15$/);
    expect(parseDate("12/25", TZ)).toMatch(/^\d{4}-12-25$/);
  });

  it("handles MM/DD/YYYY full format", () => {
    expect(parseDate("3/15/2026", TZ)).toBe("2026-03-15");
    expect(parseDate("12/25/2027", TZ)).toBe("2027-12-25");
  });
});
