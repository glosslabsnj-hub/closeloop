/**
 * useTenantRole — Returns the current user's role and permission checks
 * for the active tenant. Uses the role from AuthContext.
 *
 * Permission boundaries:
 * - owner: Full access
 * - manager: Everything except billing and delete-tenant
 * - staff: Manage own entities only
 * - viewer: Read-only dashboards and reports
 * - super_admin: Full access (bypass all checks)
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type Permission =
  | "can_manage_billing"
  | "can_delete_tenant"
  | "can_manage_team"
  | "can_edit_brain"
  | "can_manage_settings"
  | "can_view_reports"
  | "can_manage_entities";

const ROLE_PERMISSIONS: Record<string, Record<Permission, boolean>> = {
  owner: {
    can_manage_billing: true,
    can_delete_tenant: true,
    can_manage_team: true,
    can_edit_brain: true,
    can_manage_settings: true,
    can_view_reports: true,
    can_manage_entities: true,
  },
  manager: {
    can_manage_billing: false,
    can_delete_tenant: false,
    can_manage_team: true,
    can_edit_brain: true,
    can_manage_settings: true,
    can_view_reports: true,
    can_manage_entities: true,
  },
  staff: {
    can_manage_billing: false,
    can_delete_tenant: false,
    can_manage_team: false,
    can_edit_brain: false,
    can_manage_settings: false,
    can_view_reports: false,
    can_manage_entities: true,
  },
  viewer: {
    can_manage_billing: false,
    can_delete_tenant: false,
    can_manage_team: false,
    can_edit_brain: false,
    can_manage_settings: false,
    can_view_reports: true,
    can_manage_entities: false,
  },
  super_admin: {
    can_manage_billing: true,
    can_delete_tenant: true,
    can_manage_team: true,
    can_edit_brain: true,
    can_manage_settings: true,
    can_view_reports: true,
    can_manage_entities: true,
  },
  driver: {
    can_manage_billing: false,
    can_delete_tenant: false,
    can_manage_team: false,
    can_edit_brain: false,
    can_manage_settings: false,
    can_view_reports: false,
    can_manage_entities: true,
  },
};

export function useTenantRole() {
  const { userRole, isSuperAdmin } = useAuth();

  const effectiveRole: string = isSuperAdmin ? "super_admin" : (userRole ?? "viewer");

  const permissions = useMemo(() => {
    return ROLE_PERMISSIONS[effectiveRole] ?? ROLE_PERMISSIONS.viewer;
  }, [effectiveRole]);

  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      return permissions[permission] ?? false;
    };
  }, [permissions]);

  const isAtLeast = useMemo(() => {
    const hierarchy = ["viewer", "staff", "manager", "owner", "super_admin"];
    const currentIndex = hierarchy.indexOf(effectiveRole);
    return (minRole: string): boolean => {
      const minIndex = hierarchy.indexOf(minRole);
      if (minIndex === -1) return false;
      return currentIndex >= minIndex;
    };
  }, [effectiveRole]);

  return {
    role: effectiveRole,
    isOwner: effectiveRole === "owner" || isSuperAdmin,
    isManager: effectiveRole === "manager" || effectiveRole === "owner" || isSuperAdmin,
    isStaff: effectiveRole === "staff",
    isViewer: effectiveRole === "viewer",
    isSuperAdmin,
    permissions,
    hasPermission,
    isAtLeast,
  };
}
