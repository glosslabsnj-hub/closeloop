/**
 * ModeHint - Mode-specific guidance banner
 * 
 * Shows helpful context about what matters most for this business type
 */

import { 
  Truck, 
  UtensilsCrossed, 
  Wrench, 
  Stethoscope, 
  Building2,
  LucideIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface ModeHintProps {
  mode: BusinessMode;
  className?: string;
}

interface ModeConfig {
  icon: LucideIcon;
  title: string;
  emphasis: string[];
  tip: string;
}

const modeConfigs: Record<BusinessMode, ModeConfig> = {
  dispatch: {
    icon: Truck,
    title: "Dispatch Mode",
    emphasis: ["Service Area & ETA", "Required Questions"],
    tip: "Focus on location coverage and getting accurate pickup info from every caller.",
  },
  food: {
    icon: UtensilsCrossed,
    title: "Food & Restaurant",
    emphasis: ["Menu Items", "Order Settings"],
    tip: "Make sure your menu is complete with prices. The AI reads this to take orders.",
  },
  service: {
    icon: Wrench,
    title: "Service Business",
    emphasis: ["Services & Pricing", "Calendar"],
    tip: "Add your services with prices so AI can give quotes. Connect your calendar to avoid double-booking.",
  },
  medical: {
    icon: Stethoscope,
    title: "Medical Practice",
    emphasis: ["Required Questions", "HIPAA Settings"],
    tip: "Set up intake questions and configure HIPAA-compliant data handling.",
  },
  general: {
    icon: Building2,
    title: "General Business",
    emphasis: ["FAQs", "Policies"],
    tip: "Focus on FAQs so your AI can answer common questions accurately.",
  },
};

export function ModeHint({ mode, className }: ModeHintProps) {
  const config = modeConfigs[mode];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-4",
      "border-primary/20",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm">{config.title}</h3>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              Focus on: {config.emphasis.join(", ")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{config.tip}</p>
        </div>
      </div>
    </div>
  );
}
