import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFleetVehicles, FleetVehicle, CreateFleetVehicleInput } from "@/hooks/useFleetVehicles";
import { FleetDriver } from "@/hooks/useFleetDrivers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const vehicleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  vehicle_type: z.string().optional(),
  license_plate: z.string().optional(),
  vin: z.string().optional(),
  year: z.coerce.number().optional().or(z.literal("")),
  make: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(["available", "in_use", "maintenance", "retired"]),
  capacity_notes: z.string().optional(),
  current_driver_id: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: FleetVehicle | null;
  drivers: FleetDriver[];
}

export function VehicleEditorDialog({
  open,
  onOpenChange,
  vehicle,
  drivers,
}: VehicleEditorDialogProps) {
  const { createVehicle, updateVehicle } = useFleetVehicles();
  const isEditing = !!vehicle;

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: "",
      vehicle_type: "",
      license_plate: "",
      vin: "",
      year: "",
      make: "",
      model: "",
      status: "available",
      capacity_notes: "",
      current_driver_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (vehicle) {
        form.reset({
          name: vehicle.name,
          vehicle_type: vehicle.vehicle_type || "",
          license_plate: vehicle.license_plate || "",
          vin: vehicle.vin || "",
          year: vehicle.year || "",
          make: vehicle.make || "",
          model: vehicle.model || "",
          status: vehicle.status,
          capacity_notes: vehicle.capacity_notes || "",
          current_driver_id: vehicle.current_driver_id || "",
        });
      } else {
        form.reset({
          name: "",
          vehicle_type: "",
          license_plate: "",
          vin: "",
          year: "",
          make: "",
          model: "",
          status: "available",
          capacity_notes: "",
          current_driver_id: "",
        });
      }
    }
  }, [open, vehicle, form]);

  const onSubmit = async (values: VehicleFormValues) => {
    const input: CreateFleetVehicleInput = {
      name: values.name,
      vehicle_type: values.vehicle_type || undefined,
      license_plate: values.license_plate || undefined,
      vin: values.vin || undefined,
      year: typeof values.year === "number" ? values.year : undefined,
      make: values.make || undefined,
      model: values.model || undefined,
      status: values.status,
      capacity_notes: values.capacity_notes || undefined,
      current_driver_id: values.current_driver_id || undefined,
    };

    if (isEditing) {
      await updateVehicle.mutateAsync({ id: vehicle.id, ...input });
    } else {
      await createVehicle.mutateAsync(input);
    }
    onOpenChange(false);
  };

  const activeDrivers = drivers.filter(d => d.status === "active");

  const vehicleTypes = [
    { value: "flatbed", label: "Flatbed" },
    { value: "wheel_lift", label: "Wheel Lift" },
    { value: "heavy_duty", label: "Heavy Duty" },
    { value: "light_duty", label: "Light Duty" },
    { value: "integrated", label: "Integrated" },
    { value: "rollback", label: "Rollback" },
    { value: "service_truck", label: "Service Truck" },
    { value: "other", label: "Other" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update vehicle information"
              : "Add a new vehicle to your fleet"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Truck #1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicle_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicleTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input placeholder="Ford" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="F-550" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="license_plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Plate</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VIN</FormLabel>
                    <FormControl>
                      <Input placeholder="1HGBH41JXMN109186" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="in_use">In Use</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_driver_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Driver</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "unassigned" ? "" : val)}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {activeDrivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="capacity_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="E.g., Max 10,000 lbs, can handle motorcycles..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createVehicle.isPending || updateVehicle.isPending}
              >
                {createVehicle.isPending || updateVehicle.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Add Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
