import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  ArrowRight, 
  UtensilsCrossed,
  Truck,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActiveItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  statusColor: string;
  time: string;
  priority?: "urgent" | "normal";
}

// For Food Mode: Active orders in progress
function FoodActiveOrders() {
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["active-orders", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("food_orders")
        .select("id, status, customer_name, created_at, scheduled_at, order_type, total_cents")
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "confirmed", "preparing", "ready"])
        .order("created_at", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "New", className: "bg-warning/10 text-warning border-warning/30" },
    confirmed: { label: "Confirmed", className: "bg-info/10 text-info border-info/30" },
    preparing: { label: "Preparing", className: "bg-warning/10 text-warning border-warning/30" },
    ready: { label: "Ready", className: "bg-success/10 text-success border-success/30" },
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Active Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Active Orders</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-sm h-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/app/orders")}
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {orders && orders.length > 0 ? (
          <div className="space-y-2">
            {orders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending;
              const amount = order.total_cents ? `$${(order.total_cents / 100).toFixed(2)}` : "";
              return (
                <div
                  key={order.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                    "hover:bg-muted/50",
                    order.status === "ready" && "bg-success/5 border border-success/20"
                  )}
                  onClick={() => navigate(`/app/orders`)}
                >
                  <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                    {order.status === "ready" ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <UtensilsCrossed className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {order.customer_name || "Customer"}
                      </p>
                      <Badge variant="outline" size="sm" className={config.className}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {order.order_type === "pickup" ? "Pickup" : "Delivery"}
                      {amount && ` • ${amount}`}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: false })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No active orders</p>
            <p className="text-xs text-muted-foreground mt-1">
              Orders will appear here when placed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// For Dispatch Mode: Active jobs with status
function DispatchActiveJobs() {
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["active-jobs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("dispatch_jobs")
        .select("id, status, customer_name, job_type, priority, created_at, pickup_address")
        .eq("tenant_id", tenant.id)
        .in("status", ["pending", "assigned", "en_route", "on_site"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/30" },
    assigned: { label: "Assigned", className: "bg-info/10 text-info border-info/30" },
    en_route: { label: "En Route", className: "bg-primary/10 text-primary border-primary/30" },
    on_site: { label: "On Site", className: "bg-success/10 text-success border-success/30" },
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Active Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Active Jobs</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-sm h-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/app/dispatch")}
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {jobs && jobs.length > 0 ? (
          <div className="space-y-2">
            {jobs.map((job) => {
              const config = statusConfig[job.status] || statusConfig.pending;
              const isUrgent = job.priority === "urgent";
              return (
                <div
                  key={job.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                    "hover:bg-muted/50",
                    isUrgent && "bg-warning/5 border border-warning/20"
                  )}
                  onClick={() => navigate(`/app/dispatch`)}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    isUrgent ? "bg-warning/10" : "bg-primary/10"
                  )}>
                    {isUrgent ? (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    ) : (
                      <Truck className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {job.job_type || "Service"}
                      </p>
                      <Badge variant="outline" size="sm" className={config.className}>
                        {config.label}
                      </Badge>
                      {isUrgent && (
                        <Badge variant="warning" size="sm">Urgent</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.pickup_address || job.customer_name || "Location"}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: false })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Truck className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No active jobs</p>
            <p className="text-xs text-muted-foreground mt-1">
              Jobs will appear here when dispatched.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main export that selects the appropriate component
export function DashboardActiveWork() {
  const { businessMode } = useTenantConfig();

  if (businessMode === "food") {
    return <FoodActiveOrders />;
  }

  if (businessMode === "dispatch") {
    return <DispatchActiveJobs />;
  }

  // For other modes, return null (schedule will be shown instead)
  return null;
}
