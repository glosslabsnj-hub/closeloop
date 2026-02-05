import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTerminology } from "@/hooks/useTerminology";
import {
  CheckCircle2,
  Circle,
  Package,
  Clock,
  HelpCircle,
  Phone,
  FlaskConical,
  Rocket,
  ChevronRight,
} from "lucide-react";

interface SetupStep {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  completed: boolean;
}

/**
 * SetupProgressChecklist - Clean setup progress with premium styling
 */
export function SetupProgressChecklist() {
  const { tenant, assistantSettings } = useAuth();
  const terms = useTerminology();

  // Fetch counts for completion checks
  const { data: counts } = useQuery({
    queryKey: ["setup-checklist-counts", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { services: 0, faqs: 0 };

      const [servicesResult, faqsResult] = await Promise.all([
        supabase
          .from("services")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
        supabase
          .from("business_faqs")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
      ]);

      return {
        services: servicesResult.count || 0,
        faqs: faqsResult.count || 0,
      };
    },
    enabled: !!tenant?.id,
  });

  // Check if hours are configured
  const hoursConfigured = !!(tenant as any)?.hours_json && 
    Object.keys((tenant as any)?.hours_json || {}).length > 0;

  // Build steps based on existing state
  const steps: SetupStep[] = [
    {
      id: "services",
      label: terms.addServicesStep,
      description: terms.addServicesDescription,
      href: "/app/business-brain?section=services",
      icon: Package,
      completed: (counts?.services || 0) > 0,
    },
    {
      id: "hours",
      label: "Set your hours",
      description: "When you're open for business",
      href: "/app/business-brain?section=hours",
      icon: Clock,
      completed: hoursConfigured,
    },
    {
      id: "faqs",
      label: "Add FAQs",
      description: "Common questions your AI can answer",
      href: "/app/business-brain?section=knowledge",
      icon: HelpCircle,
      completed: (counts?.faqs || 0) >= 3,
    },
    {
      id: "phone",
      label: "Connect phone",
      description: "Get your AI phone number",
      href: "/app/settings",
      icon: Phone,
      completed: assistantSettings?.phone_connected || false,
    },
    {
      id: "test",
      label: "Test AI",
      description: "Make sure everything works",
      href: "/app/simulator",
      icon: FlaskConical,
      completed: (assistantSettings as any)?.setup_step_tested || false,
    },
    {
      id: "golive",
      label: "Go live",
      description: "Start answering real calls",
      href: "/app/go-live",
      icon: Rocket,
      completed: assistantSettings?.go_live_enabled || false,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Don't show if already live
  if (assistantSettings?.go_live_enabled) {
    return null;
  }

  return (
    <Card className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground">Setup Progress</h3>
        <div className="flex items-center gap-2">
          <Progress value={progressPercent} className="w-16 h-1.5" />
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {completedCount}/{steps.length}
          </span>
        </div>
      </div>

      <CardContent className="px-5 py-4">
        <div className="space-y-0.5">
          {steps.map((step) => (
            <Link
              key={step.id}
              to={step.href}
              className={`flex items-center gap-3 p-2.5 -mx-2.5 rounded-lg transition-colors group ${
                step.completed
                  ? "text-muted-foreground/70"
                  : "hover:bg-muted/40"
              }`}
            >
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    step.completed ? "line-through text-muted-foreground" : "text-foreground/90"
                  }`}
                >
                  {step.label}
                </p>
                {!step.completed && (
                  <p className="text-xs text-muted-foreground/70 truncate">
                    {step.description}
                  </p>
                )}
              </div>
              {!step.completed && (
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
