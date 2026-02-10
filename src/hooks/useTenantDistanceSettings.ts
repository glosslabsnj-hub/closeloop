import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Distance & ETA settings for a tenant
 */
export interface TenantDistanceSettings {
  tenant_id: string;
  distance_provider_enabled: boolean;
  provider: string;
  base_lat: number | null;
  base_lng: number | null;
  base_place_name: string | null;
  mapbox_route_profile: string;
  eta_base_minutes: number;
  eta_per_mile_minutes: number | null;
  eta_min_minutes: number | null;
  eta_max_minutes: number | null;
  eta_rounding_minutes: number;
  /** Default distance basis for pricing: tow_distance | dispatch_distance | total_trip | flat */
  default_distance_basis: string;
  /** Dropoff coverage mode: none | same_area | extended */
  dropoff_coverage_mode: string;
  /** Max miles for extended dropoff coverage */
  dropoff_max_miles: number | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<TenantDistanceSettings, "tenant_id" | "created_at" | "updated_at"> = {
  distance_provider_enabled: false,
  provider: "mapbox",
  base_lat: null,
  base_lng: null,
  base_place_name: null,
  mapbox_route_profile: "mapbox/driving-traffic",
  eta_base_minutes: 0,
  eta_per_mile_minutes: null,
  eta_min_minutes: null,
  eta_max_minutes: null,
  eta_rounding_minutes: 5,
  default_distance_basis: "tow_distance",
  dropoff_coverage_mode: "none",
  dropoff_max_miles: null,
};

export function useTenantDistanceSettings() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<TenantDistanceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!tenant?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenant_distance_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as TenantDistanceSettings);
      } else {
        // No settings exist yet - use defaults
        setSettings({
          ...DEFAULT_SETTINGS,
          tenant_id: tenant.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Failed to fetch distance settings:", err);
      toast({
        title: "Error",
        description: "Failed to load distance settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save settings (upsert)
  const saveSettings = useCallback(async (updates: Partial<TenantDistanceSettings>) => {
    if (!tenant?.id || !settings) return false;

    setIsSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        ...updates,
        tenant_id: tenant.id,
        updated_at: new Date().toISOString(),
      };

      // Remove computed fields
      const { created_at, ...upsertData } = updatedSettings;

      const { error } = await supabase
        .from("tenant_distance_settings")
        .upsert(upsertData, { onConflict: "tenant_id" });

      if (error) throw error;

      setSettings({ ...updatedSettings, created_at: settings.created_at });
      toast({
        title: "Saved",
        description: "Distance settings updated",
      });
      return true;
    } catch (err) {
      console.error("Failed to save distance settings:", err);
      toast({
        title: "Error",
        description: "Failed to save distance settings",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [tenant?.id, settings, toast]);

  // Geocode an address and set base location
  const setBaseLocationFromAddress = useCallback(async (addressText: string) => {
    if (!tenant?.id) return false;

    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("mapbox-geocode", {
        body: {
          tenant_id: tenant.id,
          address_text: addressText,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Geocoding failed",
          description: data.error,
          variant: "destructive",
        });
        return false;
      }

      if (data?.lat && data?.lng) {
        // Save the geocoded location
        const saved = await saveSettings({
          base_lat: data.lat,
          base_lng: data.lng,
          base_place_name: data.place_name || addressText,
        });

        if (saved) {
          toast({
            title: "Location set",
            description: data.place_name || "Base location updated",
          });
        }
        return saved;
      }

      toast({
        title: "Address not found",
        description: "Could not geocode the address. Please try a more specific address.",
        variant: "destructive",
      });
      return false;
    } catch (err) {
      console.error("Geocoding failed:", err);
      toast({
        title: "Error",
        description: "Failed to geocode address",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsGeocoding(false);
    }
  }, [tenant?.id, saveSettings, toast]);

  // Toggle enabled state
  const toggleEnabled = useCallback(async (enabled: boolean) => {
    return saveSettings({ distance_provider_enabled: enabled });
  }, [saveSettings]);

  // Update route profile
  const setRouteProfile = useCallback(async (profile: string) => {
    return saveSettings({ mapbox_route_profile: profile });
  }, [saveSettings]);

  // Update ETA parameters
  const setEtaParams = useCallback(async (params: {
    eta_base_minutes?: number;
    eta_per_mile_minutes?: number | null;
    eta_min_minutes?: number | null;
    eta_max_minutes?: number | null;
    eta_rounding_minutes?: number;
  }) => {
    return saveSettings(params);
  }, [saveSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    isGeocoding,
    fetchSettings,
    saveSettings,
    toggleEnabled,
    setBaseLocationFromAddress,
    setRouteProfile,
    setEtaParams,
  };
}
