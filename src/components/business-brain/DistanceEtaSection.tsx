import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Navigation, Clock, AlertCircle, Check } from "lucide-react";
import { useTenantDistanceSettings } from "@/hooks/useTenantDistanceSettings";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const ROUTE_PROFILES = [
  { value: "mapbox/driving-traffic", label: "Driving (with traffic)" },
  { value: "mapbox/driving", label: "Driving (no traffic)" },
  { value: "mapbox/walking", label: "Walking" },
  { value: "mapbox/cycling", label: "Cycling" },
];

const ROUNDING_OPTIONS = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
];

export function DistanceEtaSection() {
  const {
    settings,
    isLoading,
    isSaving,
    isGeocoding,
    toggleEnabled,
    setBaseLocationFromAddress,
    setRouteProfile,
    setEtaParams,
  } = useTenantDistanceSettings();

  const [addressInput, setAddressInput] = useState("");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Distance & ETA
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
            <Navigation className="h-5 w-5" />
            Distance & ETA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load distance settings.</p>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Distance & ETA
              {isEnabled && hasBaseLocation && (
                <Badge variant="secondary" className="ml-2">Active</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Configure distance-based travel time estimates for dispatch and delivery
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="distance-enabled" className="text-sm text-muted-foreground">
              {isEnabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="distance-enabled"
              checked={isEnabled}
              onCheckedChange={toggleEnabled}
              disabled={isSaving}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Base Location Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Base Location</h4>
          </div>

        {hasBaseLocation ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Check className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{settings.base_place_name || "Location set"}</p>
                <p className="text-xs text-muted-foreground">
                  {settings.base_lat?.toFixed(4)}, {settings.base_lng?.toFixed(4)}
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-muted-foreground">
                No base location set. Enter your business address below.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Enter business address (e.g., 123 Main St, City, ST 12345)"
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
                  Geocoding...
                </>
              ) : (
                "Set Location"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This is your business base for calculating travel time to customer addresses.
          </p>
        </div>

        <Separator />

        {/* Route Profile */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Routing Mode</h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Route Profile</Label>
              <Select
                value={settings.mapbox_route_profile}
                onValueChange={setRouteProfile}
                disabled={!isEnabled || isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUTE_PROFILES.map((profile) => (
                    <SelectItem key={profile.value} value={profile.value}>
                      {profile.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How travel time is calculated
              </p>
            </div>

            <div className="space-y-2">
              <Label>Provider</Label>
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                <span className="text-sm font-medium">Mapbox</span>
                <Badge variant="outline" className="text-xs">Default</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Powered by Mapbox Directions API
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* ETA Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h4 className="font-medium">ETA Calculation</h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="eta-base">Base Time (min)</Label>
              <Input
                id="eta-base"
                type="number"
                min={0}
                max={120}
                value={settings.eta_base_minutes}
                onChange={(e) => setEtaParams({ eta_base_minutes: parseInt(e.target.value) || 0 })}
                disabled={!isEnabled || isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Prep/response time
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eta-per-mile">Per Mile (min)</Label>
              <Input
                id="eta-per-mile"
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={settings.eta_per_mile_minutes ?? ""}
                onChange={(e) => setEtaParams({
                  eta_per_mile_minutes: e.target.value ? parseFloat(e.target.value) : null
                })}
                placeholder="Optional"
                disabled={!isEnabled || isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Extra time per mile
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eta-min">Min ETA (min)</Label>
              <Input
                id="eta-min"
                type="number"
                min={0}
                max={180}
                value={settings.eta_min_minutes ?? ""}
                onChange={(e) => setEtaParams({
                  eta_min_minutes: e.target.value ? parseInt(e.target.value) : null
                })}
                placeholder="No minimum"
                disabled={!isEnabled || isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Floor (optional)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eta-max">Max ETA (min)</Label>
              <Input
                id="eta-max"
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
                Cap (optional)
              </p>
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label>Round ETA to</Label>
            <Select
              value={String(settings.eta_rounding_minutes)}
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
            <p className="text-xs text-muted-foreground">
              Round up to nearest interval
            </p>
          </div>
        </div>

        {/* Status Summary */}
        {isEnabled && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm">
              <strong>Status:</strong>{" "}
              {hasBaseLocation ? (
                <span className="text-primary">
                  Distance-based ETA is active. Travel time will be included in dispatch and delivery estimates.
                </span>
              ) : (
                <span className="text-destructive">
                  Set a base location to enable distance-based ETA calculations.
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
