/**
 * Availability Slots Sync Tests
 *
 * @vitest-environment node
 *
 * Ensures availability_slots table stays in sync with hours_json when
 * business hours are updated. Without this sync, AI would use stale hours
 * because build-business-brain prefers availability_slots table rows over
 * deriving from hours_json on-the-fly.
 *
 * Bug: QA handoff #225 — "availability_slots not synced with hours after time change"
 * Fix: updateBusinessHours() now calls syncAvailabilitySlotsFromHours() after saving hours_json
 *
 * Gates: settings/business_hours_save_and_enforce, brain/edits_reflect_in_ai_behavior
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WRITE_BRAIN_FACT_PATH = join(process.cwd(), "src/lib/brain/writeBrainFact.ts");
const writeBrainFactSource = readFileSync(WRITE_BRAIN_FACT_PATH, "utf-8");

const HOURS_MANAGER_PATH = join(process.cwd(), "src/components/brain/profile/BusinessHoursManager.tsx");
const hoursManagerSource = readFileSync(HOURS_MANAGER_PATH, "utf-8");

const BUILD_BRAIN_PATH = join(process.cwd(), "supabase/functions/build-business-brain/index.ts");
const buildBrainSource = readFileSync(BUILD_BRAIN_PATH, "utf-8");

// ─── Static analysis: sync call must exist ──────────────────────────────────

describe("availability_slots sync with hours_json", () => {
  it("updateBusinessHours must call syncAvailabilitySlotsFromHours", () => {
    const fnMatch = writeBrainFactSource.match(
      /export async function updateBusinessHours[\s\S]*?^\}/m
    );
    expect(fnMatch).toBeTruthy();
    expect(fnMatch![0]).toContain("syncAvailabilitySlotsFromHours");
  });

  it("syncAvailabilitySlotsFromHours must delete then insert availability_slots", () => {
    expect(writeBrainFactSource).toContain("async function syncAvailabilitySlotsFromHours");
    expect(writeBrainFactSource).toMatch(/\.from\("availability_slots"\)\s*\n?\s*\.delete\(\)/);
    expect(writeBrainFactSource).toMatch(/\.from\("availability_slots"\)\s*\n?\s*\.insert\(/);
  });

  it("syncAvailabilitySlotsFromHours handles all 7 days", () => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const fnMatch = writeBrainFactSource.match(
      /function syncAvailabilitySlotsFromHours[\s\S]*?^\}/m
    );
    expect(fnMatch).toBeTruthy();
    for (const day of dayNames) {
      expect(fnMatch![0]).toContain(day);
    }
  });

  it("syncAvailabilitySlotsFromHours handles windows format (split shifts)", () => {
    const fnMatch = writeBrainFactSource.match(
      /function syncAvailabilitySlotsFromHours[\s\S]*?^\}/m
    );
    expect(fnMatch).toBeTruthy();
    expect(fnMatch![0]).toContain("dayData.windows");
    expect(fnMatch![0]).toContain("w.open");
    expect(fnMatch![0]).toContain("w.close");
  });

  it("syncAvailabilitySlotsFromHours handles legacy format (open/close)", () => {
    const fnMatch = writeBrainFactSource.match(
      /function syncAvailabilitySlotsFromHours[\s\S]*?^\}/m
    );
    expect(fnMatch).toBeTruthy();
    expect(fnMatch![0]).toContain("dayData.open");
    expect(fnMatch![0]).toContain("dayData.close");
  });

  it("syncAvailabilitySlotsFromHours handles closed days", () => {
    const fnMatch = writeBrainFactSource.match(
      /function syncAvailabilitySlotsFromHours[\s\S]*?^\}/m
    );
    expect(fnMatch).toBeTruthy();
    expect(fnMatch![0]).toContain("dayData.closed");
    expect(fnMatch![0]).toContain("is_available: false");
  });
});

// ─── UI cache invalidation ──────────────────────────────────────────────────

describe("BusinessHoursManager cache invalidation", () => {
  it("invalidates availability_slots query key after saving hours", () => {
    expect(hoursManagerSource).toContain('"availability_slots"');
  });

  it("invalidates availability-slots-preview query key after saving hours", () => {
    expect(hoursManagerSource).toContain('"availability-slots-preview"');
  });
});

// ─── Derivation parity with build-business-brain ────────────────────────────

describe("build-business-brain edge function", () => {
  it("has fallback derivation from hours_json when availability_slots is empty", () => {
    expect(buildBrainSource).toContain("Derive from hours_json");
  });

  it("prefers availability_slots table when rows exist", () => {
    expect(buildBrainSource).toContain("availabilitySlots.length > 0");
  });
});
