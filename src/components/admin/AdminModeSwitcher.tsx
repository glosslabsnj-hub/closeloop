import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Briefcase, 
  Truck, 
  UtensilsCrossed, 
  Stethoscope, 
  Building2,
  ChevronDown,
  FlaskConical
} from "lucide-react";
import { toast } from "sonner";
import type { BusinessMode } from "@/types/database";

interface ModeConfig {
  label: string;
  icon: React.ElementType;
  modules: string[];
  hipaa: boolean;
}

const BUSINESS_MODES: Record<BusinessMode, ModeConfig> = {
  service: {
    label: "Service & Booking",
    icon: Briefcase,
    modules: ["ai_voice", "booking", "payments"],
    hipaa: false,
  },
  dispatch: {
    label: "Dispatch",
    icon: Truck,
    modules: ["ai_voice", "dispatch_queue", "gps_tracking"],
    hipaa: false,
  },
  food: {
    label: "Food & Restaurant",
    icon: UtensilsCrossed,
    modules: ["ai_voice", "food_orders", "menu_knowledge", "reservations", "catering"],
    hipaa: false,
  },
  medical: {
    label: "Medical Intake",
    icon: Stethoscope,
    modules: ["ai_voice", "medical_intake", "hipaa_logging"],
    hipaa: true,
  },
  general: {
    label: "General",
    icon: Building2,
    modules: ["ai_voice"],
    hipaa: false,
  },
};

export function AdminModeSwitcher() {
  const { tenant, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Only show for the tenant's admin
  if (!tenant || !user) return null;

  const currentMode = (tenant.business_mode as BusinessMode) || "service";
  const CurrentIcon = BUSINESS_MODES[currentMode]?.icon || Briefcase;

  const handleModeChange = async (newMode: BusinessMode) => {
    if (newMode === currentMode) return;
    
    setIsLoading(true);
    try {
      const config = BUSINESS_MODES[newMode];
      
      const { error } = await supabase
        .from("tenants")
        .update({
          business_mode: newMode,
          enabled_modules: config.modules,
          hipaa_mode: config.hipaa,
        })
        .eq("id", tenant.id);

      if (error) throw error;

      toast.success(`Switched to ${config.label} mode`);
      
      // Force page reload to update navigation and context
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch mode:", error);
      toast.error("Failed to switch business mode");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-warning/10 border-b border-warning/20">
      <div className="flex items-center justify-center gap-3 px-4 py-2 text-sm">
        <FlaskConical className="h-4 w-4 text-warning" />
        <span className="text-warning font-medium">
          Testing Mode:
        </span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isLoading}
              className="h-7 gap-1.5 bg-background border-warning/30 hover:bg-warning/10"
            >
              <CurrentIcon className="h-3.5 w-3.5" />
              {BUSINESS_MODES[currentMode]?.label || "Select Mode"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            {Object.entries(BUSINESS_MODES).map(([mode, config]) => {
              const Icon = config.icon;
              return (
                <DropdownMenuItem
                  key={mode}
                  onClick={() => handleModeChange(mode as BusinessMode)}
                  className={mode === currentMode ? "bg-accent" : ""}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {config.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
