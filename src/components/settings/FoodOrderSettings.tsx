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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Webhook, Mail, Phone, Printer, Info, Send, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DeliverySettings {
  tenant_id: string;
  enabled: boolean;
  handoff_methods: string[];
  webhook_url: string | null;
  webhook_secret: string | null;
  notify_email: string | null;
  notify_phone: string | null;
  print_format: string;
  auto_print: boolean;
  cancel_window_minutes: number;
}

const HANDOFF_METHODS: Array<{
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  always?: boolean;
}> = [
  { id: "internal", label: "Internal Queue", icon: CheckCircle2, always: true },
  { id: "webhook", label: "Send to my other software", icon: Webhook, always: false },
  { id: "email", label: "Email", icon: Mail, always: false },
  { id: "sms", label: "SMS", icon: Phone, always: false },
  { id: "print", label: "Printing", icon: Printer, always: false },
];

export function FoodOrderSettings() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(true);
  const [methods, setMethods] = useState<string[]>(["internal"]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [printFormat, setPrintFormat] = useState("ticket_80mm");
  const [autoPrint, setAutoPrint] = useState(false);
  const [cancelWindow, setCancelWindow] = useState(2);
  const [testingMethod, setTestingMethod] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["order-delivery-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data, error } = await supabase
        .from("order_delivery_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as DeliverySettings | null;
    },
    enabled: !!tenant?.id,
  });

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setMethods(Array.isArray(settings.handoff_methods) ? settings.handoff_methods : ["internal"]);
      setWebhookUrl(settings.webhook_url || "");
      setWebhookSecret(settings.webhook_secret || "");
      setNotifyEmail(settings.notify_email || "");
      setNotifyPhone(settings.notify_phone || "");
      setPrintFormat(settings.print_format || "ticket_80mm");
      setAutoPrint(settings.auto_print || false);
      setCancelWindow(settings.cancel_window_minutes ?? 2);
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
        webhook_secret: webhookSecret || null,
        notify_email: notifyEmail || null,
        notify_phone: notifyPhone || null,
        print_format: printFormat,
        auto_print: autoPrint,
        cancel_window_minutes: cancelWindow,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("order_delivery_settings")
        .upsert(payload, { onConflict: "tenant_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-delivery-settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (method: string) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const response = await supabase.functions.invoke("order-handoff", {
        body: {
          test: true,
          method,
          tenant_id: tenant.id,
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret,
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
          <CardTitle>Order Delivery Settings</CardTitle>
          <CardDescription>
            Configure how orders are delivered to your kitchen and staff
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Orders are auto-confirmed after the caller confirms on the phone. 
              Special instructions are prominently displayed on all tickets.
            </AlertDescription>
          </Alert>

          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable Order Handoff</Label>
              <p className="text-sm text-muted-foreground">
                Automatically push orders to your chosen destinations
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
                        placeholder="https://your-pos.com/orders"
                      />
                    </div>
                    <div>
                      <Label htmlFor="webhook-secret">Webhook Secret (for HMAC signature)</Label>
                      <Input
                        id="webhook-secret"
                        type="password"
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        placeholder="your-secret-key"
                      />
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
                      Test Webhook
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
                        placeholder="kitchen@yourrestaurant.com"
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
                      Test Email
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
                      Test SMS
                    </Button>
                  </div>
                </div>
              )}

              {/* Print Settings */}
              {methods.includes("print") && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <Label className="text-base">Print Configuration</Label>
                  <div className="space-y-3">
                    <div>
                      <Label>Print Format</Label>
                      <Select value={printFormat} onValueChange={setPrintFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ticket_80mm">Thermal Ticket (80mm)</SelectItem>
                          <SelectItem value="letter">Letter (8.5" x 11")</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-print Alert</Label>
                        <p className="text-sm text-muted-foreground">
                          Show print prompt when new orders arrive
                        </p>
                      </div>
                      <Switch checked={autoPrint} onCheckedChange={setAutoPrint} />
                    </div>
                  </div>
                </div>
              )}

              {/* Cancel Window */}
              <div className="space-y-2">
                <Label>Cancel Window (minutes)</Label>
                <Select value={String(cancelWindow)} onValueChange={(v) => setCancelWindow(Number(v))}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No cancel window</SelectItem>
                    <SelectItem value="2">2 minutes</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Allow customers to cancel via SMS reply within this window
                </p>
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
