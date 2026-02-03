import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";

interface CalendarHeaderProps {
  currentDate: Date;
  view: "week" | "day";
  onDateChange: (date: Date) => void;
  onViewChange: (view: "week" | "day") => void;
}

export function CalendarHeader({
  currentDate,
  view,
  onDateChange,
  onViewChange,
}: CalendarHeaderProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);

  const handlePrev = () => {
    if (view === "week") {
      onDateChange(subWeeks(currentDate, 1));
    } else {
      onDateChange(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (view === "week") {
      onDateChange(addWeeks(currentDate, 1));
    } else {
      onDateChange(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getDateRangeLabel = () => {
    if (view === "day") {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
    
    const startMonth = format(weekStart, "MMM");
    const endMonth = format(weekEnd, "MMM");
    const startDay = format(weekStart, "d");
    const endDay = format(weekEnd, "d");
    const year = format(weekEnd, "yyyy");

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  };

  return (
    <div className="flex items-center justify-between pb-4">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous {view}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Next {view}</TooltipContent>
        </Tooltip>
        <Button variant="outline" size="sm" onClick={handleToday}>
          Today
        </Button>
        <h2 className="text-lg font-semibold ml-4">{getDateRangeLabel()}</h2>
      </div>

      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={view === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewChange("week")}
            >
              Week
            </Button>
          </TooltipTrigger>
          <TooltipContent>See all 7 days at once</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={view === "day" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewChange("day")}
            >
              Day
            </Button>
          </TooltipTrigger>
          <TooltipContent>Focus on a single day with more detail</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
