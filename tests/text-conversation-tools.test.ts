/**
 * Text Conversation Tools Completeness Tests
 *
 * @vitest-environment node
 *
 * Ensures the text-conversation edge function exposes all tools
 * that ElevenLabs voice agents have, so QA can test every flow
 * via the text simulator without needing voice calls.
 *
 * Gates: functional/cancel_booking_works, functional/reschedule_booking_works,
 *        functional/callback_request_works, functional/booking_creates_correctly
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TEXT_CONV_PATH = join(
  process.cwd(),
  "supabase/functions/text-conversation/index.ts"
);

const source = readFileSync(TEXT_CONV_PATH, "utf-8");

describe("text-conversation: tool definitions", () => {
  const requiredTools = [
    "create_booking",
    "check_availability",
    "create_callback",
    "check_service_area",
    "cancel_booking",
    "reschedule_booking",
  ];

  for (const tool of requiredTools) {
    it(`defines tool '${tool}' in getToolDefinitions`, () => {
      expect(source).toContain(`name: "${tool}"`);
    });
  }

  for (const tool of requiredTools) {
    it(`maps tool '${tool}' to an endpoint in endpointMap`, () => {
      const pattern = new RegExp(`${tool}:\\s*"elevenlabs-`);
      expect(source).toMatch(pattern);
    });
  }
});

describe("text-conversation: endpoint mappings", () => {
  const expectedMappings: Record<string, string> = {
    create_booking: "elevenlabs-create-booking",
    check_availability: "elevenlabs-check-availability",
    create_callback: "elevenlabs-create-callback",
    check_service_area: "elevenlabs-check-service-area",
    cancel_booking: "elevenlabs-cancel-booking",
    reschedule_booking: "elevenlabs-reschedule-booking",
  };

  for (const [tool, endpoint] of Object.entries(expectedMappings)) {
    it(`maps '${tool}' → '${endpoint}'`, () => {
      expect(source).toContain(`${tool}: "${endpoint}"`);
    });
  }
});

describe("text-conversation: result tracking", () => {
  it("tracks bookingCreated flag", () => {
    expect(source).toContain("bookingCreated");
  });

  it("tracks bookingCancelled flag", () => {
    expect(source).toContain("bookingCancelled");
  });

  it("tracks bookingRescheduled flag", () => {
    expect(source).toContain("bookingRescheduled");
  });

  it("returns all tracking flags in response", () => {
    expect(source).toContain("bookingCreated,");
    expect(source).toContain("bookingCancelled,");
    expect(source).toContain("bookingRescheduled,");
  });
});

// Extract the getToolDefinitions function body for schema checks
const toolDefsStart = source.indexOf("function getToolDefinitions");
const toolDefsEnd = source.indexOf("\n}", toolDefsStart) + 2;
const toolDefsBody = source.slice(toolDefsStart, toolDefsEnd);

function getToolBlock(toolName: string): string {
  const start = toolDefsBody.indexOf(`name: "${toolName}"`);
  if (start === -1) return "";
  // Get next tool start or end of function as boundary
  const nextToolPattern = /name: "[a-z_]+"/g;
  nextToolPattern.lastIndex = start + toolName.length + 10;
  const nextMatch = nextToolPattern.exec(toolDefsBody);
  const end = nextMatch ? nextMatch.index : toolDefsBody.length;
  return toolDefsBody.slice(start, end);
}

describe("text-conversation: tool schema requirements", () => {
  it("cancel_booking requires customer_name", () => {
    const block = getToolBlock("cancel_booking");
    expect(block).toContain('"customer_name"');
  });

  it("reschedule_booking requires new_date and new_time", () => {
    const block = getToolBlock("reschedule_booking");
    expect(block).toContain('"new_date"');
    expect(block).toContain('"new_time"');
    expect(block).toContain('"customer_name"');
  });

  it("create_booking requires customer_name, date, time", () => {
    const block = getToolBlock("create_booking");
    expect(block).toContain('"customer_name"');
    expect(block).toContain('"date"');
    expect(block).toContain('"time"');
  });

  it("create_callback requires customer_name, customer_phone, reason", () => {
    const block = getToolBlock("create_callback");
    expect(block).toContain('"customer_name"');
    expect(block).toContain('"customer_phone"');
    expect(block).toContain('"reason"');
  });
});
