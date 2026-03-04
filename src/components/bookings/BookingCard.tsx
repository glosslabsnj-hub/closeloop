import { useState } from "react";
import { MoreVertical, Pencil, Phone, X, MessageSquare, CalendarClock, CheckCircle2, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatBookingDate, formatBookingTime, formatBookingDatetime } from "@/lib/formatBookingTime";
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
import { SendSmsDialog } from "@/components/messaging/SendSmsDialog";
import { useIndustryContext } from "@/hooks/useIndustryContext";

export const bookingStatusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  pending_deposit: "bg-warning/10 text-warning border-warning/30",
  confirmed: "bg-success/10 text-success border-success/30",
  completed: "bg-muted text-muted-foreground border-border",
  canceled: "bg-destructive/10 text-destructive border-destructive/30",
  no_show: "bg-destructive/10 text-destructive border-destructive/30",
};

export const bookingStatusLabels: Record<string, string> = {
  pending: "Awaiting Approval",
  pending_deposit: "Pending Deposit",
  confirmed: "Confirmed",
  completed: "Completed",
  canceled: "Cancelled",
  no_show: "No Show",
};

interface BookingCardProps {
  booking: BookingWithDetails;
  onEdit?: (booking: BookingWithDetails) => void;
  onCancel?: (booking: BookingWithDetails) => void;
  onApprove?: (booking: BookingWithDetails) => void;
  onComplete?: (booking: BookingWithDetails) => void;
}

function formatPrice(amount: number | null | undefined): string {
  if (!amount) return "";
  return `$${amount.toFixed(0)}`;
}

export function BookingCard({ booking, onEdit, onCancel, onApprove, onComplete }: BookingCardProps) {
  const [smsOpen, setSmsOpen] = useState(false);
  const { terms } = useIndustryContext();
  const { assistantSettings } = useAuth();
  const tenantTz = (assistantSettings?.settings_json as any)?.timezone as string | undefined;
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
            {formatBookingDate(booking.start_at, tenantTz)} at {formatBookingTime(booking.start_at, tenantTz)}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {(booking as any).customer_confirmed_at && (
              <Badge
                variant="outline"
                className="text-[11px] h-5 bg-emerald-50 text-emerald-600 border-emerald-200 gap-0.5"
                title={`Customer confirmed ${formatBookingDatetime((booking as any).customer_confirmed_at, tenantTz)}`}
              >
                <UserCheck className="h-3 w-3" />
                Confirmed
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn("text-[11px] h-5", bookingStatusColors[booking.status])}
            >
              {bookingStatusLabels[booking.status] || booking.status}
            </Badge>
          </div>
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
        {booking.status === "pending" && onApprove && (
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs font-semibold gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onApprove(booking);
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </Button>
        )}
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
            {phone && (
              <DropdownMenuItem onClick={() => setSmsOpen(true)}>
                <MessageSquare className="w-4 h-4 mr-2" /> Send Message
              </DropdownMenuItem>
            )}
            {booking.status === "confirmed" && onComplete && (
              <DropdownMenuItem onClick={() => onComplete(booking)}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Complete
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onCancel?.(booking)}
              className="text-destructive focus:text-destructive"
            >
              <X className="w-4 h-4 mr-2" /> Cancel {terms.booking.charAt(0).toUpperCase() + terms.booking.slice(1)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {phone && (
        <SendSmsDialog
          open={smsOpen}
          onOpenChange={setSmsOpen}
          recipientPhone={phone}
          recipientName={customerName}
          customerId={booking.lead?.customer_id ?? undefined}
        />
      )}
    </div>
  );
}
