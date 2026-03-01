/**
 * ServicePreviewStep - Onboarding step for previewing/editing template services
 *
 * Shows pre-populated services from industry template and lets user
 * edit, add, remove, or toggle services before they're saved to DB.
 */

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, AlertCircle, DollarSign } from "lucide-react";
import { getIndustryTerminology } from "@/data/industryTerminology";
import { cn } from "@/lib/utils";
import { getPricingModel } from "@/config/pricingModels";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export interface EditableService {
  name: string;
  duration: number;
  price: number;
  priceType: "fixed" | "starting_at" | "quote_only";
  description?: string;
  enabled: boolean;
}

interface ServicePreviewStepProps {
  businessMode: BusinessMode;
  industrySlug: string;
  services: EditableService[];
  onChange: (services: EditableService[]) => void;
}

export const ServicePreviewStep = React.memo(function ServicePreviewStep({
  businessMode,
  industrySlug,
  services,
  onChange,
}: ServicePreviewStepProps) {
  const terms = getIndustryTerminology(businessMode);
  const pricingModel = useMemo(() => getPricingModel(businessMode, industrySlug), [businessMode, industrySlug]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const toggleService = (idx: number) => {
    const updated = [...services];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    onChange(updated);
  };

  const updateService = (idx: number, field: keyof EditableService, value: string | number) => {
    const updated = [...services];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const removeService = (idx: number) => {
    const updated = services.filter((_, i) => i !== idx);
    onChange(updated);
  };

  const addService = () => {
    onChange([
      ...services,
      {
        name: "",
        duration: 60,
        price: 0,
        priceType: "fixed",
        enabled: true,
      },
    ]);
    setEditingIdx(services.length);
  };

  const enabledCount = services.filter((s) => s.enabled).length;
  const enabledNoPriceCount = services.filter((s) => s.enabled && s.price === 0 && s.priceType !== "quote_only").length;
  const allEnabled = services.length > 0 && enabledCount === services.length;
  const noneEnabled = enabledCount === 0;

  const toggleAll = (enabled: boolean) => {
    onChange(services.map(s => ({ ...s, enabled })));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {terms.catalogCardTitle}
        </h2>
        <p className="mt-2 text-muted-foreground">
          We've pre-loaded {terms.serviceItemLabel}s based on your industry.
          Toggle off any you don't offer, or add your own.
        </p>
      </div>

      {/* Pricing model context */}
      {pricingModel.typicalRange && (
        <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30 text-sm">
          <DollarSign className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">{pricingModel.label}</p>
            <p className="text-muted-foreground">
              {pricingModel.description}.{" "}
              <span className="text-foreground font-medium">Typical range: {pricingModel.typicalRange}</span>
            </p>
          </div>
        </div>
      )}

      {/* Pricing helper tip */}
      {enabledNoPriceCount > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            <strong className="text-foreground">{enabledNoPriceCount} {enabledNoPriceCount === 1 ? "service has" : "services have"} no price.</strong>{" "}
            Tap a service to add a price, or mark it as "Quote only" if pricing varies.
            Your AI uses prices to give callers accurate quotes.
          </p>
        </div>
      )}

      {/* Quick toggle all */}
      {services.length > 2 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {enabledCount} of {services.length} enabled
          </span>
          <div className="flex gap-2">
            {!allEnabled && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => toggleAll(true)}
              >
                Enable all
              </Button>
            )}
            {!noneEnabled && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-muted-foreground"
                onClick={() => toggleAll(false)}
              >
                Disable all
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {services.map((service, idx) => (
          <div
            key={idx}
            className={cn(
              "rounded-lg border p-4 bg-card transition-colors",
              service.enabled && "border-primary/30 bg-primary/5"
            )}
          >
            <div className="flex items-start gap-3">
              <Switch
                checked={service.enabled}
                onCheckedChange={() => toggleService(idx)}
                className="mt-0.5"
              />

              <div className="flex-1 min-w-0">
                {editingIdx === idx ? (
                  <div className="space-y-2">
                    <Input
                      value={service.name}
                      onChange={(e) => updateService(idx, "name", e.target.value)}
                      placeholder={terms.itemNamePlaceholder}
                      autoFocus
                    />
                    {/* Price type selector */}
                    <div className="flex gap-1">
                      {([
                        { value: "fixed", label: "Exact price" },
                        { value: "starting_at", label: "Starting at" },
                        { value: "quote_only", label: "Varies / quote" },
                      ] as const).map((pt) => (
                        <button
                          key={pt.value}
                          type="button"
                          className={cn(
                            "text-[11px] px-2 py-1 rounded-md border transition-colors",
                            service.priceType === pt.value
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                          )}
                          onClick={() => updateService(idx, "priceType", pt.value)}
                        >
                          {pt.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 items-end">
                      {service.priceType !== "quote_only" && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">
                            {service.priceType === "starting_at" ? "Starting price ($)" : "Price ($)"}
                          </label>
                          <Input
                            type="number"
                            value={service.price}
                            onChange={(e) => updateService(idx, "price", parseFloat(e.target.value) || 0)}
                            className="w-28"
                            aria-label={service.priceType === "starting_at" ? "Starting price" : "Price"}
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Duration (min)</label>
                        <Input
                          type="number"
                          value={service.duration}
                          onChange={(e) => updateService(idx, "duration", parseInt(e.target.value) || 0)}
                          className="w-28"
                          aria-label="Duration in minutes"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-9 px-3 shrink-0"
                        onClick={() => setEditingIdx(null)}
                      >
                        Done
                      </Button>
                    </div>
                    {service.priceType === "quote_only" && (
                      <p className="text-[11px] text-muted-foreground">Your AI will tell callers that pricing varies and offer to schedule an estimate.</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      !service.enabled && "text-muted-foreground line-through"
                    )}>
                      {service.name || `New ${terms.serviceItemLabel}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {service.priceType === "quote_only"
                        ? "Pricing varies"
                        : service.priceType === "starting_at" && service.price > 0
                        ? `From $${service.price}`
                        : service.price > 0
                        ? `$${service.price}`
                        : "No price set"}
                      {" · "}
                      {service.duration >= 60
                        ? `${Math.floor(service.duration / 60)} hour${service.duration >= 120 ? "s" : ""}${service.duration % 60 ? ` ${service.duration % 60} min` : ""}`
                        : `${service.duration} min`}
                    </p>
                  </div>
                )}
              </div>

              {editingIdx !== idx && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                    onClick={() => setEditingIdx(idx)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
                    onClick={() => removeService(idx)}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={addService}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        {terms.addItemButton}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        {enabledCount} {terms.serviceItemLabel}{enabledCount !== 1 ? "s" : ""} will be added to your account
      </p>
    </div>
  );
});
