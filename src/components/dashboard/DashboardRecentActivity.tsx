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

export function DashboardRecentActivity() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const terms = useTerminology();

  // Realtime subscription
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel('dashboard-activity-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_call_sessions', filter: `tenant_id=eq.${tenant.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-activity", tenant.id] })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings', filter: `tenant_id=eq.${tenant.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-activity", tenant.id] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  const { data: activities, isLoading } = useQuery({
    queryKey: ["dashboard-activity", tenant?.id],
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

      // Fetch recent bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status, created_at, leads(full_name), services(name)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(3);

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
    booking: Calendar,
    order: UtensilsCrossed,
    dispatch: Truck,
    sms: MessageSquare,
  }), []);

  const colorMap: Record<string, string> = useMemo(() => ({
    call: "bg-primary/10 text-primary",
    booking: "bg-success/10 text-success",
    order: "bg-warning/10 text-warning",
    dispatch: "bg-info/10 text-info",
    sms: "bg-purple-500/10 text-purple-500",
  }), []);

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
            onClick={() => navigate("/app/inbox")}
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
                  onClick={() => navigate("/app/inbox")}
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
