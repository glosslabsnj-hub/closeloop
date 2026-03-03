/**
 * Error Boundary Coverage Tests
 *
 * @vitest-environment node
 *
 * Ensures all critical page components are wrapped with ErrorBoundary
 * to prevent full-page crashes when child components throw.
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

// Critical pages that MUST have ErrorBoundary protection
const CRITICAL_PAGES = [
  "DashboardPage.tsx",
  "BookingsPage.tsx",
  "BusinessBrainPage.tsx",
  "CallsPage.tsx",
  "CustomersPage.tsx",
  "LeadsPage.tsx",
  "SettingsPage.tsx",
  "UnifiedInboxPage.tsx",
  "OrdersPage.tsx",
  "AIAssistantPage.tsx",
  "DispatchPage.tsx",
  "IntegrationsPage.tsx",
  "SimulatorPage.tsx",
  "OnboardingPage.tsx",
  "ReportsROIPage.tsx",
  "GoLivePage.tsx",
  "TestAIPage.tsx",
  "AutomationsPage.tsx",
  "UsagePage.tsx",
  "ServicesPage.tsx",
  "AgreementsPage.tsx",
  "HelpCenterPage.tsx",
];

describe("Error boundary coverage: critical pages", () => {
  for (const page of CRITICAL_PAGES) {
    it(`${page} imports ErrorBoundary`, () => {
      const source = readPage(page);
      if (!source) {
        // File doesn't exist - skip
        return;
      }
      expect(
        source.includes("ErrorBoundary"),
        `${page} must import and use ErrorBoundary component`
      ).toBe(true);
    });

    it(`${page} uses <ErrorBoundary> in JSX`, () => {
      const source = readPage(page);
      if (!source) return;
      // Check for actual JSX usage, not just import
      const hasJsxUsage = source.includes("<ErrorBoundary") || source.includes("<ErrorBoundary>");
      expect(
        hasJsxUsage,
        `${page} imports ErrorBoundary but does not wrap content with <ErrorBoundary>`
      ).toBe(true);
    });
  }
});
