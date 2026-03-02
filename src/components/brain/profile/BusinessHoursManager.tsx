import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Check } from "lucide-react";
import { updateBusinessHours } from "@/lib/brain/writeBrainFact";
import { invalidateBrainQueries } from "@/lib/brain/invalidateBrainQueries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BusinessHoursEditor, { BusinessHours, normalizeHours } from "@/components/onboarding/BusinessHoursEditor";
import { PreviewSentence } from "../layout/BusinessBrainSectionCard";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { 
  DEFAULT_BUSINESS_HOURS, 
  TYPICAL_BUSINESS_HOURS, 
  RESTAURANT_HOURS, 
  RESTAURANT_SPLIT_HOURS,
  HOURS_24_7,
  getTodayHoursPreview,
  getIs24x7
} from "@/lib/hoursUtils";

interface BusinessHoursManagerProps {
  /** Callback when save completes successfully - use to collapse the section */
  onSaveComplete?: () => void;
}

export function BusinessHoursManager({ onSaveComplete }: BusinessHoursManagerProps) {
  const { tenant, refreshTenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const queryClient = useQueryClient();

  const [hours, setHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [justSaved, setJustSaved] = useState(false);

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

  const handleSave = useCallback(async () => {
    if (!tenant?.id) return;
    setIsSaving(true);
    setJustSaved(false);
    
    try {
      await updateBusinessHours(tenant.id, hours);
      
      // Invalidate all relevant queries so UI updates
      invalidateBrainQueries(queryClient, tenant.id);
      
      // Refresh the tenant in AuthContext so hours_json is updated
      if (refreshTenant) {
        await refreshTenant();
      }
      
      toast.success("Hours saved successfully");
      setJustSaved(true);
      
      // Auto-collapse after a brief moment so user sees the success state
      setTimeout(() => {
        onSaveComplete?.();
      }, 800);
      
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save hours");
    } finally {
      setIsSaving(false);
    }
  }, [tenant?.id, hours, queryClient, refreshTenant, onSaveComplete]);

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
    setJustSaved(false);
  };

  const setTypicalBusiness = () => {
    setHours(TYPICAL_BUSINESS_HOURS);
    setJustSaved(false);
  };

  const setRestaurantHoursPreset = () => {
    setHours(RESTAURANT_HOURS);
    setJustSaved(false);
  };

  const setSplitShiftHours = () => {
    setHours(RESTAURANT_SPLIT_HOURS);
    setJustSaved(false);
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <PreviewSentence sentence={getTodayHoursPreview(hours)} />

      {/* Quick presets — mode-aware */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center mr-2">Quick fill:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={setTypicalBusiness}
        >
          9-5 Weekdays
        </Button>
        {businessMode === "food" && (
          <>
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
          </>
        )}
        <Button
          variant={is24x7 ? "secondary" : "outline"}
          size="sm"
          onClick={toggle24x7}
        >
          {is24x7 ? "Clear 24/7" : "24/7 Availability"}
        </Button>
      </div>

      {/* Hours Editor */}
      <BusinessHoursEditor hours={hours} onChange={(newHours) => {
        setHours(newHours);
        setJustSaved(false);
      }} />

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          variant={justSaved ? "outline" : "default"}
          className={justSaved ? "text-green-600 border-green-600" : ""}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : justSaved ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {justSaved ? "Saved!" : "Save Hours"}
        </Button>
      </div>
    </div>
  );
}
