import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LatestContextSnapshot {
  id: string;
  tenant_id: string;
  channel: string;
  session_id: string;
  context_json: Record<string, unknown>;
  dynamic_variables_json: Record<string, string> | null;
  missing_sections: string[];
  created_at: string;
}

export function useLatestContextSnapshot(tenantId: string | null) {
  return useQuery({
    queryKey: ["latest-context-snapshot", tenantId],
    queryFn: async (): Promise<LatestContextSnapshot | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("ai_context_snapshots")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch latest context snapshot:", error);
        throw error;
      }

      return data as LatestContextSnapshot | null;
    },
    enabled: !!tenantId,
    staleTime: 30_000, // Cache for 30 seconds
  });
}

// Hook to get the latest dynamic variables specifically
export function useLatestDynamicVariables(tenantId: string | null) {
  return useQuery({
    queryKey: ["latest-dynamic-variables", tenantId],
    queryFn: async (): Promise<{ variables: Record<string, string>; timestamp: string } | null> => {
      if (!tenantId) return null;

      // Get the most recent snapshot that has dynamic_variables_json populated
      const { data, error } = await supabase
        .from("ai_context_snapshots")
        .select("dynamic_variables_json, created_at")
        .eq("tenant_id", tenantId)
        .not("dynamic_variables_json", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch latest dynamic variables:", error);
        throw error;
      }

      if (!data || !data.dynamic_variables_json) return null;

      return {
        variables: data.dynamic_variables_json as Record<string, string>,
        timestamp: data.created_at,
      };
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}
