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

// ─── oauthReady flag: prevents broken OAuth flows (gate: no_broken_connect_buttons) ─

describe("PROVIDERS: oauthReady flag prevents broken flows", () => {
  const useIntegrations = readFileSync(
    resolve("src/hooks/useIntegrations.ts"),
    "utf-8"
  );

  it("PROVIDERS array is exported from useIntegrations", () => {
    expect(useIntegrations).toContain("export const PROVIDERS");
  });

  it("google_calendar has oauthReady: true (OAuth flow configured)", () => {
    // google_calendar OAuth client is configured in Supabase secrets
    const gcal = useIntegrations.match(/id:\s*"google_calendar"[^}]+}/s)?.[0] || "";
    expect(gcal).toContain("oauthReady: true");
  });

  it("google_sheets has oauthReady: true (same OAuth client as calendar)", () => {
    const gsheets = useIntegrations.match(/id:\s*"google_sheets"[^}]+}/s)?.[0] || "";
    expect(gsheets).toContain("oauthReady: true");
  });

  it("quickbooks does NOT have oauthReady: true (not yet configured)", () => {
    // Would need QuickBooks OAuth credentials in Supabase secrets
    const qb = useIntegrations.match(/id:\s*"quickbooks"[^}]+}/s)?.[0] || "";
    expect(qb).not.toContain("oauthReady: true");
  });

  it("hubspot does NOT have oauthReady: true (not yet configured)", () => {
    const hs = useIntegrations.match(/id:\s*"hubspot"[^}]+}/s)?.[0] || "";
    expect(hs).not.toContain("oauthReady: true");
  });

  it("jobber does NOT have oauthReady: true (not yet configured)", () => {
    const jobber = useIntegrations.match(/id:\s*"jobber"[^}]+}/s)?.[0] || "";
    expect(jobber).not.toContain("oauthReady: true");
  });

  it("square_pos does NOT have oauthReady: true (not yet configured)", () => {
    const sq = useIntegrations.match(/id:\s*"square_pos"[^}]+}/s)?.[0] || "";
    expect(sq).not.toContain("oauthReady: true");
  });
});

describe("IntegrationConnectDialog: oauthReady guard prevents broken flows", () => {
  it("defines isOAuthReady: only true when provider.oauthReady === true", () => {
    expect(source).toContain("isOAuthReady");
    expect(source).toContain("provider?.oauthReady === true");
  });

  it("defines isOAuthComingSoon: true when OAuth but no oauthReady flag", () => {
    expect(source).toContain("isOAuthComingSoon");
    expect(source).toContain("isOAuth && !provider?.oauthReady");
  });

  it("shows coming-soon UI when isOAuthComingSoon (no broken flow)", () => {
    // Key line: the step="connect" block is conditional on !isOAuthComingSoon
    expect(source).toContain("isOAuthComingSoon");
    // The non-coming-soon path must be gated
    expect(source).toContain("!isOAuthComingSoon");
  });

  it("OAuth button only renders for isOAuthReady providers", () => {
    // The real OAuth button is inside the !isOAuthComingSoon block
    // AND further conditioned on isOAuthReady
    expect(source).toContain("isOAuthReady");
    // Should reference both flags (isOAuthReady AND isOAuthComingSoon)
    const oauthReadyCount = (source.match(/isOAuthReady/g) || []).length;
    expect(oauthReadyCount).toBeGreaterThanOrEqual(2);
  });
});
