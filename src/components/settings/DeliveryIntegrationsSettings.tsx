import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Webhook, Mail, MessageSquare, Lock, TestTube2, Eye, EyeOff, Info } from "lucide-react";
import { useUniversalDeliverySettings, useTestDelivery, type AuthMode } from "@/hooks/useUniversalDelivery";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function DeliveryIntegrationsSettings() {
  const { settings, isLoading, updateSettings, isUpdating } = useUniversalDeliverySettings();
  const { businessMode } = useTenantConfig();
  const testDelivery = useTestDelivery();

  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [authHeaderName, setAuthHeaderName] = useState("");
  const [authHeaderValue, setAuthHeaderValue] = useState("");
  const [basicUser, setBasicUser] = useState("");
  const [basicPass, setBasicPass] = useState("");

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [notifyPhone, setNotifyPhone] = useState("");

  useEffect(() => {
    if (settings) {
      setWebhookEnabled(settings.webhook_enabled);
      setWebhookUrl(settings.webhook_url || "");
      setWebhookSecret(settings.webhook_secret || "");
      setAuthMode(settings.auth_mode);
      setAuthHeaderName(settings.auth_header_name || "");
      setAuthHeaderValue(settings.auth_header_value || "");
      setBasicUser(settings.basic_user || "");
      setBasicPass(settings.basic_pass || "");
      setEmailEnabled(settings.email_enabled);
      setNotifyEmail(settings.notify_email || "");
      setSmsEnabled(settings.sms_enabled);
      setNotifyPhone(settings.notify_phone || "");
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      webhook_enabled: webhookEnabled,
      webhook_url: webhookUrl || null,
      webhook_secret: webhookSecret || null,
      auth_mode: authMode,
      auth_header_name: authHeaderName || null,
      auth_header_value: authHeaderValue || null,
      basic_user: basicUser || null,
      basic_pass: basicPass || null,
      email_enabled: emailEnabled,
      notify_email: notifyEmail || null,
      sms_enabled: smsEnabled,
      notify_phone: notifyPhone || null,
    });
  };

  const getModeHelpText = () => {
    switch (businessMode) {
      case "service":
        return "Bookings can be pushed to your scheduler or CRM.";
      case "dispatch":
        return "Dispatch jobs can be pushed to your dispatch system.";
      case "food":
        return "Orders can be pushed to POS/ops systems and printed.";
      case "medical":
        return "Intake can be pushed with minimal data; HIPAA mode respects retention settings.";
      default:
        return "Outcomes can be pushed to your existing systems.";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Where should new items go?
          </CardTitle>
          <CardDescription>
            All outcomes are always stored in Voxly. Optionally push them to your existing systems.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Internal - Always On */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Internal (Voxly)</div>
                <div className="text-sm text-muted-foreground">Always on — your source of truth</div>
              </div>
            </div>
            <Badge variant="secondary">Always Enabled</Badge>
          </div>

          {/* Help text based on mode */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-sm text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{getModeHelpText()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Webhook className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Webhook (Zapier/Make/Custom)</CardTitle>
                <CardDescription>Send payloads to any URL when items are created</CardDescription>
              </div>
            </div>
            <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
          </div>
        </CardHeader>
        {webhookEnabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://hooks.zapier.com/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-secret">
                Webhook Secret (optional)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 ml-1 inline text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Used to sign payloads with HMAC SHA256. Check X-Signature header.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="webhook-secret"
                  type={showSecret ? "text" : "password"}
                  placeholder="your-secret-key"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Authentication Mode</Label>
              <Select value={authMode} onValueChange={(v) => setAuthMode(v as AuthMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="header">Custom Header</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {authMode === "header" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="header-name">Header Name</Label>
                  <Input
                    id="header-name"
                    placeholder="X-API-Key"
                    value={authHeaderName}
                    onChange={(e) => setAuthHeaderName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="header-value">Header Value</Label>
                  <Input
                    id="header-value"
                    type="password"
                    placeholder="your-api-key"
                    value={authHeaderValue}
                    onChange={(e) => setAuthHeaderValue(e.target.value)}
                  />
                </div>
              </div>
            )}

            {authMode === "basic" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basic-user">Username</Label>
                  <Input
                    id="basic-user"
                    placeholder="username"
                    value={basicUser}
                    onChange={(e) => setBasicUser(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basic-pass">Password</Label>
                  <Input
                    id="basic-pass"
                    type="password"
                    placeholder="password"
                    value={basicPass}
                    onChange={(e) => setBasicPass(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => testDelivery.mutate({ entityType: "booking", method: "webhook" })}
              disabled={!webhookUrl || testDelivery.isPending}
            >
              {testDelivery.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube2 className="h-4 w-4 mr-2" />
              )}
              Send Test Payload
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Email Notifications</CardTitle>
                <CardDescription>Get email when new items are created</CardDescription>
              </div>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
        </CardHeader>
        {emailEnabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notify-email">Notification Email</Label>
              <Input
                id="notify-email"
                type="email"
                placeholder="team@yourbusiness.com"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => testDelivery.mutate({ entityType: "booking", method: "email" })}
              disabled={!notifyEmail || testDelivery.isPending}
            >
              {testDelivery.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube2 className="h-4 w-4 mr-2" />
              )}
              Send Test Email
            </Button>
          </CardContent>
        )}
      </Card>

      {/* SMS Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">SMS Notifications</CardTitle>
                <CardDescription>Get text alerts for new items</CardDescription>
              </div>
            </div>
            <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
          </div>
        </CardHeader>
        {smsEnabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notify-phone">Notification Phone</Label>
              <Input
                id="notify-phone"
                type="tel"
                placeholder="+1 555 123 4567"
                value={notifyPhone}
                onChange={(e) => setNotifyPhone(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => testDelivery.mutate({ entityType: "booking", method: "sms" })}
              disabled={!notifyPhone || testDelivery.isPending}
            >
              {testDelivery.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube2 className="h-4 w-4 mr-2" />
              )}
              Send Test SMS
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isUpdating}>
          {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Delivery Settings
        </Button>
      </div>
    </div>
  );
}