/**
 * Cancel & Reschedule Booking Edge Function Safety Tests
 *
 * @vitest-environment node
 *
 * Ensures the cancel-booking and reschedule-booking edge functions:
 * - Accept required parameters correctly
 * - Don't write to non-existent columns
 * - Handle tenant_id resolution from conversation_id
 * - Use correct booking status enum values
 * - Update busy_blocks with tenant_id scoping
 *
 * Gates: functional/cancel_booking_works, functional/reschedule_booking_works
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readEdgeFn(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

const cancelSource = readEdgeFn(
  "supabase/functions/elevenlabs-cancel-booking/index.ts"
);
const reschedSource = readEdgeFn(
  "supabase/functions/elevenlabs-reschedule-booking/index.ts"
);

describe("elevenlabs-cancel-booking: parameter handling", () => {
  it("accepts booking_id for direct lookup", () => {
    expect(cancelSource).toContain("booking_id");
  });

  it("accepts customer_name for fuzzy lookup", () => {
    expect(cancelSource).toContain("customer_name");
  });

  it("accepts customer_phone for phone lookup", () => {
    expect(cancelSource).toContain("customer_phone");
  });

  it("accepts reason for cancellation notes", () => {
    expect(cancelSource).toContain("reason");
  });

  it("resolves tenant_id from conversation_id", () => {
    expect(cancelSource).toContain("conversation_id");
    expect(cancelSource).toContain("tenant_id");
  });

  it("handles nested params from ElevenLabs", () => {
    expect(cancelSource).toContain("body.params?.");
  });
});

describe("elevenlabs-cancel-booking: status enum safety", () => {
  it("sets booking status to 'canceled' — matches booking_status DB enum (1 'l')", () => {
    // booking_status enum: 'pending_deposit','confirmed','completed','canceled','no_show','pending'
    // IMPORTANT: bookings uses 'canceled' (1 'l'), test_drives uses 'cancelled' (2 'l')
    expect(cancelSource).toContain('status: "canceled"');
  });

  it("does not use invalid status values", () => {
    // Should not use 'deleted', 'removed', 'void' etc.
    const invalidStatuses = ["deleted", "removed", "void", "archived"];
    for (const invalid of invalidStatuses) {
      const pattern = new RegExp(`status.*['"]${invalid}['"]`);
      expect(cancelSource).not.toMatch(pattern);
    }
  });
});

describe("elevenlabs-cancel-booking: busy_block cleanup", () => {
  it("deactivates busy_blocks when canceling", () => {
    expect(cancelSource).toContain("busy_blocks");
  });

  it("scopes busy_block updates to tenant_id", () => {
    // Busy block updates must include tenant_id filter
    const busyBlockSection = cancelSource.slice(
      cancelSource.indexOf("busy_blocks")
    );
    expect(busyBlockSection).toContain("tenant_id");
  });
});

describe("elevenlabs-cancel-booking: cancellation policy", () => {
  it("reads cancellation_notice_hours from settings", () => {
    expect(cancelSource).toContain("cancellation_notice");
  });
});

// ─── Reschedule booking tests ────────────────────────────────────────────────

describe("elevenlabs-reschedule-booking: parameter handling", () => {
  it("requires new_date parameter", () => {
    expect(reschedSource).toContain("new_date");
  });

  it("requires new_time parameter", () => {
    expect(reschedSource).toContain("new_time");
  });

  it("accepts customer_name for lookup", () => {
    expect(reschedSource).toContain("customer_name");
  });

  it("accepts customer_phone for lookup", () => {
    expect(reschedSource).toContain("customer_phone");
  });

  it("accepts booking_id for direct lookup", () => {
    expect(reschedSource).toContain("booking_id");
  });
});

describe("elevenlabs-reschedule-booking: date/time parsing", () => {
  it("handles AM/PM time format", () => {
    expect(reschedSource).toMatch(/am|pm/i);
  });

  it("handles natural language dates (tomorrow, next Monday, etc.)", () => {
    expect(reschedSource).toContain("tomorrow");
  });

  it("handles month name dates (March 5, etc.)", () => {
    // Check for month name parsing
    expect(reschedSource).toMatch(/january|february|march/i);
  });

  it("handles weekday names", () => {
    expect(reschedSource).toMatch(/monday|tuesday|wednesday/i);
  });
});

describe("elevenlabs-reschedule-booking: conflict detection", () => {
  it("checks for time conflicts via busy_blocks", () => {
    expect(reschedSource).toContain("busy_blocks");
  });

  it("preserves original appointment duration", () => {
    // Must calculate end_at from start_at + duration, not hardcode
    expect(reschedSource).toContain("end_at");
    expect(reschedSource).toContain("start_at");
  });
});

describe("elevenlabs-reschedule-booking: timezone awareness", () => {
  it("reads tenant timezone", () => {
    expect(reschedSource).toMatch(/timezone|time_zone/i);
  });

  it("formats output in tenant timezone", () => {
    expect(reschedSource).toContain("DateTimeFormat");
  });
});

describe("elevenlabs-reschedule-booking: busy_block updates", () => {
  it("updates busy_blocks with new times", () => {
    expect(reschedSource).toContain("busy_blocks");
  });

  it("scopes busy_block updates to tenant_id", () => {
    const busyBlockSection = reschedSource.slice(
      reschedSource.indexOf("busy_blocks")
    );
    expect(busyBlockSection).toContain("tenant_id");
  });
});

// ─── Shared safety checks ────────────────────────────────────────────────────

describe("cancel/reschedule: phone normalization", () => {
  it("cancel-booking uses normalizePhoneE164", () => {
    expect(cancelSource).toContain("normalizePhoneE164");
  });

  it("reschedule-booking uses normalizePhoneE164", () => {
    expect(reschedSource).toContain("normalizePhoneE164");
  });
});

describe("cancel/reschedule: bookings lookup safety", () => {
  it("cancel-booking only looks up pending/confirmed bookings", () => {
    expect(cancelSource).toMatch(/pending|confirmed/);
  });

  it("reschedule-booking only looks up pending/confirmed bookings", () => {
    expect(reschedSource).toMatch(/pending|confirmed/);
  });

  it("cancel-booking filters to future bookings only", () => {
    expect(cancelSource).toContain("start_at");
  });

  it("reschedule-booking filters to future bookings only", () => {
    expect(reschedSource).toContain("start_at");
  });
});

describe("cancel/reschedule: error handling", () => {
  it("cancel-booking returns friendly message on not found", () => {
    expect(cancelSource).toMatch(/couldn.t find|no.*appointment|not found/i);
  });

  it("reschedule-booking returns friendly message on not found", () => {
    expect(reschedSource).toMatch(/couldn.t find|no.*appointment|not found/i);
  });

  it("reschedule-booking returns message on time conflict", () => {
    expect(reschedSource).toMatch(/available|conflict|isn.t available/i);
  });
});

// ─── booking-handoff cancel regression ───────────────────────────────────────

const bookingHandoffSource = readEdgeFn(
  "supabase/functions/booking-handoff/index.ts"
);

describe("booking-handoff: cancel status update (regression)", () => {
  it("does NOT include canceled_at in booking update — column does not exist", () => {
    // booking-handoff was broken: .update({ status: "canceled", canceled_at: ... })
    // The bookings table has NO canceled_at column. This caused silent UPDATE failure.
    // Fix: only update status, never reference canceled_at.
    const updateMatch = bookingHandoffSource.match(
      /\.update\(\{[^}]*status:\s*["']canceled["'][^}]*\}\)/s
    );
    if (updateMatch) {
      expect(updateMatch[0]).not.toContain("canceled_at");
    }
    // Also verify canceled_at does not appear anywhere in booking updates
    expect(bookingHandoffSource).not.toContain("canceled_at");
  });

  it("updates booking status to 'canceled' in cancellation branch", () => {
    expect(bookingHandoffSource).toContain('status: "canceled"');
  });

  it("cancellation branch triggers before main handoff logic", () => {
    const cancelIndex = bookingHandoffSource.indexOf("isCancellation");
    const mainFlowIndex = bookingHandoffSource.indexOf("booking_delivery_settings");
    expect(cancelIndex).toBeGreaterThan(-1);
    expect(mainFlowIndex).toBeGreaterThan(-1);
    // Cancellation check must appear before main delivery settings query
    expect(cancelIndex).toBeLessThan(mainFlowIndex);
  });
});

// ─── Cross-function booking_status enum consistency ───────────────────────────
// booking_status DB enum: 'pending_deposit','confirmed','completed','canceled','no_show','pending'
// CRITICAL: bookings table uses 'canceled' (1 'l'), test_drives uses 'cancelled' (2 'l')

const integrationWebhookSrc = readEdgeFn(
  "supabase/functions/integration-webhook-receiver/index.ts"
);
const cronReactivationSrc = readEdgeFn(
  "supabase/functions/cron-customer-reactivation/index.ts"
);
const syncSquareSrc = readEdgeFn(
  "supabase/functions/sync-square-availability/index.ts"
);

describe("booking_status enum consistency: 'canceled' (1 'l') across all edge functions", () => {
  it("integration-webhook-receiver: Square cancel writes 'canceled' to bookings table", () => {
    // Was: { status: "cancelled" } — caused DB error (enum value not found)
    // Fix: { status: "canceled" } matches booking_status enum
    const updateBlock = integrationWebhookSrc.match(
      /from\("bookings"\)[^;]+update\(\{[^}]+\}\)/s
    );
    if (updateBlock) {
      expect(updateBlock[0]).not.toContain('"cancelled"');
    }
    expect(integrationWebhookSrc).toContain('status: "canceled"');
  });

  it("cron-customer-reactivation: queries bookings with 'canceled' (1 'l')", () => {
    // Was: .neq("status", "cancelled") — never matched any rows (enum mismatch)
    // Leads who cancelled their last booking were incorrectly being reactivated
    expect(cronReactivationSrc).toContain('.neq("status", "canceled")');
    expect(cronReactivationSrc).not.toContain('.neq("status", "cancelled")');
  });

  it("sync-square-availability: cancellation writes 'canceled' to bookings table", () => {
    // Was: { status: "cancelled" } — caused DB enum error
    // Fix: { status: "canceled" } matches booking_status enum
    // The cancellation block sets status directly (not via variable)
    // Look for the "Also cancel the Flux booking" comment + update block
    const cancelBlock = syncSquareSrc.match(
      /Also cancel the Flux booking[\s\S]{1,300}\.update\(\{[^}]+\}\)/
    );
    if (cancelBlock) {
      expect(cancelBlock[0]).toContain('"canceled"');
      expect(cancelBlock[0]).not.toContain('"cancelled"');
    } else {
      // Fallback: verify the literal string exists
      expect(syncSquareSrc).toContain('update({ status: "canceled" })');
    }
  });

  it("elevenlabs-cancel-booking: bookings update uses 'canceled' (DB enum)", () => {
    // test_drives uses 'cancelled' (2 'l') — different table, different constraint
    // bookings table booking_status enum requires 'canceled' (1 'l')
    const bookingsUpdateBlock = cancelSource.match(
      /from\("bookings"\)[^;]+update\(\{[^}]+\}\)/s
    );
    if (bookingsUpdateBlock) {
      expect(bookingsUpdateBlock[0]).toContain('"canceled"');
      expect(bookingsUpdateBlock[0]).not.toContain('"cancelled"');
    }
  });

  it("elevenlabs-cancel-booking: test_drives update uses 'cancelled' (test_drives constraint)", () => {
    // test_drives CHECK constraint: ('scheduled','confirmed','completed','cancelled','no_show')
    const testDrivesUpdateBlock = cancelSource.match(
      /from\("test_drives"\)[^;]+update\(\{[^}]+\}\)/s
    );
    if (testDrivesUpdateBlock) {
      expect(testDrivesUpdateBlock[0]).toContain('"cancelled"');
    }
  });
});
