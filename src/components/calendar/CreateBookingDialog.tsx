import { useState, useEffect } from "react";
import { format, setHours, setMinutes, addHours } from "date-fns";
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
import { useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/hooks/useServices";
import { useAuth } from "@/contexts/AuthContext";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  initialHour?: number;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  onSuccess?: () => void;
}

export function CreateBookingDialog({
  open,
  onOpenChange,
  initialDate,
  initialHour = 9,
  initialCustomerName = "",
  initialCustomerPhone = "",
  onSuccess,
}: CreateBookingDialogProps) {
  const { services } = useServices();
  const { effectiveTenantId } = useAuth();
  const { terms } = useIndustryContext();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [serviceId, setServiceId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setCustomerName(initialCustomerName);
      setCustomerPhone(initialCustomerPhone);
    }
  }, [open, initialCustomerName, initialCustomerPhone]);

  const defaultDate = initialDate
    ? format(initialDate, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");
  const defaultTime = `${String(initialHour).padStart(2, "0")}:00`;

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);

  useEffect(() => {
    if (open) {
      setDate(defaultDate);
      setTime(defaultTime);
    }
  }, [open, defaultDate, defaultTime]);

  const selectedService = services.find((s) => s.id === serviceId);
  const durationMinutes = selectedService?.duration_minutes || 60;

  // Parse user-selected date and time into Date objects
  const [year, month, day] = date.split("-").map(Number);
  const [hours, mins] = time.split(":").map(Number);
  const startTime = new Date(year, month - 1, day, hours, mins, 0);
  const endTime = addHours(startTime, durationMinutes / 60);

  const handleSubmit = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error(`Please enter ${terms.customer.toLowerCase()} name and phone`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (!effectiveTenantId) {
        throw new Error("No tenant found");
      }

      // Create or find lead
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("tenant_id", effectiveTenantId)
        .eq("phone", customerPhone)
        .maybeSingle();

      let leadId = existingLead?.id;

      if (!leadId) {
        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            tenant_id: effectiveTenantId,
            full_name: customerName,
            phone: customerPhone,
            source: "manual",
          })
          .select("id")
          .single();

        if (leadError) throw leadError;
        leadId = newLead.id;
      }

      // Create booking
      const { error: bookingError } = await supabase.from("bookings").insert({
        tenant_id: effectiveTenantId,
        lead_id: leadId,
        service_id: serviceId || null,
        start_at: startTime.toISOString(),
        end_at: endTime.toISOString(),
        status: "confirmed",
        notes: notes || null,
      });

      if (bookingError) throw bookingError;

      // Invalidate both list and calendar queries so UI updates immediately
      queryClient.invalidateQueries({ queryKey: ["bookings", effectiveTenantId] });
      queryClient.invalidateQueries({ queryKey: ["schedule-bookings"] });

      toast.success(`${terms.booking.charAt(0).toUpperCase() + terms.booking.slice(1)} created successfully`);
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setCustomerName("");
      setCustomerPhone("");
      setServiceId("");
      setNotes("");
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(`Failed to create ${terms.booking}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create {terms.booking.charAt(0).toUpperCase() + terms.booking.slice(1)}</DialogTitle>
          <DialogDescription>
            Add a new {terms.booking} to your schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="booking-date">Date</Label>
              <Input
                id="booking-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-time">Time</Label>
              <Input
                id="booking-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {format(startTime, "EEEE, MMMM d")} — {format(startTime, "h:mm a")} to {format(endTime, "h:mm a")}
          </p>

          <div className="space-y-2">
            <Label htmlFor="customerName">{terms.customer.charAt(0).toUpperCase() + terms.customer.slice(1)} Name</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number</Label>
            <Input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
            <p className="text-xs text-muted-foreground">
              We'll use this to link the {terms.booking} to the {terms.customer.toLowerCase()}'s record
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service">Service (Optional)</Label>
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
            <p className="text-xs text-muted-foreground">
              Leave blank if unsure — you can update this later
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
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
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : `Create ${terms.booking.charAt(0).toUpperCase() + terms.booking.slice(1)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
