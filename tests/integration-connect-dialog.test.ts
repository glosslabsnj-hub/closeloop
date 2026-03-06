/**
 * IntegrationConnectDialog — Structural Regression Tests
 *
 * @vitest-environment node
 *
 * Verifies two bugs in the integration connect flow are not re-introduced:
 *
 * Bug 1: apiKey state was never saved in config_json.
 *   The integration was created with config_json: {} — silently discarding
 *   any API key the user typed in. Fix: apiKey included in config before mutateAsync.
 *
 * Bug 2: testIntegration.mutateAsync called with providerId (string like "fieldedge")
 *   instead of the integration UUID. test-integration edge function looks up by UUID
 *   so the DB lookup would always return 404, causing all connection tests to fail.
 *   Fix: capture created.id from createIntegration.mutateAsync and pass that.
 *
 * Gates: integrations/api_key_integrations_connect
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve("src/components/integrations/IntegrationConnectDialog.tsx"),
  "utf-8"
);

// ─── Bug 1: apiKey must be saved in config_json ───────────────────────────────

describe("IntegrationConnectDialog: apiKey saved in config_json (regression: bug 1)", () => {
  it("has apiKey state variable", () => {
    expect(source).toContain("const [apiKey, setApiKey] = useState");
  });

  it("includes apiKey in config before createIntegration.mutateAsync", () => {
    // The config object must include api_key when apiKey is truthy
    expect(source).toContain("config.api_key = apiKey");
  });

  it("passes config to createIntegration.mutateAsync (not empty object)", () => {
    // The config_json field must reference the config variable, not an inline {}
    const lines = source.split("\n");
    const configJsonLine = lines.find(l => l.includes("config_json: config"));
    expect(
      configJsonLine,
      "config_json must pass the config variable (not an empty object literal {})"
    ).toBeTruthy();
  });

  it("does NOT pass empty config_json literal to createIntegration", () => {
    // Must not have: config_json: {}  (the old bug)
    expect(source).not.toContain("config_json: {}");
  });
});

// ─── Bug 2: testIntegration must use integration UUID, not providerId ─────────

describe("IntegrationConnectDialog: testIntegration uses integration UUID (regression: bug 2)", () => {
  it("stores createdIntegrationId state after successful createIntegration", () => {
    expect(source).toContain("createdIntegrationId");
    expect(source).toContain("setCreatedIntegrationId");
  });

  it("captures integration ID from createIntegration.mutateAsync return value", () => {
    // Must assign return value: const created = await createIntegration.mutateAsync(...)
    // Then: setCreatedIntegrationId(created?.id ?? null)
    expect(source).toContain("setCreatedIntegrationId(created?.id");
  });

  it("calls testIntegration.mutateAsync with createdIntegrationId (not providerId)", () => {
    // OLD (bug): testIntegration.mutateAsync(providerId)
    // NEW (fix): testIntegration.mutateAsync(createdIntegrationId)
    const lines = source.split("\n");
    const testMutateLine = lines.find(l => l.includes("testIntegration.mutateAsync"));
    expect(testMutateLine).toBeTruthy();
    expect(testMutateLine).toContain("createdIntegrationId");
    expect(testMutateLine).not.toContain("providerId");
  });

  it("resets createdIntegrationId to null on dialog close", () => {
    // Prevents stale ID from a previous session being used in a subsequent test
    const lines = source.split("\n");
    const handleClose = source.split("const handleClose")[1]?.split("const handleDone")[0] || "";
    expect(handleClose).toContain("setCreatedIntegrationId(null)");
  });
});

// ─── OAuth flow still uses legacy calendar endpoint for Google ────────────────

describe("IntegrationConnectDialog: OAuth backwards compatibility", () => {
  it("uses legacy calendar-oauth-start for google_calendar (backwards compat)", () => {
    expect(source).toContain("calendar-oauth-start");
    // Legacy endpoint is only used for google_calendar / google_sheets
    expect(source).toContain("isLegacyCalendar");
  });

  it("uses integration-oauth-start for non-Google OAuth providers", () => {
    expect(source).toContain("integration-oauth-start");
  });

  it("opens OAuth popup centered on screen", () => {
    expect(source).toContain("window.open(");
    expect(source).toContain("screenX");
    expect(source).toContain("screenY");
  });

  it("listens for integration-oauth-success postMessage", () => {
    expect(source).toContain("integration-oauth-success");
  });

  it("handles integration-oauth-error postMessage", () => {
    expect(source).toContain("integration-oauth-error");
  });
});
