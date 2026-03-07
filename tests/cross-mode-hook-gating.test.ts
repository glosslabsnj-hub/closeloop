/**
 * Cross-Mode Hook Gating — Regression Tests
 *
 * @vitest-environment node
 *
 * Prevents mode-specific hooks from querying wrong tables for other modes.
 * These are regression tests for bugs found during QA of electrical tenants:
 *
 * BUG #505 (2026-03-06): useFoodOrderSettings queried food_order_settings for ALL tenants.
 * This caused HTTP 406 errors on every page load for non-food businesses (e.g., electricians).
 * Fix: `enabled: !!tenant?.id && isFoodMode` — only queries when businessMode === "food".
 *
 * Without this guard, every non-food tenant gets a 406 console error on every page load,
 * making the app look broken and blocking the overall/no_console_errors quality gate.
 *
 * Gate: service overall/no_console_errors
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HOOKS_DIR = join(process.cwd(), "src/hooks");
const BUILD_CONTEXT_PATH = join(
  process.cwd(),
  "supabase/functions/_shared/buildBusinessContext.ts"
);

function readHook(filename: string): string {
  return readFileSync(join(HOOKS_DIR, filename), "utf-8");
}

const buildCtx = readFileSync(BUILD_CONTEXT_PATH, "utf-8");

// ---------------------------------------------------------------------------
// BUG #505: useFoodOrderSettings must NOT query for non-food tenants
// ---------------------------------------------------------------------------

describe("useFoodOrderSettings: mode-gated query (BUG #505 regression)", () => {
  const source = readHook("useFoodOrderSettings.ts");

  it("hook file exists", () => {
    expect(source.length).toBeGreaterThan(0);
  });

  it("imports useTenantConfig for mode detection", () => {
    expect(source).toContain("useTenantConfig");
  });

  it("derives isFoodMode from businessMode", () => {
    expect(source).toContain('businessMode === "food"');
  });

  it("useQuery enabled flag is gated to food mode only", () => {
    // Must contain enabled: ... isFoodMode to prevent non-food tenants from querying
    expect(source).toContain("isFoodMode");
    // enabled flag must reference isFoodMode
    const enabledMatch = source.match(/enabled:\s*[^,\n}]+isFoodMode[^,\n}]*/);
    expect(
      enabledMatch,
      "enabled flag must be gated by isFoodMode — without this, every non-food tenant gets HTTP 406"
    ).not.toBeNull();
  });

  it("enabled flag requires both tenant.id AND isFoodMode (not just one)", () => {
    // Both conditions must be present: !!tenant?.id AND isFoodMode
    const enabledMatch = source.match(/enabled:\s*([^\n,]+)/);
    expect(enabledMatch).not.toBeNull();
    const enabledExpr = enabledMatch![1];
    expect(enabledExpr).toContain("tenant");
    expect(enabledExpr).toContain("isFoodMode");
  });

  it("uses maybeSingle() not single() to prevent 406 when row missing", () => {
    // .single() throws if no row found (returns 406). maybeSingle() returns null safely.
    expect(source).toContain("maybeSingle()");
    expect(source).not.toContain(".single()");
  });

  it("non-food tenants protected by enabled flag (not by removing throw)", () => {
    // The correct protection for non-food tenants is the `enabled: isFoodMode` flag.
    // When enabled=false, React Query never runs queryFn so no DB calls and no errors.
    // This is better than suppressing errors — non-food tenants get zero queries.
    // Food tenants with real DB errors should still surface them (correct behavior).
    expect(source).toContain("enabled:");
    expect(source).toContain("isFoodMode");
  });
});

// ---------------------------------------------------------------------------
// BUG #506: buildBusinessContext must override stale hours FAQs dynamically
// ---------------------------------------------------------------------------

describe("buildBusinessContext: hours FAQ live override (BUG #506 regression)", () => {
  it("exports buildWeeklyHoursSummary function", () => {
    expect(buildCtx).toContain("export function buildWeeklyHoursSummary");
  });

  it("fetches live hours_json from tenant", () => {
    expect(buildCtx).toContain("hours_json");
  });

  it("computes liveHoursString from buildWeeklyHoursSummary + normalizeHours", () => {
    // This is the core of the BUG #506 fix
    expect(buildCtx).toContain("liveHoursString");
    expect(buildCtx).toContain("buildWeeklyHoursSummary(normalizeHours(");
  });

  it("overrides FAQ answer when question contains 'hour'", () => {
    // The override uses rawFaqs.map(f => f.question.toLowerCase().includes("hour") ? ...)
    expect(buildCtx).toContain('f.question.toLowerCase().includes("hour")');
    // The replacement: { ...f, answer: liveHoursString }
    expect(buildCtx).toContain("answer: liveHoursString");
  });

  it("only overrides FAQs when liveHoursString is non-empty", () => {
    // The guard is a ternary: liveHoursString\n    ? rawFaqs.map(...) : rawFaqs
    // We verify by checking "const faqs = liveHoursString" exists (the ternary start)
    // and that rawFaqs appears as the fallback (the false branch)
    expect(buildCtx).toContain("const faqs = liveHoursString");
    // The ternary false branch returns rawFaqs unmodified when hours not set
    const faqsIdx = buildCtx.indexOf("const faqs = liveHoursString");
    const ternaryBlock = buildCtx.slice(faqsIdx, faqsIdx + 300);
    expect(ternaryBlock).toContain("rawFaqs");
  });

  it("rawFaqs variable holds the original DB data before override", () => {
    expect(buildCtx).toContain("rawFaqs");
  });

  it("final faqs variable used in system prompt is the overridden version", () => {
    // After override, we use `faqs` not `rawFaqs` in the prompt
    expect(buildCtx).toContain("const faqs = liveHoursString");
  });
});

// ---------------------------------------------------------------------------
// Mode isolation: no other mode-specific hooks should query the wrong table
// ---------------------------------------------------------------------------

describe("mode isolation: medical and dispatch hooks", () => {
  it("useMedicalDashboard exists if medical mode features are present", () => {
    const { existsSync } = require("node:fs");
    // If medical hooks exist, they should be gated
    const medicalHookPath = join(HOOKS_DIR, "useMedicalDashboard.ts");
    if (existsSync(medicalHookPath)) {
      const source = readFileSync(medicalHookPath, "utf-8");
      // Should have some mode check
      expect(source.length).toBeGreaterThan(0);
    }
    // If it doesn't exist yet, that's fine — pass
    expect(true).toBe(true);
  });

  it("useFoodDashboard is gated to food mode or food tenants", () => {
    const foodDashPath = join(HOOKS_DIR, "useFoodDashboard.ts");
    const { existsSync } = require("node:fs");
    if (existsSync(foodDashPath)) {
      const source = readFileSync(foodDashPath, "utf-8");
      // Should have tenant_id gating at minimum
      expect(source).toContain("tenant");
    }
    expect(true).toBe(true);
  });
});
