/**
 * Quick Dispatch Dialog
 * 
 * Fast job creation for an existing customer
 * Pre-fills customer info and saved locations
 */

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
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedLocation {
  label: string;
  address: string;
}

interface QuickDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    full_name: string;
    phone_e164: string;
    saved_locations?: SavedLocation[];
  } | null;
  onSubmit: (data: {
    pickup_address: string;
    dropoff_address?: string;
    job_type: string;
    urgency: string;
    notes?: string;
  }) => void;
}

const JOB_TYPES = [
  { value: "tow", label: "Tow" },
  { value: "jumpstart", label: "Jump Start" },
  { value: "lockout", label: "Lockout" },
  { value: "tire_change", label: "Tire Change" },
  { value: "fuel_delivery", label: "Fuel Delivery" },
  { value: "winch", label: "Winch Out" },
];

const URGENCY_OPTIONS = [
  { value: "standard", label: "Standard", time: "45-60 min" },
  { value: "priority", label: "Priority", time: "30-45 min" },
  { value: "emergency", label: "Emergency", time: "15-30 min" },
];

export function DispatchQuickDispatchDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: QuickDispatchDialogProps) {
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [jobType, setJobType] = useState("tow");
  const [urgency, setUrgency] = useState("standard");
  const [notes, setNotes] = useState("");

  const handleSavedLocationClick = (address: string, isPickup: boolean) => {
    if (isPickup) {
      setPickupAddress(address);
    } else {
      setDropoffAddress(address);
    }
  };

  const handleSubmit = () => {
    onSubmit({
      pickup_address: pickupAddress,
      dropoff_address: dropoffAddress || undefined,
      job_type: jobType,
      urgency,
      notes: notes || undefined,
    });
    // Reset form
    setPickupAddress("");
    setDropoffAddress("");
    setJobType("tow");
    setUrgency("standard");
    setNotes("");
  };

  if (!customer) return null;

  const savedLocations = customer.saved_locations || [];
  const showDropoff = ["tow", "winch"].includes(jobType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Quick Dispatch
          </DialogTitle>
          <DialogDescription>
            Create a new job for {customer.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Saved Locations */}
          {savedLocations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Saved Locations
              </Label>
              <div className="flex flex-wrap gap-2">
                {savedLocations.map((loc, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted gap-1"
                    onClick={() => handleSavedLocationClick(loc.address, true)}
                  >
                    <MapPin className="h-3 w-3" />
                    {loc.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Pickup Address */}
          <div className="space-y-2">
            <Label htmlFor="pickup">Pickup Address *</Label>
            <Input
              id="pickup"
              placeholder="Enter pickup address..."
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
            />
          </div>

          {/* Job Type */}
          <div className="space-y-2">
            <Label>Job Type</Label>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dropoff Address (for tows) */}
          {showDropoff && (
            <div className="space-y-2">
              <Label htmlFor="dropoff">Dropoff Address</Label>
              <Input
                id="dropoff"
                placeholder="Enter dropoff address..."
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
              />
            </div>
          )}

          {/* Urgency */}
          <div className="space-y-2">
            <Label>Urgency</Label>
            <div className="grid grid-cols-3 gap-2">
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUrgency(opt.value)}
                  className={cn(
                    "p-3 rounded-lg border text-center transition-colors",
                    urgency === opt.value
                      ? opt.value === "emergency"
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : opt.value === "priority"
                        ? "border-warning bg-warning/10 text-warning"
                        : "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {opt.value === "emergency" && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    <span className="text-sm font-medium">{opt.label}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {opt.time}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Vehicle details, special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!pickupAddress}>
            <Truck className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
