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
import { Loader2, ArrowRight, MapPin, Truck, Route, DollarSign } from "lucide-react";
import { useTenantDistanceSettings } from "@/hooks/useTenantDistanceSettings";

type DistanceBasis = "tow_distance" | "dispatch_distance" | "total_trip" | "flat";

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

export function DistanceBasisSettings() {
  const { settings, isLoading, isSaving, saveSettings } = useTenantDistanceSettings();

  const handleChange = async (value: string) => {
    await saveSettings({ default_distance_basis: value as DistanceBasis });
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
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Most towing businesses charge based on how far the vehicle needs to be towed. 
          Choose what works best for your business.
        </p>
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
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{option.description}</p>
                <p className="text-xs text-muted-foreground italic">{option.example}</p>
              </div>
            </Label>
          );
        })}
      </RadioGroup>

      <p className="text-xs text-muted-foreground border-l-2 border-muted pl-3 mt-4">
        This becomes the default for all services. You can override this on individual services 
        if some use a different pricing method.
      </p>
    </div>
  );
}
