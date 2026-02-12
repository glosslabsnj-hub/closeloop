import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useBusinessCapabilities } from "@/hooks/useBusinessCapabilities";
import { useKnowledgeGaps } from "@/hooks/useKnowledgeGaps";
import { useConversionMetrics } from "@/hooks/useIntelligence";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { useServices } from "@/hooks/useServices";
import { buildSetupSteps } from "@/lib/setupStepBuilder";
import { cn } from "@/lib/utils";
import { QuickAddFAQDialog } from "./QuickAddFAQDialog";
import { QuickAddPolicyDialog } from "./QuickAddPolicyDialog";
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
  Warehouse,
  Users,
  Car,
  FileText,
  Calendar as CalendarIcon,
  AlertTriangle,
  DollarSign,
  MapPin,
  Shield,
  Plus,
} from "lucide-react";

/**
 * SetupProgressChecklist - Business-aware setup progress with dynamic steps
 */
export function SetupProgressChecklist() {
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const { tenant, assistantSettings } = useAuth();
  const { terms } = useIndustryContext();
  const caps = useCapabilities();
  const bizCaps = useBusinessCapabilities();
  const { totalUnresolvedCount: gapCount } = useKnowledgeGaps();
  const { metrics } = useConversionMetrics(30);
  const { hasConnectedCalendar } = useCalendarConnections();
  const { services: allServices } = useServices();

  // Fetch counts for completion checks
  const { data: counts } = useQuery({
    queryKey: ["setup-checklist-counts", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return { faqs: 0, menuItems: 0, impoundConfigured: false };

      const [faqsResult, menuResult, impoundSettingsResult, impoundLotsResult] = await Promise.all([
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

      const impoundConfigured = !!(
        (impoundSettingsResult.data?.base_tow_fee_cents && impoundSettingsResult.data.base_tow_fee_cents > 0) ||
        impoundLotsResult.data?.address
      );

      return {
        faqs: faqsResult.count || 0,
        menuItems: menuResult.count || 0,
        impoundConfigured,
      };
    },
    enabled: !!tenant?.id,
  });

  // Derive service data
  const activeServices = (allServices || []).filter((s) => s.is_active !== false);
  const servicesWithoutPrices = activeServices
    .filter((s) => !s.price_amount && s.price_type !== "quote_only")
    .map((s) => s.name);

  const hoursConfigured = !!tenant?.hours_json &&
    Object.keys((tenant?.hours_json as Record<string, unknown>) || {}).length > 0;

  // Build steps using the builder
  const steps = buildSetupSteps(
    {
      serviceCount: activeServices.length,
      servicesWithoutPrices,
      faqCount: counts?.faqs || 0,
      gapCount,
      hoursConfigured,
      hasCalendar: hasConnectedCalendar,
      hasBooking: caps.hasBooking,
      phoneConnected: assistantSettings?.phone_connected || false,
      tested: assistantSettings?.setup_step_tested || false,
      goLive: assistantSettings?.go_live_enabled || false,
      hangupRate: metrics.hangupRate,
      recentCallCount: metrics.totalCalls,
      caps,
      terms,
      menuItemCount: counts?.menuItems || 0,
      impoundConfigured: counts?.impoundConfigured || false,
      showStaffSection: bizCaps.showStaffSection,
      showCurbsideSection: bizCaps.showCurbsideSection,
      showNewPatientFormsSection: bizCaps.showNewPatientFormsSection,
      // Capability-driven flags
      chargesTripFee: bizCaps.service.chargesTripFee,
      hasTripFeeModifier: false, // TODO: check price_modifiers table
      hasMinimumCharge: bizCaps.service.hasMinimumCharge,
      hasMinimumChargeModifier: false,
      requiresDeposits: bizCaps.service.requiresDeposits,
      hasDepositConfigured: !!assistantSettings?.deposit_amount,
      offersMobileService: bizCaps.service.offersMobileService,
      hasServiceArea: !!(tenant as any)?.service_area_json && Object.keys(((tenant as any)?.service_area_json as Record<string, unknown>) || {}).length > 0,
    },
    {
      Package,
      UtensilsCrossed,
      Clock,
      HelpCircle,
      Warehouse,
      Users,
      Car,
      FileText,
      Phone,
      FlaskConical,
      Rocket,
      CalendarIcon,
      AlertTriangle,
      DollarSign,
      MapPin,
      Shield,
    },
  );

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
            <div key={step.id} className="flex items-center gap-3 p-3 -mx-3 rounded-lg transition-colors group">
              <Link
                to={step.href}
                className={cn(
                  "flex items-center gap-3 flex-1 min-w-0",
                  step.completed ? "opacity-60" : "hover:bg-muted/50 -m-1 p-1 rounded-lg"
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

              {/* Inline quick-add for FAQ and policy steps */}
              {!step.completed && step.id === "faqs" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 text-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); setFaqDialogOpen(true); }}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      {/* Quick-add dialogs */}
      <QuickAddFAQDialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen} />
      <QuickAddPolicyDialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen} />
    </Card>
  );
}
