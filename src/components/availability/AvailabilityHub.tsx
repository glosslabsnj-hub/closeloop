import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBusyBlocks } from "@/hooks/useCalendarConnections";
import { useTenantSettings } from "@/hooks/useSettings";
import { CalendarConnectionStatus } from "./CalendarConnectionStatus";
import { DayAvailabilityTimeline } from "./DayAvailabilityTimeline";
import { QuickBlockDialog } from "./QuickBlockDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, startOfDay, endOfDay, format } from "date-fns";
import { Clock, ChevronRight } from "lucide-react";

interface BusinessHours {
  [key: string]: any;
}

/** Normalize hours_json day config (supports both legacy flat and windows array formats) */
function normalizeDayHours(dayConfig: any): { open: string; close: string } | null {
  if (!dayConfig || dayConfig.closed === true) return null;
  if (dayConfig.windows?.length) {
    return { open: dayConfig.windows[0].open, close: dayConfig.windows[0].close };
  }
  if (dayConfig.open && dayConfig.close) {
    return { open: dayConfig.open, close: dayConfig.close };
  }
  return null;
}

const DAY_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export function AvailabilityHub() {
  const { _tenant } = useAuth();
  const { tenant: tenantData, updateTenant } = useTenantSettings();
  const tenantLoading = updateTenant.isPending;
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDialogDate, setBlockDialogDate] = useState<Date | undefined>();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Get business hours from tenant
  const businessHours = (tenantData?.hours_json as unknown as BusinessHours) || null;

  // Get dates for today and next 2 days
  const today = new Date();
  const days = [today, addDays(today, 1), addDays(today, 2)];

  // Fetch busy blocks for next 3 days
  const { blocks, isLoading: blocksLoading, deleteBlock } = useBusyBlocks({
    start: startOfDay(today),
    end: endOfDay(addDays(today, 2)),
  });

  // Get blocks for a specific day
  const getBlocksForDay = (date: Date) => {
    return blocks.filter((block) => {
      const blockStart = new Date(block.start_at);
      return blockStart >= startOfDay(date) && blockStart <= endOfDay(date);
    });
  };

  // Get hours for a specific day
  const getHoursForDay = (date: Date) => {
    const dayName = DAY_MAP[date.getDay()];
    const raw = businessHours?.[dayName] || null;
    return normalizeDayHours(raw);
  };

  const handleOpenBlockDialog = (date?: Date) => {
    setBlockDialogDate(date);
    setBlockDialogOpen(true);
  };

  const handleRemoveBlock = async (blockId: string) => {
    await deleteBlock.mutateAsync(blockId);
  };

  const isLoading = tenantLoading || blocksLoading;

  // Summary stats
  const rawTodayHours = getHoursForDay(today);
  const todayHours = normalizeDayHours(rawTodayHours);
  const todayBlocks = getBlocksForDay(today);
  const isTodayOpen = !!todayHours;

  return (
    <div className="space-y-6">
      {/* Calendar Connection Status - Most Prominent */}
      <CalendarConnectionStatus />

      {/* Quick Status Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Availability</CardTitle>
          </div>
          <CardDescription>
            What your AI knows about your schedule right now
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              {/* Today's Summary */}
              <div className="p-4 rounded-lg bg-muted/50 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today ({format(today, "EEEE, MMM d")})</p>
                    <p className="text-xl font-semibold">
                      {isTodayOpen && todayHours ? (
                        <span className="text-primary">
                          {formatTime(todayHours.open)} – {formatTime(todayHours.close)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Closed</span>
                      )}
                    </p>
                  </div>
                  {isTodayOpen && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {todayBlocks.length > 0 
                          ? `${todayBlocks.length} time${todayBlocks.length > 1 ? "s" : ""} blocked`
                          : "No blocks"}
                      </p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 text-primary"
                        onClick={() => handleOpenBlockDialog(today)}
                      >
                        Block time
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Day Tabs */}
              <Tabs 
                value={selectedDayIndex.toString()} 
                onValueChange={(v) => setSelectedDayIndex(parseInt(v))}
              >
                <TabsList className="w-full grid grid-cols-3">
                  {days.map((day, i) => (
                    <TabsTrigger key={i} value={i.toString()}>
                      {i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(day, "EEE")}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {days.map((day, i) => (
                  <TabsContent key={i} value={i.toString()} className="mt-4">
                    <DayAvailabilityTimeline
                      date={day}
                      businessHours={getHoursForDay(day)}
                      busyBlocks={getBlocksForDay(day)}
                      onBlockTime={() => handleOpenBlockDialog(day)}
                      onRemoveBlock={handleRemoveBlock}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>

      {/* Helpful Info */}
      <div className="p-4 rounded-lg bg-muted/30 border text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">💡 How this works</p>
        <p>
          Your AI uses this schedule to answer "Are you open?" and to only offer appointments 
          during available hours. Connect your calendar above so it can see your real-time 
          meetings and automatically block those times.
        </p>
      </div>

      {/* Quick Block Dialog */}
      <QuickBlockDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        defaultDate={blockDialogDate}
      />
    </div>
  );
}

function formatTime(time: string | undefined): string {
  if (!time) return "--:--";
  const parts = time.split(":");
  if (parts.length < 2) return time;
  const [hours, minutes] = parts;
  const h = parseInt(hours, 10);
  if (isNaN(h)) return time;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}
