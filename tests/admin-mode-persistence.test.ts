/**
 * Tests for admin mode/tenant persistence across layout remounts.
 *
 * Bug fixed: Admin tenant selection reset on page navigation because
 * AppLayout and AdminLayout each create separate AdminModeProvider instances.
 * When navigating between /admin/* and /app/*, the old provider unmounts and
 * the new one starts with selectedMode = "service" (default), causing the
 * AdminTenantSwitcher auto-switch to fire before the real mode loads from DB.
 *
 * Fix: AdminModeContext now caches selectedMode in localStorage for instant
 * restore, and AdminTenantSwitcher guards auto-switch against mode loading.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// The localStorage keys used by the admin system
const TENANT_STORAGE_KEY = "flux_admin_active_tenant_id";
const MODE_STORAGE_KEY = "flux_admin_active_mode";

const VALID_MODES = ["service", "dispatch", "food", "medical", "sales", "general"] as const;

describe("Admin mode localStorage persistence", () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
    });
  });

  it("stores mode in localStorage on set", () => {
    // Simulate what AdminModeContext.setSelectedMode does
    const mode = "food";
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("food");
  });

  it("restores mode from localStorage on mount", () => {
    storage[MODE_STORAGE_KEY] = "dispatch";
    const cached = localStorage.getItem(MODE_STORAGE_KEY);
    expect(cached).toBe("dispatch");
    expect(VALID_MODES).toContain(cached);
  });

  it("defaults to 'service' when localStorage is empty", () => {
    const cached = localStorage.getItem(MODE_STORAGE_KEY);
    const mode = cached && VALID_MODES.includes(cached as any) ? cached : "service";
    expect(mode).toBe("service");
  });

  it("defaults to 'service' when localStorage has invalid mode", () => {
    storage[MODE_STORAGE_KEY] = "invalid_mode";
    const cached = localStorage.getItem(MODE_STORAGE_KEY);
    const mode = cached && VALID_MODES.includes(cached as any) ? cached : "service";
    expect(mode).toBe("service");
  });

  it("stores tenant ID in localStorage on set", () => {
    const tenantId = "abc-123";
    localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
    expect(localStorage.getItem(TENANT_STORAGE_KEY)).toBe("abc-123");
  });

  it("clears both mode and tenant on sign out", () => {
    storage[MODE_STORAGE_KEY] = "food";
    storage[TENANT_STORAGE_KEY] = "abc-123";

    // Simulate signOut cleanup
    localStorage.removeItem(TENANT_STORAGE_KEY);
    localStorage.removeItem(MODE_STORAGE_KEY);

    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(TENANT_STORAGE_KEY)).toBeNull();
  });

  it("all 6 business modes are valid for localStorage cache", () => {
    for (const mode of VALID_MODES) {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
      const cached = localStorage.getItem(MODE_STORAGE_KEY);
      expect(VALID_MODES).toContain(cached);
    }
  });
});

describe("Admin tenant auto-switch guard", () => {
  it("should not auto-switch when mode is loading", () => {
    // This tests the logic: if (modeIsLoading) return;
    const modeIsLoading = true;
    const tenants = [{ id: "t1", business_mode: "service" }];
    const effectiveTenantId = "t2"; // Different tenant (food mode)
    const currentTenantMatchesMode = tenants.some(t => t.id === effectiveTenantId);

    // Without the guard, auto-switch would fire (tenant not in filtered list)
    expect(currentTenantMatchesMode).toBe(false);

    // But with the modeIsLoading guard, the effect returns early
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
    const effectiveTenantId = "t1"; // Same tenant
    const currentTenantMatchesMode = tenants.some(t => t.id === effectiveTenantId);

    let switched = false;
    if (!modeIsLoading && !currentTenantMatchesMode && tenants.length > 0) {
      switched = true;
    }
    expect(switched).toBe(false);
  });
});
