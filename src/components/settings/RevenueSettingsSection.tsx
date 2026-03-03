import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useRevenueSettings } from "@/hooks/useRevenueSettings";
import { useAuth } from "@/contexts/AuthContext";
import { getLadderStep, mapLegacyToNewSku, formatPrice } from "@/config/pricing";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import type { IndustryCategory } from "@/data/industryCatalog";

// ---------------------------------------------------------------------------
// Industry-aware default service values (cents)
// Resolved: slug → category → mode → fallback ($150)
// ---------------------------------------------------------------------------

const SLUG_VALUES: Record<string, number> = {
  plumbing: 30000,        // $300 — avg service call $150-500+
  hvac: 25000,            // $250 — avg service call $150-400
  electrical: 25000,      // $250 — similar to HVAC
  "auto-repair": 20000,   // $200 — oil change to engine work
  "auto-detailing": 15000,// $150 — wash to full detail
  dental: 25000,          // $250 — cleaning to procedures
  chiropractic: 12500,    // $125 — adjustments
  "hair-salon": 7500,     // $75  — cuts to color
  barbershop: 4000,       // $40  — cuts + trims
  towing: 15000,          // $150 — avg tow
  "lawn-care": 10000,     // $100 — mowing to full service
  pizza: 3500,            // $35  — avg order
  "coffee_shop": 800,     // $8   — avg order
  bakery: 3000,           // $30  — avg order
  "catering_service": 50000, // $500 — avg event
};

const CATEGORY_VALUES: Partial<Record<IndustryCategory, number>> = {
  home_services: 25000,       // $250
  auto_services: 17500,       // $175
  beauty_wellness: 7500,      // $75
  health_medical: 20000,      // $200
  pet_services: 7500,         // $75
  professional_services: 20000,// $200
  fitness_recreation: 10000,  // $100
  dispatch_logistics: 15000,  // $150
  food_hospitality: 3500,     // $35
  property_real_estate: 50000,// $500
  events_entertainment: 30000,// $300
  sales_dealerships: 50000,   // $500
};

const MODE_VALUES: Record<BusinessMode, number> = {
  service: 15000,  // $150
  dispatch: 15000, // $150
  food: 3500,      // $35
  medical: 20000,  // $200
  sales: 50000,    // $500
  general: 15000,  // $150
};

function getSmartDefault(
  mode: BusinessMode,
  category: IndustryCategory | null,
  slug: string | null,
): number {
  if (slug && SLUG_VALUES[slug] != null) return SLUG_VALUES[slug];
  if (category && CATEGORY_VALUES[category] != null) return CATEGORY_VALUES[category]!;
  return MODE_VALUES[mode] ?? 15000;
}

// Industry-aware label for the "service value" field
function getValueLabel(appointmentLabel: string): string {
  const map: Record<string, string> = {
    job: "Default Job Value",
    dispatch: "Default Service Value",
    reservation: "Average Order Value",
    order: "Average Order Value",
    visit: "Default Visit Value",
    session: "Default Session Value",
    consultation: "Default Consultation Value",
    event: "Average Event Value",
  };
  return map[appointmentLabel] ?? "Default Service Value";
}

function getValueDescription(appointmentLabel: string): string {
  const map: Record<string, string> = {
    job: "Used when a job doesn't have a fixed price (e.g., \"call for a quote\" jobs).",
    order: "Used as the average order value when individual item tracking isn't available.",
    reservation: "Used as the average check size for calculating revenue from reservations.",
    visit: "Used when a visit doesn't have a set fee (e.g., insurance-dependent visits).",
    event: "Used as the average event value when individual pricing varies.",
  };
  return map[appointmentLabel] ?? "Used when a service doesn't have a fixed price (e.g., \"call for a quote\" services).";
}

export function RevenueSettingsSection() {
  const { subscription } = useAuth();
  const { settings, isLoading, upsertSettings } = useRevenueSettings();
  const { mode, category, slug, terminology } = useIndustryContext();

  const smartDefault = useMemo(
    () => getSmartDefault(mode, category, slug),
    [mode, category, slug],
  );
  const smartDefaultStr = (smartDefault / 100).toFixed(2);

  const [defaultValue, setDefaultValue] = useState(smartDefaultStr);
  const [costOverride, setCostOverride] = useState("");
  const [useOverride, setUseOverride] = useState(false);
  const [sendReport, setSendReport] = useState(false);

  // Derive auto-detected plan price
  const planCode = (subscription as any)?.plan_code;
  const mappedSku = planCode ? mapLegacyToNewSku(planCode) : null;
  const planStep = mappedSku ? getLadderStep(mappedSku) : null;
  const autoPlanPrice = planStep?.price ?? 249;

  // Sync state from loaded settings (DB value wins), else use smart industry default
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
    } else {
      // No saved settings yet — prefill with industry-aware default
      setDefaultValue(smartDefaultStr);
    }
  }, [settings, smartDefaultStr]);

  const handleSave = () => {
    const fallbackCents = smartDefault;
    const defaultCents = Math.round(parseFloat(defaultValue || String(fallbackCents / 100)) * 100);
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
          Configure how your AI-generated revenue and return on investment are calculated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Service Value */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {getValueLabel(terminology.appointmentLabel)}
          </label>
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
              placeholder={smartDefaultStr}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {getValueDescription(terminology.appointmentLabel)}
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
            Used to calculate how much revenue your AI generates vs. what you pay. Override if you have a custom deal or annual plan.
          </p>
        </div>

        {/* Monthly Report Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Monthly Revenue Report</p>
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
