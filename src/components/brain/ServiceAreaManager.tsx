import { useState, useEffect, KeyboardEvent } from "react";
import { useServiceArea, ServiceAreaConfig, CoverageMode, County, getServiceAreaSummary } from "@/hooks/useServiceArea";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  MapPin,
  Radius,
  Map,
  Hash,
  Layers,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { ServiceAreaGuidance } from "./guidance";
import { FieldHelper, SpeechReadyBadge } from "./guidance/SectionGuidanceCard";

interface ChipInputProps {
  label: string;
  description?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  variant?: "include" | "exclude";
}

function ChipInput({ label, description, values, onChange, placeholder, variant = "include" }: ChipInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addValue();
    }
  };

  const addValue = () => {
    const trimmed = inputValue.trim().replace(/,/g, "");
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputValue("");
    }
  };

  const removeValue = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  const badgeVariant = variant === "exclude" ? "destructive" : "secondary";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((value) => (
          <Badge key={value} variant={badgeVariant} className="gap-1 pr-1">
            {value}
            <button
              type="button"
              onClick={() => removeValue(value)}
              className="ml-1 hover:bg-white/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={addValue}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface CountyInputProps {
  label: string;
  description?: string;
  counties: County[];
  onChange: (counties: County[]) => void;
  variant?: "include" | "exclude";
}

function CountyInput({ label, description, counties, onChange, variant = "include" }: CountyInputProps) {
  const [countyName, setCountyName] = useState("");
  const [countyState, setCountyState] = useState("");

  const addCounty = () => {
    const name = countyName.trim();
    const state = countyState.trim().toUpperCase();
    if (name && state) {
      const exists = counties.some(
        (c) => c.name.toLowerCase() === name.toLowerCase() && c.state.toLowerCase() === state.toLowerCase()
      );
      if (!exists) {
        onChange([...counties, { name, state }]);
        setCountyName("");
        setCountyState("");
      }
    }
  };

  const removeCounty = (county: County) => {
    onChange(counties.filter((c) => !(c.name === county.name && c.state === county.state)));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCounty();
    }
  };

  const badgeVariant = variant === "exclude" ? "destructive" : "secondary";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex flex-wrap gap-2 mb-2">
        {counties.map((county, idx) => (
          <Badge key={`${county.name}-${county.state}-${idx}`} variant={badgeVariant} className="gap-1 pr-1">
            {county.name}, {county.state}
            <button
              type="button"
              onClick={() => removeCounty(county)}
              className="ml-1 hover:bg-white/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={countyName}
          onChange={(e) => setCountyName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="County name"
          className="flex-1"
        />
        <Input
          value={countyState}
          onChange={(e) => setCountyState(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="State"
          className="w-20"
          maxLength={2}
        />
        <Button type="button" variant="outline" size="icon" onClick={addCounty}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const modeIcons: Record<CoverageMode, React.ReactNode> = {
  radius: <Radius className="h-4 w-4" />,
  counties: <Map className="h-4 w-4" />,
  zips: <Hash className="h-4 w-4" />,
  hybrid: <Layers className="h-4 w-4" />,
};

const modeLabels: Record<CoverageMode, string> = {
  radius: "Radius from Base",
  counties: "Counties",
  zips: "ZIP Codes",
  hybrid: "Hybrid (Multiple Criteria)",
};

export function ServiceAreaManager() {
  const { serviceArea, isLoading, isSaving, saveServiceArea } = useServiceArea();
  const { businessMode } = useTenantConfig();
  const [formData, setFormData] = useState<ServiceAreaConfig>(serviceArea);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFormData(serviceArea);
  }, [serviceArea]);

  const updateForm = (updates: Partial<ServiceAreaConfig>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateBaseAddress = (updates: Partial<ServiceAreaConfig["base_address"]>) => {
    setFormData((prev) => ({
      ...prev,
      base_address: { ...prev.base_address, ...updates },
    }));
    setHasChanges(true);
  };

  const updateInclude = (updates: Partial<ServiceAreaConfig["include"]>) => {
    setFormData((prev) => ({
      ...prev,
      include: { ...prev.include, ...updates },
    }));
    setHasChanges(true);
  };

  const updateExclude = (updates: Partial<ServiceAreaConfig["exclude"]>) => {
    setFormData((prev) => ({
      ...prev,
      exclude: { ...prev.exclude, ...updates },
    }));
    setHasChanges(true);
  };

  const updateRestrictions = (updates: Partial<ServiceAreaConfig["restrictions"]>) => {
    setFormData((prev) => ({
      ...prev,
      restrictions: { ...prev.restrictions, ...updates },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await saveServiceArea(formData);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-muted-foreground mt-2">Loading service area...</p>
        </CardContent>
      </Card>
    );
  }

  const summary = getServiceAreaSummary(formData);
  const hasExclusions =
    formData.exclude.zips.length > 0 ||
    formData.exclude.counties.length > 0 ||
    formData.exclude.states.length > 0;

  return (
    <div className="space-y-6">
      {/* Guidance Card */}
      <ServiceAreaGuidance
        businessMode={businessMode}
        outOfAreaMessage={formData.notes}
        serviceAreaSummary={summary}
      />

      {/* Summary Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Current Coverage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1">
              {modeIcons[formData.mode]}
              {modeLabels[formData.mode]}
            </Badge>
            {hasExclusions && (
              <Badge variant="destructive" className="gap-1">
                <Ban className="h-3 w-3" />
                Has Exclusions
              </Badge>
            )}
            {formData.restrictions.no_cross_state_lines && formData.base_address.state && (
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {formData.base_address.state} Only
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">{summary}</p>
        </CardContent>
      </Card>

      {/* Main Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Service Area Configuration
          </CardTitle>
          <CardDescription>
            Define where your business provides services. Exclusions always override inclusions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Coverage Mode */}
          <div className="space-y-2">
            <Label>Coverage Mode</Label>
            <Select
              value={formData.mode}
              onValueChange={(value) => updateForm({ mode: value as CoverageMode })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="radius">
                  <div className="flex items-center gap-2">
                    <Radius className="h-4 w-4" />
                    Radius from Base Address
                  </div>
                </SelectItem>
                <SelectItem value="counties">
                  <div className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    Counties
                  </div>
                </SelectItem>
                <SelectItem value="zips">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    ZIP Codes
                  </div>
                </SelectItem>
                <SelectItem value="hybrid">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Hybrid (Multiple Criteria)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.mode === "radius" && "Serve customers within a specific distance from your base location"}
              {formData.mode === "counties" && "Serve specific counties by name"}
              {formData.mode === "zips" && "Serve specific ZIP codes"}
              {formData.mode === "hybrid" && "Combine multiple criteria - pass if ANY inclusion criterion is met"}
            </p>
          </div>

          <Separator />

          {/* Base Address - Required for radius, optional otherwise */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Base Address</Label>
              {(formData.mode === "radius" || formData.mode === "hybrid") && (
                <Badge variant="outline">Required for radius</Badge>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="line1">Street Address</Label>
                <Input
                  id="line1"
                  value={formData.base_address.line1}
                  onChange={(e) => updateBaseAddress({ line1: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.base_address.city}
                  onChange={(e) => updateBaseAddress({ city: e.target.value })}
                  placeholder="Springfield"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.base_address.state}
                    onChange={(e) => updateBaseAddress({ state: e.target.value.toUpperCase() })}
                    placeholder="IL"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={formData.base_address.zip}
                    onChange={(e) => updateBaseAddress({ zip: e.target.value })}
                    placeholder="62701"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Radius - Only for radius or hybrid mode */}
          {(formData.mode === "radius" || formData.mode === "hybrid") && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="radius">Service Radius (miles)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={formData.radius_miles ?? ""}
                  onChange={(e) => updateForm({ radius_miles: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="25"
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum distance from your base address
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Inclusions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <Label className="text-base font-medium">Include (Serve These Areas)</Label>
            </div>

            {(formData.mode === "counties" || formData.mode === "hybrid") && (
              <CountyInput
                label="Counties"
                description="Add counties you serve (e.g., Cook, IL)"
                counties={formData.include.counties}
                onChange={(counties) => updateInclude({ counties })}
                variant="include"
              />
            )}

            {(formData.mode === "zips" || formData.mode === "hybrid") && (
              <ChipInput
                label="ZIP Codes"
                description="Add ZIP codes you serve"
                values={formData.include.zips}
                onChange={(zips) => updateInclude({ zips })}
                placeholder="Enter ZIP code"
                variant="include"
              />
            )}

            {formData.mode === "hybrid" && (
              <ChipInput
                label="States"
                description="Add full states you serve (2-letter codes)"
                values={formData.include.states}
                onChange={(states) => updateInclude({ states: states.map((s) => s.toUpperCase()) })}
                placeholder="Enter state code (e.g., IL)"
                variant="include"
              />
            )}
          </div>

          <Separator />

          {/* Exclusions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              <Label className="text-base font-medium">Exclude (Do NOT Serve)</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Exclusions always override inclusions. Use this to carve out specific areas you don't serve.
            </p>

            <CountyInput
              label="Excluded Counties"
              description="Add counties you do NOT serve"
              counties={formData.exclude.counties}
              onChange={(counties) => updateExclude({ counties })}
              variant="exclude"
            />

            <ChipInput
              label="Excluded ZIP Codes"
              description="Add ZIP codes you do NOT serve"
              values={formData.exclude.zips}
              onChange={(zips) => updateExclude({ zips })}
              placeholder="Enter ZIP code to exclude"
              variant="exclude"
            />

            <ChipInput
              label="Excluded States"
              description="Add states you do NOT serve (2-letter codes)"
              values={formData.exclude.states}
              onChange={(states) => updateExclude({ states: states.map((s) => s.toUpperCase()) })}
              placeholder="Enter state code to exclude"
              variant="exclude"
            />
          </div>

          <Separator />

          {/* Restrictions */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Restrictions</Label>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="no-cross-state">Do Not Cross State Lines</Label>
                <p className="text-xs text-muted-foreground">
                  Only serve locations in your base state ({formData.base_address.state || "not set"})
                  {formData.include.states.length > 0 && " plus explicitly included states"}
                </p>
              </div>
              <Switch
                id="no-cross-state"
                checked={formData.restrictions.no_cross_state_lines}
                onCheckedChange={(checked) => updateRestrictions({ no_cross_state_lines: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Out-of-Area Message / Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notes">Out-of-Area Message</Label>
              <SpeechReadyBadge />
            </div>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateForm({ notes: e.target.value })}
              placeholder="e.g., It looks like you're outside our normal service area. I can take your details and have someone call you back with options—what's your ZIP code?"
              rows={3}
            />
            <FieldHelper
              usedWhen="A caller's location is outside your service area"
              sayItLike="It looks like you're outside our normal service area. I can take your details and have someone call you back."
              avoid="Error: radius limit exceeded (sounds robotic)"
              characterCount={formData.notes.length}
              characterWarning={240}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Service Area
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
