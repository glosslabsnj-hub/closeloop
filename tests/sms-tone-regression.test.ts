/**
 * SMS Tone Regression Tests
 *
 * @vitest-environment node
 *
 * Verifies that text-conversation maintains human-like SMS tone guidelines.
 * Prevents regression to robotic phrase patterns that real business owners
 * would never send.
 *
 * Business case: SMS conversations must feel like a real business owner
 * texting — not an automated system. Robotic patterns erode customer trust
 * and make it obvious the business uses AI (violation of NEVER reveal AI rule).
 *
 * Gates: functional/booking_sms_confirmation (tone quality)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TEXT_CONV_PATH = join(
  process.cwd(),
  "supabase/functions/text-conversation/index.ts"
);

const source = readFileSync(TEXT_CONV_PATH, "utf-8");

// Extract just the SMS rules section
const smsRulesStart = source.indexOf("SMS CONVERSATION RULES");
const smsRulesEnd = source.indexOf("` : \"\";", smsRulesStart);
const smsSection = smsRulesStart >= 0 ? source.slice(smsRulesStart, smsRulesEnd) : "";

// ---------------------------------------------------------------------------
// Anti-robot phrase enforcement
// ---------------------------------------------------------------------------

describe("text-conversation: SMS anti-robot rules are present", () => {
  it("SMS section exists in source", () => {
    expect(smsRulesStart).toBeGreaterThan(0);
    expect(smsSection.length).toBeGreaterThan(100);
  });

  it("bans 'Reply yes or no' prompts (formulaic reply pattern)", () => {
    expect(smsSection).toContain("Reply yes or no");
    // The rule must say NEVER, not just mention it
    expect(smsSection).toContain("NEVER");
  });

  it("bans 'Reply to confirm' prompts", () => {
    expect(smsSection).toContain("Reply to confirm");
  });

  it("bans 'Reply A/B/C' menu patterns", () => {
    expect(smsSection).toContain("Reply A/B/C");
  });

  it("bans corporate phrase 'Would you like to proceed?'", () => {
    expect(smsSection).toContain("Would you like to proceed?");
  });

  it("bans 'Please confirm your selection' phrasing", () => {
    expect(smsSection).toContain("Please confirm your selection");
  });

  it("bans 'Your request has been processed' phrasing", () => {
    expect(smsSection).toContain("Your request has been processed");
  });

  it("includes human tone examples showing good vs bad", () => {
    expect(smsSection).toContain("TONE EXAMPLES (good)");
    expect(smsSection).toContain("TONE EXAMPLES (bad)");
  });

  it("good tone example shows casual cancellation follow-up", () => {
    // The good example should sound like a real person
    expect(smsSection).toContain("Got you canceled");
  });

  it("bad tone example shows robotic reply-prompt", () => {
    // The bad example documents what NOT to do
    expect(smsSection).toContain("Reply yes or no");
  });
});

// ---------------------------------------------------------------------------
// Core SMS behavior rules
// ---------------------------------------------------------------------------

describe("text-conversation: core SMS behavior rules", () => {
  it("instructs AI to never reveal it is automated", () => {
    expect(smsSection).toContain("NEVER say");
    expect(smsSection).toContain("automated");
  });

  it("instructs AI to keep messages short (under 320 chars)", () => {
    expect(smsSection).toContain("320");
  });

  it("instructs AI to not ask for phone number (already has it)", () => {
    expect(smsSection).toContain("phone number");
    expect(smsSection).toContain("you do");
  });

  it("instructs immediate action for clear cancellation requests", () => {
    // Critical: don't ask "are you sure?" — just cancel immediately
    expect(smsSection).toContain("cancel_booking immediately");
    expect(smsSection).toContain("Don't ask");
  });

  it("handles returning customers by name", () => {
    expect(smsSection).toContain("returning customer");
    // "use it naturally" or similar phrase about name usage
    const hasNameGuidance = smsSection.includes("their name") || smsSection.includes("use it naturally");
    expect(hasNameGuidance).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Booking-handoff SMS template
// ---------------------------------------------------------------------------

describe("booking-handoff: SMS confirmation template", () => {
  const handoffPath = join(
    process.cwd(),
    "supabase/functions/booking-handoff/index.ts"
  );
  const handoffSource = readFileSync(handoffPath, "utf-8");

  it("default SMS template contains friendly greeting (Hey)", () => {
    // Should use "Hey" not formal "Hi" (friendly, human-like)
    expect(handoffSource).toContain("Hey {{customer_name}}!");
  });

  it("default SMS template says 'You're all set' (casual confirmation)", () => {
    expect(handoffSource).toContain("You're all set");
  });

  it("default SMS template says 'See you then!' (warm close)", () => {
    expect(handoffSource).toContain("See you then!");
  });

  it("default SMS template does NOT use formal 'Your [x] is confirmed' pattern", () => {
    // The old template was robotic: "Your appointment with X is confirmed for..."
    // Verify it's been replaced
    const defaultTemplate = handoffSource.match(/`Hey.*?Reply STOP/s)?.[0] || "";
    expect(defaultTemplate).not.toContain("is confirmed for");
  });

  it("SMS template includes all required placeholders", () => {
    const defaultTemplate = handoffSource.match(/`Hey.*?Reply STOP to opt out\.`/s)?.[0] || "";
    expect(defaultTemplate.length).toBeGreaterThan(0);
    expect(defaultTemplate).toContain("{{customer_name}}");
    expect(defaultTemplate).toContain("{{business_name}}");
    expect(defaultTemplate).toContain("{{appointment_date}}");
    expect(defaultTemplate).toContain("{{appointment_time}}");
  });

  it("SMS template includes opt-out instruction (required by law)", () => {
    const defaultTemplate = handoffSource.match(/`Hey.*?Reply STOP to opt out\.`/s)?.[0] || "";
    expect(defaultTemplate).toContain("Reply STOP to opt out");
  });
});

// ---------------------------------------------------------------------------
// Mode matrix: SMS rules apply to service mode (primary gate)
// ---------------------------------------------------------------------------

describe("text-conversation: mode-specific rules present", () => {
  it("source contains SERVICE mode SMS handling", () => {
    // The SMS layer is added when mode is service (or any mode with SMS)
    // Key check: SMS section is within the main serve handler
    const serveStart = source.indexOf("serve(async (req)");
    expect(serveStart).toBeGreaterThan(0);
    // SMS section must be inside the serve handler (not before it)
    expect(smsRulesStart).toBeGreaterThan(serveStart);
  });

  it("source imports or references buildBusinessContext for system prompt", () => {
    expect(source).toContain("buildBusinessContext");
  });
});
