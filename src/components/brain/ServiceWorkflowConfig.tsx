import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServiceWorkflowConfig } from "@/hooks/useWorkflowConfig";
import type { ServiceWorkflowConfig } from "@/hooks/useWorkflowConfig";
import { AlertCircle, CheckCircle2, Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ServiceWorkflowConfig() {
  const { config, isLoading, update, isUpdating } = useServiceWorkflowConfig();
  const [localConfig, setLocalConfig] = useState<Partial<ServiceWorkflowConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  }, [config]);

  const handleUpdate = (field: keyof ServiceWorkflowConfig, value: any) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    update(localConfig);
    setHasChanges(false);
  };

  const handleReset = () => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Bar */}
      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved changes</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Intake Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Service Intake</CardTitle>
          <CardDescription>
            Configure what information the agent collects during booking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Collect Duration */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Collect service duration from customer</Label>
              <p className="text-sm text-muted-foreground">
                Ask customers how long they expect the service to take
              </p>
            </div>
            <Switch
              checked={localConfig.collect_service_duration ?? true}
              onCheckedChange={(checked) => handleUpdate("collect_service_duration", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Deposit Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit Collection</CardTitle>
          <CardDescription>
            Configure if and when to collect deposits for appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Collect Deposit */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Collect deposit for bookings</Label>
              <p className="text-sm text-muted-foreground">
                Require a deposit to secure appointments
              </p>
            </div>
            <Switch
              checked={localConfig.collect_deposit_upfront ?? false}
              onCheckedChange={(checked) => handleUpdate("collect_deposit_upfront", checked)}
            />
          </div>

          {localConfig.collect_deposit_upfront && (
            <>
              {/* Deposit Timing */}
              <div className="space-y-2">
                <Label>When to collect deposit</Label>
                <Select
                  value={localConfig.deposit_timing || "at_confirmation"}
                  onValueChange={(value) => handleUpdate("deposit_timing", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before_booking">
                      Before Booking (must pay to reserve)
                    </SelectItem>
                    <SelectItem value="at_confirmation">
                      At Confirmation (sent via text/email)
                    </SelectItem>
                    <SelectItem value="day_before">Day Before Appointment</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {localConfig.deposit_timing === "before_booking" && (
                    <>
                      <Info className="inline h-3 w-3 mr-1" />
                      Agent will not create booking until deposit is paid
                    </>
                  )}
                  {localConfig.deposit_timing === "at_confirmation" && (
                    <>
                      <Info className="inline h-3 w-3 mr-1" />
                      Booking is created, deposit link sent immediately
                    </>
                  )}
                  {localConfig.deposit_timing === "day_before" && (
                    <>
                      <Info className="inline h-3 w-3 mr-1" />
                      System will send deposit request 24 hours before appointment
                    </>
                  )}
                </p>
              </div>

              {/* Deposit Amount Behavior */}
              <div className="space-y-2">
                <Label>Deposit amount calculation</Label>
                <Select
                  value={localConfig.deposit_amount_behavior || "percentage"}
                  onValueChange={(value) => handleUpdate("deposit_amount_behavior", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount (same for all services)</SelectItem>
                    <SelectItem value="percentage">
                      Percentage (% of service price)
                    </SelectItem>
                    <SelectItem value="per_service">
                      Per Service (configured in Services)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Default Deposit Percentage */}
              {localConfig.deposit_amount_behavior === "percentage" && (
                <div className="space-y-2">
                  <Label>Default deposit percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={localConfig.default_deposit_percentage || 50}
                      onChange={(e) =>
                        handleUpdate("default_deposit_percentage", parseInt(e.target.value))
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Percentage of service price to collect as deposit
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Availability & Scheduling */}
      <Card>
        <CardHeader>
          <CardTitle>Availability & Scheduling</CardTitle>
          <CardDescription>
            Configure how the agent handles scheduling and time conflicts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Suggest Alternatives */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Suggest alternative times when unavailable</Label>
              <p className="text-sm text-muted-foreground">
                Agent will offer other available times if requested slot is taken
              </p>
            </div>
            <Switch
              checked={localConfig.suggest_alternatives_when_unavailable ?? true}
              onCheckedChange={(checked) =>
                handleUpdate("suggest_alternatives_when_unavailable", checked)
              }
            />
          </div>

          {localConfig.suggest_alternatives_when_unavailable && (
            <>
              {/* Max Alternatives */}
              <div className="space-y-2">
                <Label>Maximum alternatives to suggest</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={localConfig.max_alternatives_to_suggest || 3}
                  onChange={(e) =>
                    handleUpdate("max_alternatives_to_suggest", parseInt(e.target.value))
                  }
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">
                  How many alternative time slots to offer
                </p>
              </div>

              {/* Suggestion Window */}
              <div className="space-y-2">
                <Label>Alternative suggestion window (days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={localConfig.alternative_suggestion_window_days || 7}
                  onChange={(e) =>
                    handleUpdate("alternative_suggestion_window_days", parseInt(e.target.value))
                  }
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">
                  Look ahead this many days when suggesting alternatives
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Booking Confirmation */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Confirmation</CardTitle>
          <CardDescription>
            Configure how bookings are confirmed with customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Confirmation Script */}
          <div className="space-y-2">
            <Label>Booking confirmation script</Label>
            <Textarea
              value={localConfig.booking_confirmation_script || ""}
              onChange={(e) => handleUpdate("booking_confirmation_script", e.target.value)}
              placeholder="Perfect! You're all set for {{date}} at {{time}}"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{"}
              {"{"}date{"}"}{"}"}and {"{"}
              {"{"}time{"}"}{"}"}to insert booking details
            </p>
          </div>

          {/* SMS Confirmation */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Send SMS confirmation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send text message confirmation after booking
              </p>
            </div>
            <Switch
              checked={localConfig.send_sms_confirmation ?? true}
              onCheckedChange={(checked) => handleUpdate("send_sms_confirmation", checked)}
            />
          </div>

          {/* Email Confirmation */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ask for email confirmation</Label>
              <p className="text-sm text-muted-foreground">
                Agent will ask for email address to send confirmation
              </p>
            </div>
            <Switch
              checked={localConfig.ask_for_email_confirmation ?? false}
              onCheckedChange={(checked) => handleUpdate("ask_for_email_confirmation", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>AI Permissions</CardTitle>
          <CardDescription>
            Control what actions the AI can take autonomously
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Allow Rescheduling */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow AI to reschedule appointments</Label>
              <p className="text-sm text-muted-foreground">
                Agent can move existing bookings to new times
              </p>
            </div>
            <Switch
              checked={localConfig.allow_ai_rescheduling ?? true}
              onCheckedChange={(checked) => handleUpdate("allow_ai_rescheduling", checked)}
            />
          </div>

          {/* Allow Cancellation */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow AI to cancel appointments</Label>
              <p className="text-sm text-muted-foreground">
                Agent can cancel bookings without manager approval
              </p>
            </div>
            <Switch
              checked={localConfig.allow_ai_cancellation ?? false}
              onCheckedChange={(checked) => handleUpdate("allow_ai_cancellation", checked)}
            />
          </div>

          {/* Cancellation Requires Manager */}
          {!localConfig.allow_ai_cancellation && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cancellation requires manager</Label>
                <p className="text-sm text-muted-foreground">
                  Route cancellation requests to callback instead of refusing
                </p>
              </div>
              <Switch
                checked={localConfig.cancellation_requires_manager ?? false}
                onCheckedChange={(checked) =>
                  handleUpdate("cancellation_requires_manager", checked)
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
