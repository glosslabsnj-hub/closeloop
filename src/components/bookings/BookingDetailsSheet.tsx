/**
 * BookingDetailsSheet — slide-out detail panel for a booking.
 *
 * Shows full booking info, customer details, service, timeline,
 * and action buttons (confirm, reschedule, complete, no-show, cancel, message).
 */
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  Mail,
  Clock,
  DollarSign,
  FileText,
  Copy,
  CheckCircle2,
  CalendarClock,
  XCircle,
  UserX,
  MessageSquare,
  Calendar,
  User,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { bookingStatusColors, bookingStatusLabels } from "./BookingCard";
import type { BookingWithDetails } from "@/hooks/useBookings";
import { SendSmsDialog } from "@/components/messaging/SendSmsDialog";

interface BookingDetailsSheetProps {
  booking: BookingWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (booking: BookingWithDetails) => void;
  onConfirm: (booking: BookingWithDetails) => void;
  onComplete: (booking: BookingWithDetails) => void;
  onNoShow: (booking: BookingWithDetails) => void;
  onCancel: (booking: BookingWithDetails) => void;
}

export function BookingDetailsSheet({
  booking,
  open,
  onOpenChange,
  onEdit,
  onConfirm,
  onComplete,
  onNoShow,
  onCancel,
}: BookingDetailsSheetProps) {
  const { toast } = useToast();
  const [smsOpen, setSmsOpen] = useState(false);

  if (!booking) return null;

  const startDate = new Date(booking.start_at);
  const serviceName = booking.service?.name || "Service";
  const customerName = booking.lead?.full_name || "Unknown";
  const phone = booking.lead?.phone;
  const email = booking.lead?.email;
  const duration = booking.service?.duration_minutes;
  const price = booking.service?.price_amount;
  const notes = booking.notes;
  const isPending = booking.status === "pending" || booking.status === "pending_deposit";
  const isConfirmed = booking.status === "confirmed";
  const isActive = isPending || isConfirmed;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  // Determine next primary action
  const getNextAction = () => {
    if (isPending) return { label: "Confirm Booking", icon: CheckCircle2, action: () => onConfirm(booking), variant: "default" as const };
    if (isConfirmed) return { label: "Mark Complete", icon: CheckCircle2, action: () => onComplete(booking), variant: "default" as const };
    return null;
  };

  const nextAction = getNextAction();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-3 pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">Booking Details</SheetTitle>
              <Badge
                variant="outline"
                className={cn("text-xs", bookingStatusColors[booking.status])}
              >
                {bookingStatusLabels[booking.status] || booking.status}
              </Badge>
            </div>
          </SheetHeader>

          <div className="space-y-5">
            {/* Primary Action */}
            {nextAction && (
              <Button
                className="w-full gap-2"
                size="lg"
                variant={nextAction.variant}
                onClick={nextAction.action}
              >
                <nextAction.icon className="h-4 w-4" />
                {nextAction.label}
              </Button>
            )}

            {/* Date & Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Appointment
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <p className="font-medium">
                  {format(startDate, "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm">
                  {format(startDate, "h:mm a")}
                  {duration ? ` — ${format(new Date(startDate.getTime() + duration * 60000), "h:mm a")} (${duration} min)` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(startDate, { addSuffix: true })}
                </p>
              </div>
            </div>

            <Separator />

            {/* Service */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                Service
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{serviceName}</p>
                  {price ? (
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">${price.toFixed(0)}</span>
                    </div>
                  ) : null}
                </div>
                {duration && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {duration} minutes
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Customer */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Customer
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="font-medium">{customerName}</p>
                {phone && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Copy phone"
                        onClick={() => copyToClipboard(phone, "Phone")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Call"
                        onClick={() => window.open(`tel:${phone}`, "_self")}
                      >
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Send message"
                        onClick={() => setSmsOpen(true)}
                      >
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{email}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Copy email"
                      onClick={() => copyToClipboard(email, "Email")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Notes
                  </div>
                  <p className="text-sm rounded-lg border p-3 whitespace-pre-wrap">{notes}</p>
                </div>
              </>
            )}

            {/* Timeline */}
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Timeline
              </div>
              <div className="space-y-1.5 text-sm">
                <TimelineItem
                  label="Created"
                  date={booking.created_at}
                />
                {(booking as any).confirmed_at && (
                  <TimelineItem
                    label="Confirmed"
                    date={(booking as any).confirmed_at}
                  />
                )}
                {(booking as any).customer_confirmed_at && (
                  <TimelineItem
                    label="Customer confirmed"
                    date={(booking as any).customer_confirmed_at}
                  />
                )}
                {booking.status === "completed" && (
                  <TimelineItem
                    label="Completed"
                    date={(booking as any).completed_at || booking.updated_at}
                  />
                )}
                {booking.status === "canceled" && (
                  <TimelineItem
                    label="Cancelled"
                    date={booking.updated_at}
                  />
                )}
                {booking.status === "no_show" && (
                  <TimelineItem
                    label="No-show"
                    date={booking.updated_at}
                  />
                )}
              </div>
            </div>

            {/* Secondary Actions */}
            {isActive && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => onEdit(booking)}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      Reschedule
                    </Button>
                    {isConfirmed && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => onNoShow(booking)}
                      >
                        <UserX className="h-3.5 w-3.5" />
                        No-Show
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => onCancel(booking)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {phone && (
        <SendSmsDialog
          open={smsOpen}
          onOpenChange={setSmsOpen}
          recipientPhone={phone}
          recipientName={customerName}
          customerId={booking.lead?.customer_id ?? undefined}
        />
      )}
    </>
  );
}

function TimelineItem({ label, date }: { label: string; date: string | null | undefined }) {
  if (!date) return null;
  const d = new Date(date);
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span>{format(d, "MMM d, h:mm a")}</span>
    </div>
  );
}
