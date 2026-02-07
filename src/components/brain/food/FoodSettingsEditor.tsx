/**
 * Food Settings Editor
 * 
 * Comprehensive settings for food businesses:
 * - Delivery settings (fees, radius, minimums)
 * - Pickup settings (wait times, instructions)
 * - Order limits and restrictions
 * - Kitchen hours (if different from business hours)
 * - Peak time handling
 * - Tip suggestions
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2,
  Info,
  Lightbulb,
  Truck,
  ShoppingBag,
  Clock,
  DollarSign,
  Users,
  MapPin,
  Utensils,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface FoodOrderSettings {
  tenant_id: string;
  accepts_pickup: boolean;
  accepts_delivery: boolean;
  accepts_dine_in: boolean;
  delivery_radius_miles: number | null;
  delivery_minimum_cents: number | null;
  delivery_fee_cents: number | null;
  delivery_fee_type: "flat" | "distance" | "order_value" | null;
  delivery_fee_config: Record<string, any> | null;
  estimated_prep_minutes: number | null;
  peak_time_buffer_minutes: number | null;
  tip_suggestions: number[] | null;
  allows_special_instructions: boolean;
  max_order_items: number | null;
  accepts_catering: boolean;
  catering_min_guests: number | null;
  catering_lead_days: number | null;
  menu_notes: string | null;
  order_confirmation_mode: string | null;
}

const defaultSettings: Partial<FoodOrderSettings> = {
  accepts_pickup: true,
  accepts_delivery: false,
  accepts_dine_in: true,
  delivery_radius_miles: 5,
  delivery_minimum_cents: 1500,
  delivery_fee_cents: 500,
  delivery_fee_type: "flat",
  estimated_prep_minutes: 20,
  peak_time_buffer_minutes: 10,
  tip_suggestions: [15, 18, 20, 25],
  allows_special_instructions: true,
  max_order_items: null,
  accepts_catering: false,
  catering_min_guests: 10,
  catering_lead_days: 3,
};

export function FoodSettingsEditor() {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("ordering");
  const [isSaving, setIsSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState<Partial<FoodOrderSettings>>({});

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["food-order-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("food_order_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as FoodOrderSettings | null;
    },
    enabled: !!tenant?.id,
  });

  // Merge fetched with local edits
  const effectiveSettings = useMemo(() => ({
    ...defaultSettings,
    ...settings,
    ...localSettings,
  }), [settings, localSettings]);

  const updateSetting = <K extends keyof FoodOrderSettings>(key: K, value: FoodOrderSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!tenant?.id) return;
    
    setIsSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        ...effectiveSettings,
      };

      const { error } = await supabase
        .from("food_order_settings")
        .upsert(payload, { onConflict: "tenant_id" });

      if (error) throw error;
      
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["food-order-settings"] });
      setLocalSettings({});
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  // AI Preview
  const aiPreview = useMemo(() => {
    const parts: string[] = [];
    
    if (effectiveSettings.accepts_pickup && effectiveSettings.accepts_delivery) {
      parts.push("We offer both pickup and delivery");
    } else if (effectiveSettings.accepts_pickup) {
      parts.push("We're pickup only");
    } else if (effectiveSettings.accepts_delivery) {
      parts.push("We offer delivery");
    }
    
    if (effectiveSettings.accepts_delivery && effectiveSettings.delivery_minimum_cents) {
      parts.push(`with a $${(effectiveSettings.delivery_minimum_cents / 100).toFixed(0)} minimum`);
    }
    
    if (effectiveSettings.estimated_prep_minutes) {
      parts.push(`Orders take about ${effectiveSettings.estimated_prep_minutes} minutes to prepare`);
    }
    
    return parts.length > 0 
      ? parts.join(". ") + "."
      : "I can help you place an order for pickup or delivery.";
  }, [effectiveSettings]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium">What is this?</p>
            <p className="text-sm text-muted-foreground">
              Configure how customers can order from you. Set up <strong>delivery fees</strong>,
              <strong>pickup options</strong>, <strong>prep times</strong>, and <strong>catering requirements</strong>.
              Your AI uses these to tell customers exactly how ordering works.
            </p>
          </div>
        </div>
      </div>

      {/* AI Preview */}
      <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <Utensils className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary mb-1">What the AI tells customers</p>
            <p className="text-sm italic">"{aiPreview}"</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 h-auto">
          <TabsTrigger value="ordering" className="text-xs py-2">
            <ShoppingBag className="h-3.5 w-3.5 mr-1" />
            Ordering
          </TabsTrigger>
          <TabsTrigger value="delivery" className="text-xs py-2">
            <Truck className="h-3.5 w-3.5 mr-1" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="timing" className="text-xs py-2">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Timing
          </TabsTrigger>
          <TabsTrigger value="catering" className="text-xs py-2">
            <Users className="h-3.5 w-3.5 mr-1" />
            Catering
          </TabsTrigger>
        </TabsList>

        {/* Ordering Options */}
        <TabsContent value="ordering" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="font-medium">Order Types</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Pickup Orders</p>
                      <p className="text-xs text-muted-foreground">Customers order ahead and pick up</p>
                    </div>
                  </div>
                  <Switch
                    checked={effectiveSettings.accepts_pickup}
                    onCheckedChange={(v) => updateSetting("accepts_pickup", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Delivery Orders</p>
                      <p className="text-xs text-muted-foreground">You deliver to customers</p>
                    </div>
                  </div>
                  <Switch
                    checked={effectiveSettings.accepts_delivery}
                    onCheckedChange={(v) => updateSetting("accepts_delivery", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Utensils className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Dine-In</p>
                      <p className="text-xs text-muted-foreground">Customers eat at your location</p>
                    </div>
                  </div>
                  <Switch
                    checked={effectiveSettings.accepts_dine_in}
                    onCheckedChange={(v) => updateSetting("accepts_dine_in", v)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Allow Special Instructions</Label>
                    <p className="text-xs text-muted-foreground">Let customers add notes to items</p>
                  </div>
                  <Switch
                    checked={effectiveSettings.allows_special_instructions}
                    onCheckedChange={(v) => updateSetting("allows_special_instructions", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Max Items Per Order</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="No limit"
                    value={effectiveSettings.max_order_items || ""}
                    onChange={(e) => updateSetting("max_order_items", e.target.value ? parseInt(e.target.value) : null)}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for no limit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Settings */}
        <TabsContent value="delivery" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="font-medium">Delivery Configuration</h4>

              {!effectiveSettings.accepts_delivery ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Enable delivery in the Ordering tab to configure these settings</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Delivery Radius</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={effectiveSettings.delivery_radius_miles || ""}
                          onChange={(e) => updateSetting("delivery_radius_miles", parseInt(e.target.value) || null)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">miles</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Minimum Order</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="5"
                          value={(effectiveSettings.delivery_minimum_cents || 0) / 100}
                          onChange={(e) => updateSetting("delivery_minimum_cents", Math.round(parseFloat(e.target.value) * 100) || null)}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Delivery Fee Type</Label>
                    <Select
                      value={effectiveSettings.delivery_fee_type || "flat"}
                      onValueChange={(v) => updateSetting("delivery_fee_type", v as any)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat Fee</SelectItem>
                        <SelectItem value="distance">Based on Distance</SelectItem>
                        <SelectItem value="order_value">Based on Order Value</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {effectiveSettings.delivery_fee_type === "flat" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Delivery Fee</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.50"
                          value={(effectiveSettings.delivery_fee_cents || 0) / 100}
                          onChange={(e) => updateSetting("delivery_fee_cents", Math.round(parseFloat(e.target.value) * 100) || null)}
                          className="w-24"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Customers within your delivery radius can order delivery.
                      The AI will explain your minimum order and delivery fees.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timing Settings */}
        <TabsContent value="timing" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="font-medium">Preparation & Wait Times</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Estimated Prep Time</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="5"
                      max="120"
                      step="5"
                      value={effectiveSettings.estimated_prep_minutes || ""}
                      onChange={(e) => updateSetting("estimated_prep_minutes", parseInt(e.target.value) || null)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Average time to prepare an order</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Peak Time Buffer</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">+</span>
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      step="5"
                      value={effectiveSettings.peak_time_buffer_minutes || ""}
                      onChange={(e) => updateSetting("peak_time_buffer_minutes", parseInt(e.target.value) || null)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Extra time during busy periods</p>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <Label className="text-sm">Tip Suggestions</Label>
                <div className="flex flex-wrap gap-2">
                  {(effectiveSettings.tip_suggestions || []).map((tip, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {tip}%
                      <button
                        onClick={() => {
                          const newTips = [...(effectiveSettings.tip_suggestions || [])];
                          newTips.splice(i, 1);
                          updateSetting("tip_suggestions", newTips);
                        }}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTip = prompt("Enter tip percentage (e.g., 20):");
                      if (newTip && !isNaN(parseInt(newTip))) {
                        updateSetting("tip_suggestions", [
                          ...(effectiveSettings.tip_suggestions || []),
                          parseInt(newTip)
                        ].sort((a, b) => a - b));
                      }
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Suggested tip percentages shown to customers
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Catering Settings */}
        <TabsContent value="catering" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Catering Services</h4>
                  <p className="text-sm text-muted-foreground">Accept large orders for events and groups</p>
                </div>
                <Switch
                  checked={effectiveSettings.accepts_catering}
                  onCheckedChange={(v) => updateSetting("accepts_catering", v)}
                />
              </div>

              {effectiveSettings.accepts_catering && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Minimum Guests</Label>
                      <Input
                        type="number"
                        min="1"
                        value={effectiveSettings.catering_min_guests || ""}
                        onChange={(e) => updateSetting("catering_min_guests", parseInt(e.target.value) || null)}
                        className="w-24"
                      />
                      <p className="text-xs text-muted-foreground">Smallest group you'll cater</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Advance Notice Required</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={effectiveSettings.catering_lead_days || ""}
                          onChange={(e) => updateSetting("catering_lead_days", parseInt(e.target.value) || null)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                      </div>
                      <p className="text-xs text-muted-foreground">How far ahead to book</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      The AI will collect catering inquiries with guest count, event date,
                      and menu preferences, then pass them to you for a custom quote.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      {hasChanges && (
        <div className="flex justify-end sticky bottom-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
