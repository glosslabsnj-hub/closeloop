/**
 * DistanceBasisSettings - Configure how distance is measured for pricing
 * 
 * This sets the tenant-level default for how pricing distance is calculated.
 * Individual services can override this setting.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, MapPin, Truck, Route, DollarSign, ShieldCheck } from "lucide-react";
import { useTenantDistanceSettings } from "@/hooks/useTenantDistanceSettings";

import { useState, useEffect } from "react";

type DistanceBasis = "tow_distance" | "dispatch_distance" | "total_trip" | "flat";
type DropoffCoverageMode = "none" | "same_area" | "extended";

interface DistanceBasisOption {
  value: DistanceBasis;
  label: string;
  description: string;
  icon: React.ReactNode;
  example: string;
}

const DISTANCE_BASIS_OPTIONS: DistanceBasisOption[] = [
  {
    value: "tow_distance",
    label: "Tow Distance",
    description: "Price based on how far we tow the vehicle",
    icon: (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <ArrowRight className="h-3 w-3" />
        <Truck className="h-3 w-3" />
      </div>
    ),
    example: "Pickup to dropoff location",
  },
  {
    value: "dispatch_distance",
    label: "Dispatch Distance",
    description: "Price based on how far we travel to reach you",
    icon: (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Truck className="h-3 w-3" />
        <ArrowRight className="h-3 w-3" />
        <MapPin className="h-3 w-3" />
      </div>
    ),
    example: "Our shop to pickup location",
  },
  {
    value: "total_trip",
    label: "Total Trip",
    description: "Price based on our entire round trip",
    icon: (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Route className="h-3 w-3" />
      </div>
    ),
    example: "Shop → pickup → dropoff",
  },
  {
    value: "flat",
    label: "Flat Rate",
    description: "Distance doesn't affect pricing",
    icon: (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <DollarSign className="h-3 w-3" />
      </div>
    ),
    example: "Same price regardless of distance",
  },
];

const DROPOFF_OPTIONS: { value: DropoffCoverageMode; label: string; description: string }[] = [
  {
    value: "none",
    label: "No Dropoff Check",
    description: "We'll tow anywhere the customer wants — no area restriction on the destination.",
  },
  {
    value: "same_area",
    label: "Same Service Area",
    description: "The dropoff must also be within our normal coverage radius. If it's outside, the AI will let them know.",
  },
  {
    value: "extended",
    label: "Extended Radius",
    description: "The dropoff can be further than our normal area, up to a max distance you set. Great for long-distance tows with a surcharge.",
  },
];

export function DistanceBasisSettings() {
  const { settings, isLoading, isSaving, saveSettings } = useTenantDistanceSettings();

  const [dropoffMaxMiles, setDropoffMaxMiles] = useState<number | null>(null);

  useEffect(() => {
    if (settings) {
      setDropoffMaxMiles(settings.dropoff_max_miles);
    }
  }, [settings]);

  const handleChange = async (value: string) => {
    await saveSettings({ default_distance_basis: value as DistanceBasis });
  };

  const dropoffMode = (settings?.dropoff_coverage_mode as DropoffCoverageMode) || "none";

  const handleDropoffModeChange = async (value: string) => {
    await saveSettings({ dropoff_coverage_mode: value as DropoffCoverageMode });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentValue = (settings?.default_distance_basis as DistanceBasis) || "tow_distance";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Choose how your AI calculates distance for pricing. This determines what number goes into your per-mile rates.
        </p>
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
          <p className="text-xs">
            <strong>Example:</strong> Customer is stranded 5 miles from your shop, needs a tow to a destination 10 miles away.
          </p>
          <ul className="text-xs text-muted-foreground mt-2 space-y-1">
            <li>• <strong>Tow Distance</strong> = 10 miles (pickup → destination)</li>
            <li>• <strong>Dispatch Distance</strong> = 5 miles (your shop → pickup)</li>
            <li>• <strong>Total Trip</strong> = 15 miles (shop → pickup → destination)</li>
          </ul>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Most towing businesses</strong> charge based on <strong>Tow Distance</strong> — how far the vehicle needs to be hauled. 
            Some businesses charge for the full round trip to account for their drive-out time.
          </p>
        </div>
      </div>

      <RadioGroup
        value={currentValue}
        onValueChange={handleChange}
        disabled={isSaving}
        className="grid gap-3"
      >
        {DISTANCE_BASIS_OPTIONS.map((option) => {
          const isSelected = currentValue === option.value;
          return (
            <Label
              key={option.value}
              htmlFor={option.value}
              className={`
                flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                ${isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                }
                ${isSaving ? "opacity-50 pointer-events-none" : ""}
              `}
            >
              <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{option.label}</span>
                  {option.icon}
                  {isSelected && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{option.description}</p>
                <p className="text-xs text-muted-foreground italic">
                  Example: {option.example}
                </p>
              </div>
            </Label>
          );
        })}
      </RadioGroup>

      <div className="rounded-lg border bg-muted/30 p-3 mt-4">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> This is your default for all services. You can override this on individual services if some use a different pricing method (e.g., flat rate for local tows, per-mile for long distance).
        </p>
      </div>

      {/* ── Dropoff Coverage ── */}
      <div className="mt-8 space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Dropoff Coverage Rules
          </h3>
          <p className="text-sm text-muted-foreground">
            Should your AI check whether the <strong>dropoff location</strong> is within your service area? This only applies to services that require a destination (like towing).
          </p>
        </div>

        <RadioGroup
          value={dropoffMode}
          onValueChange={handleDropoffModeChange}
          disabled={isSaving}
          className="grid gap-3"
        >
          {DROPOFF_OPTIONS.map((option) => {
            const isSelected = dropoffMode === option.value;
            return (
              <Label
                key={option.value}
                htmlFor={`dropoff-${option.value}`}
                className={`
                  flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }
                  ${isSaving ? "opacity-50 pointer-events-none" : ""}
                `}
              >
                <RadioGroupItem value={option.value} id={`dropoff-${option.value}`} className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {isSelected && (
                      <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </Label>
            );
          })}
        </RadioGroup>

        {dropoffMode === "extended" && (
          <div className="flex items-center gap-3 pl-8">
            <Label htmlFor="dropoff-max-miles" className="text-sm whitespace-nowrap">Max dropoff distance:</Label>
            <Input
              id="dropoff-max-miles"
              type="number"
              min={1}
              max={500}
              className="w-24"
              value={dropoffMaxMiles ?? ""}
              onChange={(e) => setDropoffMaxMiles(e.target.value ? Number(e.target.value) : null)}
              onBlur={() => {
                if (dropoffMaxMiles !== settings?.dropoff_max_miles) {
                  saveSettings({ dropoff_max_miles: dropoffMaxMiles });
                }
              }}
              disabled={isSaving}
            />
            <span className="text-sm text-muted-foreground">miles</span>
          </div>
        )}
      </div>
    </div>
  );
}
