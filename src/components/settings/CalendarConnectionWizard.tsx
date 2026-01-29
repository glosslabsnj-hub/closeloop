import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  useCalendarConnections,
  CALENDAR_PROVIDERS,
  type CalendarConnection,
} from "@/hooks/useCalendarConnections";
import { useTenantSettings } from "@/hooks/useSettings";
import BusinessHoursEditor, { type BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import { 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  Clock, 
  ArrowRight,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

interface CalendarConnectionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_HOURS: BusinessHours = {
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: "10:00", close: "14:00", closed: true },
  sunday: { open: "10:00", close: "14:00", closed: true },
};

export function CalendarConnectionWizard({ open, onOpenChange }: CalendarConnectionWizardProps) {
  const { createConnection } = useCalendarConnections();
  const { tenant, updateTenant, isUpdating } = useTenantSettings();
  
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<CalendarConnection["provider"] | null>(null);
  const [icsUrl, setIcsUrl] = useState("");
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    (tenant?.hours_json as unknown as BusinessHours) || DEFAULT_HOURS
  );
  const [minLeadHours, setMinLeadHours] = useState(2);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(15);

  const handleNext = async () => {
    if (step === 1 && selectedProvider) {
      if (selectedProvider === "ics") {
        setStep(2); // Go to ICS URL input
      } else if (selectedProvider === "manual") {
        setStep(3); // Skip to hours
      } else {
        setStep(3); // OAuth providers go to hours (OAuth flow would happen here)
      }
    } else if (step === 2) {
      setStep(3); // After ICS URL, go to hours
    } else if (step === 3) {
      setStep(4); // Go to booking rules
    } else if (step === 4) {
      // Final step - save everything
      await handleComplete();
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      if (selectedProvider === "ics") {
        setStep(2);
      } else {
        setStep(1);
      }
    } else if (step === 4) {
      setStep(3);
    }
  };

  const handleComplete = async () => {
    if (!selectedProvider) return;

    // Save calendar connection
    await createConnection.mutateAsync({
      provider: selectedProvider,
      auth_type: CALENDAR_PROVIDERS.find(p => p.id === selectedProvider)?.authType || "manual",
      config_json: selectedProvider === "ics" ? { ics_url: icsUrl } : {},
    });

    // Save booking settings to tenant
    await updateTenant.mutateAsync({
      hours_json: businessHours as Record<string, never>,
      min_lead_hours: minLeadHours,
      max_advance_days: maxAdvanceDays,
      appointment_buffer_minutes: bufferMinutes,
    });

    setStep(5); // Success
  };

  const handleClose = () => {
    setStep(1);
    setSelectedProvider(null);
    setIcsUrl("");
    onOpenChange(false);
  };

  const canProceed = () => {
    if (step === 1) return !!selectedProvider;
    if (step === 2) return icsUrl.trim().length > 0;
    if (step === 3) return true;
    if (step === 4) return true;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        {step < 5 && (
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Connect Your Schedule</DialogTitle>
                <DialogDescription>
                  {step === 1 && "Choose where your schedule lives"}
                  {step === 2 && "Enter your calendar feed URL"}
                  {step === 3 && "Set your business hours"}
                  {step === 4 && "Configure booking rules"}
                </DialogDescription>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="flex gap-1 mt-4">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </DialogHeader>
        )}

        {/* Step 1: Choose Provider */}
        {step === 1 && (
          <div className="py-4">
            <RadioGroup
              value={selectedProvider || ""}
              onValueChange={(v) => setSelectedProvider(v as CalendarConnection["provider"])}
              className="space-y-2"
            >
              {CALENDAR_PROVIDERS.map((provider) => (
                <label
                  key={provider.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProvider === provider.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={provider.id} className="sr-only" />
                  <span className="text-2xl">{provider.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium">{provider.name}</p>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                  {selectedProvider === provider.id && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 2: ICS URL Input */}
        {step === 2 && (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="icsUrl">Calendar Feed URL</Label>
              <Input
                id="icsUrl"
                type="url"
                placeholder="https://calendar.google.com/calendar/ical/..."
                value={icsUrl}
                onChange={(e) => setIcsUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Most calendars have an option to export as ICS/iCal. Look for "Share" or "Export" in your calendar settings.
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">How to find your ICS URL:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Google Calendar: Settings → Share → "Secret address in iCal format"</li>
                <li>Apple Calendar: File → Export → Copy the URL</li>
                <li>Outlook: Settings → View all settings → Calendar → Shared calendars</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 3: Business Hours */}
        {step === 3 && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              AI will only offer appointments during these hours.
            </p>
            <BusinessHoursEditor hours={businessHours} onChange={setBusinessHours} />
          </div>
        )}

        {/* Step 4: Booking Rules */}
        {step === 4 && (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Minimum notice required</Label>
              <select
                value={minLeadHours}
                onChange={(e) => setMinLeadHours(Number(e.target.value))}
                className="w-full h-11 rounded-lg border border-input bg-background px-4"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours (1 day)</option>
                <option value={48}>48 hours (2 days)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                AI won't book anything sooner than this
              </p>
            </div>

            <div className="space-y-2">
              <Label>How far in advance can people book?</Label>
              <select
                value={maxAdvanceDays}
                onChange={(e) => setMaxAdvanceDays(Number(e.target.value))}
                className="w-full h-11 rounded-lg border border-input bg-background px-4"
              >
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
                <option value={60}>2 months</option>
                <option value={90}>3 months</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Buffer between appointments</Label>
              <select
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(Number(e.target.value))}
                className="w-full h-11 rounded-lg border border-input bg-background px-4"
              >
                <option value={0}>No buffer</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Time between back-to-back appointments
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="py-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <DialogTitle className="mb-2">Schedule Connected!</DialogTitle>
            <DialogDescription>
              AI can now see your availability and book appointments without conflicts.
            </DialogDescription>
          </div>
        )}

        <DialogFooter>
          {step < 5 ? (
            <>
              {step > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed() || createConnection.isPending || isUpdating}
              >
                {createConnection.isPending || isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {step === 4 ? "Complete Setup" : "Next"}
                {step < 4 && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
