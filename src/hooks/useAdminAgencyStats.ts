import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgencyRow {
  id: string;
  user_id: string;
  agency_name: string;
  agency_slug: string;
  created_at: string;
  client_count?: number;
  commission_earned?: number;
}

export function useAdminAgencies() {
  return useQuery({
    queryKey: ["admin-all-agencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_accounts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AgencyRow[];
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useAgencyClients(agencyId: string | null) {
  return useQuery({
    queryKey: ["admin-agency-clients", agencyId],
    enabled: !!agencyId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("tenants") as any)
        .select("id, name, business_mode, industry, created_at")
        .eq("provisioned_by_agency_id", agencyId!);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; business_mode: string; industry: string; created_at: string }>;
    },
  });
}
