import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDispatchWorkflowConfig } from "@/hooks/useWorkflowConfig";
import type { DispatchWorkflowConfig } from "@/hooks/useWorkflowConfig";
import { AlertCircle, CheckCircle2, Loader2, Info, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const VEHICLE_FIELD_OPTIONS = ["year", "make", "model", "color", "vin"];
const PAYMENT_METHOD_OPTIONS = ["cash", "card", "check", "venmo", "zelle", "invoice"];

export default function DispatchWorkflowConfig() {
  const { config, isLoading, update, isUpdating } = useDispatchWorkflowConfig();
  const [localConfig, setLocalConfig] = useState<Partial<DispatchWorkflowConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local config when data loads
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  }, [config]);

  const handleUpdate = (field: keyof DispatchWorkflowConfig, value: any) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    update(localConfig);
    setHasChanges(false);
  };

  const handleReset = () => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  };

  const toggleArrayItem = (field: keyof DispatchWorkflowConfig, item: string) => {
    const currentArray = (localConfig[field] as string[]) || [];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    handleUpdate(field, newArray);
  };

  const addLuxuryBrand = (brand: string) => {
    const currentBrands = localConfig.luxury_brands || [];
    if (brand && !currentBrands.includes(brand)) {
      handleUpdate("luxury_brands", [...currentBrands, brand]);
    }
  };

  const removeLuxuryBrand = (brand: string) => {
    const currentBrands = localConfig.luxury_brands || [];
    handleUpdate("luxury_brands", currentBrands.filter((b) => b !== brand));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Bar */}
      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved changes</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Vehicle Collection Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information Collection</CardTitle>
          <CardDescription>
            Configure when and how to collect vehicle details from customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Vehicle Timing */}
          <div className="space-y-2">
            <Label>When to collect vehicle info</Label>
            <Select
              value={localConfig.vehicle_info_timing || "before_pricing"}
              onValueChange={(value) => handleUpdate("vehicle_info_timing", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before_pricing">
                  Before Pricing (affects quote calculation)
                </SelectItem>
                <SelectItem value="after_pricing">
                  After Pricing (just for driver notes)
                </SelectItem>
                <SelectItem value="optional">
                  Optional (only if service requires it)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localConfig.vehicle_info_timing === "before_pricing" && (
                <>
                  <Info className="inline h-3 w-3 mr-1" />
                  Agent will ask for vehicle type BEFORE calling pricing tools. Use this if vehicle
                  type affects your pricing (e.g., luxury vehicles, flatbed requirements).
                </>
              )}
              {localConfig.vehicle_info_timing === "after_pricing" && (
                <>
                  <Info className="inline h-3 w-3 mr-1" />
                  Agent will ask for vehicle details AFTER quoting price. Use this if you charge
                  flat rates regardless of vehicle type.
                </>
              )}
              {localConfig.vehicle_info_timing === "optional" && (
                <>
                  <Info className="inline h-3 w-3 mr-1" />
                  Agent will only collect vehicle info if the service type requires it (e.g.,
                  towing but not lockouts).
                </>
              )}
            </p>
          </div>

          {/* Vehicle Affects Pricing */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Vehicle type affects pricing</Label>
              <p className="text-sm text-muted-foreground">
                Enable if pricing varies by vehicle (luxury, oversized, etc.)
              </p>
            </div>
            <Switch
              checked={localConfig.vehicle_affects_pricing ?? true}
              onCheckedChange={(checked) => handleUpdate("vehicle_affects_pricing", checked)}
            />
          </div>

          {/* Required Fields */}
          <div className="space-y-2">
            <Label>Required vehicle fields</Label>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_FIELD_OPTIONS.map((field) => (
                <Badge
                  key={field}
                  variant={
                    (localConfig.required_vehicle_fields || []).includes(field)
                      ? "default"
                      : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleArrayItem("required_vehicle_fields", field)}
                >
                  {field}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to toggle which vehicle details the agent must collect
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Luxury Vehicle Protocols */}
      <Card>
        <CardHeader>
          <CardTitle>Luxury Vehicle Protocols</CardTitle>
          <CardDescription>
            Special handling for high-end vehicles that may require flatbed towing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Luxury Flatbed */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Recommend flatbed for luxury vehicles</Label>
              <p className="text-sm text-muted-foreground">
                Agent will suggest flatbed towing for luxury brands
              </p>
            </div>
            <Switch
              checked={localConfig.luxury_flatbed_recommendation ?? false}
              onCheckedChange={(checked) =>
                handleUpdate("luxury_flatbed_recommendation", checked)
              }
            />
          </div>

          {/* Luxury Brands */}
          {localConfig.luxury_flatbed_recommendation && (
            <div className="space-y-2">
              <Label>Luxury brands that trigger flatbed recommendation</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(localConfig.luxury_brands || []).map((brand) => (
                  <Badge key={brand} variant="secondary" className="gap-1">
                    {brand}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeLuxuryBrand(brand)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add brand (e.g., BMW, Mercedes)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addLuxuryBrand(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    const input = e.currentTarget.previousSibling as HTMLInputElement;
                    if (input?.value) {
                      addLuxuryBrand(input.value);
                      input.value = "";
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter or click Add to include a brand
              </p>
            </div>
          )}

          {/* AWD Detection */}
          {localConfig.luxury_flatbed_recommendation && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ask about all-wheel drive (AWD/4WD)</Label>
                <p className="text-sm text-muted-foreground">
                  Agent will ask if luxury vehicles have AWD before recommending flatbed
                </p>
              </div>
              <Switch
                checked={localConfig.awd_detection_enabled ?? false}
                onCheckedChange={(checked) => handleUpdate("awd_detection_enabled", checked)}
              />
            </div>
          )}

          {/* Motorcycle Handling */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Special motorcycle handling</Label>
              <p className="text-sm text-muted-foreground">
                Enable special protocols for motorcycle towing
              </p>
            </div>
            <Switch
              checked={localConfig.motorcycle_special_handling ?? false}
              onCheckedChange={(checked) => handleUpdate("motorcycle_special_handling", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Collection */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Collection</CardTitle>
          <CardDescription>Configure when and how to discuss payment with customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ask Payment Method */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ask about payment method</Label>
              <p className="text-sm text-muted-foreground">
                Enable to have agent discuss payment during booking
              </p>
            </div>
            <Switch
              checked={localConfig.ask_payment_method ?? true}
              onCheckedChange={(checked) => handleUpdate("ask_payment_method", checked)}
            />
          </div>

          {localConfig.ask_payment_method && (
            <>
              {/* Payment Timing */}
              <div className="space-y-2">
                <Label>When to collect payment</Label>
                <Select
                  value={localConfig.payment_timing || "on_arrival"}
                  onValueChange={(value) => handleUpdate("payment_timing", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upfront">Upfront (before dispatch)</SelectItem>
                    <SelectItem value="on_arrival">On Arrival (driver collects)</SelectItem>
                    <SelectItem value="invoiced">Invoiced (bill later)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Accepted Methods */}
              <div className="space-y-2">
                <Label>Accepted payment methods</Label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHOD_OPTIONS.map((method) => (
                    <Badge
                      key={method}
                      variant={
                        (localConfig.accepted_methods || []).includes(method)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer capitalize"
                      onClick={() => toggleArrayItem("accepted_methods", method)}
                    >
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Payment Message */}
              <div className="space-y-2">
                <Label>Payment due message</Label>
                <Textarea
                  value={localConfig.payment_due_message || ""}
                  onChange={(e) => handleUpdate("payment_due_message", e.target.value)}
                  placeholder="Driver will collect {{price}} when they arrive"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{"}
                  {"{"}price{"}"}{"}"}to insert the quoted amount
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Address Confirmation */}
      <Card>
        <CardHeader>
          <CardTitle>Address Confirmation</CardTitle>
          <CardDescription>
            Configure how the agent confirms locations with customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Confirm Geocoded */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Confirm geocoded address</Label>
              <p className="text-sm text-muted-foreground">
                Agent will read back the standardized address for confirmation
              </p>
            </div>
            <Switch
              checked={localConfig.confirm_geocoded_address ?? true}
              onCheckedChange={(checked) => handleUpdate("confirm_geocoded_address", checked)}
            />
          </div>

          {/* Require ZIP */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require ZIP code</Label>
              <p className="text-sm text-muted-foreground">
                Agent must collect ZIP code for all addresses
              </p>
            </div>
            <Switch
              checked={localConfig.require_zip_code ?? false}
              onCheckedChange={(checked) => handleUpdate("require_zip_code", checked)}
            />
          </div>

          {/* Confirmation Script */}
          <div className="space-y-2">
            <Label>Address confirmation script</Label>
            <Textarea
              value={localConfig.address_confirmation_script || ""}
              onChange={(e) => handleUpdate("address_confirmation_script", e.target.value)}
              placeholder="Got it, {{geocoded_address}} - is that correct?"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{"}
              {"{"}geocoded_address{"}"}{"}"}to insert the formatted address
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Driver Expectations */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Communication</CardTitle>
          <CardDescription>
            Set customer expectations for driver contact and arrival
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Driver Callback Script */}
          <div className="space-y-2">
            <Label>Driver callback script</Label>
            <Textarea
              value={localConfig.driver_callback_script || ""}
              onChange={(e) => handleUpdate("driver_callback_script", e.target.value)}
              placeholder="Our driver will call you when they're about 10 minutes away"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Tell customers when to expect a call from the driver
            </p>
          </div>

          {/* Include Direct Contact */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Provide driver direct contact info</Label>
              <p className="text-sm text-muted-foreground">
                Give customers a direct number to reach the driver
              </p>
            </div>
            <Switch
              checked={localConfig.include_direct_contact_info ?? false}
              onCheckedChange={(checked) => handleUpdate("include_direct_contact_info", checked)}
            />
          </div>

          {/* Escalation Number */}
          {localConfig.include_direct_contact_info && (
            <div className="space-y-2">
              <Label>Escalation/Direct contact number</Label>
              <Input
                type="tel"
                value={localConfig.escalation_number || ""}
                onChange={(e) => handleUpdate("escalation_number", e.target.value)}
                placeholder="(555) 123-4567"
              />
              <p className="text-xs text-muted-foreground">
                Number agent will provide for direct driver contact
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
