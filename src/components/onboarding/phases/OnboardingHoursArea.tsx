import React, { useState } from "react";
/**
 * Phase 3: WHEN & WHERE — Business hours + service area
 * Quick-select presets make this a one-click step for most users.
 * Full editor is available for custom hours.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import BusinessHoursEditor, { type BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import { ServiceAreaStep, type ServiceAreaConfig } from "@/components/onboarding/ServiceAreaStep";
import { Separator } from "@/components/ui/separator";
import { HOURS_24_7, HOURS_PRESETS } from "@/lib/hoursUtils";
import { getDefaultHoursForMode } from "@/components/onboarding/SchedulingSetup";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import type { WorkStyle } from "./OnboardingHowYouWork";

interface OnboardingHoursAreaProps {
  businessMode: BusinessMode;
  hours: BusinessHours;
  onHoursChange: (hours: BusinessHours) => void;
  is24x7: boolean;
  onIs24x7Change: (enabled: boolean) => void;
  serviceArea: ServiceAreaConfig;
  onServiceAreaChange: (area: ServiceAreaConfig) => void;
  workStyle: WorkStyle;
}

export const OnboardingHoursArea = React.memo(function OnboardingHoursArea({
  businessMode,
  hours,
  onHoursChange,
  is24x7,
  onIs24x7Change,
  serviceArea,
  onServiceAreaChange,
  workStyle,
}: OnboardingHoursAreaProps) {
  const showCoverage = workStyle === "go_to_customer" || workStyle === "both" ||
    businessMode === "dispatch" || businessMode === "food";
  const showDispatch24x7 = businessMode === "dispatch";

  // Track if user has selected a preset or is using custom hours
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(() => {
    // Determine the initially selected preset based on current hours
    if (is24x7) return "24_7";
    for (const preset of HOURS_PRESETS) {
      const presetHoursStr = JSON.stringify(preset.hours);
      const currentHoursStr = JSON.stringify(hours);
      if (presetHoursStr === currentHoursStr) return preset.id;
    }
    return null;
  });
  const handle24x7Toggle = (enabled: boolean) => {
    onIs24x7Change(enabled);
    if (enabled) {
      onHoursChange(HOURS_24_7);
      setSelectedPresetId("24_7");
    } else {
      onHoursChange(getDefaultHoursForMode(businessMode));
      setSelectedPresetId(null);
    }
  };

  const handlePresetSelect = (preset: typeof HOURS_PRESETS[0]) => {
    setSelectedPresetId(preset.id);
    onHoursChange(preset.hours);
    onIs24x7Change(false);
  };

  const handleCustomSelect = () => {
    setSelectedPresetId("custom");
    if (is24x7) {
      onIs24x7Change(false);
      onHoursChange(getDefaultHoursForMode(businessMode));
    }
  };

  const heading = businessMode === "dispatch"
    ? "When do you take calls & dispatches?"
    : businessMode === "food"
      ? "When are you open for orders?"
      : businessMode === "medical"
        ? "When do you see patients?"
        : "When are you available?";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Your hours{showCoverage ? " & service area" : ""}
        </h2>
        <p className="mt-2 text-muted-foreground">
          Your AI uses these to tell callers when you're available{showCoverage ? " and whether you serve their area" : ""}.
        </p>
      </div>

      {/* Hours Section */}
      <div className="space-y-4">
        <p className="text-sm font-medium">{heading}</p>

        {/* 24/7 toggle for dispatch */}
        {showDispatch24x7 && (
          <Card
            className={cn(
              "cursor-pointer transition-all",
              is24x7 ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            )}
            onClick={() => handle24x7Toggle(!is24x7)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">24/7 Operations</p>
                  <p className="text-xs text-muted-foreground">Available around the clock</p>
                </div>
                <Switch checked={is24x7} onCheckedChange={handle24x7Toggle} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick preset grid — the primary selection method */}
        {!is24x7 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {HOURS_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all",
                  selectedPresetId === preset.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "hover:bg-muted/50"
                )}
              >
                {selectedPresetId === preset.id && (
                  <span className="absolute top-2 right-2">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                )}
                <span className="text-sm font-medium">{preset.label}</span>
                <span className="text-xs text-muted-foreground">{preset.sublabel}</span>
              </button>
            ))}

            {/* Custom option */}
            <button
              type="button"
              onClick={handleCustomSelect}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all",
                selectedPresetId === "custom"
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "hover:bg-muted/50"
              )}
            >
              {selectedPresetId === "custom" && (
                <span className="absolute top-2 right-2">
                  <Check className="h-3 w-3 text-primary" />
                </span>
              )}
              <span className="text-sm font-medium">Custom</span>
              <span className="text-xs text-muted-foreground">Set my own hours</span>
            </button>
          </div>
        )}

        {/* Full editor — shown only when "Custom" is selected */}
        {!is24x7 && selectedPresetId === "custom" && (
          <div className="border rounded-lg p-4 max-h-[320px] overflow-y-auto">
            <BusinessHoursEditor hours={hours} onChange={onHoursChange} />
          </div>
        )}

        {/* "Customize" link when a preset is selected */}
        {!is24x7 && selectedPresetId && selectedPresetId !== "custom" && (
          <button
            type="button"
            onClick={() => setSelectedPresetId("custom")}
            className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
          >
            Different hours? Customize
          </button>
        )}

        {/* If no preset selected and not custom, show the editor */}
        {!is24x7 && !selectedPresetId && (
          <div className="border rounded-lg p-4 max-h-[320px] overflow-y-auto">
            <BusinessHoursEditor hours={hours} onChange={onHoursChange} />
          </div>
        )}
      </div>

      {/* Service Area — only if mobile/both or dispatch/food */}
      {showCoverage && (
        <>
          <Separator />
          <ServiceAreaStep
            businessMode={businessMode}
            value={serviceArea}
            onChange={onServiceAreaChange}
          />
        </>
      )}
    </div>
  );
});
