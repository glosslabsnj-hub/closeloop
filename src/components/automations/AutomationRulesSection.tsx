import { useState, useMemo } from "react";
import { Plus, Play, Pause, Trash2, Settings, Zap, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAutomationRules,
  useAutomationRuleMutations,
  useIntegrations,
  useTestAutomation,
  PROVIDERS,
  type AutomationRule,
} from "@/hooks/useIntegrations";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";

interface AutomationRulesSectionProps {
  tenantId: string;
}

// Event metadata
const EVENTS: Record<string, { label: string; description: string; modes: BusinessMode[] }> = {
  "order.created": { label: "Order Created", description: "When a new order is placed", modes: ["food"] },
  "order.confirmed": { label: "Order Confirmed", description: "When an order is confirmed", modes: ["food"] },
  "order.ready": { label: "Order Ready", description: "When an order is ready for pickup", modes: ["food"] },
  "booking.created": { label: "Booking Created", description: "When a new booking is made", modes: ["service", "medical"] },
  "booking.confirmed": { label: "Booking Confirmed", description: "When a booking is confirmed", modes: ["service", "medical"] },
  "dispatch_job.created": { label: "Dispatch Job Created", description: "When a new dispatch job is created", modes: ["dispatch"] },
  "dispatch.confirmed": { label: "Dispatch Confirmed", description: "When a job is confirmed/assigned", modes: ["dispatch"] },
  "call.ended": { label: "Call Ended", description: "When an AI call ends", modes: ["service", "food", "dispatch", "medical", "general"] },
  "missed_call": { label: "Missed Call", description: "When a call is missed", modes: ["service", "food", "dispatch", "medical", "general"] },
  "lead.captured": { label: "Lead Captured", description: "When a new lead is captured", modes: ["service", "food", "dispatch", "medical", "general"] },
  "sms.received": { label: "SMS Received", description: "When an SMS is received", modes: ["service", "food", "dispatch", "medical", "general"] },
};

// Action types
const ACTIONS: Record<string, { label: string; description: string; providers: string[] }> = {
  send_webhook: { label: "Send Webhook", description: "POST data to a URL", providers: ["webhook"] },
  create_event: { label: "Create Calendar Event", description: "Add to Google Calendar", providers: ["google_calendar"] },
  append_row: { label: "Append to Sheet", description: "Add row to Google Sheets", providers: ["google_sheets"] },
  print_receipt: { label: "Print Receipt", description: "Print kitchen ticket", providers: ["printer"] },
  send_sms: { label: "Send SMS", description: "Text customer", providers: ["sms"] },
  send_email: { label: "Send Email", description: "Email notification", providers: ["email"] },
};

export function AutomationRulesSection({ tenantId }: AutomationRulesSectionProps) {
  const { businessMode } = useTenantConfig();
  const { data: rules, isLoading } = useAutomationRules(tenantId);
  const { data: integrations } = useIntegrations(tenantId);
  const { createRule, toggleRule, deleteRule } = useAutomationRuleMutations(tenantId);
  const testAutomation = useTestAutomation();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    trigger_event: "",
    destination_provider: "",
    action_type: "",
    integration_id: "",
  });

  // Filter events by business mode
  const availableEvents = useMemo(() => {
    return Object.entries(EVENTS)
      .filter(([, meta]) => meta.modes.includes(businessMode))
      .map(([id, meta]) => ({ id, ...meta }));
  }, [businessMode]);

  // Get available actions based on connected integrations
  const availableActions = useMemo(() => {
    const connectedProviders = new Set(integrations?.map((i) => i.provider) || []);
    // Always include webhook, sms, print since they can work without explicit integration
    connectedProviders.add("webhook");
    connectedProviders.add("sms");
    connectedProviders.add("printer");

    return Object.entries(ACTIONS)
      .filter(([, meta]) => meta.providers.some((p) => connectedProviders.has(p)))
      .map(([id, meta]) => ({ id, ...meta }));
  }, [integrations]);

  const handleCreate = async () => {
    if (!newRule.name || !newRule.trigger_event || !newRule.action_type) return;

    try {
      await createRule.mutateAsync({
        name: newRule.name,
        trigger_event: newRule.trigger_event,
        destination_provider: newRule.destination_provider || "webhook",
        action_type: newRule.action_type,
        integration_id: newRule.integration_id || undefined,
      });
      setCreateDialogOpen(false);
      setNewRule({ name: "", trigger_event: "", destination_provider: "", action_type: "", integration_id: "" });
    } catch (e) {
      // Error handled by mutation
    }
  };

  const handleToggle = async (rule: AutomationRule) => {
    await toggleRule.mutateAsync({ id: rule.id, enabled: !rule.enabled });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this automation?")) {
      await deleteRule.mutateAsync(id);
    }
  };

  const handleTest = async (rule: AutomationRule) => {
    await testAutomation.mutateAsync({
      rule_id: rule.id,
      dry_run: true,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Automations</h2>
          <p className="text-sm text-muted-foreground">
            Define what happens when events occur
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Automation
        </Button>
      </div>

      {rules && rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((rule) => {
            const event = EVENTS[rule.trigger_event];
            const action = ACTIONS[rule.action_type];
            const provider = PROVIDERS.find((p) => p.id === rule.destination_provider);

            return (
              <Card key={rule.id} className={!rule.enabled ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{rule.name}</span>
                          {!rule.enabled && <Badge variant="secondary">Paused</Badge>}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <span>{event?.label || rule.trigger_event}</span>
                          <ChevronRight className="h-3 w-3" />
                          <span className="flex items-center gap-1">
                            {provider?.icon}
                            {action?.label || rule.action_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(rule)}
                        disabled={testAutomation.isPending}
                        title="Test"
                      >
                        {testAutomation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggle(rule)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Zap}
          title="No automations yet"
          description="Create your first automation to start routing events to your tools"
          action={{
            label: "Create Automation",
            onClick: () => setCreateDialogOpen(true),
          }}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Automation</DialogTitle>
            <DialogDescription>
              Define when and how data should be sent to your connected tools
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                placeholder="e.g., Send orders to kitchen printer"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>When this happens...</Label>
              <Select
                value={newRule.trigger_event}
                onValueChange={(value) => setNewRule({ ...newRule, trigger_event: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {availableEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      <div className="flex flex-col">
                        <span>{event.label}</span>
                        <span className="text-xs text-muted-foreground">{event.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Do this...</Label>
              <Select
                value={newRule.action_type}
                onValueChange={(value) => {
                  const action = ACTIONS[value];
                  setNewRule({
                    ...newRule,
                    action_type: value,
                    destination_provider: action?.providers[0] || "webhook",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  {availableActions.map((action) => (
                    <SelectItem key={action.id} value={action.id}>
                      <div className="flex flex-col">
                        <span>{action.label}</span>
                        <span className="text-xs text-muted-foreground">{action.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newRule.action_type && integrations && integrations.length > 0 && (
              <div className="space-y-2">
                <Label>Using integration (optional)</Label>
                <Select
                  value={newRule.integration_id}
                  onValueChange={(value) => setNewRule({ ...newRule, integration_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an integration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (use defaults)</SelectItem>
                    {integrations
                      .filter((i) => {
                        const action = ACTIONS[newRule.action_type];
                        return action?.providers.includes(i.provider);
                      })
                      .map((integration) => (
                        <SelectItem key={integration.id} value={integration.id}>
                          {integration.display_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createRule.isPending || !newRule.name || !newRule.trigger_event || !newRule.action_type}
            >
              {createRule.isPending ? "Creating..." : "Create Automation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
