import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BellRing } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIndustryContext } from "@/hooks/useIndustryContext";

function defaultTemplate24h(label: string): string {
  return `Hi {{customer_name}}, this is a reminder that your {{service_name}} ${label} is tomorrow at {{time}}. Reply CONFIRM to confirm or call us to reschedule.`;
}
function defaultTemplate1h(label: string): string {
  return `Hi {{customer_name}}, your {{service_name}} ${label} is in about 1 hour at {{time}}. We look forward to seeing you!`;
}

// Detect uncustomized templates so we can regenerate with correct terminology
const DEFAULT_24H_PATTERN = /^Hi \{\{customer_name\}\}, this is a reminder that your \{\{service_name\}\} \w+ is tomorrow/;
const DEFAULT_1H_PATTERN = /^Hi \{\{customer_name\}\}, your \{\{service_name\}\} \w+ is in about 1 hour/;

function capitalize(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AppointmentReminderSettings() {
  const { tenant, assistantSettings } = useAuth();
  const { toast } = useToast();
  const { terminology } = useIndustryContext();
  const bookingLabel = capitalize(terminology.appointmentLabel);

  const apptLabel = terminology.appointmentLabel;
  const [enabled, setEnabled] = useState(false);
  const [template24h, setTemplate24h] = useState(defaultTemplate24h(apptLabel));
  const [template1h, setTemplate1h] = useState(defaultTemplate1h(apptLabel));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (assistantSettings?.settings_json) {
      const json = assistantSettings.settings_json as Record<string, any>;
      setEnabled(json.reminders_enabled ?? false);
      // If saved template matches uncustomized default, regenerate with correct terminology
      const saved24h = json.reminder_24h_template;
      const saved1h = json.reminder_1h_template;
      setTemplate24h(
        saved24h && !DEFAULT_24H_PATTERN.test(saved24h) ? saved24h : defaultTemplate24h(apptLabel)
      );
      setTemplate1h(
        saved1h && !DEFAULT_1H_PATTERN.test(saved1h) ? saved1h : defaultTemplate1h(apptLabel)
      );
    }
  }, [assistantSettings, apptLabel]);

  const handleSave = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    try {
      const existing = (assistantSettings?.settings_json as Record<string, any>) || {};
      const { error } = await supabase
        .from("assistant_settings")
        .update({
          settings_json: {
            ...existing,
            reminders_enabled: enabled,
            reminder_24h_template: template24h,
            reminder_1h_template: template1h,
          },
        })
        .eq("tenant_id", tenant.id);

      if (error) throw error;
      toast({ title: "Reminder settings saved!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to save", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  // Auto-save on toggle change
  useEffect(() => {
    if (tenant?.id && assistantSettings) {
      const timeoutId = setTimeout(handleSave, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [enabled]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          {bookingLabel} Reminders
        </CardTitle>
        <CardDescription>
          Automatically send text reminders to reduce no-shows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Enable Reminders</p>
            <p className="text-xs text-muted-foreground">
              Send automatic reminders 24h and 1h before each {terminology.appointmentLabel}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm">24-Hour Reminder Template</Label>
              <Textarea
                value={template24h}
                onChange={(e) => setTemplate24h(e.target.value)}
                onBlur={handleSave}
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Variables: {"{{customer_name}}"}, {"{{service_name}}"}, {"{{time}}"}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">1-Hour Reminder Template</Label>
              <Textarea
                value={template1h}
                onChange={(e) => setTemplate1h(e.target.value)}
                onBlur={handleSave}
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Variables: {"{{customer_name}}"}, {"{{service_name}}"}, {"{{time}}"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
