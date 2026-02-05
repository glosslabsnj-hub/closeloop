/**
 * ImpoundVehicleCard - Display card for impounded vehicles
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, MapPin, Calendar, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ImpoundVehicle = {
  id: string;
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
  days_stored: number | null;
  total_fees_cents: number | null;
  impound_lots?: { name: string } | null;
};

interface ImpoundVehicleCardProps {
  vehicle: ImpoundVehicle;
  onClick: () => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  in_lot: { label: "In Lot", variant: "default" },
  pending_release: { label: "Pending Release", variant: "secondary" },
  released: { label: "Released", variant: "outline" },
};

export function ImpoundVehicleCard({ vehicle, onClick }: ImpoundVehicleCardProps) {
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

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="pt-4 space-y-3">
        {/* Header with plate and status */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono font-bold text-lg">
                {vehicle.license_plate || "No Plate"}
              </span>
              {vehicle.license_plate_state && (
                <span className="text-xs text-muted-foreground">
                  ({vehicle.license_plate_state})
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {vehicleDescription}
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-sm">
          {vehicle.towed_from_address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground line-clamp-1">
                {vehicle.towed_from_address}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(vehicle.towed_at), { addSuffix: true })}
              {daysStored > 0 && ` · ${daysStored} day${daysStored !== 1 ? "s" : ""} stored`}
            </span>
          </div>

          {vehicle.total_fees_cents != null && vehicle.total_fees_cents > 0 && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success" />
              <span className="font-medium text-success">
                ${(vehicle.total_fees_cents / 100).toFixed(2)} total fees
              </span>
            </div>
          )}
        </div>

        {/* Lot name */}
        {vehicle.impound_lots?.name && (
          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              {vehicle.impound_lots.name}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
