import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock } from "lucide-react";
import { format, startOfDay, addDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useIndustryContext } from "@/hooks/useIndustryContext";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface UpcomingBooking {
  id: string;
  start_at: string;
  status: string;
  services: { name: string } | null;
  leads: { full_name: string } | null;
}

export default function UpcomingAppointmentsWidget() {
  const { tenant } = useAuth();
  const { terms } = useIndustryContext();

  const todayStart = startOfDay(new Date()).toISOString();
  const weekEnd = addDays(new Date(), 7).toISOString();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["upcoming-appointments-7day", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, start_at, status, services(name), leads(full_name)")
        .eq("tenant_id", tenant!.id)
        .in("status", ["pending", "confirmed"])
        .gte("start_at", todayStart)
        .lte("start_at", weekEnd)
        .order("start_at", { ascending: true })
        .limit(20);

      if (error) throw error;
      return (data || []) as unknown as UpcomingBooking[];
    },
    enabled: !!tenant?.id,
    refetchInterval: 60_000,
  });

  // Group by date
  const grouped = new Map<string, UpcomingBooking[]>();
  for (const b of bookings || []) {
    const dateKey = format(parseISO(b.start_at), "yyyy-MM-dd");
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(b);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="h-32 animate-pulse bg-muted/50 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const total = bookings?.length || 0;

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm card-interactive">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Next 7 Days</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {total} {total !== 1 ? terms.bookings : terms.booking}
          </Badge>
        </div>

        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No upcoming {terms.bookings} this week
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Array.from(grouped.entries()).map(([dateKey, dayBookings]) => {
              const date = parseISO(dateKey);
              const isToday = format(new Date(), "yyyy-MM-dd") === dateKey;
              return (
                <div key={dateKey}>
                  <p className={cn(
                    "text-xs font-medium mb-1",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}>
                    {isToday ? "Today" : format(date, "EEE, MMM d")}
                  </p>
                  <div className="space-y-1">
                    {dayBookings.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card/80 border border-border/20 text-sm"
                      >
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium text-xs">
                          {format(parseISO(b.start_at), "h:mm a")}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {b.leads?.full_name || capitalize(terms.customer)} — {b.services?.name || capitalize(terms.service)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
