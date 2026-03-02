import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { startOfDay, endOfDay } from "date-fns";

interface TodayStats {
  pendingItems: number;
  urgentItems: number;
  completedItems: number;
}

export function TodayQueueCard() {
  const { businessMode, hipaaMode } = useTenantConfig();
  const caps = useCapabilities();
  const { tenant } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["today-queue-stats", tenant?.id, businessMode],
    queryFn: async (): Promise<TodayStats> => {
      if (!tenant?.id) return { pendingItems: 0, urgentItems: 0, completedItems: 0 };

      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();

      let pendingItems = 0;
      let urgentItems = 0;
      let completedItems = 0;

      if (caps.hasBooking) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("status, start_at")
          .eq("tenant_id", tenant.id)
          .gte("start_at", todayStart)
          .lte("start_at", todayEnd);

        pendingItems = bookings?.filter(b => b.status === "pending_deposit").length || 0;
        completedItems = bookings?.filter(b => b.status === "confirmed").length || 0;
      }

      if (caps.hasDispatchQueue) {
        const { data: jobs } = await supabase
          .from("dispatch_jobs")
          .select("status, priority")
          .eq("tenant_id", tenant.id)
          .in("status", ["pending", "assigned", "en_route", "on_site"]);

        pendingItems = jobs?.filter(j => j.status === "pending").length || 0;
        urgentItems = jobs?.filter(j => j.priority === "urgent" || j.priority === "high").length || 0;
        completedItems = jobs?.filter(j => j.status === "completed").length || 0;
      }

      if (caps.hasFoodOrders) {
        const { data: orders } = await supabase
          .from("food_orders")
          .select("status, created_at")
          .eq("tenant_id", tenant.id)
          .gte("created_at", todayStart)
          .lte("created_at", todayEnd);

        pendingItems = orders?.filter(o => o.status === "pending" || o.status === "confirmed").length || 0;
        completedItems = orders?.filter(o => o.status === "ready" || o.status === "completed").length || 0;
      }

      if (caps.hasMedicalIntake) {
        const { data: intakes } = await supabase
          .from("medical_intakes")
          .select("status, urgency_level")
          .eq("tenant_id", tenant.id)
          .eq("status", "pending");

        pendingItems = intakes?.length || 0;
        urgentItems = intakes?.filter(i => i.urgency_level === "urgent").length || 0;
      }

      return { pendingItems, urgentItems, completedItems };
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000,
  });

  const getQueueTitle = () => {
    switch (businessMode) {
      case "dispatch": return "Dispatch Queue";
      case "food": return "Kitchen Queue";
      case "medical": return "Intake Queue";
      case "sales": return "Today's Pipeline";
      default: return "Today's Queue";
    }
  };

  const getMainLink = () => {
    switch (businessMode) {
      case "dispatch": return "/app/dispatch";
      case "food": return "/app/orders";
      case "medical": return "/app/medical-intake";
      default: return "/app/bookings";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{getQueueTitle()}</CardTitle>
          {hipaaMode && (
            <Badge variant="outline" className="gap-1 text-xs">
              <ShieldCheck className="h-3 w-3" />
              HIPAA
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Link to={getMainLink()}>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group">
            <div className="flex items-center gap-3 sm:gap-6">
              {/* Pending */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${
                  stats?.pendingItems ? "bg-amber-500/15" : "bg-muted"
                }`}>
                  <Clock className={`h-4 w-4 ${stats?.pendingItems ? "text-amber-400" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{stats?.pendingItems || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>

              {/* Urgent (only show if mode supports it) */}
              {(caps.hasDispatchQueue || caps.hasMedicalIntake) && (
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${
                    stats?.urgentItems ? "bg-rose-500/15" : "bg-muted"
                  }`}>
                    <AlertCircle className={`h-4 w-4 ${stats?.urgentItems ? "text-rose-400" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{stats?.urgentItems || 0}</p>
                    <p className="text-xs text-muted-foreground">Urgent</p>
                  </div>
                </div>
              )}

              {/* Completed */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${
                  stats?.completedItems ? "bg-emerald-500/15" : "bg-muted"
                }`}>
                  <CheckCircle2 className={`h-4 w-4 ${stats?.completedItems ? "text-emerald-400" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{stats?.completedItems || 0}</p>
                  <p className="text-xs text-muted-foreground">Done</p>
                </div>
              </div>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
