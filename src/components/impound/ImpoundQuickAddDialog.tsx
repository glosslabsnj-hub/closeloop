/**
 * ImpoundQuickAddDialog - Tablet-friendly quick add form for drivers
 * 
 * Features:
 * - Enter plate number or VIN
 * - Scan VIN via camera with OCR
 * - Auto-decode VIN to get year/make/model
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Car, MapPin, FileText, Search } from "lucide-react";
import { VinScanner } from "./VinScanner";
import { useVinDecoder } from "@/hooks/useVinDecoder";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const TOW_REASONS = [
  { value: "police_request", label: "Police Request" },
  { value: "private_property", label: "Private Property" },
  { value: "abandoned", label: "Abandoned Vehicle" },
  { value: "accident", label: "Accident Recovery" },
  { value: "repossession", label: "Repossession" },
  { value: "owner_request", label: "Owner Request" },
  { value: "other", label: "Other" },
];

interface ImpoundQuickAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLotId?: string;
  onSuccess: () => void;
}

export function ImpoundQuickAddDialog({
  open,
  onOpenChange,
  defaultLotId,
  onSuccess,
}: ImpoundQuickAddDialogProps) {
  const { tenant } = useAuth();
  const { decodeVin, isDecoding } = useVinDecoder();
  
  const [formData, setFormData] = useState({
    license_plate: "",
    license_plate_state: "",
    vin: "",
    vehicle_year: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_color: "",
    towed_from_address: "",
    tow_reason: "",
    notes: "",
  });

  // Auto-decode VIN when it reaches 17 characters
  useEffect(() => {
    const vin = formData.vin.replace(/\s/g, "");
    if (vin.length === 17) {
      handleVinDecode(vin);
    }
  }, [formData.vin]);

  const handleVinDecode = async (vin: string) => {
    const info = await decodeVin(vin);
    if (info) {
      setFormData(prev => ({
        ...prev,
        vehicle_year: info.year || prev.vehicle_year,
        vehicle_make: info.make || prev.vehicle_make,
        vehicle_model: info.model || prev.vehicle_model,
      }));
    }
  };

  const handleVinFromScanner = (vin: string) => {
    setFormData(prev => ({ ...prev, vin }));
    // The useEffect will trigger decode automatically
  };

  const handleManualDecode = () => {
    const vin = formData.vin.replace(/\s/g, "");
    if (vin.length === 17) {
      handleVinDecode(vin);
    } else {
      toast.error("Enter a valid 17-character VIN first");
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      if (!formData.license_plate && !formData.vin) {
        throw new Error("Please enter a license plate or VIN");
      }

      const { error } = await supabase.from("impound_vehicles").insert({
        tenant_id: tenant.id,
        lot_id: defaultLotId || null,
        license_plate: formData.license_plate.toUpperCase().replace(/\s/g, "") || null,
        license_plate_state: formData.license_plate_state || null,
        vin: formData.vin.toUpperCase() || null,
        vehicle_year: formData.vehicle_year || null,
        vehicle_make: formData.vehicle_make || null,
        vehicle_model: formData.vehicle_model || null,
        vehicle_color: formData.vehicle_color || null,
        towed_from_address: formData.towed_from_address || null,
        tow_reason: formData.tow_reason || null,
        notes: formData.notes || null,
        towed_at: new Date().toISOString(),
        status: "in_lot",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle added to impound lot");
      setFormData({
        license_plate: "",
        license_plate_state: "",
        vin: "",
        vehicle_year: "",
        vehicle_make: "",
        vehicle_model: "",
        vehicle_color: "",
        towed_from_address: "",
        tow_reason: "",
        notes: "",
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Add Vehicle to Impound
          </DialogTitle>
          <DialogDescription>
            Enter vehicle details to log it in the impound lot
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* License Plate - Large and prominent for tablet use */}
          <div className="space-y-2">
            <Label htmlFor="plate">License Plate *</Label>
            <div className="flex gap-2">
              <Input
                id="plate"
                placeholder="ABC1234"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                className="font-mono text-lg uppercase flex-1"
                autoFocus
              />
              <Select
                value={formData.license_plate_state}
                onValueChange={(v) => setFormData({ ...formData, license_plate_state: v })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* VIN with scanner and decode */}
          <div className="space-y-2">
            <Label htmlFor="vin">VIN (auto-decodes vehicle info)</Label>
            <div className="flex gap-2">
              <Input
                id="vin"
                placeholder="17-character VIN"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                className="font-mono uppercase flex-1"
                maxLength={17}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleManualDecode}
                disabled={isDecoding || formData.vin.length !== 17}
                title="Decode VIN"
              >
                {isDecoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <VinScanner onVinDetected={handleVinFromScanner} disabled={isDecoding} />
          </div>

          {/* Vehicle Details Row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                placeholder="2020"
                value={formData.vehicle_year}
                onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                maxLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                placeholder="Honda"
                value={formData.vehicle_make}
                onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="Civic"
                value={formData.vehicle_model}
                onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                placeholder="Blue"
                value={formData.vehicle_color}
                onChange={(e) => setFormData({ ...formData, vehicle_color: e.target.value })}
              />
            </div>
          </div>

          {/* Towed From */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Towed From
            </Label>
            <Input
              id="address"
              placeholder="123 Main St, City, State"
              value={formData.towed_from_address}
              onChange={(e) => setFormData({ ...formData, towed_from_address: e.target.value })}
            />
          </div>

          {/* Tow Reason */}
          <div className="space-y-2">
            <Label>Tow Reason</Label>
            <Select
              value={formData.tow_reason}
              onValueChange={(v) => setFormData({ ...formData, tow_reason: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {TOW_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this vehicle..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} size="lg">
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add to Lot
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
