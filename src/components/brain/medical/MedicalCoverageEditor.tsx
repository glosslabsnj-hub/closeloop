/**
 * MedicalCoverageEditor - Medical mode coverage and scheduling settings
 * 
 * Manages in-home visits, telehealth regions, and appointment buffers.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Save,
  Home,
  Video,
  Clock,
  Calendar,
  MapPin,
  Stethoscope,
  X,
  Plus,
} from "lucide-react";
import { AIPreviewCard } from "../AIPreviewCard";

interface MedicalCoverageSettings {
  tenant_id: string;
  offers_home_visits: boolean;
  home_visit_radius_miles: number | null;
  home_visit_fee_cents: number;
  home_visit_duration_minutes: number;
  offers_telehealth: boolean;
  telehealth_states: string[];
  telehealth_platforms: string[];
  standard_buffer_minutes: number;
  new_patient_extra_minutes: number;
  procedure_buffer_minutes: number;
  reserves_urgent_slots: boolean;
  urgent_slots_per_day: number;
  accepts_medicare: boolean;
  accepts_medicaid: boolean;
  in_network_insurers: string[];
  out_of_network_policy: string | null;
}

const DEFAULT_SETTINGS: Omit<MedicalCoverageSettings, "tenant_id"> = {
  offers_home_visits: false,
  home_visit_radius_miles: 15,
  home_visit_fee_cents: 0,
  home_visit_duration_minutes: 60,
  offers_telehealth: true,
  telehealth_states: [],
  telehealth_platforms: [],
  standard_buffer_minutes: 10,
  new_patient_extra_minutes: 15,
  procedure_buffer_minutes: 30,
  reserves_urgent_slots: true,
  urgent_slots_per_day: 2,
  accepts_medicare: true,
  accepts_medicaid: false,
  in_network_insurers: [],
  out_of_network_policy: null,
};

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

const COMMON_PLATFORMS = ["Zoom", "Doxy.me", "SimplePractice", "Teladoc", "Amwell", "Phone Call"];

export function MedicalCoverageEditor() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<MedicalCoverageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newState, setNewState] = useState("");
  const [newPlatform, setNewPlatform] = useState("");

  useEffect(() => {
    if (!tenant?.id) return;
    fetchSettings();
  }, [tenant?.id]);

  const fetchSettings = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("medical_coverage_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ...data,
          telehealth_states: (data.telehealth_states as string[]) || [],
          telehealth_platforms: (data.telehealth_platforms as string[]) || [],
          in_network_insurers: (data.in_network_insurers as string[]) || [],
        } as MedicalCoverageSettings);
      } else {
        setSettings({ ...DEFAULT_SETTINGS, tenant_id: tenant.id });
      }
    } catch (err) {
      console.error("Failed to fetch medical coverage settings:", err);
      toast({ title: "Error", description: "Failed to load coverage settings", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant?.id || !settings) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("medical_coverage_settings")
        .upsert({ ...settings, tenant_id: tenant.id }, { onConflict: "tenant_id" });

      if (error) throw error;
      toast({ title: "Saved", description: "Coverage settings updated" });
      setHasChanges(false);
    } catch (err) {
      console.error("Failed to save medical coverage settings:", err);
      toast({ title: "Error", description: "Failed to save coverage settings", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (updates: Partial<MedicalCoverageSettings>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
    setHasChanges(true);
  };

  const addState = (state: string) => {
    if (!state || !settings) return;
    const normalized = state.toUpperCase().trim();
    if (US_STATES.includes(normalized) && !settings.telehealth_states.includes(normalized)) {
      updateSettings({ telehealth_states: [...settings.telehealth_states, normalized] });
    }
    setNewState("");
  };

  const removeState = (state: string) => {
    if (!settings) return;
    updateSettings({ telehealth_states: settings.telehealth_states.filter(s => s !== state) });
  };

  const addPlatform = (platform: string) => {
    if (!platform || !settings) return;
    const trimmed = platform.trim();
    if (!settings.telehealth_platforms.includes(trimmed)) {
      updateSettings({ telehealth_platforms: [...settings.telehealth_platforms, trimmed] });
    }
    setNewPlatform("");
  };

  const removePlatform = (platform: string) => {
    if (!settings) return;
    updateSettings({ telehealth_platforms: settings.telehealth_platforms.filter(p => p !== platform) });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const generateAIPreview = () => {
    const parts: string[] = [];
    
    if (settings.offers_telehealth && settings.telehealth_states.length > 0) {
      parts.push(`We offer telehealth appointments for patients in ${settings.telehealth_states.slice(0, 3).join(", ")}${settings.telehealth_states.length > 3 ? " and other states" : ""}`);
    }
    
    if (settings.offers_home_visits) {
      const fee = settings.home_visit_fee_cents > 0 
        ? `There's a ${formatCurrency(settings.home_visit_fee_cents)} home visit fee` 
        : "Home visits are available";
      parts.push(fee);
    }
    
    if (settings.reserves_urgent_slots) {
      parts.push(`We do reserve a few same-day slots for urgent needs`);
    }
    
    return parts.length > 0 
      ? parts.join(". ") + "."
      : "Let me check what appointment options are available for you.";
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="telehealth" className="w-full">
        <TabsList className="grid grid-cols-3 h-auto">
          <TabsTrigger value="telehealth" className="text-xs py-2">
            <Video className="h-3 w-3 mr-1" />
            Telehealth
          </TabsTrigger>
          <TabsTrigger value="home-visits" className="text-xs py-2">
            <Home className="h-3 w-3 mr-1" />
            Home Visits
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="text-xs py-2">
            <Calendar className="h-3 w-3 mr-1" />
            Scheduling
          </TabsTrigger>
        </TabsList>

        {/* Telehealth Tab */}
        <TabsContent value="telehealth" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-500" />
                Telehealth Services
              </CardTitle>
              <CardDescription>
                Virtual appointment availability and platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5">
                  <Label>Offer telehealth appointments</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow virtual visits for appropriate cases
                  </p>
                </div>
                <Switch
                  checked={settings.offers_telehealth}
                  onCheckedChange={(checked) => updateSettings({ offers_telehealth: checked })}
                />
              </div>

              {settings.offers_telehealth && (
                <>
                  <div className="space-y-2">
                    <Label>Licensed states for telehealth</Label>
                    <p className="text-xs text-muted-foreground">
                      States where you're licensed to provide virtual care
                    </p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {settings.telehealth_states.map((state) => (
                        <Badge key={state} variant="secondary" className="gap-1 pr-1">
                          {state}
                          <button
                            type="button"
                            onClick={() => removeState(state)}
                            className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newState}
                        onChange={(e) => setNewState(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addState(newState))}
                        placeholder="Enter state code (e.g., CA)"
                        maxLength={2}
                        className="w-32"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => addState(newState)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Telehealth platforms</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {settings.telehealth_platforms.map((platform) => (
                        <Badge key={platform} variant="outline" className="gap-1 pr-1">
                          {platform}
                          <button
                            type="button"
                            onClick={() => removePlatform(platform)}
                            className="ml-1 hover:bg-muted rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_PLATFORMS.filter(p => !settings.telehealth_platforms.includes(p)).map((platform) => (
                        <Button
                          key={platform}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => addPlatform(platform)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {platform}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Home Visits Tab */}
        <TabsContent value="home-visits" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="h-4 w-4 text-green-500" />
                In-Home Visits
              </CardTitle>
              <CardDescription>
                Home visit availability and pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5">
                  <Label>Offer home visits</Label>
                  <p className="text-xs text-muted-foreground">
                    Provide in-home care for eligible patients
                  </p>
                </div>
                <Switch
                  checked={settings.offers_home_visits}
                  onCheckedChange={(checked) => updateSettings({ offers_home_visits: checked })}
                />
              </div>

              {settings.offers_home_visits && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Home visit radius (miles)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={settings.home_visit_radius_miles ?? ""}
                        onChange={(e) => updateSettings({ 
                          home_visit_radius_miles: e.target.value ? parseFloat(e.target.value) : null 
                        })}
                        placeholder="e.g., 15"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Home visit fee ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.home_visit_fee_cents / 100}
                        onChange={(e) => updateSettings({ 
                          home_visit_fee_cents: Math.round(parseFloat(e.target.value || "0") * 100) 
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Default home visit duration (minutes)</Label>
                    <Input
                      type="number"
                      min="15"
                      step="15"
                      value={settings.home_visit_duration_minutes}
                      onChange={(e) => updateSettings({ 
                        home_visit_duration_minutes: parseInt(e.target.value) || 60 
                      })}
                      className="w-32"
                    />
                  </div>
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
                <Clock className="h-4 w-4 text-purple-500" />
                Appointment Buffers
              </CardTitle>
              <CardDescription>
                Time between appointments for different scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Standard buffer</Label>
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={settings.standard_buffer_minutes}
                    onChange={(e) => updateSettings({ 
                      standard_buffer_minutes: parseInt(e.target.value) || 10 
                    })}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">Between appointments</p>
                </div>

                <div className="space-y-2">
                  <Label>New patient extra</Label>
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={settings.new_patient_extra_minutes}
                    onChange={(e) => updateSettings({ 
                      new_patient_extra_minutes: parseInt(e.target.value) || 15 
                    })}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">Added for new patients</p>
                </div>

                <div className="space-y-2">
                  <Label>Procedure buffer</Label>
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={settings.procedure_buffer_minutes}
                    onChange={(e) => updateSettings({ 
                      procedure_buffer_minutes: parseInt(e.target.value) || 30 
                    })}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">After procedures</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5">
                  <Label>Reserve same-day urgent slots</Label>
                  <p className="text-xs text-muted-foreground">
                    Keep slots open for urgent cases
                  </p>
                </div>
                <Switch
                  checked={settings.reserves_urgent_slots}
                  onCheckedChange={(checked) => updateSettings({ reserves_urgent_slots: checked })}
                />
              </div>

              {settings.reserves_urgent_slots && (
                <div className="space-y-2">
                  <Label>Urgent slots per day</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.urgent_slots_per_day}
                    onChange={(e) => updateSettings({ 
                      urgent_slots_per_day: parseInt(e.target.value) || 2 
                    })}
                    className="w-24"
                  />
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
