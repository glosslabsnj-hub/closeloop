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
import { useBookings, type BookingWithDetails } from "@/hooks/useBookings";
import { toast } from "sonner";

interface CancelBookingDialogProps {
  booking: BookingWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelBookingDialog({ booking, open, onOpenChange }: CancelBookingDialogProps) {
  const { updateBooking } = useBookings();

  const handleConfirm = async () => {
    if (!booking) return;

    try {
      await updateBooking.mutateAsync({
        id: booking.id,
        status: "canceled",
      });
      toast.success("Booking cancelled");
      onOpenChange(false);
    } catch {
      toast.error("Failed to cancel booking");
    }
  };

  if (!booking) return null;

  const customerName = booking.lead?.full_name || "Unknown";
  const serviceName = booking.service?.name || "Service";
  const dateStr = format(new Date(booking.start_at), "EEE, MMM d 'at' h:mm a");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
          <AlertDialogDescription>
            Cancel the booking for <strong>{customerName}</strong> — {serviceName} on {dateStr}?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Booking</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {updateBooking.isPending ? "Cancelling..." : "Cancel Booking"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
