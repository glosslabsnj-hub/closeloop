import { cn } from "@/lib/utils";
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
          return "bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300";
        }
        if (event.status === "confirmed") {
          return "bg-primary/20 border-primary/50 text-primary-foreground dark:text-primary";
        }
        return "bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-300";
      
      case "hold":
        return "bg-sky-500/20 border-sky-500/50 border-dashed text-sky-700 dark:text-sky-300";
      
      case "busy_block":
      default:
        return "bg-muted border-muted-foreground/30 text-muted-foreground";
    }
  };

  const isClickable = event.type === "booking";

  return (
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
    </div>
  );
}
