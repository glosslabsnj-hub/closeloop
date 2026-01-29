import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, PhoneMissed, Calendar, ArrowRight, UtensilsCrossed, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "call" | "booking" | "order" | "dispatch";
  name: string;
  action: string;
  outcome: string;
  time: string;
  timestamp: Date;
}

export function RecentActivityCard() {
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["recent-activity", tenant?.id],
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

      calls?.forEach(call => {
        const phone = call.caller_phone || "Unknown";
        const displayName = phone.length > 8 
          ? `${phone.slice(0, 3)}...${phone.slice(-4)}` 
          : phone;
        
        results.push({
          id: call.id,
          type: "call",
          name: displayName,
          action: "AI answered call",
          outcome: call.outcome || "Completed",
          time: formatDistanceToNow(new Date(call.started_at), { addSuffix: true }),
          timestamp: new Date(call.started_at),
        });
      });

      // Fetch recent bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status, created_at, leads(full_name)")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(3);

      bookings?.forEach(booking => {
        results.push({
          id: booking.id,
          type: "booking",
          name: (booking.leads as any)?.full_name || "Customer",
          action: booking.status === "confirmed" ? "Booking confirmed" : "Booking created",
          outcome: booking.status === "confirmed" ? "Confirmed" : "Pending",
          time: formatDistanceToNow(new Date(booking.created_at), { addSuffix: true }),
          timestamp: new Date(booking.created_at),
        });
      });

      // Sort by timestamp and take top 5
      return results
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5);
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000,
  });

  const getIconStyle = (type: string) => {
    switch (type) {
      case "call":
        return { icon: <Phone className="h-3.5 w-3.5 text-emerald-400" />, bg: "bg-emerald-500/15" };
      case "booking":
        return { icon: <Calendar className="h-3.5 w-3.5 text-blue-400" />, bg: "bg-blue-500/15" };
      case "order":
        return { icon: <UtensilsCrossed className="h-3.5 w-3.5 text-orange-400" />, bg: "bg-orange-500/15" };
      case "dispatch":
        return { icon: <Truck className="h-3.5 w-3.5 text-sky-400" />, bg: "bg-sky-500/15" };
      default:
        return { icon: <Phone className="h-3.5 w-3.5 text-muted-foreground" />, bg: "bg-muted" };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasActivity = activities && activities.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1 text-xs h-8"
          onClick={() => navigate("/app/inbox")}
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {hasActivity ? (
          <div className="space-y-1">
            {activities.map((activity) => {
              const style = getIconStyle(activity.type);
              return (
                <div 
                  key={activity.id} 
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate("/app/calls")}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${style.bg}`}>
                      {style.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.name}</p>
                      <p className="text-xs text-muted-foreground">{activity.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium capitalize">{activity.outcome}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs">Calls and bookings will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
