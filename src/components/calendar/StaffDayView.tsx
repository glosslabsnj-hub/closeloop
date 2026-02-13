import { format, getHours, getMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarEvent } from "./CalendarEvent";
import type { ScheduleEvent } from "@/hooks/useScheduleData";
import { User } from "lucide-react";

interface StaffDayViewProps {
  date: Date;
  events: ScheduleEvent[];
  startHour?: number;
  endHour?: number;
  onEventClick?: (event: ScheduleEvent) => void;
  onSlotClick?: (date: Date, hour: number) => void;
}

const HOUR_HEIGHT = 64;

const STAFF_COLORS = [
  "border-l-blue-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-purple-500",
  "border-l-rose-500",
  "border-l-cyan-500",
  "border-l-orange-500",
  "border-l-pink-500",
  "border-l-teal-500",
];

const STAFF_BG = [
  "bg-blue-500/8",
  "bg-emerald-500/8",
  "bg-amber-500/8",
  "bg-purple-500/8",
  "bg-rose-500/8",
  "bg-cyan-500/8",
  "bg-orange-500/8",
  "bg-pink-500/8",
  "bg-teal-500/8",
];

export function StaffDayView({
  date,
  events,
  startHour = 7,
  endHour = 20,
  onEventClick,
  onSlotClick,
}: StaffDayViewProps) {
  const totalHours = endHour - startHour;
  const columnHeight = totalHours * HOUR_HEIGHT;

  // Group events by staff member
  const staffGroups = new Map<string, { name: string; events: ScheduleEvent[] }>();
  const unassigned: ScheduleEvent[] = [];

  for (const event of events) {
    const eventDate = event.start;
    if (
      eventDate.getFullYear() !== date.getFullYear() ||
      eventDate.getMonth() !== date.getMonth() ||
      eventDate.getDate() !== date.getDate()
    ) continue;

    if (event.staffMemberId && event.staffName) {
      const key = event.staffMemberId;
      if (!staffGroups.has(key)) {
        staffGroups.set(key, { name: event.staffName, events: [] });
      }
      staffGroups.get(key)!.events.push(event);
    } else {
      unassigned.push(event);
    }
  }

  const staffEntries = Array.from(staffGroups.entries());
  const columns = [
    ...staffEntries.map(([id, group], i) => ({
      id,
      label: group.name,
      events: group.events,
      colorIdx: i % STAFF_COLORS.length,
    })),
    ...(unassigned.length > 0 || staffEntries.length === 0
      ? [{ id: "unassigned", label: "Unassigned", events: unassigned, colorIdx: -1 }]
      : []),
  ];

  const getEventPosition = (event: ScheduleEvent) => {
    const eventStartHour = getHours(event.start) + getMinutes(event.start) / 60;
    const eventEndHour = getHours(event.end) + getMinutes(event.end) / 60;
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

  if (columns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 text-sm text-muted-foreground">
        No team members or events for this day.
      </div>
    );
  }

  return (
    <div className="flex min-w-[600px]">
      {/* Time column */}
      <div className="w-16 flex-shrink-0">
        <div className="h-12 border-b border-border" />
        {Array.from({ length: totalHours + 1 }).map((_, i) => {
          const h = startHour + i;
          return (
            <div key={h} className="h-16 border-b border-border pr-2 text-right">
              <span className="text-xs text-muted-foreground -mt-2 block">
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Staff columns */}
      {columns.map((col) => (
        <div key={col.id} className="flex-1 min-w-[140px]">
          {/* Column header */}
          <div className={cn(
            "h-12 border-b border-l border-border flex items-center justify-center gap-1.5 px-2",
            col.colorIdx >= 0 ? STAFF_BG[col.colorIdx] : "bg-muted/30"
          )}>
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold truncate">{col.label}</span>
            <span className="text-[10px] text-muted-foreground">({col.events.length})</span>
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
            {col.events.map((event) => {
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
      ))}
    </div>
  );
}
