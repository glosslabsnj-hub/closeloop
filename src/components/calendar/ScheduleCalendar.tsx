import { useState } from "react";
import { startOfWeek, addDays } from "date-fns";
import { CalendarHeader } from "./CalendarHeader";
import { TimeGrid } from "./TimeGrid";
import { DayColumn } from "./DayColumn";
import { useScheduleData, type ScheduleEvent } from "@/hooks/useScheduleData";
import { Loader2 } from "lucide-react";

interface ScheduleCalendarProps {
  onEventClick?: (event: ScheduleEvent) => void;
  onSlotClick?: (date: Date, hour: number) => void;
}

export function ScheduleCalendar({ onEventClick, onSlotClick }: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "day">("week");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const { events, isLoading } = useScheduleData(weekStart);

  const startHour = 7;
  const endHour = 20;

  const getDaysToShow = () => {
    if (view === "day") {
      return [currentDate];
    }
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const days = getDaysToShow();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onDateChange={setCurrentDate}
        onViewChange={setView}
      />

      <div className="flex-1 overflow-auto border rounded-lg bg-background">
        <div className="flex min-w-[600px]">
          {/* Time column */}
          <div className="w-16 flex-shrink-0">
            <TimeGrid startHour={startHour} endHour={endHour} />
          </div>

          {/* Day columns */}
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              date={day}
              events={events}
              startHour={startHour}
              endHour={endHour}
              onEventClick={onEventClick}
              onSlotClick={onSlotClick}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-primary/20 border border-primary/50" />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-warning/20 border border-warning/50" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted border border-muted-foreground/30" />
          <span>Busy (External)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-accent/20 border border-accent/50 border-dashed" />
          <span>Hold</span>
        </div>
      </div>
    </div>
  );
}
