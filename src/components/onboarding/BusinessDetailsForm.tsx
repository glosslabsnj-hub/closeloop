import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export type LocationType = "single_shop" | "multiple_locations" | "mobile_only" | "shop_and_mobile";

export interface BusinessDetails {
  location: string;
  locationType: LocationType;
  teamSize: "solo" | "small" | "medium" | "large";
  yearsInBusiness: "new" | "1-3" | "3-10" | "10+";
  pricingPosition: "budget" | "mid" | "premium";
  expectedCallVolume: "1-5" | "5-20" | "20-50" | "50+";
  customerType: "residential" | "commercial" | "both";
}

export function getDefaultBusinessDetails(): BusinessDetails {
  return {
    location: "",
    locationType: "single_shop",
    teamSize: "solo",
    yearsInBusiness: "new",
    pricingPosition: "mid",
    expectedCallVolume: "1-5",
    customerType: "both",
  };
}

interface BusinessDetailsFormProps {
  businessMode: BusinessMode;
  value: BusinessDetails;
  onChange: (details: BusinessDetails) => void;
}

const locationTypeOptions = [
  { value: "single_shop", label: "Single Location", description: "One shop or office" },
  { value: "multiple_locations", label: "Multiple Locations", description: "Several offices/shops" },
  { value: "mobile_only", label: "Mobile Only", description: "You go to the customer" },
  { value: "shop_and_mobile", label: "Shop + Mobile", description: "Both shop and on-site" },
] as const;

const teamSizeOptions = [
  { value: "solo", label: "Solo Operator", description: "Just you" },
  { value: "small", label: "Small Team", description: "2-5 people" },
  { value: "medium", label: "Medium", description: "6-20 people" },
  { value: "large", label: "Large", description: "20+ people" },
] as const;

const yearsOptions = [
  { value: "new", label: "Just Starting" },
  { value: "1-3", label: "1-3 Years" },
  { value: "3-10", label: "3-10 Years" },
  { value: "10+", label: "10+ Years" },
] as const;

const pricingOptions = [
  { value: "budget", label: "Budget / Value", description: "Competitive pricing" },
  { value: "mid", label: "Mid-Range", description: "Fair market rates" },
  { value: "premium", label: "Premium", description: "Top-tier service & pricing" },
] as const;

const volumeOptions = [
  { value: "1-5", label: "1-5 / day" },
  { value: "5-20", label: "5-20 / day" },
  { value: "20-50", label: "20-50 / day" },
  { value: "50+", label: "50+ / day" },
] as const;

const customerTypeOptions = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "both", label: "Both" },
] as const;

export function BusinessDetailsForm({ businessMode, value, onChange }: BusinessDetailsFormProps) {
  const update = <K extends keyof BusinessDetails>(key: K, val: BusinessDetails[K]) => {
    onChange({ ...value, [key]: val });
  };

  const showCustomerType = businessMode !== "food" && businessMode !== "medical";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Tell us about your business
        </h2>
        <p className="mt-2 text-muted-foreground">
          These details help us customize your dashboard and AI behavior.
        </p>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="business-location">City, State or ZIP Code</Label>
        <Input
          id="business-location"
          placeholder="e.g. Austin, TX or 78701"
          value={value.location}
          onChange={(e) => update("location", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Used to set your default service area</p>
      </div>

      {/* Location Type */}
      <OptionGrid
        label="Location type"
        options={locationTypeOptions}
        value={value.locationType}
        onChange={(v) => update("locationType", v as BusinessDetails["locationType"])}
      />

      {/* Team Size */}
      <OptionGrid
        label="Team size"
        options={teamSizeOptions}
        value={value.teamSize}
        onChange={(v) => update("teamSize", v as BusinessDetails["teamSize"])}
      />

      {/* Years in Business */}
      <OptionGrid
        label="Years in business"
        options={yearsOptions}
        value={value.yearsInBusiness}
        onChange={(v) => update("yearsInBusiness", v as BusinessDetails["yearsInBusiness"])}
      />

      {/* Pricing Position */}
      <OptionGrid
        label="Pricing position"
        options={pricingOptions}
        value={value.pricingPosition}
        onChange={(v) => update("pricingPosition", v as BusinessDetails["pricingPosition"])}
      />

      {/* Expected Call Volume */}
      <OptionGrid
        label="Expected call volume"
        options={volumeOptions}
        value={value.expectedCallVolume}
        onChange={(v) => update("expectedCallVolume", v as BusinessDetails["expectedCallVolume"])}
      />

      {/* Customer Type */}
      {showCustomerType && (
        <OptionGrid
          label="Customer type"
          options={customerTypeOptions}
          value={value.customerType}
          onChange={(v) => update("customerType", v as BusinessDetails["customerType"])}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable option grid
// ---------------------------------------------------------------------------

function OptionGrid<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string; description?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <Card
            key={opt.value}
            className={cn(
              "cursor-pointer transition-all",
              value === opt.value
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50"
            )}
            onClick={() => onChange(opt.value)}
          >
            <CardContent className="p-3">
              <p className="text-sm font-medium">{opt.label}</p>
              {opt.description && (
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
