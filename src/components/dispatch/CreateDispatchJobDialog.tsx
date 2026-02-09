import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CreateDispatchJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateJobNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DSP-${dateStr}-${random}`;
}

export function CreateDispatchJobDialog({
  open,
  onOpenChange,
}: CreateDispatchJobDialogProps) {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [jobType, setJobType] = useState("Tow");
  const [priority, setPriority] = useState<string>("normal");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setPickupAddress("");
    setDropoffAddress("");
    setJobType("Tow");
    setPriority("normal");
    setVehicleInfo("");
    setNotes("");
  };

  const createJobMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");

      // Resolve or create customer
      let customerId: string | null = null;
      if (customerPhone) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("phone_e164", customerPhone)
          .maybeSingle();

        if (existing) {
          customerId = existing.id;
        } else {
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({
              tenant_id: tenant.id,
              full_name: customerName || "Unknown",
              phone_e164: customerPhone,
              phone_raw: customerPhone,
              source: "manual",
            })
            .select("id")
            .single();
          customerId = newCustomer?.id || null;
        }
      }

      const jobNumber = generateJobNumber();

      const descriptionParts: string[] = [];
      if (jobType) descriptionParts.push(`Service: ${jobType}`);
      if (vehicleInfo) descriptionParts.push(`Vehicle: ${vehicleInfo}`);

      const { data, error } = await supabase
        .from("dispatch_jobs")
        .insert({
          tenant_id: tenant.id,
          job_number: jobNumber,
          customer_id: customerId,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress || null,
          job_type: jobType || "Tow",
          priority,
          status: "pending",
          description: descriptionParts.join(". ") || null,
          notes: notes || null,
          requested_at: new Date().toISOString(),
        })
        .select("id, job_number")
        .single();

      if (error) throw error;

      // Trigger handoff
      try {
        await supabase.functions.invoke("dispatch-handoff", {
          body: { dispatch_id: data.id, tenant_id: tenant.id },
        });
      } catch {
        // Don't fail if handoff fails
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dispatch-jobs", tenant?.id] });
      toast.success(`Job ${data.job_number} created`, {
        description: `${customerName || "Customer"} — ${pickupAddress.slice(0, 40)}`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to create job", { description: error.message });
    },
  });

  const canSubmit = pickupAddress.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Dispatch Job</DialogTitle>
          <DialogDescription>
            Manually create a dispatch job for a customer call or walk-in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                placeholder="John Smith"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                placeholder="+1 555-123-4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-2">
            <Label htmlFor="pickup-address">
              Pickup Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pickup-address"
              placeholder="123 Main St, Springfield, NJ"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dropoff-address">Dropoff Address</Label>
            <Input
              id="dropoff-address"
              placeholder="456 Oak Ave, Springfield, NJ (optional)"
              value={dropoffAddress}
              onChange={(e) => setDropoffAddress(e.target.value)}
            />
          </div>

          {/* Job Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="job-type">Job Type</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger id="job-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tow">Tow</SelectItem>
                  <SelectItem value="Roadside">Roadside Assist</SelectItem>
                  <SelectItem value="Lockout">Lockout</SelectItem>
                  <SelectItem value="Jump Start">Jump Start</SelectItem>
                  <SelectItem value="Tire Change">Tire Change</SelectItem>
                  <SelectItem value="Fuel Delivery">Fuel Delivery</SelectItem>
                  <SelectItem value="Winchout">Winchout</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Courier">Courier/Delivery</SelectItem>
                  <SelectItem value="Field Service">Field Service</SelectItem>
                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                  <SelectItem value="Pest Control">Pest Control</SelectItem>
                  <SelectItem value="Locksmith">Locksmith</SelectItem>
                  <SelectItem value="Landscaping">Landscaping</SelectItem>
                  <SelectItem value="Junk Removal">Junk Removal</SelectItem>
                  <SelectItem value="Mobile Detailing">Mobile Detailing</SelectItem>
                  <SelectItem value="Mobile Mechanic">Mobile Mechanic</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low / Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="space-y-2">
            <Label htmlFor="vehicle-info">Vehicle / Item Info</Label>
            <Input
              id="vehicle-info"
              placeholder="2019 Honda Civic, Silver (optional)"
              value={vehicleInfo}
              onChange={(e) => setVehicleInfo(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createJobMutation.mutate()}
            disabled={!canSubmit || createJobMutation.isPending}
          >
            {createJobMutation.isPending ? "Creating..." : "Create Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
