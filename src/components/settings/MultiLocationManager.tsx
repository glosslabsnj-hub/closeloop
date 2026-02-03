import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Phone, MapPin, Loader2, AlertCircle } from "lucide-react";
import { 
  getLocationAddOnPrice, 
  getTierFromSku,
  formatPrice,
  type PlanSku,
} from "@/config/pricing";

interface Location {
  id: string;
  tenant_id: string;
  location_name: string;
  phone_number_id: string | null;
  is_primary: boolean;
  monthly_fee_cents: number;
  status: string;
  created_at: string;
}

interface PhoneNumber {
  id: string;
  phone_e164: string;
  status: string;
}

export function MultiLocationManager() {
  const { tenant } = useAuth();
  const { planSku, hasVoice } = useSubscription(tenant?.id || null);
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");

  // Fetch locations
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["tenant_locations", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("tenant_locations")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!tenant?.id,
  });

  // Fetch phone numbers
  const { data: phoneNumbers } = useQuery({
    queryKey: ["phone_numbers", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("tenant_id", tenant.id);
      if (error) throw error;
      return data as PhoneNumber[];
    },
    enabled: !!tenant?.id,
  });

  // Get phone number for a location
  const getPhoneForLocation = (phoneNumberId: string | null) => {
    if (!phoneNumberId) return null;
    return phoneNumbers?.find(p => p.id === phoneNumberId);
  };

  // Calculate add-on price - voice only now
  const addOnPrice = getLocationAddOnPrice("voice");

  // Add location mutation
  const addLocation = useMutation({
    mutationFn: async (name: string) => {
      if (!tenant?.id || !planSku) throw new Error("Missing tenant or plan");

      // Create location record
      const { data: location, error: locationError } = await supabase
        .from("tenant_locations")
        .insert({
          tenant_id: tenant.id,
          location_name: name,
          is_primary: false,
          monthly_fee_cents: addOnPrice * 100,
          status: "pending_number",
        })
        .select()
        .single();

      if (locationError) throw locationError;

      // Provision a phone number for voice/both plans
      if (hasVoice) {
        try {
          const { data, error: provisionError } = await supabase.functions.invoke("provision-twilio-number", {
            body: { 
              tenant_id: tenant.id, 
              number_type: "local",
              location_id: location.id,
            },
          });

          if (provisionError) {
            console.error("Failed to provision number:", provisionError);
          } else if (data?.phone_number_id) {
            // Update location with phone number
            await supabase
              .from("tenant_locations")
              .update({ 
                phone_number_id: data.phone_number_id,
                status: "active",
              })
              .eq("id", location.id);
          }
        } catch (err) {
          console.error("Provisioning error:", err);
        }
      } else {
        // SMS-only: mark as active (no phone number needed for Twilio voice)
        await supabase
          .from("tenant_locations")
          .update({ status: "active" })
          .eq("id", location.id);
      }

      return location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_locations"] });
      queryClient.invalidateQueries({ queryKey: ["phone_numbers"] });
      setIsAddDialogOpen(false);
      setNewLocationName("");
      toast.success("Location added successfully");
    },
    onError: (error) => {
      console.error("Failed to add location:", error);
      toast.error("Failed to add location");
    },
  });

  // Remove location mutation
  const removeLocation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase
        .from("tenant_locations")
        .delete()
        .eq("id", locationId)
        .eq("is_primary", false); // Can't delete primary
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant_locations"] });
      toast.success("Location removed");
    },
    onError: () => {
      toast.error("Failed to remove location");
    },
  });

  if (locationsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const additionalLocations = locations?.filter(l => !l.is_primary) || [];
  const monthlyTotal = additionalLocations.reduce((sum, l) => sum + (l.monthly_fee_cents / 100), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Multi-Location</CardTitle>
            <CardDescription>
              Add additional locations with dedicated phone numbers
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Location</DialogTitle>
                <DialogDescription>
                  Each additional location includes a dedicated phone number and costs{" "}
                  <strong>{formatPrice(addOnPrice)}/month</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Location Name</Label>
                  <Input
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Downtown Office"
                  />
                </div>
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      {hasVoice 
                        ? "A new phone number will be provisioned for this location."
                        : "SMS routing will be configured for this location."}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => addLocation.mutate(newLocationName)}
                  disabled={!newLocationName.trim() || addLocation.isPending}
                >
                  {addLocation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Location ({formatPrice(addOnPrice)}/mo)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Location */}
        {locations?.filter(l => l.is_primary).map((location) => {
          const phone = getPhoneForLocation(location.phone_number_id);
          return (
            <div
              key={location.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-primary/5 border-primary/20"
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {location.location_name}
                    <Badge variant="secondary" className="text-xs">Primary</Badge>
                  </div>
                  {phone && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {phone.phone_e164}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-sm text-muted-foreground">Included</span>
            </div>
          );
        })}

        {/* Additional Locations */}
        {additionalLocations.map((location) => {
          const phone = getPhoneForLocation(location.phone_number_id);
          return (
            <div
              key={location.id}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {location.location_name}
                    <Badge variant={location.status === "active" ? "default" : "secondary"}>
                      {location.status}
                    </Badge>
                  </div>
                  {phone ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {phone.phone_e164}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {location.status === "pending_number" ? "Provisioning number..." : "No number assigned"}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {formatPrice(location.monthly_fee_cents / 100)}/mo
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLocation.mutate(location.id)}
                  disabled={removeLocation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}

        {additionalLocations.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No additional locations</p>
            <p className="text-sm">Add locations to expand your coverage</p>
          </div>
        )}

        {/* Monthly Total */}
        {additionalLocations.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="font-medium">Additional locations total</span>
            <span className="font-bold">{formatPrice(monthlyTotal)}/mo</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
