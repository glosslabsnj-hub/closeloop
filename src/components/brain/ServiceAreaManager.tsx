import { useState, useEffect, KeyboardEvent } from "react";
import { useServiceArea, ServiceAreaConfig, CoverageMode, County, getServiceAreaSummary } from "@/hooks/useServiceArea";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useAuth } from "@/contexts/AuthContext";
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

// Parse address string into components (e.g., "123 Main St, Springfield, IL 62701")
function parseAddressString(address: string | null | undefined): {
  line1: string;
  city: string;
  state: string;
  zip: string;
} {
  if (!address) return { line1: "", city: "", state: "", zip: "" };
  
  // Try to parse common formats
  const parts = address.split(",").map(p => p.trim());
  
  if (parts.length >= 3) {
    // Format: "123 Main St, City, State ZIP" or "123 Main St, City, State, ZIP"
    const line1 = parts[0];
    const city = parts[1];
    // Last part might be "State ZIP" or just "State"
    const lastPart = parts[parts.length - 1];
    const stateZipMatch = lastPart.match(/^([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/i);
    
    if (stateZipMatch) {
      return {
        line1,
        city,
        state: stateZipMatch[1].toUpperCase(),
        zip: stateZipMatch[2] || "",
      };
    }
    
    // If last part is just a ZIP
    if (/^\d{5}(-\d{4})?$/.test(lastPart)) {
      const statePart = parts[parts.length - 2];
      return {
        line1,
        city,
        state: statePart?.match(/^[A-Z]{2}$/i)?.[0]?.toUpperCase() || "",
        zip: lastPart,
      };
    }
    
    return { line1, city, state: lastPart.slice(0, 2).toUpperCase(), zip: "" };
  }
  
  if (parts.length === 2) {
    // Format: "123 Main St, City State ZIP"
    const line1 = parts[0];
    const rest = parts[1];
    const match = rest.match(/^(.+?)\s+([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/i);
    
    if (match) {
      return {
        line1,
        city: match[1].trim(),
        state: match[2].toUpperCase(),
        zip: match[3] || "",
      };
    }
    
    return { line1, city: rest, state: "", zip: "" };
  }
  
  // Single part - just use as line1
  return { line1: address, city: "", state: "", zip: "" };
}

export function ServiceAreaManager() {
  const { serviceArea, isLoading, isSaving, saveServiceArea } = useServiceArea();
  const { businessMode } = useTenantConfig();
  const { tenant } = useAuth();
  const [formData, setFormData] = useState<ServiceAreaConfig>(serviceArea);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Parse business identity address for preset option
  const businessIdentityAddress = parseAddressString(tenant?.address as string | null);
  const hasBusinessAddress = !!(
    businessIdentityAddress.line1 || 
    businessIdentityAddress.city || 
    businessIdentityAddress.state
  );

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
      {/* Compact coverage summary */}
      <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 shrink-0" />
        <span>{summary}</span>
        <Badge variant="outline" className="gap-1 text-xs">
          {modeIcons[formData.mode]}
          {modeLabels[formData.mode]}
        </Badge>
        {hasExclusions && (
          <Badge variant="destructive" className="gap-1 text-xs">
            <Ban className="h-3 w-3" />
            Exclusions
          </Badge>
        )}
      </div>

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
            <Label>How do you define your service area?</Label>
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
                    Miles from my location
                  </div>
                </SelectItem>
                <SelectItem value="counties">
                  <div className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    Specific counties
                  </div>
                </SelectItem>
                <SelectItem value="zips">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Specific ZIP codes
                  </div>
                </SelectItem>
                <SelectItem value="hybrid">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Combination of the above
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Base Address</Label>
                {(formData.mode === "radius" || formData.mode === "hybrid") && (
                  <Badge variant="outline">Required for radius</Badge>
                )}
              </div>
              {hasBusinessAddress && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateBaseAddress({
                      line1: businessIdentityAddress.line1,
                      city: businessIdentityAddress.city,
                      state: businessIdentityAddress.state,
                      zip: businessIdentityAddress.zip,
                    });
                  }}
                  className="gap-1 text-xs"
                >
                  <MapPin className="h-3 w-3" />
                  Use Business Address
                </Button>
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
                <Label htmlFor="no-cross-state">Stay within my state only</Label>
                <p className="text-xs text-muted-foreground">
                  AI will decline jobs across state lines (currently: {formData.base_address.state || "state not set"})
                  {formData.include.states.length > 0 && " — plus states you've explicitly included"}
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
            <Label htmlFor="notes">What should AI say when someone is outside your area?</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateForm({ notes: e.target.value })}
              placeholder="e.g., It looks like you're outside our normal service area. I can take your details and have someone call you back with options."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Write this naturally — your AI will say it when a caller's location is outside your coverage.
            </p>
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
