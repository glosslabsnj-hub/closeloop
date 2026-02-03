import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessMode } from "@/types/database";

interface AdminModeContextType {
  selectedMode: BusinessMode;
  setSelectedMode: (mode: BusinessMode) => Promise<void>;
  isLoading: boolean;
}

const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin, effectiveTenant } = useAuth();
  const [selectedMode, setSelectedModeState] = useState<BusinessMode>("service");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch on mount
  useEffect(() => {
    if (!user || !isSuperAdmin) {
      setIsLoading(false);
      return;
    }

    const fetchMode = async () => {
      try {
        const { data, error } = await supabase
          .from("admin_settings")
          .select("admin_active_mode")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching admin mode:", error);
        } else if (data?.admin_active_mode) {
          setSelectedModeState(data.admin_active_mode as BusinessMode);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMode();
  }, [user, isSuperAdmin]);

  // Keep selectedMode aligned with the effective tenant being viewed by super admins.
  // This prevents mismatches where the active tenant is Food but the mode filter is still Service.
  useEffect(() => {
    if (!user || !isSuperAdmin) return;

    const effectiveMode = (effectiveTenant?.business_mode as BusinessMode | null) || null;
    if (!effectiveMode) return;

    if (effectiveMode === selectedMode) return;

    // Update local state immediately
    setSelectedModeState(effectiveMode);

    // Best-effort persistence
    supabase
      .from("admin_settings")
      .upsert(
        {
          user_id: user.id,
          admin_active_mode: effectiveMode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .then(({ error }) => {
        if (error) console.error("Error syncing admin mode to effective tenant:", error);
      });
  }, [user, isSuperAdmin, effectiveTenant?.business_mode, selectedMode]);

  // Persist on change
  const setSelectedMode = async (mode: BusinessMode) => {
    if (!user) return;
    
    setSelectedModeState(mode);
    
    const { error } = await supabase
      .from("admin_settings")
      .upsert(
        {
          user_id: user.id,
          admin_active_mode: mode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Error saving admin mode:", error);
    }
  };

  return (
    <AdminModeContext.Provider value={{ selectedMode, setSelectedMode, isLoading }}>
      {children}
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  const context = useContext(AdminModeContext);
  // Return null if not within provider - allows component to check
  return context;
}

export function useAdminModeRequired() {
  const context = useContext(AdminModeContext);
  if (context === undefined) {
    throw new Error("useAdminModeRequired must be used within an AdminModeProvider");
  }
  return context;
}
