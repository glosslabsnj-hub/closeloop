/**
 * Error Recovery Pattern Regression Tests
 *
 * @vitest-environment node
 *
 * Verifies all data-loading pages use the correct error recovery pattern:
 * 1. React Query refetch() — NOT window.location.reload()
 * 2. Contextual error heading ("Couldn't load your X")
 * 3. "Back to Dashboard" link to /app
 * 4. "Contact Support" link to support@getfluxdata.com
 *
 * Gates: overall/error_states_have_recovery
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const PAGES_DIR = join(process.cwd(), "src/pages/app");

function readPage(filename: string): string {
  const path = join(PAGES_DIR, filename);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf-8");
}

// Pages that were updated in the error recovery pass (commit 58cf36b)
const PAGES_WITH_ERROR_RECOVERY = [
  "InboxPage.tsx",
  "BookingsPage.tsx",
  "LeadsPage.tsx",
  "DispatchPage.tsx",
  "OrdersPage.tsx",
  "JobsPage.tsx",
  "ReportsROIPage.tsx",
  "AgencyDashboardPage.tsx",
  "UnifiedInboxPage.tsx",
];

describe("Error recovery pattern: refetch not reload", () => {
  for (const page of PAGES_WITH_ERROR_RECOVERY) {
    it(`${page} uses React Query retry for error recovery`, () => {
      const source = readPage(page);
      if (!source) return;
      // Accept either refetch() or invalidateQueries() — both are React Query patterns
      const usesReactQuery = source.includes("refetch") || source.includes("invalidateQueries");
      expect(
        usesReactQuery,
        `${page} must use React Query refetch() or invalidateQueries() for error recovery`
      ).toBe(true);
    });

    it(`${page} does NOT use window.location.reload()`, () => {
      const source = readPage(page);
      if (!source) return;
      expect(
        source.includes("window.location.reload"),
        `${page} must NOT use window.location.reload() — use refetch() instead`
      ).toBe(false);
    });
  }
});

describe("Error recovery pattern: contextual headings", () => {
  for (const page of PAGES_WITH_ERROR_RECOVERY) {
    it(`${page} has a contextual error heading ("Couldn't load your...")`, () => {
      const source = readPage(page);
      if (!source) return;
      expect(
        source.includes("Couldn't load your"),
        `${page} must have a contextual heading like "Couldn't load your bookings"`
      ).toBe(true);
    });
  }
});

describe("Error recovery pattern: recovery links", () => {
  for (const page of PAGES_WITH_ERROR_RECOVERY) {
    it(`${page} has "Back to Dashboard" link`, () => {
      const source = readPage(page);
      if (!source) return;
      expect(
        source.includes("Back to Dashboard"),
        `${page} must include a "Back to Dashboard" link for recovery`
      ).toBe(true);
    });

    it(`${page} has "Contact Support" link`, () => {
      const source = readPage(page);
      if (!source) return;
      expect(
        source.includes("Contact Support"),
        `${page} must include a "Contact Support" link for recovery`
      ).toBe(true);
    });

    it(`${page} links to support email`, () => {
      const source = readPage(page);
      if (!source) return;
      expect(
        source.includes("support@getfluxdata.com"),
        `${page} must link to support@getfluxdata.com`
      ).toBe(true);
    });

    it(`${page} links back to /app`, () => {
      const source = readPage(page);
      if (!source) return;
      // Check for Link to="/app" or href="/app"
      expect(
        source.includes('to="/app"') || source.includes('href="/app"'),
        `${page} must have a link back to /app (dashboard)`
      ).toBe(true);
    });
  }
});

describe("Error recovery pattern: no reload anywhere in app pages", () => {
  // Broader check: NO app page should use window.location.reload
  const ALL_PAGES = [
    ...PAGES_WITH_ERROR_RECOVERY,
    "DashboardPage.tsx",
    "BusinessBrainPage.tsx",
    "CallsPage.tsx",
    "CustomersPage.tsx",
    "SettingsPage.tsx",
    "AIAssistantPage.tsx",
    "IntegrationsPage.tsx",
    "OnboardingPage.tsx",
    "GoLivePage.tsx",
    "TestAIPage.tsx",
    "AutomationsPage.tsx",
    "SimulatorPage.tsx",
  ];

  for (const page of ALL_PAGES) {
    it(`${page} does not use window.location.reload()`, () => {
      const source = readPage(page);
      if (!source) return;
      expect(
        source.includes("window.location.reload"),
        `${page} must NOT use window.location.reload() — use React Query refetch() or React Router navigate()`
      ).toBe(false);
    });
  }
});
