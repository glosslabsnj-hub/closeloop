/**
 * ServicePreviewStep - Onboarding step for previewing/editing template services
 *
 * Shows pre-populated services from industry template and lets user
 * edit, add, remove, or toggle services before they're saved to DB.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";
import { getIndustryTerminology } from "@/data/industryTerminology";
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

export function ServicePreviewStep({
  businessMode,
  industrySlug,
  services,
  onChange,
}: ServicePreviewStepProps) {
  const terms = getIndustryTerminology(businessMode);
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

      <div className="space-y-3">
        {services.map((service, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-lg border p-3 bg-card"
          >
            <Switch
              checked={service.enabled}
              onCheckedChange={() => toggleService(idx)}
            />

            <div className="flex-1 min-w-0">
              {editingIdx === idx ? (
                <div className="space-y-2">
                  <Input
                    value={service.name}
                    onChange={(e) => updateService(idx, "name", e.target.value)}
                    placeholder={terms.itemNamePlaceholder}
                    autoFocus
                    onBlur={() => setEditingIdx(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingIdx(null)}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={service.duration}
                      onChange={(e) => updateService(idx, "duration", parseInt(e.target.value) || 0)}
                      className="w-24"
                      placeholder="Min"
                    />
                    <Input
                      type="number"
                      value={service.price}
                      onChange={(e) => updateService(idx, "price", parseFloat(e.target.value) || 0)}
                      className="w-24"
                      placeholder="Price"
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-left w-full"
                  onClick={() => setEditingIdx(idx)}
                >
                  <p className={`text-sm font-medium ${!service.enabled ? "text-muted-foreground line-through" : ""}`}>
                    {service.name || `New ${terms.serviceItemLabel}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {service.duration} min
                    {service.price > 0 && ` · $${service.price}`}
                    {service.priceType === "starting_at" && "+"}
                    {service.priceType === "quote_only" && " · Quote only"}
                  </p>
                </button>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeService(idx)}
            >
              <X className="h-4 w-4" />
            </Button>
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
}
