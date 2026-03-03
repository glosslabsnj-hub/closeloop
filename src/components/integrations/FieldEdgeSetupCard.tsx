import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Plug, Unplug, CheckCircle2, ExternalLink } from "lucide-react";
import { useFieldEdgeIntegration } from "@/hooks/useFieldEdgeIntegration";
import { formatDistanceToNow } from "date-fns";

export function FieldEdgeSetupCard() {
  const {
    integration,
    isLoading,
    isConnected,
    authenticate,
    toggle,
    syncNow,
    disconnect,
  } = useFieldEdgeIntegration();

  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isConnected && integration) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Connected to FieldEdge</CardTitle>
            </div>
            <Badge variant={integration.is_active ? "default" : "secondary"}>
              {integration.is_active ? "Active" : "Paused"}
            </Badge>
          </div>
          {integration.config_json?.company_name && (
            <CardDescription>
              Company: {integration.config_json.company_name}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {integration.last_synced_at && (
            <p className="text-xs text-muted-foreground">
              Last synced {formatDistanceToNow(new Date(integration.last_synced_at), { addSuffix: true })}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={integration.is_active}
                onCheckedChange={(checked) => toggle.mutate(checked)}
              />
              <span className="text-sm">Auto-sync every 5 minutes</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncNow.mutate()}
                disabled={syncNow.isPending || !integration.is_active}
              >
                {syncNow.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                )}
                Sync Now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => disconnect.mutate()}
                className="text-destructive hover:text-destructive"
              >
                <Unplug className="h-3.5 w-3.5 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p><strong>How sync works:</strong></p>
            <p>• Bookings created by AI → pushed to FieldEdge as work orders</p>
            <p>• FieldEdge dispatches → pulled into your Jobs board</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plug className="h-4 w-4" />
          Connect FieldEdge
        </CardTitle>
        <CardDescription>
          Enter your FieldEdge API credentials to enable bidirectional sync.
          Your technician can get these from their FieldEdge account or by contacting{" "}
          <a
            href="https://www.fieldedge.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline inline-flex items-center gap-0.5"
          >
            FieldEdge support <ExternalLink className="h-3 w-3" />
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fe-api-key">API Key</Label>
          <Input
            id="fe-api-key"
            type="password"
            placeholder="Your FieldEdge API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fe-base-url">API Base URL (optional)</Label>
          <Input
            id="fe-base-url"
            placeholder="https://api.fieldedge.com/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use the default FieldEdge address
          </p>
        </div>
        <Button
          onClick={() => authenticate.mutate({ api_key: apiKey, base_url: baseUrl || undefined })}
          disabled={!apiKey || authenticate.isPending}
        >
          {authenticate.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
          Connect
        </Button>
      </CardContent>
    </Card>
  );
}
