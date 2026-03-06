/**
 * Hook to fetch food order settings for the current tenant.
 * Returns delivery/catering/pickup flags to conditionally show relevant UI sections.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTenantConfig } from "./useTenantConfig";

export interface FoodOrderSettings {
  accepts_pickup: boolean;
  accepts_delivery: boolean;
  accepts_dine_in: boolean;
  accepts_catering: boolean;
  delivery_radius_miles: number | null;
  delivery_minimum_cents: number | null;
  estimated_prep_minutes: number | null;
  catering_min_guests: number | null;
  catering_lead_days: number | null;
}

const DEFAULT_SETTINGS: FoodOrderSettings = {
  accepts_pickup: true,
  accepts_delivery: false,
  accepts_dine_in: true,
  accepts_catering: false,
  delivery_radius_miles: null,
  delivery_minimum_cents: null,
  estimated_prep_minutes: 20,
  catering_min_guests: 10,
  catering_lead_days: 3,
};

export function useFoodOrderSettings() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const isFoodMode = businessMode === "food";

  const query = useQuery({
    queryKey: ["food-order-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const { data, error } = await supabase
        .from("food_order_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) {
        console.error("[useFoodOrderSettings] Error:", error);
        throw error;
      }

      return data as FoodOrderSettings | null;
    },
    // Only query food_order_settings for food-mode tenants to prevent HTTP 406
    // cross-mode leak on every page load for non-food businesses
    enabled: !!tenant?.id && isFoodMode,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Merge with defaults
  const settings = {
    ...DEFAULT_SETTINGS,
    ...query.data,
  };

  return {
    settings,
    isLoading: query.isLoading,
    
    // Convenience flags for UI logic
    acceptsDelivery: settings.accepts_delivery,
    acceptsCatering: settings.accepts_catering,
    acceptsPickup: settings.accepts_pickup,
    acceptsDineIn: settings.accepts_dine_in,
    
    // Does this food business need any distance/coverage features?
    needsCoverageSettings: settings.accepts_delivery || settings.accepts_catering,
    
    // Does this business only do in-house (no delivery/catering)?
    isInHouseOnly: !settings.accepts_delivery && !settings.accepts_catering,
  };
}
