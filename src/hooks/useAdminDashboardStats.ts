import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [tenantsRes, usersRes, recentTenantsRes, priorTenantsRes, subscriptionsRes] =
        await Promise.all([
          supabase.from("tenants").select("id", { count: "exact", head: true }),
          supabase.from("tenant_users").select("user_id", { count: "exact", head: true }),
          supabase
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
          supabase
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .gte("created_at", new Date(Date.now() - 60 * 86400000).toISOString())
            .lt("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
          supabase
            .from("subscriptions")
            .select("id", { count: "exact", head: true })
            .eq("status", "active"),
        ]);

      const totalTenants = tenantsRes.count ?? 0;
      const activeUsers = usersRes.count ?? 0;
      const recentCount = recentTenantsRes.count ?? 0;
      const priorCount = priorTenantsRes.count ?? 0;

      // MRR calculation: count active subscriptions (pricing comes from plan config, not DB column)
      const activeSubscriptions = subscriptionsRes.count ?? 0;

      let growth: string;
      if (priorCount === 0) {
        growth = recentCount > 0 ? `+${recentCount}` : "0";
      } else {
        const pct = Math.round(((recentCount - priorCount) / priorCount) * 100);
        growth = pct >= 0 ? `+${pct}%` : `${pct}%`;
      }

      return { totalTenants, activeUsers, mrr: activeSubscriptions, growth };
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useActiveClients() {
  return useQuery({
    queryKey: ["admin-active-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, business_mode, industry, created_at, onboarding_completed_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;

      // Fetch call counts for each tenant in the last 30 days
      const tenantIds = (data ?? []).map((t) => t.id);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const callData: Record<string, { count: number; lastCall: string | null }> = {};

      if (tenantIds.length > 0) {
        const { data: sessions } = await supabase
          .from("ai_call_sessions")
          .select("tenant_id, started_at")
          .in("tenant_id", tenantIds)
          .gte("started_at", thirtyDaysAgo)
          .order("started_at", { ascending: false });

        (sessions ?? []).forEach((s) => {
          if (!callData[s.tenant_id]) {
            callData[s.tenant_id] = { count: 0, lastCall: s.started_at };
          }
          callData[s.tenant_id].count++;
        });
      }

      return (data ?? []).map((t) => ({
        ...t,
        callCount30d: callData[t.id]?.count ?? 0,
        lastCallDate: callData[t.id]?.lastCall ?? null,
      }));
    },
    staleTime: 60_000,
  });
}

export function useAgencySummary() {
  return useQuery({
    queryKey: ["admin-agency-summary"],
    queryFn: async () => {
      try {
        const { data: agencies } = await supabase
          .from("agency_accounts" as any)
          .select("id");

        const agencyList = (agencies ?? []) as unknown as Array<{ id: string }>;
        const totalAgencies = agencyList.length;

        // Sum commissions from agency_commissions table
        const { data: commissions } = await supabase
          .from("agency_commissions" as any)
          .select("commission_cents");
        const totalCommission = ((commissions ?? []) as unknown as Array<{ commission_cents: number }>)
          .reduce((sum, c) => sum + (c.commission_cents ?? 0), 0) / 100;

        // Count agency-provisioned clients
        const { count: agencyClients } = await supabase
          .from("tenants")
          .select("id", { count: "exact", head: true })
          .not("provisioned_by_agency_id" as any, "is", null);

        return {
          totalAgencies,
          agencyClients: agencyClients ?? 0,
          totalCommission,
        };
      } catch {
        return { totalAgencies: 0, agencyClients: 0, totalCommission: 0 };
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function usePendingActions() {
  return useQuery({
    queryKey: ["admin-pending-actions"],
    queryFn: async () => {
      try {
        const [appsRes, setupRes] = await Promise.all([
          supabase
            .from("agency_applications" as any)
            .select("id", { count: "exact", head: true })
            .eq("status", "new"),
          supabase
            .from("setup_requests" as any)
            .select("id", { count: "exact", head: true })
            .eq("status", "new"),
        ]);
        return {
          newApplications: appsRes.count ?? 0,
          newSetupRequests: setupRes.count ?? 0,
        };
      } catch {
        return { newApplications: 0, newSetupRequests: 0 };
      }
    },
    staleTime: 30_000,
    retry: false,
  });
}
