import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIndustryContext } from "@/hooks/useIndustryContext";
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
  const { terms } = useIndustryContext();

  // Realtime subscription
  useEffect(() => {
    if (!tenant?.id) return;
    const channel = supabase
      .channel('activity-feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_call_sessions', filter: `tenant_id=eq.${tenant.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["live-activity-feed", tenant.id] })
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `tenant_id=eq.${tenant.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["live-activity-feed", tenant.id] })
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'food_orders', filter: `tenant_id=eq.${tenant.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["live-activity-feed", tenant.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenant?.id, queryClient]);

  const { data: activities, isLoading } = useQuery({
    queryKey: ["live-activity-feed", tenant?.id],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!tenant?.id) return [];
      const results: ActivityItem[] = [];

      const { data: calls } = await supabase
        .from("ai_call_sessions")
        .select("id, caller_phone, outcome, started_at, summary")
        .eq("tenant_id", tenant.id)
        .order("started_at", { ascending: false })
        .limit(5);

      calls?.forEach((call) => {
        const phone = call.caller_phone || "Unknown";
        const displayPhone = phone.length > 8 ? `${phone.slice(0, 3)}...${phone.slice(-4)}` : phone;
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
          subtitle: `${order.customer_name || "Customer"} · ${order.order_type?.replace("_", " ")}`,
          time: formatDistanceToNow(new Date(order.created_at), { addSuffix: true }),
          timestamp: new Date(order.created_at),
          status: order.status === 'completed' ? 'success' : 'info',
        });
      });

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

      return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
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
    dispatch: "bg-primary/10 text-primary",
    sms: "bg-accent/10 text-accent-foreground",
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
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1.5" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs h-7 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/app/inbox")}
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {hasActivity ? (
          <div className="space-y-1">
            {activities.slice(0, 8).map((item) => {
              const Icon = iconMap[item.type] || Phone;
              const colorClass = colorMap[item.type] || "bg-muted text-muted-foreground";
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2.5 -mx-2.5 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => navigate(getNavPath(item.type))}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    colorClass
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{item.title}</p>
                    <p className="text-[13px] text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 shrink-0 mt-0.5">{item.time}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="rounded-2xl bg-muted/60 p-4 mb-4">
              <Inbox className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium mb-1">No activity yet</p>
            <p className="text-xs text-muted-foreground max-w-[220px] mb-4">
              When your AI handles calls, activity will appear here.
            </p>
            <Button size="sm" variant="outline" asChild>
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
