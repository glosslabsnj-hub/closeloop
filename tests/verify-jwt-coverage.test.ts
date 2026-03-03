/**
 * verify_jwt Coverage Tests
 *
 * @vitest-environment node
 *
 * ROOT CAUSE of 24-function outage (2026-03-03): ElevenLabs tool endpoints
 * missing verify_jwt=false in config.toml caused Supabase gateway to return
 * 401 before functions even ran. This test prevents regression.
 *
 * Rules:
 * - ALL elevenlabs-* functions MUST have verify_jwt = false
 * - ALL handoff functions (booking-handoff, dispatch-handoff, etc.) MUST have verify_jwt = false
 * - ALL internally-called functions (send-sms, outbound-call, etc.) MUST have verify_jwt = false
 *
 * Gates: functional/booking_creates_correctly, overall/no_console_errors
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CONFIG_PATH = join(process.cwd(), "supabase/config.toml");
const FUNCTIONS_DIR = join(process.cwd(), "supabase/functions");

const configSource = readFileSync(CONFIG_PATH, "utf-8");

// Parse all [functions.X] blocks and their verify_jwt values
function parseVerifyJwtSettings(): Map<string, boolean | null> {
  const map = new Map<string, boolean | null>();
  const lines = configSource.split(/\r?\n/);

  let currentFn: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    const fnMatch = trimmed.match(/^\[functions\.([^\]]+)\]$/);
    if (fnMatch) {
      currentFn = fnMatch[1];
      map.set(currentFn, null); // null = not set
      continue;
    }
    if (currentFn && trimmed.startsWith("verify_jwt")) {
      const val = trimmed.includes("false") ? false : true;
      map.set(currentFn, val);
    }
  }
  return map;
}

const jwtSettings = parseVerifyJwtSettings();

// Get all actual function directories
function getEdgeFunctionNames(): string[] {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
}

const allFunctions = getEdgeFunctionNames();

describe("verify_jwt: ElevenLabs tool endpoints", () => {
  const elevenLabsFunctions = allFunctions.filter((f) =>
    f.startsWith("elevenlabs-")
  );

  it("found at least 15 ElevenLabs functions", () => {
    expect(elevenLabsFunctions.length).toBeGreaterThanOrEqual(15);
  });

  for (const fn of elevenLabsFunctions) {
    it(`${fn} has verify_jwt = false`, () => {
      const setting = jwtSettings.get(fn);
      expect(
        setting,
        `${fn} is missing from config.toml or has verify_jwt = true. ` +
          `ElevenLabs uses x-cl-secret, not Supabase JWTs.`
      ).toBe(false);
    });
  }
});

describe("verify_jwt: handoff functions", () => {
  const handoffFunctions = [
    "booking-handoff",
    "dispatch-handoff",
    "order-handoff",
    "sales-lead-handoff",
    "test-drive-handoff",
  ];

  for (const fn of handoffFunctions) {
    it(`${fn} has verify_jwt = false`, () => {
      const setting = jwtSettings.get(fn);
      expect(
        setting,
        `${fn} is missing from config.toml or has verify_jwt = true. ` +
          `Handoff functions are called internally by other edge functions.`
      ).toBe(false);
    });
  }
});

describe("verify_jwt: internally-called functions", () => {
  const internalFunctions = [
    "send-sms",
    "outbound-call",
    "test-call-phone",
    "notify-job-update",
  ];

  for (const fn of internalFunctions) {
    it(`${fn} has verify_jwt = false`, () => {
      const setting = jwtSettings.get(fn);
      expect(
        setting,
        `${fn} is missing from config.toml or has verify_jwt = true. ` +
          `This function is called internally by other edge functions.`
      ).toBe(false);
    });
  }
});

describe("verify_jwt: webhook endpoints", () => {
  const webhookFunctions = ["twilio-inbound", "stripe-webhook"];

  for (const fn of webhookFunctions) {
    it(`${fn} has verify_jwt = false`, () => {
      const setting = jwtSettings.get(fn);
      expect(
        setting,
        `${fn} must have verify_jwt = false for external webhooks`
      ).toBe(false);
    });
  }
});

describe("verify_jwt: text-conversation (QA testing)", () => {
  it("text-conversation has verify_jwt = false", () => {
    const setting = jwtSettings.get("text-conversation");
    expect(
      setting,
      "text-conversation must have verify_jwt = false for QA testing"
    ).toBe(false);
  });
});
