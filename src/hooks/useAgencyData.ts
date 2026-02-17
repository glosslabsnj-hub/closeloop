import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface AgencyAccount {
  id: string;
  user_id: string;
  agency_name: string;
  agency_slug: string;
  branding_json: Record<string, unknown>;
  billing_config_json: Record<string, unknown>;
  created_at: string;
}

export interface AgencyTenant {
  id: string;
  agency_id: string;
  tenant_id: string;
  status: "active" | "suspended" | "archived";
  provisioned_at: string;
  notes: string | null;
  // Joined from tenants
  tenant_name?: string;
  business_mode?: string;
}

export interface AgencyMetrics {
  total_clients: number;
  total_calls_30d: number;
  total_revenue_30d_cents: number;
  conversion_rate: number;
  per_tenant: Array<{
    tenant_id: string;
    tenant_name: string;
    calls_30d: number;
    revenue_30d_cents: number;
    conversion_rate: number;
    status: string;
  }>;
}

export function useAgencyAccount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agency-account", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any)
        .from("agency_accounts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as AgencyAccount | null;
    },
    enabled: !!user?.id,
  });
}

export function useAgencyTenants(agencyId: string | null | undefined) {
  return useQuery({
    queryKey: ["agency-tenants", agencyId],
    queryFn: async () => {
      if (!agencyId) return [];

      const { data, error } = await (supabase as any)
        .from("agency_tenants")
        .select("*")
        .eq("agency_id", agencyId)
        .order("provisioned_at", { ascending: false });

      if (error) throw error;

      // Fetch tenant names
      const tenantIds = (data || []).map((t: any) => t.tenant_id);
      if (tenantIds.length === 0) return [];

      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name, business_mode")
        .in("id", tenantIds);

      const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]));

      return (data || []).map((at: any) => {
        const tenant = tenantMap.get(at.tenant_id);
        return {
          ...at,
          tenant_name: tenant?.name || "Unknown",
          business_mode: tenant?.business_mode || "general",
        } as AgencyTenant;
      });
    },
    enabled: !!agencyId,
  });
}

export function useAgencyMetrics(agencyId: string | null | undefined) {
  return useQuery({
    queryKey: ["agency-metrics", agencyId],
    queryFn: async () => {
      if (!agencyId) return null;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await supabase.functions.invoke("get-agency-metrics", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (response.error) throw new Error(response.error.message);
      return response.data as AgencyMetrics;
    },
    enabled: !!agencyId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

export function useIsAgencyUser() {
  const { data: account, isLoading } = useAgencyAccount();
  return { isAgency: !!account, isLoading, agencyId: account?.id };
}
