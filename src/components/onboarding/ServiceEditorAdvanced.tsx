import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { durationOptions, priceTypeOptions } from "@/data/industryTemplates";
import type { ModeFieldContract } from "@/lib/businessModeContract";
import { useIndustryContext } from "@/hooks/useIndustryContext";

export interface AdvancedService {
  name: string;
  duration: number;
  price: number;
  priceType: 'fixed' | 'starting_at' | 'quote_only';
  description: string;
  preparationInstructions: string;
  upsellSuggestions: string[];
  depositRequired: boolean;
}

interface ServiceEditorAdvancedProps {
  services: AdvancedService[];
  onChange: (services: AdvancedService[]) => void;
  modeContract?: ModeFieldContract;
}

export default function ServiceEditorAdvanced({ services, onChange, modeContract }: ServiceEditorAdvancedProps) {
  const { terminology } = useIndustryContext();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  // Filter price type options based on mode contract
  const allowedPriceTypes = modeContract
    ? priceTypeOptions.filter(opt => modeContract.allowedPriceTypes.includes(opt.value as any))
    : priceTypeOptions;

  const updateService = (index: number, field: keyof AdvancedService, value: any) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeService = (index: number) => {
    if (services.length <= 1) return;
    const updated = services.filter((_, i) => i !== index);
    onChange(updated);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const addService = () => {
    const newService: AdvancedService = {
      name: '',
      duration: 60,
      price: 0,
      priceType: 'fixed',
      description: '',
      preparationInstructions: '',
      upsellSuggestions: [],
      depositRequired: false,
    };
    onChange([...services, newService]);
    setExpandedIndex(services.length);
  };

  const formatPrice = (price: number, priceType: string) => {
    if (priceType === 'quote_only') return 'Quote';
    const prefix = priceType === 'starting_at' ? 'From ' : '';
    return `${prefix}$${price}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-3">
      {services.map((service, index) => (
        <Collapsible
          key={index}
          open={expandedIndex === index}
          onOpenChange={(open) => setExpandedIndex(open ? index : null)}
        >
          <div className="rounded-lg border bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {expandedIndex === index ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {service.name || 'New Service'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {modeContract?.showDuration !== false && `${formatDuration(service.duration)} • `}
                      {formatPrice(service.price, service.priceType)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeService(index);
                  }}
                  disabled={services.length <= 1}
                  className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="p-3 pt-0 space-y-4 border-t">
                {/* Basic info */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Service Name *</Label>
                    <Input
                      value={service.name}
                      onChange={(e) => updateService(index, 'name', e.target.value)}
                      placeholder="e.g., Full Detail"
                    />
                  </div>
                  
                  <div className={modeContract?.showDuration !== false ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"}>
                    {modeContract?.showDuration !== false && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Duration</Label>
                        <Select
                          value={service.duration.toString()}
                          onValueChange={(value) => updateService(index, 'duration', parseInt(value))}
                        >
                          <SelectTrigger className="h-9">
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
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs">{modeContract?.labels?.priceLabel || "Price"}</Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          min={0}
                          value={service.price}
                          onChange={(e) => updateService(index, 'price', parseFloat(e.target.value) || 0)}
                          className="pl-6 h-9"
                          disabled={service.priceType === 'quote_only'}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Price Type</Label>
                      <Select
                        value={service.priceType}
                        onValueChange={(value) => updateService(index, 'priceType', value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedPriceTypes.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{modeContract?.labels?.offeringDescription || "What's included?"}</Label>
                  <Textarea
                    value={service.description}
                    onChange={(e) => updateService(index, 'description', e.target.value)}
                    placeholder="Describe what the customer gets with this service..."
                    rows={2}
                    className="text-sm"
                  />
                </div>

                {/* Preparation instructions */}
                {modeContract?.showPreparationInstructions !== false && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preparation Instructions</Label>
                    <Textarea
                      value={service.preparationInstructions}
                      onChange={(e) => updateService(index, 'preparationInstructions', e.target.value)}
                      placeholder={`What should the ${terminology.customerLabel} do before the ${terminology.appointmentLabel}?`}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}

                {/* Upsells */}
                {modeContract?.showUpsellSuggestions !== false && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Upsell Suggestions</Label>
                    <Input
                      value={service.upsellSuggestions.join(', ')}
                      onChange={(e) => updateService(index, 'upsellSuggestions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="e.g., Ceramic coating, Paint protection (comma-separated)"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">AI will suggest these add-ons to customers</p>
                  </div>
                )}

                {/* Deposit */}
                {modeContract?.showDepositRequired !== false && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-sm">Require deposit?</Label>
                      <p className="text-xs text-muted-foreground">Collect payment before confirming</p>
                    </div>
                    <Switch
                      checked={service.depositRequired}
                      onCheckedChange={(checked) => updateService(index, 'depositRequired', checked)}
                    />
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
      
      <Button
        variant="outline"
        onClick={addService}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add {modeContract?.labels?.offeringName || "Service"}
      </Button>
    </div>
  );
}
