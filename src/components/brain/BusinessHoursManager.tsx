import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Clock, Info } from "lucide-react";
import { updateBusinessHours } from "@/lib/brain/writeBrainFact";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import BusinessHoursEditor, { BusinessHours, DayHours } from "@/components/onboarding/BusinessHoursEditor";

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

  if (!todayHours || todayHours.closed) {
    return "We're closed today.";
  }

  return `We're open today from ${formatTimeForDisplay(todayHours.open)} to ${formatTimeForDisplay(todayHours.close)}.`;
}

function getSampleQueryPreview(hours: BusinessHours): string {
  // Show a sample response for "Are you open Sunday?"
  const sundayHours = hours.sunday;
  if (!sundayHours || sundayHours.closed) {
    return "No, we're closed on Sundays.";
  }
  return `Yes, on Sundays we're open from ${formatTimeForDisplay(sundayHours.open)} to ${formatTimeForDisplay(sundayHours.close)}.`;
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
        // Merge with defaults to ensure all days exist
        const mergedHours: BusinessHours = { ...defaultHours };
        Object.keys(tenantHours).forEach((day) => {
          if (mergedHours[day]) {
            mergedHours[day] = {
              ...mergedHours[day],
              ...tenantHours[day],
            };
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
      toast.success("Business hours updated successfully");
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update hours";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-muted-foreground mt-2">Loading hours...</p>
        </CardContent>
      </Card>
    );
  }

  const is24x7 = getIs24x7(hours);

  const toggle24x7 = () => {
    if (is24x7) {
      // Revert to default hours
      setHours(defaultHours);
    } else {
      // Set to 24/7
      const allOpen: BusinessHours = {} as BusinessHours;
      const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      dayNames.forEach(day => {
        allOpen[day] = { open: "00:00", close: "23:59", closed: false };
      });
      setHours(allOpen);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Preview Card - Enhanced with multiple examples */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            What the AI tells callers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">When asked "Are you open?"</p>
            <p className="text-sm italic">"{getTodayHoursPreview(hours)}"</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">When asked "Are you open Sunday?"</p>
            <p className="text-sm italic">"{getSampleQueryPreview(hours)}"</p>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p>
            Set your regular weekly hours here. Need to block specific dates (holidays, vacation)? 
            Use the <strong>Availability</strong> tab after saving.
          </p>
        </div>
      </div>

      {/* Hours Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operating Hours
              </CardTitle>
              <CardDescription>
                Your regular weekly schedule — the AI uses this to answer scheduling questions
              </CardDescription>
            </div>
            <Button
              variant={is24x7 ? "secondary" : "outline"}
              size="sm"
              onClick={toggle24x7}
            >
              {is24x7 ? "Clear 24/7" : "Set 24/7"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <BusinessHoursEditor hours={hours} onChange={setHours} />

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Need to block specific dates?{" "}
              <Link to="/app/business-brain?tab=availability" className="text-primary hover:underline">
                Go to Availability
              </Link>
            </p>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Hours
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
