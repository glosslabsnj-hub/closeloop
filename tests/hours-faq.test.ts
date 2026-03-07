/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

const BUILD_CONTEXT_PATH = join(
  process.cwd(),
  "supabase/functions/_shared/buildBusinessContext.ts"
);
const buildCtx = readFileSync(BUILD_CONTEXT_PATH, "utf-8");

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

// ---------------------------------------------------------------------------
// BUG #506 regression: buildBusinessContext live hours override
// ---------------------------------------------------------------------------

/**
 * BUG #506 (2026-03-06): Hours FAQs created during onboarding showed stale data after
 * business hours were changed in Settings. The AI would tell callers wrong hours.
 *
 * Fix: buildBusinessContext.ts dynamically overrides any FAQ whose question contains "hour"
 * with a freshly computed hours string from the tenant's current hours_json.
 *
 * These tests verify the override logic exists and is correctly structured.
 */
describe("buildBusinessContext: hours FAQ live override (BUG #506 regression)", () => {
  it("buildWeeklyHoursSummary is exported from buildBusinessContext", () => {
    expect(buildCtx).toContain("export function buildWeeklyHoursSummary");
  });

  it("liveHoursString is computed from tenant.hours_json", () => {
    expect(buildCtx).toContain("liveHoursString");
    // Must use buildWeeklyHoursSummary + normalizeHours on tenant hours_json
    expect(buildCtx).toContain("buildWeeklyHoursSummary(normalizeHours(");
    expect(buildCtx).toContain("hours_json");
  });

  it("FAQ answers with 'hour' in question are replaced with live hours string", () => {
    // The core fix: map rawFaqs and override any hours-related FAQ answer
    expect(buildCtx).toContain(".includes(\"hour\")");
    // The replacement produces { ...f, answer: liveHoursString }
    expect(buildCtx).toContain("answer: liveHoursString");
  });

  it("override is conditional (liveHoursString must be non-empty)", () => {
    // The fix uses a ternary: const faqs = liveHoursString ? rawFaqs.map(...) : rawFaqs
    // When hours aren't set, liveHoursString is empty and rawFaqs is returned unchanged.
    // Verify the ternary exists by checking "const faqs = liveHoursString" is in the source.
    expect(buildCtx).toContain("const faqs = liveHoursString");
  });

  it("rawFaqs holds DB results; faqs variable holds post-override results", () => {
    expect(buildCtx).toContain("rawFaqs");
    // rawFaqs must appear before faqs assignment
    const rawIdx = buildCtx.indexOf("rawFaqs");
    const faqsIdx = buildCtx.indexOf("const faqs = liveHoursString");
    expect(rawIdx).toBeGreaterThan(-1);
    expect(faqsIdx).toBeGreaterThan(-1);
    expect(rawIdx).toBeLessThan(faqsIdx);
  });
});
