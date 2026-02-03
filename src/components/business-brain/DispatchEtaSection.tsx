import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Clock,
  MapPin,
  Truck,
  ChevronDown,
  Navigation,
  Sparkles,
  AlertCircle,
  Check,
} from "lucide-react";
import { useTenantDistanceSettings } from "@/hooks/useTenantDistanceSettings";

const ROUNDING_OPTIONS = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
];

// Example scenarios for preview
const EXAMPLE_SCENARIOS = [
  { distance: 5, travelTime: 8, location: "Downtown (5 miles)" },
  { distance: 12, travelTime: 18, location: "Suburbs (12 miles)" },
  { distance: 25, travelTime: 35, location: "Edge of service area (25 miles)" },
];

export function DispatchEtaSection() {
  const {
    settings,
    isLoading,
    isSaving,
    isGeocoding,
    toggleEnabled,
    setBaseLocationFromAddress,
    setEtaParams,
  } = useTenantDistanceSettings();

  const [addressInput, setAddressInput] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(0);

  // Response time in minutes (default 30)
  const responseTime = settings?.eta_base_minutes ?? 30;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Response Time & ETA
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Response Time & ETA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load ETA settings.</p>
        </CardContent>
      </Card>
    );
  }

  const hasBaseLocation = settings.base_lat !== null && settings.base_lng !== null;
  const isEnabled = settings.distance_provider_enabled;

  const handleSetLocation = async () => {
    if (!addressInput.trim()) return;
    const success = await setBaseLocationFromAddress(addressInput);
    if (success) {
      setAddressInput("");
    }
  };

  // Calculate example ETAs
  const scenario = EXAMPLE_SCENARIOS[selectedScenario];
  const rawEta = responseTime + scenario.travelTime;
  const roundTo = settings.eta_rounding_minutes || 5;
  const roundedEta = Math.ceil(rawEta / roundTo) * roundTo;
  const displayEta = settings.eta_max_minutes && roundedEta > settings.eta_max_minutes
    ? settings.eta_max_minutes
    : Math.max(roundedEta, settings.eta_min_minutes || 0);

  // Generate spoken ETA
  const spokenEta = displayEta >= 60
    ? `about ${Math.floor(displayEta / 60)} hour${Math.floor(displayEta / 60) > 1 ? "s" : ""}${displayEta % 60 > 0 ? ` and ${displayEta % 60} minutes` : ""}`
    : `approximately ${displayEta} to ${displayEta + 5} minutes`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Response Time & ETA
              {isEnabled && hasBaseLocation && (
                <Badge variant="secondary" className="ml-2">Active</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Configure how the AI calculates and communicates arrival times
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="eta-enabled" className="text-sm text-muted-foreground">
              {isEnabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="eta-enabled"
              checked={isEnabled}
              onCheckedChange={toggleEnabled}
              disabled={isSaving}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Response Time Slider - Main Control */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Average Response Time</h4>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              How long does it typically take to dispatch a driver after receiving a call?
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">5 min</span>
                <span className="text-2xl font-bold text-primary">{responseTime} min</span>
                <span className="text-sm text-muted-foreground">120 min</span>
              </div>
              <Slider
                value={[responseTime]}
                onValueChange={([value]) => setEtaParams({ eta_base_minutes: value })}
                min={5}
                max={120}
                step={5}
                disabled={!isEnabled || isSaving}
                className="py-2"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              The AI will add travel time to this number when giving customers an ETA.
            </p>
          </div>
        </div>

        <Separator />

        {/* Base Location */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Your Business Location</h4>
          </div>

          {hasBaseLocation ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Check className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{settings.base_place_name || "Location set"}</p>
                <p className="text-xs text-muted-foreground">
                  Used to calculate travel time to customers
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddressInput(settings.base_place_name || "")}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Set your business address to enable distance-based ETA calculations.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Enter your business address..."
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              disabled={isSaving || isGeocoding}
              onKeyDown={(e) => e.key === "Enter" && handleSetLocation()}
            />
            <Button
              onClick={handleSetLocation}
              disabled={!addressInput.trim() || isSaving || isGeocoding}
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting...
                </>
              ) : (
                "Set"
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Live ETA Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="font-medium">ETA Example</h4>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {EXAMPLE_SCENARIOS.map((s, i) => (
              <Button
                key={i}
                variant={selectedScenario === i ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedScenario(i)}
                className="text-xs"
              >
                {s.distance} mi
              </Button>
            ))}
          </div>

          <div className="rounded-lg border bg-primary/5 border-primary/20 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Customer location:</span>
              <span className="font-medium">{scenario.location}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your response time:</span>
              <span>{responseTime} min</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Travel time:</span>
              <span>{scenario.travelTime} min</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quoted ETA:</span>
              <Badge variant="secondary" className="text-base px-3 py-1">
                ~{displayEta} min
              </Badge>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-sm italic text-muted-foreground">
                "{`We can have a driver to you in ${spokenEta}.`}"
              </p>
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>Advanced Options</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Round to nearest</Label>
                <Select
                  value={String(settings.eta_rounding_minutes || 5)}
                  onValueChange={(v) => setEtaParams({ eta_rounding_minutes: parseInt(v) })}
                  disabled={!isEnabled || isSaving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUNDING_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Minimum ETA (min)</Label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={settings.eta_min_minutes ?? ""}
                  onChange={(e) => setEtaParams({
                    eta_min_minutes: e.target.value ? parseInt(e.target.value) : null
                  })}
                  placeholder="No minimum"
                  disabled={!isEnabled || isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label>Maximum ETA (min)</Label>
                <Input
                  type="number"
                  min={0}
                  max={480}
                  value={settings.eta_max_minutes ?? ""}
                  onChange={(e) => setEtaParams({
                    eta_max_minutes: e.target.value ? parseInt(e.target.value) : null
                  })}
                  placeholder="No maximum"
                  disabled={!isEnabled || isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Say "over an hour" above this
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
