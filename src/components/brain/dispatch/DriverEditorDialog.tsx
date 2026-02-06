import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFleetDrivers, FleetDriver, CreateFleetDriverInput } from "@/hooks/useFleetDrivers";
import { FleetVehicle } from "@/hooks/useFleetVehicles";
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
import { Button } from "@/components/ui/button";

const driverSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone_e164: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  license_number: z.string().optional(),
  license_expiry: z.string().optional(),
  status: z.enum(["active", "inactive", "on_break"]),
  default_vehicle_id: z.string().optional(),
});

type DriverFormValues = z.infer<typeof driverSchema>;

interface DriverEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: FleetDriver | null;
  vehicles: FleetVehicle[];
}

export function DriverEditorDialog({
  open,
  onOpenChange,
  driver,
  vehicles,
}: DriverEditorDialogProps) {
  const { createDriver, updateDriver } = useFleetDrivers();
  const isEditing = !!driver;

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      full_name: "",
      phone_e164: "",
      email: "",
      license_number: "",
      license_expiry: "",
      status: "active",
      default_vehicle_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (driver) {
        form.reset({
          full_name: driver.full_name,
          phone_e164: driver.phone_e164 || "",
          email: driver.email || "",
          license_number: driver.license_number || "",
          license_expiry: driver.license_expiry || "",
          status: driver.status,
          default_vehicle_id: driver.default_vehicle_id || "",
        });
      } else {
        form.reset({
          full_name: "",
          phone_e164: "",
          email: "",
          license_number: "",
          license_expiry: "",
          status: "active",
          default_vehicle_id: "",
        });
      }
    }
  }, [open, driver, form]);

  const onSubmit = async (values: DriverFormValues) => {
    const input: CreateFleetDriverInput = {
      full_name: values.full_name,
      phone_e164: values.phone_e164 || undefined,
      email: values.email || undefined,
      license_number: values.license_number || undefined,
      license_expiry: values.license_expiry || undefined,
      status: values.status,
      default_vehicle_id: values.default_vehicle_id || undefined,
    };

    if (isEditing) {
      await updateDriver.mutateAsync({ id: driver.id, ...input });
    } else {
      await createDriver.mutateAsync(input);
    }
    onOpenChange(false);
  };

  const availableVehicles = vehicles.filter(v => v.status !== "retired");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Driver" : "Add Driver"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update driver information"
              : "Add a new crew member or driver to your fleet"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone_e164"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 555-123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="license_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number</FormLabel>
                    <FormControl>
                      <Input placeholder="DL123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="license_expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Expiry</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_break">On Break</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_vehicle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Vehicle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {availableVehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createDriver.isPending || updateDriver.isPending}
              >
                {createDriver.isPending || updateDriver.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Add Driver"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
