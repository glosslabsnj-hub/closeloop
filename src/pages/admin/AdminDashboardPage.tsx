import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, DollarSign, TrendingUp, FileText, Headset, Loader2, ExternalLink, Users2, Rocket, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";
import {
  useAdminDashboardStats,
  useActiveClients,
  useAgencySummary,
  usePendingActions,
} from "@/hooks/useAdminDashboardStats";
import { useAdminGrowthSettings } from "@/hooks/useAdminGrowthSettings";
import { useOutreachCampaigns } from "@/hooks/useAdminOutreach";

export default function AdminDashboardPage() {
  const { setActiveTenantId } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
  const { data: clients, isLoading: clientsLoading } = useActiveClients();
  const { data: agencySummary } = useAgencySummary();
  const { data: pending } = usePendingActions();
  const { data: growthSettings } = useAdminGrowthSettings();
  const { data: outreachCampaigns } = useOutreachCampaigns();
  const { toast } = useToast();
  const [seedingPrices, setSeedingPrices] = useState(false);
  const [seedResult, setSeedResult] = useState<{ status: "success" | "error"; message: string } | null>(null);

  const handleSeedStripePrices = async () => {
    setSeedingPrices(true);
    setSeedResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("seed-stripe-prices", {
        body: {},
      });
      if (error) throw new Error(error.message || "Function call failed");
      if (data?.error) throw new Error(data.error);

      const results = data?.results || [];
      const created = results.filter((r: { status: string }) => r.status === "created").length;
      const existing = results.filter((r: { status: string }) => r.status === "exists").length;
      const errors = results.filter((r: { status: string }) => r.status.startsWith("error")).length;

      const message = `${created} created, ${existing} already existed${errors ? `, ${errors} errors` : ""}`;
      setSeedResult({ status: errors ? "error" : "success", message });
      toast({
        title: errors ? "Stripe prices seeded with errors" : "Stripe prices seeded",
        description: message,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSeedResult({ status: "error", message: msg });
      toast({ title: "Failed to seed Stripe prices", description: msg, variant: "destructive" });
    } finally {
      setSeedingPrices(false);
    }
  };

  const handleManageClient = async (tenantId: string) => {
    await setActiveTenantId(tenantId);
    navigate("/app/dashboard");
  };

  const statCards = [
    { label: "Total Tenants", value: statsLoading ? "..." : stats?.totalTenants ?? 0, icon: Building2 },
    { label: "Active Users", value: statsLoading ? "..." : stats?.activeUsers ?? 0, icon: Users },
    { label: "MRR", value: statsLoading ? "..." : stats?.mrr ? `$${stats.mrr.toLocaleString()}` : "\u2014", icon: DollarSign },
    { label: "Growth (30d)", value: statsLoading ? "..." : stats?.growth ?? "\u2014", icon: TrendingUp },
  ];

  const agencyCards = [
    { label: "Total Agencies", value: agencySummary?.totalAgencies ?? 0 },
    { label: "Agency Clients", value: agencySummary?.agencyClients ?? 0 },
    { label: "Total Commission", value: agencySummary?.totalCommission ? `$${agencySummary.totalCommission.toLocaleString()}` : "\u2014" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Command Center</h1>
        <Button variant="outline" size="sm" onClick={() => navigate("/app/dashboard")}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Switch to Client View
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/30 shadow-sm bg-card/60 backdrop-blur-sm card-interactive">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
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

      {/* Active Clients Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Active Clients</CardTitle>
            <Link to="/admin/tenants">
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {clientsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !clients?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tenants yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left">
                    <th className="pb-2.5 pt-1 px-6 text-xs font-medium text-muted-foreground">Name</th>
                    <th className="pb-2.5 pt-1 px-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Mode</th>
                    <th className="pb-2.5 pt-1 px-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Industry</th>
                    <th className="pb-2.5 pt-1 px-2 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="pb-2.5 pt-1 px-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Last Call</th>
                    <th className="pb-2.5 pt-1 px-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">30d Calls</th>
                    <th className="pb-2.5 pt-1 px-6 text-xs font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-6 font-medium">{client.name}</td>
                      <td className="py-3 px-2 capitalize hidden sm:table-cell text-muted-foreground">{client.business_mode}</td>
                      <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">{client.industry || "\u2014"}</td>
                      <td className="py-3 px-2">
                        <Badge variant={client.onboarding_completed_at ? "default" : "secondary"} className="text-xs">
                          {client.onboarding_completed_at ? "Active" : "Setup"}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 hidden lg:table-cell text-muted-foreground text-xs">
                        {client.lastCallDate ? format(new Date(client.lastCallDate), "MMM d") : "\u2014"}
                      </td>
                      <td className="py-3 px-2 hidden lg:table-cell text-muted-foreground">{client.callCount30d}</td>
                      <td className="py-3 px-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => handleManageClient(client.id)}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agency Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users2 className="h-5 w-5" />
              Agencies
            </CardTitle>
            <Link to="/admin/agencies">
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {agencyCards.map((card) => (
              <div key={card.label} className="text-center p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 card-interactive">
                <p className="text-xl font-bold tracking-tight">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stripe Setup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Stripe Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Create the 4 subscription price tiers in Stripe (Base, Growth, Scale, Power). Safe to run multiple times — skips prices that already exist.
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSeedStripePrices}
              disabled={seedingPrices}
              size="sm"
            >
              {seedingPrices ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Seeding Prices...
                </>
              ) : (
                "Seed Stripe Prices"
              )}
            </Button>
            {seedResult && (
              <span className={`text-sm flex items-center gap-1 ${seedResult.status === "success" ? "text-green-600" : "text-red-600"}`}>
                {seedResult.status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {seedResult.message}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Growth Engine Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Growth Engine
            </CardTitle>
            <Link to="/admin/growth-engine">
              <Button variant="ghost" size="sm" className="text-xs">Open</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 card-interactive">
              <p className="text-xl font-bold tracking-tight">
                {[growthSettings?.auto_discovery_enabled, growthSettings?.auto_outreach_enabled, growthSettings?.auto_social_enabled, growthSettings?.auto_ads_enabled].filter(Boolean).length}/4
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Modules Active</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 card-interactive">
              <p className="text-xl font-bold tracking-tight">
                {(outreachCampaigns ?? []).filter((c) => c.status === "active").length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Active Campaigns</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 card-interactive">
              <p className="text-xl font-bold tracking-tight">
                {(outreachCampaigns ?? []).reduce((s, c) => s + c.total_enrolled, 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Enrolled Leads</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 card-interactive">
              <p className="text-xl font-bold tracking-tight">
                {(outreachCampaigns ?? []).reduce((s, c) => s + c.total_responded, 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Responses</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
