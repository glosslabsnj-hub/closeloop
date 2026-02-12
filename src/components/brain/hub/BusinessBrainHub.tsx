/**
 * BusinessBrainHub - Compact landing for Business Brain setup
 *
 * Scannable layout: header with inline progress, then step list.
 */

import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useFoodMode } from "@/hooks/useFoodMode";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brain, PhoneIncoming } from "lucide-react";
import { cn } from "@/lib/utils";

import { StepCard } from "./StepCard";
import { getOrderedSteps, getStepTitle, getStepPurpose, isStepEmphasized } from "./hubStepsConfig";
import { GuidedSetupOverlay } from "../GuidedSetupOverlay";

interface BusinessBrainHubProps {
  onNavigateToSection: (sectionId: string) => void;
}

export function BusinessBrainHub({ onNavigateToSection }: BusinessBrainHubProps) {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const caps = useCapabilities();
  const { isFoodMode } = useFoodMode();

  // Check identity
  const { data: tenantData } = useQuery({
    queryKey: ["tenant-profile", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("tenants")
        .select("name, tagline, timezone, address")
        .eq("id", tenant.id)
        .single();
      return data;
    },
    enabled: !!tenant?.id,
  });

  // Check hours
  const { data: hoursData } = useQuery({
    queryKey: ["availability-slots", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("availability_slots")
        .select("id")
        .eq("tenant_id", tenant.id)
        .limit(1);
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Check services
  const { data: servicesData } = useQuery({
    queryKey: ["services", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("services")
        .select("id, price_amount, price_type")
        .eq("tenant_id", tenant.id);
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Check FAQs
  const { data: faqsData } = useQuery({
    queryKey: ["faqs-count", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("business_faqs")
        .select("id")
        .eq("tenant_id", tenant.id);
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Check AI scripts
  const { data: assistantData } = useQuery({
    queryKey: ["ai-assistant", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("ai_assistants")
        .select("greeting_script, fallback_script")
        .eq("tenant_id", tenant.id)
        .single();
      return data;
    },
    enabled: !!tenant?.id,
  });

  // Check calendar
  const { data: calendarData } = useQuery({
    queryKey: ["calendar-connections", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("calendar_connections")
        .select("id, status")
        .eq("tenant_id", tenant.id);
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Read capabilities from tenant for step filtering
  const capabilities = useMemo(() => {
    const raw = (tenant as any)?.capabilities_json;
    if (raw && typeof raw === "object") return raw as Record<string, boolean>;
    return {};
  }, [tenant]);

  const isCallbackOnly = capabilities?.callbackOnly === true;

  const getStepCompletion = useCallback((stepId: string): boolean => {
    switch (stepId) {
      case "identity":
        return !!(tenantData?.name && tenantData?.timezone);
      case "hours":
        return (hoursData?.length || 0) > 0;
      case "offerings": {
        if (isCallbackOnly) {
          // For callback-only, just having services listed is enough (no price requirement)
          return (servicesData?.length || 0) >= 1;
        }
        const minServices = isFoodMode ? 3 : 1;
        const servicesConfigured = servicesData?.filter(s =>
          (s.price_amount && s.price_amount > 0) || !!s.price_type
        ) || [];
        return servicesConfigured.length >= minServices;
      }
      case "coverage": {
        // Walk-in businesses without mobile service don't need coverage
        const needsCoverage = capabilities?.mobileService === true ||
          caps.isDispatchBusiness || caps.isFoodBusiness;
        if (!needsCoverage) return true;
        return !!(tenantData?.address);
      }
      case "calendar":
        if (caps.isDispatchBusiness || caps.isFoodBusiness) return true;
        return calendarData?.some(c => c.status === "active") ?? false;
      case "policies":
        return true;
      case "ai-setup":
        return !!(assistantData?.greeting_script || assistantData?.fallback_script);
      case "knowledge":
        return (faqsData?.length || 0) >= 3;
      default:
        return false;
    }
  }, [tenantData, hoursData, servicesData, faqsData, assistantData, calendarData, isFoodMode, isCallbackOnly, caps.isDispatchBusiness, caps.isFoodBusiness]);

  const orderedSteps = getOrderedSteps(businessMode, capabilities);
  const completedCount = orderedSteps.filter(step => getStepCompletion(step.id)).length;
  const totalSteps = orderedSteps.length;
  const percentage = Math.round((completedCount / totalSteps) * 100);
  const isAllComplete = completedCount >= totalSteps;

  return (
    <div className="pb-12">
      {/* Guided setup overlay */}
      <GuidedSetupOverlay
        onNavigateToSection={onNavigateToSection}
        getStepCompletion={getStepCompletion}
      />

      {/* Callback-only banner */}
      {isCallbackOnly && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <PhoneIncoming className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Capture & Callback Mode</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your AI will answer calls, qualify callers by asking about their needs, collect their info, and let them know you'll call back. No scheduling or booking needed.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Business Brain</h1>
            <p className="text-sm text-muted-foreground">
              {isCallbackOnly
                ? "Teach your AI what you do so it can qualify callers"
                : "Teach your AI about your business"}
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium whitespace-nowrap">{percentage}% Complete</span>
          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isAllComplete ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-0.5">
        {orderedSteps.map((step, index) => {
          const isComplete = getStepCompletion(step.id);
          const emphasized = isStepEmphasized(step, businessMode);
          const title = getStepTitle(step.id, businessMode);
          const purpose = getStepPurpose(step.id, isCallbackOnly);

          return (
            <StepCard
              key={step.id}
              stepNumber={index + 1}
              sectionId={step.sectionId}
              title={title}
              purpose={purpose}
              icon={step.icon}
              usedByAI={step.usedByAI}
              isComplete={isComplete}
              isEmphasized={emphasized}
              mode={businessMode}
              onEdit={onNavigateToSection}
            />
          );
        })}
      </div>
    </div>
  );
}
