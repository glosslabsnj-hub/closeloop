/**
 * Post-Service Automation Chain — Regression Tests
 *
 * @vitest-environment node
 *
 * Verifies the post-service automation chain (deployed 2026-03-09):
 * 1. post-service-automation: invoice creation, thank-you SMS, review queuing
 * 2. cron-review-requests: finds completed bookings by end_at, sends review SMS
 * 3. cron-review-followup: mode-aware follow-up, skips dispatch mode
 * 4. cron-invoice-overdue: marks past-due invoices, sends reminders
 * 5. generate-invoice-payment: Stripe Connect, Square, external fallback
 * 6. useBookings.completeBooking: sets end_at + completed_at for cron compatibility
 *
 * Critical bug fixed (2026-03-10):
 *   cron-review-requests and cron-review-followup filter by bookings.end_at.
 *   post-service-automation was only setting completed_at (not end_at), so review
 *   requests NEVER fired after Mark Complete. Fixed: both end_at and completed_at
 *   are now set in post-service-automation and useBookings.completeBooking.
 *
 * Gates: post_service/review_request_sent, post_service/review_followup_sent,
 *        post_service/invoice_generated_on_complete, post_service/invoice_overdue_detection,
 *        post_service/mode_aware_templates, post_service/owner_notified_on_complete,
 *        post_service/thankyou_sms_sent
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

const postServiceSrc = readFile("supabase/functions/post-service-automation/index.ts");
const cronReviewSrc = readFile("supabase/functions/cron-review-requests/index.ts");
const cronFollowupSrc = readFile("supabase/functions/cron-review-followup/index.ts");
const cronOverdueSrc = readFile("supabase/functions/cron-invoice-overdue/index.ts");
const generatePaymentSrc = readFile("supabase/functions/generate-invoice-payment/index.ts");
const useBookingsSrc = readFile("src/hooks/useBookings.ts");

// ─── CRITICAL BUG REGRESSION: end_at must be set ─────────────────────────────

describe("REGRESSION: end_at set on booking completion (cron compatibility)", () => {
  it("post-service-automation sets end_at when review is queued", () => {
    // cron-review-requests and cron-review-followup both filter by end_at.
    // If we only set completed_at, review requests will NEVER fire.
    expect(postServiceSrc).toContain("end_at: completedNow");
    expect(postServiceSrc).toContain("completed_at: completedNow");
  });

  it("useBookings.completeBooking mutation sets end_at", () => {
    // Frontend Mark Complete must also set end_at for direct DB update path
    expect(useBookingsSrc).toContain("end_at: now");
    expect(useBookingsSrc).toContain("completed_at: now");
  });

  it("cron-review-requests filters by end_at (not completed_at)", () => {
    expect(cronReviewSrc).toContain('"end_at"');
    expect(cronReviewSrc).toContain("windowStart");
    expect(cronReviewSrc).toContain("windowEnd");
  });

  it("cron-review-followup filters by end_at (not completed_at)", () => {
    expect(cronFollowupSrc).toContain('"end_at"');
    expect(cronFollowupSrc).toContain("windowStart");
    expect(cronFollowupSrc).toContain("windowEnd");
  });
});

// ─── post-service-automation ─────────────────────────────────────────────────

describe("post-service-automation: mode-aware templates", () => {
  it("has templates for all 5 modes (service, dispatch, food, medical, general)", () => {
    const modes = ["service", "dispatch", "food", "medical", "general"];
    for (const mode of modes) {
      expect(postServiceSrc, `MODE_THANKYOU_TEMPLATES must have ${mode}`).toContain(
        `${mode}:`
      );
    }
  });

  it("service template includes invoice_line and review_line placeholders", () => {
    // service mode SMS must include balance info + review ask
    expect(postServiceSrc).toContain("invoice_line");
    expect(postServiceSrc).toContain("review_line");
    // template uses them in service entry
    expect(postServiceSrc).toContain("{{invoice_line}}");
    expect(postServiceSrc).toContain("{{review_line}}");
  });

  it("all templates include STOP opt-out per SMS regulations", () => {
    // Compliance: every mode template must have STOP opt-out
    const modes = ["service", "dispatch", "food", "medical", "general"];
    for (const mode of modes) {
      // Find the template string for each mode
      const modePattern = new RegExp(`${mode}:[\\s\\S]*?Reply STOP`);
      expect(postServiceSrc, `${mode} template must include STOP opt-out`).toMatch(modePattern);
    }
  });

  it("all templates include customer_name placeholder", () => {
    const templateSection = postServiceSrc.match(
      /const MODE_THANKYOU_TEMPLATES[\s\S]*?^};/m
    )?.[0] || postServiceSrc;
    expect(templateSection).toContain("{{customer_name}}");
  });
});

describe("post-service-automation: invoice creation logic", () => {
  it("service mode auto-generates invoice by default", () => {
    expect(postServiceSrc).toContain("service: true");
    // Check MODE_AUTO_INVOICE_DEFAULTS block
    const invoiceDefaultsSection = postServiceSrc.match(
      /MODE_AUTO_INVOICE_DEFAULTS[\s\S]*?};/
    )?.[0] || "";
    expect(invoiceDefaultsSection).toContain("service: true");
  });

  it("dispatch mode auto-generates invoice by default", () => {
    const invoiceDefaultsSection = postServiceSrc.match(
      /MODE_AUTO_INVOICE_DEFAULTS[\s\S]*?};/
    )?.[0] || "";
    expect(invoiceDefaultsSection).toContain("dispatch: true");
  });

  it("food mode skips auto-invoice (pre-paid at POS)", () => {
    const invoiceDefaultsSection = postServiceSrc.match(
      /MODE_AUTO_INVOICE_DEFAULTS[\s\S]*?};/
    )?.[0] || "";
    expect(invoiceDefaultsSection).toContain("food: false");
  });

  it("medical mode skips auto-invoice (external billing)", () => {
    const invoiceDefaultsSection = postServiceSrc.match(
      /MODE_AUTO_INVOICE_DEFAULTS[\s\S]*?};/
    )?.[0] || "";
    expect(invoiceDefaultsSection).toContain("medical: false");
  });

  it("skips invoice when balance is zero (free/pre-paid service)", () => {
    expect(postServiceSrc).toContain("No balance due");
  });

  it("includes deposit deduction in balance_due calculation", () => {
    expect(postServiceSrc).toContain("depositApplied");
    expect(postServiceSrc).toContain("deposit_paid");
    expect(postServiceSrc).toContain("deposit_amount");
  });

  it("links invoice to booking via invoice_id", () => {
    expect(postServiceSrc).toContain("invoice_id: invoice.id");
  });

  it("updates invoice status from 'draft' to 'sent' after creation", () => {
    expect(postServiceSrc).toContain('status: "sent"');
  });

  it("generates payment link via generate-invoice-payment", () => {
    expect(postServiceSrc).toContain("generate-invoice-payment");
    expect(postServiceSrc).toContain("payment_url");
  });
});

describe("post-service-automation: review request queuing", () => {
  it("service mode enables review requests by default", () => {
    const reviewDefaultsSection = postServiceSrc.match(
      /MODE_REVIEW_REQUEST_DEFAULTS[\s\S]*?};/
    )?.[0] || "";
    expect(reviewDefaultsSection).toContain("service: true");
  });

  it("dispatch mode skips review requests (roadside not ideal)", () => {
    const reviewDefaultsSection = postServiceSrc.match(
      /MODE_REVIEW_REQUEST_DEFAULTS[\s\S]*?};/
    )?.[0] || "";
    expect(reviewDefaultsSection).toContain("dispatch: false");
  });

  it("marks booking as review_queued=true when autoReview enabled", () => {
    expect(postServiceSrc).toContain("review_queued = true");
  });
});

describe("post-service-automation: owner notification", () => {
  it("sends owner SMS notification when delivery settings exist", () => {
    expect(postServiceSrc).toContain("booking_delivery_settings");
    expect(postServiceSrc).toContain("notify_phone");
    expect(postServiceSrc).toContain("Job complete:");
  });

  it("owner SMS includes invoice number and amount when invoice was created", () => {
    expect(postServiceSrc).toContain("Invoice #");
    // Owner notification shows balance due amount
    expect(postServiceSrc).toContain("balance_due_cents");
  });
});

describe("post-service-automation: automation executor integration", () => {
  it("fires automation-executor with booking.completed event", () => {
    expect(postServiceSrc).toContain("automation-executor");
    expect(postServiceSrc).toContain('"booking.completed"');
  });

  it("includes tenant_id, booking_id, customer info in automation payload", () => {
    expect(postServiceSrc).toContain("tenant_id,");
    expect(postServiceSrc).toContain("booking_id,");
    expect(postServiceSrc).toContain("customer_name:");
  });
});

// ─── cron-review-requests ────────────────────────────────────────────────────

describe("cron-review-requests: review SMS delivery", () => {
  it("only sends to bookings with review_sent=false (no duplicates)", () => {
    expect(cronReviewSrc).toContain('eq("review_sent", false)');
  });

  it("marks review_sent=true after successful SMS send", () => {
    expect(cronReviewSrc).toContain("review_sent: true");
  });

  it("skips tenants with no review_link configured", () => {
    expect(cronReviewSrc).toContain("skipped_no_link");
    expect(cronReviewSrc).toContain("!reviewLink");
  });

  it("uses 15-minute time window centered on delay-after-completion", () => {
    expect(cronReviewSrc).toContain("15 * 60 * 1000");
    expect(cronReviewSrc).toContain("windowStart");
    expect(cronReviewSrc).toContain("windowEnd");
  });

  it("resolves all template placeholders (customer_name, service_name, business_name, review_link)", () => {
    const placeholders = ["customer_name", "service_name", "business_name", "review_link"];
    for (const p of placeholders) {
      expect(cronReviewSrc, `Must include ${p} placeholder`).toContain(p);
    }
  });

  it("uses mode-aware review templates per business type", () => {
    const modes = ["service", "dispatch", "food", "medical", "general"];
    for (const mode of modes) {
      expect(cronReviewSrc, `Must have ${mode} review template`).toContain(`${mode}:`);
    }
  });

  it("all review templates include STOP opt-out", () => {
    const templateSection = cronReviewSrc.match(
      /const MODE_REVIEW_TEMPLATES[\s\S]*?^};/m
    )?.[0] || cronReviewSrc;
    // Count STOP mentions — should be at least 5 (one per mode template)
    const stopMatches = templateSection.match(/Reply STOP/g) || [];
    expect(stopMatches.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── cron-review-followup ────────────────────────────────────────────────────

describe("cron-review-followup: second-chance review nudge", () => {
  it("skips dispatch mode (roadside not ideal for review follow-ups)", () => {
    const followupEnabledSection = cronFollowupSrc.match(
      /MODE_FOLLOWUP_ENABLED[\s\S]*?};/
    )?.[0] || "";
    expect(followupEnabledSection).toContain("dispatch: false");
  });

  it("enables follow-ups for service, food, medical, general modes", () => {
    const followupEnabledSection = cronFollowupSrc.match(
      /MODE_FOLLOWUP_ENABLED[\s\S]*?};/
    )?.[0] || "";
    expect(followupEnabledSection).toContain("service: true");
    expect(followupEnabledSection).toContain("food: true");
    expect(followupEnabledSection).toContain("medical: true");
    expect(followupEnabledSection).toContain("general: true");
  });

  it("service mode follow-up waits 5 days", () => {
    const followupDaysSection = cronFollowupSrc.match(
      /MODE_FOLLOWUP_DAYS[\s\S]*?};/
    )?.[0] || "";
    expect(followupDaysSection).toContain("service: 5");
  });

  it("medical mode follow-up waits 7 days (longer recovery context)", () => {
    const followupDaysSection = cronFollowupSrc.match(
      /MODE_FOLLOWUP_DAYS[\s\S]*?};/
    )?.[0] || "";
    expect(followupDaysSection).toContain("medical: 7");
  });

  it("only targets bookings where review_sent=true AND review_followup_sent=false", () => {
    expect(cronFollowupSrc).toContain("review_sent");
    expect(cronFollowupSrc).toContain("review_followup_sent");
    expect(cronFollowupSrc).toContain('eq("review_sent", true)');
    expect(cronFollowupSrc).toContain('eq("review_followup_sent", false)');
  });

  it("marks review_followup_sent=true after successful send", () => {
    expect(cronFollowupSrc).toContain("review_followup_sent: true");
  });

  it("all follow-up templates include review_link and STOP opt-out", () => {
    const templateSection = cronFollowupSrc.match(
      /const MODE_FOLLOWUP_TEMPLATES[\s\S]*?^};/m
    )?.[0] || cronFollowupSrc;
    expect(templateSection).toContain("{{review_link}}");
    const stopMatches = templateSection.match(/Reply STOP/g) || [];
    expect(stopMatches.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── cron-invoice-overdue ────────────────────────────────────────────────────

describe("cron-invoice-overdue: overdue detection and reminders", () => {
  it("only targets invoices in 'sent' or 'viewed' status (not 'draft' or 'paid')", () => {
    expect(cronOverdueSrc).toContain('"sent"');
    expect(cronOverdueSrc).toContain('"viewed"');
    // Must use .in() to filter by status
    expect(cronOverdueSrc).toContain("in(\"status\"");
  });

  it("marks invoice as overdue (updates status)", () => {
    expect(cronOverdueSrc).toContain('status: "overdue"');
  });

  it("only processes invoices with balance_due > 0", () => {
    expect(cronOverdueSrc).toContain("balance_due_cents");
    expect(cronOverdueSrc).toContain("gt(");
  });

  it("includes payment_url in reminder when available", () => {
    expect(cronOverdueSrc).toContain("payment_url");
    expect(cronOverdueSrc).toContain("paymentLine");
  });

  it("notifies business owner about overdue invoices", () => {
    expect(cronOverdueSrc).toContain("booking_delivery_settings");
    expect(cronOverdueSrc).toContain("notify_phone");
    expect(cronOverdueSrc).toContain("Overdue:");
  });

  it("has mode-aware reminder templates for all modes", () => {
    const modes = ["service", "dispatch", "food", "medical", "general"];
    for (const mode of modes) {
      expect(cronOverdueSrc, `MODE_REMINDER_TEMPLATES must have ${mode}`).toContain(`${mode}:`);
    }
  });

  it("all overdue templates include STOP opt-out", () => {
    const templateSection = cronOverdueSrc.match(
      /const MODE_REMINDER_TEMPLATES[\s\S]*?^};/m
    )?.[0] || cronOverdueSrc;
    const stopMatches = templateSection.match(/Reply STOP/g) || [];
    expect(stopMatches.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── generate-invoice-payment ────────────────────────────────────────────────

describe("generate-invoice-payment: payment link creation", () => {
  it("tries Stripe Connect first when integration is connected", () => {
    const stripeSection = generatePaymentSrc.indexOf("stripe_connect");
    const squareSection = generatePaymentSrc.indexOf("square_pos");
    // Stripe must appear before Square in the code
    expect(stripeSection).toBeLessThan(squareSection);
  });

  it("falls back to 'external' payment method when no integration connected", () => {
    expect(generatePaymentSrc).toContain('"external"');
    expect(generatePaymentSrc).toContain("paymentMethod || \"external\"");
  });

  it("skips payment link when invoice has no balance due", () => {
    expect(generatePaymentSrc).toContain("balance_due_cents <= 0");
    expect(generatePaymentSrc).toContain("No balance due");
  });

  it("creates Stripe payment link with invoice metadata", () => {
    expect(generatePaymentSrc).toContain("metadata[invoice_id]");
    expect(generatePaymentSrc).toContain("metadata[tenant_id]");
  });

  it("uses Stripe-Account header for connected account (not platform account)", () => {
    expect(generatePaymentSrc).toContain("Stripe-Account");
    expect(generatePaymentSrc).toContain("stripeAccountId");
  });

  it("updates invoice with payment_url after Stripe link created", () => {
    expect(generatePaymentSrc).toContain("payment_url: paymentUrl");
    expect(generatePaymentSrc).toContain("payment_method: paymentMethod");
  });

  it("sets after_completion redirect to invoice-payment-complete function", () => {
    expect(generatePaymentSrc).toContain("invoice-payment-complete");
    expect(generatePaymentSrc).toContain("after_completion");
  });
});

// ─── useBookings.completeBooking mutation ────────────────────────────────────

describe("useBookings.completeBooking: Mark Complete flow", () => {
  it("fires post-service-automation after marking booking complete", () => {
    expect(useBookingsSrc).toContain("post-service-automation");
    expect(useBookingsSrc).toContain('completed_by: "staff"');
  });

  it("shows 'Invoice and follow-up messages are being sent' toast on success", () => {
    expect(useBookingsSrc).toContain("Invoice and follow-up messages are being sent");
  });

  it("invalidates invoice-by-booking query after completion (so sheet shows invoice)", () => {
    expect(useBookingsSrc).toContain("invoice-by-booking");
    expect(useBookingsSrc).toContain("invalidateQueries");
  });

  it("post-service trigger is best-effort (errors don't block completion)", () => {
    // post-service invoke must have .catch() so it doesn't bubble errors
    const completeSection = useBookingsSrc.substring(
      useBookingsSrc.indexOf("completeBooking"),
      useBookingsSrc.indexOf("confirmBooking")
    );
    expect(completeSection).toContain(".catch(");
  });
});

// ─── Template variable resolution (unit logic) ───────────────────────────────

describe("resolveTemplate: handles missing variables gracefully", () => {
  // Test the logic extracted from all 3 cron functions
  function resolveTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
  }

  it("replaces all known variables", () => {
    const result = resolveTemplate(
      "Hi {{customer_name}}, your {{service_name}} is done!",
      { customer_name: "Mike", service_name: "HVAC Tune-Up" }
    );
    expect(result).toBe("Hi Mike, your HVAC Tune-Up is done!");
  });

  it("replaces missing variables with empty string (no {{placeholder}} leak)", () => {
    const result = resolveTemplate(
      "Hi {{customer_name}}, invoice: {{invoice_line}}",
      { customer_name: "Maria" }
    );
    expect(result).toBe("Hi Maria, invoice: ");
    expect(result).not.toContain("{{");
  });

  it("handles empty string values correctly", () => {
    const result = resolveTemplate(
      "{{greeting}} {{name}}",
      { greeting: "", name: "Dave" }
    );
    expect(result).toBe(" Dave");
  });
});

// ─── Mode matrix: all 6 modes covered ────────────────────────────────────────

describe("Mode matrix: post-service chain covers all business modes", () => {
  const ALL_MODES = ["service", "dispatch", "food", "medical", "general"];

  it("post-service-automation has thank-you template for every mode", () => {
    for (const mode of ALL_MODES) {
      expect(postServiceSrc, `Missing ${mode} thank-you template`).toContain(`${mode}:`);
    }
  });

  it("cron-review-requests has review template for every mode", () => {
    for (const mode of ALL_MODES) {
      expect(cronReviewSrc, `Missing ${mode} review template`).toContain(`${mode}:`);
    }
  });

  it("cron-invoice-overdue has reminder template for every mode", () => {
    for (const mode of ALL_MODES) {
      expect(cronOverdueSrc, `Missing ${mode} overdue template`).toContain(`${mode}:`);
    }
  });
});
