import { useState } from "react";
import { useCustomerVehicles, type VehicleInput } from "@/hooks/useCustomerVehicles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Car, Plus, Trash2, X } from "lucide-react";

interface VehiclesTabProps {
  customerId: string;
}

export function VehiclesTab({ customerId }: VehiclesTabProps) {
  const { vehicles, isLoading, addVehicle, deleteVehicle } = useCustomerVehicles(customerId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ year: "", make: "", model: "", color: "", vin: "", license_plate: "" });

  const handleSubmit = () => {
    if (!form.make && !form.model) return;
    addVehicle.mutate(
      {
        customer_id: customerId,
        year: form.year ? parseInt(form.year) : null,
        make: form.make,
        model: form.model,
        color: form.color,
        vin: form.vin,
        license_plate: form.license_plate,
      },
      {
        onSuccess: () => {
          setForm({ year: "", make: "", model: "", color: "", vin: "", license_plate: "" });
          setShowForm(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vehicles.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-8">No vehicles on file</p>
      )}

      {vehicles.map((v) => (
        <div key={v.id} className="border rounded-lg p-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <Car className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {[v.year, v.make, v.model].filter(Boolean).join(" ") || "Unknown Vehicle"}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {v.color && <Badge variant="outline" className="text-xs">{v.color}</Badge>}
                {v.license_plate && <Badge variant="outline" className="text-xs">Plate: {v.license_plate}</Badge>}
                {v.vin && <Badge variant="outline" className="text-xs font-mono">VIN: {v.vin}</Badge>}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => deleteVehicle.mutate(v.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {showForm ? (
        <div className="border rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Add Vehicle</p>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Year</Label>
              <Input placeholder="2022" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Make</Label>
              <Input placeholder="Honda" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Model</Label>
              <Input placeholder="Civic" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Color</Label>
              <Input placeholder="Blue" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">VIN</Label>
              <Input placeholder="Optional" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Plate</Label>
              <Input placeholder="Optional" value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value })} />
            </div>
          </div>
          <Button size="sm" onClick={handleSubmit} disabled={addVehicle.isPending || (!form.make && !form.model)}>
            {addVehicle.isPending ? "Adding..." : "Add Vehicle"}
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Vehicle
        </Button>
      )}
    </div>
  );
}
