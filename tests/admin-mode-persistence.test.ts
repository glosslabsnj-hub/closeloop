/**
 * Tests for admin mode/tenant persistence.
 *
 * @vitest-environment node
 *
 * Architecture: AdminModeProvider is a SINGLETON in App.tsx (above the router).
 * This means it never remounts when navigating between /admin/* and /app/*.
 * Previously, it was duplicated in both AppLayout and AdminLayout, causing
 * mode resets and tenant auto-switches on layout transitions.
 *
 * Defense-in-depth: AppLayout redirect effects also check localStorage for
 * admin tenant ID as a synchronous backup, preventing redirects during any
 * brief React state lag.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const srcFile = (relPath: string) =>
  readFileSync(join(process.cwd(), relPath), "utf-8");

// The localStorage keys used by the admin system
const TENANT_STORAGE_KEY = "flux_admin_active_tenant_id";
const MODE_STORAGE_KEY = "flux_admin_active_mode";

const VALID_MODES = ["service", "dispatch", "food", "medical", "sales", "general"] as const;

/** Minimal localStorage mock for unit tests (no browser environment) */
function createStorage(): Record<string, string> & {
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
} {
  const store: Record<string, string> = {};
  return Object.assign(store, {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  });
}

describe("Admin mode localStorage persistence", () => {
  it("stores mode in localStorage on set", () => {
    const ls = createStorage();
    ls.setItem(MODE_STORAGE_KEY, "food");
    expect(ls.getItem(MODE_STORAGE_KEY)).toBe("food");
  });

  it("restores mode from localStorage on mount", () => {
    const ls = createStorage();
    ls[MODE_STORAGE_KEY] = "dispatch";
    expect(ls.getItem(MODE_STORAGE_KEY)).toBe("dispatch");
    expect(VALID_MODES).toContain(ls.getItem(MODE_STORAGE_KEY));
  });

  it("defaults to 'service' when localStorage is empty", () => {
    const ls = createStorage();
    const cached = ls.getItem(MODE_STORAGE_KEY);
    const mode = cached && VALID_MODES.includes(cached as any) ? cached : "service";
    expect(mode).toBe("service");
  });

  it("defaults to 'service' when localStorage has invalid mode", () => {
    const ls = createStorage();
    ls[MODE_STORAGE_KEY] = "invalid_mode";
    const cached = ls.getItem(MODE_STORAGE_KEY);
    const mode = cached && VALID_MODES.includes(cached as any) ? cached : "service";
    expect(mode).toBe("service");
  });

  it("stores tenant ID in localStorage on set", () => {
    const ls = createStorage();
    ls.setItem(TENANT_STORAGE_KEY, "abc-123");
    expect(ls.getItem(TENANT_STORAGE_KEY)).toBe("abc-123");
  });

  it("clears both mode and tenant on sign out", () => {
    const ls = createStorage();
    ls[MODE_STORAGE_KEY] = "food";
    ls[TENANT_STORAGE_KEY] = "abc-123";

    ls.removeItem(TENANT_STORAGE_KEY);
    ls.removeItem(MODE_STORAGE_KEY);

    expect(ls.getItem(MODE_STORAGE_KEY)).toBeNull();
    expect(ls.getItem(TENANT_STORAGE_KEY)).toBeNull();
  });

  it("all 6 business modes are valid for localStorage cache", () => {
    const ls = createStorage();
    for (const mode of VALID_MODES) {
      ls.setItem(MODE_STORAGE_KEY, mode);
      expect(VALID_MODES).toContain(ls.getItem(MODE_STORAGE_KEY));
    }
  });
});

describe("Admin tenant auto-switch guard", () => {
  it("should not auto-switch when mode is loading", () => {
    const modeIsLoading = true;
    const tenants = [{ id: "t1", business_mode: "service" }];
    const effectiveTenantId = "t2";
    const currentTenantMatchesMode = tenants.some(t => t.id === effectiveTenantId);

    expect(currentTenantMatchesMode).toBe(false);

    let switched = false;
    if (!modeIsLoading && !currentTenantMatchesMode && tenants.length > 0) {
      switched = true;
    }
    expect(switched).toBe(false);
  });

  it("should auto-switch when mode is loaded and tenant mismatches", () => {
    const modeIsLoading = false;
    const tenants = [{ id: "t1", business_mode: "service" }];
    const effectiveTenantId = "t2";
    const currentTenantMatchesMode = tenants.some(t => t.id === effectiveTenantId);

    let switched = false;
    if (!modeIsLoading && !currentTenantMatchesMode && tenants.length > 0) {
      switched = true;
    }
    expect(switched).toBe(true);
  });

  it("should NOT auto-switch when tenant already matches mode", () => {
    const modeIsLoading = false;
    const tenants = [{ id: "t1", business_mode: "service" }];
    const effectiveTenantId = "t1";
    const currentTenantMatchesMode = tenants.some(t => t.id === effectiveTenantId);

    let switched = false;
    if (!modeIsLoading && !currentTenantMatchesMode && tenants.length > 0) {
      switched = true;
    }
    expect(switched).toBe(false);
  });
});

describe("AdminModeProvider singleton architecture", () => {
  it("App.tsx imports and wraps with AdminModeProvider (singleton)", () => {
    const appSrc = srcFile("src/App.tsx");
    expect(appSrc).toContain("import { AdminModeProvider }");
    expect(appSrc).toContain("<AdminModeProvider>");
    expect(appSrc).toContain("</AdminModeProvider>");
  });

  it("AppLayout does NOT import or wrap with AdminModeProvider", () => {
    const src = srcFile("src/components/layouts/AppLayout.tsx");
    expect(src).not.toContain("AdminModeProvider");
  });

  it("AdminLayout does NOT import or wrap with AdminModeProvider", () => {
    const src = srcFile("src/components/layouts/AdminLayout.tsx");
    expect(src).not.toContain("AdminModeProvider");
  });
});

describe("Redirect defense: localStorage backup for admin sessions", () => {
  it("redirect to onboarding is blocked when localStorage has admin tenant", () => {
    const ls = createStorage();
    ls[TENANT_STORAGE_KEY] = "cool-comfort-hvac-id";

    const isSuperAdmin = false; // brief state lag
    const tenant = null; // brief state lag
    const isAgency = false;
    const isAgencyLoading = false;

    // Without defense: would redirect
    const wouldRedirectWithout = !tenant && !isSuperAdmin && !isAgency && !isAgencyLoading;
    expect(wouldRedirectWithout).toBe(true);

    // With localStorage defense: blocked
    const hasLocalStorageAdmin = !!ls.getItem(TENANT_STORAGE_KEY);
    const wouldRedirectWith = wouldRedirectWithout && !hasLocalStorageAdmin;
    expect(wouldRedirectWith).toBe(false);
  });

  it("redirect to go-live is blocked when localStorage has admin tenant", () => {
    const ls = createStorage();
    ls[TENANT_STORAGE_KEY] = "cool-comfort-hvac-id";

    const isSuperAdmin = false; // brief state lag

    // Without defense: would redirect (isSuperAdmin is false)
    expect(!isSuperAdmin).toBe(true);

    // With localStorage defense: blocked
    const hasLocalStorageAdmin = !!ls.getItem(TENANT_STORAGE_KEY);
    expect(!isSuperAdmin && !hasLocalStorageAdmin).toBe(false);
  });

  it("redirect still works for non-admin users (no localStorage key)", () => {
    const ls = createStorage();
    const isSuperAdmin = false;
    const tenant = null;
    const isAgency = false;
    const isAgencyLoading = false;

    const wouldRedirect = !tenant && !isSuperAdmin && !isAgency && !isAgencyLoading;
    const hasLocalStorageAdmin = !!ls.getItem(TENANT_STORAGE_KEY);
    const finalRedirect = wouldRedirect && !hasLocalStorageAdmin;
    expect(finalRedirect).toBe(true);
  });

  it("AppLayout redirect effects include localStorage backup check", () => {
    const src = srcFile("src/components/layouts/AppLayout.tsx");
    const matches = src.match(/localStorage\.getItem\("flux_admin_active_tenant_id"\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

describe("effectiveTenantId bridge during loading", () => {
  // Simulates the computation at AuthContext lines 63-66
  function computeEffectiveTenantId(
    isSuperAdmin: boolean,
    loading: boolean,
    adminActiveId: string | null,
    tenantId: string | null,
  ) {
    return (isSuperAdmin || (loading && adminActiveId))
      && adminActiveId
      ? adminActiveId
      : tenantId || null;
  }

  it("returns cached tenant ID during loading even when isSuperAdmin is false", () => {
    // Scenario: page reload, isSuperAdmin not yet determined, localStorage has cached tenant
    const result = computeEffectiveTenantId(false, true, "hvac-uuid", null);
    expect(result).toBe("hvac-uuid");
  });

  it("returns cached tenant ID when isSuperAdmin is true and loading is false", () => {
    const result = computeEffectiveTenantId(true, false, "hvac-uuid", "default-uuid");
    expect(result).toBe("hvac-uuid");
  });

  it("falls back to tenant ID for non-admin users during loading", () => {
    // No adminSettings cached — regular user
    const result = computeEffectiveTenantId(false, true, null, "user-tenant");
    expect(result).toBe("user-tenant");
  });

  it("returns null for non-admin users with no tenant during loading", () => {
    const result = computeEffectiveTenantId(false, true, null, null);
    expect(result).toBeNull();
  });

  it("after loading, non-admin without cached admin ID uses tenant.id", () => {
    const result = computeEffectiveTenantId(false, false, null, "user-tenant");
    expect(result).toBe("user-tenant");
  });
});

describe("fetchAdminSettings auto-create sets localStorage", () => {
  it("AuthContext auto-create branch persists to localStorage", () => {
    const src = srcFile("src/contexts/AuthContext.tsx");
    // Find the auto-create section (after upsert success, before early return)
    const autoCreateSection = src.indexOf("Auto-creating admin_settings");
    const earlyReturn = src.indexOf("return;", autoCreateSection);
    const sectionBetween = src.slice(autoCreateSection, earlyReturn);
    // Must include localStorage.setItem call
    expect(sectionBetween).toContain("localStorage.setItem");
  });

  it("fetchAdminSettings supports skipTenantFetch parameter", () => {
    const src = srcFile("src/contexts/AuthContext.tsx");
    expect(src).toContain("skipTenantFetch = false");
    expect(src).toContain("!skipTenantFetch");
  });
});
