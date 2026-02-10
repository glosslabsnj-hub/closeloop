import { useLayoutEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Zap,
  Key,
  Fuel,
  CircleDot,
  Anchor,
  Plus,
  Trash2,
  DollarSign,
  Loader2,
  Info,
  Sparkles,
} from "lucide-react";
import { createService, updateService } from "@/lib/brain/writeBrainFact";
import {
  DISPATCH_SERVICE_PRESETS,
  DISPATCH_CATEGORIES,
  VEHICLE_TYPES,
  DISTANCE_BASIS_OPTIONS,
  type DispatchPricingConfig,
  type DistanceTier,
  type DistanceBasis,
  type DispatchServiceCategory,
  type DispatchServiceType,
  generatePricingSummary,
} from "@/types/dispatchPricing";

interface DispatchServiceFormData {
  name: string;
  description: string;
  duration_minutes: number;
  service_category: DispatchServiceCategory;
  service_type: DispatchServiceType | null;
  pricing_config: DispatchPricingConfig;
  price_amount: number | null;
  price_type: "fixed" | "starting_at" | "quote_only";
  requires_dropoff: boolean;
}

const defaultFormData: DispatchServiceFormData = {
  name: "",
  description: "",
  duration_minutes: 60,
  service_category: "uncategorized",
  service_type: null,
  pricing_config: {
    pricing_model: "flat",
    min_price: 0,
  },
  price_amount: null,
  price_type: "starting_at",
  requires_dropoff: true,
};

const PRESET_ICONS: Record<string, React.ReactNode> = {
  truck: <Truck className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  key: <Key className="h-5 w-5" />,
  fuel: <Fuel className="h-5 w-5" />,
  circle: <CircleDot className="h-5 w-5" />,
  anchor: <Anchor className="h-5 w-5" />,
};

interface DispatchServiceEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingService?: any;
  onSuccess?: () => void;
}

export function DispatchServiceEditor({
  open,
  onOpenChange,
  editingService,
  onSuccess,
}: DispatchServiceEditorProps) {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<DispatchServiceFormData>(defaultFormData);

  // IMPORTANT: This editor is controlled by the parent (open prop).
  // Radix Dialog does not always fire onOpenChange when parent toggles `open`,
  // so we must hydrate/reset the form in an effect.
  useLayoutEffect(() => {
    if (!open) return;

    setIsSaving(false);

    if (editingService) {
      const pricingConfig = editingService.pricing_config_json as DispatchPricingConfig | null;
      setFormData({
        name: editingService.name || "",
        description: editingService.description || "",
        duration_minutes: editingService.duration_minutes || 60,
        service_category: (editingService.service_category as DispatchServiceCategory) || "uncategorized",
        service_type: editingService.service_type || null,
        pricing_config: pricingConfig || { pricing_model: "flat", min_price: editingService.price_amount || 0 },
        price_amount: editingService.price_amount,
        price_type: editingService.price_type || "starting_at",
        requires_dropoff: editingService.requires_dropoff !== false,
      });
      setStep(2);
    } else {
      setFormData(defaultFormData);
      setStep(1);
    }
  }, [open, editingService]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset so the next open is always clean/hydrated by the effect above.
      setIsSaving(false);
      setFormData(defaultFormData);
      setStep(1);
    }
    onOpenChange(newOpen);
  };

  const applyPreset = (preset: typeof DISPATCH_SERVICE_PRESETS[0]) => {
    setFormData({
      ...formData,
      name: preset.name,
      description: preset.description,
      duration_minutes: preset.defaultDuration,
      service_category: preset.category,
      service_type: preset.type,
      pricing_config: preset.defaultPricingConfig,
      price_amount: preset.defaultPricingConfig.min_price || null,
      price_type: preset.defaultPricingConfig.pricing_model === "flat" ? "fixed" : "starting_at",
      requires_dropoff: preset.requires_dropoff,
    });
    setStep(2);
  };

  const addDistanceTier = () => {
    const tiers = formData.pricing_config.distance_tiers || [];
    const lastTier = tiers[tiers.length - 1];
    const newTier: DistanceTier = {
      min_miles: lastTier ? (lastTier.max_miles || 0) : 0,
      max_miles: lastTier ? (lastTier.max_miles || 0) + 10 : 10,
      base_price: lastTier?.base_price || 100,
      per_mile_price: 5,
    };
    setFormData({
      ...formData,
      pricing_config: {
        ...formData.pricing_config,
        distance_tiers: [...tiers, newTier],
      },
    });
  };

  const updateDistanceTier = (index: number, updates: Partial<DistanceTier>) => {
    const tiers = [...(formData.pricing_config.distance_tiers || [])];
    tiers[index] = { ...tiers[index], ...updates };
    setFormData({
      ...formData,
      pricing_config: {
        ...formData.pricing_config,
        distance_tiers: tiers,
      },
    });
  };

  const removeDistanceTier = (index: number) => {
    const tiers = formData.pricing_config.distance_tiers?.filter((_, i) => i !== index) || [];
    setFormData({
      ...formData,
      pricing_config: {
        ...formData.pricing_config,
        distance_tiers: tiers,
      },
    });
  };

  const handleSave = async () => {
    if (!tenant?.id || !formData.name.trim()) return;

    setIsSaving(true);
    try {
      // Cast pricing config to Record<string, unknown> for the API
      const pricingConfigForApi = formData.pricing_config as unknown as Record<string, unknown>;
      
      const serviceData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        duration_minutes: formData.duration_minutes,
        price_type: formData.price_type,
        price_amount: formData.price_amount || formData.pricing_config.min_price,
        service_category: formData.service_category,
        service_type: formData.service_type,
        pricing_config_json: pricingConfigForApi,
        requires_dropoff: formData.requires_dropoff,
      };

      if (editingService) {
        await updateService(editingService.id, tenant.id, serviceData);
        toast.success("Service updated successfully");
      } else {
        await createService(tenant.id, serviceData);
        toast.success("Service created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["business-context"] });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to save service");
    } finally {
      setIsSaving(false);
    }
  };

  const aiPreview = generatePricingSummary(formData.pricing_config, formData.name || "This service");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingService ? "Edit Service" : step === 1 ? "Choose a Service Type" : "Configure Service"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Start with a preset or create a custom service"
              : "Set up pricing and details for your service"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Choose Preset */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DISPATCH_SERVICE_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  onClick={() => applyPreset(preset)}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {PRESET_ICONS[preset.icon] || <Truck className="h-5 w-5" />}
                  </div>
                  <span className="font-medium text-sm">{preset.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {DISPATCH_CATEGORIES[preset.category]?.label.replace(" Services", "")}
                  </Badge>
                </button>
              ))}
            </div>

            <Separator />

            {/* Custom Service Option */}
            <Button
              variant="outline"
              className="w-full py-6"
              onClick={() => {
                setFormData(defaultFormData);
                setStep(2);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Service
            </Button>
          </div>
        )}

        {/* Step 2: Configure Service */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Service Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Local Tow"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What's included in this service..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.service_category}
                    onValueChange={(v) => setFormData({ ...formData, service_category: v as DispatchServiceCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DISPATCH_CATEGORIES)
                        .sort((a, b) => a[1].order - b[1].order)
                        .map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                    min={5}
                    step={5}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Requires Dropoff Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">This service requires a drop-off location</Label>
                <p className="text-xs text-muted-foreground">
                  Turn this on for towing services where the vehicle goes somewhere else. Leave off for on-site services like jumpstarts or lockouts.
                </p>
              </div>
              <Switch
                checked={formData.requires_dropoff}
                onCheckedChange={(checked) => setFormData({ ...formData, requires_dropoff: checked })}
              />
            </div>

            {/* Pricing Model */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h4 className="font-medium">Pricing</h4>
              </div>

              <div className="space-y-2">
                <Label>Pricing Model</Label>
                <Select
                  value={formData.pricing_config.pricing_model}
                  onValueChange={(v) => setFormData({
                    ...formData,
                    pricing_config: { ...formData.pricing_config, pricing_model: v as any },
                    price_type: v === "flat" ? "fixed" : v === "variable" ? "quote_only" : "starting_at",
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">
                      <div className="flex flex-col">
                        <span>Flat Rate</span>
                        <span className="text-xs text-muted-foreground">Same price regardless of distance</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="distance_tiered">
                      <div className="flex flex-col">
                        <span>Distance-Based</span>
                        <span className="text-xs text-muted-foreground">Price varies by mileage</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="variable">
                      <div className="flex flex-col">
                        <span>Quote Required</span>
                        <span className="text-xs text-muted-foreground">Needs assessment for pricing</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Flat Rate Pricing */}
              {formData.pricing_config.pricing_model === "flat" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      value={formData.pricing_config.min_price || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        pricing_config: { ...formData.pricing_config, min_price: parseFloat(e.target.value) || 0 },
                        price_amount: parseFloat(e.target.value) || null,
                      })}
                      placeholder="75.00"
                      step="0.01"
                    />
                  </div>

                  {/* Distance Surcharge */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Add distance surcharge beyond service area</Label>
                        <p className="text-xs text-muted-foreground">
                          Charge extra per mile if the customer is outside your normal range
                        </p>
                      </div>
                      <Switch
                        checked={!!(formData.pricing_config.included_miles && formData.pricing_config.overage_per_mile)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              pricing_config: {
                                ...formData.pricing_config,
                                included_miles: 25,
                                overage_per_mile: 3,
                              },
                            });
                          } else {
                            const { included_miles, overage_per_mile, ...rest } = formData.pricing_config;
                            setFormData({
                              ...formData,
                              pricing_config: rest as DispatchPricingConfig,
                            });
                          }
                        }}
                      />
                    </div>
                    {formData.pricing_config.included_miles != null && formData.pricing_config.overage_per_mile != null && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Included miles</Label>
                          <Input
                            type="number"
                            value={formData.pricing_config.included_miles}
                            onChange={(e) => setFormData({
                              ...formData,
                              pricing_config: { ...formData.pricing_config, included_miles: parseInt(e.target.value) || 0 },
                            })}
                            placeholder="25"
                            min={0}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Per-mile rate beyond ($)</Label>
                          <Input
                            type="number"
                            value={formData.pricing_config.overage_per_mile}
                            onChange={(e) => setFormData({
                              ...formData,
                              pricing_config: { ...formData.pricing_config, overage_per_mile: parseFloat(e.target.value) || 0 },
                            })}
                            placeholder="3.00"
                            step="0.01"
                            min={0}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Distance Tiered Pricing */}
              {formData.pricing_config.pricing_model === "distance_tiered" && (
                <div className="space-y-4">
                  {/* Distance Basis Selector */}
                  <div className="space-y-2">
                    <Label>Distance Measured From</Label>
                    <Select
                      value={formData.pricing_config.distance_basis || "default"}
                      onValueChange={(v) => setFormData({
                        ...formData,
                        pricing_config: { 
                          ...formData.pricing_config, 
                          distance_basis: v === "default" ? undefined : v as DistanceBasis 
                        },
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTANCE_BASIS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {!formData.pricing_config.distance_basis || formData.pricing_config.distance_basis === ("default" as any)
                        ? "This service will use your business-wide default distance setting."
                        : formData.pricing_config.distance_basis === "dispatch_distance" 
                        ? "Price will be based on how far we travel to reach the customer."
                        : formData.pricing_config.distance_basis === "total_trip"
                        ? "Price will be based on the entire trip distance (to customer + tow)."
                        : "Price will be based on how far the vehicle is towed (pickup to dropoff)."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Distance Tiers</Label>
                    <Button variant="outline" size="sm" onClick={addDistanceTier}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Tier
                    </Button>
                  </div>

                  {(formData.pricing_config.distance_tiers || []).map((tier, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">From (mi)</Label>
                          <Input
                            type="number"
                            value={tier.min_miles}
                            onChange={(e) => updateDistanceTier(index, { min_miles: parseInt(e.target.value) || 0 })}
                            min={0}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">To (mi)</Label>
                          <Input
                            type="number"
                            value={tier.max_miles ?? ""}
                            onChange={(e) => updateDistanceTier(index, {
                              max_miles: e.target.value ? parseInt(e.target.value) : null,
                            })}
                            placeholder="∞"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Base ($)</Label>
                          <Input
                            type="number"
                            value={tier.base_price}
                            onChange={(e) => updateDistanceTier(index, { base_price: parseFloat(e.target.value) || 0 })}
                            step="0.01"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Per Mile ($)</Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              value={tier.per_mile_price ?? ""}
                              onChange={(e) => updateDistanceTier(index, {
                                per_mile_price: e.target.value ? parseFloat(e.target.value) : undefined,
                              })}
                              placeholder="0"
                              step="0.01"
                            />
                            {(formData.pricing_config.distance_tiers?.length || 0) > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-destructive"
                                onClick={() => removeDistanceTier(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {(!formData.pricing_config.distance_tiers || formData.pricing_config.distance_tiers.length === 0) && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No distance tiers configured. Click "Add Tier" to get started.
                    </div>
                  )}

                  {/* Inline example */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-muted-foreground">
                      <strong>Example:</strong> If your base is $125 for 0-10 miles, then $5/mile after that,
                      create two tiers: one for 0-10 mi ($125 base, $0/mi) and one for 10+ mi ($125 base, $5/mi).
                    </div>
                  </div>
                </div>
              )}

              {/* Variable/Quote Pricing */}
              {formData.pricing_config.pricing_model === "variable" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Minimum Price ($)</Label>
                      <Input
                        type="number"
                        value={formData.pricing_config.min_price || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          pricing_config: { ...formData.pricing_config, min_price: parseFloat(e.target.value) || undefined },
                          price_amount: parseFloat(e.target.value) || null,
                        })}
                        placeholder="100"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Maximum Price ($)</Label>
                      <Input
                        type="number"
                        value={formData.pricing_config.max_price || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          pricing_config: { ...formData.pricing_config, max_price: parseFloat(e.target.value) || undefined },
                        })}
                        placeholder="500"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The AI will tell callers this service requires a custom quote within this price range.
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* AI Preview */}
            <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary mb-1">What the AI will say</p>
                  <p className="text-sm italic">"{aiPreview}"</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 2 && !editingService && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 2 && (
            <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingService ? "Update Service" : "Create Service"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
