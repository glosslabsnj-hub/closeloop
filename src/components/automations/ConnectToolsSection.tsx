import { useState } from "react";
import { Plus, Check, AlertCircle, Settings, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  useIntegrations,
  useIntegrationMutations,
  PROVIDERS,
  type Integration,
  type ProviderInfo,
} from "@/hooks/useIntegrations";
import { useTenantConfig } from "@/hooks/useTenantConfig";

interface ConnectToolsSectionProps {
  tenantId: string;
}

export function ConnectToolsSection({ tenantId }: ConnectToolsSectionProps) {
  const { businessMode } = useTenantConfig();
  const { data: integrations, isLoading } = useIntegrations(tenantId);
  const { createIntegration, updateIntegration, deleteIntegration, testIntegration } = useIntegrationMutations(tenantId);

  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderInfo | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);

  // Filter providers by business mode
  const availableProviders = PROVIDERS.filter((p) =>
    p.applicableModes.includes(businessMode)
  );

  // Check which providers are already connected
  const connectedProviderIds = new Set(integrations?.map((i) => i.provider) || []);

  const handleConnect = async () => {
    if (!selectedProvider) return;

    try {
      await createIntegration.mutateAsync({
        provider: selectedProvider.id,
        display_name: selectedProvider.name,
        auth_type: selectedProvider.authType,
        config_json: configValues,
      });
      setConnectDialogOpen(false);
      setSelectedProvider(null);
      setConfigValues({});
    } catch (e) {
      // Error handled by mutation
    }
  };

  const handleUpdate = async () => {
    if (!editingIntegration) return;

    try {
      await updateIntegration.mutateAsync({
        id: editingIntegration.id,
        config_json: configValues,
      });
      setEditingIntegration(null);
      setConfigValues({});
    } catch (e) {
      // Error handled by mutation
    }
  };

  const handleTest = async (id: string) => {
    await testIntegration.mutateAsync(id);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this integration?")) {
      await deleteIntegration.mutateAsync(id);
    }
  };

  const openEditDialog = (integration: Integration) => {
    setEditingIntegration(integration);
    setConfigValues((integration.config_json as Record<string, string>) || {});
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Connected Tools</h2>
          <p className="text-sm text-muted-foreground">
            Connect your external systems to receive data automatically
          </p>
        </div>
        <Button onClick={() => setConnectDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Connect Tool
        </Button>
      </div>

      {/* Connected integrations */}
      {integrations && integrations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            const provider = PROVIDERS.find((p) => p.id === integration.provider);
            return (
              <Card key={integration.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{provider?.icon || "🔌"}</span>
                      <CardTitle className="text-base">{integration.display_name}</CardTitle>
                    </div>
                    <Badge
                      variant={integration.status === "connected" ? "default" : integration.status === "error" ? "destructive" : "secondary"}
                    >
                      {integration.status === "connected" && <Check className="h-3 w-3 mr-1" />}
                      {integration.status === "error" && <AlertCircle className="h-3 w-3 mr-1" />}
                      {integration.status}
                    </Badge>
                  </div>
                  <CardDescription>{provider?.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {integration.error_message && (
                    <p className="text-xs text-destructive mb-2">{integration.error_message}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(integration.id)}
                      disabled={testIntegration.isPending}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${testIntegration.isPending ? "animate-spin" : ""}`} />
                      Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(integration)}>
                      <Settings className="h-3 w-3 mr-1" />
                      Configure
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(integration.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={ExternalLink}
          title="No tools connected"
          description="Connect your first tool to start automating data delivery"
          action={{
            label: "Connect Tool",
            onClick: () => setConnectDialogOpen(true),
          }}
        />
      )}

      {/* Available providers to connect */}
      {integrations && integrations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Available Integrations</h3>
          <div className="flex flex-wrap gap-2">
            {availableProviders
              .filter((p) => !connectedProviderIds.has(p.id))
              .map((provider) => (
                <Button
                  key={provider.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedProvider(provider);
                    setConnectDialogOpen(true);
                  }}
                >
                  <span className="mr-2">{provider.icon}</span>
                  {provider.name}
                </Button>
              ))}
          </div>
        </div>
      )}

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect a Tool</DialogTitle>
            <DialogDescription>
              Choose a tool to connect and configure its settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!selectedProvider ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {availableProviders
                  .filter((p) => !connectedProviderIds.has(p.id))
                  .map((provider) => (
                    <Card
                      key={provider.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedProvider(provider)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <span className="text-2xl">{provider.icon}</span>
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-xs text-muted-foreground">{provider.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <span className="text-2xl">{selectedProvider.icon}</span>
                  <div>
                    <p className="font-medium">{selectedProvider.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedProvider.description}</p>
                  </div>
                </div>

                {selectedProvider.configFields?.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.type === "select" ? (
                      <Select
                        value={configValues[field.key] || ""}
                        onValueChange={(value) =>
                          setConfigValues({ ...configValues, [field.key]: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="thermal">Thermal (Star/Epson)</SelectItem>
                          <SelectItem value="browser">Browser Print</SelectItem>
                          <SelectItem value="printnode">PrintNode</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={field.key}
                        type={field.type === "password" ? "password" : field.type === "url" ? "url" : "text"}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        value={configValues[field.key] || ""}
                        onChange={(e) =>
                          setConfigValues({ ...configValues, [field.key]: e.target.value })
                        }
                      />
                    )}
                  </div>
                ))}

                {selectedProvider.authType === "oauth" && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-1">OAuth Connection</p>
                    <p className="text-muted-foreground">
                      Click "Connect" to authorize access via your Google account.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {selectedProvider && (
              <Button variant="outline" onClick={() => setSelectedProvider(null)}>
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancel
            </Button>
            {selectedProvider && (
              <Button
                onClick={handleConnect}
                disabled={createIntegration.isPending}
              >
                {createIntegration.isPending ? "Connecting..." : "Connect"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingIntegration} onOpenChange={() => setEditingIntegration(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {editingIntegration?.display_name}</DialogTitle>
            <DialogDescription>Update your integration settings</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {editingIntegration &&
              PROVIDERS.find((p) => p.id === editingIntegration.provider)?.configFields?.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`edit-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`edit-${field.key}`}
                    type={field.type === "password" ? "password" : "text"}
                    value={configValues[field.key] || ""}
                    onChange={(e) =>
                      setConfigValues({ ...configValues, [field.key]: e.target.value })
                    }
                  />
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIntegration(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateIntegration.isPending}>
              {updateIntegration.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
