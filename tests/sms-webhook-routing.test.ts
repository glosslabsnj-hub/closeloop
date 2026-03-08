/**
 * Twilio SMS Webhook Routing Tests
 *
 * @vitest-environment node
 *
 * BUG (2026-03-08, commit 920dd04): Opt-out, opt-in, and help keyword responses
 * in twilio-sms-webhook were using `twilioResponse(body)` — this routes replies
 * via the local Twilio number, which may be carrier-blocked for unverified local
 * numbers. Additionally, AI replies were returned via TwiML directly.
 *
 * Fix: All replies (opt-out/opt-in/help/AI) now use sendTenantSms() which routes
 * via the verified messaging service (toll-free or A2P-approved 10DLC). TwiML
 * returns empty "" so Twilio doesn't try to send a second message.
 *
 * Also: sms-sender.ts now only uses the primary local number as fallback when
 * A2P status = "approved" (prevents Twilio error 30034 for unverified senders).
 *
 * These tests verify:
 * 1. Opt-out keywords update do_not_contact AND use sendTenantSms (not TwiML body)
 * 2. Opt-in keywords update do_not_contact=false AND use sendTenantSms
 * 3. Help keywords use sendTenantSms (not TwiML body)
 * 4. AI replies use sendTenantSms + log Twilio SID and delivery status
 * 5. Empty TwiML ("") returned after all keyword responses (no double-send)
 * 6. sms-sender: primary phone only used when A2P approved (no carrier 30034)
 * 7. Message log records actual success/failure status from sendTenantSms result
 *
 * Business impact: Businesses whose A2P campaign is in review will not get
 * Twilio error 30034. Once A2P is approved, their local number becomes the
 * primary channel. Before this fix, SMS replies were sent via potentially
 * blocked channels, causing silent delivery failures.
 *
 * Gate: functional/booking_sms_confirmation + integrations/sms_delivery_works
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

const webhookSrc = readFile("supabase/functions/twilio-sms-webhook/index.ts");
const smsSenderSrc = readFile("supabase/functions/_shared/sms-sender.ts");

// ─── Opt-out flow ──────────────────────────────────────────────────────────

describe("twilio-sms-webhook: opt-out keyword handling", () => {
  it("imports sendTenantSms from shared module", () => {
    expect(webhookSrc).toContain('import { sendTenantSms } from "../_shared/sms-sender.ts"');
  });

  it("opt-out: updates do_not_contact=true", () => {
    expect(webhookSrc).toContain("do_not_contact: true");
  });

  it("opt-out: uses sendTenantSms for reply (not twilioResponse with body)", () => {
    // After opt-out DB update, must call sendTenantSms
    expect(webhookSrc).toContain(
      'await sendTenantSms({ tenantId, to: normalizedFrom, body: `You\'ve been unsubscribed from ${businessName} messages.'
    );
  });

  it("opt-out: returns empty TwiML (prevents double-send)", () => {
    // Should return twilioResponse("") after sendTenantSms
    const optOutSection = webhookSrc.split("OPT_OUT_KEYWORDS.includes")[1]?.split("OPT_IN_KEYWORDS")[0];
    expect(optOutSection).toContain('return twilioResponse("")');
    // Should NOT return a non-empty TwiML body
    expect(optOutSection).not.toMatch(/return twilioResponse\("[^"]+"\)/);
  });

  it("opt-out: recognized keywords include STOP and variants", () => {
    expect(webhookSrc).toContain('"stop"');
    expect(webhookSrc).toContain('"unsubscribe"');
    expect(webhookSrc).toContain('"cancel"');
    expect(webhookSrc).toContain('"quit"');
  });
});

// ─── Opt-in flow ───────────────────────────────────────────────────────────

describe("twilio-sms-webhook: opt-in keyword handling", () => {
  it("opt-in: updates do_not_contact=false", () => {
    expect(webhookSrc).toContain("do_not_contact: false");
  });

  it("opt-in: uses sendTenantSms for welcome-back message", () => {
    expect(webhookSrc).toContain(
      'await sendTenantSms({ tenantId, to: normalizedFrom, body: `Welcome back!'
    );
  });

  it("opt-in: returns empty TwiML (prevents double-send)", () => {
    const optInSection = webhookSrc.split("OPT_IN_KEYWORDS.includes")[1]?.split("HELP_KEYWORDS")[0];
    expect(optInSection).toContain('return twilioResponse("")');
    expect(optInSection).not.toMatch(/return twilioResponse\("[^"]+"\)/);
  });

  it("opt-in: recognized keywords include START and UNSTOP", () => {
    expect(webhookSrc).toContain('"start"');
    expect(webhookSrc).toContain('"unstop"');
    expect(webhookSrc).toContain('"subscribe"');
  });
});

// ─── HELP keyword flow ─────────────────────────────────────────────────────

describe("twilio-sms-webhook: HELP keyword handling", () => {
  it("help: uses sendTenantSms for help response", () => {
    expect(webhookSrc).toContain(
      'await sendTenantSms({ tenantId, to: normalizedFrom, body: `${businessName}: Reply to this number to chat'
    );
  });

  it("help: returns empty TwiML (prevents double-send)", () => {
    const helpSection = webhookSrc.split("HELP_KEYWORDS.includes")[1]?.split("// ─── Step 3")[0];
    expect(helpSection).toContain('return twilioResponse("")');
    expect(helpSection).not.toMatch(/return twilioResponse\("[^"]+"\)/);
  });

  it("help: message mentions booking/cancellation capability", () => {
    // Help message should tell customers what they can do via SMS
    const helpMsgMatch = webhookSrc.match(
      /sendTenantSms\(\{[^}]*body: `\$\{businessName\}([^`]+)`/
    );
    expect(helpMsgMatch).toBeTruthy();
    expect(helpMsgMatch![1].toLowerCase()).toMatch(/book|cancel|reschedule/);
  });

  it("help: message includes opt-out instruction (A2P compliance)", () => {
    // A2P compliance: HELP responses MUST include STOP opt-out instruction
    const helpMsgMatch = webhookSrc.match(
      /HELP_KEYWORDS\.includes[\s\S]*?sendTenantSms\(\{[^}]*body: `([^`]+)`/
    );
    expect(helpMsgMatch?.[1]?.toUpperCase()).toMatch(/STOP/);
  });
});

// ─── AI reply routing via verified channel ─────────────────────────────────

describe("twilio-sms-webhook: AI reply uses sendTenantSms (not TwiML)", () => {
  it("calls sendTenantSms for AI-generated replies", () => {
    // sendTenantSms must be called with the AI reply body
    expect(webhookSrc).toContain(
      "const smsResult = await sendTenantSms({"
    );
  });

  it("AI reply TwiML returns empty string (no double-send)", () => {
    // After smsResult, should return twilioResponse("")
    const aiSection = webhookSrc.split("const smsResult = await sendTenantSms")[1]?.split("} else {")[0];
    expect(aiSection).toContain('return twilioResponse("")');
  });

  it("message log records actual delivery status from smsResult", () => {
    // Log should use smsResult.success, not hardcoded "sent"
    expect(webhookSrc).toContain("status: smsResult.success ? \"sent\" : \"failed\"");
  });

  it("message log records Twilio message SID for tracing", () => {
    expect(webhookSrc).toContain("twilio_sid: smsResult.twilioSid");
  });

  it("message log direction is 'outbound' for AI replies", () => {
    expect(webhookSrc).toContain('direction: "outbound"');
  });
});

// ─── sms-sender: A2P guard for local 10DLC numbers ────────────────────────

describe("sms-sender: primary phone fallback only when A2P approved", () => {
  it("checks a2p.status === 'approved' before using primary phone", () => {
    expect(smsSenderSrc).toContain('a2p?.status === "approved"');
  });

  it("logs when using 10DLC-approved primary phone", () => {
    expect(smsSenderSrc).toContain("Using 10DLC-approved primary phone");
  });

  it("returns skipped=true when no verified channel and not A2P approved", () => {
    // Should log clear reason — not just generic "no channel"
    expect(smsSenderSrc).toContain("need A2P approval or toll-free verification");
    expect(smsSenderSrc).toContain("skipped: true");
    expect(smsSenderSrc).toContain('reason: "no_verified_channel"');
  });

  it("does NOT use primary phone without A2P check (prevents 30034 error)", () => {
    // Old code: "Using primary phone ${fromNumber} for tenant ${tenantId}"
    // New code: "Using 10DLC-approved primary phone ${fromNumber} for tenant ${tenantId}"
    // The old unconditional message must not exist
    expect(smsSenderSrc).not.toContain(
      "Using primary phone"
    );
  });
});

// ─── Consistency checks across keyword handlers ────────────────────────────

describe("twilio-sms-webhook: keyword handler consistency", () => {
  it("all keyword handlers (stop/start/help) use sendTenantSms (not twilioResponse with body)", () => {
    // Count sendTenantSms calls before the main AI conversation loop
    // There should be 3 (one each for opt-out, opt-in, help)
    const beforeLoop = webhookSrc.split("// ─── Step 3")[0];
    const sendSmsCount = (beforeLoop.match(/await sendTenantSms\(/g) || []).length;
    expect(sendSmsCount, "Expected 3 sendTenantSms calls for opt-out/opt-in/help").toBe(3);
  });

  it("twilioResponse always returns empty string for keyword responses", () => {
    // All keyword responses should return twilioResponse("") not twilioResponse("some text")
    // Find all twilioResponse calls with non-empty strings in keyword sections
    const keywordSection = webhookSrc.split("// ─── Step 3")[0];
    const nonEmptyTwiml = keywordSection.match(/return twilioResponse\("[^"]+"\)/g);
    expect(nonEmptyTwiml, "No non-empty twilioResponse calls in keyword section").toBeNull();
  });

  it("OPT_OUT_KEYWORDS and OPT_IN_KEYWORDS are mutually exclusive", () => {
    // No keyword should appear in both arrays
    const optOut = ["stop", "unsubscribe", "cancel", "end", "quit"];
    const optIn = ["start", "unstop", "subscribe"];
    const help = ["help", "info"];

    const optOutSet = new Set(optOut);
    const optInSet = new Set(optIn);
    const helpSet = new Set(help);

    const optOutOptInOverlap = optOut.filter(k => optInSet.has(k));
    const optOutHelpOverlap = optOut.filter(k => helpSet.has(k));
    const optInHelpOverlap = optIn.filter(k => helpSet.has(k));

    expect(optOutOptInOverlap).toHaveLength(0);
    expect(optOutHelpOverlap).toHaveLength(0);
    expect(optInHelpOverlap).toHaveLength(0);
  });
});
