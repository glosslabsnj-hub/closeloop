import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsAgencyManagedTenant(tenantId: string | null) {
  return useQuery({
    queryKey: ["is-agency-managed", tenantId],
    queryFn: async () => {
      if (!tenantId) return false;
      const { data } = await (supabase as any)
        .from("agency_tenants")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .maybeSingle();
      return !!data;
    },
    enabled: !!tenantId,
  });
}
