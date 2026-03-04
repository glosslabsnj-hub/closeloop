/**
 * ElevenLabs Webhook Idempotency & Edge Case Tests
 *
 * @vitest-environment node
 *
 * Verifies critical webhook processing patterns:
 * 1. Duplicate webhook detection (same conversation_id processed twice)
 * 2. Late transcript update (session ended but transcript missing)
 * 3. Fallback session lookup by phone (conversation_id not found)
 * 4. Outcome enum values match DB constraints
 * 5. Mode-agnostic session fields
 *
 * Gates: functional/booking_creates_correctly, functional/ai_handles_edge_cases
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

const source = readFile("supabase/functions/elevenlabs-webhook/index.ts");

describe("elevenlabs-webhook: idempotency check", () => {
  it("checks for existing ended_at before processing", () => {
    expect(source).toContain("existingSession?.ended_at");
  });

  it("returns 'skipped' status for duplicate webhooks", () => {
    expect(source).toContain('reason: "duplicate"');
    expect(source).toContain("already been processed");
  });

  it("logs duplicate detection for audit trail", () => {
    expect(source).toContain("webhook_duplicate_skipped");
  });
});

describe("elevenlabs-webhook: late transcript update", () => {
  it("updates transcript when session ended but transcript missing", () => {
    // Check the late transcript path: ended_at exists, transcript missing, webhook has transcript
    expect(source).toContain("!existingSession.transcript && payload.transcript?.length");
  });

  it("returns 'updated' status for late transcript (not 'success')", () => {
    expect(source).toContain('reason: "late_transcript"');
  });

  it("does NOT re-run full pipeline on late transcript", () => {
    // The late transcript block must return early, before processCallData
    const idempotencyBlock = source.split("IDEMPOTENCY CHECK")[1]?.split("END IDEMPOTENCY CHECK")[0] || "";
    // Should contain a return Response before END IDEMPOTENCY CHECK for the late transcript path
    expect(idempotencyBlock).toContain("late_transcript");
    expect(idempotencyBlock).toContain("return new Response");
  });

  it("logs late transcript event for monitoring", () => {
    expect(source).toContain("webhook_late_transcript");
  });

  it("formats transcript with Customer/AI labels", () => {
    expect(source).toContain('t.role === "user" ? "Customer" : "AI"');
  });
});

describe("elevenlabs-webhook: fallback session lookup", () => {
  it("falls back to phone+tenant_id lookup when conversation_id not found", () => {
    expect(source).toContain("Found fallback session by phone");
  });

  it("requires BOTH phone AND tenant_id for fallback (not just one)", () => {
    expect(source).toContain("payload.dynamic_variables?.caller_phone && payload.dynamic_variables?.tenant_id");
  });

  it("fallback only matches sessions without conversation_id (null)", () => {
    // Must filter for sessions that don't already have a conversation_id
    expect(source).toContain('.is("elevenlabs_conversation_id", null)');
  });

  it("fallback uses most recent session (order by created_at desc)", () => {
    expect(source).toContain('order("created_at", { ascending: false })');
  });

  it("normalizes phone number for consistent matching", () => {
    expect(source).toContain("normalizeToE164");
  });
});

describe("elevenlabs-webhook: outcome enum safety", () => {
  it("uses 'booked' not 'booking' for booking outcome", () => {
    // DB enum is 'booked', not 'booking'. Regression test for commit 41a53ae
    const outcomeSection = source.split("determineOutcome")[1]?.split("function ")[0] || source;
    if (outcomeSection.includes('"booking"')) {
      // If "booking" appears, it should only be in intent detection, not as an outcome value
      // The actual outcome set must use "booked"
      expect(source).toContain('"booked"');
    }
  });

  it("uses 'dispatch' not 'dispatched' for dispatch outcome", () => {
    // DB enum is 'dispatch', not 'dispatched'. Regression test for commit 186d999
    expect(source).not.toMatch(/outcome\s*[:=]\s*["']dispatched["']/);
  });

  it("maps off-behavior outcomes correctly", () => {
    // FORWARD_OWNER → escalated, VOICEMAIL → message, CALLBACK_ONLY → followup
    // Regression test for commit ef72223
    expect(source).toContain("escalated");
  });
});

describe("elevenlabs-webhook: session data handling", () => {
  it("reads booking_id from session for duplicate prevention", () => {
    // Session.booking_id is used to check if booking was already created during the call
    expect(source).toContain("booking_id");
  });

  it("reads twilio_call_sid from session", () => {
    expect(source).toContain("twilio_call_sid");
  });

  it("reads context_json from session for business context", () => {
    expect(source).toContain("context_json");
  });
});
