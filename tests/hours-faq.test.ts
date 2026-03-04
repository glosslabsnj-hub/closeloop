import { describe, it, expect } from "vitest";
import {
  buildHoursForFAQ,
  DEFAULT_BUSINESS_HOURS,
  HOURS_24_7,
  TYPICAL_BUSINESS_HOURS,
  MON_SAT_9_5,
  RESTAURANT_HOURS,
  createDayHours,
} from "@/lib/hoursUtils";
import type { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";

describe("buildHoursForFAQ", () => {
  it("returns 24/7 message for all-day hours", () => {
    expect(buildHoursForFAQ(HOURS_24_7)).toBe("We're available 24/7!");
  });

  it("groups consecutive days with same hours", () => {
    const result = buildHoursForFAQ(TYPICAL_BUSINESS_HOURS);
    expect(result).toContain("Monday through Friday");
    expect(result).toContain("9:00 AM");
    expect(result).toContain("5:00 PM");
    expect(result).toContain("Closed Saturday");
  });

  it("handles default hours (Mon-Fri 9-5, Sat 10-2, Sun closed)", () => {
    const result = buildHoursForFAQ(DEFAULT_BUSINESS_HOURS);
    expect(result).toContain("Monday through Friday");
    expect(result).toContain("Saturday 10:00 AM - 2:00 PM");
    expect(result).toContain("Closed Sunday");
  });

  it("handles Mon-Sat 9-5 with Sunday closed", () => {
    const result = buildHoursForFAQ(MON_SAT_9_5);
    expect(result).toContain("Monday through Saturday");
    expect(result).toContain("Closed Sunday");
  });

  it("handles restaurant hours with different weekend times", () => {
    const result = buildHoursForFAQ(RESTAURANT_HOURS);
    expect(result).toContain("Monday through Thursday");
    expect(result).toContain("Friday through Saturday");
    expect(result).toContain("Sunday");
  });

  it("shows correct time format for plumber-like hours (8-6 weekdays, 10-3 Sat)", () => {
    const plumberHours: BusinessHours = {
      monday: createDayHours("08:00", "18:00"),
      tuesday: createDayHours("08:00", "18:00"),
      wednesday: createDayHours("08:00", "18:00"),
      thursday: createDayHours("08:00", "18:00"),
      friday: createDayHours("08:00", "18:00"),
      saturday: createDayHours("10:00", "15:00"),
      sunday: createDayHours("00:00", "00:00", true),
    };
    const result = buildHoursForFAQ(plumberHours);
    expect(result).toContain("Monday through Friday 8:00 AM - 6:00 PM");
    expect(result).toContain("Saturday 10:00 AM - 3:00 PM");
    expect(result).toContain("Closed Sunday");
    // Must NOT say "8 AM" — must include minutes for accuracy
    expect(result).not.toContain("8 AM");
  });

  it("handles all days closed gracefully", () => {
    const allClosed: BusinessHours = {
      monday: createDayHours("00:00", "00:00", true),
      tuesday: createDayHours("00:00", "00:00", true),
      wednesday: createDayHours("00:00", "00:00", true),
      thursday: createDayHours("00:00", "00:00", true),
      friday: createDayHours("00:00", "00:00", true),
      saturday: createDayHours("00:00", "00:00", true),
      sunday: createDayHours("00:00", "00:00", true),
    };
    const result = buildHoursForFAQ(allClosed);
    expect(result).toContain("Closed");
  });
});
