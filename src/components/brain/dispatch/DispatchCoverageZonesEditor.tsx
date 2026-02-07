/**
 * DispatchCoverageZonesEditor - Dispatch mode coverage zones and ETA settings
 * 
 * Manages distance-based zones, highway coverage, and ETA adjustments.
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenantDistanceSettings } from "@/hooks/useTenantDistanceSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
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
  Route,
  Clock,
  Gauge,
  Car,
  Mountain,
} from "lucide-react";
import { AIPreviewCard } from "../AIPreviewCard";

interface CoverageZone {
  id: string;
  tenant_id: string;
  zone_name: string;
  zone_type: "standard" | "highway" | "remote" | "premium";
  definition_type: "radius" | "zip" | "county" | "highway";
  min_miles: number;
  max_miles: number | null;
  zip_codes: string[];
  county_names: Array<{ name: string; state: string }>;
  highway_numbers: string[];
  base_rate_cents: number | null;
  per_mile_rate_cents: number | null;
  minimum_charge_cents: number | null;
  eta_base_minutes: number;
  eta_per_mile_minutes: number;
  is_active: boolean;
  available_24_7: boolean;
  priority_order: number;
}

const DEFAULT_ZONE: Omit<CoverageZone, "id" | "tenant_id"> = {
  zone_name: "",
  zone_type: "standard",
  definition_type: "radius",
  min_miles: 0,
  max_miles: 25,
  zip_codes: [],
  county_names: [],
  highway_numbers: [],
  base_rate_cents: null,
  per_mile_rate_cents: null,
  minimum_charge_cents: null,
  eta_base_minutes: 30,
  eta_per_mile_minutes: 2,
  is_active: true,
  available_24_7: true,
  priority_order: 0,
};

export function DispatchCoverageZonesEditor() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const { settings: distanceSettings, saveSettings: saveDistanceSettings, isLoading: distanceLoading } = useTenantDistanceSettings();
  
  const [zones, setZones] = useState<CoverageZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Partial<CoverageZone> | null>(null);

  useEffect(() => {
    if (!tenant?.id) return;
    fetchZones();
  }, [tenant?.id]);

  const fetchZones = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("dispatch_coverage_zones")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("priority_order");

      if (error) throw error;
      setZones((data || []).map((z: any) => ({
        ...z,
        county_names: Array.isArray(z.county_names) ? z.county_names : [],
      })) as CoverageZone[]);
    } catch (err) {
      console.error("Failed to fetch coverage zones:", err);
      toast({ title: "Error", description: "Failed to load coverage zones", variant: "destructive" });
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
        const { error } = await supabase.from("dispatch_coverage_zones").update(zoneData as any).eq("id", editingZone.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dispatch_coverage_zones").insert(zoneData as any);
        if (error) throw error;
      }

      await fetchZones();
      setZoneDialogOpen(false);
      setEditingZone(null);
      toast({ title: "Saved", description: "Coverage zone updated" });
    } catch (err) {
      console.error("Failed to save zone:", err);
      toast({ title: "Error", description: "Failed to save zone", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm("Delete this coverage zone?")) return;
    try {
      const { error } = await supabase.from("dispatch_coverage_zones").delete().eq("id", id);
      if (error) throw error;
      setZones(prev => prev.filter(z => z.id !== id));
      toast({ title: "Deleted", description: "Coverage zone removed" });
    } catch (err) {
      console.error("Failed to delete zone:", err);
      toast({ title: "Error", description: "Failed to delete zone", variant: "destructive" });
    }
  };

  const zoneTypeIcons: Record<string, React.ReactNode> = {
    standard: <MapPin className="h-4 w-4" />,
    highway: <Route className="h-4 w-4" />,
    remote: <Mountain className="h-4 w-4" />,
    premium: <Gauge className="h-4 w-4" />,
  };

  const zoneTypeLabels: Record<string, string> = {
    standard: "Standard",
    highway: "Highway/Interstate",
    remote: "Remote Area",
    premium: "Premium Zone",
  };

  if (isLoading || distanceLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const generateAIPreview = () => {
    const baseMinutes = distanceSettings?.eta_base_minutes || 30;
    const busyBuffer = (distanceSettings as any)?.busy_buffer_minutes || 10;
    const trafficBuffer = (distanceSettings as any)?.traffic_buffer_percent || 15;
    
    const minEta = baseMinutes;
    const maxEta = Math.round(baseMinutes * (1 + trafficBuffer / 100)) + busyBuffer;
    
    return `Based on your location, I'm showing an estimated arrival of ${minEta} to ${maxEta} minutes. This can vary depending on traffic conditions.`;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="eta" className="w-full">
        <TabsList className="grid grid-cols-2 h-auto">
          <TabsTrigger value="eta" className="text-xs py-2">
            <Clock className="h-3 w-3 mr-1" />
            ETA Settings
          </TabsTrigger>
          <TabsTrigger value="zones" className="text-xs py-2">
            <MapPin className="h-3 w-3 mr-1" />
            Coverage Zones
          </TabsTrigger>
        </TabsList>

        {/* ETA Settings Tab */}
        <TabsContent value="eta" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                ETA Calculation
              </CardTitle>
              <CardDescription>
                How arrival times are calculated and presented
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Base response time (minutes)</Label>
                  <Input
                    type="number"
                    min="5"
                    value={distanceSettings?.eta_base_minutes || 30}
                    onChange={(e) => saveDistanceSettings({ 
                      eta_base_minutes: parseInt(e.target.value) || 30 
                    })}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time before vehicle starts driving
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max ETA to quote (minutes)</Label>
                  <Input
                    type="number"
                    min="30"
                    value={(distanceSettings as any)?.max_eta_minutes || 120}
                    onChange={(e) => saveDistanceSettings({ 
                      max_eta_minutes: parseInt(e.target.value) || 120 
                    } as any)}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Beyond this, say "extended ETA"
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Busy time buffer (minutes)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[(distanceSettings as any)?.busy_buffer_minutes || 10]}
                    onValueChange={([v]) => saveDistanceSettings({ busy_buffer_minutes: v } as any)}
                    min={0}
                    max={30}
                    step={5}
                    className="flex-1"
                  />
                  <Badge variant="secondary" className="w-16 justify-center">
                    +{(distanceSettings as any)?.busy_buffer_minutes || 10} min
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Extra time added when you're busy (controlled by busyness slider)
                </p>
              </div>

              <div className="space-y-4">
                <Label>Traffic buffer (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[(distanceSettings as any)?.traffic_buffer_percent || 15]}
                    onValueChange={([v]) => saveDistanceSettings({ traffic_buffer_percent: v } as any)}
                    min={0}
                    max={50}
                    step={5}
                    className="flex-1"
                  />
                  <Badge variant="secondary" className="w-16 justify-center">
                    +{(distanceSettings as any)?.traffic_buffer_percent || 15}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Safety margin for traffic variability
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>ETA rounding</Label>
                <Select
                  value={(distanceSettings as any)?.eta_rounding_mode || "nearest_5"}
                  onValueChange={(v) => saveDistanceSettings({ eta_rounding_mode: v } as any)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nearest_5">Round to 5 minutes</SelectItem>
                    <SelectItem value="nearest_10">Round to 10 minutes</SelectItem>
                    <SelectItem value="nearest_15">Round to 15 minutes</SelectItem>
                    <SelectItem value="exact">Exact (no rounding)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How ETAs are spoken (e.g., "about 30 minutes" vs "27 minutes")
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="space-y-2">
                  <Label>Highway response (minutes faster)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={(distanceSettings as any)?.highway_response_faster_minutes || 10}
                    onChange={(e) => saveDistanceSettings({ 
                      highway_response_faster_minutes: parseInt(e.target.value) || 10 
                    } as any)}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Faster ETA for highway locations
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Remote area buffer (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={(distanceSettings as any)?.remote_area_buffer_minutes || 15}
                    onChange={(e) => saveDistanceSettings({ 
                      remote_area_buffer_minutes: parseInt(e.target.value) || 15 
                    } as any)}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Extra time for rural/remote areas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Zones Tab */}
        <TabsContent value="zones" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Coverage Zones
                  </CardTitle>
                  <CardDescription>
                    Define zones with different pricing and ETA rules
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
                  <p className="text-sm">No coverage zones configured</p>
                  <p className="text-xs">Use your service area settings, or add zones for custom pricing</p>
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
                        <div className="p-2 rounded-md bg-muted">
                          {zoneTypeIcons[zone.zone_type]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{zone.zone_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {zoneTypeLabels[zone.zone_type]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {zone.definition_type === "radius" && `${zone.min_miles}-${zone.max_miles || "∞"} miles`}
                            {zone.definition_type === "highway" && zone.highway_numbers.join(", ")}
                            {zone.definition_type === "zip" && `${zone.zip_codes.length} ZIP codes`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">
                            ~{zone.eta_base_minutes}+ min ETA
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
        </TabsContent>
      </Tabs>

      {/* AI Preview */}
      <AIPreviewCard 
        title="AI will say something like:" 
        preview={generateAIPreview()} 
      />

      {/* Zone Dialog */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZone?.id ? "Edit Zone" : "Add Coverage Zone"}</DialogTitle>
            <DialogDescription>Configure zone boundaries and ETA rules</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Zone name</Label>
              <Input
                value={editingZone?.zone_name || ""}
                onChange={(e) => setEditingZone(prev => ({ ...prev, zone_name: e.target.value }))}
                placeholder="e.g., Local, Extended, Highway I-95"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Zone type</Label>
                <Select
                  value={editingZone?.zone_type || "standard"}
                  onValueChange={(v) => setEditingZone(prev => ({ 
                    ...prev, 
                    zone_type: v as CoverageZone["zone_type"]
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="highway">Highway/Interstate</SelectItem>
                    <SelectItem value="remote">Remote Area</SelectItem>
                    <SelectItem value="premium">Premium Zone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Defined by</Label>
                <Select
                  value={editingZone?.definition_type || "radius"}
                  onValueChange={(v) => setEditingZone(prev => ({ 
                    ...prev, 
                    definition_type: v as CoverageZone["definition_type"]
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="radius">Distance (miles)</SelectItem>
                    <SelectItem value="highway">Highway numbers</SelectItem>
                    <SelectItem value="zip">ZIP codes</SelectItem>
                    <SelectItem value="county">Counties</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editingZone?.definition_type === "radius" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Min miles</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingZone?.min_miles ?? 0}
                    onChange={(e) => setEditingZone(prev => ({ 
                      ...prev, 
                      min_miles: parseFloat(e.target.value) || 0 
                    }))}
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

            {editingZone?.definition_type === "highway" && (
              <div className="space-y-2">
                <Label>Highway numbers (comma-separated)</Label>
                <Input
                  value={(editingZone?.highway_numbers || []).join(", ")}
                  onChange={(e) => setEditingZone(prev => ({ 
                    ...prev, 
                    highway_numbers: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  }))}
                  placeholder="I-95, US-1, SR-436"
                />
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Base ETA (minutes)</Label>
                <Input
                  type="number"
                  min="5"
                  value={editingZone?.eta_base_minutes ?? 30}
                  onChange={(e) => setEditingZone(prev => ({ 
                    ...prev, 
                    eta_base_minutes: parseInt(e.target.value) || 30 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Per-mile (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editingZone?.eta_per_mile_minutes ?? 2}
                  onChange={(e) => setEditingZone(prev => ({ 
                    ...prev, 
                    eta_per_mile_minutes: parseFloat(e.target.value) || 2 
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Available 24/7</Label>
              <Switch
                checked={editingZone?.available_24_7 ?? true}
                onCheckedChange={(checked) => setEditingZone(prev => ({ ...prev, available_24_7: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
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
    </div>
  );
}
