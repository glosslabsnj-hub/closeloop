/**
 * ImpoundVehicleDetailDialog - Full vehicle details and release processing
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Car,
  MapPin,
  Calendar,
  DollarSign,
  Loader2,
  CheckCircle2,
  User,
  CreditCard,
} from "lucide-react";

type ImpoundVehicle = {
  id: string;
  tenant_id: string;
  lot_id: string | null;
  license_plate: string | null;
  license_plate_state: string | null;
  vin: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  towed_from_address: string | null;
  towed_at: string;
  tow_reason: string | null;
  status: string | null;
  base_tow_fee_cents: number | null;
  storage_fee_daily_cents: number | null;
  days_stored: number | null;
  total_fees_cents: number | null;
  admin_fee_cents: number | null;
  gate_fee_cents: number | null;
  released_at: string | null;
  released_to_name: string | null;
  released_to_phone: string | null;
  release_notes: string | null;
  payment_method: string | null;
  notes: string | null;
  impound_lots?: { name: string } | null;
};

interface ImpoundVehicleDetailDialogProps {
  vehicle: ImpoundVehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Credit/Debit Card" },
  { value: "check", label: "Check" },
  { value: "money_order", label: "Money Order" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  in_lot: { label: "In Lot", variant: "default" },
  pending_release: { label: "Pending Release", variant: "secondary" },
  released: { label: "Released", variant: "outline" },
};

export function ImpoundVehicleDetailDialog({
  vehicle,
  open,
  onOpenChange,
  onUpdate,
}: ImpoundVehicleDetailDialogProps) {
  const { tenant } = useAuth();
  
  const [releaseData, setReleaseData] = useState({
    released_to_name: "",
    released_to_phone: "",
    payment_method: "",
    release_notes: "",
  });

  const status = statusConfig[vehicle.status || "in_lot"] || statusConfig.in_lot;

  const vehicleDescription = [
    vehicle.vehicle_year,
    vehicle.vehicle_color,
    vehicle.vehicle_make,
    vehicle.vehicle_model,
  ]
    .filter(Boolean)
    .join(" ") || "Unknown Vehicle";

  const daysStored = vehicle.days_stored || 
    Math.floor((Date.now() - new Date(vehicle.towed_at).getTime()) / (1000 * 60 * 60 * 24));

  // Calculate fees
  const baseTow = vehicle.base_tow_fee_cents || 0;
  const dailyStorage = vehicle.storage_fee_daily_cents || 0;
  const storageFees = dailyStorage * daysStored;
  const adminFee = vehicle.admin_fee_cents || 0;
  const gateFee = vehicle.gate_fee_cents || 0;
  const totalFees = baseTow + storageFees + adminFee + gateFee;

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const updates: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "released") {
        updates.released_at = new Date().toISOString();
        updates.released_to_name = releaseData.released_to_name || null;
        updates.released_to_phone = releaseData.released_to_phone || null;
        updates.payment_method = releaseData.payment_method || null;
        updates.release_notes = releaseData.release_notes || null;
        updates.total_fees_cents = totalFees;
        updates.days_stored = daysStored;
      }

      const { error } = await supabase
        .from("impound_vehicles")
        .update(updates)
        .eq("id", vehicle.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle updated");
      onUpdate();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              <span className="font-mono">
                {vehicle.license_plate || vehicle.vin?.slice(-6) || "Unknown"}
              </span>
            </DialogTitle>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vehicle Info */}
          <div className="space-y-2">
            <p className="font-medium">{vehicleDescription}</p>
            {vehicle.vin && (
              <p className="text-sm text-muted-foreground font-mono">VIN: {vehicle.vin}</p>
            )}
          </div>

          {/* Tow Details */}
          <div className="space-y-2 text-sm">
            {vehicle.towed_from_address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>{vehicle.towed_from_address}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                Towed: {format(new Date(vehicle.towed_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{daysStored} day{daysStored !== 1 ? "s" : ""} in storage</span>
            </div>
          </div>

          <Separator />

          {/* Fee Breakdown */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Fee Breakdown
            </h4>
            <div className="space-y-1 text-sm">
              {baseTow > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tow Fee</span>
                  <span>{formatCents(baseTow)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Storage ({daysStored} days × {formatCents(dailyStorage)}/day)
                </span>
                <span>{formatCents(storageFees)}</span>
              </div>
              {adminFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admin Fee</span>
                  <span>{formatCents(adminFee)}</span>
                </div>
              )}
              {gateFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gate Fee</span>
                  <span>{formatCents(gateFee)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total Due</span>
                <span className="text-success">{formatCents(totalFees)}</span>
              </div>
            </div>
          </div>

          {/* Release Form (if in_lot or pending_release) */}
          {vehicle.status !== "released" && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Release Vehicle
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="releaseName" className="text-xs">
                      <User className="h-3 w-3 inline mr-1" />
                      Released To
                    </Label>
                    <Input
                      id="releaseName"
                      placeholder="Name"
                      value={releaseData.released_to_name}
                      onChange={(e) => 
                        setReleaseData({ ...releaseData, released_to_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="releasePhone" className="text-xs">Phone</Label>
                    <Input
                      id="releasePhone"
                      placeholder="Phone"
                      value={releaseData.released_to_phone}
                      onChange={(e) => 
                        setReleaseData({ ...releaseData, released_to_phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">
                    <CreditCard className="h-3 w-3 inline mr-1" />
                    Payment Method
                  </Label>
                  <Select
                    value={releaseData.payment_method}
                    onValueChange={(v) => 
                      setReleaseData({ ...releaseData, payment_method: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="releaseNotes" className="text-xs">Notes</Label>
                  <Textarea
                    id="releaseNotes"
                    placeholder="Release notes..."
                    value={releaseData.release_notes}
                    onChange={(e) => 
                      setReleaseData({ ...releaseData, release_notes: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              </div>
            </>
          )}

          {/* Released Info */}
          {vehicle.status === "released" && vehicle.released_at && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                <h4 className="font-medium text-muted-foreground">Release Information</h4>
                <p>Released: {format(new Date(vehicle.released_at), "MMM d, yyyy 'at' h:mm a")}</p>
                {vehicle.released_to_name && <p>To: {vehicle.released_to_name}</p>}
                {vehicle.payment_method && <p>Payment: {vehicle.payment_method}</p>}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            
            {vehicle.status === "in_lot" && (
              <Button
                variant="secondary"
                onClick={() => updateStatusMutation.mutate("pending_release")}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Mark Pending Release
              </Button>
            )}
            
            {(vehicle.status === "in_lot" || vehicle.status === "pending_release") && (
              <Button
                onClick={() => updateStatusMutation.mutate("released")}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Release Vehicle
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
