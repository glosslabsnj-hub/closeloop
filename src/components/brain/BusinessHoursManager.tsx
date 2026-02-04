import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateBusinessHours } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BusinessHoursEditor, { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import { PreviewSentence } from "./layout/BusinessBrainSectionCard";

const defaultHours: BusinessHours = {
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: "10:00", close: "14:00", closed: false },
  sunday: { open: "09:00", close: "17:00", closed: true },
};

function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}:${minutes} ${suffix}`;
}

function getTodayHoursPreview(hours: BusinessHours): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = days[new Date().getDay()];
  const todayHours = hours[today];
  if (!todayHours || todayHours.closed) return "We're closed today.";
  return `We're open today from ${formatTimeForDisplay(todayHours.open)} to ${formatTimeForDisplay(todayHours.close)}.`;
}

function getIs24x7(hours: BusinessHours): boolean {
  return Object.values(hours).every(
    day => !day.closed && day.open === "00:00" && day.close === "23:59"
  );
}

export function BusinessHoursManager() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [hours, setHours] = useState<BusinessHours>(defaultHours);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (tenant) {
      const tenantHours = (tenant as any).hours_json;
      if (tenantHours && typeof tenantHours === "object") {
        const mergedHours: BusinessHours = { ...defaultHours };
        Object.keys(tenantHours).forEach((day) => {
          if (mergedHours[day]) {
            mergedHours[day] = { ...mergedHours[day], ...tenantHours[day] };
          }
        });
        setHours(mergedHours);
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
    if (is24x7) {
      setHours(defaultHours);
    } else {
      const allOpen: BusinessHours = {} as BusinessHours;
      ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].forEach(day => {
        allOpen[day] = { open: "00:00", close: "23:59", closed: false };
      });
      setHours(allOpen);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <PreviewSentence sentence={getTodayHoursPreview(hours)} />

      {/* Quick toggle */}
      <div className="flex justify-end">
        <Button
          variant={is24x7 ? "secondary" : "outline"}
          size="sm"
          onClick={toggle24x7}
        >
          {is24x7 ? "Clear 24/7" : "Set 24/7"}
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
