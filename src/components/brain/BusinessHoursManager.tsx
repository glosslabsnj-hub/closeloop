import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateBusinessHours } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BusinessHoursEditor, { BusinessHours, normalizeHours } from "@/components/onboarding/BusinessHoursEditor";
import { PreviewSentence } from "./layout/BusinessBrainSectionCard";
import { 
  DEFAULT_BUSINESS_HOURS, 
  TYPICAL_BUSINESS_HOURS, 
  RESTAURANT_HOURS, 
  RESTAURANT_SPLIT_HOURS,
  HOURS_24_7,
  getTodayHoursPreview,
  getIs24x7
} from "@/lib/hoursUtils";

export function BusinessHoursManager() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [hours, setHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenant) {
      const tenantHours = tenant.hours_json as unknown as BusinessHours | null;
      if (tenantHours && typeof tenantHours === "object") {
        // Normalize to handle both legacy (open/close) and new (windows) format
        setHours(normalizeHours({ ...DEFAULT_BUSINESS_HOURS, ...tenantHours }));
      }
      setIsLoading(false);
    }
  }, [tenant]);

  const handleSave = async () => {
    if (!tenant?.id) return;
    setIsSaving(true);
    try {
      await updateBusinessHours(tenant.id, hours);
      toast.success("Hours saved");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const is24x7 = getIs24x7(hours);

  const toggle24x7 = () => {
    setHours(is24x7 ? DEFAULT_BUSINESS_HOURS : HOURS_24_7);
  };

  const setTypicalBusiness = () => {
    setHours(TYPICAL_BUSINESS_HOURS);
  };

  const setRestaurantHoursPreset = () => {
    setHours(RESTAURANT_HOURS);
  };

  const setSplitShiftHours = () => {
    setHours(RESTAURANT_SPLIT_HOURS);
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <PreviewSentence sentence={getTodayHoursPreview(hours)} />

      {/* Quick presets */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center mr-2">Quick fill:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={setTypicalBusiness}
        >
          9-5 Weekdays
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={setRestaurantHoursPreset}
        >
          Restaurant
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={setSplitShiftHours}
        >
          Split Shift
        </Button>
        <Button
          variant={is24x7 ? "secondary" : "outline"}
          size="sm"
          onClick={toggle24x7}
        >
          {is24x7 ? "Clear 24/7" : "24/7 Availability"}
        </Button>
      </div>

      {/* Hours Editor */}
      <BusinessHoursEditor hours={hours} onChange={setHours} />

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}
