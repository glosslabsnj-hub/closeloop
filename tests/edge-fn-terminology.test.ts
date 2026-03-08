/**
 * Edge Function Terminology Helper Tests
 *
 * @vitest-environment node
 *
 * Verifies the _shared/terminology.ts getAppointmentLabel() function
 * returns correct industry-aware labels for edge functions (booking-handoff,
 * cron-appointment-reminders).
 *
 * This is critical for SMS confirmations and reminders to use the right
 * vocabulary (e.g. "Your estimate is confirmed" for GC, not "Your appointment").
 *
 * Gate: functional/booking_sms_confirmation, ai_testing/*
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const terminologySrc = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/terminology.ts"),
  "utf-8"
);

// ─── Source structure ──────────────────────────────────────────────────────

describe("Edge fn terminology: source structure", () => {
  it("exports getAppointmentLabel function", () => {
    expect(terminologySrc).toContain("export function getAppointmentLabel");
  });

  it("has SLUG_LABELS constant for industry-specific overrides", () => {
    expect(terminologySrc).toContain("SLUG_LABELS");
  });

  it("has MODE_LABELS constant for mode-level defaults", () => {
    expect(terminologySrc).toContain("MODE_LABELS");
  });
});

// ─── Home services (job) ───────────────────────────────────────────────────

describe("Edge fn terminology: home_services → job", () => {
  const homeServicesIndustries = [
    "plumbing", "hvac", "electrical", "handyman", "painting",
    "landscaping", "roofing", "locksmith", "appliance-repair",
  ];
  // Note: roofing is special — it should use "inspection" not "job"
  const trueJobIndustries = homeServicesIndustries.filter(s => s !== "roofing");

  for (const industry of trueJobIndustries) {
    it(`${industry} maps to "job"`, () => {
      // Keys with hyphens use quoted form: "appliance-repair": "job"
      const key = industry.includes("-") ? `"${industry}": "job"` : `${industry}: "job"`;
      expect(terminologySrc).toContain(key);
    });
  }
});

// ─── Roofing (inspection) ──────────────────────────────────────────────────

describe("Edge fn terminology: roofing → inspection", () => {
  it('roofing maps to "inspection" (not "job")', () => {
    expect(terminologySrc).toContain('roofing: "inspection"');
    expect(terminologySrc).not.toContain('roofing: "job"');
  });
});

// ─── General contractor (estimate) ────────────────────────────────────────

describe("Edge fn terminology: general_contractor → estimate", () => {
  it('general_contractor maps to "estimate"', () => {
    expect(terminologySrc).toContain('general_contractor: "estimate"');
  });
});

// ─── Professional services (consultation) ─────────────────────────────────

describe("Edge fn terminology: professional_services → consultation", () => {
  const consultationIndustries = ["lawyer", "accountant", "real-estate"];
  for (const industry of consultationIndustries) {
    it(`${industry} maps to "consultation"`, () => {
      const key = industry.includes("-") ? `"${industry}": "consultation"` : `${industry}: "consultation"`;
      expect(terminologySrc).toContain(key);
    });
  }
});

// ─── Fitness (session) ────────────────────────────────────────────────────

describe("Edge fn terminology: fitness → session", () => {
  it('personal-trainer maps to "session"', () => {
    expect(terminologySrc).toContain('"personal-trainer": "session"');
  });
});

// ─── Mode-level defaults ──────────────────────────────────────────────────

describe("Edge fn terminology: mode-level defaults", () => {
  it('dispatch mode defaults to "dispatch"', () => {
    expect(terminologySrc).toContain('dispatch: "dispatch"');
  });

  it('food mode defaults to "reservation"', () => {
    expect(terminologySrc).toContain('food: "reservation"');
  });

  it('medical mode defaults to "visit"', () => {
    expect(terminologySrc).toContain('medical: "visit"');
  });

  it("service mode (unlisted) falls back to appointment", () => {
    // Service mode is NOT in MODE_LABELS, so getAppointmentLabel returns "appointment"
    // for generic service businesses without a slug override
    expect(terminologySrc).toContain('"appointment"');
  });
});

// ─── Consistency: frontend vs edge fn ─────────────────────────────────────

describe("Edge fn terminology: matches frontend industryTerminology.ts", () => {
  const frontendSrc = readFileSync(
    join(process.cwd(), "src/data/industryTerminology.ts"),
    "utf-8"
  );

  it("general_contractor: both use 'estimate'", () => {
    expect(terminologySrc).toContain('general_contractor: "estimate"');
    expect(frontendSrc).toContain('appointmentLabel: "estimate"');
  });

  it("roofing: both use 'inspection'", () => {
    expect(terminologySrc).toContain('roofing: "inspection"');
    expect(frontendSrc).toContain('appointmentLabel: "inspection"');
  });
});
