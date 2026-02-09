import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
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

export function getDefaultSchedulingPrefs(mode: BusinessMode): SchedulingPrefs {
  switch (mode) {
    case "dispatch":
      return { defaultDurationMinutes: 60, bufferMinutes: 0, sameDayBooking: true, is24x7: false };
    case "food":
      return { defaultDurationMinutes: 30, bufferMinutes: 0, sameDayBooking: true, is24x7: false };
    case "medical":
      return { defaultDurationMinutes: 30, bufferMinutes: 15, sameDayBooking: false, is24x7: false };
    default:
      return { defaultDurationMinutes: 60, bufferMinutes: 15, sameDayBooking: true, is24x7: false };
  }
}

export function getDefaultHoursForMode(mode: BusinessMode): BusinessHours {
  switch (mode) {
    case "food":
      return RESTAURANT_HOURS;
    case "dispatch":
      return DEFAULT_BUSINESS_HOURS; // User can toggle 24/7
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
}

const durationOptions = [15, 30, 45, 60, 90, 120] as const;
const bufferOptions = [0, 5, 10, 15, 30] as const;

export function SchedulingSetup({
  businessMode,
  hours,
  onHoursChange,
  prefs,
  onPrefsChange,
}: SchedulingSetupProps) {
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

  const showAppointmentPrefs = businessMode === "service" || businessMode === "medical" || businessMode === "general";
  const showDispatchPrefs = businessMode === "dispatch";
  const showFoodPrefs = businessMode === "food";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Scheduling & Hours
        </h2>
        <p className="mt-2 text-muted-foreground">
          Set your business hours and scheduling preferences. You can fine-tune these later in the Business Brain.
        </p>
      </div>

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

      {/* Appointment-based prefs */}
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
                    {d} min
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
                    {b === 0 ? "None" : `${b} min`}
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
