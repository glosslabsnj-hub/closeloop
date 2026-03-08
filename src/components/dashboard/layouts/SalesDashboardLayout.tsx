import { Car, Users, TrendingUp, CalendarCheck, Warehouse, PhoneCall, Flame } from "lucide-react";
import { QuickActionButton } from "../widgets/QuickActionButton";
import { ROIPerformanceWidget } from "../ROIPerformanceWidget";
import { LeadRecoveryWidget } from "../LeadRecoveryWidget";
import { useTestDrives } from "@/hooks/useTestDrives";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useSalesInventory } from "@/hooks/useSalesInventory";
import { useSalesLeads } from "@/hooks/useSalesLeads";

const CAR_DEALERSHIP_SLUGS = new Set([
  "car-dealership-new",
  "car-dealership-used",
  "car-dealership-full",
  "rv-dealer",
  "boat-dealer",
  "motorcycle-dealer",
  "equipment-sales",
]);

export function SalesDashboardLayout() {
  const { industrySlug } = useTenantConfig();
  const isCarDealership = industrySlug ? CAR_DEALERSHIP_SLUGS.has(industrySlug) : false;
  const { stats: driveStats, testDrives } = useTestDrives();
  const { stats: inventoryStats } = useSalesInventory();
  const { stats: leadStats } = useSalesLeads();

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
      {/* Stats Row — adapts to car dealership vs other sales industries */}
      {isCarDealership ? (
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
                <Flame className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadStats.hot}</p>
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
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <PhoneCall className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadStats.new}</p>
                <p className="text-xs text-muted-foreground">New Leads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-accent">
                <Flame className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadStats.hot}</p>
                <p className="text-xs text-muted-foreground">Hot Leads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadStats.qualified}</p>
                <p className="text-xs text-muted-foreground">Qualified</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-secondary">
                <Users className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leadStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Today's Schedule + Quick Actions */}
      {isCarDealership ? (
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
                      {d.customer?.full_name || "Prospect"}
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
      ) : (
      <div className="flex justify-end">
        <div className="space-y-2">
          <QuickActionButton
            label="View Pipeline"
            description="Track leads through your sales funnel"
            href="/app/sales-pipeline"
            icon={TrendingUp}
          />
          <QuickActionButton
            label="View Leads"
            description="All incoming leads from your AI"
            href="/app/leads"
            icon={Users}
          />
          <QuickActionButton
            label="Call History"
            description="Review recent AI conversations"
            href="/app/calls"
            icon={PhoneCall}
          />
        </div>
      </div>
      )}

      <ROIPerformanceWidget />
      <LeadRecoveryWidget />
    </div>
  );
}
