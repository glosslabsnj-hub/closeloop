import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFoodWorkflowConfig } from "@/hooks/useWorkflowConfig";
import type { FoodWorkflowConfig } from "@/hooks/useWorkflowConfig";
import { AlertCircle, CheckCircle2, Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FoodWorkflowConfig() {
  const { config, isLoading, update, isUpdating } = useFoodWorkflowConfig();
  const [localConfig, setLocalConfig] = useState<Partial<FoodWorkflowConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setHasChanges(false);
    }
  }, [config]);

  const handleUpdate = (field: keyof FoodWorkflowConfig, value: any) => {
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

      {/* Order Type Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Order Type Handling</CardTitle>
          <CardDescription>
            Configure how the agent determines if orders are pickup or delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ask Pickup vs Delivery */}
          <div className="space-y-2">
            <Label>When to ask about order type</Label>
            <Select
              value={localConfig.ask_pickup_vs_delivery || "if_both_enabled"}
              onValueChange={(value) => handleUpdate("ask_pickup_vs_delivery", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Always Ask</SelectItem>
                <SelectItem value="if_both_enabled">
                  Only if Both Pickup & Delivery Enabled
                </SelectItem>
                <SelectItem value="never">Never Ask (Use Default)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localConfig.ask_pickup_vs_delivery === "always" && (
                <>
                  <Info className="inline h-3 w-3 mr-1" />
                  Agent will always ask "Pickup or delivery?" even if only one is available
                </>
              )}
              {localConfig.ask_pickup_vs_delivery === "if_both_enabled" && (
                <>
                  <Info className="inline h-3 w-3 mr-1" />
                  Agent only asks if both options are enabled in Order Settings
                </>
              )}
              {localConfig.ask_pickup_vs_delivery === "never" && (
                <>
                  <Info className="inline h-3 w-3 mr-1" />
                  Agent assumes default type without asking
                </>
              )}
            </p>
          </div>

          {/* Default Order Type */}
          <div className="space-y-2">
            <Label>Default order type (when not asking)</Label>
            <Select
              value={localConfig.default_order_type || "ask"}
              onValueChange={(value) => handleUpdate("default_order_type", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="ask">Always Ask Customer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              What to assume if customer doesn't specify
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order Timing */}
      <Card>
        <CardHeader>
          <CardTitle>Order Timing</CardTitle>
          <CardDescription>Configure when orders can be placed and prepared</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ASAP vs Scheduled */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ask if order is ASAP or scheduled</Label>
              <p className="text-sm text-muted-foreground">
                Agent will ask "For now or for a specific time?"
              </p>
            </div>
            <Switch
              checked={localConfig.ask_asap_vs_scheduled ?? true}
              onCheckedChange={(checked) => handleUpdate("ask_asap_vs_scheduled", checked)}
            />
          </div>

          {/* Min Advance Minutes */}
          <div className="space-y-2">
            <Label>Minimum advance order time (minutes)</Label>
            <Input
              type="number"
              min="0"
              max="1440"
              value={localConfig.min_advance_order_minutes || 30}
              onChange={(e) =>
                handleUpdate("min_advance_order_minutes", parseInt(e.target.value))
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Earliest time from now that future orders can be placed
            </p>
          </div>

          {/* Default Prep Time */}
          <div className="space-y-2">
            <Label>Default prep time (minutes)</Label>
            <Input
              type="number"
              min="5"
              max="180"
              value={localConfig.default_prep_time_minutes || 20}
              onChange={(e) =>
                handleUpdate("default_prep_time_minutes", parseInt(e.target.value))
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Used when menu item doesn't specify prep time
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Customization Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Customizations</CardTitle>
          <CardDescription>
            Configure what modifications customers can request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Allow Customizations */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow menu item customizations</Label>
              <p className="text-sm text-muted-foreground">
                Customers can request modifications (e.g., "no onions", "extra cheese")
              </p>
            </div>
            <Switch
              checked={localConfig.allow_menu_customizations ?? true}
              onCheckedChange={(checked) => handleUpdate("allow_menu_customizations", checked)}
            />
          </div>

          {/* Require Allergy Check */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ask about food allergies</Label>
              <p className="text-sm text-muted-foreground">
                Agent will ask "Any allergies I should note?" for every order
              </p>
            </div>
            <Switch
              checked={localConfig.require_allergy_check ?? false}
              onCheckedChange={(checked) => handleUpdate("require_allergy_check", checked)}
            />
          </div>

          {/* Ask Special Instructions */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ask for special instructions</Label>
              <p className="text-sm text-muted-foreground">
                Agent will ask for any special requests or notes
              </p>
            </div>
            <Switch
              checked={localConfig.ask_special_instructions ?? true}
              onCheckedChange={(checked) => handleUpdate("ask_special_instructions", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Details */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Details</CardTitle>
          <CardDescription>
            Configure what delivery information to collect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Collect Delivery Instructions */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Collect delivery instructions</Label>
              <p className="text-sm text-muted-foreground">
                Agent will ask for gate codes, building numbers, etc.
              </p>
            </div>
            <Switch
              checked={localConfig.collect_delivery_instructions ?? true}
              onCheckedChange={(checked) =>
                handleUpdate("collect_delivery_instructions", checked)
              }
            />
          </div>

          {/* Require Buzzer Code */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require buzzer/apartment code</Label>
              <p className="text-sm text-muted-foreground">
                Mandatory for apartment/building deliveries
              </p>
            </div>
            <Switch
              checked={localConfig.require_buzzer_code ?? false}
              onCheckedChange={(checked) => handleUpdate("require_buzzer_code", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Order Confirmation */}
      <Card>
        <CardHeader>
          <CardTitle>Order Confirmation</CardTitle>
          <CardDescription>
            Configure how orders are confirmed with customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Repeat Order Back */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Repeat order back to customer</Label>
              <p className="text-sm text-muted-foreground">
                Agent will read the full order for confirmation
              </p>
            </div>
            <Switch
              checked={localConfig.repeat_order_back ?? true}
              onCheckedChange={(checked) => handleUpdate("repeat_order_back", checked)}
            />
          </div>

          {/* Confirm Total */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Confirm total before submitting</Label>
              <p className="text-sm text-muted-foreground">
                Agent will state the total and wait for customer approval
              </p>
            </div>
            <Switch
              checked={localConfig.confirm_total_before_submit ?? true}
              onCheckedChange={(checked) => handleUpdate("confirm_total_before_submit", checked)}
            />
          </div>

          {/* Confirmation Script */}
          <div className="space-y-2">
            <Label>Order confirmation script</Label>
            <Textarea
              value={localConfig.order_confirmation_script || ""}
              onChange={(e) => handleUpdate("order_confirmation_script", e.target.value)}
              placeholder="Great! Your order will be ready {{ready_time}}"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{"}
              {"{"}ready_time{"}"}{"}"}to insert estimated ready time
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
