/**
 * ServiceAreaStep - Onboarding step for configuring coverage area
 *
 * Only shown for modes that need coverage: dispatch, service (mobile), food (delivery).
 * Lets user set radius and customize out-of-area message.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { MapPin } from "lucide-react";
import { getIndustryTerminology } from "@/data/industryTerminology";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export interface ServiceAreaConfig {
  radiusMiles: number;
  zipCodes: string;
  outOfAreaMessage: string;
}

export function getDefaultServiceArea(mode: BusinessMode): ServiceAreaConfig {
  const radius = mode === "dispatch" ? 30 : mode === "food" ? 10 : 25;
  const msg =
    mode === "dispatch"
      ? "I'm sorry, that location is outside our coverage zone. Let me take your number and we'll see if we can help."
      : mode === "food"
      ? "Unfortunately, we don't deliver to that area yet. You're welcome to place a pickup order though!"
      : "That's a bit outside our service area. Let me take your info and we'll see what we can do.";

  return {
    radiusMiles: radius,
    zipCodes: "",
    outOfAreaMessage: msg,
  };
}

interface ServiceAreaStepProps {
  businessMode: BusinessMode;
  value: ServiceAreaConfig;
  onChange: (value: ServiceAreaConfig) => void;
}

export function ServiceAreaStep({
  businessMode,
  value,
  onChange,
}: ServiceAreaStepProps) {
  const terms = getIndustryTerminology(businessMode);

  const update = (partial: Partial<ServiceAreaConfig>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Where You Serve
        </h2>
        <p className="mt-2 text-muted-foreground">
          Your AI will check if callers are in your {terms.locationLabel} before
          booking.
        </p>
      </div>

      {/* Radius slider */}
      <div className="space-y-3">
        <Label>Coverage Radius</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[value.radiusMiles]}
            onValueChange={([v]) => update({ radiusMiles: v })}
            min={1}
            max={50}
            step={1}
            className="flex-1"
          />
          <span className="text-sm font-medium tabular-nums w-20 text-right">
            {value.radiusMiles} miles
          </span>
        </div>
      </div>

      {/* ZIP codes (optional) */}
      <div className="space-y-2">
        <Label htmlFor="zip-codes">ZIP Codes (optional)</Label>
        <Input
          id="zip-codes"
          value={value.zipCodes}
          onChange={(e) => update({ zipCodes: e.target.value })}
          placeholder="e.g. 90210, 90211, 90212"
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated. Leave blank to use radius only.
        </p>
      </div>

      {/* Out-of-area message */}
      <div className="space-y-2">
        <Label htmlFor="out-of-area">Out-of-Area Response</Label>
        <Textarea
          id="out-of-area"
          value={value.outOfAreaMessage}
          onChange={(e) => update({ outOfAreaMessage: e.target.value })}
          rows={3}
          placeholder="What your AI says when a caller is outside your area"
        />
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Your AI will say this to callers outside your coverage area.</span>
        </div>
      </div>
    </div>
  );
}
