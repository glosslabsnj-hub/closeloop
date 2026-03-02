import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useIndustryContext } from "@/hooks/useIndustryContext";

interface Booking {
  id: string;
  start_at: string;
  status: string;
  services: { name: string } | null;
  leads: { customers: { name: string | null } | null } | null;
}

export function TodayCalendarStrip() {
  const { tenant } = useAuth();
  const { terms } = useIndustryContext();
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const { data: bookings = [] } = useQuery({
    queryKey: ["today-calendar-strip", tenant?.id, todayStart],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("bookings")
        .select("id, start_at, status, services(name), leads(customers(name))")
        .eq("tenant_id", tenant.id)
        .gte("start_at", todayStart)
        .lte("start_at", todayEnd)
        .order("start_at", { ascending: true })
        .limit(12);
      return (data || []) as unknown as Booking[];
    },
    enabled: !!tenant?.id,
  });

  const now = new Date();

  if (bookings.length === 0) {
    return (
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm card-interactive">
        <CardContent className="p-4 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No {terms.bookings} scheduled today</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm card-interactive">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Today's Schedule</p>
          <Badge variant="secondary" className="text-xs ml-auto">
            {bookings.length} {bookings.length === 1 ? terms.booking : terms.bookings}
          </Badge>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {bookings.map((b) => {
            const time = parseISO(b.start_at);
            const isPast = time < now;
            const customerName = b.leads?.customers?.name;
            const serviceName = b.services?.name;
            return (
              <div
                key={b.id}
                className={cn(
                  "flex-shrink-0 rounded-xl border p-2.5 min-w-[120px] transition-colors",
                  isPast ? "bg-muted/50 opacity-60 border-border/40" : "bg-card/60 backdrop-blur-sm border-primary/20 hover:border-primary/30 border-l-2 border-l-primary"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-semibold tabular-nums">
                    {format(time, "h:mm a")}
                  </span>
                </div>
                <p className="text-xs font-medium truncate">{customerName || terms.customer}</p>
                {serviceName && (
                  <p className="text-[11px] text-muted-foreground truncate">{serviceName}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
