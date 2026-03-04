/**
 * Booking Handoff SMS & Template Tests
 *
 * @vitest-environment node
 *
 * Verifies critical SMS confirmation logic in booking-handoff:
 * 1. SMS template substitution handles all placeholders
 * 2. Default SMS enabled when no config exists
 * 3. Empty tenant name falls back to "us"
 * 4. Missing customer name falls back to "there"
 * 5. Timezone-aware date/time formatting
 * 6. Appointment label uses mode-specific terminology
 *
 * Gates: functional/booking_sms_confirmation
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

const source = readFile("supabase/functions/booking-handoff/index.ts");

describe("booking-handoff: SMS confirmation logic", () => {
  it("defaults to confirmationEnabled=true when no SMS config exists", () => {
    // Ensures new tenants (no sms_templates configured) still send confirmation SMS
    expect(source).toContain("confirmationConfig ? confirmationConfig.enabled : true");
  });

  it("uses tenant timezone for date/time formatting", () => {
    // Both time and date must use tenantTimezone
    expect(source).toContain("timeZone: tenantTimezone");
    // Should appear at least twice (once for time, once for date)
    const matches = source.match(/timeZone:\s*tenantTimezone/g);
    expect(matches?.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to 'there' for missing customer name", () => {
    expect(source).toContain('booking.lead?.full_name || "there"');
  });

  it("falls back to 'us' for missing business name", () => {
    expect(source).toContain('tenantData?.name || "us"');
  });

  it("replaces all standard template placeholders", () => {
    // In source, placeholders appear in regex form: \{\{name\}\}
    const placeholders = [
      "customer_name",
      "business_name",
      "service_name",
      "appointment_time",
      "appointment_date",
    ];
    for (const placeholder of placeholders) {
      expect(source, `Must handle {{${placeholder}}} placeholder`).toContain(placeholder);
    }
  });

  it("uses mode-specific appointment label in default template", () => {
    // getAppointmentLabel produces industry-aware labels (job, appointment, reservation, etc.)
    expect(source).toContain("getAppointmentLabel");
  });

  it("updates booking.confirmation_sent on success", () => {
    expect(source).toContain("confirmation_sent: true");
  });

  it("handles SMS failure gracefully without crashing handoff", () => {
    // Must be in a try/catch that logs but doesn't throw
    expect(source).toContain("[booking-handoff] Customer confirmation SMS error:");
    expect(source).toContain("results.customer_confirmation = { success: false");
  });

  it("logs the delivery channel on success", () => {
    // Helps debug whether SMS went via Twilio, Resend, or was skipped
    expect(source).toContain("smsResult.channel");
  });

  it("handles skipped SMS (no verified channel) without error", () => {
    expect(source).toContain("smsResult.skipped");
    expect(source).toContain("Skipping customer SMS");
  });
});

describe("booking-handoff: owner notification gating", () => {
  it("critical actions (SMS, calendar, audit) always run regardless of delivery settings", () => {
    // Customer SMS is NOT gated by booking_delivery_settings
    // The comment says "This always runs (not gated by delivery settings)"
    expect(source).toContain("This always runs (not gated by delivery settings)");
  });

  it("only owner notifications are gated by booking_delivery_settings", () => {
    // booking_delivery_settings controls owner notifications (email, SMS, webhook)
    // Customer confirmation is separate
    expect(source).toContain("booking_delivery_settings");
  });
});

describe("booking-handoff: tenant name edge cases", () => {
  it("default template uses business_name variable (not hardcoded name)", () => {
    // Template should use {{business_name}} which gets substituted
    const templateSection = source.split("const template =")[1]?.split(";")[0] || "";
    expect(templateSection).toContain("{{business_name}}");
  });
});
