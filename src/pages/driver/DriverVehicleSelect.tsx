import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverJobs } from "@/hooks/useDriverJobs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Truck, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FleetVehicle {
  id: string;
  name: string;
  vehicle_type: string | null;
  license_plate: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  status: string;
  current_driver_id: string | null;
}

export default function DriverVehicleSelect() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { driverRecord } = useDriverJobs();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    driverRecord?.default_vehicle_id || null
  );

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["driver-vehicles", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("fleet_vehicles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .neq("status", "retired")
        .order("name");

      if (error) throw error;
      return data as FleetVehicle[];
    },
    enabled: !!tenant?.id,
  });

  const selectVehicle = useMutation({
    mutationFn: async (vehicleId: string | null) => {
      if (!driverRecord?.id) throw new Error("Driver not found");

      // Update driver's default vehicle
      const { error: driverError } = await supabase
        .from("fleet_drivers")
        .update({ default_vehicle_id: vehicleId })
        .eq("id", driverRecord.id);

      if (driverError) throw driverError;

      // Clear previous vehicle assignment if any
      if (driverRecord.default_vehicle_id) {
        await supabase
          .from("fleet_vehicles")
          .update({ current_driver_id: null })
          .eq("id", driverRecord.default_vehicle_id);
      }

      // Set new vehicle assignment
      if (vehicleId) {
        const { error: vehicleError } = await supabase
          .from("fleet_vehicles")
          .update({ current_driver_id: driverRecord.id })
          .eq("id", vehicleId);

        if (vehicleError) throw vehicleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-driver-me"] });
      toast({ title: "Vehicle updated" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleSelectVehicle = (vehicleId: string) => {
    const newSelection = selectedVehicleId === vehicleId ? null : vehicleId;
    setSelectedVehicleId(newSelection);
    selectVehicle.mutate(newSelection);
  };

  if (!driverRecord) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold mb-2">Account Not Linked</h2>
            <p className="text-muted-foreground">
              Your account is not yet linked to a driver profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getVehicleDescription = (v: FleetVehicle) => {
    const parts = [];
    if (v.year) parts.push(v.year);
    if (v.make) parts.push(v.make);
    if (v.model) parts.push(v.model);
    return parts.length > 0 ? parts.join(" ") : null;
  };

  const getStatusBadge = (status: string, currentDriverId: string | null) => {
    if (currentDriverId && currentDriverId !== driverRecord.id) {
      return <Badge variant="secondary">In Use</Badge>;
    }
    switch (status) {
      case "available":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Available</Badge>;
      case "maintenance":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Maintenance</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5" />
          My Vehicle
        </h1>
        <p className="text-sm text-muted-foreground">
          Select the vehicle you're driving today
        </p>
      </div>

      {vehicles && vehicles.length > 0 ? (
        <div className="space-y-3">
          {vehicles.map((vehicle) => {
            const isSelected = selectedVehicleId === vehicle.id;
            const isUnavailable = 
              vehicle.status === "maintenance" || 
              (vehicle.current_driver_id && vehicle.current_driver_id !== driverRecord.id);

            return (
              <Card 
                key={vehicle.id}
                className={cn(
                  "cursor-pointer transition-all",
                  isSelected && "ring-2 ring-primary border-primary",
                  isUnavailable && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => !isUnavailable && handleSelectVehicle(vehicle.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-lg flex items-center justify-center",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {isSelected ? (
                          <Check className="h-6 w-6" />
                        ) : (
                          <Truck className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{vehicle.name}</p>
                        {getVehicleDescription(vehicle) && (
                          <p className="text-sm text-muted-foreground">
                            {getVehicleDescription(vehicle)}
                          </p>
                        )}
                        {vehicle.license_plate && (
                          <p className="text-xs font-mono mt-1 text-muted-foreground">
                            {vehicle.license_plate}
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(vehicle.status, vehicle.current_driver_id)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h2 className="text-lg font-medium mb-1">No Vehicles Available</h2>
            <p className="text-sm text-muted-foreground">
              No vehicles have been added to the fleet yet.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedVehicleId && (
        <div className="pt-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => handleSelectVehicle(selectedVehicleId)}
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
}
