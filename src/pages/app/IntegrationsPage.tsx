import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Route, 
  Link2, 
  Headset, 
  History,
  Calendar,
  Table,
  Printer,
  MessageSquare,
  Mail,
  FileText,
  ChevronRight,
  CheckCircle2,
  Settings2,
  ExternalLink,
} from "lucide-react";
import { useRoutingRules, ROUTING_TEMPLATES, type RoutingRuleTemplate } from "@/hooks/useRoutingRules";
import { useIntegrations, useIntegrationMutations, PROVIDERS } from "@/hooks/useIntegrations";
import { ConciergeRequestDialog } from "@/components/integrations/ConciergeRequestDialog";
import { IntegrationConnectDialog } from "@/components/integrations/IntegrationConnectDialog";
import { AutomationRunHistorySection } from "@/components/automations/AutomationRunHistorySection";

const ICON_MAP: Record<string, React.ReactNode> = {
  calendar: <Calendar className="h-4 w-4" />,
  table: <Table className="h-4 w-4" />,
  printer: <Printer className="h-4 w-4" />,
  "message-square": <MessageSquare className="h-4 w-4" />,
  mail: <Mail className="h-4 w-4" />,
  "file-text": <FileText className="h-4 w-4" />,
};

export default function IntegrationsPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  const businessMode = tenant?.business_mode || "general";
  
  const [activeTab, setActiveTab] = useState("routing");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  
  const { rules, isLoading: rulesLoading, toggleRule, getTemplatesForMode, isRuleEnabled } = useRoutingRules();
  const { data: integrations, isLoading: integrationsLoading } = useIntegrations(tenantId);
  const { createIntegration, testIntegration } = useIntegrationMutations(tenantId);

  if (!tenantId) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const templates = getTemplatesForMode(businessMode);
  const connectedIntegrations = (integrations || []).filter(i => i.status === "connected");

  const handleToggleRule = (template: RoutingRuleTemplate, enabled: boolean) => {
    // Check if integration is required and connected
    if (template.requiresIntegration && template.integrationProvider) {
      const isConnected = connectedIntegrations.some(
        i => i.provider === template.integrationProvider
      );
      if (!isConnected && enabled) {
        // Open connect dialog for this provider
        setSelectedProvider(template.integrationProvider);
        setConnectDialogOpen(true);
        return;
      }
    }
    
    toggleRule.mutate({
      trigger_event: template.trigger_event,
      destination: template.destination,
      enabled,
      label: template.label,
    });
  };

  const isIntegrationConnected = (provider: string): boolean => {
    return connectedIntegrations.some(i => i.provider === provider);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Route className="h-6 w-6 text-primary" />
          Integrations & Routing
        </h1>
        <p className="page-subtitle">
          Control what happens when calls, bookings, and orders come in
        </p>
      </div>

      {/* Concierge CTA Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Headset className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Need help connecting your systems?</p>
              <p className="text-sm text-muted-foreground">
                Our team can set up FieldEdge, ServiceTitan, Towbook, or any other system for you.
              </p>
            </div>
          </div>
          <Button onClick={() => setConciergeOpen(true)} className="shrink-0">
            Have an expert set this up
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="routing" className="gap-2">
            <Route className="h-4 w-4" />
            <span className="hidden sm:inline">Routing</span>
          </TabsTrigger>
          <TabsTrigger value="connect" className="gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Connections</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Routing Rules Tab */}
        <TabsContent value="routing" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Automatic Routing</CardTitle>
              <CardDescription>
                Toggle what happens when AI handles calls. Everything is saved in CloseLoop first—these rules send copies to your other tools.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {rulesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">
                  No routing options available for your business type.
                </p>
              ) : (
                templates.map((template) => {
                  const enabled = isRuleEnabled(template.trigger_event, template.destination);
                  const needsIntegration = template.requiresIntegration && template.integrationProvider;
                  const integrationConnected = needsIntegration 
                    ? isIntegrationConnected(template.integrationProvider!)
                    : true;

                  return (
                    <div
                      key={`${template.trigger_event}-${template.destination}`}
                      className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {ICON_MAP[template.icon] || <Route className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{template.label}</p>
                          {needsIntegration && !integrationConnected && (
                            <p className="text-xs text-muted-foreground">
                              Requires {template.integrationProvider?.replace("_", " ")} connection
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {needsIntegration && integrationConnected && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => handleToggleRule(template, checked)}
                          disabled={toggleRule.isPending}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Advanced Toggle */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-muted-foreground"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {showAdvanced ? "Hide" : "Show"} advanced options
            </Button>
          </div>

          {showAdvanced && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Advanced: Webhook Routing</CardTitle>
                <CardDescription>
                  For developers: send data to any URL when events occur
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Webhook configuration is available for advanced users who want to connect to custom systems.
                  Contact support or use the concierge service for help setting this up.
                </p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setConciergeOpen(true)}>
                  Request webhook setup
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connect" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {PROVIDERS.filter(p => p.id !== "webhook").map((provider) => {
              const connected = isIntegrationConnected(provider.id);
              
              return (
                <Card key={provider.id} className={connected ? "border-green-500/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted text-2xl">
                          {provider.icon}
                        </div>
                        <div>
                          <h3 className="font-medium">{provider.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {provider.description}
                          </p>
                        </div>
                      </div>
                      {connected ? (
                        <Badge variant="success">Connected</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProvider(provider.id);
                            setConnectDialogOpen(true);
                          }}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Can't find your tool */}
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <h3 className="font-medium mb-2">Don't see your tool?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We can connect FieldEdge, ServiceTitan, Towbook, Toast, and many more.
              </p>
              <Button variant="outline" onClick={() => setConciergeOpen(true)}>
                Request integration setup
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <AutomationRunHistorySection tenantId={tenantId} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ConciergeRequestDialog
        open={conciergeOpen}
        onOpenChange={setConciergeOpen}
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
    </div>
  );
}
