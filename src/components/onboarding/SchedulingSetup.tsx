import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import BusinessHoursEditor, { type BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import {
  DEFAULT_BUSINESS_HOURS,
  RESTAURANT_HOURS,
  HOURS_24_7,
} from "@/lib/hoursUtils";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export interface SchedulingPrefs {
  defaultDurationMinutes: number;
  bufferMinutes: number;
  sameDayBooking: boolean;
  is24x7: boolean;
}

export function getDefaultSchedulingPrefs(
  mode: BusinessMode,
  scenarioAnswers?: Record<string, boolean>
): SchedulingPrefs {
  const hasLongJobs = scenarioAnswers?.hasLongDurationJobs ?? false;
  const isCallbackOnly = scenarioAnswers?.aiBooksDirect === false;

  switch (mode) {
    case "dispatch":
      return { defaultDurationMinutes: 60, bufferMinutes: 0, sameDayBooking: true, is24x7: false };
    case "food":
      return { defaultDurationMinutes: 30, bufferMinutes: 0, sameDayBooking: true, is24x7: false };
    case "medical":
      return { defaultDurationMinutes: 30, bufferMinutes: 15, sameDayBooking: false, is24x7: false };
    default:
      if (isCallbackOnly) {
        return { defaultDurationMinutes: 60, bufferMinutes: 15, sameDayBooking: true, is24x7: false };
      }
      if (hasLongJobs) {
        return { defaultDurationMinutes: 120, bufferMinutes: 30, sameDayBooking: true, is24x7: false };
      }
      return { defaultDurationMinutes: 60, bufferMinutes: 15, sameDayBooking: true, is24x7: false };
  }
}

export function getDefaultHoursForMode(mode: BusinessMode): BusinessHours {
  switch (mode) {
    case "food":
      return RESTAURANT_HOURS;
    case "dispatch":
      return DEFAULT_BUSINESS_HOURS;
    default:
      return DEFAULT_BUSINESS_HOURS;
  }
}

interface SchedulingSetupProps {
  businessMode: BusinessMode;
  hours: BusinessHours;
  onHoursChange: (hours: BusinessHours) => void;
  prefs: SchedulingPrefs;
  onPrefsChange: (prefs: SchedulingPrefs) => void;
  scenarioAnswers?: Record<string, boolean>;
}

function formatDuration(mins: number): string {
  if (mins === 0) return "Varies";
  if (mins < 60) return `${mins} min`;
  if (mins % 60 === 0) return `${mins / 60} hr${mins > 60 ? "s" : ""}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatBuffer(mins: number): string {
  if (mins === 0) return "None";
  if (mins < 60) return `${mins} min`;
  if (mins % 60 === 0) return `${mins / 60} hr${mins > 60 ? "s" : ""}`;
  return `${mins} min`;
}

function getDurationOptions(hasLongJobs: boolean): number[] {
  if (hasLongJobs) {
    return [60, 90, 120, 180, 240, 480, 0]; // 0 = "Varies"
  }
  return [15, 30, 45, 60, 90, 120, 0]; // 0 = "Varies"
}

function getBufferOptions(hasLongJobs: boolean): number[] {
  if (hasLongJobs) {
    return [0, 15, 30, 45, 60, 120];
  }
  return [0, 5, 10, 15, 30, 45, 60];
}

export function SchedulingSetup({
  businessMode,
  hours,
  onHoursChange,
  prefs,
  onPrefsChange,
  scenarioAnswers,
}: SchedulingSetupProps) {
  const isCallbackOnly = scenarioAnswers?.aiBooksDirect === false;
  const hasLongJobs = scenarioAnswers?.hasLongDurationJobs ?? false;

  const update = <K extends keyof SchedulingPrefs>(key: K, val: SchedulingPrefs[K]) => {
    onPrefsChange({ ...prefs, [key]: val });
  };

  const handle24x7Toggle = (enabled: boolean) => {
    update("is24x7", enabled);
    if (enabled) {
      onHoursChange(HOURS_24_7);
    } else {
      onHoursChange(getDefaultHoursForMode(businessMode));
    }
  };

  const showAppointmentPrefs = !isCallbackOnly && (businessMode === "service" || businessMode === "medical" || businessMode === "general");
  const showDispatchPrefs = businessMode === "dispatch";
  const showFoodPrefs = businessMode === "food";

  const durationOptions = getDurationOptions(hasLongJobs);
  const bufferOptions = getBufferOptions(hasLongJobs);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Scheduling & Hours
        </h2>
        <p className="mt-2 text-muted-foreground">
          {isCallbackOnly
            ? "Set your business hours so the AI knows when you're open. Since you chose callback-only, you don't need appointment slots."
            : "Set your business hours and scheduling preferences. You can fine-tune these later in the Business Brain."
          }
        </p>
      </div>

      {/* Callback-only info banner */}
      {isCallbackOnly && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Callback-Only Mode</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your AI will collect customer information and create callback requests. 
                  You'll schedule appointments manually by calling them back. Just set your 
                  business hours below so the AI knows when you're available.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 24/7 Toggle for dispatch */}
      {showDispatchPrefs && (
        <Card className={cn(prefs.is24x7 && "border-primary bg-primary/5")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">24/7 Operations</p>
                <p className="text-xs text-muted-foreground">Available around the clock</p>
              </div>
              <Switch
                checked={prefs.is24x7}
                onCheckedChange={handle24x7Toggle}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Hours Editor */}
      {!prefs.is24x7 && (
        <div className="space-y-2">
          <Label>Business Hours</Label>
          <div className="border rounded-lg p-4 max-h-[320px] overflow-y-auto">
            <BusinessHoursEditor hours={hours} onChange={onHoursChange} />
          </div>
        </div>
      )}

      {/* Appointment-based prefs — hidden for callback-only */}
      {showAppointmentPrefs && (
        <div className="space-y-4">
          <p className="text-sm font-medium">Scheduling Preferences</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Default Appointment Duration</Label>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => update("defaultDurationMinutes", d)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                      prefs.defaultDurationMinutes === d
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    {formatDuration(d)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Buffer Between Appointments</Label>
              <div className="flex flex-wrap gap-2">
                {bufferOptions.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => update("bufferMinutes", b)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                      prefs.bufferMinutes === b
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    {formatBuffer(b)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Card className={cn(prefs.sameDayBooking && "border-primary bg-primary/5")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Same-day booking</p>
                  <p className="text-xs text-muted-foreground">Allow customers to book appointments for today</p>
                </div>
                <Switch
                  checked={prefs.sameDayBooking}
                  onCheckedChange={(v) => update("sameDayBooking", v)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Food-specific prefs */}
      {showFoodPrefs && (
        <Card className={cn(prefs.sameDayBooking && "border-primary bg-primary/5")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Same-day orders</p>
                <p className="text-xs text-muted-foreground">Accept orders for same-day pickup and delivery</p>
              </div>
              <Switch
                checked={prefs.sameDayBooking}
                onCheckedChange={(v) => update("sameDayBooking", v)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
