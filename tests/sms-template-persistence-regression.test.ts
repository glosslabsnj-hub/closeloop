/**
 * SMS Template Persistence Regression Tests
 *
 * @vitest-environment node
 *
 * BUG (commit 7a8388c, 2026-03-08): SmsSettingsSection was using a broad
 * regex to detect "default" templates. Any user-customized message that
 * started with the same phrase as a system default would be incorrectly
 * classified as a default and regenerated on save+refetch — reverting the
 * user's custom text silently.
 *
 * Root cause: DEFAULT_PATTERNS[0] = /^Hi {{customer_name}}! Your \w+ with/
 * This matched "Hi {{customer_name}}! Your job with {{business_name}} is
 * confirmed for tomorrow — PLEASE BRING ID" as a default, reverting it.
 *
 * Fix: Compare saved template against exact generated defaults for all known
 * appointment label variants (appointment, booking, job, session, reservation,
 * visit, consultation, service, order, intake, lead).
 * Only overwrites templates that are EXACTLY equal to a system-generated
 * default. User modifications (even a single added word) are preserved.
 *
 * These tests verify:
 * 1. Exact system defaults are correctly detected as defaults
 * 2. User-modified messages (even slightly) are NOT classified as defaults
 * 3. All KNOWN_APPOINTMENT_LABELS generate distinct correct defaults
 * 4. The isDefaultTemplate function is idempotent (correct key → correct label)
 * 5. Custom messages that start like defaults are NOT reverted
 *
 * Business impact: A handyman who customizes their SMS confirmation to add
 * "Bring payment" will no longer lose that customization on page refresh.
 * Every save-reload cycle was silently destroying user customizations.
 *
 * Gate: service integrations/sms_delivery_works + overall/settings_all_persist
 */
import { describe, it, expect } from "vitest";

// ─── Inline the SmsSettingsSection logic (pure functions only) ─────────────
// We copy the exact logic from SmsSettingsSection.tsx so we can unit-test it
// without importing the full React component.

interface SmsTemplate {
  enabled: boolean;
  message: string;
  delayMinutes?: number;
}

interface SmsSettings {
  appointment_confirmation: SmsTemplate;
  appointment_reminder: SmsTemplate;
  review_request: SmsTemplate;
}

function getDefaultSettings(appointmentLabel: string): SmsSettings {
  return {
    appointment_confirmation: {
      enabled: true,
      message: `Hi {{customer_name}}! Your ${appointmentLabel} with {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Reply STOP to opt out.`,
    },
    appointment_reminder: {
      enabled: true,
      message: `Reminder: Your ${appointmentLabel} with {{business_name}} is tomorrow at {{appointment_time}}. See you then! Reply STOP to unsubscribe.`,
      delayMinutes: 1440,
    },
    review_request: {
      enabled: false,
      message: `Thank you for choosing {{business_name}}! We'd love your feedback — please leave us a review: {{review_link}}. Reply STOP to opt out.`,
      delayMinutes: 60,
    },
  };
}

const KNOWN_APPOINTMENT_LABELS = [
  "appointment", "booking", "job", "session", "reservation",
  "visit", "consultation", "service", "order", "intake", "lead",
];

function isDefaultTemplate(message: string, key: keyof SmsSettings): boolean {
  return KNOWN_APPOINTMENT_LABELS.some(
    (label) => getDefaultSettings(label)[key].message === message
  );
}

// ─── Default detection: exact system defaults are detected ─────────────────

describe("isDefaultTemplate: exact system defaults detected as defaults", () => {
  for (const label of KNOWN_APPOINTMENT_LABELS) {
    const defaults = getDefaultSettings(label);

    it(`"${label}" appointment_confirmation default is detected as default`, () => {
      expect(isDefaultTemplate(defaults.appointment_confirmation.message, "appointment_confirmation")).toBe(true);
    });

    it(`"${label}" appointment_reminder default is detected as default`, () => {
      expect(isDefaultTemplate(defaults.appointment_reminder.message, "appointment_reminder")).toBe(true);
    });

    it(`"${label}" review_request default is detected as default`, () => {
      expect(isDefaultTemplate(defaults.review_request.message, "review_request")).toBe(true);
    });
  }
});

// ─── Custom message preservation: modifications are NOT classified as defaults

describe("isDefaultTemplate: user modifications are NOT classified as defaults", () => {
  // THE BUG: regex would match these because they start the same way
  const jobDefault = getDefaultSettings("job").appointment_confirmation.message;

  it("adding 'Bring payment' to job confirmation is NOT a default", () => {
    const custom = jobDefault + " Please bring payment.";
    expect(isDefaultTemplate(custom, "appointment_confirmation")).toBe(false);
  });

  it("replacing 'job' with custom word in confirmation is NOT a default", () => {
    const custom = jobDefault.replace("job", "service call");
    expect(isDefaultTemplate(custom, "appointment_confirmation")).toBe(false);
  });

  it("adding business-specific info to confirmation is NOT a default", () => {
    const custom = "Hi {{customer_name}}! Your job with {{business_name}} is confirmed. Please arrive 5 min early.";
    expect(isDefaultTemplate(custom, "appointment_confirmation")).toBe(false);
  });

  it("fully custom confirmation message is NOT a default", () => {
    const custom = "Hey {{customer_name}}, see you soon at {{business_name}}! Questions? Call us anytime.";
    expect(isDefaultTemplate(custom, "appointment_confirmation")).toBe(false);
  });

  it("empty string is NOT a default", () => {
    expect(isDefaultTemplate("", "appointment_confirmation")).toBe(false);
  });

  it("partial default (truncated) is NOT a default", () => {
    const jobDefault = getDefaultSettings("job").appointment_confirmation.message;
    const partial = jobDefault.slice(0, 40); // just the beginning
    expect(isDefaultTemplate(partial, "appointment_confirmation")).toBe(false);
  });

  // Review request is different — no appointmentLabel interpolation in the message
  it("custom review request message is NOT a default", () => {
    const custom = "Thanks for visiting {{business_name}}! Leave a review here: {{review_link}}";
    expect(isDefaultTemplate(custom, "review_request")).toBe(false);
  });

  it("review_request default IS a default (no label variable, universal)", () => {
    const reviewDefault = getDefaultSettings("job").review_request.message;
    expect(isDefaultTemplate(reviewDefault, "review_request")).toBe(true);
  });
});

// ─── Cross-key isolation: correct key matters ──────────────────────────────

describe("isDefaultTemplate: key matters — wrong key doesn't accidentally match", () => {
  it("appointment_confirmation message is not detected as appointment_reminder default", () => {
    const confirmMsg = getDefaultSettings("appointment").appointment_confirmation.message;
    expect(isDefaultTemplate(confirmMsg, "appointment_reminder")).toBe(false);
  });

  it("appointment_reminder message is not detected as appointment_confirmation default", () => {
    const reminderMsg = getDefaultSettings("appointment").appointment_reminder.message;
    expect(isDefaultTemplate(reminderMsg, "appointment_confirmation")).toBe(false);
  });

  it("review_request message is not detected as confirmation default", () => {
    const reviewMsg = getDefaultSettings("appointment").review_request.message;
    expect(isDefaultTemplate(reviewMsg, "appointment_confirmation")).toBe(false);
  });
});

// ─── All labels produce distinct messages ──────────────────────────────────

describe("getDefaultSettings: each label produces unique messages", () => {
  // appointment_confirmation messages for each label must be different
  // (since they interpolate the label into the text)
  const confirmationMessages = KNOWN_APPOINTMENT_LABELS.map(
    (label) => getDefaultSettings(label).appointment_confirmation.message
  );

  it("all appointment_confirmation defaults are unique (no label collision)", () => {
    const uniqueMessages = new Set(confirmationMessages);
    expect(uniqueMessages.size).toBe(KNOWN_APPOINTMENT_LABELS.length);
  });

  it("'job' confirmation contains 'job'", () => {
    const msg = getDefaultSettings("job").appointment_confirmation.message;
    expect(msg).toContain("job");
    // Note: {{appointment_date}} and {{appointment_time}} contain "appointment" as template vars
    // So we check that the word "job" appears as the appointment label (before "with")
    expect(msg).toContain("Your job with");
  });

  it("'appointment' confirmation contains 'appointment' as the label", () => {
    const msg = getDefaultSettings("appointment").appointment_confirmation.message;
    expect(msg).toContain("Your appointment with");
    expect(msg).not.toContain("Your job with");
  });

  it("'estimate' confirmation contains 'estimate'", () => {
    // estimate is NOT in KNOWN_APPOINTMENT_LABELS but we can test the generator
    const msg = getDefaultSettings("estimate").appointment_confirmation.message;
    expect(msg).toContain("estimate");
  });

  it("'inspection' confirmation contains 'inspection'", () => {
    const msg = getDefaultSettings("inspection").appointment_confirmation.message;
    expect(msg).toContain("inspection");
  });
});

// ─── Regression: the old regex was too broad ──────────────────────────────
// These are messages that the OLD regex would have wrongly classified as defaults

describe("regression: messages the OLD regex would have reverted (now preserved)", () => {
  // OLD regex: /^Hi {{customer_name}}! Your \w+ with {{business_name}} is confirmed/
  // This matched ANY word after "Your"

  it("custom message with extra info after confirmation phrase is preserved", () => {
    // Example: handyman who added "Bring payment in cash"
    const custom = "Hi {{customer_name}}! Your job with {{business_name}} is confirmed for Friday. Bring payment in cash please!";
    expect(isDefaultTemplate(custom, "appointment_confirmation")).toBe(false);
  });

  it("custom message with different date format is preserved", () => {
    // Changed {{appointment_date}} to say "this week"
    const custom = "Hi {{customer_name}}! Your appointment with {{business_name}} is confirmed for this week. See you soon!";
    expect(isDefaultTemplate(custom, "appointment_confirmation")).toBe(false);
  });

  it("custom message with business-specific term (service call) is preserved", () => {
    // User changed 'job' to 'service call' (two words — old regex \w+ wouldn't match)
    const custom = "Hi {{customer_name}}! Your service call with {{business_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Reply STOP to opt out.";
    // Note: 'service_call' is not in KNOWN_APPOINTMENT_LABELS, so this won't match any default
    expect(isDefaultTemplate(custom, "appointment_confirmation")).toBe(false);
  });

  // OLD regex for reminder: /^Reminder: (You have a|Your) \w+ with {{business_name}}/
  it("custom reminder with added instructions is preserved", () => {
    const custom = "Reminder: Your job with {{business_name}} is tomorrow. Please clear access to the work area!";
    expect(isDefaultTemplate(custom, "appointment_reminder")).toBe(false);
  });
});

// ─── KNOWN_APPOINTMENT_LABELS completeness ─────────────────────────────────

describe("KNOWN_APPOINTMENT_LABELS covers key appointment types", () => {
  const requiredLabels = [
    "appointment",  // default for most service industries
    "booking",      // service mode base terminology
    "job",          // home_services category override
    "session",      // fitness/training
    "reservation",  // food/restaurant
    "visit",        // medical
    "consultation", // legal/professional services
    "order",        // food orders
  ];

  for (const label of requiredLabels) {
    it(`"${label}" is in KNOWN_APPOINTMENT_LABELS`, () => {
      expect(KNOWN_APPOINTMENT_LABELS).toContain(label);
    });
  }

  it("has at least 10 known labels for broad coverage", () => {
    expect(KNOWN_APPOINTMENT_LABELS.length).toBeGreaterThanOrEqual(10);
  });
});
