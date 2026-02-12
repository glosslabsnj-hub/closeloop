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
import { useServices } from "@/hooks/useServices";
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

  const selectedService = services.find((s) => s.id === serviceId);
  const durationMinutes = selectedService?.duration_minutes || 60;

  const startTime = initialDate
    ? setMinutes(setHours(initialDate, initialHour), 0)
    : setMinutes(setHours(new Date(), initialHour), 0);

  const endTime = addHours(startTime, durationMinutes / 60);

  const handleSubmit = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Please enter customer name and phone");
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current tenant
      const { data: tenantUser } = await supabase
        .from("tenant_users")
        .select("tenant_id")
        .single();

      if (!tenantUser) {
        throw new Error("No tenant found");
      }

      // Create or find lead
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("tenant_id", tenantUser.tenant_id)
        .eq("phone", customerPhone)
        .maybeSingle();

      let leadId = existingLead?.id;

      if (!leadId) {
        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            tenant_id: tenantUser.tenant_id,
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
        tenant_id: tenantUser.tenant_id,
        lead_id: leadId,
        service_id: serviceId || null,
        start_at: startTime.toISOString(),
        end_at: endTime.toISOString(),
        status: "confirmed",
        notes: notes || null,
      });

      if (bookingError) throw bookingError;

      toast.success("Booking created successfully");
      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setCustomerName("");
      setCustomerPhone("");
      setServiceId("");
      setNotes("");
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Booking</DialogTitle>
          <DialogDescription>
            Add a new appointment to your schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Date & Time</Label>
            <p className="text-sm text-muted-foreground">
              {format(startTime, "EEEE, MMMM d, yyyy")} at{" "}
              {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
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
              We'll use this to link the booking to the customer's record
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
            {isSubmitting ? "Creating..." : "Create Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
