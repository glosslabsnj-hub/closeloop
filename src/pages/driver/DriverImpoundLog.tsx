import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDriverJobs } from "@/hooks/useDriverJobs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Truck, CheckCircle2, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { PhotoUploader } from "@/components/driver/PhotoUploader";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const impoundSchema = z.object({
  license_plate: z.string().min(1, "License plate is required"),
  vin: z.string().optional(),
  year: z.coerce.number().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  reason: z.string().optional(),
  dispatch_job_id: z.string().optional(),
  notes: z.string().optional(),
});

type ImpoundFormValues = z.infer<typeof impoundSchema>;

export default function DriverImpoundLog() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const { activeJobs, driverRecord } = useDriverJobs();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const form = useForm<ImpoundFormValues>({
    resolver: zodResolver(impoundSchema),
    defaultValues: {
      license_plate: "",
      vin: "",
      year: undefined,
      make: "",
      model: "",
      color: "",
      reason: "",
      dispatch_job_id: "",
      notes: "",
    },
  });

  const onSubmit = async (values: ImpoundFormValues) => {
    if (!tenant?.id) return;

    setIsSubmitting(true);
    try {
      // Use type assertion since types may not have been regenerated yet
      const insertData = {
        tenant_id: tenant.id,
        license_plate: values.license_plate,
        vin: values.vin || null,
        vehicle_year: values.year || null,
        vehicle_make: values.make || null,
        vehicle_model: values.model || null,
        vehicle_color: values.color || null,
        tow_reason: values.reason || null,
        notes: values.notes || null,
        dispatch_job_id: values.dispatch_job_id || null,
        status: "in_lot",
        towed_at: new Date().toISOString(),
        logged_by_driver_id: driverRecord?.id || null,
        photos: photos.length > 0 ? photos : null,
      } as Record<string, unknown>;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("impound_vehicles") as any).insert(insertData);

      if (error) throw error;

      setShowSuccess(true);
      form.reset();
      setPhotos([]);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

      toast({ title: "Vehicle logged successfully" });
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to log vehicle. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Vehicle Logged!</h2>
            <p className="text-muted-foreground mb-4">
              The vehicle has been added to the impound lot.
            </p>
            <Button onClick={() => setShowSuccess(false)}>
              Log Another Vehicle
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Log Impound Vehicle
        </h1>
        <p className="text-sm text-muted-foreground">
          Quick entry for vehicles brought to the lot
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* License Plate - Large Input */}
          <FormField
            control={form.control}
            name="license_plate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">License Plate *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ABC-1234" 
                    className="text-xl h-14 font-mono uppercase text-center tracking-widest"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Photo Upload Section */}
          {tenant?.id && (
            <Card className="border-dashed">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Vehicle Photos
                </CardTitle>
                <CardDescription className="text-xs">
                  Take photos of the vehicle for documentation
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <PhotoUploader
                  tenantId={tenant.id}
                  entityType="impound"
                  onPhotosChange={setPhotos}
                  maxPhotos={5}
                />
              </CardContent>
            </Card>
          )}

          {/* Quick Vehicle Info */}
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="make"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Make</FormLabel>
                  <FormControl>
                    <Input placeholder="Honda" {...field} />
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
                    <Input placeholder="Civic" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input placeholder="Silver" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Link to Dispatch Job */}
          {activeJobs.length > 0 && (
            <FormField
              control={form.control}
              name="dispatch_job_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to Job</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select a job to link" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No link</SelectItem>
                      {activeJobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          #{job.job_number || job.id.slice(0, 8)} - {job.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Automatically links photos and details to the job
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Reason */}
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Tow</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Accident recovery, police hold" 
                    className="h-12"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Optional Fields - Collapsible */}
          <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between h-10 text-muted-foreground">
                <span className="text-sm">More Details (VIN, Year, Notes)</span>
                {showOptionalFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {/* VIN */}
              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VIN</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="1HGBH41JXMN109186" 
                        className="font-mono uppercase"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Year */}
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

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional details..."
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Logging Vehicle...
              </>
            ) : (
              <>
                <Truck className="h-5 w-5 mr-2" />
                Log Vehicle to Impound
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
