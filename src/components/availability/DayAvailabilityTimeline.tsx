import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO, isSameDay, addDays, isToday, isTomorrow } from "date-fns";
import { Plus, Calendar, XCircle } from "lucide-react";
import type { BusyBlock } from "@/hooks/useCalendarConnections";

interface DayAvailabilityTimelineProps {
  date: Date;
  businessHours: { open: string; close: string; closed?: boolean } | null;
  busyBlocks: BusyBlock[];
  onBlockTime?: () => void;
  onRemoveBlock?: (blockId: string) => void;
}

interface TimeSlot {
  hour: number;
  label: string;
  status: "available" | "busy" | "outside-hours";
  block?: BusyBlock;
  blockLabel?: string;
}

export function DayAvailabilityTimeline({
  date,
  businessHours,
  busyBlocks,
  onBlockTime,
  onRemoveBlock,
}: DayAvailabilityTimelineProps) {
  const dayLabel = isToday(date)
    ? "Today"
    : isTomorrow(date)
    ? "Tomorrow"
    : format(date, "EEEE");

  // Generate time slots for the day
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];

    if (!businessHours || businessHours.closed) {
      // Business is closed - show full day as closed
      return [{ hour: 0, label: "Closed", status: "outside-hours" as const }];
    }

    const [openHour] = businessHours.open.split(":").map(Number);
    const [closeHour] = businessHours.close.split(":").map(Number);

    // Generate hourly slots
    for (let hour = openHour; hour < closeHour; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);

      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      // Check if this hour overlaps with any busy block
      const overlappingBlock = busyBlocks.find((block) => {
        const blockStart = parseISO(block.start_at);
        const blockEnd = parseISO(block.end_at);
        return blockStart < slotEnd && blockEnd > slotStart;
      });

      const formatHour = (h: number) => {
        const ampm = h >= 12 ? "PM" : "AM";
        const hour12 = h % 12 || 12;
        return `${hour12} ${ampm}`;
      };

      if (overlappingBlock) {
        const metadata = overlappingBlock.metadata_json as Record<string, unknown> | null;
        const reason = (metadata?.reason as string) || (metadata?.title as string) || "";
        
        let blockLabel = "";
        switch (overlappingBlock.block_type) {
          case "external_busy":
            blockLabel = reason || "Calendar event";
            break;
          case "confirmed_booking":
            blockLabel = reason || "Appointment";
            break;
          case "manual_busy":
            blockLabel = reason || "Blocked";
            break;
          case "hold":
            blockLabel = "On hold";
            break;
          default:
            blockLabel = reason || "Busy";
        }

        slots.push({
          hour,
          label: formatHour(hour),
          status: "busy",
          block: overlappingBlock,
          blockLabel,
        });
      } else {
        slots.push({
          hour,
          label: formatHour(hour),
          status: "available",
        });
      }
    }

    return slots;
  }, [date, businessHours, busyBlocks]);

  const isClosed = !businessHours || businessHours.closed;
  const availableCount = timeSlots.filter((s) => s.status === "available").length;
  const busyCount = timeSlots.filter((s) => s.status === "busy").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{dayLabel}'s Availability</CardTitle>
            <span className="text-sm text-muted-foreground">
              {format(date, "MMM d")}
            </span>
          </div>
          {!isClosed && onBlockTime && (
            <Button variant="outline" size="sm" onClick={onBlockTime}>
              <Plus className="h-4 w-4 mr-1" />
              Block Time
            </Button>
          )}
        </div>
        {!isClosed && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{availableCount} hours available</span>
            {busyCount > 0 && <span>{busyCount} hours blocked</span>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isClosed ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <XCircle className="h-5 w-5 mr-2" />
            <span>Closed on {dayLabel}</span>
          </div>
        ) : (
          <div className="space-y-1">
            {timeSlots.map((slot) => (
              <div
                key={slot.hour}
                className={cn(
                  "flex items-center gap-3 py-2 px-3 rounded-md transition-colors",
                  slot.status === "available" && "bg-primary/5 hover:bg-primary/10",
                  slot.status === "busy" && "bg-muted"
                )}
              >
                <span className="w-16 text-sm font-medium text-muted-foreground">
                  {slot.label}
                </span>
                <div className="flex-1 flex items-center gap-2">
                  {slot.status === "available" ? (
                    <span className="text-sm text-primary">Available</span>
                  ) : (
                    <>
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          slot.block?.block_type === "external_busy" && "bg-primary",
                          slot.block?.block_type === "confirmed_booking" && "bg-accent",
                          slot.block?.block_type === "manual_busy" && "bg-warning",
                          slot.block?.block_type === "hold" && "bg-muted-foreground"
                        )}
                      />
                      <span className="text-sm">{slot.blockLabel}</span>
                      {slot.block?.block_type === "manual_busy" && onRemoveBlock && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 ml-auto text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => onRemoveBlock(slot.block!.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        {!isClosed && busyCount > 0 && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>Calendar</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span>Booking</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span>Manual block</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
