import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, MapPin } from "lucide-react";
import { updateServiceArea } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function ServiceAreaManager() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    radius_miles: "",
    zip_codes: "",
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenant) {
      const serviceArea = tenant.service_area_json as any;
      setFormData({
        radius_miles: serviceArea?.radius_miles?.toString() || "",
        zip_codes: serviceArea?.zip_codes?.join(", ") || "",
        notes: serviceArea?.notes || "",
      });
      setIsLoading(false);
    }
  }, [tenant]);

  const handleSave = async () => {
    if (!tenant?.id) return;

    setIsSaving(true);
    try {
      const zipCodesArray = formData.zip_codes
        .split(",")
        .map((zip) => zip.trim())
        .filter((zip) => zip.length > 0);

      await updateServiceArea(tenant.id, {
        radius_miles: formData.radius_miles ? parseInt(formData.radius_miles) : undefined,
        zip_codes: zipCodesArray.length > 0 ? zipCodesArray : undefined,
        notes: formData.notes.trim() || undefined,
      });

      toast.success("Service area updated successfully");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update service area");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-muted-foreground mt-2">Loading service area...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Service Area
        </CardTitle>
        <CardDescription>
          Define where your business provides services
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="radius">Service Radius (miles)</Label>
          <Input
            id="radius"
            type="number"
            value={formData.radius_miles}
            onChange={(e) => setFormData({ ...formData, radius_miles: e.target.value })}
            placeholder="e.g., 25"
          />
          <p className="text-xs text-muted-foreground">
            Maximum distance from your business location
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zip-codes">ZIP Codes Served</Label>
          <Textarea
            id="zip-codes"
            value={formData.zip_codes}
            onChange={(e) => setFormData({ ...formData, zip_codes: e.target.value })}
            placeholder="12345, 12346, 12347"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of ZIP codes you serve
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Service Area Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g., We serve all of Metro Detroit except downtown"
            rows={2}
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Service Area
        </Button>
      </CardContent>
    </Card>
  );
}
