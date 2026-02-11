import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Phone, Mail, Webhook, Info, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CallbackSettings {
  sms_enabled: boolean;
  sms_recipient_phone: string;
  email_enabled: boolean;
  email_recipient: string;
  webhook_url: string;
  webhook_secret: string;
}

export function CallbackDeliverySettings() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = tenant?.id;

  const [settings, setSettings] = useState<CallbackSettings>({
    sms_enabled: false,
    sms_recipient_phone: "",
    email_enabled: false,
    email_recipient: "",
    webhook_url: "",
    webhook_secret: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["callback-delivery-settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from("callback_delivery_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (data) {
      setSettings({
        sms_enabled: data.sms_enabled ?? false,
        sms_recipient_phone: data.sms_recipient_phone ?? "",
        email_enabled: data.email_enabled ?? false,
        email_recipient: data.email_recipient ?? "",
        webhook_url: data.webhook_url ?? "",
        webhook_secret: data.webhook_secret ?? "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const payload = { tenant_id: tenantId, ...settings };
      const { error } = await supabase
        .from("callback_delivery_settings")
        .upsert(payload, { onConflict: "tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callback-delivery-settings"] });
      toast({ title: "Saved", description: "Callback notification settings updated." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to save", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="flex items-center gap-2 p-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> Callback Request Notifications</CardTitle>
        <CardDescription>Configure how you're notified when a caller requests a callback.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            When a caller asks for a callback, their request is saved automatically. Configure notifications below to be alerted in real time.
          </AlertDescription>
        </Alert>

        {/* SMS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> SMS Notification</Label>
            <Switch checked={settings.sms_enabled} onCheckedChange={(v) => setSettings(s => ({ ...s, sms_enabled: v }))} />
          </div>
          {settings.sms_enabled && (
            <Input
              placeholder="Recipient phone number"
              value={settings.sms_recipient_phone}
              onChange={(e) => setSettings(s => ({ ...s, sms_recipient_phone: e.target.value }))}
            />
          )}
        </div>

        {/* Email */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email Notification</Label>
            <Switch checked={settings.email_enabled} onCheckedChange={(v) => setSettings(s => ({ ...s, email_enabled: v }))} />
          </div>
          {settings.email_enabled && (
            <Input
              type="email"
              placeholder="Recipient email"
              value={settings.email_recipient}
              onChange={(e) => setSettings(s => ({ ...s, email_recipient: e.target.value }))}
            />
          )}
        </div>

        {/* Webhook */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2"><Webhook className="h-4 w-4" /> Webhook (Optional)</Label>
          <Input
            placeholder="https://your-crm.com/webhook"
            value={settings.webhook_url}
            onChange={(e) => setSettings(s => ({ ...s, webhook_url: e.target.value }))}
          />
          {settings.webhook_url && (
            <Input
              placeholder="Webhook secret (optional)"
              value={settings.webhook_secret}
              onChange={(e) => setSettings(s => ({ ...s, webhook_secret: e.target.value }))}
            />
          )}
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
