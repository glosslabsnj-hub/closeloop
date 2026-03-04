import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MessageSquare,
  Calendar,
  Truck,
  UtensilsCrossed,
  BookOpen,
  Clock,
  Cake,
  Stethoscope,
  Shield,
  Warehouse,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIndustryContext } from "@/hooks/useIndustryContext";

interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  isCore?: boolean;
  requiresMode?: string[];
}

const allModules: ModuleDefinition[] = [
  {
    id: "ai_voice",
    label: "AI Voice Agent",
    description: "AI answers phone calls 24/7",
    icon: Phone,
    isCore: true,
  },
  {
    id: "instant_text_back",
    label: "Instant Text Back",
    description: "Auto-reply to missed calls via SMS",
    icon: MessageSquare,
    isCore: true,
  },
  {
    id: "booking",
    label: "Appointment Booking",
    description: "AI books appointments directly into your calendar",
    icon: Calendar,
    requiresMode: ["service", "medical", "general"],
  },
  {
    id: "dispatch_queue",
    label: "Dispatch Queue",
    description: "Manage same-day jobs with crew assignment",
    icon: Truck,
    requiresMode: ["dispatch"],
  },
  {
    id: "impound_lot",
    label: "Impound Lot",
    description: "Track impounded vehicles and releases",
    icon: Warehouse,
    requiresMode: ["dispatch"],
  },
  {
    id: "fleet_management",
    label: "Fleet Management",
    description: "Manage drivers, trucks, and assignments",
    icon: Users,
    requiresMode: ["dispatch"],
  },
  {
    id: "food_orders",
    label: "Food Orders",
    description: "Take orders via phone and track fulfillment",
    icon: UtensilsCrossed,
    requiresMode: ["food"],
  },
  {
    id: "menu_knowledge",
    label: "Menu Center",
    description: "Upload and manage your menu for AI knowledge",
    icon: BookOpen,
    requiresMode: ["food"],
  },
  {
    id: "reservations",
    label: "Reservations",
    description: "Accept and manage table reservations",
    icon: Clock,
    requiresMode: ["food"],
  },
  {
    id: "catering",
    label: "Catering Requests",
    description: "Handle catering inquiries and quotes",
    icon: Cake,
    requiresMode: ["food"],
  },
  {
    id: "medical_intake",
    label: "Medical Intake",
    description: "HIPAA-compliant patient intake forms",
    icon: Stethoscope,
    requiresMode: ["medical"],
  },
];

interface ModuleSelectorProps {
  businessMode: string;
  enabledModules: string[];
  onChange: (modules: string[]) => void;
}

export function ModuleSelector({ businessMode, enabledModules, onChange }: ModuleSelectorProps) {
  const { terminology } = useIndustryContext();
  const apptLabelPlural = terminology.appointmentLabel === "appointment" ? "appointments" : `${terminology.appointmentLabel}s`;
  // Filter modules available for this business mode
  const availableModules = allModules.filter(
    (module) => !module.requiresMode || module.requiresMode.includes(businessMode)
  ).map((module) => {
    // Dynamic label for booking module based on industry terminology
    if (module.id === "booking") {
      const label = terminology.appointmentLabel === "appointment" ? "Appointment Booking" : `${terminology.appointmentLabel.charAt(0).toUpperCase() + terminology.appointmentLabel.slice(1)} Booking`;
      return { ...module, label, description: `AI books ${apptLabelPlural} directly into your calendar` };
    }
    return module;
  });

  const toggleModule = (moduleId: string) => {
    const module = allModules.find(m => m.id === moduleId);
    if (module?.isCore) return; // Can't toggle core modules

    if (enabledModules.includes(moduleId)) {
      onChange(enabledModules.filter(m => m !== moduleId));
    } else {
      onChange([...enabledModules, moduleId]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Select the features you want to enable. Core modules are always included.
      </div>

      <div className="space-y-3">
        {availableModules.map((module) => {
          const Icon = module.icon;
          const isEnabled = enabledModules.includes(module.id);
          const isCore = module.isCore;

          return (
            <Card
              key={module.id}
              className={cn(
                "transition-all",
                isEnabled && "border-primary/50 bg-primary/5"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                    isEnabled ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{module.label}</h4>
                      {isCore && (
                        <Badge variant="secondary" className="text-xs">
                          Core
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                  </div>

                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleModule(module.id)}
                    disabled={isCore}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {businessMode === "medical" && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  HIPAA Mode Enabled
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Medical businesses automatically enable HIPAA-compliant data handling. 
                  Call recordings and full transcripts are disabled by default.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { allModules };
