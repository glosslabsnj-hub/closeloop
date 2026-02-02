import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export type CoverageMode = "radius" | "counties" | "zips" | "hybrid";

export interface BaseAddress {
  line1: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
}

export interface County {
  name: string;
  state: string;
}

export interface ServiceAreaConfig {
  mode: CoverageMode;
  base_address: BaseAddress;
  radius_miles: number | null;
  include: {
    counties: County[];
    zips: string[];
    states: string[];
  };
  exclude: {
    counties: County[];
    zips: string[];
    states: string[];
  };
  restrictions: {
    no_cross_state_lines: boolean;
  };
  notes: string;
}

const defaultServiceArea: ServiceAreaConfig = {
  mode: "radius",
  base_address: {
    line1: "",
    city: "",
    state: "",
    zip: "",
    lat: null,
    lng: null,
  },
  radius_miles: null,
  include: {
    counties: [],
    zips: [],
    states: [],
  },
  exclude: {
    counties: [],
    zips: [],
    states: [],
  },
  restrictions: {
    no_cross_state_lines: false,
  },
  notes: "",
};

export function useServiceArea() {
  const { tenant, refreshTenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;

  const { data: serviceArea, isLoading, error } = useQuery({
    queryKey: ["service-area", tenantId],
    queryFn: async () => {
      if (!tenantId) return defaultServiceArea;

      const { data, error } = await supabase
        .from("tenants")
        .select("service_area_json")
        .eq("id", tenantId)
        .single();

      if (error) throw error;

      const rawData = data?.service_area_json;
      if (!rawData || typeof rawData !== "object") {
        return defaultServiceArea;
      }

      // Merge with defaults to ensure all fields exist
      return mergeWithDefaults(rawData as Partial<ServiceAreaConfig>);
    },
    enabled: !!tenantId,
  });

  const saveServiceArea = useMutation({
    mutationFn: async (config: ServiceAreaConfig) => {
      if (!tenantId) throw new Error("No tenant");

      const { error } = await supabase
        .from("tenants")
        .update({ service_area_json: config as unknown as Json })
        .eq("id", tenantId);

      if (error) throw error;
      return config;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-area", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      refreshTenant?.();
      toast({ title: "Service area saved", description: "Your coverage configuration has been updated." });
    },
    onError: (error) => {
      console.error("Failed to save service area:", error);
      toast({ title: "Error", description: "Failed to save service area.", variant: "destructive" });
    },
  });

  return {
    serviceArea: serviceArea || defaultServiceArea,
    isLoading,
    error,
    isSaving: saveServiceArea.isPending,
    saveServiceArea: saveServiceArea.mutateAsync,
  };
}

/**
 * Merge partial config with defaults to ensure all fields exist
 */
function mergeWithDefaults(partial: Partial<ServiceAreaConfig>): ServiceAreaConfig {
  return {
    mode: partial.mode || defaultServiceArea.mode,
    base_address: {
      ...defaultServiceArea.base_address,
      ...(partial.base_address || {}),
    },
    radius_miles: partial.radius_miles ?? defaultServiceArea.radius_miles,
    include: {
      counties: partial.include?.counties || [],
      zips: partial.include?.zips || [],
      states: partial.include?.states || [],
    },
    exclude: {
      counties: partial.exclude?.counties || [],
      zips: partial.exclude?.zips || [],
      states: partial.exclude?.states || [],
    },
    restrictions: {
      no_cross_state_lines: partial.restrictions?.no_cross_state_lines ?? false,
    },
    notes: partial.notes || "",
  };
}

/**
 * Check if a location is serviceable based on the service area configuration.
 *
 * @param config - The service area configuration
 * @param location - The location to check
 * @returns true if the location is serviceable, false otherwise
 *
 * Priority:
 * 1. Exclusions always override inclusions
 * 2. If "no_cross_state_lines" is true, locations outside base_address.state are excluded
 * 3. Then check mode-specific rules
 */
export function isLocationServiceable(
  config: ServiceAreaConfig,
  location: {
    state?: string;
    zip?: string;
    county?: string;
    countyState?: string;
    distanceMiles?: number;
  }
): boolean {
  // 1. Check exclusions first (they always override)
  if (location.state && config.exclude.states.includes(location.state)) {
    return false;
  }

  if (location.zip && config.exclude.zips.includes(location.zip)) {
    return false;
  }

  if (location.county && location.countyState) {
    const isExcludedCounty = config.exclude.counties.some(
      (c) => c.name.toLowerCase() === location.county!.toLowerCase() &&
             c.state.toLowerCase() === location.countyState!.toLowerCase()
    );
    if (isExcludedCounty) return false;
  }

  // 2. Check state line restriction
  if (config.restrictions.no_cross_state_lines && config.base_address.state) {
    const baseState = config.base_address.state.toUpperCase();

    // If location has a state, it must match base state OR be in explicit includes
    if (location.state) {
      const locState = location.state.toUpperCase();
      const isBaseState = locState === baseState;
      const isExplicitlyIncluded = config.include.states
        .map((s) => s.toUpperCase())
        .includes(locState);

      if (!isBaseState && !isExplicitlyIncluded) {
        return false;
      }
    }
  }

  // 3. Mode-specific rules
  switch (config.mode) {
    case "radius":
      // For radius mode, we need distanceMiles and radius_miles
      if (config.radius_miles === null) return true; // No radius set = unlimited
      if (location.distanceMiles === undefined) return true; // Can't check, assume OK
      return location.distanceMiles <= config.radius_miles;

    case "zips":
      // For zip mode, location must be in included zips
      if (config.include.zips.length === 0) return true; // No zips specified = all allowed
      if (!location.zip) return true; // Can't check, assume OK
      return config.include.zips.includes(location.zip);

    case "counties":
      // For county mode, location must be in included counties
      if (config.include.counties.length === 0) return true; // No counties = all allowed
      if (!location.county || !location.countyState) return true; // Can't check
      return config.include.counties.some(
        (c) => c.name.toLowerCase() === location.county!.toLowerCase() &&
               c.state.toLowerCase() === location.countyState!.toLowerCase()
      );

    case "hybrid":
      // Hybrid mode: pass if ANY inclusion criteria is met
      let passesAnyCriteria = false;

      // Check radius
      if (config.radius_miles !== null && location.distanceMiles !== undefined) {
        if (location.distanceMiles <= config.radius_miles) {
          passesAnyCriteria = true;
        }
      }

      // Check zips
      if (location.zip && config.include.zips.includes(location.zip)) {
        passesAnyCriteria = true;
      }

      // Check counties
      if (location.county && location.countyState) {
        const isIncludedCounty = config.include.counties.some(
          (c) => c.name.toLowerCase() === location.county!.toLowerCase() &&
                 c.state.toLowerCase() === location.countyState!.toLowerCase()
        );
        if (isIncludedCounty) passesAnyCriteria = true;
      }

      // Check states
      if (location.state && config.include.states.map((s) => s.toUpperCase()).includes(location.state.toUpperCase())) {
        passesAnyCriteria = true;
      }

      // If no inclusion criteria specified, allow all
      const hasAnyCriteria =
        config.radius_miles !== null ||
        config.include.zips.length > 0 ||
        config.include.counties.length > 0 ||
        config.include.states.length > 0;

      return !hasAnyCriteria || passesAnyCriteria;

    default:
      return true;
  }
}

/**
 * Generate a plain English summary of the service area configuration.
 */
export function getServiceAreaSummary(config: ServiceAreaConfig): string {
  const parts: string[] = [];

  switch (config.mode) {
    case "radius":
      if (config.radius_miles) {
        const city = config.base_address.city || "base location";
        parts.push(`Within ${config.radius_miles} miles of ${city}`);
      } else {
        parts.push("No radius limit set");
      }
      break;

    case "zips":
      if (config.include.zips.length > 0) {
        const zipCount = config.include.zips.length;
        parts.push(`${zipCount} ZIP code${zipCount > 1 ? "s" : ""} included`);
      } else {
        parts.push("No ZIP codes specified");
      }
      break;

    case "counties":
      if (config.include.counties.length > 0) {
        const countyCount = config.include.counties.length;
        parts.push(`${countyCount} ${countyCount > 1 ? "counties" : "county"} included`);
      } else {
        parts.push("No counties specified");
      }
      break;

    case "hybrid":
      const criteria: string[] = [];
      if (config.radius_miles) criteria.push(`${config.radius_miles}mi radius`);
      if (config.include.zips.length > 0) criteria.push(`${config.include.zips.length} ZIPs`);
      if (config.include.counties.length > 0) criteria.push(`${config.include.counties.length} counties`);
      if (config.include.states.length > 0) criteria.push(`${config.include.states.length} states`);

      parts.push(criteria.length > 0 ? `Hybrid: ${criteria.join(", ")}` : "Hybrid mode (no criteria set)");
      break;
  }

  // Exclusions
  const exclusionCount =
    config.exclude.zips.length +
    config.exclude.counties.length +
    config.exclude.states.length;

  if (exclusionCount > 0) {
    parts.push(`${exclusionCount} exclusion${exclusionCount > 1 ? "s" : ""}`);
  }

  // State line restriction
  if (config.restrictions.no_cross_state_lines && config.base_address.state) {
    parts.push(`${config.base_address.state} only (no crossing state lines)`);
  }

  return parts.join(" | ");
}
