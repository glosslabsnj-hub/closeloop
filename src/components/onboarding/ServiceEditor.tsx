import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { ServiceTemplate, durationOptions, priceTypeOptions } from "@/data/industryTemplates";

interface ServiceEditorProps {
  services: ServiceTemplate[];
  onChange: (services: ServiceTemplate[]) => void;
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

  return (
    <div className="space-y-3">
      {services.map((service, index) => (
        <div key={index} className="p-3 rounded-lg border bg-card space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={service.name}
              onChange={(e) => updateService(index, 'name', e.target.value)}
              placeholder="Service name"
              className="flex-1"
            />
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
      ))}
      
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
