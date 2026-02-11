import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTenantConfig } from "./useTenantConfig";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Module requirements for each route
 * Routes not listed here are always accessible
 */
const routeModuleRequirements: Record<string, string[]> = {
  "/app/bookings": ["booking"],
  "/app/dispatch": ["dispatch_queue"],
  "/app/impound-lot": ["impound_lot"],
  "/app/fleet": ["fleet_management"],
  "/app/orders": ["food_orders"],
  "/app/reservations": ["reservations"],
  "/app/catering": ["catering"],
  "/app/medical-intake": ["medical_intake"],
  "/app/sales-pipeline": ["sales_leads"],
  "/app/test-drives": ["test_drives"],
  "/app/sales-inventory": ["sales_inventory"],
};

/**
 * Check if a route requires any modules
 */
export function getRouteRequiredModules(pathname: string): string[] | null {
  // Exact match first
  if (routeModuleRequirements[pathname]) {
    return routeModuleRequirements[pathname];
  }
  
  // Check for prefix matches (for dynamic routes like /app/orders/:id)
  for (const [route, modules] of Object.entries(routeModuleRequirements)) {
    if (pathname.startsWith(route)) {
      return modules;
    }
  }
  
  return null;
}

/**
 * Hook to guard routes based on enabled modules
 * 
 * This hook checks if the current route requires modules that aren't enabled
 * for the current tenant, and redirects to dashboard if not allowed.
 * 
 * Usage: Call this hook in AppLayout or individual pages that need protection
 */
export function useRouteGuard() {
  const { enabledModules } = useTenantConfig();
  const { loading, tenant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for auth to load
    if (loading || !tenant) return;

    const requiredModules = getRouteRequiredModules(location.pathname);
    
    // If no modules required, route is accessible
    if (!requiredModules) return;

    // Check if user has at least one of the required modules
    const hasAccess = requiredModules.some(mod => enabledModules.includes(mod));

    if (!hasAccess) {
      console.log(`[RouteGuard] Blocking access to ${location.pathname}. Required: ${requiredModules.join(", ")}, Has: ${enabledModules.join(", ")}`);
      navigate("/app/dashboard", { replace: true });
    }
  }, [loading, tenant, location.pathname, enabledModules, navigate]);
}

/**
 * Check if a specific route is accessible based on current modules
 */
export function useCanAccessRoute(pathname: string): boolean {
  const { enabledModules } = useTenantConfig();
  
  const requiredModules = getRouteRequiredModules(pathname);
  
  // If no modules required, route is accessible
  if (!requiredModules) return true;

  // Check if user has at least one of the required modules
  return requiredModules.some(mod => enabledModules.includes(mod));
}

/**
 * Get a list of all accessible routes for the current tenant
 */
export function useAccessibleRoutes(): string[] {
  const { enabledModules } = useTenantConfig();
  
  const allRoutes = [
    "/app/dashboard",
    "/app/inbox",
    "/app/bookings",
    "/app/dispatch",
    "/app/orders",
    "/app/reservations",
    "/app/catering",
    "/app/medical-intake",
    "/app/fleet",
    "/app/impound-lot",
    "/app/sales-pipeline",
    "/app/test-drives",
    "/app/sales-inventory",
    "/app/business-brain",
    "/app/integrations",
    "/app/ai-assistant",
    "/app/estimates",
    "/app/agreements",
    "/app/reports",
    "/app/help",
    "/app/settings",
  ];

  return allRoutes.filter(route => {
    const requiredModules = getRouteRequiredModules(route);
    if (!requiredModules) return true;
    return requiredModules.some(mod => enabledModules.includes(mod));
  });
}
