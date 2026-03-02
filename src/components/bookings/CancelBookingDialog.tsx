import { useState } from "react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BookingWithDetails } from "@/hooks/useBookings";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { toast } from "sonner";

interface CancelBookingDialogProps {
  booking: BookingWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (bookingId: string) => Promise<void>;
}

export function CancelBookingDialog({ booking, open, onOpenChange, onConfirm }: CancelBookingDialogProps) {
  const { terms } = useIndustryContext();
  const bookingLabel = terms.booking.charAt(0).toUpperCase() + terms.booking.slice(1);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    if (!booking) return;

    setIsPending(true);
    try {
      await onConfirm(booking.id);
      toast.success(`${bookingLabel} cancelled`);
      onOpenChange(false);
    } catch (err) {
      console.error("[CancelBookingDialog] cancel failed:", err);
      toast.error(`Failed to cancel ${terms.booking}`);
    } finally {
      setIsPending(false);
    }
  };

  if (!booking) return null;

  const customerName = booking.lead?.full_name || "Unknown";
  const serviceName = booking.service?.name || "Service";
  const dateStr = format(new Date(booking.start_at), "EEE, MMM d 'at' h:mm a");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="z-[60]">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel {bookingLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            Cancel the {terms.booking} for <strong>{customerName}</strong> — {serviceName} on {dateStr}?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep {bookingLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Cancelling..." : `Cancel ${bookingLabel}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
