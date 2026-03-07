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

// Industry-specific default radius (miles) — based on typical service ranges
const INDUSTRY_RADIUS: Record<string, number> = {
  // Home services: typically drive 15-30 miles
  plumbing: 20, hvac: 25, electrical: 20, roofing: 25, painting: 15, flooring: 20,
  "pest-control": 25, pest_control: 25, cleaning: 15,
  "lawn-care": 10, lawn_care: 10,
  "general-contractor": 30, general_contractor: 30,
  "garage-door": 25, garage_door: 25,
  "appliance-repair": 20, appliance_repair: 20,
  "pool-service": 15, pool_service: 15,
  handyman: 15,
  // Auto services
  towing: 30, locksmith: 25,
  "mobile-mechanic": 20, mobile_mechanic: 20,
  auto_detailing: 15, "auto-detailing": 15,
  // Beauty/wellness (usually walk-in, but if mobile)
  "hair-salon": 5, hair_salon: 5, salon: 5,
  barbershop: 5,
  "nail-salon": 5, nail_salon: 5,
  massage: 10, massage_therapy: 10, "massage-therapy": 10,
  "personal-trainer": 10, personal_training: 10,
  "pet-grooming": 10, pet_grooming: 10,
  // Medical
  dental: 10, chiropractic: 10, veterinary: 15,
  // Food
  pizza: 8, "food-truck": 10, food_truck: 10, catering: 30, bakery: 8,
};

export function getDefaultServiceArea(mode: BusinessMode, industrySlug?: string): ServiceAreaConfig {
  const industryRadius = industrySlug ? INDUSTRY_RADIUS[industrySlug] : undefined;
  const radius = industryRadius ?? (mode === "dispatch" ? 30 : mode === "food" ? 10 : 25);
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
        <Label>How far do you travel to serve customers?</Label>
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
        <p className="text-xs text-muted-foreground">
          Your AI will ask callers for their location and check if they're within {value.radiusMiles} miles of your base.
        </p>
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
