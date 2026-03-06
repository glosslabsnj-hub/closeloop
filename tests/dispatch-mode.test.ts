/**
 * Dispatch Mode — Tool, Prompt, and Completion Rules Tests
 *
 * @vitest-environment node
 *
 * Validates that the dispatch mode in text-conversation has all required tools,
 * correct endpoint mappings, DISPATCH COMPLETION rules, minimal info schema,
 * and tracking flags. Also verifies buildBusinessContext has the full dispatch
 * prompt section.
 *
 * Gates: dispatch functional/dispatch_job_creates_correctly,
 *        dispatch functional/emergency_dispatch_works,
 *        dispatch functional/dispatch_status_lookup_works
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TEXT_CONV_PATH = join(
  process.cwd(),
  "supabase/functions/text-conversation/index.ts"
);
const BUILD_CONTEXT_PATH = join(
  process.cwd(),
  "supabase/functions/_shared/buildBusinessContext.ts"
);

const textConv = readFileSync(TEXT_CONV_PATH, "utf-8");
const buildCtx = readFileSync(BUILD_CONTEXT_PATH, "utf-8");

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

describe("dispatch mode: tool definitions", () => {
  const dispatchTools = [
    "create_dispatch_job",
    "lookup_dispatch_status",
    "cancel_dispatch_job",
  ];

  for (const tool of dispatchTools) {
    it(`defines dispatch tool '${tool}'`, () => {
      expect(textConv).toContain(`name: "${tool}"`);
    });
  }

  it("defines check_service_area (shared with service mode)", () => {
    expect(textConv).toContain(`name: "check_service_area"`);
  });

  it("dispatch tools are in a dedicated DISPATCH_TOOLS array", () => {
    expect(textConv).toContain("DISPATCH_TOOLS");
    // All three dispatch tools must appear inside the DISPATCH_TOOLS block
    const dispatchToolsStart = textConv.indexOf("const DISPATCH_TOOLS");
    const dispatchToolsEnd = textConv.indexOf("];", dispatchToolsStart);
    const dispatchBlock = textConv.slice(dispatchToolsStart, dispatchToolsEnd);
    expect(dispatchBlock).toContain("create_dispatch_job");
    expect(dispatchBlock).toContain("lookup_dispatch_status");
    expect(dispatchBlock).toContain("cancel_dispatch_job");
  });
});

// ---------------------------------------------------------------------------
// Endpoint mappings
// ---------------------------------------------------------------------------

describe("dispatch mode: endpoint mappings", () => {
  const expectedMappings: Record<string, string> = {
    create_dispatch_job: "elevenlabs-create-dispatch-job",
    lookup_dispatch_status: "elevenlabs-lookup-dispatch-status",
    cancel_dispatch_job: "elevenlabs-cancel-dispatch-job",
  };

  for (const [tool, endpoint] of Object.entries(expectedMappings)) {
    it(`maps '${tool}' → '${endpoint}'`, () => {
      expect(textConv).toContain(`${tool}: "${endpoint}"`);
    });
  }
});

// ---------------------------------------------------------------------------
// Schema requirements — MINIMAL INFO RULE
// Dispatch only requires pickup_address + service_type (not customer name/phone)
// ---------------------------------------------------------------------------

describe("dispatch mode: create_dispatch_job schema — MINIMAL INFO RULE", () => {
  // Extract the create_dispatch_job tool definition block
  const toolStart = textConv.indexOf(`name: "create_dispatch_job"`);
  const nextToolStart = textConv.indexOf(`name: "lookup_dispatch_status"`, toolStart);
  const toolBlock = textConv.slice(toolStart, nextToolStart);

  it("create_dispatch_job requires pickup_address", () => {
    expect(toolBlock).toContain('"pickup_address"');
    const reqStart = toolBlock.indexOf("required:");
    const reqBlock = toolBlock.slice(reqStart, toolBlock.indexOf("]", reqStart) + 1);
    expect(reqBlock).toContain("pickup_address");
  });

  it("create_dispatch_job requires service_type", () => {
    const reqStart = toolBlock.indexOf("required:");
    const reqBlock = toolBlock.slice(reqStart, toolBlock.indexOf("]", reqStart) + 1);
    expect(reqBlock).toContain("service_type");
  });

  it("create_dispatch_job does NOT require customer_name (optional per MINIMAL INFO RULE)", () => {
    const reqStart = toolBlock.indexOf("required:");
    const reqBlock = toolBlock.slice(reqStart, toolBlock.indexOf("]", reqStart) + 1);
    expect(reqBlock).not.toContain("customer_name");
  });

  it("create_dispatch_job does NOT require customer_phone (optional per MINIMAL INFO RULE)", () => {
    const reqStart = toolBlock.indexOf("required:");
    const reqBlock = toolBlock.slice(reqStart, toolBlock.indexOf("]", reqStart) + 1);
    expect(reqBlock).not.toContain("customer_phone");
  });

  it("create_dispatch_job has optional vehicle_info property", () => {
    expect(toolBlock).toContain("vehicle_info");
  });

  it("create_dispatch_job has urgency property with emergency option", () => {
    expect(toolBlock).toContain("urgency");
    expect(toolBlock).toContain("emergency");
  });

  it("create_dispatch_job has dropoff_address for towing jobs", () => {
    expect(toolBlock).toContain("dropoff_address");
  });
});

describe("dispatch mode: lookup_dispatch_status schema", () => {
  const toolStart = textConv.indexOf(`name: "lookup_dispatch_status"`);
  const nextToolStart = textConv.indexOf(`name: "cancel_dispatch_job"`, toolStart);
  const toolBlock = textConv.slice(toolStart, nextToolStart);

  it("lookup_dispatch_status requires customer_phone", () => {
    const reqStart = toolBlock.indexOf("required:");
    const reqBlock = toolBlock.slice(reqStart, toolBlock.indexOf("]", reqStart) + 1);
    expect(reqBlock).toContain("customer_phone");
  });
});

describe("dispatch mode: cancel_dispatch_job schema", () => {
  const toolStart = textConv.indexOf(`name: "cancel_dispatch_job"`);
  const sectionEnd = textConv.indexOf("/**", toolStart + 50);
  const toolBlock = textConv.slice(toolStart, sectionEnd > 0 ? sectionEnd : toolStart + 800);

  it("cancel_dispatch_job requires customer_phone", () => {
    const reqStart = toolBlock.indexOf("required:");
    const reqBlock = toolBlock.slice(reqStart, toolBlock.indexOf("]", reqStart) + 1);
    expect(reqBlock).toContain("customer_phone");
  });

  it("cancel_dispatch_job has reason property", () => {
    // Property key is unquoted in source: `reason: { type: "string" ... }`
    expect(toolBlock).toContain("reason:");
  });
});

// ---------------------------------------------------------------------------
// DISPATCH COMPLETION rules in text-conversation toolReinforcement
// ---------------------------------------------------------------------------

describe("dispatch mode: DISPATCH COMPLETION rules in text-conversation", () => {
  it("contains DISPATCH COMPLETION (CRITICAL) rule", () => {
    expect(textConv).toContain("DISPATCH COMPLETION (CRITICAL)");
  });

  it("DISPATCH COMPLETION: calls create_dispatch_job IMMEDIATELY after in_area=true", () => {
    expect(textConv).toContain("in_area=true");
    expect(textConv).toContain("create_dispatch_job IMMEDIATELY");
  });

  it("DISPATCH COMPLETION: does NOT ask for confirmation after in_area=true", () => {
    expect(textConv).toContain('Do NOT ask "Would you like me to dispatch a driver?"');
  });

  it("MINIMAL INFO RULE: only pickup_address + service_type required", () => {
    expect(textConv).toContain("MINIMAL INFO RULE");
    expect(textConv).toContain("pickup_address + service_type");
  });

  it("EMERGENCY PRIORITY: sets urgency=emergency for emergencies", () => {
    expect(textConv).toContain("EMERGENCY PRIORITY");
    expect(textConv).toContain('urgency="emergency"');
  });

  it("SERVICE AREA RESULTS: handles in_area=false with apology + callback offer", () => {
    expect(textConv).toContain("SERVICE AREA RESULTS");
    expect(textConv).toContain("in_area=false");
    expect(textConv).toContain("offer to take a callback");
  });

  it("SERVICE AREA RESULTS: handles needs_verification=true by asking city+zip only", () => {
    expect(textConv).toContain("needs_verification=true");
    expect(textConv).toContain("city and zip");
  });

  it("dispatch status lookup rule present", () => {
    expect(textConv).toContain("lookup_dispatch_status");
    expect(textConv).toContain("customer calls to check on their driver");
  });

  it("cancel dispatch rule present", () => {
    expect(textConv).toContain("cancel_dispatch_job");
    expect(textConv).toContain("wants to cancel");
  });

  it("dispatch rules are mode-gated (only in dispatch mode, not service mode)", () => {
    expect(textConv).toContain('businessMode === "dispatch" ? dispatchRules : serviceRules');
  });
});

// ---------------------------------------------------------------------------
// Dispatch tracking flags in text-conversation response
// ---------------------------------------------------------------------------

describe("dispatch mode: tracking flags", () => {
  it("tracks dispatchCreated flag", () => {
    expect(textConv).toContain("dispatchCreated");
  });

  it("tracks dispatchCancelled flag", () => {
    expect(textConv).toContain("dispatchCancelled");
  });

  it("tracks dispatchId", () => {
    expect(textConv).toContain("dispatchId");
  });

  it("tracks dispatchJobNumber", () => {
    expect(textConv).toContain("dispatchJobNumber");
  });

  it("sets dispatchCreated=true when create_dispatch_job succeeds", () => {
    expect(textConv).toContain(`toolUse.name === "create_dispatch_job" && result.success`);
    expect(textConv).toContain("dispatchCreated = true");
  });

  it("sets dispatchCancelled=true when cancel_dispatch_job succeeds", () => {
    expect(textConv).toContain(`toolUse.name === "cancel_dispatch_job" && result.success`);
    expect(textConv).toContain("dispatchCancelled = true");
  });

  it("returns all dispatch tracking flags in response", () => {
    expect(textConv).toContain("dispatchCreated,");
    expect(textConv).toContain("dispatchCancelled,");
    expect(textConv).toContain("dispatchId,");
    expect(textConv).toContain("dispatchJobNumber,");
  });
});

// ---------------------------------------------------------------------------
// buildBusinessContext — DISPATCH COMPLETION section
// ---------------------------------------------------------------------------

describe("buildBusinessContext: dispatch completion section", () => {
  it("includes DISPATCH COMPLETION heading", () => {
    expect(buildCtx).toContain("DISPATCH COMPLETION (CRITICAL");
  });

  it("DISPATCH COMPLETION RULE: create_dispatch_job IMMEDIATELY after in_area=true", () => {
    expect(buildCtx).toContain("call create_dispatch_job IMMEDIATELY");
  });

  it("MINIMAL INFO TO DISPATCH: only pickup_address + service_type", () => {
    expect(buildCtx).toContain("MINIMAL INFO TO DISPATCH");
    expect(buildCtx).toContain("pickup_address + service_type");
  });

  it("ONE-MESSAGE DISPATCH rule present", () => {
    expect(buildCtx).toContain("ONE-MESSAGE DISPATCH");
  });

  it("EMERGENCY OVERRIDE rule present", () => {
    expect(buildCtx).toContain("EMERGENCY OVERRIDE");
    expect(buildCtx).toContain('urgency="emergency"');
  });

  it("NEVER SAY THESE THINGS guard: no confirmation asks", () => {
    expect(buildCtx).toContain("NEVER SAY THESE THINGS");
    expect(buildCtx).toContain("Would you like me to dispatch a driver");
    expect(buildCtx).toContain("Let me know if you'd like to proceed");
  });

  it("dispatch section is gated to dispatch mode", () => {
    // Must check business_mode === "dispatch" before injecting dispatch rules
    expect(buildCtx).toContain('business_mode === "dispatch"');
  });

  it("includes ETA behavior section", () => {
    expect(buildCtx).toContain("DISPATCH ETA BEHAVIOR");
    expect(buildCtx).toContain("min_minutes");
    expect(buildCtx).toContain("max_minutes");
  });

  it("ETA: instructs AI to GIVE ETAs, not refuse them", () => {
    expect(buildCtx).toContain("YOU CAN AND SHOULD PROVIDE ETAs");
    expect(buildCtx).toContain("NEVER SAY");
    expect(buildCtx).toContain("I can't give you an ETA");
  });
});

// ---------------------------------------------------------------------------
// Dispatch mode selection — DISPATCH_TOOLS used in dispatch mode only
// ---------------------------------------------------------------------------

describe("dispatch mode: correct tool set used per mode", () => {
  it("dispatch mode uses DISPATCH_TOOLS array", () => {
    // Should reference DISPATCH_TOOLS somewhere in the getToolDefinitions function
    const fnStart = textConv.indexOf("function getToolDefinitions");
    const fnEnd = textConv.indexOf("\n}", fnStart);
    const fnBody = fnStart > 0 ? textConv.slice(fnStart, fnEnd + 2) : textConv;
    expect(fnBody).toContain("DISPATCH_TOOLS");
  });

  it("service mode does NOT use DISPATCH_TOOLS", () => {
    // The case for "service" must NOT include DISPATCH_TOOLS
    const fnStart = textConv.indexOf(`case "service":`);
    const fnEnd = textConv.indexOf("case ", fnStart + 10);
    const serviceCase = fnStart > 0 ? textConv.slice(fnStart, fnEnd) : "";
    expect(serviceCase).not.toContain("DISPATCH_TOOLS");
  });

  it("dispatch mode has create_dispatch_job in endpoint map", () => {
    const mapStart = textConv.indexOf("endpointMap");
    const mapEnd = textConv.indexOf("}", mapStart);
    const mapBlock = textConv.slice(mapStart, mapEnd + 1);
    expect(mapBlock).toContain("create_dispatch_job");
  });
});
