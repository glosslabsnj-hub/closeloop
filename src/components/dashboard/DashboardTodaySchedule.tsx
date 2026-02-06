import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  ArrowRight, 
  Clock, 
  User,
  CalendarX,
} from "lucide-react";
import { startOfDay, endOfDay, format, isAfter, isBefore, addMinutes } from "date-fns";

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  customer: string;
  status: "upcoming" | "now" | "past";
  isAvailable?: boolean;
}

export function DashboardTodaySchedule() {
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { enabledModules } = useTenantConfig();

  const hasBooking = enabledModules.includes("booking");

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["today-schedule", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          start_at,
          end_at,
          status,
          service:services(name),
          lead:leads(full_name)
        `)
        .eq("tenant_id", tenant.id)
        .gte("start_at", todayStart)
        .lte("start_at", todayEnd)
        .neq("status", "canceled")
        .order("start_at", { ascending: true })
        .limit(6);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id && hasBooking,
  });

  if (!hasBooking) {
    return null;
  }

  const now = new Date();

  const getStatus = (startAt: string, endAt: string): ScheduleItem["status"] => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    
    if (isAfter(now, start) && isBefore(now, end)) return "now";
    if (isBefore(now, start)) return "upcoming";
    return "past";
  };

  const scheduleItems: ScheduleItem[] = (bookings || []).map((booking) => ({
    id: booking.id,
    time: format(new Date(booking.start_at), "h:mm a"),
    title: (booking.service as any)?.name || "Appointment",
    customer: (booking.lead as any)?.full_name || "Customer",
    status: getStatus(booking.start_at, booking.end_at),
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Today's Schedule</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-sm h-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/app/calendar")}
          >
            View Calendar
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : scheduleItems.length > 0 ? (
          <div className="space-y-2">
            {scheduleItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  item.status === "now" && "bg-primary/5 border border-primary/20",
                  item.status === "past" && "opacity-50",
                  item.status === "upcoming" && "hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "text-sm font-mono font-medium tabular-nums w-16 shrink-0",
                  item.status === "now" ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {item.customer}
                  </p>
                </div>
                {item.status === "now" && (
                  <Badge variant="default" size="sm" className="shrink-0">
                    Now
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <CalendarX className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No appointments today</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your AI can book appointments when calls come in.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
