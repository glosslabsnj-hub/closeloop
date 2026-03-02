import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  // Joined from subscriptions
  subscription_status?: string | null;
  plan_code?: string | null;
  trial_started_at?: string | null;
  current_period_end?: string | null;
  stripe_customer_id?: string | null;
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

      // Fail silently — this runs on every page via AppLayout/useIsAgencyUser.
      // Non-agency users or missing table should not pollute console.
      if (error) return null;
      return data as AgencyAccount | null;
    },
    enabled: !!user?.id,
    retry: false,
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

      // Fetch subscription data
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("tenant_id, status, plan_code, trial_started_at, current_period_end, stripe_customer_id")
        .in("tenant_id", tenantIds);

      const subMap = new Map((subscriptions || []).map((s: any) => [s.tenant_id, s]));

      return (data || []).map((at: any) => {
        const tenant = tenantMap.get(at.tenant_id);
        const sub = subMap.get(at.tenant_id);
        return {
          ...at,
          tenant_name: tenant?.name || "Unknown",
          business_mode: tenant?.business_mode || "general",
          subscription_status: sub?.status || null,
          plan_code: sub?.plan_code || null,
          trial_started_at: sub?.trial_started_at || null,
          current_period_end: sub?.current_period_end || null,
          stripe_customer_id: sub?.stripe_customer_id || null,
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

export interface AgencyCommission {
  id: string;
  agency_id: string;
  tenant_id: string;
  stripe_invoice_id: string;
  invoice_amount_cents: number;
  commission_rate: number;
  commission_cents: number;
  status: "pending" | "paid" | "failed";
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  paid_at: string | null;
  // Joined
  tenant_name?: string;
}

export function useAgencyCommissions(agencyId: string | null | undefined) {
  return useQuery({
    queryKey: ["agency-commissions", agencyId],
    queryFn: async () => {
      if (!agencyId) return { commissions: [], thisMonthCents: 0, totalPendingCents: 0 };

      const { data, error } = await (supabase as any)
        .from("agency_commissions")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const commissions: AgencyCommission[] = data || [];

      // Fetch tenant names
      const tenantIds = [...new Set(commissions.map((c) => c.tenant_id))];
      const tenantMap = new Map<string, string>();

      if (tenantIds.length > 0) {
        const { data: tenants } = await supabase
          .from("tenants")
          .select("id, name")
          .in("id", tenantIds);

        for (const t of tenants || []) {
          tenantMap.set(t.id, (t as any).name || "Unknown");
        }
      }

      const enriched = commissions.map((c) => ({
        ...c,
        tenant_name: tenantMap.get(c.tenant_id) || "Unknown",
      }));

      // Calculate this month's total
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthCents = enriched
        .filter((c) => new Date(c.created_at) >= monthStart)
        .reduce((sum, c) => sum + c.commission_cents, 0);

      const totalPendingCents = enriched
        .filter((c) => c.status === "pending")
        .reduce((sum, c) => sum + c.commission_cents, 0);

      return { commissions: enriched, thisMonthCents, totalPendingCents };
    },
    enabled: !!agencyId,
  });
}

export function useIsAgencyUser() {
  const { data: account, isLoading } = useAgencyAccount();
  return { isAgency: !!account, isLoading, agencyId: account?.id };
}

export function useUpdatePayoutConfig(agencyId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Record<string, unknown>) => {
      if (!agencyId) throw new Error("No agency ID");

      const { error } = await (supabase as any)
        .from("agency_accounts")
        .update({ payout_config_json: config })
        .eq("id", agencyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-account"] });
    },
  });
}
