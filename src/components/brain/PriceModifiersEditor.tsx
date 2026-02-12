/**
 * Price Modifiers Editor
 * 
 * Allows businesses to define price adjustments based on:
 * - Vehicle/property size (detailing, cleaning, HVAC)
 * - Urgency (same-day, emergency)
 * - Time of day (after-hours, weekends)
 * - Custom factors
 * 
 * Industry-aware: Shows relevant modifier types based on business mode
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Loader2,
  Info,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Car,
  Clock,
  Zap,
  Settings2,
  DollarSign,
  Percent,
} from "lucide-react";
import { toast } from "sonner";

// Modifier type configuration
const MODIFIER_TYPES = {
  vehicle_size: {
    label: "Vehicle Size",
    icon: Car,
    description: "Price adjustments based on vehicle type (sedan, SUV, truck, etc.)",
    modes: ["service", "dispatch"],
    industries: ["detailing", "auto", "towing", "car_wash"],
    suggestions: [
      { name: "Sedan", adjustment: 0 },
      { name: "SUV/Crossover", adjustment: 25 },
      { name: "Truck", adjustment: 35 },
      { name: "Van/Minivan", adjustment: 30 },
      { name: "Large Truck/RV", adjustment: 75 },
    ],
  },
  property_size: {
    label: "Property Size",
    icon: Settings2,
    description: "Price adjustments based on property size or rooms",
    modes: ["service"],
    industries: ["cleaning", "hvac", "plumbing", "electrical", "landscaping"],
    suggestions: [
      { name: "Small (under 1,500 sqft)", adjustment: 0 },
      { name: "Medium (1,500-2,500 sqft)", adjustment: 50 },
      { name: "Large (2,500-4,000 sqft)", adjustment: 100 },
      { name: "Extra Large (4,000+ sqft)", adjustment: 175 },
    ],
  },
  urgency: {
    label: "Urgency",
    icon: Zap,
    description: "Surcharges for same-day or emergency service",
    modes: ["service", "dispatch", "medical", "sales"],
    industries: [],
    suggestions: [
      { name: "Same Day Service", adjustment: 50 },
      { name: "Emergency (2-4 hours)", adjustment: 100 },
      { name: "After Hours Emergency", adjustment: 150 },
    ],
  },
  time_of_day: {
    label: "Time of Day",
    icon: Clock,
    description: "Rate adjustments for after-hours or weekend work",
    modes: ["service", "dispatch", "sales"],
    industries: [],
    suggestions: [
      { name: "After Hours (6pm-8am)", adjustment: 50 },
      { name: "Weekend", adjustment: 35 },
      { name: "Holiday", adjustment: 75 },
    ],
  },
  equipment: {
    label: "Special Equipment",
    icon: Settings2,
    description: "Fees for specialized equipment or tools",
    modes: ["dispatch", "service"],
    industries: ["towing", "hvac", "plumbing", "electrical"],
    suggestions: [
      { name: "Flatbed Required", adjustment: 50 },
      { name: "Specialty Tools", adjustment: 25 },
      { name: "Heavy Equipment", adjustment: 100 },
    ],
  },
  complexity: {
    label: "Complexity",
    icon: Settings2,
    description: "Price adjustments for job difficulty",
    modes: ["service"],
    industries: [],
    suggestions: [
      { name: "Standard", adjustment: 0 },
      { name: "Complex", adjustment: 50 },
      { name: "Very Complex", adjustment: 100 },
    ],
  },
  custom: {
    label: "Custom Modifier",
    icon: Settings2,
    description: "Define your own price adjustment",
    modes: ["service", "dispatch", "food", "medical", "general", "sales"],
    industries: [],
    suggestions: [],
  },
};

type ModifierType = keyof typeof MODIFIER_TYPES;
type AdjustmentType = "fixed" | "percentage" | "multiplier";

interface PriceModifier {
  id: string;
  name: string;
  description: string | null;
  modifier_type: ModifierType;
  adjustment_type: AdjustmentType;
  adjustment_value: number;
  is_active: boolean;
  show_to_customer: boolean;
}

interface ModifierFormData {
  name: string;
  description: string;
  modifier_type: ModifierType;
  adjustment_type: AdjustmentType;
  adjustment_value: number;
  show_to_customer: boolean;
}

const defaultFormData: ModifierFormData = {
  name: "",
  description: "",
  modifier_type: "custom",
  adjustment_type: "fixed",
  adjustment_value: 0,
  show_to_customer: true,
};

export function PriceModifiersEditor() {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const { config: industryConfig } = useIndustryContext();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFormData, setNewFormData] = useState<ModifierFormData>(defaultFormData);
  const [editingFormData, setEditingFormData] = useState<Record<string, ModifierFormData>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingModifier, setDeletingModifier] = useState<PriceModifier | null>(null);
  const [selectedType, setSelectedType] = useState<ModifierType | null>(null);

  // Fetch modifiers
  const { data: modifiers, isLoading } = useQuery({
    queryKey: ["price-modifiers", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("price_modifiers")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("modifier_type")
        .order("display_order");
      if (error) throw error;
      return data as PriceModifier[];
    },
    enabled: !!tenant?.id,
  });

  // Get industry from tenant
  const tenantIndustry = tenant?.industry?.toLowerCase() || "";

  // Filter modifier types relevant to this business
  const relevantTypes = useMemo(() => {
    return Object.entries(MODIFIER_TYPES)
      .filter(([_, config]) => {
        // Check if mode matches
        if (!config.modes.includes(businessMode)) return false;
        // If no industry restrictions, show it
        if (config.industries.length === 0) return true;
        // Check if industry matches
        return config.industries.some(ind => 
          tenantIndustry.includes(ind) || ind.includes(tenantIndustry)
        );
      })
      .map(([key, config]) => ({ key: key as ModifierType, ...config }));
  }, [businessMode, tenantIndustry]);

  // Group modifiers by type
  const modifiersByType = useMemo(() => {
    const groups: Record<string, PriceModifier[]> = {};
    modifiers?.forEach(mod => {
      if (!groups[mod.modifier_type]) {
        groups[mod.modifier_type] = [];
      }
      groups[mod.modifier_type].push(mod);
    });
    return groups;
  }, [modifiers]);

  const formatAdjustment = (mod: PriceModifier | ModifierFormData) => {
    const value = mod.adjustment_value;
    switch (mod.adjustment_type) {
      case "fixed":
        return value >= 0 ? `+$${value}` : `-$${Math.abs(value)}`;
      case "percentage":
        return value >= 0 ? `+${value}%` : `${value}%`;
      case "multiplier":
        return `${value}x`;
    }
  };

  const handleSave = async (modifierId: string) => {
    if (!tenant?.id) return;
    const formData = editingFormData[modifierId];
    if (!formData?.name.trim()) return;

    setSavingId(modifierId);
    try {
      const { error } = await supabase
        .from("price_modifiers")
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          modifier_type: formData.modifier_type,
          adjustment_type: formData.adjustment_type,
          adjustment_value: formData.adjustment_value,
          show_to_customer: formData.show_to_customer,
        })
        .eq("id", modifierId)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      toast.success("Modifier updated");
      queryClient.invalidateQueries({ queryKey: ["price-modifiers"] });
      setExpandedId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    if (!tenant?.id || !newFormData.name.trim()) return;

    setSavingId("new");
    try {
      const { error } = await supabase
        .from("price_modifiers")
        .insert({
          tenant_id: tenant.id,
          name: newFormData.name.trim(),
          description: newFormData.description.trim() || null,
          modifier_type: newFormData.modifier_type,
          adjustment_type: newFormData.adjustment_type,
          adjustment_value: newFormData.adjustment_value,
          show_to_customer: newFormData.show_to_customer,
        });

      if (error) throw error;
      toast.success("Modifier added");
      queryClient.invalidateQueries({ queryKey: ["price-modifiers"] });
      setIsCreatingNew(false);
      setSelectedType(null);
      setNewFormData(defaultFormData);
    } catch (error: any) {
      toast.error(error.message || "Failed to create");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async () => {
    if (!tenant?.id || !deletingModifier) return;

    try {
      const { error } = await supabase
        .from("price_modifiers")
        .delete()
        .eq("id", deletingModifier.id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      toast.success("Modifier removed");
      queryClient.invalidateQueries({ queryKey: ["price-modifiers"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingModifier(null);
    }
  };

  const handleToggleActive = async (mod: PriceModifier) => {
    if (!tenant?.id) return;

    try {
      const { error } = await supabase
        .from("price_modifiers")
        .update({ is_active: !mod.is_active })
        .eq("id", mod.id)
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      toast.success(mod.is_active ? "Modifier disabled" : "Modifier enabled");
      queryClient.invalidateQueries({ queryKey: ["price-modifiers"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    }
  };

  const handleQuickAdd = (type: ModifierType, suggestion: { name: string; adjustment: number }) => {
    setNewFormData({
      name: suggestion.name,
      description: "",
      modifier_type: type,
      adjustment_type: "fixed",
      adjustment_value: suggestion.adjustment,
      show_to_customer: true,
    });
    setSelectedType(type);
    setIsCreatingNew(true);
  };

  const toggleExpanded = (id: string, mod: PriceModifier) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!editingFormData[id]) {
        setEditingFormData(prev => ({
          ...prev,
          [id]: {
            name: mod.name,
            description: mod.description || "",
            modifier_type: mod.modifier_type,
            adjustment_type: mod.adjustment_type,
            adjustment_value: mod.adjustment_value,
            show_to_customer: mod.show_to_customer,
          },
        }));
      }
    }
    setIsCreatingNew(false);
  };

  // Build AI preview
  const aiPreview = useMemo(() => {
    const activeModifiers = modifiers?.filter(m => m.is_active && m.show_to_customer) || [];
    if (activeModifiers.length === 0) return null;

    const vehicleSize = activeModifiers.find(m => m.modifier_type === "vehicle_size");
    const urgency = activeModifiers.find(m => m.modifier_type === "urgency");

    if (vehicleSize && urgency) {
      return `For an SUV with same-day service, that would be ${formatAdjustment(vehicleSize)} for the vehicle size and ${formatAdjustment(urgency)} for same-day.`;
    } else if (vehicleSize) {
      return `For an SUV, that would be ${formatAdjustment(vehicleSize)} extra.`;
    } else if (urgency) {
      return `For same-day service, there's a ${formatAdjustment(urgency)} surcharge.`;
    }
    return null;
  }, [modifiers]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading modifiers...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Form component for creating/editing
  const ModifierForm = ({
    formData,
    onChange,
    onSave,
    onCancel,
    isSaving,
    isNew = false,
  }: {
    formData: ModifierFormData;
    onChange: (field: keyof ModifierFormData, value: any) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
    isNew?: boolean;
  }) => (
    <div className="p-4 space-y-4 border-t bg-muted/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="e.g., SUV, Same Day, After Hours"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Modifier Type</Label>
          <Select
            value={formData.modifier_type}
            onValueChange={(v) => onChange("modifier_type", v)}
            disabled={!isNew}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {relevantTypes.map(type => (
                <SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Adjustment Type</Label>
          <Select
            value={formData.adjustment_type}
            onValueChange={(v) => onChange("adjustment_type", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="multiplier">Multiplier (x)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">
            {formData.adjustment_type === "fixed" && "Amount ($)"}
            {formData.adjustment_type === "percentage" && "Percentage (%)"}
            {formData.adjustment_type === "multiplier" && "Multiplier"}
          </Label>
          <div className="relative">
            {formData.adjustment_type === "fixed" && (
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            {formData.adjustment_type === "percentage" && (
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              type="number"
              step={formData.adjustment_type === "multiplier" ? "0.1" : "1"}
              value={formData.adjustment_value}
              onChange={(e) => onChange("adjustment_value", parseFloat(e.target.value) || 0)}
              className={formData.adjustment_type === "fixed" ? "pl-8" : ""}
              placeholder={formData.adjustment_type === "multiplier" ? "1.5" : "50"}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Preview</Label>
          <div className="h-10 flex items-center px-3 rounded-md border bg-muted/50">
            <span className="text-sm font-medium">{formatAdjustment(formData)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.show_to_customer}
            onCheckedChange={(v) => onChange("show_to_customer", v)}
          />
          <Label className="text-xs text-muted-foreground">AI mentions this to customers</Label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving || !formData.name.trim()}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            {isNew ? "Add Modifier" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">What are {industryConfig.pricing.priceModifiersLabel}?</p>
            <p className="text-sm text-muted-foreground">
              Modifiers let you adjust prices based on factors like vehicle size, urgency, or time of day. 
              When the AI quotes a price, it automatically applies relevant modifiers and explains them naturally.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Lightbulb className="h-4 w-4 text-warning shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Example:</strong> "For an SUV, that'll be $175 — that's $150 for the detail plus $25 for the larger vehicle."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Preview */}
      {aiPreview && (
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">How the AI uses modifiers</p>
              <p className="text-sm italic">"{aiPreview}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add by Type */}
      {!isCreatingNew && relevantTypes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Add Price Modifiers</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {relevantTypes.map(type => {
              const existingCount = modifiersByType[type.key]?.length || 0;
              const Icon = type.icon;
              
              return (
                <Card key={type.key} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{type.label}</h4>
                          {existingCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {existingCount} added
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                        
                        {type.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {type.suggestions.slice(0, 3).map(suggestion => (
                              <Button
                                key={suggestion.name}
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleQuickAdd(type.key, suggestion)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {suggestion.name}
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        {type.key === "custom" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={() => {
                              setNewFormData({ ...defaultFormData, modifier_type: "custom" });
                              setSelectedType("custom");
                              setIsCreatingNew(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Custom Modifier
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* New Modifier Form */}
      {isCreatingNew && (
        <Card>
          <div className="px-4 py-3 flex items-center gap-3 bg-primary/5 border-b">
            <Plus className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">
              New {selectedType ? MODIFIER_TYPES[selectedType].label : "Modifier"}
            </span>
          </div>
          <ModifierForm
            formData={newFormData}
            onChange={(field, value) => setNewFormData(prev => ({ ...prev, [field]: value }))}
            onSave={handleCreate}
            onCancel={() => {
              setIsCreatingNew(false);
              setSelectedType(null);
              setNewFormData(defaultFormData);
            }}
            isSaving={savingId === "new"}
            isNew
          />
        </Card>
      )}

      {/* Existing Modifiers */}
      {modifiers && modifiers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Your Modifiers</h3>
          <div className="space-y-2">
            {modifiers.map(mod => {
              const typeConfig = MODIFIER_TYPES[mod.modifier_type] || MODIFIER_TYPES.custom;
              const Icon = typeConfig.icon;
              const isExpanded = expandedId === mod.id;

              return (
                <Collapsible
                  key={mod.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(mod.id, mod)}
                >
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{mod.name}</span>
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {typeConfig.label}
                              </Badge>
                              {!mod.is_active && (
                                <Badge variant="outline" className="text-xs shrink-0">Disabled</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge
                            variant={mod.adjustment_value >= 0 ? "default" : "secondary"}
                            className="font-mono"
                          >
                            {formatAdjustment(mod)}
                          </Badge>
                          <Switch
                            checked={mod.is_active}
                            onCheckedChange={() => handleToggleActive(mod)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {editingFormData[mod.id] && (
                        <ModifierForm
                          formData={editingFormData[mod.id]}
                          onChange={(field, value) =>
                            setEditingFormData(prev => ({
                              ...prev,
                              [mod.id]: { ...prev[mod.id], [field]: value },
                            }))
                          }
                          onSave={() => handleSave(mod.id)}
                          onCancel={() => setExpandedId(null)}
                          isSaving={savingId === mod.id}
                        />
                      )}
                      <div className="px-4 pb-3 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeletingModifier(mod);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!modifiers || modifiers.length === 0) && !isCreatingNew && (
        <div className="text-center py-8 text-muted-foreground">
          <Settings2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No price modifiers configured yet</p>
          <p className="text-xs mt-1">Use the cards above to add modifiers for your business</p>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Modifier?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deletingModifier?.name}" from your pricing. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
