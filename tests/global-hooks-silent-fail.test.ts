/**
 * Global Hooks Silent Fail Tests
 *
 * @vitest-environment node
 *
 * Ensures all hooks that run on every page via AppLayout
 * handle errors silently (return defaults, never throw).
 * This prevents console errors and app crashes when tables
 * have RLS issues or are unreachable.
 *
 * Gates: overall/no_console_errors
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const HOOKS_DIR = join(process.cwd(), "src/hooks");

function readHook(filename: string): string {
  const path = join(HOOKS_DIR, filename);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf-8");
}

/**
 * Global hooks: these run on EVERY page via AppLayout or its child components.
 * They MUST:
 * - Return a default value (null, [], 0) on error — never throw
 * - Have retry: false — prevent repeated failed requests
 * - Have staleTime > 0 if they're non-tenant-scoped — reduce unnecessary re-queries
 */
const GLOBAL_HOOKS = [
  {
    file: "useKnowledgeConflicts.ts",
    hookName: "useKnowledgeConflicts",
    reason: "Used in AppLayout line 72 — runs on every page",
    shouldReturnOnError: "[]",
    mustHaveRetryFalse: true,
  },
  {
    file: "useAgencyData.ts",
    hookName: "useAgencyAccount",
    reason: "Used via useIsAgencyUser in AppLayout line 78 — runs on every page",
    shouldReturnOnError: "null",
    mustHaveRetryFalse: true,
  },
  {
    file: "useAgencyApplications.ts",
    hookName: "useMyAgencyApplication",
    reason: "Used in AppLayout line 79 — runs on every page",
    shouldReturnOnError: "null",
    mustHaveRetryFalse: true,
  },
  {
    file: "useNotifications.ts",
    hookName: "useNotifications",
    reason: "Used in NotificationBell (MobileHeader in AppLayout) — runs on every page",
    shouldReturnOnError: "[]",
    mustHaveRetryFalse: true,
  },
];

describe("Global hooks: silent fail pattern", () => {
  for (const hook of GLOBAL_HOOKS) {
    describe(`${hook.hookName} (${hook.file})`, () => {
      it("must NOT throw on Supabase error", () => {
        const source = readHook(hook.file);
        if (!source) {
          expect.fail(`${hook.file} not found`);
        }

        // Extract the function body for the specific hook
        const hookStart = source.indexOf(`function ${hook.hookName}`);
        expect(hookStart, `${hook.hookName} function not found in ${hook.file}`).toBeGreaterThan(-1);

        // Get the code from the hook start to the next export or end
        const afterHook = source.slice(hookStart);
        const nextExport = afterHook.indexOf("\nexport ", 10);
        const hookBody = nextExport > 0 ? afterHook.slice(0, nextExport) : afterHook;

        // Must not throw in queryFn — only in mutations
        // Look for the pattern: if (error) throw error inside queryFn
        const queryFnMatch = hookBody.match(/queryFn:\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*(?:enabled|retry|staleTime|queryKey)/);
        if (queryFnMatch) {
          const queryFnBody = queryFnMatch[1];
          const throwsOnError = /if\s*\(\s*error\s*\)\s*throw\s+error/.test(queryFnBody);
          expect(
            throwsOnError,
            `${hook.hookName} queryFn must NOT 'throw error' — it runs on every page via AppLayout. Return a default value instead. Reason: ${hook.reason}`
          ).toBe(false);
        }
      });

      it("must have retry: false", () => {
        const source = readHook(hook.file);
        if (!source) return;

        const hookStart = source.indexOf(`function ${hook.hookName}`);
        const afterHook = source.slice(hookStart);
        const nextExport = afterHook.indexOf("\nexport ", 10);
        const hookBody = nextExport > 0 ? afterHook.slice(0, nextExport) : afterHook;

        // Check for retry: false in the useQuery options
        expect(
          hookBody.includes("retry: false") || hookBody.includes("retry:false"),
          `${hook.hookName} must have retry: false to prevent repeated failed requests`
        ).toBe(true);
      });

      it("must have staleTime > 0 to reduce unnecessary re-queries", () => {
        const source = readHook(hook.file);
        if (!source) return;

        const hookStart = source.indexOf(`function ${hook.hookName}`);
        const afterHook = source.slice(hookStart);
        const nextExport = afterHook.indexOf("\nexport ", 10);
        const hookBody = nextExport > 0 ? afterHook.slice(0, nextExport) : afterHook;

        // Check for staleTime in the useQuery options
        expect(
          hookBody.includes("staleTime"),
          `${hook.hookName} must have staleTime > 0 to cache results and reduce HTTP requests on every page navigation`
        ).toBe(true);
      });

      it("must return a safe default on error", () => {
        const source = readHook(hook.file);
        if (!source) return;

        const hookStart = source.indexOf(`function ${hook.hookName}`);
        const afterHook = source.slice(hookStart);
        const nextExport = afterHook.indexOf("\nexport ", 10);
        const hookBody = nextExport > 0 ? afterHook.slice(0, nextExport) : afterHook;

        // Check that the queryFn has error handling that returns a default
        const hasErrorReturn = /if\s*\(\s*error\s*\)\s*return\s/.test(hookBody);
        expect(
          hasErrorReturn,
          `${hook.hookName} queryFn must return a safe default value on error (e.g., return null or return [])`
        ).toBe(true);
      });
    });
  }
});

// Verify the AppLayout actually uses these hooks
describe("AppLayout hook imports", () => {
  it("imports useKnowledgeConflicts", () => {
    const source = readFileSync(join(process.cwd(), "src/components/layouts/AppLayout.tsx"), "utf-8");
    expect(source).toContain("useKnowledgeConflicts");
  });

  it("imports useIsAgencyUser (which calls useAgencyAccount)", () => {
    const source = readFileSync(join(process.cwd(), "src/components/layouts/AppLayout.tsx"), "utf-8");
    expect(source).toContain("useIsAgencyUser");
  });

  it("imports useMyAgencyApplication", () => {
    const source = readFileSync(join(process.cwd(), "src/components/layouts/AppLayout.tsx"), "utf-8");
    expect(source).toContain("useMyAgencyApplication");
  });

  it("NotificationBell component uses useNotifications", () => {
    const source = readFileSync(join(process.cwd(), "src/components/notifications/NotificationBell.tsx"), "utf-8");
    expect(source).toContain("useNotifications");
  });
});
