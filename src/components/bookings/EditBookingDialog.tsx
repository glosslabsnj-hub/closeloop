import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBookings, type BookingWithDetails } from "@/hooks/useBookings";
import { useServices } from "@/hooks/useServices";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { toast } from "sonner";

interface EditBookingDialogProps {
  booking: BookingWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBookingDialog({ booking, open, onOpenChange }: EditBookingDialogProps) {
  const { updateBooking } = useBookings();
  const { services } = useServices();
  const { terms } = useIndustryContext();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (booking && open) {
      const start = new Date(booking.start_at);
      setDate(format(start, "yyyy-MM-dd"));
      setTime(format(start, "HH:mm"));
      setServiceId(booking.service_id || "");
      setNotes(booking.notes || "");
    }
  }, [booking, open]);

  const handleSave = async () => {
    if (!booking || !date || !time) return;

    const startAt = new Date(`${date}T${time}:00`);
    const selectedService = services.find((s) => s.id === serviceId);
    const durationMinutes = selectedService?.duration_minutes || 60;
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    try {
      await updateBooking.mutateAsync({
        id: booking.id,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        service_id: serviceId || null,
        notes: notes || null,
      });
      toast.success(`${terms.booking.charAt(0).toUpperCase() + terms.booking.slice(1)} updated`);
      onOpenChange(false);
    } catch {
      toast.error(`Failed to update ${terms.booking}`);
    }
  };

  if (!booking) return null;

  const customerName = booking.lead?.full_name || "Unknown";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {terms.booking.charAt(0).toUpperCase() + terms.booking.slice(1)}</DialogTitle>
          <DialogDescription>
            Update the {terms.booking} for {customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time">Time</Label>
              <Input
                id="edit-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-service">Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} ({service.duration_minutes} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateBooking.isPending || !date || !time}
          >
            {updateBooking.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
