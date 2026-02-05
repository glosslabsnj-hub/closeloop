import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTerminology } from "@/hooks/useTerminology";
import { formatDistanceToNow } from "date-fns";
import {
  Phone,
  Calendar,
  UtensilsCrossed,
  Truck,
  MessageSquare,
  ArrowRight,
  FlaskConical,
  Inbox,
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
  const terms = useTerminology();

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
        const leadName = (booking.leads as any)?.full_name || terms.customer;
        const statusLabel = booking.status === 'confirmed' ? terms.bookingConfirmed : terms.bookingCreated;
        results.push({
          id: `booking-${booking.id}`,
          type: "booking",
          title: statusLabel,
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

  const iconMap: Record<string, React.ElementType> = useMemo(() => ({
    call: Phone,
    booking: Calendar,
    order: UtensilsCrossed,
    dispatch: Truck,
    sms: MessageSquare,
  }), []);

  const colorMap: Record<string, string> = useMemo(() => ({
    call: "bg-success/10 text-success",
    booking: "bg-info/10 text-info",
    order: "bg-warning/10 text-warning",
    dispatch: "bg-info/10 text-info",
    sms: "bg-primary/10 text-primary",
  }), []);

  const getNavPath = (type: string) => {
    switch (type) {
      case "call": return "/app/inbox?tab=calls";
      case "booking": return "/app/bookings";
      case "order": return "/app/orders";
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
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
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
            onClick={() => navigate("/app/inbox")}
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {hasActivity ? (
          <div className="space-y-2">
            {activities.slice(0, 6).map((item, index) => {
              const Icon = iconMap[item.type] || Phone;
              const colorClass = colorMap[item.type] || "bg-muted text-muted-foreground";
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(getNavPath(item.type))}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-[13px] text-muted-foreground truncate max-w-[200px]">{item.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground shrink-0 ml-3">{item.time}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No activity yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              When your AI handles calls, activity will appear here.
            </p>
            <Button asChild>
              <Link to="/app/simulator" className="gap-2">
                <FlaskConical className="h-4 w-4" />
                Test Your AI
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
