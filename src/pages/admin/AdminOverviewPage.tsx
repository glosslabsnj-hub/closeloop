import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, DollarSign, TrendingUp, FileText, Headset } from "lucide-react";
import { AdminPhoneSettings } from "@/components/admin/AdminPhoneSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function useAdminOverviewStats() {
  return useQuery({
    queryKey: ["admin-overview-stats"],
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
            .from("subscriptions" as any)
            .select("price_amount")
            .eq("status", "active"),
        ]);

      const totalTenants = tenantsRes.count ?? 0;
      const activeUsers = usersRes.count ?? 0;
      const recentCount = recentTenantsRes.count ?? 0;
      const priorCount = priorTenantsRes.count ?? 0;

      // MRR: sum of active subscription prices
      const subData = (subscriptionsRes.data ?? []) as unknown as Array<{ price_amount: number | null }>;
      const mrr = subData.reduce((sum, s) => sum + (s.price_amount ?? 0), 0);

      // Growth percentage
      let growth: string;
      if (priorCount === 0) {
        growth = recentCount > 0 ? `+${recentCount}` : "0";
      } else {
        const pct = Math.round(((recentCount - priorCount) / priorCount) * 100);
        growth = pct >= 0 ? `+${pct}%` : `${pct}%`;
      }

      return { totalTenants, activeUsers, mrr, growth };
    },
    staleTime: 60_000,
  });
}

function usePendingActions() {
  return useQuery({
    queryKey: ["admin-pending-actions"],
    queryFn: async () => {
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
    },
    staleTime: 30_000,
    retry: false,
  });
}

function useRecentTenants() {
  return useQuery({
    queryKey: ["admin-recent-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, business_mode, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useAdminOverviewStats();
  const { data: pending } = usePendingActions();
  const { data: recentTenants } = useRecentTenants();

  const statCards = [
    {
      label: "Total Tenants",
      value: statsLoading ? "..." : stats?.totalTenants ?? 0,
      icon: Building2,
    },
    {
      label: "Active Users",
      value: statsLoading ? "..." : stats?.activeUsers ?? 0,
      icon: Users,
    },
    {
      label: "MRR",
      value: statsLoading
        ? "..."
        : stats?.mrr
          ? `$${stats.mrr.toLocaleString()}`
          : "\u2014",
      icon: DollarSign,
    },
    {
      label: "Growth (30d)",
      value: statsLoading ? "..." : stats?.growth ?? "\u2014",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Actions */}
      {pending && (pending.newApplications > 0 || pending.newSetupRequests > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pending Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.newApplications > 0 && (
              <Link
                to="/admin/agency-applications"
                className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-medium">New agency applications</span>
                </div>
                <Badge variant="secondary">{pending.newApplications}</Badge>
              </Link>
            )}
            {pending.newSetupRequests > 0 && (
              <Link
                to="/admin/setup-requests"
                className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Headset className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">New setup requests</span>
                </div>
                <Badge variant="secondary">{pending.newSetupRequests}</Badge>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Tenants */}
      {recentTenants && recentTenants.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTenants.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {t.business_mode ?? "general"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(t.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Phone Settings for Universal Test Line */}
      <AdminPhoneSettings />
    </div>
  );
}
