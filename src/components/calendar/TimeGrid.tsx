import { cn } from "@/lib/utils";

interface TimeGridProps {
  startHour?: number;
  endHour?: number;
}

export function TimeGrid({ startHour = 7, endHour = 20 }: TimeGridProps) {
  const hours = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }

  return (
    <div className="flex flex-col">
      {/* Header spacer */}
      <div className="h-12 border-b border-border" />
      
      {/* Time labels */}
      {hours.map((hour) => (
        <div
          key={hour}
          className="h-16 border-b border-border pr-2 text-right"
        >
          <span className="text-xs text-muted-foreground -mt-2 block">
            {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TimeGridLines({ startHour = 7, endHour = 20 }: TimeGridProps) {
  const hours = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {hours.map((hour, index) => (
        <div
          key={hour}
          className={cn(
            "absolute left-0 right-0 border-t border-border/50",
            index === 0 && "border-t-0"
          )}
          style={{ top: `${index * 64}px` }}
        />
      ))}
    </div>
  );
}
