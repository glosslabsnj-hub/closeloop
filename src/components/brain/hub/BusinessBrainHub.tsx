/**
 * BusinessBrainHub - Clean landing for Business Brain setup
 * 
 * Simple, scannable layout showing setup progress and 8 areas to configure.
 */

import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useFoodMode } from "@/hooks/useFoodMode";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brain } from "lucide-react";

import { StepCard } from "./StepCard";
import { HubProgress } from "./HubProgress";
import { getOrderedSteps, isStepEmphasized, getOfferingsTitle } from "./hubStepsConfig";

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
    queryKey: ["services-count", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data } = await supabase
        .from("services")
        .select("id, price_amount")
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

  const getStepCompletion = useCallback((stepId: string): boolean => {
    switch (stepId) {
      case "identity":
        return !!(tenantData?.name && tenantData?.timezone);
      case "hours":
        return (hoursData?.length || 0) > 0;
      case "offerings":
        const minServices = isFoodMode ? 3 : 1;
        const servicesWithPrices = servicesData?.filter(s => s.price_amount && s.price_amount > 0) || [];
        return servicesWithPrices.length >= minServices;
      case "coverage":
        return !!(tenantData?.address);
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
  }, [tenantData, hoursData, servicesData, faqsData, assistantData, calendarData, isFoodMode, businessMode]);

  const orderedSteps = getOrderedSteps(businessMode);
  const completedCount = orderedSteps.filter(step => getStepCompletion(step.id)).length;
  const totalSteps = orderedSteps.length;

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Business Brain</h1>
            <p className="text-sm text-muted-foreground">
              Teach your AI about your business
            </p>
          </div>
        </div>

        {/* Progress */}
        <HubProgress
          completedSteps={completedCount}
          totalSteps={totalSteps}
          mode={businessMode}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {orderedSteps.map((step, index) => {
          const isComplete = getStepCompletion(step.id);
          const isEmphasized = isStepEmphasized(step, businessMode);
          const title = step.id === "offerings" ? getOfferingsTitle(businessMode) : step.title;

          return (
            <StepCard
              key={step.id}
              stepNumber={index + 1}
              sectionId={step.sectionId}
              title={title}
              purpose={step.purpose}
              icon={step.icon}
              usedByAI={step.usedByAI}
              isComplete={isComplete}
              isEmphasized={isEmphasized}
              mode={businessMode}
              onEdit={onNavigateToSection}
            />
          );
        })}
      </div>
    </div>
  );
}
