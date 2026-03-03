/**
 * Callback & Booking Error Handling Tests
 *
 * @vitest-environment node
 *
 * Verifies critical error handling patterns:
 * 1. elevenlabs-create-callback must NOT swallow opportunity INSERT errors
 * 2. useBookings.ts must surface booking-handoff failures to the user (not just console.error)
 * 3. All fire-and-forget patterns must have structured logging with function context
 *
 * Bugs these tests prevent:
 * - Customer told "someone will call back" but no opportunity record created (silent DB error)
 * - Business owner told "customer notified" but booking-handoff failed silently
 *
 * Gates: functional/callback_request_works, functional/booking_sms_confirmation
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

// ─── elevenlabs-create-callback error handling ───────────────────────────────

describe("elevenlabs-create-callback: opportunity error handling", () => {
  const source = readFile("supabase/functions/elevenlabs-create-callback/index.ts");

  it("does NOT silently succeed when opportunity INSERT fails", () => {
    // The old pattern: "// Still succeed - we captured the intent"
    // This was wrong — the opportunity was NOT created, so no notification, no callback queue entry
    expect(source).not.toContain("Still succeed");
  });

  it("returns success: false when opportunity INSERT fails", () => {
    // After detecting opportunityError, must return a response with success: false
    // Find the if(opportunityError) block and verify it returns success: false
    const lines = source.split("\n");
    const errorCheckLine = lines.findIndex(l => l.includes("if (opportunityError)") || l.includes("if(opportunityError)"));
    expect(errorCheckLine, "Must have an if(opportunityError) check").toBeGreaterThan(-1);
    // Look at the 30 lines after the error check for "success: false"
    const errorBlock = lines.slice(errorCheckLine, errorCheckLine + 30).join("\n");
    expect(errorBlock).toContain("success: false");
  });

  it("captures callback intent in session even when opportunity INSERT fails", () => {
    // When opportunity INSERT fails, we must still update the session's extracted_payload
    // so the callback intent is not completely lost
    const errorSection = source.split("CRITICAL: Opportunity")[1]?.split("return new Response")[0] || "";
    expect(errorSection).toContain("extracted_payload");
    expect(errorSection).toContain("opportunity_insert_failed");
  });

  it("logs CRITICAL for opportunity INSERT failures (not just console.error)", () => {
    expect(source).toContain("CRITICAL: Opportunity insert failed");
  });

  it("validates tenant_id before DB operations", () => {
    // Must check for missing tenant_id and return early
    expect(source).toContain("if (!tenantId)");
  });

  it("returns HTTP 200 even on error (required by ElevenLabs)", () => {
    // ElevenLabs requires HTTP 200 for tool responses; use success: false to signal errors
    // Count Response constructors — none should have non-200 status
    const statusMatches = source.match(/status:\s*[0-9]+/g) || [];
    for (const match of statusMatches) {
      const status = parseInt(match.replace("status:", "").trim());
      expect(status, `Edge function returns HTTP ${status} — ElevenLabs requires 200`).toBe(200);
    }
  });
});

// ─── useBookings.ts error surfacing ──────────────────────────────────────────

describe("useBookings.ts: side-effect error surfacing", () => {
  const source = readFile("src/hooks/useBookings.ts");

  it("confirmBooking surfaces booking-handoff failures via toast (not just console.error)", () => {
    // Find the booking-handoff invocation line and check the ~20 lines after it for toast()
    const lines = source.split("\n");
    const handoffLine = lines.findIndex(l => l.includes("booking-handoff") && l.includes("invoke"));
    expect(handoffLine, "Must invoke booking-handoff").toBeGreaterThan(-1);
    // Look at the 25 lines after the invocation for toast() in the error handler
    const handoffBlock = lines.slice(handoffLine, handoffLine + 25).join("\n");
    expect(
      handoffBlock.includes("toast"),
      "booking-handoff failure must surface a toast to the user, not just console.error"
    ).toBe(true);
  });

  it("confirmBooking does NOT falsely claim 'Customer has been notified'", () => {
    // The onSuccess toast should not claim the customer was notified,
    // since booking-handoff runs asynchronously and could fail
    const confirmSuccess = source.split("confirmBooking")[1]?.split("onError")[0] || "";
    expect(
      confirmSuccess.includes("Customer has been notified"),
      "confirmBooking.onSuccess must not claim 'Customer has been notified' — handoff is async and may fail"
    ).toBe(false);
  });

  it("all console.error calls include function context", () => {
    // Every console.error should include [functionName] prefix for debugging
    const errorLines = source.split("\n").filter(l => l.includes("console.error"));
    for (const line of errorLines) {
      expect(
        line.includes("["),
        `console.error without context prefix: ${line.trim()}`
      ).toBe(true);
    }
  });

  it("completeBooking has structured error logging", () => {
    // The string "[completeBooking]" must appear somewhere in the file
    expect(
      source.includes("[completeBooking]"),
      "completeBooking console.error must include [completeBooking] context prefix"
    ).toBe(true);
  });

  it("cancelBooking has structured error logging", () => {
    expect(
      source.includes("[cancelBooking]"),
      "cancelBooking console.error must include [cancelBooking] context prefix"
    ).toBe(true);
  });
});

// ─── Cross-mode: callback flow applies to all modes ─────────────────────────

describe("Callback flow: mode-agnostic safety", () => {
  const source = readFile("supabase/functions/elevenlabs-create-callback/index.ts");

  it("uses opportunities table (not a mode-specific table)", () => {
    // Callbacks go to opportunities table regardless of mode (service, dispatch, food, etc.)
    expect(source).toContain('.from("opportunities")');
  });

  it("sets source as voice_callback for audit trail", () => {
    expect(source).toContain('source: "voice_callback"');
  });

  it("captures department from ElevenLabs request", () => {
    // Department field helps route callbacks to the right person
    expect(source).toContain("department");
  });

  it("normalizes customer phone using shared utility", () => {
    expect(source).toContain("normalizePhoneE164");
  });
});
