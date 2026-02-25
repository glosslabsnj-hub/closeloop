import { useState } from "react";
import { 
  Calendar, FileSpreadsheet, MessageSquare, Printer, Truck, Webhook,
  Check, ChevronRight, Settings, Play, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  useAutomationRules, 
  useAutomationRuleMutations, 
  useTestAutomation,
  useIntegrations,
} from "@/hooks/useIntegrations";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";

interface OneClickPresetsProps {
  tenantId: string;
}

interface Preset {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  trigger: string;
  action: string;
  provider: string;
  modes: BusinessMode[];
  requiresConfig?: "webhook_url" | "calendar" | "sheet" | "printer";
  color: string;
}

const PRESETS: Preset[] = [
  {
    id: "booking-calendar",
    icon: <Calendar className="h-5 w-5" />,
    label: "Send bookings to Google Calendar",
    description: "Auto-create calendar events for new bookings",
    trigger: "booking.created",
    action: "create_event",
    provider: "google_calendar",
    modes: ["service", "medical"],
    requiresConfig: "calendar",
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    id: "order-printer",
    icon: <Printer className="h-5 w-5" />,
    label: "Send orders to printer",
    description: "Auto-print kitchen tickets for new orders",
    trigger: "order.created",
    action: "print_receipt",
    provider: "printer",
    modes: ["food"],
    requiresConfig: "printer",
    color: "text-orange-500 bg-orange-500/10",
  },
  {
    id: "customer-sms",
    icon: <MessageSquare className="h-5 w-5" />,
    label: "Text customer confirmation",
    description: "Auto-text customers when their request is confirmed",
    trigger: "booking.confirmed",
    action: "send_sms",
    provider: "sms",
    modes: ["service", "medical", "food", "dispatch", "general"],
    color: "text-green-500 bg-green-500/10",
  },
  {
    id: "lead-sheets",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    label: "Send leads to Google Sheets",
    description: "Auto-log new leads to a spreadsheet",
    trigger: "lead.captured",
    action: "append_row",
    provider: "google_sheets",
    modes: ["service", "medical", "general"],
    requiresConfig: "sheet",
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    id: "dispatch-notify",
    icon: <Truck className="h-5 w-5" />,
    label: "Send dispatch jobs to SMS/email",
    description: "Notify team when new jobs come in",
    trigger: "dispatch_job.created",
    action: "send_sms",
    provider: "sms",
    modes: ["dispatch"],
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "webhook-all",
    icon: <Webhook className="h-5 w-5" />,
    label: "Send all outcomes to a webhook",
    description: "Push every call outcome to your system",
    trigger: "call.completed",
    action: "send_webhook",
    provider: "webhook",
    modes: ["service", "food", "dispatch", "medical", "general"],
    requiresConfig: "webhook_url",
    color: "text-violet-500 bg-violet-500/10",
  },
];

export function OneClickPresets({ tenantId }: OneClickPresetsProps) {
  const { businessMode } = useTenantConfig();
  const { toast } = useToast();
  const { data: rules, isLoading } = useAutomationRules(tenantId);
  const { data: integrations } = useIntegrations(tenantId);
  const { createRule, toggleRule, _deleteRule } = useAutomationRuleMutations(tenantId);
  const testAutomation = useTestAutomation();
  
  const [configDialog, setConfigDialog] = useState<{ preset: Preset; mode: "enable" | "test" } | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  // Filter presets by business mode
  const availablePresets = PRESETS.filter((p) => p.modes.includes(businessMode));

  // Map presets to existing rules
  const getPresetRule = (preset: Preset) => {
    return rules?.find(
      (r) => r.trigger_event === preset.trigger && r.action_type === preset.action
    );
  };

  const isConnected = (preset: Preset): boolean => {
    if (preset.provider === "webhook" || preset.provider === "sms" || preset.provider === "printer") {
      return true; // These don't require explicit integration
    }
    return integrations?.some((i) => i.provider === preset.provider && i.status === "connected") || false;
  };

  const handleToggle = async (preset: Preset) => {
    const existingRule = getPresetRule(preset);
    
    if (existingRule) {
      // Toggle existing rule
      await toggleRule.mutateAsync({ id: existingRule.id, enabled: !existingRule.enabled });
    } else {
      // Check if config needed
      if (preset.requiresConfig === "webhook_url") {
        setConfigDialog({ preset, mode: "enable" });
        return;
      }
      
      // Create new rule
      await createRule.mutateAsync({
        name: preset.label,
        description: preset.description,
        trigger_event: preset.trigger,
        action_type: preset.action,
        destination_provider: preset.provider,
      });
      
      toast({
        title: "Automation enabled",
        description: preset.label,
      });
    }
  };

  const handleEnableWithConfig = async () => {
    if (!configDialog) return;
    const { preset } = configDialog;
    
    await createRule.mutateAsync({
      name: preset.label,
      description: preset.description,
      trigger_event: preset.trigger,
      action_type: preset.action,
      destination_provider: preset.provider,
      field_mapping_json: preset.requiresConfig === "webhook_url" ? { url: webhookUrl } : undefined,
    });
    
    toast({
      title: "Automation enabled",
      description: preset.label,
    });
    
    setConfigDialog(null);
    setWebhookUrl("");
  };

  const handleTest = async (preset: Preset) => {
    const existingRule = getPresetRule(preset);
    
    if (!existingRule) {
      toast({
        title: "Enable first",
        description: "Please enable this automation before testing",
        variant: "destructive",
      });
      return;
    }
    
    await testAutomation.mutateAsync({
      rule_id: existingRule.id,
      dry_run: false,
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {availablePresets.map((preset) => {
          const rule = getPresetRule(preset);
          const isEnabled = rule?.enabled || false;
          const connected = isConnected(preset);
          
          return (
            <Card 
              key={preset.id} 
              className={`transition-all ${isEnabled ? "border-primary/50 bg-primary/5" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${preset.color}`}>
                    {preset.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-sm leading-tight">
                        {preset.label}
                      </h4>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => handleToggle(preset)}
                        disabled={!connected && preset.requiresConfig !== "webhook_url"}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {preset.description}
                    </p>
                    
                    {/* Status row */}
                    <div className="flex items-center gap-2 mt-2">
                      {isEnabled && (
                        <Badge variant="default" className="text-[10px] h-5 gap-1">
                          <Check className="h-3 w-3" />
                          Active
                        </Badge>
                      )}
                      
                      {!connected && preset.requiresConfig !== "webhook_url" && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          Connect {preset.provider.replace("_", " ")}
                        </Badge>
                      )}
                      
                      {isEnabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px]"
                          onClick={() => handleTest(preset)}
                          disabled={testAutomation.isPending}
                        >
                          {testAutomation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-1" />
                              Test
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Config Dialog for Webhook */}
      <Dialog open={!!configDialog} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Webhook</DialogTitle>
            <DialogDescription>
              Enter the URL where you want to receive data
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-system.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll POST event data to this URL whenever the trigger fires
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEnableWithConfig}
              disabled={!webhookUrl || createRule.isPending}
            >
              {createRule.isPending ? "Enabling..." : "Enable & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
