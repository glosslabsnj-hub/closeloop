/**
 * BookingDetailsSheet — slide-out detail panel for a booking.
 *
 * Shows full booking info, customer details, service, timeline,
 * and action buttons (confirm, reschedule, complete, no-show, cancel, message).
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBookingDateLong, formatBookingTime, formatBookingDatetime } from "@/lib/formatBookingTime";
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
  PhoneCall,
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
  Globe,
  SquareIcon,
  Link2,
  Send,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { bookingStatusColors, bookingStatusLabels } from "./BookingCard";
import type { BookingWithDetails } from "@/hooks/useBookings";

const sourceDisplay: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  website: { label: "Website", icon: Globe, color: "bg-blue-50 text-blue-600 border-blue-200" },
  phone_ai: { label: "AI Phone", icon: PhoneCall, color: "bg-violet-50 text-violet-600 border-violet-200" },
  square_direct: { label: "Manual", icon: User, color: "bg-gray-50 text-gray-600 border-gray-200" },
  square_online: { label: "Square Online", icon: SquareIcon, color: "bg-green-50 text-green-600 border-green-200" },
};
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
  const { terms } = useIndustryContext();
  const { assistantSettings } = useAuth();
  const tenantTz = (assistantSettings?.settings_json as any)?.timezone as string | undefined;
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsPrefill, setSmsPrefill] = useState<string | undefined>();

  const openSmsWithPaymentLink = (paymentUrl: string) => {
    setSmsPrefill(`Hi ${customerName.split(" ")[0]}, your invoice is ready. Pay here: ${paymentUrl}`);
    setSmsOpen(true);
  };

  // Fetch invoice for completed bookings — poll until found (post-service automation is async)
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ["invoice-by-booking", (booking as any)?.id],
    enabled: !!booking && booking.status === "completed",
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, balance_due_cents, total_cents, payment_url")
        .eq("booking_id", (booking as any).id)
        .maybeSingle();
      return data;
    },
    // Poll every 3s while no invoice (post-service automation is async ~2-5s)
    // Stops when sheet closes (component unmounts) or invoice is found
    refetchInterval: (query) => (query.state.data == null ? 3000 : false),
    refetchIntervalInBackground: false,
  });

  if (!booking) return null;
  const serviceName = booking.service?.name || (terms.service.charAt(0).toUpperCase() + terms.service.slice(1));
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
    const capBooking = terms.booking.charAt(0).toUpperCase() + terms.booking.slice(1);
    if (isPending) return { label: `Confirm ${capBooking}`, icon: CheckCircle2, action: () => onConfirm(booking), variant: "default" as const };
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
              <SheetTitle className="text-lg">{terms.booking.charAt(0).toUpperCase() + terms.booking.slice(1)} Details</SheetTitle>
              <div className="flex items-center gap-1.5">
                {(booking as any).booking_source && sourceDisplay[(booking as any).booking_source] && (() => {
                  const src = sourceDisplay[(booking as any).booking_source];
                  const Icon = src.icon;
                  return (
                    <Badge variant="outline" className={cn("text-xs gap-0.5", src.color)}>
                      <Icon className="h-3 w-3" />
                      {src.label}
                    </Badge>
                  );
                })()}
                <Badge
                  variant="outline"
                  className={cn("text-xs", bookingStatusColors[booking.status])}
                >
                  {bookingStatusLabels[booking.status] || booking.status}
                </Badge>
              </div>
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
                {terms.booking.charAt(0).toUpperCase() + terms.booking.slice(1)}
              </div>
              <div className="rounded-lg border p-3 space-y-1">
                <p className="font-medium">
                  {formatBookingDateLong(booking.start_at, tenantTz)}
                </p>
                <p className="text-sm">
                  {formatBookingTime(booking.start_at, tenantTz)}
                  {duration ? (() => {
                    const endAt = new Date(new Date(booking.start_at).getTime() + duration * 60000).toISOString();
                    return ` — ${formatBookingTime(endAt, tenantTz)} (${duration} min)`;
                  })() : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(booking.start_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <Separator />

            {/* Service */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                {terms.service.charAt(0).toUpperCase() + terms.service.slice(1)}
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

            {/* Invoice — shown for completed bookings */}
            {booking.status === "completed" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Invoice
                  </div>
                  {invoiceLoading ? (
                    <div className="rounded-lg border p-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating invoice…
                    </div>
                  ) : invoice ? (
                    <div className="rounded-lg border p-3 space-y-3">
                      {/* Invoice header row */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">#{invoice.invoice_number}</span>
                        <span className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          invoice.status === "paid"
                            ? "bg-green-50 text-green-700"
                            : invoice.status === "overdue"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        )}>
                          {invoice.status === "paid" ? "Paid" :
                           invoice.status === "overdue" ? "Overdue" :
                           `$${((invoice.balance_due_cents || 0) / 100).toFixed(2)} due`}
                        </span>
                      </div>

                      {/* Total */}
                      {invoice.total_cents != null && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          Total: <span className="font-medium text-foreground">${(invoice.total_cents / 100).toFixed(2)}</span>
                        </div>
                      )}

                      {/* Payment link actions */}
                      {invoice.payment_url && invoice.status !== "paid" && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => copyToClipboard(invoice.payment_url!, "Payment link")}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Copy Link
                          </Button>
                          {phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-1.5"
                              onClick={() => openSmsWithPaymentLink(invoice.payment_url!)}
                            >
                              <Send className="h-3.5 w-3.5" />
                              Send via SMS
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Paid confirmation */}
                      {invoice.status === "paid" && (
                        <div className="flex items-center gap-1.5 text-sm text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Payment received
                        </div>
                      )}

                      {/* Overdue warning */}
                      {invoice.status === "overdue" && (
                        <div className="flex items-center gap-1.5 text-sm text-red-700">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Overdue — reminder sent to customer
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                      {price ? "Invoice not generated yet" : "No price set — no invoice created"}
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Customer */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                {terms.customer.charAt(0).toUpperCase() + terms.customer.slice(1)}
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
                  timezone={tenantTz}
                />
                {(booking as any).confirmed_at && (
                  <TimelineItem
                    label="Confirmed"
                    date={(booking as any).confirmed_at}
                    timezone={tenantTz}
                  />
                )}
                {(booking as any).customer_confirmed_at && (
                  <TimelineItem
                    label="Customer confirmed"
                    date={(booking as any).customer_confirmed_at}
                    timezone={tenantTz}
                  />
                )}
                {booking.status === "completed" && (
                  <TimelineItem
                    label="Completed"
                    date={(booking as any).completed_at || (booking as any).updated_at}
                    timezone={tenantTz}
                  />
                )}
                {(booking.status === "canceled" || booking.status === "cancelled") && (
                  <TimelineItem
                    label="Cancelled"
                    date={(booking as any).updated_at}
                    timezone={tenantTz}
                  />
                )}
                {booking.status === "no_show" && (
                  <TimelineItem
                    label="No-show"
                    date={(booking as any).updated_at}
                    timezone={tenantTz}
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
          onOpenChange={(v) => { setSmsOpen(v); if (!v) setSmsPrefill(undefined); }}
          recipientPhone={phone}
          recipientName={customerName}
          customerId={booking.lead?.customer_id ?? undefined}
          defaultMessage={smsPrefill}
        />
      )}
    </>
  );
}

function TimelineItem({ label, date, timezone }: { label: string; date: string | null | undefined; timezone?: string }) {
  if (!date) return null;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span>{formatBookingDatetime(date, timezone)}</span>
    </div>
  );
}
