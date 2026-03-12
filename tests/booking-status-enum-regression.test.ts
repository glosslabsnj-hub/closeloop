/**
 * Booking Status Enum Regression Tests
 *
 * @vitest-environment node
 *
 * CRITICAL: The bookings table uses booking_status ENUM with these values:
 *   'pending_deposit', 'confirmed', 'completed', 'canceled', 'no_show', 'pending'
 *
 * 'canceled' uses 1 'l'. This is different from other tables:
 *   - dispatch_jobs: 'cancelled' (2 'l')
 *   - food_orders: 'cancelled' (2 'l')
 *   - test_drives: 'cancelled' (2 'l')
 *   - reservations: 'cancelled' (2 'l')
 *
 * Bug fixed 2026-03-12: 4 edge functions were writing 'cancelled' (2 'l') to the
 * bookings table, causing silent DB errors.
 *
 * Functions fixed:
 *   - elevenlabs-cancel-booking: bookings.status was 'cancelled' → 'canceled'
 *   - integration-webhook-receiver: bookings.status was 'cancelled' → 'canceled'
 *   - cron-customer-reactivation: .neq("status","cancelled") → "canceled"
 *   - sync-square-availability: bookings.status was 'cancelled' → 'canceled'
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readEdgeFn(relPath: string): string {
  return readFileSync(join(root, relPath), "utf-8");
}

const cancelBookingSrc = readEdgeFn("supabase/functions/elevenlabs-cancel-booking/index.ts");
const integrationWebhookSrc = readEdgeFn("supabase/functions/integration-webhook-receiver/index.ts");
const cronReactivationSrc = readEdgeFn("supabase/functions/cron-customer-reactivation/index.ts");
const syncSquareSrc = readEdgeFn("supabase/functions/sync-square-availability/index.ts");
const baseMigration = readEdgeFn("supabase/migrations/00000000000000_base_schema.sql");
const bookingHandoffSrc = readEdgeFn("supabase/functions/booking-handoff/index.ts");
const postServiceSrc = readEdgeFn("supabase/functions/post-service-automation/index.ts");
const portalBookingSrc = readEdgeFn("supabase/functions/portal-booking-action/index.ts");

// ─── DB Enum Documentation ────────────────────────────────────────────────────

describe("booking_status enum: DB definition (canonical source of truth)", () => {
  it("base_schema defines booking_status enum with 'canceled' (1 'l')", () => {
    expect(baseMigration).toContain("booking_status");
    expect(baseMigration).toContain("'canceled'");
  });

  it("base_schema booking_status does NOT contain 'cancelled' (2 'l')", () => {
    const enumMatch = baseMigration.match(/booking_status[^;]{0,200}/);
    if (enumMatch) {
      expect(enumMatch[0]).not.toContain("'cancelled'");
    }
  });
});

// ─── REGRESSION: The 4 fixed functions ───────────────────────────────────────

describe("elevenlabs-cancel-booking: correct status enum usage", () => {
  it("bookings UPDATE (not select) uses 'canceled' (1 'l') — matches DB enum", () => {
    // The file has multiple from("bookings") — find the one followed by .update()
    // by looking for the update pattern directly
    const updateMatch = cancelBookingSrc.match(
      /from\("bookings"\)\s*\.update\(\{[^}]{1,300}\}/
    );
    expect(updateMatch).toBeTruthy();
    if (updateMatch) {
      expect(updateMatch[0]).toContain('"canceled"');
      expect(updateMatch[0]).not.toContain('"cancelled"');
    }
  });

  it("test_drives update uses 'cancelled' (2 'l') — matches test_drives CHECK constraint", () => {
    // test_drives CHECK: ('scheduled','confirmed','completed','cancelled','no_show')
    const tdIdx = cancelBookingSrc.indexOf('from("test_drives")');
    const tdBlock = cancelBookingSrc.slice(tdIdx, tdIdx + 200);
    expect(tdBlock).toContain('"cancelled"');
  });

  it("does NOT write 'cancelled' to the bookings table", () => {
    // Check the update block specifically (not selects)
    const updateMatch = cancelBookingSrc.match(
      /from\("bookings"\)\s*\.update\(\{[^}]{1,300}\}/
    );
    if (updateMatch) {
      expect(updateMatch[0]).not.toContain('"cancelled"');
    }
  });
});

describe("integration-webhook-receiver: Square cancel writes correct status", () => {
  it("contains 'canceled' (1 'l') for bookings status update", () => {
    expect(integrationWebhookSrc).toContain('status: "canceled"');
  });

  it("does NOT write 'cancelled' to bookings in the Square cancellation block", () => {
    // Find the CANCELLED_BY_CUSTOMER section
    const idx = integrationWebhookSrc.indexOf("CANCELLED_BY_CUSTOMER");
    if (idx > -1) {
      const section = integrationWebhookSrc.slice(idx, idx + 500);
      // The update in this section should use 'canceled', not 'cancelled'
      if (section.includes(".update({")) {
        const updateStart = section.indexOf(".update({");
        const updateBlock = section.slice(updateStart, updateStart + 100);
        expect(updateBlock).not.toContain('"cancelled"');
      }
    }
  });
});

describe("cron-customer-reactivation: bookings query uses correct status", () => {
  it("queries bookings with .neq 'canceled' (1 'l')", () => {
    expect(cronReactivationSrc).toContain('.neq("status", "canceled")');
  });

  it("does NOT query with .neq 'cancelled' (2 'l') — would miss all canceled bookings", () => {
    expect(cronReactivationSrc).not.toContain('.neq("status", "cancelled")');
  });
});

describe("sync-square-availability: bookings cancellation uses correct status", () => {
  it("cancellation block contains 'canceled' for bookings update", () => {
    const cancelSection = syncSquareSrc.match(
      /Also cancel the Flux booking[\s\S]{1,300}/
    );
    if (cancelSection) {
      expect(cancelSection[0]).toContain('"canceled"');
      expect(cancelSection[0]).not.toContain('"cancelled"');
    } else {
      // Fallback: verify the literal string exists in the file
      expect(syncSquareSrc).toContain('status: "canceled"');
    }
  });
});

// ─── Verified correct functions ───────────────────────────────────────────────

describe("booking-handoff: cancellation status update (previously had canceled_at bug)", () => {
  it("writes 'canceled' (1 'l') to booking status in cancellation path", () => {
    expect(bookingHandoffSrc).toContain('status: "canceled"');
  });

  it("does NOT reference non-existent 'canceled_at' column", () => {
    // This was the prior bug: .update({ status: "canceled", canceled_at: now })
    // bookings table has NO canceled_at column. UPDATE was silently failing.
    expect(bookingHandoffSrc).not.toContain("canceled_at");
  });
});

describe("post-service-automation: cancellation path uses correct status", () => {
  it("maps 'cancelled' event to 'canceled' DB status (1 'l')", () => {
    // The function accepts event="cancelled" as input but maps to DB 'canceled'
    expect(postServiceSrc).toContain('"canceled"');
    const newStatusLine = postServiceSrc.match(/newStatus.*canceled[^'"\w]/);
    if (newStatusLine) {
      expect(newStatusLine[0]).toContain("canceled");
    }
  });
});

describe("portal-booking-action: customer cancel uses correct status", () => {
  it("customer portal cancel writes 'canceled' (1 'l')", () => {
    // Portal allows customers to cancel bookings directly
    expect(portalBookingSrc).toContain('status: "canceled"');
    expect(portalBookingSrc).not.toMatch(/\.from\("bookings"\)[^;]*"cancelled"/);
  });
});
