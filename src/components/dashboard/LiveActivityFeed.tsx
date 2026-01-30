import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import {
  Phone,
  Calendar,
  UtensilsCrossed,
  Truck,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  Activity,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "call" | "booking" | "order" | "dispatch" | "sms";
  title: string;
  subtitle: string;
  time: string;
  timestamp: Date;
  status?: "success" | "warning" | "info";
}

export function LiveActivityFeed() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel('activity-feed-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_call_sessions', filter: `tenant_id=eq.${tenant.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["live-activity-feed", tenant.id] })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings', filter: `tenant_id=eq.${tenant.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["live-activity-feed", tenant.id] })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'food_orders', filter: `tenant_id=eq.${tenant.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["live-activity-feed", tenant.id] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  const { data: activities, isLoading } = useQuery({
    queryKey: ["live-activity-feed", tenant?.id],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!tenant?.id) return [];

      const results: ActivityItem[] = [];

      // Fetch recent calls
      const { data: calls } = await supabase
        .from("ai_call_sessions")
        .select("id, caller_phone, outcome, started_at, summary")
        .eq("tenant_id", tenant.id)
        .order("started_at", { ascending: false })
        .limit(5);

      calls?.forEach((call) => {
        const phone = call.caller_phone || "Unknown";
        const displayPhone = phone.length > 8 
          ? `${phone.slice(0, 3)}...${phone.slice(-4)}` 
          : phone;
        
        results.push({
          id: `call-${call.id}`,
          type: "call",
          title: `Call ${call.outcome === 'booked' ? 'converted' : 'answered'}`,
          subtitle: call.summary?.slice(0, 50) || `From: ${displayPhone}`,
          time: formatDistanceToNow(new Date(call.started_at), { addSuffix: true }),
          timestamp: new Date(call.started_at),
          status: call.outcome === 'booked' ? 'success' : 'info',
        });
      });

      // Fetch recent bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status, created_at, leads(full_name)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(4);

      bookings?.forEach((booking) => {
        const leadName = (booking.leads as any)?.full_name || "Customer";
        results.push({
          id: `booking-${booking.id}`,
          type: "booking",
          title: `Booking ${booking.status === 'confirmed' ? 'confirmed' : 'created'}`,
          subtitle: leadName,
          time: formatDistanceToNow(new Date(booking.created_at), { addSuffix: true }),
          timestamp: new Date(booking.created_at),
          status: booking.status === 'confirmed' ? 'success' : 'info',
        });
      });

      // Fetch recent orders
      const { data: orders } = await supabase
        .from("food_orders")
        .select("id, order_number, status, order_type, customer_name, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(4);

      orders?.forEach((order) => {
        results.push({
          id: `order-${order.id}`,
          type: "order",
          title: `Order #${order.order_number}`,
          subtitle: `${order.customer_name || "Customer"} • ${order.order_type?.replace("_", " ")}`,
          time: formatDistanceToNow(new Date(order.created_at), { addSuffix: true }),
          timestamp: new Date(order.created_at),
          status: order.status === 'completed' ? 'success' : 'info',
        });
      });

      // Fetch dispatch jobs
      const { data: jobs } = await supabase
        .from("dispatch_jobs")
        .select("id, status, customer_name, job_type, created_at")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(3);

      jobs?.forEach((job) => {
        results.push({
          id: `dispatch-${job.id}`,
          type: "dispatch",
          title: `${job.job_type || 'Job'} ${job.status}`,
          subtitle: job.customer_name || "Customer",
          time: formatDistanceToNow(new Date(job.created_at), { addSuffix: true }),
          timestamp: new Date(job.created_at),
          status: job.status === 'completed' ? 'success' : 'info',
        });
      });

      // Sort by timestamp and take top 10
      return results
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10);
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000,
  });

  const getIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "call": return <Phone className={iconClass} />;
      case "booking": return <Calendar className={iconClass} />;
      case "order": return <UtensilsCrossed className={iconClass} />;
      case "dispatch": return <Truck className={iconClass} />;
      case "sms": return <MessageSquare className={iconClass} />;
      default: return <CheckCircle2 className={iconClass} />;
    }
  };

  const getIconStyles = (type: string) => {
    switch (type) {
      case "call": return { bg: "bg-emerald-500/15", color: "text-emerald-400" };
      case "booking": return { bg: "bg-blue-500/15", color: "text-blue-400" };
      case "order": return { bg: "bg-orange-500/15", color: "text-orange-400" };
      case "dispatch": return { bg: "bg-sky-500/15", color: "text-sky-400" };
      case "sms": return { bg: "bg-purple-500/15", color: "text-purple-400" };
      default: return { bg: "bg-muted", color: "text-muted-foreground" };
    }
  };

  const getNavPath = (type: string) => {
    switch (type) {
      case "call": return "/app/calls";
      case "booking": return "/app/bookings";
      case "order": return "/app/orders";
      case "dispatch": return "/app/dispatch";
      default: return "/app/inbox";
    }
  };

  const hasActivity = activities && activities.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Live Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-1" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Live Activity
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs h-7"
          onClick={() => navigate("/app/inbox")}
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {hasActivity ? (
          <div className="space-y-1">
            {activities.slice(0, 8).map((item) => {
              const iconStyles = getIconStyles(item.type);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(getNavPath(item.type))}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${iconStyles.bg} ${iconStyles.color}`}>
                      {getIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{item.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 ml-2">{item.time}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Phone className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs">Calls, bookings, and orders appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
