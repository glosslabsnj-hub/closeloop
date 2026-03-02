import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTenantConfig, defaultModulesByMode } from "./useTenantConfig";
import { useAuth } from "@/contexts/AuthContext";

/**
 * P0-3: Route protection hook
 *
 * Use this hook at the top of any page that requires specific modules.
 * If the user doesn't have the required module enabled, they'll be redirected to dashboard.
 *
 * @param requiredModules - Array of module IDs, user needs at least one
 * @param redirectTo - Where to redirect if modules not enabled (default: /app/dashboard)
 */
export function useModuleRequired(
  requiredModules: string[],
  redirectTo: string = "/app/dashboard"
): { isAllowed: boolean; isLoading: boolean } {
  const { enabledModules, businessMode } = useTenantConfig();
  const { loading, tenant } = useAuth();
  const navigate = useNavigate();

  // Check both resolved enabledModules AND mode defaults as fallback.
  // This prevents false redirects when capabilities_json resolution
  // has edge cases that omit a module the mode inherently includes.
  const modeDefaults = defaultModulesByMode[businessMode] || [];
  const isAllowed = requiredModules.length === 0 ||
    requiredModules.some(mod => enabledModules.includes(mod) || modeDefaults.includes(mod));

  useEffect(() => {
    // Wait for auth to load and tenant to be resolved
    if (loading || !tenant) return;

    // If not allowed, redirect
    if (!isAllowed) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, tenant, isAllowed, navigate, redirectTo]);

  return { isAllowed, isLoading: loading };
}

/**
 * Simpler hook that just checks if modules are enabled without redirecting
 */
export function useHasModule(moduleId: string): boolean {
  const { enabledModules } = useTenantConfig();
  return enabledModules.includes(moduleId);
}

/**
 * Check if any of the modules are enabled
 */
export function useHasAnyModule(moduleIds: string[]): boolean {
  const { enabledModules } = useTenantConfig();
  return moduleIds.some(mod => enabledModules.includes(mod));
}
