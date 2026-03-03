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

const VALID_MODES: BusinessMode[] = ["service", "dispatch", "food", "medical", "sales", "general"];
const STORAGE_KEY = "flux_admin_active_mode";

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin } = useAuth();
  // Restore from localStorage on mount to prevent flash/reset when layout remounts
  // (AppLayout and AdminLayout each create their own AdminModeProvider)
  const [selectedMode, setSelectedModeState] = useState<BusinessMode>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached && VALID_MODES.includes(cached as BusinessMode)) {
        return cached as BusinessMode;
      }
    } catch {}
    return "service";
  });
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
          const mode = data.admin_active_mode as BusinessMode;
          setSelectedModeState(mode);
          try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMode();
  }, [user, isSuperAdmin]);

  // Persist on change (localStorage + Supabase)
  const setSelectedMode = async (mode: BusinessMode) => {
    if (!user) return;

    setSelectedModeState(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}

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
