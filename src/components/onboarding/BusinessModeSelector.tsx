import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  Truck,
  UtensilsCrossed,
  Stethoscope,
  Building2,
  DollarSign,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BusinessMode = "service" | "dispatch" | "food" | "medical" | "general" | "sales";

interface BusinessModeOption {
  value: BusinessMode;
  label: string;
  description: string;
  icon: React.ElementType;
  examples: string[];
  defaultModules: string[];
}

const businessModes: BusinessModeOption[] = [
  {
    value: "service",
    label: "Service Business",
    description: "Appointment-based services with scheduling",
    icon: Wrench,
    examples: ["Auto Detailing", "HVAC", "Plumbing", "Cleaning", "Salon"],
    defaultModules: ["ai_voice", "instant_text_back", "booking"],
  },
  {
    value: "dispatch",
    label: "Dispatch / On-Demand",
    description: "Same-day jobs with location-based dispatch",
    icon: Truck,
    examples: ["Towing", "Locksmith", "Delivery", "Moving", "Emergency Repairs"],
    defaultModules: ["ai_voice", "instant_text_back", "dispatch_queue"],
  },
  {
    value: "food",
    label: "Food & Hospitality",
    description: "Orders, reservations, and catering",
    icon: UtensilsCrossed,
    examples: ["Restaurants", "Cafes", "Catering", "Food Trucks", "Bakeries"],
    defaultModules: ["ai_voice", "instant_text_back", "food_orders", "menu_knowledge", "reservations", "catering"],
  },
  {
    value: "medical",
    label: "Medical / Healthcare",
    description: "HIPAA-compliant scheduling and intake",
    icon: Stethoscope,
    examples: ["MedSpa", "Dental", "Chiropractic", "Therapy", "Clinics"],
    defaultModules: ["ai_voice", "instant_text_back", "booking", "medical_intake"],
  },
  {
    value: "sales",
    label: "Sales / Dealership",
    description: "Lead qualification, appointments, and sales management",
    icon: DollarSign,
    examples: ["Car Dealership", "Real Estate", "RV/Boat", "Solar", "Insurance"],
    defaultModules: ["ai_voice", "instant_text_back", "sales_leads", "booking"],
  },
  {
    value: "general",
    label: "General Business",
    description: "Basic AI phone and text support",
    icon: Building2,
    examples: ["Consulting", "Professional Services"],
    defaultModules: ["ai_voice", "instant_text_back"],
  },
];

interface BusinessModeSelectorProps {
  value: BusinessMode;
  onChange: (mode: BusinessMode) => void;
}

export function BusinessModeSelector({ value, onChange }: BusinessModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Choose the type of business that best describes yours. This determines which features and modules are available.
      </div>
      
      <div className="grid gap-3">
        {businessModes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = value === mode.value;
          
          return (
            <Card
              key={mode.value}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isSelected && "border-primary ring-2 ring-primary/20"
              )}
              onClick={() => onChange(mode.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{mode.label}</h4>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {mode.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {mode.examples.slice(0, 4).map((example) => (
                        <Badge key={example} variant="secondary" className="text-xs">
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function getDefaultModulesForMode(mode: BusinessMode): string[] {
  const modeConfig = businessModes.find(m => m.value === mode);
  return modeConfig?.defaultModules || ["ai_voice", "instant_text_back"];
}

export { businessModes };
