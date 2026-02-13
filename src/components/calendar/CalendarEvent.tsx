import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { MapPin, User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ScheduleEvent } from "@/hooks/useScheduleData";

interface CalendarEventProps {
  event: ScheduleEvent;
  style: React.CSSProperties;
  onClick?: (event: ScheduleEvent) => void;
}

export function CalendarEvent({ event, style, onClick }: CalendarEventProps) {
  const getEventStyles = () => {
    switch (event.type) {
      case "booking":
        if (event.status === "pending_deposit") {
          return "bg-warning/20 border-warning/50 text-warning";
        }
        if (event.status === "confirmed") {
          return "bg-primary/20 border-primary/50 text-primary-foreground dark:text-primary";
        }
        return "bg-primary/20 border-primary/50 text-primary-foreground dark:text-primary";
      
      case "hold":
        return "bg-accent/20 border-accent/50 border-dashed text-accent-foreground";
      
      case "busy_block":
      default:
        return "bg-muted border-muted-foreground/30 text-muted-foreground";
    }
  };

  const isClickable = event.type === "booking";
  const hasDetails = event.location || event.description;

  const eventContent = (
    <div
      className={cn(
        "absolute left-1 right-1 rounded-md border px-2 py-1 overflow-hidden text-xs",
        getEventStyles(),
        isClickable && "cursor-pointer hover:opacity-80 transition-opacity",
        event.isExternal && "bg-stripes"
      )}
      style={style}
      onClick={() => isClickable && onClick?.(event)}
    >
      <div className="font-medium truncate">{event.title}</div>
      {event.customerName && event.type === "booking" && (
        <div className="truncate opacity-80">{event.customerName}</div>
      )}
      {event.staffName && event.type === "booking" && (
        <div className="truncate opacity-70 flex items-center gap-1 text-[10px]">
          <User className="h-2.5 w-2.5 flex-shrink-0" />
          <span className="truncate">{event.staffName}</span>
        </div>
      )}
      {event.location && event.type === "busy_block" && (
        <div className="truncate opacity-70 flex items-center gap-1">
          <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
      )}
    </div>
  );

  // Show tooltip with full details for external events
  if (hasDetails && event.type === "busy_block") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {eventContent}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
            </p>
            {event.location && (
              <p className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </p>
            )}
            {event.description && (
              <p className="text-xs text-muted-foreground line-clamp-3">
                {event.description}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return eventContent;
}
