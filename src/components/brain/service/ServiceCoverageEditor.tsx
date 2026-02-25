/**
 * ServiceCoverageEditor - Service mode coverage and timing settings
 * 
 * Manages same-day service, travel buffers, and on-site duration settings.
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock,
  MapPin,
  Zap,
  Car,
  CalendarClock,
  Info,
} from "lucide-react";
import { AIPreviewCard } from "../AIPreviewCard";

interface ServiceCoverageSettings {
  tenant_id: string;
  same_day_radius_miles: number | null;
  same_day_enabled: boolean;
  same_day_cutoff_time: string | null;
  travel_buffer_minutes: number;
  buffer_mode: "fixed" | "distance_based" | "none";
  default_onsite_minutes: number;
  onsite_by_service_type: Record<string, number>;
  accepts_same_day_urgent: boolean;
  urgent_upcharge_percent: number;
  preferred_zip_priority: string[];
  avoid_traffic_hours: boolean;
}

const DEFAULT_SETTINGS: Omit<ServiceCoverageSettings, "tenant_id"> = {
  same_day_radius_miles: null,
  same_day_enabled: true,
  same_day_cutoff_time: "14:00",
  travel_buffer_minutes: 15,
  buffer_mode: "fixed",
  default_onsite_minutes: 60,
  onsite_by_service_type: {},
  accepts_same_day_urgent: true,
  urgent_upcharge_percent: 0,
  preferred_zip_priority: [],
  avoid_traffic_hours: false,
};

export function ServiceCoverageEditor() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<ServiceCoverageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!tenant?.id) return;
    fetchSettings();
  }, [tenant?.id]);

  const fetchSettings = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_coverage_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ...data,
          onsite_by_service_type: (data.onsite_by_service_type as Record<string, number>) || {},
          preferred_zip_priority: (data.preferred_zip_priority as string[]) || [],
        } as ServiceCoverageSettings);
      } else {
        setSettings({
          ...DEFAULT_SETTINGS,
          tenant_id: tenant.id,
        });
      }
    } catch (err) {
      console.error("Failed to fetch service coverage settings:", err);
      toast({
        title: "Error",
        description: "Failed to load coverage settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant?.id || !settings) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("service_coverage_settings")
        .upsert({
          ...settings,
          tenant_id: tenant.id,
        }, { onConflict: "tenant_id" });

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Coverage settings updated",
      });
      setHasChanges(false);
    } catch (err) {
      console.error("Failed to save service coverage settings:", err);
      toast({
        title: "Error",
        description: "Failed to save coverage settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (updates: Partial<ServiceCoverageSettings>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
    setHasChanges(true);
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatCutoffTime = (time: string | null) => {
    if (!time) return "2:00 PM";
    const [hours] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  const generateAIPreview = () => {
    const parts: string[] = [];
    
    if (settings.same_day_enabled) {
      parts.push(`I can often get someone out same-day`);
      if (settings.same_day_cutoff_time) {
        parts.push(`if you call before ${formatCutoffTime(settings.same_day_cutoff_time)}`);
      }
    }
    
    if (settings.accepts_same_day_urgent && settings.urgent_upcharge_percent > 0) {
      parts.push(`For emergencies, we do have a ${settings.urgent_upcharge_percent}% urgent service fee`);
    }
    
    if (settings.travel_buffer_minutes > 0) {
      parts.push(`I'll schedule about ${settings.travel_buffer_minutes} minutes between appointments for travel`);
    }
    
    return parts.length > 0 
      ? parts.join(". ") + "."
      : "Let me check our availability for your area.";
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="same-day" className="w-full">
        <TabsList className="grid grid-cols-3 h-auto">
          <TabsTrigger value="same-day" className="text-xs py-2">
            <Zap className="h-3 w-3 mr-1" />
            Same-Day
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="text-xs py-2">
            <CalendarClock className="h-3 w-3 mr-1" />
            Scheduling
          </TabsTrigger>
          <TabsTrigger value="travel" className="text-xs py-2">
            <Car className="h-3 w-3 mr-1" />
            Travel
          </TabsTrigger>
        </TabsList>

        {/* Same-Day Service Tab */}
        <TabsContent value="same-day" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Same-Day Service
              </CardTitle>
              <CardDescription>
                Configure when you can offer same-day appointments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5">
                  <Label>Same-day service available</Label>
                  <p className="text-xs text-muted-foreground">
                    AI will offer same-day appointments when available
                  </p>
                </div>
                <Switch
                  checked={settings.same_day_enabled}
                  onCheckedChange={(checked) => updateSettings({ same_day_enabled: checked })}
                />
              </div>

              {settings.same_day_enabled && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Same-day cutoff time</Label>
                      <Select
                        value={settings.same_day_cutoff_time || "14:00"}
                        onValueChange={(value) => updateSettings({ same_day_cutoff_time: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10:00">10:00 AM</SelectItem>
                          <SelectItem value="11:00">11:00 AM</SelectItem>
                          <SelectItem value="12:00">12:00 PM</SelectItem>
                          <SelectItem value="13:00">1:00 PM</SelectItem>
                          <SelectItem value="14:00">2:00 PM</SelectItem>
                          <SelectItem value="15:00">3:00 PM</SelectItem>
                          <SelectItem value="16:00">4:00 PM</SelectItem>
                          <SelectItem value="17:00">5:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        No same-day offers after this time
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Same-day radius (miles)</Label>
                      <Input
                        type="number"
                        value={settings.same_day_radius_miles ?? ""}
                        onChange={(e) => updateSettings({ 
                          same_day_radius_miles: e.target.value ? parseFloat(e.target.value) : null 
                        })}
                        placeholder="Leave blank for full area"
                      />
                      <p className="text-xs text-muted-foreground">
                        Limit same-day to closer customers
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label>Accept urgent/emergency same-day</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow rush jobs with upcharge
                      </p>
                    </div>
                    <Switch
                      checked={settings.accepts_same_day_urgent}
                      onCheckedChange={(checked) => updateSettings({ accepts_same_day_urgent: checked })}
                    />
                  </div>

                  {settings.accepts_same_day_urgent && (
                    <div className="space-y-2">
                      <Label>Urgent service upcharge (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={settings.urgent_upcharge_percent}
                        onChange={(e) => updateSettings({ 
                          urgent_upcharge_percent: parseFloat(e.target.value) || 0 
                        })}
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground">
                        Extra charge for rush/emergency same-day
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduling Tab */}
        <TabsContent value="scheduling" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Appointment Duration
              </CardTitle>
              <CardDescription>
                How long typical service appointments take
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default on-site duration (minutes)</Label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={settings.default_onsite_minutes}
                  onChange={(e) => updateSettings({ 
                    default_onsite_minutes: parseInt(e.target.value) || 60 
                  })}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Used for scheduling when service type isn't specified
                </p>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    You can set specific durations for each service type in your Services catalog.
                    This default is used when the AI doesn't know the exact service yet.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Travel Tab */}
        <TabsContent value="travel" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4 text-green-500" />
                Travel Buffer
              </CardTitle>
              <CardDescription>
                Time between appointments for travel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Buffer mode</Label>
                <Select
                  value={settings.buffer_mode}
                  onValueChange={(value) => updateSettings({ buffer_mode: value as "fixed" | "distance_based" | "none" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed buffer between appointments</SelectItem>
                    <SelectItem value="distance_based">Calculate based on distance</SelectItem>
                    <SelectItem value="none">No buffer (back-to-back)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.buffer_mode === "fixed" && (
                <div className="space-y-2">
                  <Label>Travel buffer (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={settings.travel_buffer_minutes}
                    onChange={(e) => updateSettings({ 
                      travel_buffer_minutes: parseInt(e.target.value) || 0 
                    })}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time added between appointments for travel
                  </p>
                </div>
              )}

              {settings.buffer_mode === "distance_based" && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Travel time will be automatically calculated using distance between appointments.
                    Requires Mapbox distance provider to be enabled.
                  </p>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5">
                  <Label>Avoid scheduling during traffic hours</Label>
                  <p className="text-xs text-muted-foreground">
                    Add extra buffer during peak traffic times (7-9am, 4-6pm)
                  </p>
                </div>
                <Switch
                  checked={settings.avoid_traffic_hours}
                  onCheckedChange={(checked) => updateSettings({ avoid_traffic_hours: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Preview */}
      <AIPreviewCard 
        title="AI will say something like:" 
        preview={generateAIPreview()} 
      />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
