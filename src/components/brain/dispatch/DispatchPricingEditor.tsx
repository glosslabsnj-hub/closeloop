/**
 * Dispatch Pricing Editor
 * 
 * Comprehensive pricing controls for dispatch businesses:
 * - After-hours/weekend multipliers
 * - Equipment fees (flatbed, dolly, winch)
 * - Storage rates (daily, vehicle type)
 * - Gate/release fees
 * - Admin/documentation fees
 * - Emergency surcharges
 * - Mileage-based overrides
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Clock,
  Truck,
  Calendar,
  DollarSign,
  Settings2,
  Warehouse,
  FileText,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// Fee categories for dispatch businesses
const FEE_CATEGORIES = {
  time_based: {
    label: "Time-Based Rates",
    icon: Clock,
    description: "Adjust pricing based on when the job happens",
    fees: [
      { id: "after_hours", name: "After Hours (6pm-8am)", type: "multiplier", default: 1.5 },
      { id: "weekend", name: "Weekend Rate", type: "multiplier", default: 1.25 },
      { id: "holiday", name: "Holiday Rate", type: "multiplier", default: 2.0 },
      { id: "rush_hour", name: "Rush Hour (7-9am, 4-7pm)", type: "multiplier", default: 1.15 },
    ],
  },
  equipment: {
    label: "Equipment Fees",
    icon: Truck,
    description: "Additional charges for specialized equipment",
    fees: [
      { id: "flatbed", name: "Flatbed Truck", type: "fixed", default: 50 },
      { id: "dolly_set", name: "Dolly/Go-Jacks", type: "fixed", default: 35 },
      { id: "winch", name: "Winch Out", type: "fixed", default: 75 },
      { id: "lockout_kit", name: "Lockout Kit", type: "fixed", default: 0 },
      { id: "jump_start", name: "Jump Start Equipment", type: "fixed", default: 0 },
      { id: "tire_change", name: "Tire Change Equipment", type: "fixed", default: 0 },
      { id: "fuel_delivery", name: "Fuel Delivery Charge", type: "fixed", default: 10 },
    ],
  },
  storage: {
    label: "Storage Rates",
    icon: Warehouse,
    description: "Daily storage fees by vehicle type",
    fees: [
      { id: "storage_car", name: "Car/Sedan (daily)", type: "fixed", default: 35 },
      { id: "storage_suv", name: "SUV/Truck (daily)", type: "fixed", default: 45 },
      { id: "storage_motorcycle", name: "Motorcycle (daily)", type: "fixed", default: 20 },
      { id: "storage_rv", name: "RV/Large Vehicle (daily)", type: "fixed", default: 75 },
      { id: "storage_outdoor", name: "Outdoor Storage (daily)", type: "fixed", default: 25 },
      { id: "storage_covered", name: "Covered Storage (daily)", type: "fixed", default: 50 },
    ],
  },
  release: {
    label: "Release & Gate Fees",
    icon: FileText,
    description: "Fees for vehicle release and after-hours access",
    fees: [
      { id: "gate_fee", name: "Gate Fee", type: "fixed", default: 50 },
      { id: "after_hours_release", name: "After Hours Release", type: "fixed", default: 100 },
      { id: "weekend_release", name: "Weekend Release", type: "fixed", default: 75 },
      { id: "admin_fee", name: "Administrative Fee", type: "fixed", default: 35 },
      { id: "lien_processing", name: "Lien Processing", type: "fixed", default: 150 },
      { id: "police_hold_fee", name: "Police Hold Documentation", type: "fixed", default: 50 },
    ],
  },
  emergency: {
    label: "Emergency & Priority",
    icon: Zap,
    description: "Surcharges for urgent or special situations",
    fees: [
      { id: "emergency", name: "Emergency Response", type: "fixed", default: 100 },
      { id: "priority", name: "Priority Service", type: "fixed", default: 50 },
      { id: "accident_scene", name: "Accident Scene Cleanup", type: "fixed", default: 75 },
      { id: "police_request", name: "Police Requested Tow", type: "fixed", default: 0 },
      { id: "off_road_recovery", name: "Off-Road Recovery", type: "fixed", default: 150 },
      { id: "heavy_duty", name: "Heavy Duty Service", type: "fixed", default: 200 },
    ],
  },
  vehicle_type: {
    label: "Vehicle Type Adjustments",
    icon: Settings2,
    description: "Price adjustments based on vehicle size/type",
    fees: [
      { id: "motorcycle", name: "Motorcycle", type: "fixed", default: -25 },
      { id: "suv_crossover", name: "SUV/Crossover", type: "fixed", default: 25 },
      { id: "truck_pickup", name: "Pickup Truck", type: "fixed", default: 30 },
      { id: "van", name: "Van/Minivan", type: "fixed", default: 25 },
      { id: "commercial", name: "Commercial Vehicle", type: "fixed", default: 100 },
      { id: "rv_motorhome", name: "RV/Motorhome", type: "fixed", default: 150 },
      { id: "box_truck", name: "Box Truck", type: "fixed", default: 125 },
    ],
  },
};

type FeeCategory = keyof typeof FEE_CATEGORIES;

interface DispatchFee {
  id: string;
  tenant_id: string;
  fee_category: string;
  fee_key: string;
  fee_name: string;
  fee_type: "fixed" | "multiplier" | "percentage";
  fee_value: number;
  is_active: boolean;
  display_order: number;
  ai_speech_template: string | null;
}

export function DispatchPricingEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<FeeCategory>("time_based");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Fetch existing fees from tenant_distance_settings or create from price_modifiers
  const { data: distanceSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ["tenant-distance-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("tenant_distance_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  // Fetch price modifiers for this tenant (for equipment fees, etc.)
  const { data: modifiers, isLoading: loadingModifiers } = useQuery({
    queryKey: ["price-modifiers", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("price_modifiers")
        .select("*")
        .eq("tenant_id", tenant.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Build effective fees from settings and modifiers
  const effectiveFees = useMemo(() => {
    const fees: Record<string, { value: number; isActive: boolean; source: "settings" | "modifier" }> = {};
    
    // From distance settings
    if (distanceSettings) {
      if (distanceSettings.after_hours_multiplier) {
        fees["after_hours"] = { value: distanceSettings.after_hours_multiplier, isActive: true, source: "settings" };
      }
      // Weekend multiplier from settings
      if (distanceSettings.weekend_multiplier) {
        fees["weekend"] = { value: distanceSettings.weekend_multiplier, isActive: true, source: "settings" };
      }
    }
    
    // From price modifiers
    modifiers?.forEach(mod => {
      if (mod.modifier_type === "time_of_day" || mod.modifier_type === "urgency" || mod.modifier_type === "equipment") {
        const key = mod.name.toLowerCase().replace(/\s+/g, "_");
        fees[key] = {
          value: mod.adjustment_value,
          isActive: mod.is_active,
          source: "modifier",
        };
      }
    });
    
    return fees;
  }, [distanceSettings, modifiers]);

  const handleUpdateFee = async (category: FeeCategory, feeId: string, value: number, isActive: boolean) => {
    if (!tenant?.id) return;
    
    setSavingKey(feeId);
    try {
      const categoryConfig = FEE_CATEGORIES[category];
      const feeConfig = categoryConfig.fees.find(f => f.id === feeId);
      if (!feeConfig) return;

      // Determine adjustment type based on fee type
      const adjustmentType = feeConfig.type === "multiplier" ? "multiplier" : "fixed";
      
      // Check if modifier exists
      const existingMod = modifiers?.find(m => 
        m.name.toLowerCase().replace(/\s+/g, "_") === feeId ||
        m.name === feeConfig.name
      );

      if (existingMod) {
        // Update existing modifier
        const { error } = await supabase
          .from("price_modifiers")
          .update({
            adjustment_value: value,
            is_active: isActive,
          })
          .eq("id", existingMod.id)
          .eq("tenant_id", tenant.id);
        if (error) throw error;
      } else {
        // Create new modifier
        const { error } = await supabase
          .from("price_modifiers")
          .insert({
            tenant_id: tenant.id,
            name: feeConfig.name,
            modifier_type: category === "time_based" ? "time_of_day" : 
                          category === "emergency" ? "urgency" : 
                          category === "equipment" ? "equipment" : "custom",
            adjustment_type: adjustmentType,
            adjustment_value: value,
            is_active: isActive,
            show_to_customer: true,
          });
        if (error) throw error;
      }

      toast.success(`${feeConfig.name} updated`);
      queryClient.invalidateQueries({ queryKey: ["price-modifiers"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-distance-settings"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSavingKey(null);
    }
  };

  // AI Preview
  const aiPreview = useMemo(() => {
    const afterHours = effectiveFees["after_hours"];
    const flatbed = effectiveFees["flatbed"];
    
    if (afterHours?.isActive && flatbed?.isActive) {
      return `For an after-hours tow with flatbed, that's ${afterHours.value}x the base rate plus $${flatbed.value} for the flatbed.`;
    } else if (afterHours?.isActive) {
      return `After hours, that's ${afterHours.value}x the regular rate.`;
    } else if (flatbed?.isActive) {
      return `If we need to use the flatbed, that's an extra $${flatbed.value}.`;
    }
    return "I can explain our rates including any equipment fees or time-based surcharges.";
  }, [effectiveFees]);

  const isLoading = loadingSettings || loadingModifiers;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading pricing settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* Tabs for fee categories */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeeCategory)}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {Object.entries(FEE_CATEGORIES).map(([key, config]) => {
            const Icon = config.icon;
            const activeFees = config.fees.filter(f => effectiveFees[f.id]?.isActive).length;
            return (
              <TabsTrigger 
                key={key} 
                value={key}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{config.label.split(" ")[0]}</span>
                {activeFees > 0 && (
                  <Badge variant="secondary" className="h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                    {activeFees}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(FEE_CATEGORIES).map(([key, config]) => (
          <TabsContent key={key} value={key} className="mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">{config.label}</h4>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Show inactive</Label>
                    <Switch 
                      checked={showInactive}
                      onCheckedChange={setShowInactive}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {config.fees
                    .filter(fee => showInactive || effectiveFees[fee.id]?.isActive || !effectiveFees[fee.id])
                    .map(fee => {
                      const current = effectiveFees[fee.id];
                      const value = current?.value ?? fee.default;
                      const isActive = current?.isActive ?? false;
                      const isSaving = savingKey === fee.id;

                      return (
                        <div 
                          key={fee.id}
                          className={`flex items-center gap-4 p-3 rounded-lg border ${
                            isActive ? "bg-background" : "bg-muted/30 opacity-60"
                          }`}
                        >
                          <Switch
                            checked={isActive}
                            onCheckedChange={(checked) => handleUpdateFee(key as FeeCategory, fee.id, value, checked)}
                            disabled={isSaving}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{fee.name}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {fee.type === "multiplier" ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="0.05"
                                  min="1"
                                  max="5"
                                  value={value}
                                  onChange={(e) => {
                                    const newVal = parseFloat(e.target.value) || 1;
                                    handleUpdateFee(key as FeeCategory, fee.id, newVal, isActive);
                                  }}
                                  className="w-20 h-8 text-sm"
                                  disabled={isSaving || !isActive}
                                />
                                <span className="text-xs text-muted-foreground">×</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  step="5"
                                  min="-500"
                                  max="1000"
                                  value={value}
                                  onChange={(e) => {
                                    const newVal = parseFloat(e.target.value) || 0;
                                    handleUpdateFee(key as FeeCategory, fee.id, newVal, isActive);
                                  }}
                                  className="w-20 h-8 text-sm"
                                  disabled={isSaving || !isActive}
                                />
                              </div>
                            )}
                            
                            {isSaving && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Quick tip */}
                <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {key === "time_based" && "Multipliers apply to base service price. 1.5× means 50% more."}
                    {key === "equipment" && "Equipment fees are added on top of the service price."}
                    {key === "storage" && "Daily rates accumulate for each day the vehicle is stored."}
                    {key === "release" && "Release fees are charged when customers pick up their vehicle."}
                    {key === "emergency" && "Emergency fees are for urgent situations requiring immediate response."}
                    {key === "vehicle_type" && "Negative values give discounts; positive values add surcharges."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
