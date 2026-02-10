import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTerminology } from "@/hooks/useTerminology";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useBusinessCapabilities } from "@/hooks/useBusinessCapabilities";
import { cn } from "@/lib/utils";
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
  UtensilsCrossed,
  Truck,
  Warehouse,
  Users,
  Car,
  ClipboardList,
  FileText,
} from "lucide-react";

interface SetupStep {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  completed: boolean;
  skip?: boolean;
}

/**
 * SetupProgressChecklist - Mode-aware setup progress with dynamic steps
 */
export function SetupProgressChecklist() {
  const { tenant, assistantSettings } = useAuth();
  const terms = useTerminology();
  const caps = useCapabilities();
  const bizCaps = useBusinessCapabilities();

  // Fetch counts for completion checks
  const { data: counts } = useQuery({
    queryKey: ["setup-checklist-counts", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { services: 0, faqs: 0, menuItems: 0, impoundConfigured: false };

      const [servicesResult, faqsResult, menuResult, impoundSettingsResult, impoundLotsResult] = await Promise.all([
        supabase
          .from("services")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
        supabase
          .from("business_faqs")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
        supabase
          .from("menu_items")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
        supabase
          .from("impound_settings")
          .select("impound_handling_enabled, base_tow_fee_cents")
          .eq("tenant_id", tenant.id)
          .maybeSingle(),
        supabase
          .from("impound_lots")
          .select("address")
          .eq("tenant_id", tenant.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
      ]);

      // Check if impound lot is configured (has settings with fees OR has a lot address)
      const impoundConfigured = !!(
        (impoundSettingsResult.data?.base_tow_fee_cents && impoundSettingsResult.data.base_tow_fee_cents > 0) || 
        impoundLotsResult.data?.address
      );

      return {
        services: servicesResult.count || 0,
        faqs: faqsResult.count || 0,
        menuItems: menuResult.count || 0,
        impoundConfigured,
      };
    },
    enabled: !!tenant?.id,
  });

  // Check if hours are configured
  const hoursConfigured = !!tenant?.hours_json &&
    Object.keys((tenant?.hours_json as Record<string, unknown>) || {}).length > 0;

  // Determine if calendar step should be shown (service/medical need it, dispatch/food typically don't)
  const needsCalendar = caps.isServiceBusiness || caps.isMedicalBusiness;

  // Build steps based on business mode and capabilities
  const steps: SetupStep[] = [];

  // Step 1: Add offerings (mode-aware label and icon)
  if (caps.isFoodBusiness) {
    steps.push({
      id: "menu",
      label: terms.addServicesStep, // "Add your menu"
      description: terms.addServicesDescription,
      href: "/app/menu",
      icon: UtensilsCrossed,
      completed: (counts?.menuItems || 0) > 0,
    });
  } else {
    steps.push({
      id: "services",
      label: terms.addServicesStep, // "Add your services"
      description: terms.addServicesDescription,
      href: "/app/business-brain?section=services",
      icon: Package,
      completed: (counts?.services || 0) > 0,
    });
  }

  // Step 2: Set hours (always needed)
  steps.push({
    id: "hours",
    label: "Set your hours",
    description: "When you're open for business",
    href: "/app/business-brain?section=hours",
    icon: Clock,
    completed: hoursConfigured,
  });

  // Step 3: Add FAQs
  steps.push({
    id: "faqs",
    label: "Add FAQs",
    description: "Common questions your AI can answer",
    href: "/app/business-brain?section=knowledge",
    icon: HelpCircle,
    completed: (counts?.faqs || 0) >= 3,
  });

  // Step 4: Impound lot configuration (only for dispatch + impound_lot capability)
  if (caps.isDispatchBusiness && caps.hasImpoundLot) {
    steps.push({
      id: "impound",
      label: "Configure impound lot",
      description: "Lot address, fees, and release requirements",
      href: "/app/business-brain?section=impound",
      icon: Warehouse,
      completed: counts?.impoundConfigured || false,
    });
  }

  // Mode-specific steps based on new capabilities
  if (bizCaps.showStaffSection) {
    steps.push({
      id: "staff",
      label: "Add your staff members",
      description: "Set up technicians or team members for scheduling",
      href: "/app/business-brain?section=staff",
      icon: Users,
      completed: false, // Will be wired to staff count later
    });
  }

  if (bizCaps.showCurbsideSection) {
    steps.push({
      id: "curbside",
      label: "Set up curbside pickup",
      description: "Configure curbside pickup instructions",
      href: "/app/business-brain?section=ordering",
      icon: Car,
      completed: false,
    });
  }

  if (bizCaps.showNewPatientFormsSection) {
    steps.push({
      id: "patient-forms",
      label: "Upload patient forms",
      description: "Add new patient intake forms for your practice",
      href: "/app/business-brain?section=forms",
      icon: FileText,
      completed: false,
    });
  }

  // Step 5: Connect phone
  steps.push({
    id: "phone",
    label: "Connect phone",
    description: "Get your AI phone number",
    href: "/app/go-live",
    icon: Phone,
    completed: assistantSettings?.phone_connected || false,
  });

  // Step 6: Test AI
  steps.push({
    id: "test",
    label: "Test AI",
    description: "Make sure everything works",
    href: "/app/simulator",
    icon: FlaskConical,
    completed: assistantSettings?.setup_step_tested || false,
  });

  // Step 7: Go live
  steps.push({
    id: "golive",
    label: "Go live",
    description: "Start answering real calls",
    href: "/app/go-live",
    icon: Rocket,
    completed: assistantSettings?.go_live_enabled || false,
  });

  // Filter out skipped steps
  const visibleSteps = steps.filter(s => !s.skip);
  const completedCount = visibleSteps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / visibleSteps.length) * 100);

  // Don't show if already live
  if (assistantSettings?.go_live_enabled) {
    return null;
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Setup Progress</CardTitle>
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {completedCount}/{visibleSteps.length}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2 mt-3" />
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-1">
          {visibleSteps.map((step) => (
            <Link
              key={step.id}
              to={step.href}
              className={cn(
                "flex items-center gap-3 p-3 -mx-3 rounded-lg transition-colors group",
                step.completed
                  ? "opacity-60"
                  : "hover:bg-muted/50"
              )}
            >
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.completed && "line-through text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {!step.completed && (
                  <p className="text-[13px] text-muted-foreground truncate">
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
