import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare, Printer, Webhook, Phone, Truck, UtensilsCrossed, Calendar, HelpCircle } from "lucide-react";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkflows, useWorkflowMutations } from "@/hooks/useWorkflows";
import { useToast } from "@/hooks/use-toast";
import { QuickMessageEditor } from "./QuickMessageEditor";
import { WebhookSetup } from "./WebhookSetup";
import { InlineHelpTooltip, AUTOMATION_HELP } from "./InlineHelpTooltip";
import { getAutomationTogglesForMode, type AutomationToggle } from "@/lib/createDefaultWorkflows";
import { TEMPLATE_VARIABLES, type WorkflowTrigger, type Workflow } from "@/types/workflow";
import { supabase } from "@/integrations/supabase/client";

interface SimpleAutomationPanelProps {
  onAdvancedClick: () => void;
}

export function SimpleAutomationPanel({ onAdvancedClick }: SimpleAutomationPanelProps) {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const tenantId = tenant?.id ?? null;
  const { toast } = useToast();

  const { data: workflows, isLoading, refetch } = useWorkflows(tenantId);
  const { activateWorkflow, pauseWorkflow, createWorkflow } = useWorkflowMutations(tenantId);

  // Get toggles for this business mode
  const toggles = useMemo(() => getAutomationTogglesForMode(businessMode), [businessMode]);

  // Group toggles by category
  const groupedToggles = useMemo(() => {
    return {
      notifications: toggles.filter(t => t.category === "notifications"),
      kitchen: toggles.filter(t => t.category === "kitchen"),
      integrations: toggles.filter(t => t.category === "integrations"),
    };
  }, [toggles]);

  // Map toggles to their workflow status
  const toggleStates = useMemo(() => {
    if (!workflows) return {};

    const states: Record<string, { enabled: boolean; workflow?: Workflow; message?: string; webhookUrl?: string }> = {};

    for (const toggle of toggles) {
      // Find matching workflow by trigger and node type
      const matchingWorkflow = workflows.find(w => 
        w.trigger === toggle.trigger && w.status === "active"
      );
      
      // Also check for paused/draft workflows
      const anyWorkflow = workflows.find(w => w.trigger === toggle.trigger);

      states[toggle.id] = {
        enabled: !!matchingWorkflow,
        workflow: anyWorkflow,
        message: toggle.defaultMessage,
        webhookUrl: "",
      };
    }

    return states;
  }, [workflows, toggles]);

  const handleToggle = async (toggle: AutomationToggle, enabled: boolean) => {
    const state = toggleStates[toggle.id];

    try {
      if (enabled) {
        if (state?.workflow) {
          // Activate existing workflow
          await activateWorkflow.mutateAsync(state.workflow.id);
        } else {
          // Create new workflow with default node
          const workflow = await createWorkflow.mutateAsync({
            name: toggle.label,
            trigger: toggle.trigger,
          });

          // Add the default node
          await supabase
            .from("workflow_nodes")
            .insert({
              workflow_id: workflow.id,
              node_type: toggle.primaryNodeType,
              name: toggle.label,
              config: toggle.primaryNodeType === "notify_sms" 
                ? { to: "{{customer_phone}}", message: toggle.defaultMessage || "" }
                : toggle.primaryNodeType === "print_ticket"
                ? { format: "thermal", copies: 1 }
                : { url: "", method: "POST" },
              position: { x: 100, y: 100 },
            });

          // Activate the workflow
          await activateWorkflow.mutateAsync(workflow.id);
        }
        toast({ title: `${toggle.label} enabled` });
      } else {
        if (state?.workflow) {
          await pauseWorkflow.mutateAsync(state.workflow.id);
          toast({ title: `${toggle.label} disabled` });
        }
      }
      
      refetch();
    } catch (error) {
      console.error("Toggle error:", error);
      toast({ 
        title: "Failed to update automation", 
        description: String(error),
        variant: "destructive" 
      });
    }
  };

  const handleMessageSave = async (toggle: AutomationToggle, message: string) => {
    const state = toggleStates[toggle.id];
    if (!state?.workflow) return;

    try {
      // Find the SMS node and update it
      const { data: nodes } = await supabase
        .from("workflow_nodes")
        .select("*")
        .eq("workflow_id", state.workflow.id)
        .eq("node_type", "notify_sms")
        .limit(1);

      if (nodes && nodes.length > 0) {
        const existingConfig = (nodes[0].config as Record<string, unknown>) || {};
        await supabase
          .from("workflow_nodes")
          .update({
            config: { ...existingConfig, message } as any,
          })
          .eq("id", nodes[0].id);

        toast({ title: "Message updated" });
      }
    } catch (error) {
      console.error("Message save error:", error);
      toast({ title: "Failed to save message", variant: "destructive" });
    }
  };

  const handleWebhookSave = async (toggle: AutomationToggle, url: string) => {
    const state = toggleStates[toggle.id];
    if (!state?.workflow) return;

    try {
      // Find the webhook node and update it
      const { data: nodes } = await supabase
        .from("workflow_nodes")
        .select("*")
        .eq("workflow_id", state.workflow.id)
        .eq("node_type", "webhook_push")
        .limit(1);

      if (nodes && nodes.length > 0) {
        const existingConfig = (nodes[0].config as Record<string, unknown>) || {};
        await supabase
          .from("workflow_nodes")
          .update({
            config: { ...existingConfig, url } as any,
          })
          .eq("id", nodes[0].id);

        toast({ title: "Webhook URL updated" });
      }
    } catch (error) {
      console.error("Webhook save error:", error);
      toast({ title: "Failed to save webhook", variant: "destructive" });
    }
  };

  // Get variables for entity type
  const getVariables = (trigger: WorkflowTrigger): string[] => {
    const entityType = trigger.split(".")[0] as keyof typeof TEMPLATE_VARIABLES;
    const entityVars = TEMPLATE_VARIABLES[entityType] || [];
    return [...entityVars, ...TEMPLATE_VARIABLES.common];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Get help content for a toggle
  const getHelpForToggle = (toggle: AutomationToggle) => {
    if (toggle.trigger === "order.confirmed") return AUTOMATION_HELP.orderConfirmed;
    if (toggle.trigger === "order.ready") return AUTOMATION_HELP.orderReady;
    if (toggle.trigger === "booking.confirmed") return AUTOMATION_HELP.bookingConfirmed;
    if (toggle.trigger === "missed_call") return AUTOMATION_HELP.missedCall;
    if (toggle.trigger === "dispatch.created") return AUTOMATION_HELP.dispatchCreated;
    if (toggle.trigger === "dispatch.completed") return AUTOMATION_HELP.dispatchCompleted;
    if (toggle.primaryNodeType === "print_ticket") return AUTOMATION_HELP.printTicket;
    if (toggle.primaryNodeType === "webhook_push") return AUTOMATION_HELP.webhookCrm;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Help Banner */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Need help setting up automations?
          </span>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <a href="/app/help" className="text-xs">
            View full guide →
          </a>
        </Button>
      </div>

      {/* Customer Notifications */}
      {groupedToggles.notifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Customer Notifications</CardTitle>
              <InlineHelpTooltip
                title="Customer Notifications"
                description="Send automatic text messages to customers when events happen in your business."
              />
            </div>
            <CardDescription>
              Automatic text messages to keep customers informed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupedToggles.notifications.map(toggle => {
              const helpContent = getHelpForToggle(toggle);
              const state = toggleStates[toggle.id];
              const Icon = getToggleIcon(toggle);
              return (
                <div
                  key={toggle.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{toggle.label}</p>
                        {helpContent && (
                          <InlineHelpTooltip
                            title={helpContent.title}
                            description={helpContent.description}
                            steps={helpContent.steps}
                          />
                        )}
                        {state?.enabled && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {state?.message || toggle.description}
                      </p>
                      {state?.enabled && toggle.primaryNodeType === "notify_sms" && (
                        <QuickMessageEditor
                          message={state.message || toggle.defaultMessage || ""}
                          onSave={(msg) => handleMessageSave(toggle, msg)}
                          variables={getVariables(toggle.trigger)}
                        />
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={state?.enabled || false}
                    onCheckedChange={(checked) => handleToggle(toggle, checked)}
                    disabled={activateWorkflow.isPending || pauseWorkflow.isPending || createWorkflow.isPending}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Kitchen / Team Alerts */}
      {groupedToggles.kitchen.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Kitchen / Team Alerts</CardTitle>
              <InlineHelpTooltip
                title="Kitchen & Team Alerts"
                description="Automatically print tickets or alert your team when orders come in."
              />
            </div>
            <CardDescription>
              Instant notifications for your team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupedToggles.kitchen.map(toggle => {
              const state = toggleStates[toggle.id];
              const Icon = getToggleIcon(toggle);
              return (
                <div
                  key={toggle.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{toggle.label}</p>
                        {state?.enabled && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{toggle.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={state?.enabled || false}
                    onCheckedChange={(checked) => handleToggle(toggle, checked)}
                    disabled={activateWorkflow.isPending || pauseWorkflow.isPending || createWorkflow.isPending}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* External Integrations */}
      {groupedToggles.integrations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">External Integrations</CardTitle>
              <InlineHelpTooltip
                title="External Integrations"
                description="Send data to your CRM, Zapier, or other external services when events happen."
                steps={[
                  "Toggle ON to enable the integration",
                  "Click 'Set up webhook' to configure",
                  "Enter your webhook URL or use Zapier",
                  "Test the connection",
                ]}
              />
            </div>
            <CardDescription>
              Connect with your CRM, Zapier, and other tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupedToggles.integrations.map(toggle => {
              const state = toggleStates[toggle.id];
              const Icon = getToggleIcon(toggle);
              return (
                <div
                  key={toggle.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{toggle.label}</p>
                        {state?.enabled && state.webhookUrl ? (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            Connected
                          </Badge>
                        ) : state?.enabled ? (
                          <Badge variant="outline" className="text-xs bg-accent/10 text-accent-foreground border-accent/30">
                            No URL
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{toggle.description}</p>
                      {state?.enabled && toggle.primaryNodeType === "webhook_push" && (
                        <WebhookSetup
                          currentUrl={state.webhookUrl || ""}
                          onSave={(url) => handleWebhookSave(toggle, url)}
                        />
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={state?.enabled || false}
                    onCheckedChange={(checked) => handleToggle(toggle, checked)}
                    disabled={activateWorkflow.isPending || pauseWorkflow.isPending || createWorkflow.isPending}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Advanced Mode Link */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onAdvancedClick}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
        >
          Show Advanced Workflow Editor →
        </button>
      </div>
    </div>
  );
}

function getToggleIcon(toggle: AutomationToggle) {
  switch (toggle.trigger) {
    case "booking.confirmed":
      return Calendar;
    case "order.confirmed":
    case "order.ready":
      return UtensilsCrossed;
    case "dispatch.created":
    case "dispatch.completed":
      return Truck;
    case "missed_call":
    case "call.ended":
      return Phone;
    default:
      return MessageSquare;
  }
}
