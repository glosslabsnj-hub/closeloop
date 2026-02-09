import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FlaskConical, 
  ChevronDown, 
  Check, 
  Plus,
  Loader2,
  Building2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { CreateTestTenantDialog } from "./CreateTestTenantDialog";
import { isTestTenantName, getTestTenantByName } from "@/data/testTenantMatrix";
import type { Tenant, BusinessMode } from "@/types/database";

export function AdminTenantSwitcher() {
  const { user, isSuperAdmin, effectiveTenantId, setActiveTenantId } = useAuth();
  const adminModeContext = useAdminMode();
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const lastAutoSwitchKeyRef = useRef<string | null>(null);
  const autoSwitchInFlightRef = useRef(false);
  
  // Get selectedMode, default to "service" if context not available
  const selectedMode = adminModeContext?.selectedMode ?? "service";

  // Fetch tenants filtered by selected mode
  const { data: tenants, refetch: refetchTenants } = useQuery({
    queryKey: ["admin-tenants-by-mode", selectedMode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, business_mode, industry")
        .eq("business_mode", selectedMode)
        .order("name");
      
      if (error) throw error;
      return data as Pick<Tenant, "id" | "name" | "business_mode" | "industry">[];
    },
    enabled: isSuperAdmin && !!user,
  });

  // Auto-switch tenant when mode changes and current tenant doesn't match
  useEffect(() => {
    if (!tenants || tenants.length === 0) return;
    if (isLoading) return;
    if (autoSwitchInFlightRef.current) return;

    // Only run auto-switch at most once per (mode, currentTenant) combo to prevent loops.
    const key = `${selectedMode}:${effectiveTenantId ?? "none"}`;
    if (lastAutoSwitchKeyRef.current === key) return;
    
    const currentTenantMatchesMode = tenants.some(t => t.id === effectiveTenantId);
    
    if (!currentTenantMatchesMode) {
      // Auto-select first tenant of this mode
      lastAutoSwitchKeyRef.current = key;
      autoSwitchInFlightRef.current = true;
      Promise.resolve(setActiveTenantId(tenants[0].id)).finally(() => {
        autoSwitchInFlightRef.current = false;
      });
    }
  }, [selectedMode, tenants, effectiveTenantId, setActiveTenantId, isLoading]);

  // Only render for super admins - must be after all hooks
  if (!user || !isSuperAdmin) return null;

  const activeTenant = tenants?.find(t => t.id === effectiveTenantId);

  const handleTenantSelect = async (tenantId: string) => {
    if (tenantId === effectiveTenantId || isLoading) return;

    // If a tenant is selected directly, keep the mode filter aligned to that tenant.
    const selectedTenant = tenants?.find((t) => t.id === tenantId);
    if (adminModeContext && selectedTenant?.business_mode) {
      const mode = selectedTenant.business_mode as BusinessMode;
      if (mode !== selectedMode) {
        await adminModeContext.setSelectedMode(mode);
      }
    }
    
    setIsLoading(true);
    try {
      await setActiveTenantId(tenantId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenantCreated = async (newTenantId: string) => {
    await refetchTenants();
    await setActiveTenantId(newTenantId);
    setShowCreateDialog(false);
  };

  const getModeLabel = (mode: string | null) => {
    switch (mode) {
      case "service": return "Service";
      case "dispatch": return "Dispatch";
      case "food": return "Food";
      case "medical": return "Medical";
      case "general": return "General";
      default: return "Unknown";
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-warning" />
        <span className="text-sm text-warning font-medium hidden sm:inline">
          Active Tenant:
        </span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isLoading}
              className="h-7 gap-1.5 bg-background border-warning/30 hover:bg-warning/10"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Building2 className="h-3.5 w-3.5" />
              )}
              <span className="max-w-[150px] truncate">
                {activeTenant?.name || "Select Tenant"}
              </span>
              {activeTenant && (
                <span className="text-xs text-muted-foreground">
                  ({getModeLabel(activeTenant.business_mode)})
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-64 max-h-80 overflow-y-auto z-[100] bg-popover"
            onPointerDownOutside={(e) => e.stopPropagation()}
            onInteractOutside={(e) => e.stopPropagation()}
          >
            {/* Test line indicator */}
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
              <span className="font-medium">Test Line:</span>{" "}
              <span className="font-mono">+1 (855) 329-7357</span>
            </div>
            
            {/* Test Tenants group */}
            {tenants?.some(t => isTestTenantName(t.name)) && (
              <>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Test Tenants
                </div>
                {tenants
                  .filter(t => isTestTenantName(t.name))
                  .map((tenant) => {
                    const testConfig = getTestTenantByName(tenant.name);
                    return (
                      <DropdownMenuItem
                        key={tenant.id}
                        onSelect={(e) => {
                          e.preventDefault();
                          handleTenantSelect(tenant.id);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 cursor-pointer"
                        disabled={isLoading}
                      >
                        {tenant.id === effectiveTenantId && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                        <div className={`flex-1 ${tenant.id !== effectiveTenantId ? "ml-6" : ""}`}>
                          <div className="font-medium truncate">{tenant.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {getModeLabel(tenant.business_mode)}
                            {testConfig?.scenarioTags?.slice(0, 2).map(tag => (
                              <span key={tag} className="inline-block px-1 py-0 rounded text-[9px] bg-muted">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
              </>
            )}

            {/* Real Tenants group */}
            {tenants?.some(t => !isTestTenantName(t.name)) && (
              <>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                  Real Tenants
                </div>
                {tenants
                  .filter(t => !isTestTenantName(t.name))
                  .map((tenant) => (
                    <DropdownMenuItem
                      key={tenant.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        handleTenantSelect(tenant.id);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 cursor-pointer"
                      disabled={isLoading}
                    >
                      {tenant.id === effectiveTenantId && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <div className={`flex-1 ${tenant.id !== effectiveTenantId ? "ml-6" : ""}`}>
                        <div className="font-medium truncate">{tenant.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {getModeLabel(tenant.business_mode)}
                          {tenant.industry && ` · ${tenant.industry}`}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
              </>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setShowCreateDialog(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create Test Tenant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateTestTenantDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTenantCreated={handleTenantCreated}
        defaultMode={selectedMode}
      />
    </>
  );
}
