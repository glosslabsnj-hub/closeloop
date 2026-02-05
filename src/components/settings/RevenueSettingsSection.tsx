import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useRevenueSettings } from "@/hooks/useRevenueSettings";
import { useAuth } from "@/contexts/AuthContext";
import { getLadderStep, mapLegacyToNewSku, formatPrice } from "@/config/pricing";

export function RevenueSettingsSection() {
  const { subscription } = useAuth();
  const { settings, isLoading, upsertSettings } = useRevenueSettings();

  const [defaultValue, setDefaultValue] = useState("100.00");
  const [costOverride, setCostOverride] = useState("");
  const [useOverride, setUseOverride] = useState(false);
  const [sendReport, setSendReport] = useState(false);

  // Derive auto-detected plan price
  const planCode = (subscription as any)?.plan_code;
  const mappedSku = planCode ? mapLegacyToNewSku(planCode) : null;
  const planStep = mappedSku ? getLadderStep(mappedSku) : null;
  const autoPlanPrice = planStep?.price ?? 249;

  // Sync state from loaded settings
  useEffect(() => {
    if (settings) {
      setDefaultValue((settings.default_service_value_cents / 100).toFixed(2));
      setSendReport(settings.send_monthly_report);
      if (settings.subscription_cost_override_cents !== null) {
        setUseOverride(true);
        setCostOverride((settings.subscription_cost_override_cents / 100).toFixed(2));
      } else {
        setUseOverride(false);
        setCostOverride("");
      }
    }
  }, [settings]);

  const handleSave = () => {
    const defaultCents = Math.round(parseFloat(defaultValue || "100") * 100);
    const overrideCents = useOverride && costOverride
      ? Math.round(parseFloat(costOverride) * 100)
      : null;

    upsertSettings.mutate({
      default_service_value_cents: defaultCents,
      subscription_cost_override_cents: overrideCents,
      send_monthly_report: sendReport,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-6 w-48" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Tracking</CardTitle>
        <CardDescription>
          Configure how your AI-generated revenue and ROI are calculated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Service Value */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Default Service Value</label>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              className="pl-7"
              placeholder="100.00"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Used as a fallback when a service doesn't have a set price (e.g., quote-only services).
          </p>
        </div>

        {/* Subscription Cost */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Monthly Subscription Cost</label>
          <div className="flex items-center gap-3">
            <Badge variant="muted" size="sm">
              Auto-detected: {formatPrice(autoPlanPrice)}/mo
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={useOverride}
              onCheckedChange={setUseOverride}
            />
            <span className="text-sm text-muted-foreground">
              Override with custom amount
            </span>
          </div>

          {useOverride && (
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costOverride}
                onChange={(e) => setCostOverride(e.target.value)}
                className="pl-7"
                placeholder={autoPlanPrice.toFixed(2)}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Used to calculate your ROI. Override if you have a custom deal or annual plan.
          </p>
        </div>

        {/* Monthly Report Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Monthly ROI Email</p>
            <p className="text-xs text-muted-foreground">
              Receive a monthly revenue report via email
            </p>
          </div>
          <Switch
            checked={sendReport}
            onCheckedChange={setSendReport}
          />
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={upsertSettings.isPending}
        >
          {upsertSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
