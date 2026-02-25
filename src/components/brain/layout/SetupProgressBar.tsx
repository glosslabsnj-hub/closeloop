/**
 * Business Brain Setup Progress Bar
 * 
 * Visual progress indicator showing:
 * - 6 key setup milestones
 * - Completion computed from loaded values (no API calls)
 * - Click to scroll to relevant section
 */

import { useMemo } from "react";
import { 
  Building2, 
  Clock, 
  Package, 
  MapPin, 
  Shield, 
  Sparkles,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { cn } from "@/lib/utils";

interface SetupMilestone {
  id: string;
  label: string;
  icon: typeof Building2;
  section: string;
  isComplete: boolean;
}

interface SetupProgressBarProps {
  onNavigateToSection: (section: string) => void;
  className?: string;
}

export function SetupProgressBar({ onNavigateToSection, className }: SetupProgressBarProps) {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();

  const milestones = useMemo<SetupMilestone[]>(() => {
    if (!tenant) return [];

    return [
      {
        id: "identity",
        label: "Identity",
        icon: Building2,
        section: "profile",
        isComplete: Boolean(tenant.name && tenant.timezone),
      },
      {
        id: "hours",
        label: "Hours",
        icon: Clock,
        section: "hours",
        // Check hours_json on tenant
        isComplete: Boolean(tenant.hours_json),
      },
      {
        id: "offerings",
        label: caps.isFoodBusiness ? "Menu" : "Services",
        icon: Package,
        section: "services",
        // Basic check - would ideally count services
        isComplete: false, // Requires separate query
      },
      {
        id: "coverage",
        label: "Coverage",
        icon: MapPin,
        section: "service-area",
        isComplete: Boolean(
          (tenant as Record<string, unknown>).service_area_config_json
        ),
      },
      {
        id: "policies",
        label: "Policies",
        icon: Shield,
        section: "policies",
        isComplete: Boolean(tenant.cancellation_policy),
      },
      {
        id: "ai",
        label: "AI Scripts",
        icon: Sparkles,
        section: "ai-behavior",
        // Basic check for greeting setup
        isComplete: false, // Requires assistant_settings query
      },
    ];
  }, [tenant, businessMode, caps]);

  const completedCount = milestones.filter(m => m.isComplete).length;
  const progressPercent = milestones.length > 0 
    ? Math.round((completedCount / milestones.length) * 100) 
    : 0;

  if (!tenant) return null;

  return (
    <div className={cn("rounded-lg border bg-card/50 p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Setup Progress</h3>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{milestones.length} complete
        </span>
      </div>

      <Progress value={progressPercent} className="h-2 mb-4" />

      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          {milestones.map((milestone) => {
            const _Icon = milestone.icon;
            return (
              <Tooltip key={milestone.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateToSection(milestone.section)}
                    className={cn(
                      "gap-1.5 h-8 px-2",
                      milestone.isComplete 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-muted-foreground"
                    )}
                  >
                    {milestone.isComplete ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs">{milestone.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{milestone.isComplete ? "Complete" : "Needs setup"}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
