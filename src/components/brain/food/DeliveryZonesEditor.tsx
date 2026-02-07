/**
 * DeliveryZonesEditor - Food mode delivery zones with tiered fees
 * 
 * Manages delivery zones, fees per zone, and peak hour adjustments.
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Loader2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  DollarSign,
  Clock,
  Flame,
} from "lucide-react";
import { AIPreviewCard } from "../AIPreviewCard";

interface DeliveryZone {
  id: string;
  tenant_id: string;
  zone_name: string;
  zone_type: "radius" | "zip" | "neighborhood";
  min_miles: number;
  max_miles: number | null;
  zip_codes: string[];
  neighborhood_names: string[];
  delivery_fee_cents: number;
  minimum_order_cents: number;
  estimated_delivery_min_minutes: number;
  estimated_delivery_max_minutes: number;
  peak_fee_cents: number;
  peak_time_adjustment_minutes: number;
  is_active: boolean;
  priority_order: number;
}

interface PeakHour {
  id: string;
  tenant_id: string;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  prep_buffer_minutes: number;
  delivery_buffer_minutes: number;
  fee_adjustment_cents: number;
  is_active: boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_ZONE: Omit<DeliveryZone, "id" | "tenant_id"> = {
  zone_name: "",
  zone_type: "radius",
  min_miles: 0,
  max_miles: 5,
  zip_codes: [],
  neighborhood_names: [],
  delivery_fee_cents: 0,
  minimum_order_cents: 0,
  estimated_delivery_min_minutes: 30,
  estimated_delivery_max_minutes: 45,
  peak_fee_cents: 0,
  peak_time_adjustment_minutes: 10,
  is_active: true,
  priority_order: 0,
};

export function DeliveryZonesEditor() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Partial<DeliveryZone> | null>(null);
  const [peakDialogOpen, setPeakDialogOpen] = useState(false);
  const [editingPeak, setEditingPeak] = useState<Partial<PeakHour> | null>(null);

  useEffect(() => {
    if (!tenant?.id) return;
    fetchData();
  }, [tenant?.id]);

  const fetchData = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const [zonesRes, peakRes] = await Promise.all([
        supabase.from("delivery_zones").select("*").eq("tenant_id", tenant.id).order("priority_order"),
        supabase.from("peak_hours").select("*").eq("tenant_id", tenant.id).order("day_of_week"),
      ]);

      if (zonesRes.error) throw zonesRes.error;
      if (peakRes.error) throw peakRes.error;

      setZones((zonesRes.data || []) as DeliveryZone[]);
      setPeakHours((peakRes.data || []) as PeakHour[]);
    } catch (err) {
      console.error("Failed to fetch delivery settings:", err);
      toast({
        title: "Error",
        description: "Failed to load delivery zones",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveZone = async () => {
    if (!tenant?.id || !editingZone) return;
    setIsSaving(true);
    try {
      const zoneData = {
        ...editingZone,
        tenant_id: tenant.id,
      };

      if (editingZone.id) {
        const { error } = await supabase
          .from("delivery_zones")
          .update(zoneData as any)
          .eq("id", editingZone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("delivery_zones")
          .insert(zoneData as any);
        if (error) throw error;
      }

      await fetchData();
      setZoneDialogOpen(false);
      setEditingZone(null);
      toast({ title: "Saved", description: "Delivery zone updated" });
    } catch (err) {
      console.error("Failed to save zone:", err);
      toast({ title: "Error", description: "Failed to save zone", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm("Delete this delivery zone?")) return;
    try {
      const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
      if (error) throw error;
      setZones(prev => prev.filter(z => z.id !== id));
      toast({ title: "Deleted", description: "Delivery zone removed" });
    } catch (err) {
      console.error("Failed to delete zone:", err);
      toast({ title: "Error", description: "Failed to delete zone", variant: "destructive" });
    }
  };

  const handleSavePeak = async () => {
    if (!tenant?.id || !editingPeak) return;
    setIsSaving(true);
    try {
      const peakData = {
        ...editingPeak,
        tenant_id: tenant.id,
      };

      if (editingPeak.id) {
        const { error } = await supabase
          .from("peak_hours")
          .update(peakData as any)
          .eq("id", editingPeak.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("peak_hours")
          .insert(peakData as any);
        if (error) throw error;
      }

      await fetchData();
      setPeakDialogOpen(false);
      setEditingPeak(null);
      toast({ title: "Saved", description: "Peak hours updated" });
    } catch (err) {
      console.error("Failed to save peak hours:", err);
      toast({ title: "Error", description: "Failed to save peak hours", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const generateAIPreview = () => {
    if (zones.length === 0) {
      return "Let me check if we deliver to your area.";
    }
    
    const activeZones = zones.filter(z => z.is_active);
    if (activeZones.length === 0) {
      return "I'm sorry, we're not currently offering delivery.";
    }

    const firstZone = activeZones[0];
    const fee = firstZone.delivery_fee_cents > 0 
      ? `There's a ${formatCurrency(firstZone.delivery_fee_cents)} delivery fee` 
      : "Delivery is free";
    const time = `${firstZone.estimated_delivery_min_minutes} to ${firstZone.estimated_delivery_max_minutes} minutes`;
    
    return `${fee} for your area. Estimated delivery time is ${time}.`;
  };

  return (
    <div className="space-y-6">
      {/* Delivery Zones */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Delivery Zones
              </CardTitle>
              <CardDescription>
                Set different fees and times by distance or area
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingZone({ ...DEFAULT_ZONE, priority_order: zones.length });
                setZoneDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Zone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No delivery zones configured</p>
              <p className="text-xs">Add zones to set up tiered delivery fees</p>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    zone.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{zone.zone_name}</span>
                        {!zone.is_active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {zone.zone_type === "radius" && `${zone.min_miles}-${zone.max_miles || "∞"} miles`}
                        {zone.zone_type === "zip" && `${zone.zip_codes.length} ZIP codes`}
                        {zone.zone_type === "neighborhood" && `${zone.neighborhood_names.length} neighborhoods`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {zone.delivery_fee_cents > 0 ? formatCurrency(zone.delivery_fee_cents) : "Free"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {zone.estimated_delivery_min_minutes}-{zone.estimated_delivery_max_minutes} min
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingZone(zone);
                          setZoneDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteZone(zone.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Peak Hours
              </CardTitle>
              <CardDescription>
                Adjust timing and fees during busy periods
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingPeak({
                  name: "",
                  day_of_week: 0,
                  start_time: "12:00",
                  end_time: "14:00",
                  prep_buffer_minutes: 10,
                  delivery_buffer_minutes: 10,
                  fee_adjustment_cents: 0,
                  is_active: true,
                });
                setPeakDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Peak Period
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {peakHours.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No peak hours configured</p>
              <p className="text-xs">Add peak periods for lunch/dinner rushes</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {peakHours.map((peak) => (
                <div
                  key={peak.id}
                  className={`p-3 rounded-lg border ${
                    peak.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{peak.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {DAY_NAMES[peak.day_of_week]} {peak.start_time}-{peak.end_time}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingPeak(peak);
                          setPeakDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {peak.fee_adjustment_cents > 0 && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      +{formatCurrency(peak.fee_adjustment_cents)} surge
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Preview */}
      <AIPreviewCard 
        title="AI will say something like:" 
        preview={generateAIPreview()} 
      />

      {/* Zone Dialog */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZone?.id ? "Edit Zone" : "Add Delivery Zone"}</DialogTitle>
            <DialogDescription>Configure delivery area and pricing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Zone name</Label>
              <Input
                value={editingZone?.zone_name || ""}
                onChange={(e) => setEditingZone(prev => ({ ...prev, zone_name: e.target.value }))}
                placeholder="e.g., Nearby, Extended, Far"
              />
            </div>

            <div className="space-y-2">
              <Label>Zone type</Label>
              <Select
                value={editingZone?.zone_type || "radius"}
                onValueChange={(v) => setEditingZone(prev => ({ ...prev, zone_type: v as "radius" | "zip" | "neighborhood" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="radius">Distance-based (miles)</SelectItem>
                  <SelectItem value="zip">ZIP codes</SelectItem>
                  <SelectItem value="neighborhood">Neighborhoods</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editingZone?.zone_type === "radius" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Min miles</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingZone?.min_miles ?? 0}
                    onChange={(e) => setEditingZone(prev => ({ ...prev, min_miles: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max miles</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingZone?.max_miles ?? ""}
                    onChange={(e) => setEditingZone(prev => ({ 
                      ...prev, 
                      max_miles: e.target.value ? parseFloat(e.target.value) : null 
                    }))}
                    placeholder="No limit"
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Delivery fee ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(editingZone?.delivery_fee_cents || 0) / 100}
                  onChange={(e) => setEditingZone(prev => ({ 
                    ...prev, 
                    delivery_fee_cents: Math.round(parseFloat(e.target.value || "0") * 100) 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum order ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(editingZone?.minimum_order_cents || 0) / 100}
                  onChange={(e) => setEditingZone(prev => ({ 
                    ...prev, 
                    minimum_order_cents: Math.round(parseFloat(e.target.value || "0") * 100) 
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min delivery time</Label>
                <Input
                  type="number"
                  min="5"
                  value={editingZone?.estimated_delivery_min_minutes ?? 30}
                  onChange={(e) => setEditingZone(prev => ({ 
                    ...prev, 
                    estimated_delivery_min_minutes: parseInt(e.target.value) || 30 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Max delivery time</Label>
                <Input
                  type="number"
                  min="5"
                  value={editingZone?.estimated_delivery_max_minutes ?? 45}
                  onChange={(e) => setEditingZone(prev => ({ 
                    ...prev, 
                    estimated_delivery_max_minutes: parseInt(e.target.value) || 45 
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Active</Label>
              <Switch
                checked={editingZone?.is_active ?? true}
                onCheckedChange={(checked) => setEditingZone(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZoneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveZone} disabled={isSaving || !editingZone?.zone_name}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Peak Hours Dialog */}
      <Dialog open={peakDialogOpen} onOpenChange={setPeakDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPeak?.id ? "Edit Peak Period" : "Add Peak Period"}</DialogTitle>
            <DialogDescription>Configure busy hour adjustments</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editingPeak?.name || ""}
                onChange={(e) => setEditingPeak(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Lunch Rush, Dinner Peak"
              />
            </div>

            <div className="space-y-2">
              <Label>Day of week</Label>
              <Select
                value={String(editingPeak?.day_of_week ?? 0)}
                onValueChange={(v) => setEditingPeak(prev => ({ ...prev, day_of_week: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((day, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start time</Label>
                <Input
                  type="time"
                  value={editingPeak?.start_time || "12:00"}
                  onChange={(e) => setEditingPeak(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End time</Label>
                <Input
                  type="time"
                  value={editingPeak?.end_time || "14:00"}
                  onChange={(e) => setEditingPeak(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Extra prep time (min)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editingPeak?.prep_buffer_minutes ?? 10}
                  onChange={(e) => setEditingPeak(prev => ({ 
                    ...prev, 
                    prep_buffer_minutes: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Extra delivery time (min)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editingPeak?.delivery_buffer_minutes ?? 10}
                  onChange={(e) => setEditingPeak(prev => ({ 
                    ...prev, 
                    delivery_buffer_minutes: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Surge fee ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={(editingPeak?.fee_adjustment_cents || 0) / 100}
                onChange={(e) => setEditingPeak(prev => ({ 
                  ...prev, 
                  fee_adjustment_cents: Math.round(parseFloat(e.target.value || "0") * 100) 
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Additional fee during this peak period
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Active</Label>
              <Switch
                checked={editingPeak?.is_active ?? true}
                onCheckedChange={(checked) => setEditingPeak(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeakDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePeak} disabled={isSaving || !editingPeak?.name}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Peak Hours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
