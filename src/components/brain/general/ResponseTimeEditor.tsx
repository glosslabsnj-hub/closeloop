/**
 * ResponseTimeEditor - General mode response time and callback settings
 * 
 * Manages callback targets, urgency tiers, and priority zones.
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Phone,
  Mail,
  Zap,
  Clock,
  MapPin,
  X,
  Plus,
} from "lucide-react";
import { AIPreviewCard } from "../AIPreviewCard";

interface ResponseTimeSettings {
  tenant_id: string;
  callback_target_minutes: number;
  callback_max_minutes: number;
  email_target_hours: number;
  email_max_hours: number;
  urgent_callback_minutes: number;
  urgent_surcharge_cents: number;
  after_hours_callback_mode: "next_day" | "within_hours" | "emergency_only";
  after_hours_target_minutes: number | null;
  priority_zip_codes: string[];
  priority_response_minutes: number;
}

const DEFAULT_SETTINGS: Omit<ResponseTimeSettings, "tenant_id"> = {
  callback_target_minutes: 60,
  callback_max_minutes: 240,
  email_target_hours: 24,
  email_max_hours: 48,
  urgent_callback_minutes: 15,
  urgent_surcharge_cents: 0,
  after_hours_callback_mode: "next_day",
  after_hours_target_minutes: null,
  priority_zip_codes: [],
  priority_response_minutes: 30,
};

export function ResponseTimeEditor() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<ResponseTimeSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newZip, setNewZip] = useState("");

  useEffect(() => {
    if (!tenant?.id) return;
    fetchSettings();
  }, [tenant?.id]);

  const fetchSettings = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("response_time_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ...data,
          priority_zip_codes: (data.priority_zip_codes as string[]) || [],
        } as ResponseTimeSettings);
      } else {
        setSettings({ ...DEFAULT_SETTINGS, tenant_id: tenant.id });
      }
    } catch (err) {
      console.error("Failed to fetch response time settings:", err);
      toast({ title: "Error", description: "Failed to load response settings", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant?.id || !settings) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("response_time_settings")
        .upsert({ ...settings, tenant_id: tenant.id }, { onConflict: "tenant_id" });

      if (error) throw error;
      toast({ title: "Saved", description: "Response settings updated" });
      setHasChanges(false);
    } catch (err) {
      console.error("Failed to save response time settings:", err);
      toast({ title: "Error", description: "Failed to save response settings", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (updates: Partial<ResponseTimeSettings>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
    setHasChanges(true);
  };

  const addPriorityZip = () => {
    if (!newZip || !settings) return;
    const trimmed = newZip.trim();
    if (/^\d{5}$/.test(trimmed) && !settings.priority_zip_codes.includes(trimmed)) {
      updateSettings({ priority_zip_codes: [...settings.priority_zip_codes, trimmed] });
    }
    setNewZip("");
  };

  const removePriorityZip = (zip: string) => {
    if (!settings) return;
    updateSettings({ priority_zip_codes: settings.priority_zip_codes.filter(z => z !== zip) });
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
    return `${hours}h ${mins}m`;
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const generateAIPreview = () => {
    const target = settings.callback_target_minutes;
    const _max = settings.callback_max_minutes;
    
    let response = `We typically respond within ${formatTime(target)}`;
    if (settings.urgent_callback_minutes < target) {
      response += `. For urgent matters, we can often call back within ${formatTime(settings.urgent_callback_minutes)}`;
    }
    return response + ".";
  };

  return (
    <div className="space-y-6">
      {/* Callback Response Times */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-500" />
            Callback Response Times
          </CardTitle>
          <CardDescription>
            How quickly you aim to return calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Target response time</Label>
              <Select
                value={String(settings.callback_target_minutes)}
                onValueChange={(v) => updateSettings({ callback_target_minutes: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">Same day</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Goal for most callbacks
              </p>
            </div>

            <div className="space-y-2">
              <Label>Maximum response time</Label>
              <Select
                value={String(settings.callback_max_minutes)}
                onValueChange={(v) => updateSettings({ callback_max_minutes: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">Same day</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Worst-case scenario
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urgent Requests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Urgent Requests
          </CardTitle>
          <CardDescription>
            Faster response for time-sensitive matters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Urgent callback target</Label>
              <Select
                value={String(settings.urgent_callback_minutes)}
                onValueChange={(v) => updateSettings({ urgent_callback_minutes: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Urgent fee ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={settings.urgent_surcharge_cents / 100}
                onChange={(e) => updateSettings({ 
                  urgent_surcharge_cents: Math.round(parseFloat(e.target.value || "0") * 100) 
                })}
              />
              <p className="text-xs text-muted-foreground">
                Extra charge for priority callbacks (0 = free)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* After-Hours Behavior */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-500" />
            After-Hours Behavior
          </CardTitle>
          <CardDescription>
            How callbacks work outside business hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>After-hours callback mode</Label>
            <Select
              value={settings.after_hours_callback_mode}
              onValueChange={(v) => updateSettings({ 
                after_hours_callback_mode: v as ResponseTimeSettings["after_hours_callback_mode"]
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next_day">Next business day</SelectItem>
                <SelectItem value="within_hours">Within specified time</SelectItem>
                <SelectItem value="emergency_only">Emergency only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.after_hours_callback_mode === "within_hours" && (
            <div className="space-y-2">
              <Label>After-hours target (minutes)</Label>
              <Input
                type="number"
                min="15"
                value={settings.after_hours_target_minutes ?? ""}
                onChange={(e) => updateSettings({ 
                  after_hours_target_minutes: e.target.value ? parseInt(e.target.value) : null 
                })}
                placeholder="e.g., 120"
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Zones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-500" />
            Priority Zones
          </CardTitle>
          <CardDescription>
            Faster response for specific areas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Priority ZIP codes</Label>
            <p className="text-xs text-muted-foreground">
              Callers from these ZIPs get faster callbacks
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {settings.priority_zip_codes.map((zip) => (
                <Badge key={zip} variant="secondary" className="gap-1 pr-1">
                  {zip}
                  <button
                    type="button"
                    onClick={() => removePriorityZip(zip)}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newZip}
                onChange={(e) => setNewZip(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPriorityZip())}
                placeholder="Enter ZIP code"
                maxLength={5}
                className="w-32"
              />
              <Button type="button" variant="outline" size="icon" onClick={addPriorityZip}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {settings.priority_zip_codes.length > 0 && (
            <div className="space-y-2">
              <Label>Priority response time</Label>
              <Select
                value={String(settings.priority_response_minutes)}
                onValueChange={(v) => updateSettings({ priority_response_minutes: parseInt(v) })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Response (optional) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-500" />
            Email Response
          </CardTitle>
          <CardDescription>
            Response time for email inquiries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Target (hours)</Label>
              <Input
                type="number"
                min="1"
                value={settings.email_target_hours}
                onChange={(e) => updateSettings({ 
                  email_target_hours: parseInt(e.target.value) || 24 
                })}
                className="w-24"
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum (hours)</Label>
              <Input
                type="number"
                min="1"
                value={settings.email_max_hours}
                onChange={(e) => updateSettings({ 
                  email_max_hours: parseInt(e.target.value) || 48 
                })}
                className="w-24"
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
