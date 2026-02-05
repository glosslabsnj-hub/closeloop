import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TechnicianLocation {
  id: string;
  tenant_id: string;
  user_id: string;
  job_id: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  heading: number | null;
  speed_mps: number | null;
  recorded_at: string;
}

export interface TechnicianWithLocation {
  user_id: string;
  user_email?: string;
  user_name?: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  heading: number | null;
  speed_mps: number | null;
  recorded_at: string;
  job_id: string | null;
}

export interface ReportLocationInput {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  jobId?: string;
}

export function useTechnicianLocations() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  const queryClient = useQueryClient();

  // Fetch latest location for each technician
  const {
    data: locations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["technician_locations", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      try {
        // Get the latest location for each user using a subquery approach
        // First get all recent locations (last hour) then dedupe by user
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
          .from("technician_locations")
          .select("*")
          .eq("tenant_id", tenantId)
          .gte("recorded_at", oneHourAgo)
          .order("recorded_at", { ascending: false });

        if (error) {
          console.error("Failed to fetch technician locations:", error);
          return [];
        }

        // Dedupe by user_id, keeping only the most recent
        const latestByUser = new Map<string, TechnicianLocation>();
        for (const loc of data || []) {
          if (!latestByUser.has(loc.user_id)) {
            latestByUser.set(loc.user_id, loc as TechnicianLocation);
          }
        }

        return Array.from(latestByUser.values());
      } catch (err) {
        console.error("Failed to fetch technician locations:", err);
        return [];
      }
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });

  // Subscribe to real-time location updates
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel("technician-locations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "technician_locations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Refetch on new location
          queryClient.invalidateQueries({ queryKey: ["technician_locations", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  return {
    locations,
    isLoading,
    error,
    refetch,
  };
}

export function useReportLocation() {
  const { tenant, user } = useAuth();
  const tenantId = tenant?.id ?? null;
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const reportLocation = useMutation({
    mutationFn: async (input: ReportLocationInput) => {
      if (!tenantId || !userId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("technician_locations")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy_meters: input.accuracy || null,
          heading: input.heading || null,
          speed_mps: input.speed || null,
          job_id: input.jobId || null,
          recorded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician_locations", tenantId] });
    },
  });

  return { reportLocation };
}

// Hook for automatic location reporting (for mobile/field workers)
export function useAutoLocationReporting(enabled: boolean = false, intervalMs: number = 60000) {
  const { reportLocation } = useReportLocation();

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;

    const reportCurrentLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          reportLocation.mutate({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    };

    // Report immediately
    reportCurrentLocation();

    // Then report on interval
    const interval = setInterval(reportCurrentLocation, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, intervalMs, reportLocation]);
}
