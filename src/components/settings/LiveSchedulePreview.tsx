import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isTomorrow, addDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { Calendar, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface BusyBlock {
  id: string;
  start_at: string;
  end_at: string;
  block_type: string;
  metadata_json: Record<string, unknown> | null;
}

interface CalendarConnection {
  id: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  display_name: string | null;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function LiveSchedulePreview() {
  const { tenant, assistantSettings } = useAuth();

  // Fetch weekly availability slots
  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ["availability-slots-preview", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("day_of_week");
      if (error) throw error;
      return data as AvailabilitySlot[];
    },
    enabled: !!tenant?.id,
  });

  // Fetch upcoming busy blocks (next 7 days)
  const { data: busyBlocks, isLoading: blocksLoading } = useQuery({
    queryKey: ["busy-blocks-preview", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const now = new Date();
      const weekFromNow = addDays(now, 7);
      
      const { data, error } = await supabase
        .from("busy_blocks")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .gte("end_at", now.toISOString())
        .lte("start_at", weekFromNow.toISOString())
        .order("start_at");
      
      if (error) throw error;
      return data as BusyBlock[];
    },
    enabled: !!tenant?.id,
  });

  // Fetch calendar connections
  const { data: calendarConnections, isLoading: connectionsLoading, refetch } = useQuery({
    queryKey: ["calendar-connections-preview", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("calendar_connections")
        .select("*")
        .eq("tenant_id", tenant.id);
      if (error) throw error;
      return data as CalendarConnection[];
    },
    enabled: !!tenant?.id,
  });

  const isLoading = slotsLoading || blocksLoading || connectionsLoading;

  // Get today's schedule
  const today = new Date();
  const todayDow = today.getDay();
  const todaySlot = slots?.find((s) => s.day_of_week === todayDow && s.is_available);

  // Get next 3 days with their schedules
  const upcomingDays = [0, 1, 2].map((offset) => {
    const date = addDays(today, offset);
    const dow = date.getDay();
    const slot = slots?.find((s) => s.day_of_week === dow && s.is_available);
    const dayBlocks = busyBlocks?.filter((b) => {
      const blockStart = parseISO(b.start_at);
      return blockStart >= startOfDay(date) && blockStart <= endOfDay(date);
    });

    return {
      date,
      dayName: isToday(date) ? "Today" : isTomorrow(date) ? "Tomorrow" : dayNames[dow],
      isOpen: !!slot,
      hours: slot ? `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}` : "Closed",
      blockedCount: dayBlocks?.length || 0,
    };
  });

  // Check if any calendar is connected (external or internal/closeloop)
  const isInternalCalendar = assistantSettings?.calendar_provider === 'closeloop';
  const hasCalendarConnected = isInternalCalendar || (calendarConnections && calendarConnections.length > 0);
  const activeConnection = calendarConnections?.find((c) => c.status === "active");

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">What Your AI Knows</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 px-2">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Real-time view of your AI's schedule understanding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <>
            {/* Today's Status - Prominent */}
            <div className="p-4 rounded-lg bg-background border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Right now</p>
                  <p className="font-semibold text-lg">
                    {todaySlot ? (
                      <span className="text-accent-foreground">Open</span>
                    ) : (
                      <span className="text-muted-foreground">Closed</span>
                    )}
                  </p>
                </div>
                {todaySlot ? (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Hours today</p>
                    <p className="font-medium">{formatTime(todaySlot.start_time)} - {formatTime(todaySlot.end_time)}</p>
                  </div>
                ) : (
                  <XCircle className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
            </div>

            {/* Upcoming Days */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Upcoming Schedule</p>
              <div className="grid gap-2">
                {upcomingDays.map((day, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-background border"
                  >
                    <div className="flex items-center gap-2">
                      {day.isOpen ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{day.dayName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{day.hours}</span>
                      {day.blockedCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {day.blockedCount} blocked
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar Sync Status */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeConnection ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        Calendar synced
                        {activeConnection.display_name && (
                          <span className="text-muted-foreground"> ({activeConnection.display_name})</span>
                        )}
                      </span>
                    </>
                  ) : isInternalCalendar ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm">Using Flux Receptionist Calendar</span>
                    </>
                  ) : hasCalendarConnected ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="text-sm text-warning">Calendar sync issue</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">No calendar connected</span>
                    </>
                  )}
                </div>
                {activeConnection?.last_sync_at && (
                  <span className="text-xs text-muted-foreground">
                    Last synced {format(parseISO(activeConnection.last_sync_at), "h:mm a")}
                  </span>
                )}
              </div>
            </div>

            {/* Blocked Times Summary */}
            {busyBlocks && busyBlocks.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Blocked Times (Next 7 Days)</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {busyBlocks.slice(0, 5).map((block) => (
                    <div key={block.id} className="flex items-center justify-between text-sm py-1">
                      <span className="text-muted-foreground">
                        {format(parseISO(block.start_at), "EEE, MMM d")}
                      </span>
                      <span>
                        {format(parseISO(block.start_at), "h:mm a")} - {format(parseISO(block.end_at), "h:mm a")}
                      </span>
                    </div>
                  ))}
                  {busyBlocks.length > 5 && (
                    <p className="text-xs text-muted-foreground">+{busyBlocks.length - 5} more blocks</p>
                  )}
                </div>
              </div>
            )}

            {/* Helpful Tip */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>
                💡 Your AI uses this schedule to answer "Are you open?" and to book appointments only during available hours.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}
