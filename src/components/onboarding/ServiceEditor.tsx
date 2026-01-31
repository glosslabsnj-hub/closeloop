import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { ServiceTemplate, durationOptions, priceTypeOptions } from "@/data/industryTemplates";

interface ServiceEditorProps {
  services: ServiceTemplate[];
  onChange: (services: ServiceTemplate[]) => void;
}

// Check if a service has valid pricing
function hasValidPrice(service: ServiceTemplate): boolean {
  if (service.priceType === "quote_only") return true; // Quote is intentional
  return service.price !== undefined && service.price > 0;
}

// Get badge text for missing price
function getPriceBadge(service: ServiceTemplate): { text: string; variant: "destructive" | "secondary" | "outline" } | null {
  if (service.priceType === "quote_only") {
    return { text: "Quote only", variant: "secondary" };
  }
  if (!hasValidPrice(service)) {
    return { text: "No price (AI will offer quote)", variant: "destructive" };
  }
  return null;
}

export default function ServiceEditor({ services, onChange }: ServiceEditorProps) {
  const updateService = (index: number, field: keyof ServiceTemplate, value: string | number) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeService = (index: number) => {
    if (services.length <= 1) return;
    const updated = services.filter((_, i) => i !== index);
    onChange(updated);
  };

  const addService = () => {
    onChange([
      ...services,
      { name: '', duration: 60, price: 0, priceType: 'fixed' },
    ]);
  };

  // Count services with missing prices
  const missingPriceCount = services.filter(s => !hasValidPrice(s) && s.priceType !== "quote_only").length;

  return (
    <div className="space-y-3">
      {/* Warning banner if any services lack pricing */}
      {missingPriceCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">
            {missingPriceCount} service{missingPriceCount > 1 ? "s" : ""} missing price. 
            AI will offer to schedule a quote instead of giving pricing.
          </span>
        </div>
      )}

      {services.map((service, index) => {
        const badge = getPriceBadge(service);
        
        return (
          <div key={index} className="p-3 rounded-lg border bg-card space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={service.name}
                onChange={(e) => updateService(index, 'name', e.target.value)}
                placeholder="Service name"
                className="flex-1"
              />
              {badge && (
                <Badge variant={badge.variant} className="shrink-0 text-xs">
                  {badge.text}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeService(index)}
                disabled={services.length <= 1}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={service.duration.toString()}
                onValueChange={(value) => updateService(index, 'duration', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  value={service.price}
                  onChange={(e) => updateService(index, 'price', parseFloat(e.target.value) || 0)}
                  className="pl-7"
                  placeholder="0"
                />
              </div>
              
              <Select
                value={service.priceType}
                onValueChange={(value) => updateService(index, 'priceType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priceTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
      
      <Button
        variant="outline"
        onClick={addService}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Service
      </Button>
    </div>
  );
}