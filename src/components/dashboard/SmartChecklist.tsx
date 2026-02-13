import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { useAIReadinessV2 } from "@/hooks/useAIReadinessV2";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  Clock,
  Calendar,
  HelpCircle,
  FileText,
  Users,
  MapPin,
  Package,
  UtensilsCrossed,
} from "lucide-react";

interface ChecklistTask {
  id: string;
  label: string;
  description: string;
  href: string;
  isComplete: boolean;
  timeEstimate: string;
  icon: React.ElementType;
  impact: "high" | "medium" | "low";
}

/**
 * SmartChecklist - Contextual task list that shows what's left to configure.
 * Tasks are mode-aware and sorted by impact.
 */
export function SmartChecklist() {
  const { tenant, assistantSettings } = useAuth();
  const { businessMode } = useTenantConfig();
  const { services } = useServices();
  const { hasConnectedCalendar } = useCalendarConnections();
  const { p0Flags } = useAIReadinessV2();

  const activeServices = (services || []).filter((s) => s.is_active !== false);
  const hoursConfigured =
    !!tenant?.hours_json &&
    Object.keys((tenant?.hours_json as Record<string, unknown>) || {}).length > 0;

  // Fetch FAQ count
  const { data: faqCount = 0 } = useQuery({
    queryKey: ["smart-checklist-faqs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("business_faqs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);
      return count || 0;
    },
    enabled: !!tenant?.id,
  });

  // Fetch menu item count (food mode)
  const { data: menuItemCount = 0 } = useQuery({
    queryKey: ["smart-checklist-menu", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0;
      const { count } = await supabase
        .from("menu_items")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant.id);
      return count || 0;
    },
    enabled: !!tenant?.id && businessMode === "food",
  });

  // Fetch team size from onboarding
  const teamSize = useMemo(() => {
    const caps = (tenant as any)?.capabilities_json;
    if (!caps) return 1;
    const profile = caps._business_profile;
    if (!profile?.team_size) return 1;
    const sizeMap: Record<string, number> = { solo: 1, "2-5": 3, "6-15": 10, "16+": 20 };
    return sizeMap[profile.team_size] || 1;
  }, [tenant]);

  const tasks = useMemo<ChecklistTask[]>(() => {
    const all: ChecklistTask[] = [];

    // Calendar connection — high impact for booking modes, medium for others
    const isBookingMode = businessMode === "service" || businessMode === "medical";
    if (!hasConnectedCalendar && isBookingMode) {
      all.push({
        id: "calendar",
        label: "Connect your Google Calendar",
        description: "So your AI books real slots and avoids double-booking",
        href: "/app/business-brain?section=about&item=calendar-sync",
        isComplete: false,
        timeEstimate: "~2 min",
        icon: Calendar,
        impact: "high",
      });
    }

    // FAQs — high impact for all modes
    if (faqCount < 5) {
      all.push({
        id: "faqs",
        label: faqCount === 0 ? "Add your top FAQs" : `Add more FAQs (${faqCount}/5)`,
        description: "Your AI answers these when customers ask common questions",
        href: "/app/business-brain?section=training&item=faqs",
        isComplete: false,
        timeEstimate: "~3 min",
        icon: HelpCircle,
        impact: "high",
      });
    }

    // Services/Menu — mode-specific, high impact
    if (businessMode === "food") {
      // Food mode: check menu items, not services
      if (menuItemCount === 0) {
        all.push({
          id: "menu",
          label: "Add your menu items",
          description: "So your AI can describe your menu and take orders",
          href: "/app/business-brain?section=services&item=catalog",
          isComplete: false,
          timeEstimate: "~5 min",
          icon: UtensilsCrossed,
          impact: "high",
        });
      }
    } else if (businessMode !== "dispatch") {
      // Service, medical, general, sales: check services
      if (activeServices.length === 0) {
        all.push({
          id: "services",
          label: "Add your services",
          description: "So your AI can describe what you offer and quote prices",
          href: "/app/business-brain?section=services&item=catalog",
          isComplete: false,
          timeEstimate: "~3 min",
          icon: Package,
          impact: "high",
        });
      }
    }
    // Dispatch: services are handled differently via dispatch-specific setup; omit from checklist

    // Hours — high impact for all modes
    if (!hoursConfigured) {
      all.push({
        id: "hours",
        label: "Set your business hours",
        description: "So your AI can tell callers when you're open",
        href: "/app/business-brain?section=about&item=business-hours",
        isComplete: false,
        timeEstimate: "~1 min",
        icon: Clock,
        impact: "high",
      });
    }

    // Policies — medium impact (all modes)
    const hasCancellationPolicy = p0Flags.every((f) => f !== "missing_policies");
    if (!hasCancellationPolicy) {
      all.push({
        id: "policies",
        label: "Set your cancellation policy",
        description: "So your AI can explain your policy to customers",
        href: "/app/business-brain?section=operations&item=policies",
        isComplete: false,
        timeEstimate: "~1 min",
        icon: FileText,
        impact: "medium",
      });
    }

    // Service area — medium impact (dispatch/service modes only)
    if (
      (businessMode === "dispatch" || businessMode === "service") &&
      p0Flags.includes("missing_service_area")
    ) {
      all.push({
        id: "service-area",
        label: "Define your service area",
        description: "So your AI can confirm if a location is serviceable",
        href: "/app/business-brain?section=operations&item=coverage",
        isComplete: false,
        timeEstimate: "~2 min",
        icon: MapPin,
        impact: businessMode === "dispatch" ? "high" : "medium",
      });
    }

    // Calendar — medium impact for non-booking modes
    if (!hasConnectedCalendar && !isBookingMode && businessMode !== "dispatch") {
      all.push({
        id: "calendar",
        label: "Connect your calendar",
        description: "Sync your schedule so your AI knows when you're available",
        href: "/app/business-brain?section=about&item=calendar-sync",
        isComplete: false,
        timeEstimate: "~2 min",
        icon: Calendar,
        impact: "medium",
      });
    }

    // Team members — medium impact (if team > 1)
    if (teamSize > 1) {
      all.push({
        id: "team",
        label: "Add your team members",
        description: "So your AI knows who's available and can assign work",
        href: "/app/business-brain?section=about&item=team",
        isComplete: false,
        timeEstimate: "~2 min",
        icon: Users,
        impact: "medium",
      });
    }

    // Sort: high > medium > low
    const impactOrder = { high: 0, medium: 1, low: 2 };
    all.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

    return all;
  }, [
    hasConnectedCalendar,
    faqCount,
    menuItemCount,
    activeServices.length,
    hoursConfigured,
    p0Flags,
    businessMode,
    teamSize,
  ]);

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Recommended Next Steps
        </h3>
        <span className="text-xs text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"} remaining
        </span>
      </div>
      <div className="space-y-1.5">
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
            <Link
              key={task.id}
              to={task.href}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all group",
                "hover:border-primary/20 hover:bg-primary/5"
              )}
            >
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{task.label}</p>
                <p className="text-xs text-muted-foreground truncate">{task.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {task.timeEstimate}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
