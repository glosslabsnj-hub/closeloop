/**
 * RoleGate — Wrapper component that conditionally renders children
 * based on the current user's role or permission.
 *
 * Usage:
 *   <RoleGate permission="can_manage_billing">
 *     <BillingSettings />
 *   </RoleGate>
 *
 *   <RoleGate minRole="manager" fallback={<p>Access denied</p>}>
 *     <TeamManagement />
 *   </RoleGate>
 */

import type { ReactNode } from "react";
import { useTenantRole, type Permission } from "@/hooks/useTenantRole";
import { ShieldAlert } from "lucide-react";

interface RoleGateProps {
  children: ReactNode;
  /** Required permission to view content */
  permission?: Permission;
  /** Minimum role level (viewer < staff < manager < owner) */
  minRole?: "viewer" | "staff" | "manager" | "owner";
  /** Content to show when access is denied. Defaults to nothing (hidden). */
  fallback?: ReactNode;
  /** If true, shows a styled "access denied" message instead of hiding */
  showDenied?: boolean;
}

export function RoleGate({
  children,
  permission,
  minRole,
  fallback,
  showDenied = false,
}: RoleGateProps) {
  const { hasPermission, isAtLeast } = useTenantRole();

  let allowed = true;

  if (permission) {
    allowed = hasPermission(permission);
  }

  if (minRole && allowed) {
    allowed = isAtLeast(minRole);
  }

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ShieldAlert className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">You don't have access to this section</p>
        <p className="text-xs mt-1">Ask your account owner to adjust your permissions</p>
      </div>
    );
  }

  return null;
}

/**
 * useRoleCheck — Imperative hook for checking access in event handlers or logic
 *
 * Usage:
 *   const { canManageBilling, canEditBrain } = useRoleCheck();
 *   if (!canManageBilling) return;
 */
export function useRoleCheck() {
  const { hasPermission, isAtLeast, role } = useTenantRole();

  return {
    role,
    canManageBilling: hasPermission("can_manage_billing"),
    canDeleteTenant: hasPermission("can_delete_tenant"),
    canManageTeam: hasPermission("can_manage_team"),
    canEditBrain: hasPermission("can_edit_brain"),
    canManageSettings: hasPermission("can_manage_settings"),
    canViewReports: hasPermission("can_view_reports"),
    canManageEntities: hasPermission("can_manage_entities"),
    isAtLeastStaff: isAtLeast("staff"),
    isAtLeastManager: isAtLeast("manager"),
    isAtLeastOwner: isAtLeast("owner"),
  };
}
