import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ListChecks,
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
 * SetupProgressChecklist - UI-only component showing setup progress
 * Reads existing state from AuthContext and DB, no new logic
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          Setup Progress
        </CardTitle>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-sm font-medium text-muted-foreground">
            {completedCount}/{steps.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.id}
                to={step.href}
                className={`flex items-center gap-3 p-2 -mx-2 rounded-lg transition-colors group ${
                  step.completed
                    ? "text-muted-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.completed ? "line-through" : ""
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>
                {!step.completed && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
