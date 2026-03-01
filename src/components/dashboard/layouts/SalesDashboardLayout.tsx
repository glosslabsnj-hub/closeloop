import { Car, Users, TrendingUp, CalendarCheck, Warehouse } from "lucide-react";
import { QuickActionButton } from "../widgets/QuickActionButton";
import { ROIPerformanceWidget } from "../ROIPerformanceWidget";
import { LeadRecoveryWidget } from "../LeadRecoveryWidget";
import { useTestDrives } from "@/hooks/useTestDrives";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useSalesInventory } from "@/hooks/useSalesInventory";

export function SalesDashboardLayout() {
  const { tenant } = useAuth();
  const { stats: driveStats, testDrives } = useTestDrives();
  const { stats: inventoryStats } = useSalesInventory();

  // Get hot leads count
  const { data: hotLeadsCount = 0 } = useQuery({
    queryKey: ["hot-leads-count", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await (supabase as any)
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("lead_score", "hot");
      return count ?? 0;
    },
    enabled: !!tenant?.id,
  });

  // Today's test drives
  const todayDrives = testDrives.filter((d) => {
    if (!d.scheduled_at) return false;
    const date = new Date(d.scheduled_at);
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  });

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{driveStats.today}</p>
              <p className="text-xs text-muted-foreground">Test Drives Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{driveStats.thisWeek}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-accent">
              <TrendingUp className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{hotLeadsCount}</p>
              <p className="text-xs text-muted-foreground">Hot Leads</p>
            </div>
          </CardContent>
        </Card>
         <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-secondary">
              <Warehouse className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inventoryStats.available}</p>
              <p className="text-xs text-muted-foreground">Vehicles Available</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-secondary">
              <Users className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{driveStats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending Test Drives</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Car className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Today's Test Drives</p>
              <Badge variant="secondary" className="text-xs ml-auto">
                {todayDrives.length} scheduled
              </Badge>
            </div>
            {todayDrives.length === 0 ? (
              <p className="text-sm text-muted-foreground">No test drives scheduled for today</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {todayDrives.map((d) => (
                  <div
                    key={d.id}
                    className="flex-shrink-0 rounded-lg border p-2.5 min-w-[140px] bg-primary/5 border-primary/20"
                  >
                    <p className="text-xs font-semibold tabular-nums">
                      {d.scheduled_at ? format(parseISO(d.scheduled_at), "h:mm a") : "TBD"}
                    </p>
                    <p className="text-xs font-medium truncate mt-1">
                      {d.customer?.full_name || "Walk-in"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[d.vehicle_year, d.vehicle_make, d.vehicle_model].filter(Boolean).join(" ") || "Vehicle TBD"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-2">
          <QuickActionButton
            label="View Inventory"
            description="Browse & sync vehicle inventory"
            href="/app/sales-inventory"
            icon={Warehouse}
          />
          <QuickActionButton
            label="View Test Drives"
            description="Manage all test drive appointments"
            href="/app/test-drives"
            icon={Car}
          />
          <QuickActionButton
            label="View Pipeline"
            description="Sales pipeline overview"
            href="/app/sales-pipeline"
            icon={TrendingUp}
          />
        </div>
      </div>

      <ROIPerformanceWidget />
      <LeadRecoveryWidget />
    </div>
  );
}
