import { format, isSameDay, isToday, getHours, getMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarEvent } from "./CalendarEvent";
import type { ScheduleEvent } from "@/hooks/useScheduleData";

interface DayColumnProps {
  date: Date;
  events: ScheduleEvent[];
  startHour?: number;
  endHour?: number;
  onEventClick?: (event: ScheduleEvent) => void;
  onSlotClick?: (date: Date, hour: number) => void;
}

const HOUR_HEIGHT = 64; // pixels per hour

export function DayColumn({
  date,
  events,
  startHour = 7,
  endHour = 20,
  onEventClick,
  onSlotClick,
}: DayColumnProps) {
  const dayEvents = events.filter((e) => isSameDay(e.start, date));
  const totalHours = endHour - startHour;
  const columnHeight = totalHours * HOUR_HEIGHT;

  const getEventPosition = (event: ScheduleEvent) => {
    const eventStartHour = getHours(event.start) + getMinutes(event.start) / 60;
    const eventEndHour = getHours(event.end) + getMinutes(event.end) / 60;

    // Clamp to visible range
    const visibleStart = Math.max(eventStartHour, startHour);
    const visibleEnd = Math.min(eventEndHour, endHour);

    const top = (visibleStart - startHour) * HOUR_HEIGHT;
    const height = Math.max((visibleEnd - visibleStart) * HOUR_HEIGHT, 20);

    return { top, height };
  };

  const handleSlotClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSlotClick) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / HOUR_HEIGHT) + startHour;
    
    onSlotClick(date, hour);
  };

  return (
    <div className="flex-1 min-w-0">
      {/* Day header */}
      <div
        className={cn(
          "h-12 border-b border-l border-border flex flex-col items-center justify-center",
          isToday(date) && "bg-primary/10"
        )}
      >
        <span className="text-xs text-muted-foreground">
          {format(date, "EEE")}
        </span>
        <span
          className={cn(
            "text-sm font-medium",
            isToday(date) &&
              "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
          )}
        >
          {format(date, "d")}
        </span>
      </div>

      {/* Events container */}
      <div
        className="relative border-l border-border cursor-pointer"
        style={{ height: columnHeight }}
        onClick={handleSlotClick}
      >
        {/* Hour lines */}
        {Array.from({ length: totalHours }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-b border-border/50"
            style={{ top: `${i * HOUR_HEIGHT}px`, height: HOUR_HEIGHT }}
          />
        ))}

        {/* Events */}
        {dayEvents.map((event) => {
          const { top, height } = getEventPosition(event);
          return (
            <CalendarEvent
              key={event.id}
              event={event}
              style={{ top, height }}
              onClick={onEventClick}
            />
          );
        })}
      </div>
    </div>
  );
}
