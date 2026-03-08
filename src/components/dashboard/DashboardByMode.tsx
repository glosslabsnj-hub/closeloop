import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Phone, 
  Calendar, 
  Truck, 
  UtensilsCrossed, 
  Stethoscope,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  Users,
  ShieldCheck
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { startOfDay, endOfDay } from "date-fns";
import { AutomationStatusCard } from "./AutomationStatusCard";
import { useIndustryContext } from "@/hooks/useIndustryContext";

interface TodayStats {
  callsToday: number;
  pendingItems: number;
  urgentItems: number;
  completedItems: number;
}

export function DashboardByMode() {
  const { businessMode, hipaaMode } = useTenantConfig();
  const caps = useCapabilities();
  const { tenant } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-today-stats", tenant?.id, businessMode],
    queryFn: async (): Promise<TodayStats> => {
      if (!tenant?.id) return { callsToday: 0, pendingItems: 0, urgentItems: 0, completedItems: 0 };

      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();

      // Get calls today
      const { count: callsToday } = await supabase
        .from("ai_call_sessions")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .gte("started_at", todayStart)
        .lte("started_at", todayEnd);

      // Use separate variables per capability to avoid overwrites
      let pendingBookings = 0;
      let completedBookings = 0;
      let pendingDispatches = 0;
      let urgentDispatches = 0;
      let completedDispatches = 0;
      let pendingOrders = 0;
      let completedOrders = 0;
      let pendingIntakes = 0;
      let urgentIntakes = 0;
      let pendingSalesLeads = 0;

      // Capability-specific queries
      if (caps.hasBooking) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("status, start_at")
          .eq("tenant_id", tenant.id)
          .gte("start_at", todayStart)
          .lte("start_at", todayEnd);

        // For service mode: count deposit-pending bookings. For sales mode: count pending test drives.
        pendingBookings = caps.isSalesBusiness
          ? bookings?.filter(b => b.status === "pending").length || 0
          : bookings?.filter(b => b.status === "pending_deposit").length || 0;
        completedBookings = bookings?.filter(b => b.status === "confirmed").length || 0;
      }

      // Sales leads — new/contacted prospects in the pipeline
      if (caps.hasSalesLeads) {
        const { count: leadsCount } = await supabase
          .from("sales_leads")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .in("status", ["new", "contacted"]);
        pendingSalesLeads = leadsCount || 0;
      }

      if (caps.hasDispatchQueue) {
        const { data: jobs } = await supabase
          .from("dispatch_jobs")
          .select("status, priority, created_at")
          .eq("tenant_id", tenant.id)
          .in("status", ["pending", "assigned", "en_route", "on_site"]);

        pendingDispatches = jobs?.filter(j => j.status === "pending").length || 0;
        urgentDispatches = jobs?.filter(j => j.priority === "urgent" || j.priority === "high").length || 0;
        completedDispatches = jobs?.filter(j => j.status === "completed").length || 0;
      }

      if (caps.hasFoodOrders) {
        const { data: orders } = await supabase
          .from("food_orders")
          .select("status, created_at")
          .eq("tenant_id", tenant.id)
          .gte("created_at", todayStart)
          .lte("created_at", todayEnd);

        pendingOrders = orders?.filter(o => o.status === "pending" || o.status === "confirmed").length || 0;
        completedOrders = orders?.filter(o => o.status === "ready" || o.status === "confirmed").length || 0;
      }

      if (caps.hasMedicalIntake) {
        const { data: intakes } = await supabase
          .from("medical_intakes")
          .select("status, urgency_level, created_at")
          .eq("tenant_id", tenant.id)
          .eq("status", "pending");

        pendingIntakes = intakes?.length || 0;
        urgentIntakes = intakes?.filter(i => i.urgency_level === "urgent").length || 0;
      }

      // Combine all capabilities into the final totals
      // For sales mode: pendingItems = active pipeline leads (new/contacted)
      // For other modes: pendingItems = pending bookings/jobs/orders/intakes
      const pendingItemsBase = pendingBookings + pendingDispatches + pendingOrders + pendingIntakes;
      return {
        callsToday: callsToday || 0,
        pendingItems: caps.isSalesBusiness ? pendingSalesLeads : pendingItemsBase,
        urgentItems: urgentDispatches + urgentIntakes,
        completedItems: completedBookings + completedDispatches + completedOrders,
      };
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HIPAA Badge for Medical */}
      {hipaaMode && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">
            HIPAA Compliance Mode Active
          </span>
        </div>
      )}

      {/* Mode-specific Today View */}
      {caps.derivedPrimaryMode === "service" && (
        <ServiceTodayView stats={stats} mode={caps.derivedPrimaryMode} />
      )}

      {caps.derivedPrimaryMode === "dispatch" && (
        <DispatchTodayView stats={stats} />
      )}

      {caps.derivedPrimaryMode === "food" && (
        <FoodTodayView stats={stats} />
      )}

      {caps.derivedPrimaryMode === "medical" && (
        <MedicalTodayView stats={stats} hipaaMode={hipaaMode} />
      )}

      {caps.derivedPrimaryMode === "general" && (
        <GeneralTodayView stats={stats} />
      )}

      {caps.derivedPrimaryMode === "sales" && (
        <SalesTodayView stats={stats} />
      )}
    </div>
  );
}

function ServiceTodayView({ stats, mode: _mode }: { stats?: TodayStats; mode?: string }) {
  const { terms } = useIndustryContext();
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Today's Overview</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Calls Today"
          value={stats?.callsToday || 0}
          icon={Phone}
          href="/app/calls"
        />
        <StatCard
          title={terms.pendingBookings.charAt(0).toUpperCase() + terms.pendingBookings.slice(1)}
          value={stats?.pendingItems || 0}
          icon={Clock}
          variant={stats?.pendingItems ? "warning" : "default"}
          href="/app/bookings"
        />
        <StatCard
          title="Confirmed Today"
          value={stats?.completedItems || 0}
          icon={CheckCircle2}
          variant="success"
          href="/app/bookings"
        />
        <AutomationStatusCard />
        <QuickActionCard
          title={terms.newBooking}
          description={`Create a new ${terms.booking}`}
          icon={Calendar}
          href="/app/bookings"
        />
      </div>
    </div>
  );
}

function DispatchTodayView({ stats }: { stats?: TodayStats }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Active Dispatch Queue</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Calls Today"
          value={stats?.callsToday || 0}
          icon={Phone}
          href="/app/calls"
        />
        <StatCard
          title="Urgent Jobs"
          value={stats?.urgentItems || 0}
          icon={AlertCircle}
          variant={stats?.urgentItems ? "destructive" : "default"}
          href="/app/dispatch"
        />
        <StatCard
          title="Pending Jobs"
          value={stats?.pendingItems || 0}
          icon={Clock}
          variant={stats?.pendingItems ? "warning" : "default"}
          href="/app/dispatch"
        />
        <AutomationStatusCard />
        <QuickActionCard
          title="New Job"
          description="Create dispatch request"
          icon={Truck}
          href="/app/dispatch"
        />
      </div>
    </div>
  );
}

function FoodTodayView({ stats }: { stats?: TodayStats }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Kitchen Queue</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Calls Today"
          value={stats?.callsToday || 0}
          icon={Phone}
          href="/app/calls"
        />
        <StatCard
          title="Active Orders"
          value={stats?.pendingItems || 0}
          icon={UtensilsCrossed}
          variant={stats?.pendingItems ? "warning" : "default"}
          href="/app/orders"
        />
        <StatCard
          title="Completed Today"
          value={stats?.completedItems || 0}
          icon={CheckCircle2}
          variant="success"
          href="/app/orders"
        />
        <AutomationStatusCard />
        <QuickActionCard
          title="New Order"
          description="Take a phone order"
          icon={UtensilsCrossed}
          href="/app/orders"
        />
      </div>
    </div>
  );
}

function MedicalTodayView({ stats, _hipaaMode }: { stats?: TodayStats; hipaaMode: boolean }) {
  const { terms } = useIndustryContext();
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Patient Intake Queue</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Calls Today"
          value={stats?.callsToday || 0}
          icon={Phone}
          href="/app/calls"
        />
        <StatCard
          title="Urgent Intakes"
          value={stats?.urgentItems || 0}
          icon={AlertCircle}
          variant={stats?.urgentItems ? "destructive" : "default"}
          href="/app/medical-intake"
        />
        <StatCard
          title="Pending Intakes"
          value={stats?.pendingItems || 0}
          icon={Clock}
          variant={stats?.pendingItems ? "warning" : "default"}
          href="/app/medical-intake"
        />
        <StatCard
          title={`${terms.bookings.charAt(0).toUpperCase() + terms.bookings.slice(1)} Today`}
          value={stats?.completedItems || 0}
          icon={Calendar}
          href="/app/bookings"
        />
      </div>
    </div>
  );
}

function SalesTodayView({ stats }: { stats?: TodayStats }) {
  const { terms } = useIndustryContext();
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Today's {terms.bookings.charAt(0).toUpperCase() + terms.bookings.slice(1)} Activity</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Calls Today"
          value={stats?.callsToday || 0}
          icon={Phone}
          href="/app/calls"
        />
        <StatCard
          title="New Prospects"
          value={stats?.pendingItems || 0}
          icon={Users}
          variant={stats?.pendingItems ? "warning" : "default"}
          href="/app/sales-pipeline"
        />
        <StatCard
          title={`${terms.bookings.charAt(0).toUpperCase() + terms.bookings.slice(1)} Today`}
          value={stats?.completedItems || 0}
          icon={Calendar}
          variant="success"
          href="/app/bookings"
        />
        <QuickActionCard
          title="View Sales Pipeline"
          description="Manage prospects and leads"
          icon={DollarSign}
          href="/app/sales-pipeline"
        />
      </div>
    </div>
  );
}

function GeneralTodayView({ stats }: { stats?: TodayStats }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Today's Activity</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Calls Today"
          value={stats?.callsToday || 0}
          icon={Phone}
          href="/app/calls"
        />
        <StatCard
          title="New Leads"
          value={stats?.pendingItems || 0}
          icon={Users}
          href="/app/leads"
        />
        <QuickActionCard
          title="View All Leads"
          description="Manage your contacts"
          icon={Users}
          href="/app/leads"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  href: string;
  variant?: "default" | "success" | "warning" | "destructive";
}

function StatCard({ title, value, icon: Icon, href, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-primary/30 bg-primary/5",
    warning: "border-accent/30 bg-accent/5",
    destructive: "border-destructive/30 bg-destructive/5"
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-primary",
    warning: "text-accent-foreground",
    destructive: "text-destructive"
  };

  return (
    <Link to={href}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer ${variantStyles[variant]}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${iconStyles[variant]}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
}

function QuickActionCard({ title, description, icon: Icon, href }: QuickActionCardProps) {
  return (
    <Link to={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Icon className="h-5 w-5 text-primary" />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
