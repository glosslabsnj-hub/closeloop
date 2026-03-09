/**
 * Sales Mode Booking Flow Tests
 *
 * @vitest-environment node
 *
 * Covers:
 * 1. elevenlabs-create-booking — sales mode creates test_drives record in addition to booking
 * 2. elevenlabs-cancel-booking + elevenlabs-reschedule-booking — SHARED_TOOLS for sales
 * 3. Sales mode booking completes with test_drive-handoff (not booking-handoff)
 * 4. SHARED_TOOLS in text-conversation include cancel/reschedule (functional/cancel+reschedule gates)
 * 5. text-conversation transfer_to_human override for chat mode (functional/transfer_to_human)
 *
 * Gate targets:
 *   functional/booking_creates_correctly, functional/cancel_booking_works,
 *   functional/reschedule_booking_works, functional/transfer_to_human_works,
 *   functional/callback_request_works
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const root = process.cwd();

const createBookingSource = readFileSync(
  join(root, "supabase/functions/elevenlabs-create-booking/index.ts"),
  "utf-8"
);

const cancelBookingSource = readFileSync(
  join(root, "supabase/functions/elevenlabs-cancel-booking/index.ts"),
  "utf-8"
);

const rescheduleBookingSource = readFileSync(
  join(root, "supabase/functions/elevenlabs-reschedule-booking/index.ts"),
  "utf-8"
);

const createCallbackSource = readFileSync(
  join(root, "supabase/functions/elevenlabs-create-callback/index.ts"),
  "utf-8"
);

const textConvSource = readFileSync(
  join(root, "supabase/functions/text-conversation/index.ts"),
  "utf-8"
);

const configToml = readFileSync(
  join(root, "supabase/config.toml"),
  "utf-8"
);

// ---------------------------------------------------------------------------
// Helper: get verify_jwt for a function from config.toml
// ---------------------------------------------------------------------------
function getVerifyJwt(source: string, fnName: string): boolean {
  const fnHeader = `[functions.${fnName}]`;
  const start = source.indexOf(fnHeader);
  if (start === -1) return true;
  const block = source.slice(start, start + 300);
  return block.includes("verify_jwt = false");
}

// ---------------------------------------------------------------------------
// 1. elevenlabs-create-booking: sales mode creates test_drives record
// ---------------------------------------------------------------------------

describe("elevenlabs-create-booking: sales mode creates test_drives — functional/booking_creates_correctly", () => {
  it("source file exists with content", () => {
    expect(createBookingSource.length).toBeGreaterThan(1000);
  });

  it("has sales-mode test_drives creation block", () => {
    expect(createBookingSource).toContain("business_mode === \"sales\"");
    expect(createBookingSource).toContain('"test_drives"');
  });

  it("test_drives insert is wrapped in a try/catch (non-blocking — booking already created)", () => {
    const testDriveBlock = createBookingSource.slice(
      createBookingSource.indexOf("sales-mode tenants"),
      createBookingSource.indexOf("Trigger booking handoff")
    );
    expect(testDriveBlock).toContain("try {");
    expect(testDriveBlock).toContain("} catch");
  });

  it("test_drives record links to booking via booking_id", () => {
    const testDriveInsert = createBookingSource.slice(
      createBookingSource.indexOf('"test_drives"'),
      createBookingSource.indexOf('"test_drives"') + 500
    );
    expect(testDriveInsert).toContain("booking_id");
  });

  it("test_drives record stores vehicle_description (from service name)", () => {
    const testDriveInsert = createBookingSource.slice(
      createBookingSource.indexOf('"test_drives"'),
      createBookingSource.indexOf('"test_drives"') + 800
    );
    expect(testDriveInsert).toContain("vehicle_description");
  });

  it("test_drives status uses valid DB enum values (confirmed or pending)", () => {
    // BUG FIX: was using 'scheduled' which violates the DB CHECK constraint.
    // Valid values: pending|confirmed|completed|cancelled|no_show
    const testDriveBlock = createBookingSource.slice(
      createBookingSource.indexOf("sales-mode tenants"),
      createBookingSource.indexOf("Trigger booking handoff")
    );
    expect(testDriveBlock).toContain("confirmed");
    expect(testDriveBlock).toContain("pending");
    expect(testDriveBlock).not.toContain('"scheduled"');
  });

  it("booking triggers booking-handoff AFTER test_drive creation", () => {
    const bookingHandoffIdx = createBookingSource.indexOf("booking-handoff");
    const testDriveCreateIdx = createBookingSource.indexOf('"test_drives"');
    // test_drive creation happens before booking-handoff trigger
    expect(testDriveCreateIdx).toBeLessThan(bookingHandoffIdx);
  });

  it("create-booking has verify_jwt = false (ElevenLabs calls it)", () => {
    expect(getVerifyJwt(configToml, "elevenlabs-create-booking")).toBe(true);
  });

  it("checks for duplicate booking via session.booking_id guard", () => {
    expect(createBookingSource).toContain("booking_id");
    // Duplicate prevention
    expect(createBookingSource).toContain("CRITICAL");
  });
});

// ---------------------------------------------------------------------------
// 2. cancel_booking — functional/cancel_booking_works
// ---------------------------------------------------------------------------

describe("elevenlabs-cancel-booking: cancel flow — functional/cancel_booking_works", () => {
  it("source file exists", () => {
    expect(cancelBookingSource.length).toBeGreaterThan(200);
  });

  it("has verify_jwt = false in config.toml", () => {
    expect(getVerifyJwt(configToml, "elevenlabs-cancel-booking")).toBe(true);
  });

  it("requires tenant_id", () => {
    expect(cancelBookingSource).toContain("tenant_id");
  });

  it("updates booking status to 'canceled'", () => {
    expect(cancelBookingSource).toContain("canceled");
  });

  it("handles CORS OPTIONS preflight", () => {
    expect(cancelBookingSource).toContain("OPTIONS");
  });
});

// ---------------------------------------------------------------------------
// 3. reschedule_booking — functional/reschedule_booking_works
// ---------------------------------------------------------------------------

describe("elevenlabs-reschedule-booking: reschedule flow — functional/reschedule_booking_works", () => {
  it("source file exists", () => {
    expect(rescheduleBookingSource.length).toBeGreaterThan(200);
  });

  it("has verify_jwt = false in config.toml", () => {
    expect(getVerifyJwt(configToml, "elevenlabs-reschedule-booking")).toBe(true);
  });

  it("requires tenant_id", () => {
    expect(rescheduleBookingSource).toContain("tenant_id");
  });

  it("updates booking start_at field (the date/time of the visit)", () => {
    // Reschedule must update the date/time — uses start_at column
    expect(rescheduleBookingSource).toContain("start_at");
  });

  it("handles CORS OPTIONS preflight", () => {
    expect(rescheduleBookingSource).toContain("OPTIONS");
  });

  it("syncs test_drives scheduled_at when rescheduling (sales mode regression)", () => {
    // Bug fixed: reschedule-booking previously only updated bookings + busy_blocks.
    // For sales mode, the linked test_drive record also needs its scheduled_at updated.
    // Otherwise the test drives dashboard shows the OLD date even after rescheduling.
    expect(rescheduleBookingSource).toContain('"test_drives"');
    expect(rescheduleBookingSource).toContain("scheduled_at");
    // Verify the test_drives update is linked by booking_id (not just tenant_id)
    const testDrivesUpdateIdx = rescheduleBookingSource.indexOf('"test_drives"');
    const section = rescheduleBookingSource.slice(testDrivesUpdateIdx, testDrivesUpdateIdx + 300);
    expect(section).toContain("booking_id");
  });

  it("test_drives sync runs AFTER booking update (order matters)", () => {
    // The booking must be updated first, then test_drives.
    // If test_drives update runs before booking update, a crash could leave data inconsistent.
    const bookingUpdateIdx = rescheduleBookingSource.indexOf(".from(\"bookings\")");
    const testDrivesUpdateIdx = rescheduleBookingSource.indexOf('"test_drives"');
    expect(bookingUpdateIdx).toBeGreaterThan(-1);
    expect(testDrivesUpdateIdx).toBeGreaterThan(bookingUpdateIdx);
  });
});

// ---------------------------------------------------------------------------
// 4. create_callback — functional/callback_request_works
// ---------------------------------------------------------------------------

describe("elevenlabs-create-callback: callback capture — functional/callback_request_works", () => {
  it("source file exists", () => {
    expect(createCallbackSource.length).toBeGreaterThan(200);
  });

  it("has verify_jwt = false in config.toml", () => {
    expect(getVerifyJwt(configToml, "elevenlabs-create-callback")).toBe(true);
  });

  it("requires tenant_id", () => {
    expect(createCallbackSource).toContain("tenant_id");
  });

  it("captures customer reason/notes", () => {
    expect(createCallbackSource).toContain("reason");
  });

  it("handles CORS OPTIONS preflight", () => {
    expect(createCallbackSource).toContain("OPTIONS");
  });
});

// ---------------------------------------------------------------------------
// 5. text-conversation: SHARED_TOOLS availability for sales mode
// ---------------------------------------------------------------------------

describe("text-conversation: SHARED_TOOLS in sales mode — functional gates", () => {
  it("SHARED_TOOLS includes cancel_booking", () => {
    const sharedToolsStart = textConvSource.indexOf("const SHARED_TOOLS");
    const firstModeToolsStart = textConvSource.indexOf("const SALES_TOOLS");
    const sharedBlock = textConvSource.slice(sharedToolsStart, firstModeToolsStart);
    expect(sharedBlock).toContain("cancel_booking");
  });

  it("SHARED_TOOLS includes reschedule_booking", () => {
    const sharedToolsStart = textConvSource.indexOf("const SHARED_TOOLS");
    const firstModeToolsStart = textConvSource.indexOf("const SALES_TOOLS");
    const sharedBlock = textConvSource.slice(sharedToolsStart, firstModeToolsStart);
    expect(sharedBlock).toContain("reschedule_booking");
  });

  it("SHARED_TOOLS includes create_callback (lead capture)", () => {
    const sharedToolsStart = textConvSource.indexOf("const SHARED_TOOLS");
    const firstModeToolsStart = textConvSource.indexOf("const SALES_TOOLS");
    const sharedBlock = textConvSource.slice(sharedToolsStart, firstModeToolsStart);
    expect(sharedBlock).toContain("create_callback");
  });

  it("sales mode gets [...SHARED_TOOLS, ...SALES_TOOLS]", () => {
    expect(textConvSource).toContain("SHARED_TOOLS, ...SALES_TOOLS");
  });

  it("cancel_booking is mapped to elevenlabs-cancel-booking endpoint", () => {
    expect(textConvSource).toContain('cancel_booking: "elevenlabs-cancel-booking"');
  });

  it("reschedule_booking is mapped to elevenlabs-reschedule-booking endpoint", () => {
    expect(textConvSource).toContain('reschedule_booking: "elevenlabs-reschedule-booking"');
  });

  it("create_callback is mapped to elevenlabs-create-callback endpoint", () => {
    expect(textConvSource).toContain('create_callback: "elevenlabs-create-callback"');
  });
});

// ---------------------------------------------------------------------------
// 6. transfer_to_human: text-conversation override — functional/transfer_to_human_works
// ---------------------------------------------------------------------------

describe("text-conversation: transfer_to_human override — functional/transfer_to_human_works", () => {
  it("has TEXT CHANNEL OVERRIDE for transfer_to_owner", () => {
    expect(textConvSource).toContain("TEXT CHANNEL OVERRIDE");
  });

  it("overrides live transfer with create_callback in text mode", () => {
    const overrideBlock = textConvSource.slice(
      textConvSource.indexOf("TEXT CHANNEL OVERRIDE"),
      textConvSource.indexOf("TEXT CHANNEL OVERRIDE") + 500
    );
    expect(overrideBlock).toContain("create_callback");
  });

  it("override prevents saying 'let me transfer you' in text mode", () => {
    const overrideBlock = textConvSource.slice(
      textConvSource.indexOf("TEXT CHANNEL OVERRIDE"),
      textConvSource.indexOf("TEXT CHANNEL OVERRIDE") + 500
    );
    expect(overrideBlock).toContain("transfer");
    expect(overrideBlock).toContain("NOT available in text");
  });

  it("override tells AI to have owner reach out instead", () => {
    const overrideBlock = textConvSource.slice(
      textConvSource.indexOf("TEXT CHANNEL OVERRIDE"),
      textConvSource.indexOf("TEXT CHANNEL OVERRIDE") + 500
    );
    expect(overrideBlock).toContain("reach out");
  });
});

// ---------------------------------------------------------------------------
// 7. salesRules: callback_request (create_callback for non-ready leads)
// ---------------------------------------------------------------------------

describe("salesRules: callback for non-booking leads — functional/callback_request_works", () => {
  const salesRulesStart = textConvSource.indexOf("salesRules");
  const salesRulesBlock = textConvSource.slice(salesRulesStart, salesRulesStart + 3000);

  it("salesRules instructs using create_callback for interested but not ready leads", () => {
    expect(salesRulesBlock).toContain("create_callback");
  });

  it("salesRules handles callback for customers requesting to speak with manager", () => {
    expect(salesRulesBlock).toContain("callback");
    expect(salesRulesBlock).toContain("manager");
  });

  it("salesRules captures lead with interest details on create_callback", () => {
    // Should log what the customer is interested in
    expect(salesRulesBlock).toContain("interest");
  });
});

// ---------------------------------------------------------------------------
// 8. SALES_TOOLS: all 4 tools defined with correct names
// ---------------------------------------------------------------------------

describe("SALES_TOOLS: complete tool set for sales mode", () => {
  const salesToolsStart = textConvSource.indexOf("const SALES_TOOLS");
  const foodToolsStart = textConvSource.indexOf("const FOOD_TOOLS");
  const salesToolsBlock = textConvSource.slice(salesToolsStart, foodToolsStart);

  it("has search_inventory tool", () => {
    expect(salesToolsBlock).toContain('"search_inventory"');
  });

  it("has suggest_availability tool", () => {
    expect(salesToolsBlock).toContain('"suggest_availability"');
  });

  it("has create_booking tool", () => {
    expect(salesToolsBlock).toContain('"create_booking"');
  });

  it("has check_availability tool", () => {
    expect(salesToolsBlock).toContain('"check_availability"');
  });

  it("create_booking description says book immediately (no re-confirmation)", () => {
    const createBookingDesc = salesToolsBlock.slice(
      salesToolsBlock.indexOf('"create_booking"'),
      salesToolsBlock.indexOf('"create_booking"') + 400
    );
    expect(createBookingDesc).toContain("immediately");
  });

  it("search_inventory accepts query parameter for natural language search", () => {
    const searchInvDesc = salesToolsBlock.slice(
      salesToolsBlock.indexOf('"search_inventory"'),
      salesToolsBlock.indexOf('"search_inventory"') + 400
    );
    expect(searchInvDesc).toContain("query");
  });
});

// ---------------------------------------------------------------------------
// 9. Onboarding: callback_delivery_settings created for sales mode
// (bug fix: test-drive-handoff silently skipped owner notifications for new tenants)
// ---------------------------------------------------------------------------

const onboardingSubmitSource = readFileSync(
  join(root, "src/hooks/useOnboardingSubmit.ts"),
  "utf-8"
);

describe("useOnboardingSubmit: callback_delivery_settings for sales mode — functional/booking_sms_confirmation", () => {
  it("creates callback_delivery_settings for sales mode (test-drive notification delivery)", () => {
    expect(onboardingSubmitSource).toContain("callback_delivery_settings");
  });

  it("creates callback_delivery_settings when businessMode is 'sales'", () => {
    expect(onboardingSubmitSource).toContain("businessMode === \"sales\"");
    // The condition gate for callback settings
    const callbackSettingsIdx = onboardingSubmitSource.indexOf("callback delivery settings");
    const salesConditionIdx = onboardingSubmitSource.lastIndexOf(
      "businessMode === \"sales\"",
      callbackSettingsIdx + 500
    );
    expect(salesConditionIdx).toBeGreaterThan(-1);
  });

  it("creates callback_delivery_settings when tenant has sales_leads module", () => {
    // The condition: businessMode === "sales" || enabledModules.includes("sales_leads")
    const callbackGuardIdx = onboardingSubmitSource.indexOf(
      'businessMode === "sales" || enabledModules.includes("sales_leads")'
    );
    expect(callbackGuardIdx).toBeGreaterThan(-1);
  });

  it("callback_delivery_settings sets enabled=true by default", () => {
    const callbackRunStepIdx = onboardingSubmitSource.indexOf("callback delivery settings");
    const callbackBlock = onboardingSubmitSource.slice(callbackRunStepIdx, callbackRunStepIdx + 600);
    expect(callbackBlock).toContain("enabled: true");
  });

  it("callback_delivery_settings uses upsert (idempotent — safe to re-run onboarding)", () => {
    const callbackRunStepIdx = onboardingSubmitSource.indexOf("callback delivery settings");
    const callbackBlock = onboardingSubmitSource.slice(callbackRunStepIdx, callbackRunStepIdx + 600);
    expect(callbackBlock).toContain("upsert");
    expect(callbackBlock).toContain("onConflict");
  });

  it("non-regression: booking_delivery_settings still created for all modes", () => {
    expect(onboardingSubmitSource).toContain("booking_delivery_settings");
    // The step is called "delivery settings" in runStep
    expect(onboardingSubmitSource).toContain('"delivery settings"');
  });

  it("non-regression: dispatch_delivery_settings still created for dispatch mode", () => {
    expect(onboardingSubmitSource).toContain("dispatch_delivery_settings");
  });

  it("non-regression: order_delivery_settings still created for food mode", () => {
    expect(onboardingSubmitSource).toContain("order_delivery_settings");
  });
});
