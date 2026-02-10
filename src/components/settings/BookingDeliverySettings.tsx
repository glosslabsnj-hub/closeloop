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
import { Loader2, Webhook, Mail, Phone, Info, Send, CheckCircle2, Calendar, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookingDeliverySettingsData {
  tenant_id: string;
  enabled: boolean;
  handoff_methods: string[];
  webhook_url: string | null;
  webhook_secret: string | null;
  notify_email: string | null;
  notify_phone: string | null;
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
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  always?: boolean;
}> = [
  { id: "internal", label: "Show on Voxly calendar", description: "Always saved here first", icon: Calendar, always: true },
  { id: "webhook", label: "Send to my software (API)", description: "For CRMs, scheduling tools, etc.", icon: Webhook, always: false },
  { id: "email", label: "Email me", description: "Get an email for each booking", icon: Mail, always: false },
  { id: "sms", label: "Text me", description: "Get a text for each booking", icon: Phone, always: false },
];

export function BookingDeliverySettings() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(true);
  const [methods, setMethods] = useState<string[]>(["internal"]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [testingMethod, setTestingMethod] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["booking-delivery-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("booking_delivery_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as BookingDeliverySettingsData | null;
    },
    enabled: !!tenant?.id,
  });

  // Fetch last handoff attempt for display
  const { data: lastAttempt } = useQuery({
    queryKey: ["last-booking-handoff", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("handoff_attempts")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("entity_type", "booking")
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
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("booking_delivery_settings")
        .upsert(payload, { onConflict: "tenant_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-delivery-settings"] });
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
      
      const response = await supabase.functions.invoke("booking-handoff", {
        body: {
          test: true,
          method,
          tenant_id: tenant.id,
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret || undefined,
          notify_email: notifyEmail,
          notify_phone: notifyPhone,
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
          <CardTitle>Where Bookings Go</CardTitle>
          <CardDescription>
            Choose how you want to receive new bookings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Bookings are always saved internally in Voxly first. External delivery methods 
              push a copy to your existing systems (calendar, CRM, etc).
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
              <Label className="text-base">Send bookings somewhere?</Label>
              <p className="text-sm text-muted-foreground">
                Turn on to automatically send bookings to your calendar, email, or other tools
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              {/* Delivery Options */}
              <div className="space-y-4">
                <div className="grid gap-3">
                  {HANDOFF_METHODS.map(({ id, label, description, icon: Icon, always }) => (
                    <div key={id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={always || methods.includes(id)}
                          disabled={always}
                          onCheckedChange={(checked) => handleMethodToggle(id, !!checked)}
                        />
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{label}</span>
                          <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                        {always && (
                          <Badge variant="secondary" className="text-xs">Always on</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Webhook Settings */}
              {methods.includes("webhook") && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-base">Connect Your Software</Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="webhook-url">Your software's URL</Label>
                      <Input
                        id="webhook-url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://your-crm.com/api/bookings"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Paste the webhook URL from your CRM or scheduling software
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="webhook-secret">Secret key (optional)</Label>
                      <Input
                        id="webhook-secret"
                        type="password"
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        placeholder={settings?.webhook_secret ? "••••••••" : "your-secret-key"}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        For secure webhooks — leave empty to keep existing
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
                      Send Test Booking
                    </Button>
                  </div>
                </div>
              )}

              {/* Email Settings */}
              {methods.includes("email") && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-base">Email Notifications</Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="notify-email">Send booking emails to</Label>
                      <Input
                        id="notify-email"
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="bookings@yourbusiness.com"
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
                  <Label className="text-base">Text Notifications</Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="notify-phone">Send booking texts to</Label>
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
