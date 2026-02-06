import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Phone,
  Calendar,
  UtensilsCrossed,
  Truck,
  MessageSquare,
  ArrowRight,
  FlaskConical,
  Inbox,
  CheckCircle2,
  Stethoscope,
  ClipboardCheck,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "call" | "booking" | "order" | "dispatch" | "sms" | "intake";
  title: string;
  subtitle: string;
  time: string;
  timestamp: Date;
  status?: "success" | "warning" | "info" | "pending";
  statusLabel?: string;
}

export function DashboardRecentActivity() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const queryClient = useQueryClient();
  const terms = useTerminology();

  // Realtime subscription based on mode
  useEffect(() => {
    if (!tenant?.id) return;

    const tables: string[] = ["ai_call_sessions"];
    
    if (businessMode === "food") {
      tables.push("food_orders");
    } else if (businessMode === "dispatch") {
      tables.push("dispatch_jobs");
    } else if (businessMode === "medical") {
      tables.push("bookings", "medical_intakes");
    } else {
      tables.push("bookings");
    }

    const channel = supabase.channel('dashboard-activity-realtime');
    
    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `tenant_id=eq.${tenant.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-activity", tenant.id, businessMode] })
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, businessMode, queryClient]);

  const { data: activities, isLoading } = useQuery({
    queryKey: ["dashboard-activity", tenant?.id, businessMode],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!tenant?.id) return [];

      const results: ActivityItem[] = [];

      // Fetch recent calls (all modes)
      const { data: calls } = await supabase
        .from("ai_call_sessions")
        .select("id, caller_phone, outcome, started_at, summary")
        .eq("tenant_id", tenant.id)
        .order("started_at", { ascending: false })
        .limit(5);

      calls?.forEach((call) => {
        const phone = call.caller_phone || "Unknown";
        const displayPhone = phone.length > 8 
          ? `...${phone.slice(-4)}` 
          : phone;
        
        const outcomeLabel = call.outcome === 'booked' 
          ? 'Booked' 
          : call.outcome === 'message' 
            ? 'Message taken'
            : 'Answered';

        results.push({
          id: `call-${call.id}`,
          type: "call",
          title: outcomeLabel,
          subtitle: call.summary?.slice(0, 40) || `From ${displayPhone}`,
          time: formatDistanceToNow(new Date(call.started_at), { addSuffix: false }),
          timestamp: new Date(call.started_at),
          status: call.outcome === 'booked' ? 'success' : 'info',
        });
      });

      // Mode-specific activity
      if (businessMode === "food") {
        const { data: orders } = await supabase
          .from("food_orders")
          .select("id, status, created_at, customer_name, total_cents")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(5);

        orders?.forEach((order) => {
          const statusMap: Record<string, { label: string; status: ActivityItem["status"] }> = {
            pending: { label: "New Order", status: "warning" },
            confirmed: { label: "Confirmed", status: "info" },
            preparing: { label: "Preparing", status: "info" },
            ready: { label: "Ready", status: "success" },
            completed: { label: "Completed", status: "success" },
            canceled: { label: "Canceled", status: "pending" },
          };
          const statusInfo = statusMap[order.status] || { label: order.status, status: "info" };
          const amount = order.total_cents ? `$${(order.total_cents / 100).toFixed(2)}` : "";

          results.push({
            id: `order-${order.id}`,
            type: "order",
            title: statusInfo.label,
            subtitle: `${order.customer_name || "Customer"}${amount ? ` • ${amount}` : ""}`,
            time: formatDistanceToNow(new Date(order.created_at), { addSuffix: false }),
            timestamp: new Date(order.created_at),
            status: statusInfo.status,
            statusLabel: statusInfo.label,
          });
        });
      } else if (businessMode === "dispatch") {
        const { data: jobs } = await supabase
          .from("dispatch_jobs")
          .select("id, status, created_at, customer_name, job_type, priority")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(5);

        jobs?.forEach((job) => {
          const statusMap: Record<string, { label: string; status: ActivityItem["status"] }> = {
            pending: { label: "New Job", status: "warning" },
            assigned: { label: "Assigned", status: "info" },
            en_route: { label: "En Route", status: "info" },
            on_site: { label: "On Site", status: "info" },
            completed: { label: "Completed", status: "success" },
            cancelled: { label: "Cancelled", status: "pending" },
          };
          const statusInfo = statusMap[job.status] || { label: job.status, status: "info" };

          results.push({
            id: `job-${job.id}`,
            type: "dispatch",
            title: statusInfo.label,
            subtitle: `${job.customer_name || "Customer"} • ${job.job_type || "Service"}`,
            time: formatDistanceToNow(new Date(job.created_at), { addSuffix: false }),
            timestamp: new Date(job.created_at),
            status: job.priority === "urgent" ? "warning" : statusInfo.status,
            statusLabel: job.priority === "urgent" ? "Urgent" : undefined,
          });
        });
      } else if (businessMode === "medical") {
        // Fetch appointments (HIPAA-safe: minimal info)
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, status, created_at, services(name)")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(4);

        bookings?.forEach((booking) => {
          const serviceName = (booking.services as any)?.name || "Appointment";
          results.push({
            id: `booking-${booking.id}`,
            type: "booking",
            title: booking.status === 'confirmed' ? 'Confirmed' : 'Scheduled',
            subtitle: serviceName,
            time: formatDistanceToNow(new Date(booking.created_at), { addSuffix: false }),
            timestamp: new Date(booking.created_at),
            status: booking.status === 'confirmed' ? 'success' : 'info',
          });
        });

        // Fetch intakes
        const { data: intakes } = await supabase
          .from("medical_intakes")
          .select("id, created_at, status, reason_for_visit")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(3);

        intakes?.forEach((intake) => {
          results.push({
            id: `intake-${intake.id}`,
            type: "intake",
            title: "Intake Form",
            subtitle: intake.reason_for_visit?.slice(0, 30) || "New intake submitted",
            time: formatDistanceToNow(new Date(intake.created_at), { addSuffix: false }),
            timestamp: new Date(intake.created_at),
            status: intake.status === 'completed' ? 'success' : 'info',
          });
        });
      } else {
        // Service/General: bookings
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, status, created_at, leads(full_name), services(name)")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(4);

        bookings?.forEach((booking) => {
          const leadName = (booking.leads as any)?.full_name || terms.customer;
          const serviceName = (booking.services as any)?.name;
          results.push({
            id: `booking-${booking.id}`,
            type: "booking",
            title: booking.status === 'confirmed' ? terms.bookingConfirmed : terms.bookingCreated,
            subtitle: serviceName ? `${leadName} - ${serviceName}` : leadName,
            time: formatDistanceToNow(new Date(booking.created_at), { addSuffix: false }),
            timestamp: new Date(booking.created_at),
            status: booking.status === 'confirmed' ? 'success' : 'info',
          });
        });
      }

      // Sort by timestamp and take top 6
      return results
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 6);
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000,
  });

  const iconMap: Record<string, React.ElementType> = useMemo(() => ({
    call: Phone,
    booking: businessMode === "medical" ? Stethoscope : Calendar,
    order: UtensilsCrossed,
    dispatch: Truck,
    sms: MessageSquare,
    intake: ClipboardCheck,
  }), [businessMode]);

  const colorMap: Record<string, string> = useMemo(() => ({
    call: "bg-primary/10 text-primary",
    booking: businessMode === "medical" ? "bg-teal-500/10 text-teal-500" : "bg-success/10 text-success",
    order: "bg-orange-500/10 text-orange-500",
    dispatch: "bg-purple-500/10 text-purple-500",
    sms: "bg-purple-500/10 text-purple-500",
    intake: "bg-blue-500/10 text-blue-500",
  }), [businessMode]);

  const getViewAllHref = () => {
    switch (businessMode) {
      case "food": return "/app/orders";
      case "dispatch": return "/app/dispatch";
      default: return "/app/inbox";
    }
  };

  const hasActivity = activities && activities.length > 0;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1.5" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-sm h-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(getViewAllHref())}
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {hasActivity ? (
          <div className="space-y-1">
            {activities.map((item) => {
              const Icon = iconMap[item.type] || Phone;
              const colorClass = colorMap[item.type];
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(getViewAllHref())}
                >
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                    colorClass
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.status === "success" && (
                        <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                      )}
                      {item.statusLabel && (
                        <Badge 
                          variant={item.status === "warning" ? "warning" : "secondary"} 
                          size="sm"
                          className="shrink-0"
                        >
                          {item.statusLabel}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">{item.time}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No activity yet</p>
            <p className="text-xs text-muted-foreground max-w-[200px] mb-3">
              Activity will appear here when your AI handles calls.
            </p>
            <Button size="sm" asChild>
              <Link to="/app/simulator" className="gap-1.5">
                <FlaskConical className="h-3.5 w-3.5" />
                Test Your AI
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
