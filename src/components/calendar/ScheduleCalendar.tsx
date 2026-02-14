import { useState } from "react";
import { startOfWeek, addDays, isSameDay } from "date-fns";
import { CalendarHeader } from "./CalendarHeader";
import { TimeGrid } from "./TimeGrid";
import { DayColumn } from "./DayColumn";
import { StaffDayView } from "./StaffDayView";
import { useScheduleData, type ScheduleEvent } from "@/hooks/useScheduleData";
import { Loader2, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScheduleCalendarProps {
  onEventClick?: (event: ScheduleEvent) => void;
  onSlotClick?: (date: Date, hour: number) => void;
}

export function ScheduleCalendar({ onEventClick, onSlotClick }: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "day">("week");
  const [teamView, setTeamView] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const { events, isLoading } = useScheduleData(weekStart);

  const startHour = 7;
  const endHour = 20;

  const getDaysToShow = () => {
    if (view === "day") return [currentDate];
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const days = getDaysToShow();
  const hasEventsThisWeek = events.length > 0;
  const hasStaffAssignments = events.some((e) => e.staffMemberId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 pb-4">
        <div className="flex-1">
          <CalendarHeader
            currentDate={currentDate}
            view={view}
            onDateChange={setCurrentDate}
            onViewChange={(v) => {
              setView(v);
              if (v === "week") setTeamView(false);
            }}
          />
        </div>
        {/* Team view toggle — only in day view */}
        {view === "day" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={teamView ? "secondary" : "outline"}
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => setTeamView(!teamView)}
              >
                <Users className="h-3.5 w-3.5" />
                Team
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {teamView ? "Switch to timeline view" : "View by team member"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/20 border border-primary/50" />
          <span>Confirmed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-warning/20 border border-warning/50" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted border border-muted-foreground/30" />
          <span>Busy (External)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-accent/20 border border-accent/50 border-dashed" />
          <span>Hold</span>
        </div>
        {hasStaffAssignments && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            <span>Staff assigned</span>
          </div>
        )}
        <div className="ml-auto text-muted-foreground/70">
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">←</kbd>
          {" "}
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">→</kbd>
          {" "}to navigate
        </div>
      </div>

      <div className="flex-1 overflow-auto border rounded-lg bg-background">
        {view === "day" && teamView ? (
          <StaffDayView
            date={currentDate}
            events={events}
            startHour={startHour}
            endHour={endHour}
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
          />
        ) : (
          <div className="flex min-w-[600px]">
            <div className="w-16 flex-shrink-0">
              <TimeGrid startHour={startHour} endHour={endHour} />
            </div>
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
        )}
      </div>

      {!hasEventsThisWeek && (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground border-t mt-4">
          <Calendar className="h-4 w-4 mr-2 opacity-50" />
          <span>No schedule items this week. Click any time slot to create a booking!</span>
        </div>
      )}
    </div>
  );
}
