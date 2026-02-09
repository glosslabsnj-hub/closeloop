import { format } from "date-fns";
import { Clock, MoreVertical, Pencil, Phone, X, MessageSquare, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { BookingWithDetails } from "@/hooks/useBookings";

export const bookingStatusColors: Record<string, string> = {
  pending_deposit: "bg-warning/10 text-warning border-warning/30",
  confirmed: "bg-success/10 text-success border-success/30",
  completed: "bg-muted text-muted-foreground border-border",
  canceled: "bg-destructive/10 text-destructive border-destructive/30",
  no_show: "bg-destructive/10 text-destructive border-destructive/30",
};

export const bookingStatusLabels: Record<string, string> = {
  pending_deposit: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  canceled: "Cancelled",
  no_show: "No Show",
};

interface BookingCardProps {
  booking: BookingWithDetails;
  onEdit?: (booking: BookingWithDetails) => void;
  onCancel?: (booking: BookingWithDetails) => void;
}

function formatPrice(amount: number | null | undefined): string {
  if (!amount) return "";
  return `$${amount.toFixed(0)}`;
}

export function BookingCard({ booking, onEdit, onCancel }: BookingCardProps) {
  const startDate = new Date(booking.start_at);
  const serviceName = booking.service?.name || "Service";
  const customerName = booking.lead?.full_name || "Unknown";
  const phone = booking.lead?.phone;
  const duration = booking.service?.duration_minutes;
  const price = booking.service?.price_amount;

  return (
    <div className="group flex items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-muted/40">
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: date/time + status */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium">
            {format(startDate, "EEE, MMM d")} at {format(startDate, "h:mm a")}
          </span>
          <Badge
            variant="outline"
            className={cn("text-[11px] h-5 shrink-0", bookingStatusColors[booking.status])}
          >
            {bookingStatusLabels[booking.status] || booking.status}
          </Badge>
        </div>

        {/* Middle: service — customer */}
        <p className="text-sm truncate">
          {serviceName} — {customerName}
        </p>

        {/* Bottom: phone • duration • price */}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {phone && <span>{phone}</span>}
          {phone && duration && <span>·</span>}
          {duration && <span>{duration} min</span>}
          {(phone || duration) && price ? <span>·</span> : null}
          {price ? <span>{formatPrice(price)}</span> : null}
        </div>
      </div>

      {/* Actions — visible on hover (desktop), always on mobile */}
      <div className="shrink-0 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-sm"
          title="Reschedule"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.(booking);
          }}
        >
          <CalendarClock className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(booking)}>
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            {phone && (
              <DropdownMenuItem onClick={() => window.open(`tel:${phone}`, "_self")}>
                <Phone className="w-4 h-4 mr-2" /> Call Customer
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <MessageSquare className="w-4 h-4 mr-2" /> Send Message
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onCancel?.(booking)}
              className="text-destructive focus:text-destructive"
            >
              <X className="w-4 h-4 mr-2" /> Cancel Booking
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
