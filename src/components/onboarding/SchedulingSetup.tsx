import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Info, HelpCircle } from "lucide-react";
import BusinessHoursEditor, { type BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import {
  DEFAULT_BUSINESS_HOURS,
  RESTAURANT_HOURS,
  HOURS_24_7,
} from "@/lib/hoursUtils";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import { getIndustryTerminology } from "@/data/industryTerminology";
import { getIndustryBySlug } from "@/data/industryCatalog";

export interface SchedulingPrefs {
  defaultDurationMinutes: number;
  bufferMinutes: number;
  sameDayBooking: boolean;
  is24x7: boolean;
}

/** Industry-specific scheduling defaults keyed by industry slug */
const industrySchedulingDefaults: Record<string, Partial<SchedulingPrefs>> = {
  // Detailing / auto care — long jobs, need buffer for cleanup
  "auto-detailing": { defaultDurationMinutes: 120, bufferMinutes: 30, sameDayBooking: true },
  "car-wash": { defaultDurationMinutes: 30, bufferMinutes: 10, sameDayBooking: true },
  // Auto repair — multi-hour jobs, drop-off model
  auto_repair: { defaultDurationMinutes: 120, bufferMinutes: 30, sameDayBooking: true },
  // Salons & beauty — 30-60 min appointments, tight buffer
  "hair-salon": { defaultDurationMinutes: 45, bufferMinutes: 10, sameDayBooking: true },
  "nail-salon": { defaultDurationMinutes: 45, bufferMinutes: 10, sameDayBooking: true },
  "barber-shop": { defaultDurationMinutes: 30, bufferMinutes: 5, sameDayBooking: true },
  "med-spa": { defaultDurationMinutes: 60, bufferMinutes: 15, sameDayBooking: false },
  // Healthcare — strict scheduling
  dental: { defaultDurationMinutes: 30, bufferMinutes: 15, sameDayBooking: false },
  chiropractic: { defaultDurationMinutes: 30, bufferMinutes: 10, sameDayBooking: true },
  veterinary: { defaultDurationMinutes: 30, bufferMinutes: 15, sameDayBooking: true },
  // Home services — longer blocks, travel time
  plumbing: { defaultDurationMinutes: 90, bufferMinutes: 30, sameDayBooking: true },
  hvac: { defaultDurationMinutes: 90, bufferMinutes: 30, sameDayBooking: true },
  electrical: { defaultDurationMinutes: 90, bufferMinutes: 30, sameDayBooking: true },
  "pest-control": { defaultDurationMinutes: 60, bufferMinutes: 20, sameDayBooking: true },
  "house-cleaning": { defaultDurationMinutes: 120, bufferMinutes: 30, sameDayBooking: false },
  cleaning: { defaultDurationMinutes: 120, bufferMinutes: 30, sameDayBooking: false },
  landscaping: { defaultDurationMinutes: 120, bufferMinutes: 30, sameDayBooking: false },
  lawn_care: { defaultDurationMinutes: 60, bufferMinutes: 30, sameDayBooking: false },
  // General contractor / remodeling — site visit 60 min, advance scheduling required
  general_contractor: { defaultDurationMinutes: 60, bufferMinutes: 60, sameDayBooking: false },
  roofing: { defaultDurationMinutes: 60, bufferMinutes: 60, sameDayBooking: false },
  painting: { defaultDurationMinutes: 120, bufferMinutes: 60, sameDayBooking: false },
  flooring: { defaultDurationMinutes: 60, bufferMinutes: 60, sameDayBooking: false },
  // Tattoo / body art — long sessions
  "tattoo-studio": { defaultDurationMinutes: 120, bufferMinutes: 30, sameDayBooking: false },
  // Photography — 1-2 hour sessions
  photography: { defaultDurationMinutes: 90, bufferMinutes: 30, sameDayBooking: false },
  // Massage / wellness
  "massage-therapy": { defaultDurationMinutes: 60, bufferMinutes: 15, sameDayBooking: true },
  // Fitness / personal training
  "personal-training": { defaultDurationMinutes: 60, bufferMinutes: 10, sameDayBooking: true },
  // Tutoring
  tutoring: { defaultDurationMinutes: 60, bufferMinutes: 10, sameDayBooking: true },
  // Towing / dispatch — no scheduling
  towing: { defaultDurationMinutes: 60, bufferMinutes: 0, sameDayBooking: true, is24x7: false },
};

export function getDefaultSchedulingPrefs(
  mode: BusinessMode,
  scenarioAnswers?: Record<string, boolean>,
  industrySlug?: string
): SchedulingPrefs {
  const hasLongJobs = scenarioAnswers?.hasLongDurationJobs ?? false;
  const isCallbackOnly = scenarioAnswers?.aiBooksDirect === false;

  // Start with mode defaults
  let base: SchedulingPrefs;
  switch (mode) {
    case "dispatch":
      base = { defaultDurationMinutes: 60, bufferMinutes: 0, sameDayBooking: true, is24x7: false };
      break;
    case "food":
      base = { defaultDurationMinutes: 30, bufferMinutes: 0, sameDayBooking: true, is24x7: false };
      break;
    case "medical":
      base = { defaultDurationMinutes: 30, bufferMinutes: 15, sameDayBooking: false, is24x7: false };
      break;
    default:
      if (isCallbackOnly) {
        base = { defaultDurationMinutes: 60, bufferMinutes: 15, sameDayBooking: true, is24x7: false };
      } else if (hasLongJobs) {
        base = { defaultDurationMinutes: 120, bufferMinutes: 30, sameDayBooking: true, is24x7: false };
      } else {
        base = { defaultDurationMinutes: 60, bufferMinutes: 15, sameDayBooking: true, is24x7: false };
      }
  }

  // Override with industry-specific defaults if available
  if (industrySlug && industrySchedulingDefaults[industrySlug]) {
    return { ...base, ...industrySchedulingDefaults[industrySlug] };
  }

  return base;
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
  industrySlug?: string;
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

function WhyTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Why this matters"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-50 w-64 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md animate-fade-in">
          {text}
        </span>
      )}
    </span>
  );
}

export function SchedulingSetup({
  businessMode,
  hours,
  onHoursChange,
  prefs,
  onPrefsChange,
  scenarioAnswers,
  industrySlug,
}: SchedulingSetupProps) {
  const isCallbackOnly = scenarioAnswers?.aiBooksDirect === false;
  const hasLongJobs = scenarioAnswers?.hasLongDurationJobs ?? false;
  const industryEntry = industrySlug ? getIndustryBySlug(industrySlug) : undefined;
  const terms = getIndustryTerminology(businessMode, industryEntry?.category, industrySlug);
  const apptLabel = terms.appointmentLabel;
  const apptLabelCap = apptLabel.charAt(0).toUpperCase() + apptLabel.slice(1);

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
            ? `Set your business hours so the AI knows when you're open. Since you chose callback-only, you don't need to configure ${apptLabel} time slots.`
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
                  Your AI will collect {terms.customerLabel} information and create callback requests.
                  You'll schedule {apptLabel}s manually by calling them back. Just set your
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
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Default {apptLabelCap} Duration</Label>
                <WhyTooltip text={`This sets how long the AI blocks on your calendar per ${apptLabel}. Pick your most common ${apptLabel} length — you can always override per service later.`} />
              </div>
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
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Buffer Between {apptLabelCap}s</Label>
                <WhyTooltip text="Buffer time prevents back-to-back bookings. Use it for cleanup, travel, or prep. For example, a 30-minute buffer after a 3-hour detail gives you time to inspect the car and prep for the next one." />
              </div>
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
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm">Same-day booking</p>
                    <WhyTooltip text={`When enabled, callers can book a ${apptLabel} for later today if you have open slots. Turn this off if you need lead time to prepare (e.g., ordering supplies, scheduling staff).`} />
                  </div>
                  <p className="text-xs text-muted-foreground">Allow {terms.customerLabel}s to book {apptLabel}s for today</p>
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
