import { useState, useMemo } from "react";
import {
  Link2, Zap, History, Settings2, Headset, ChevronDown, ChevronUp,
  Calendar, FileSpreadsheet, Printer, Webhook, MessageSquare, ExternalLink,
  CheckCircle, AlertCircle, Play, Loader2, Check, ArrowRight, HelpCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import { 
  useIntegrations, 
  useIntegrationMutations,
  useAutomationRules,
  useAutomationRuleMutations,
  useAutomationRuns,
  useTestAutomation,
  PROVIDERS 
} from "@/hooks/useIntegrations";
import { useToast } from "@/hooks/use-toast";
import { AutomationRunHistorySection } from "@/components/automations/AutomationRunHistorySection";
import { ConciergeRequestDialog } from "@/components/integrations/ConciergeRequestDialog";
import { IntegrationConnectDialog } from "@/components/integrations/IntegrationConnectDialog";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { MoreIntegrationsDialog } from "@/components/integrations/MoreIntegrationsDialog";
import { IntegrationStatusDashboard } from "@/components/integrations/IntegrationStatusDashboard";
import { IntegrationHealthAlert, type HealthWarning } from "@/components/integrations/IntegrationHealthAlert";
import { AutomationActivityFeed } from "@/components/integrations/AutomationActivityFeed";
import { SELF_SETUP_INTEGRATIONS, FEATURED_EXPERT_INTEGRATIONS } from "@/data/popularIntegrations";

// Quick automation presets that create real automation_rules
interface QuickPreset {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  trigger: string;
  action: string;
  provider: string;
  modes: BusinessMode[];
  requiresIntegration?: string;
  color: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: "booking-calendar",
    icon: <Calendar className="h-5 w-5" />,
    label: "Push bookings to Google Calendar",
    description: "Auto-create calendar events for confirmed bookings",
    trigger: "booking.created",
    action: "create_calendar_event",
    provider: "google_calendar",
    modes: ["service", "medical", "general"],
    requiresIntegration: "google_calendar",
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    id: "booking-webhook",
    icon: <Webhook className="h-5 w-5" />,
    label: "Send bookings to webhook",
    description: "POST booking data to your external system",
    trigger: "booking.created",
    action: "send_webhook",
    provider: "webhook",
    modes: ["service", "medical", "general"],
    color: "text-violet-500 bg-violet-500/10",
  },
  {
    id: "order-printer",
    icon: <Printer className="h-5 w-5" />,
    label: "Print orders automatically",
    description: "Auto-print kitchen tickets for new orders",
    trigger: "order.created",
    action: "print_receipt",
    provider: "printer",
    modes: ["food"],
    color: "text-orange-500 bg-orange-500/10",
  },
  {
    id: "order-webhook",
    icon: <Webhook className="h-5 w-5" />,
    label: "Send orders to webhook",
    description: "POST order data to your POS or external system",
    trigger: "order.created",
    action: "send_webhook",
    provider: "webhook",
    modes: ["food"],
    color: "text-violet-500 bg-violet-500/10",
  },
  {
    id: "dispatch-sms",
    icon: <MessageSquare className="h-5 w-5" />,
    label: "SMS owner on new dispatch",
    description: "Notify team when new dispatch jobs come in",
    trigger: "dispatch_job.created",
    action: "send_sms_to_owner",
    provider: "sms",
    modes: ["dispatch"],
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    id: "lead-sheets",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    label: "Send leads to Google Sheets",
    description: "Auto-log new leads to a spreadsheet",
    trigger: "lead.captured",
    action: "append_sheet_row",
    provider: "google_sheets",
    modes: ["service", "medical", "dispatch", "general"],
    requiresIntegration: "google_sheets",
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    id: "call-webhook",
    icon: <Webhook className="h-5 w-5" />,
    label: "Send call summaries to webhook",
    description: "POST call data after every completed call",
    trigger: "call.completed",
    action: "send_webhook",
    provider: "webhook",
    modes: ["service", "food", "dispatch", "medical", "general"],
    color: "text-violet-500 bg-violet-500/10",
  },
];

// Tool connections (used for status checking)
const CONNECT_TOOLS = [
  { id: "google_calendar", name: "Google Calendar", icon: "📅", description: "Sync bookings to your calendar" },
  { id: "google_sheets", name: "Google Sheets", icon: "📊", description: "Log data to spreadsheets" },
  { id: "webhook", name: "Webhook", icon: "🔗", description: "Send data to any URL" },
  { id: "printer", name: "Printer", icon: "🖨️", description: "Print kitchen tickets" },
] as const;

export default function IntegrationsPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  const { businessMode } = useTenantConfig();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("automations");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [webhookConfigDialog, setWebhookConfigDialog] = useState<QuickPreset | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [moreIntegrationsOpen, setMoreIntegrationsOpen] = useState(false);
  const [conciergePrefilledSystem, setConciergePrefilledSystem] = useState<string | null>(null);

  // Data hooks
  const { data: integrations, isLoading: integrationsLoading } = useIntegrations(tenantId);
  const { data: rules, isLoading: rulesLoading } = useAutomationRules(tenantId);
  const { data: automationRuns, isLoading: runsLoading } = useAutomationRuns(tenantId, 50);
  const { createRule, toggleRule } = useAutomationRuleMutations(tenantId);
  const { createIntegration, testIntegration, updateIntegration } = useIntegrationMutations(tenantId);
  const testAutomation = useTestAutomation();

  // Compute automation stats for dashboard
  const automationStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRuns = (automationRuns || []).filter(r => new Date(r.started_at) >= today);
    const successCount = todayRuns.filter(r => r.status === "success").length;
    const failureCount = todayRuns.filter(r => r.status === "failed").length;
    const lastRunAt = automationRuns?.[0]?.started_at || null;
    
    return {
      totalRuns: todayRuns.length,
      successCount,
      failureCount,
      lastRunAt,
    };
  }, [automationRuns]);

  // Check for health warnings
  const healthWarnings = useMemo((): HealthWarning[] => {
    const warnings: HealthWarning[] = [];
    
    // Check for error integrations
    (integrations || []).forEach(integration => {
      if (integration.status === "error") {
        warnings.push({
          id: `error-${integration.id}`,
          type: "sync_error",
          integrationId: integration.id,
          integrationName: integration.display_name,
          message: integration.error_message || "Connection error detected. Please reconnect.",
        });
      }
    });
    
    // Check for failed automation runs
    const recentFailures = (automationRuns || [])
      .filter(r => r.status === "failed")
      .slice(0, 3);
    
    if (recentFailures.length > 0) {
      const failedProviders = [...new Set(recentFailures.map(r => r.rule?.destination_provider).filter(Boolean))];
      if (failedProviders.length > 0) {
        warnings.push({
          id: "webhook-failures",
          type: "webhook_failing",
          integrationId: recentFailures[0].rule?.integration_id || "",
          integrationName: failedProviders.join(", "),
          message: `${recentFailures.length} recent automation${recentFailures.length > 1 ? "s" : ""} failed. Check the History tab for details.`,
          actionLabel: "View History",
        });
      }
    }
    
    return warnings;
  }, [integrations, automationRuns]);

  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([]);
  const activeWarnings = healthWarnings.filter(w => !dismissedWarnings.includes(w.id));

  if (!tenantId) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Filter presets by business mode
  const availablePresets = QUICK_PRESETS.filter(p => p.modes.includes(businessMode));
  const connectedIntegrations = (integrations || []).filter(i => i.status === "connected");

  // Check if integration is connected
  const isIntegrationConnected = (provider: string): boolean => {
    if (provider === "webhook" || provider === "sms" || provider === "printer") return true;
    return connectedIntegrations.some(i => i.provider === provider);
  };

  // Get existing rule for preset
  const getPresetRule = (preset: QuickPreset) => {
    return rules?.find(
      r => r.trigger_event === preset.trigger && r.action_type === preset.action
    );
  };

  // Toggle automation - creates or updates automation_rules row
  const handleToggle = async (preset: QuickPreset) => {
    const existingRule = getPresetRule(preset);

    // Check if integration is required
    if (preset.requiresIntegration && !isIntegrationConnected(preset.requiresIntegration)) {
      setSelectedProvider(preset.requiresIntegration);
      setConnectDialogOpen(true);
      return;
    }

    if (existingRule) {
      // Toggle existing rule
      await toggleRule.mutateAsync({ id: existingRule.id, enabled: !existingRule.enabled });
    } else {
      // For webhook presets, prompt for URL first
      if (preset.action === "send_webhook") {
        setWebhookConfigDialog(preset);
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

  // Create webhook automation with URL
  const handleCreateWebhookRule = async () => {
    if (!webhookConfigDialog || !webhookUrl) return;

    await createRule.mutateAsync({
      name: webhookConfigDialog.label,
      description: webhookConfigDialog.description,
      trigger_event: webhookConfigDialog.trigger,
      action_type: webhookConfigDialog.action,
      destination_provider: webhookConfigDialog.provider,
      field_mapping_json: { url: webhookUrl },
    });

    toast({
      title: "Automation enabled",
      description: webhookConfigDialog.label,
    });

    setWebhookConfigDialog(null);
    setWebhookUrl("");
  };

  // Test automation
  const handleTest = async (preset: QuickPreset) => {
    const existingRule = getPresetRule(preset);
    if (!existingRule) {
      toast({
        title: "Enable first",
        description: "Enable this automation before testing",
        variant: "destructive",
      });
      return;
    }

    await testAutomation.mutateAsync({
      rule_id: existingRule.id,
      dry_run: false,
    });
  };

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        icon={<Link2 className="h-5 w-5" />}
        title="Integrations"
        description="Connect your tools and automate what happens when calls, bookings, and orders come in"
        action={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setConciergeOpen(true)}
          >
            <Headset className="h-4 w-4" />
            Have an expert set this up
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="automations" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Automations</span>
          </TabsTrigger>
          <TabsTrigger value="connect" className="gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Connect</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-6">
          {/* Quick Automations */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Quick Automations</h2>
              <Badge variant="secondary" className="text-xs">One-click setup</Badge>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              Toggle these on to automate common tasks — each creates a real automation rule
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availablePresets.map((preset) => {
                const rule = getPresetRule(preset);
                const isEnabled = rule?.enabled || false;
                const connected = preset.requiresIntegration 
                  ? isIntegrationConnected(preset.requiresIntegration)
                  : true;

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
                              disabled={toggleRule.isPending || createRule.isPending}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {preset.description}
                          </p>

                          {/* Status row */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {isEnabled && (
                              <Badge variant="default" className="text-[10px] h-5 gap-1">
                                <Check className="h-3 w-3" />
                                Active
                              </Badge>
                            )}

                            {preset.requiresIntegration && !connected && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 text-[10px] px-2"
                                onClick={() => {
                                  setSelectedProvider(preset.requiresIntegration!);
                                  setConnectDialogOpen(true);
                                }}
                              >
                                Connect {preset.requiresIntegration.replace("_", " ")}
                              </Button>
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
          </section>

          {/* Advanced Section */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-4 h-auto border rounded-lg bg-muted/30 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  <span className="font-medium">Advanced</span>
                  <Badge variant="outline" className="text-xs">Custom webhooks</Badge>
                </div>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Custom Webhook Configuration</CardTitle>
                  <CardDescription>
                    For advanced users: send data to any URL with custom field mapping
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Need to connect to a system we don't have a built-in integration for?
                    Our team can help set up custom webhook configurations.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConciergeOpen(true)}>
                      Request custom setup
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        {/* Connect Tools Tab - Redesigned */}
        <TabsContent value="connect" className="space-y-8">
          {/* Status Dashboard - Shows connected integrations at a glance */}
          <IntegrationStatusDashboard
            integrations={integrations || []}
            automationStats={automationStats}
            onAddIntegration={() => setActiveTab("connect")}
            onReconnect={(id) => {
              const integration = integrations?.find(i => i.id === id);
              if (integration) {
                setSelectedProvider(integration.provider);
                setConnectDialogOpen(true);
              }
            }}
            isLoading={integrationsLoading}
          />

          {/* Health Alerts */}
          {activeWarnings.length > 0 && (
            <IntegrationHealthAlert
              warnings={activeWarnings}
              onReconnect={(id) => {
                const integration = integrations?.find(i => i.id === id);
                if (integration) {
                  setSelectedProvider(integration.provider);
                  setConnectDialogOpen(true);
                }
              }}
              onDismiss={(warningId) => setDismissedWarnings(prev => [...prev, warningId])}
            />
          )}

          {/* Intro Section */}
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">How Integrations Work</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect Voxly to your existing tools. Some integrations you can set up yourself in minutes — others our team will configure for you (usually within 24 hours).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section A: Self-Setup Integrations */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Set Up Yourself</h2>
              <Badge variant="secondary" className="text-xs">Free</Badge>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              These are quick to connect — just click and follow the steps
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SELF_SETUP_INTEGRATIONS.map((tool) => {
                const integration = integrations?.find(i => i.provider === tool.id);
                const isConnected = integration?.status === "connected";

                return (
                  <IntegrationCard
                    key={tool.id}
                    id={tool.id}
                    name={tool.name}
                    icon={tool.icon}
                    logo={'logo' in tool ? (tool as any).logo : undefined}
                    description={tool.description}
                    isConnected={isConnected}
                    isSelfSetup={true}
                    isLoading={testIntegration.isPending}
                    onConnect={() => {
                      setSelectedProvider(tool.id);
                      setConnectDialogOpen(true);
                    }}
                    onTest={isConnected ? () => integration && testIntegration.mutate(integration.id) : undefined}
                  />
                );
              })}
            </div>
          </section>

          {/* Section B: Expert-Setup Integrations */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Headset className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">We'll Set These Up For You</h2>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              Need Square, ServiceTitan, or Toast? Our team will configure these for you — usually within 24 hours.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURED_EXPERT_INTEGRATIONS.map((tool) => (
                <IntegrationCard
                  key={tool.id}
                  id={tool.id}
                  name={tool.name}
                  icon={tool.icon}
                  logo={'logo' in tool ? (tool as any).logo : undefined}
                  description={tool.description}
                  isConnected={false}
                  isSelfSetup={false}
                  onRequestSetup={() => {
                    setConciergePrefilledSystem(tool.name);
                    setConciergeOpen(true);
                  }}
                />
              ))}
            </div>

            {/* More Integrations Button */}
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setMoreIntegrationsOpen(true)}
              >
                More Integrations
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>

          {/* Section C: Don't See Your Tool */}
          <Card className="border-dashed bg-muted/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    Don't see your tool?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We can connect to almost any system — FieldEdge, Towbook, AthenaHealth, GoHighLevel, and more.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setConciergePrefilledSystem(null);
                    setConciergeOpen(true);
                  }}
                  className="shrink-0"
                >
                  Request Custom Integration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab - Enhanced Activity Feed */}
        <TabsContent value="history" className="space-y-6">
          <AutomationActivityFeed
            runs={automationRuns || []}
            isLoading={runsLoading}
            onRetry={(runId) => {
              const run = automationRuns?.find(r => r.id === runId);
              if (run?.rule_id) {
                testAutomation.mutate({ rule_id: run.rule_id, dry_run: false });
              }
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ConciergeRequestDialog
        open={conciergeOpen}
        onOpenChange={setConciergeOpen}
      />

      <MoreIntegrationsDialog
        open={moreIntegrationsOpen}
        onOpenChange={setMoreIntegrationsOpen}
        onRequestSetup={(systemName) => {
          setConciergePrefilledSystem(systemName);
          setConciergeOpen(true);
        }}
      />

      {selectedProvider && (
        <IntegrationConnectDialog
          open={connectDialogOpen}
          onOpenChange={setConnectDialogOpen}
          providerId={selectedProvider}
          onConnected={() => {
            setConnectDialogOpen(false);
            setSelectedProvider(null);
          }}
        />
      )}

      {/* Webhook Config Dialog */}
      <Dialog open={!!webhookConfigDialog} onOpenChange={() => setWebhookConfigDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Webhook</DialogTitle>
            <DialogDescription>
              Enter the URL where you want to receive data when {webhookConfigDialog?.trigger} fires
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
            <Button variant="outline" onClick={() => setWebhookConfigDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWebhookRule}
              disabled={!webhookUrl || createRule.isPending}
            >
              {createRule.isPending ? "Enabling..." : "Enable & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
