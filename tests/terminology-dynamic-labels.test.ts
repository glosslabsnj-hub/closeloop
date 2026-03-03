/**
 * Dynamic Terminology Labels Regression Tests
 *
 * @vitest-environment node
 *
 * Verifies that user-facing components use dynamic terminology (terms.booking,
 * terms.bookings) instead of hardcoded "Booking"/"Appointment" strings.
 * A plumber should see "Job" everywhere, not "Booking" or "Appointment".
 *
 * Gates: dashboard/correct_mode_terminology
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/**
 * Files that MUST use dynamic terminology for booking/appointment labels.
 * Each entry lists forbidden hardcoded strings that should be replaced
 * with terms.booking / terms.bookings from useIndustryContext().
 */
const DYNAMIC_TERM_FILES = [
  {
    file: "src/pages/app/LeadsPage.tsx",
    description: "LeadsPage dropdown action labels",
    // The getModeLabels function should accept bookingTerm, not hardcode "Appointment"
    mustNotHave: [
      { pattern: /bookingLabel:\s*"Appointment"/, context: "service mode bookingLabel should use bookingTerm param" },
    ],
    mustHave: [
      { pattern: /bookingTerm\?/, context: "getModeLabels should accept and use bookingTerm" },
      { pattern: /terms\.booking/, context: "should pass terms.booking to getModeLabels" },
    ],
  },
  {
    file: "src/pages/app/HelpCenterPage.tsx",
    description: "HelpCenterPage category labels",
    mustHave: [
      { pattern: /useIndustryContext/, context: "should import useIndustryContext for dynamic terms" },
      { pattern: /terms\.bookings/, context: "should use terms.bookings for dynamic label" },
      { pattern: /cat\.id\s*===\s*"bookings"/, context: "should override bookings category label dynamically" },
    ],
  },
  {
    file: "src/components/automations/AutomationRulesSection.tsx",
    description: "AutomationRulesSection event labels",
    mustHave: [
      { pattern: /useIndustryContext/, context: "should import useIndustryContext for dynamic terms" },
      { pattern: /applyTerms/, context: "should have applyTerms function for dynamic event labels" },
    ],
  },
  {
    file: "src/components/automations/AutomationTemplatesSection.tsx",
    description: "AutomationTemplatesSection template names",
    mustHave: [
      { pattern: /useIndustryContext/, context: "should import useIndustryContext for dynamic terms" },
      { pattern: /terms\.booking/, context: "should use terms.booking for template name replacement" },
    ],
  },
  {
    file: "src/pages/app/WorkflowsPage.tsx",
    description: "WorkflowsPage template names",
    mustHave: [
      { pattern: /useIndustryContext/, context: "should import useIndustryContext for dynamic terms" },
      { pattern: /terms\.booking/, context: "should use terms.booking for workflow template labels" },
    ],
  },
];

describe("Dynamic terminology — no hardcoded Booking/Appointment in user-facing labels", () => {
  for (const entry of DYNAMIC_TERM_FILES) {
    describe(entry.description, () => {
      const filePath = join(ROOT, entry.file);
      const source = readFileSync(filePath, "utf-8");

      if (entry.mustNotHave) {
        for (const check of entry.mustNotHave) {
          it(`should NOT have: ${check.context}`, () => {
            expect(
              check.pattern.test(source),
              `${entry.file}: ${check.context}`
            ).toBe(false);
          });
        }
      }

      if (entry.mustHave) {
        for (const check of entry.mustHave) {
          it(`should have: ${check.context}`, () => {
            expect(
              check.pattern.test(source),
              `${entry.file}: ${check.context}`
            ).toBe(true);
          });
        }
      }
    });
  }
});

/**
 * Verify that previously-fixed components still use dynamic terms
 * (prevent regression from earlier UX/eng fixes)
 */
describe("Previously-fixed components — still dynamic", () => {
  const PREVIOUSLY_FIXED = [
    { file: "src/components/bookings/BookingDetailsSheet.tsx", mustHave: /terms\.booking/ },
    { file: "src/components/bookings/BookingCard.tsx", mustHave: /terms\.booking/ },
    { file: "src/components/brain/editors/ServiceCatalogEditor.tsx", mustHave: /terms\.booking/ },
    { file: "src/components/customers/CustomerDetailSheet.tsx", mustHave: /terms\.booking|bookingTerm|appointmentLabel/ },
  ];

  for (const entry of PREVIOUSLY_FIXED) {
    it(`${entry.file} still uses dynamic booking terminology`, () => {
      const filePath = join(ROOT, entry.file);
      const source = readFileSync(filePath, "utf-8");
      expect(
        entry.mustHave.test(source),
        `${entry.file} should reference dynamic booking term`
      ).toBe(true);
    });
  }
});
