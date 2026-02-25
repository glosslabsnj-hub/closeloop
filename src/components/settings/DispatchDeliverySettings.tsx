import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Webhook, Mail, Phone, Info, Send, CheckCircle2, Truck, AlertCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DispatchDeliverySettingsData {
  tenant_id: string;
  enabled: boolean;
  handoff_methods: string[];
  webhook_url: string | null;
  webhook_secret: string | null;
  notify_email: string | null;
  notify_phone: string | null;
  urgent_sms_phone: string | null;
}

interface HandoffAttempt {
  id: string;
  method: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const HANDOFF_METHODS: Array<{
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  always?: boolean;
}> = [
  { id: "internal", label: "Flux Receptionist Dispatch Queue", icon: Truck, always: true },
  { id: "webhook", label: "Webhook", icon: Webhook, always: false },
  { id: "email", label: "Email", icon: Mail, always: false },
  { id: "sms", label: "SMS", icon: Phone, always: false },
];

export function DispatchDeliverySettings() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(true);
  const [methods, setMethods] = useState<string[]>(["internal"]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [urgentSmsPhone, setUrgentSmsPhone] = useState("");
  const [testingMethod, setTestingMethod] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["dispatch-delivery-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("dispatch_delivery_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as DispatchDeliverySettingsData | null;
    },
    enabled: !!tenant?.id,
  });

  // Fetch last handoff attempt for display
  const { data: lastAttempt } = useQuery({
    queryKey: ["last-dispatch-handoff", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("handoff_attempts")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("entity_type", "dispatch")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as HandoffAttempt | null;
    },
    enabled: !!tenant?.id,
  });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setMethods(Array.isArray(settings.handoff_methods) ? settings.handoff_methods : ["internal"]);
      setWebhookUrl(settings.webhook_url || "");
      // Don't populate webhook_secret from DB for security
      setNotifyEmail(settings.notify_email || "");
      setNotifyPhone(settings.notify_phone || "");
      setUrgentSmsPhone(settings.urgent_sms_phone || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const payload = {
        tenant_id: tenant.id,
        enabled,
        handoff_methods: methods,
        webhook_url: webhookUrl || null,
        webhook_secret: webhookSecret || undefined,
        notify_email: notifyEmail || null,
        notify_phone: notifyPhone || null,
        urgent_sms_phone: urgentSmsPhone || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("dispatch_delivery_settings")
        .upsert(payload, { onConflict: "tenant_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch-delivery-settings"] });
      toast({ title: "Settings saved" });
      setWebhookSecret(""); // Clear secret after save
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (method: string) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const response = await supabase.functions.invoke("dispatch-handoff", {
        body: {
          test: true,
          method,
          tenant_id: tenant.id,
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret || undefined,
          notify_email: notifyEmail,
          notify_phone: notifyPhone,
          urgent_sms_phone: urgentSmsPhone,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (_, method) => {
      toast({ title: `Test ${method} sent successfully` });
    },
    onError: (error: Error, method) => {
      toast({ variant: "destructive", title: `Test ${method} failed`, description: error.message });
    },
    onSettled: () => {
      setTestingMethod(null);
    },
  });

  const handleMethodToggle = (methodId: string, checked: boolean) => {
    if (methodId === "internal") return; // Always enabled
    
    if (checked) {
      setMethods([...methods, methodId]);
    } else {
      setMethods(methods.filter(m => m !== methodId));
    }
  };

  const handleTest = (method: string) => {
    setTestingMethod(method);
    testMutation.mutate(method);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Delivery Settings</CardTitle>
          <CardDescription>
            Configure how dispatch jobs are delivered to your team and external systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Dispatch jobs are always saved internally in Flux Receptionist first. External delivery methods 
              push a copy to your existing dispatch systems.
            </AlertDescription>
          </Alert>

          {/* Last Delivery Status */}
          {lastAttempt && (
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
              <span className="text-sm text-muted-foreground">Last delivery:</span>
              <Badge variant={lastAttempt.status === "success" ? "default" : "destructive"}>
                {lastAttempt.status === "success" ? (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                {lastAttempt.method} - {lastAttempt.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(lastAttempt.created_at).toLocaleString()}
              </span>
            </div>
          )}

          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable Dispatch Handoff</Label>
              <p className="text-sm text-muted-foreground">
                Automatically push dispatch jobs to your chosen destinations
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              {/* Handoff Methods */}
              <div className="space-y-4">
                <Label className="text-base">Handoff Methods</Label>
                <div className="grid gap-3">
                  {HANDOFF_METHODS.map(({ id, label, icon: Icon, always }) => (
                    <div key={id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={always || methods.includes(id)}
                          disabled={always}
                          onCheckedChange={(checked) => handleMethodToggle(id, !!checked)}
                        />
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{label}</span>
                        {always && (
                          <span className="text-xs text-muted-foreground">(always on)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Webhook Settings */}
              {methods.includes("webhook") && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-base">Webhook Configuration</Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input
                        id="webhook-url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://your-dispatch-system.com/api/jobs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="webhook-secret">Webhook Secret (for HMAC signature)</Label>
                      <Input
                        id="webhook-secret"
                        type="password"
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        placeholder={settings?.webhook_secret ? "••••••••" : "your-secret-key"}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to keep existing secret
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest("webhook")}
                      disabled={!webhookUrl || testingMethod === "webhook"}
                    >
                      {testingMethod === "webhook" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Test Dispatch
                    </Button>
                  </div>
                </div>
              )}

              {/* Email Settings */}
              {methods.includes("email") && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-base">Email Notification</Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="notify-email">Notification Email</Label>
                      <Input
                        id="notify-email"
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="dispatch@yourbusiness.com"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest("email")}
                      disabled={!notifyEmail || testingMethod === "email"}
                    >
                      {testingMethod === "email" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Test Email
                    </Button>
                  </div>
                </div>
              )}

              {/* SMS Settings */}
              {methods.includes("sms") && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-base">SMS Notification</Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="notify-phone">Notification Phone</Label>
                      <Input
                        id="notify-phone"
                        value={notifyPhone}
                        onChange={(e) => setNotifyPhone(e.target.value)}
                        placeholder="+1 555-0123"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest("sms")}
                      disabled={!notifyPhone || testingMethod === "sms"}
                    >
                      {testingMethod === "sms" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Test SMS
                    </Button>
                  </div>
                </div>
              )}

              {/* Urgent SMS Settings */}
              <div className="space-y-4 p-4 border rounded-lg bg-destructive/10 border-destructive/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <Label className="text-base text-destructive">Urgent Dispatch Alerts</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Immediately notify this number for high/urgent priority dispatch jobs
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="urgent-sms-phone">Urgent SMS Phone</Label>
                    <Input
                      id="urgent-sms-phone"
                      value={urgentSmsPhone}
                      onChange={(e) => setUrgentSmsPhone(e.target.value)}
                      placeholder="+1 555-URGENT"
                      className="border-destructive/50"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
