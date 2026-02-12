import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Plug, Unplug, CheckCircle2, ExternalLink } from "lucide-react";
import { useTekmetricIntegration, type TekmetricShop } from "@/hooks/useTekmetricIntegration";
import { formatDistanceToNow } from "date-fns";

export function TekmetricSetup() {
  const {
    integration,
    isLoading,
    isConnected,
    authenticate,
    selectShop,
    toggle,
    syncNow,
    disconnect,
  } = useTekmetricIntegration();

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [shops, setShops] = useState<TekmetricShop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [step, setStep] = useState<"credentials" | "shop-select" | "connected">(
    isConnected ? "connected" : "credentials"
  );

  // Derive step from integration state
  const effectiveStep = isConnected
    ? "connected"
    : integration?.config_json?.shops?.length
    ? "shop-select"
    : step;

  const handleAuthenticate = () => {
    authenticate.mutate(
      { client_id: clientId, client_secret: clientSecret },
      {
        onSuccess: (data) => {
          setShops(data.shops);
          setStep("shop-select");
        },
      }
    );
  };

  const handleSelectShop = () => {
    if (!selectedShopId) return;
    selectShop.mutate(selectedShopId, {
      onSuccess: () => setStep("connected"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Tekmetric Integration</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically sync repair orders from Tekmetric into your Active Jobs board.
        </p>
      </div>

      {effectiveStep === "connected" && integration ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Connected to Tekmetric</CardTitle>
              </div>
              <Badge variant={integration.is_active ? "default" : "secondary"}>
                {integration.is_active ? "Active" : "Paused"}
              </Badge>
            </div>
            {integration.config_json?.selected_shop_name && (
              <CardDescription>
                Shop: {integration.config_json.selected_shop_name}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Last synced */}
            {integration.last_synced_at && (
              <p className="text-xs text-muted-foreground">
                Last synced {formatDistanceToNow(new Date(integration.last_synced_at), { addSuffix: true })}
              </p>
            )}

            {/* Controls */}
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
          </CardContent>
        </Card>
      ) : effectiveStep === "shop-select" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Your Shop</CardTitle>
            <CardDescription>
              Choose which Tekmetric shop to sync repair orders from.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedShopId} onValueChange={setSelectedShopId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a shop..." />
              </SelectTrigger>
              <SelectContent>
                {(shops.length > 0 ? shops : integration?.config_json?.shops || []).map((shop) => (
                  <SelectItem key={String(shop.id)} value={String(shop.id)}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={handleSelectShop} disabled={!selectedShopId || selectShop.isPending}>
                {selectShop.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Start Syncing
              </Button>
              <Button variant="ghost" onClick={() => { setStep("credentials"); setShops([]); }}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plug className="h-4 w-4" />
              Connect Tekmetric
            </CardTitle>
            <CardDescription>
              Enter your Tekmetric API credentials. You can get these from{" "}
              <a
                href="https://api.tekmetric.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-0.5"
              >
                api.tekmetric.com <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tek-client-id">Client ID</Label>
              <Input
                id="tek-client-id"
                placeholder="Your Tekmetric Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tek-client-secret">Client Secret</Label>
              <Input
                id="tek-client-secret"
                type="password"
                placeholder="Your Tekmetric Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAuthenticate}
              disabled={!clientId || !clientSecret || authenticate.isPending}
            >
              {authenticate.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Connect
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
