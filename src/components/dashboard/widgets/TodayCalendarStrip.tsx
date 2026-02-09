import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  starts_at: string;
  service_name: string | null;
  customer_name: string | null;
  status: string;
}

export function TodayCalendarStrip() {
  const { tenant } = useAuth();
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data: bookings = [] } = useQuery({
    queryKey: ["today-calendar-strip", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("bookings")
        .select("id, starts_at, service_name, customer_name, status")
        .eq("tenant_id", tenant.id)
        .gte("starts_at", todayStart)
        .lte("starts_at", todayEnd)
        .order("starts_at", { ascending: true })
        .limit(12);
      return (data || []) as Booking[];
    },
    enabled: !!tenant?.id,
  });

  const now = new Date();

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No appointments scheduled today</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Today's Schedule</p>
          <Badge variant="secondary" className="text-xs ml-auto">
            {bookings.length} {bookings.length === 1 ? "appointment" : "appointments"}
          </Badge>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {bookings.map((b) => {
            const time = parseISO(b.starts_at);
            const isPast = time < now;
            return (
              <div
                key={b.id}
                className={cn(
                  "flex-shrink-0 rounded-lg border p-2.5 min-w-[120px] transition-colors",
                  isPast ? "bg-muted/50 opacity-60" : "bg-primary/5 border-primary/20"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-semibold tabular-nums">
                    {format(time, "h:mm a")}
                  </span>
                </div>
                <p className="text-xs font-medium truncate">{b.customer_name || "Walk-in"}</p>
                {b.service_name && (
                  <p className="text-[11px] text-muted-foreground truncate">{b.service_name}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
