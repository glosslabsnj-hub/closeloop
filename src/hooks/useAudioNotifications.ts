import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function useAudioNotifications() {
  const { tenant, assistantSettings } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(() => {
    // Check local storage first for user preference
    const stored = localStorage.getItem("notificationSoundsEnabled");
    return stored !== "false";
  });

  // Sync with assistant settings if available
  useEffect(() => {
    if (assistantSettings && 'notification_sounds_enabled' in assistantSettings) {
      const dbSetting = (assistantSettings as any).notification_sounds_enabled;
      if (typeof dbSetting === 'boolean') {
        setSoundEnabled(dbSetting);
        localStorage.setItem("notificationSoundsEnabled", String(dbSetting));
      }
    }
  }, [assistantSettings]);

  const toggleSound = useCallback(async () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem("notificationSoundsEnabled", String(newValue));

    // Persist to database if tenant exists
    if (tenant?.id) {
      try {
        await supabase
          .from("assistant_settings")
          .update({ notification_sounds_enabled: newValue })
          .eq("tenant_id", tenant.id);
      } catch (e) {
        console.error("Failed to save sound preference:", e);
      }
    }
  }, [soundEnabled, tenant?.id]);

  return {
    soundEnabled,
    toggleSound,
    setSoundEnabled,
  };
}
