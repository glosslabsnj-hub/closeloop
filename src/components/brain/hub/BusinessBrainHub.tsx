/**
 * BusinessBrainHub - Immersive landing experience for Business Brain setup
 * 
 * This is the main hub view shown when user navigates to /app/business-brain
 * without a ?section= parameter. Shows 8 setup steps as cards with:
 * - Mode-aware ordering and emphasis
 * - Completion status from existing data
 * - Deep links to step editors
 * 
 * NO BACKEND CHANGES - Uses existing hooks and data only.
 */

import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useFoodMode } from "@/hooks/useFoodMode";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import { StepCard } from "./StepCard";
import { HubProgress } from "./HubProgress";
import { ModeHint } from "./ModeHint";
import { HUB_STEPS, getOrderedSteps, isStepEmphasized, getOfferingsTitle } from "./hubStepsConfig";

interface BusinessBrainHubProps {
  /** Handler to navigate to a specific section */
  onNavigateToSection: (sectionId: string) => void;
}

export function BusinessBrainHub({ onNavigateToSection }: BusinessBrainHubProps) {
  const { tenant } = useAuth();
  const { businessMode } = useTenantConfig();
  const { isFoodMode } = useFoodMode();

  // ===== COMPUTE COMPLETION STATUS FROM EXISTING DATA =====
  // These queries use the same data that already exists in the system

  // Check identity completion - use correct column names from schema
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

  // Check hours completion
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

  // Check services/menu completion - use price_amount instead of price_cents
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

  // Check FAQs completion
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

  // Check AI scripts completion
  const { data: assistantData } = useQuery({
    queryKey: ["ai-assistant", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      const { data } = await supabase
        .from("ai_assistants")
        .select("greeting_script, fallback_script, tone")
        .eq("tenant_id", tenant.id)
        .single();
      return data;
    },
    enabled: !!tenant?.id,
  });

  // Check calendar connections
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

  // ===== COMPUTE STEP COMPLETION =====
  const getStepCompletion = useCallback((stepId: string): boolean => {
    switch (stepId) {
      case "identity":
        return !!(tenantData?.name && tenantData?.timezone);
      
      case "hours":
        return (hoursData?.length || 0) > 0;
      
      case "offerings":
        // Need at least 1 service with a price for service/dispatch, 3+ for food
        const minServices = isFoodMode ? 3 : 1;
        const servicesWithPrices = servicesData?.filter(s => s.price_amount && s.price_amount > 0) || [];
        return servicesWithPrices.length >= minServices;
      
      case "coverage":
        // For now, consider complete if tenant has address
        return !!(tenantData?.address);
      
      case "calendar":
        // At least one connected calendar for service/medical
        if (businessMode === "dispatch" || businessMode === "food") return true; // Not critical for these
        return calendarData?.some(c => c.status === "active") ?? false;
      
      case "policies":
        // Basic completion - can be enhanced with more checks
        return true; // Default to complete as policies are optional for basic setup
      
      case "ai-setup":
        return !!(assistantData?.greeting_script || assistantData?.fallback_script);
      
      case "knowledge":
        // At least 3 FAQs
        return (faqsData?.length || 0) >= 3;
      
      default:
        return false;
    }
  }, [tenantData, hoursData, servicesData, faqsData, assistantData, calendarData, isFoodMode, businessMode]);

  // Get ordered steps for current mode
  const orderedSteps = getOrderedSteps(businessMode);

  // Calculate overall progress
  const completedCount = orderedSteps.filter(step => getStepCompletion(step.id)).length;
  const totalSteps = orderedSteps.length;

  // Handle step edit click
  const handleEdit = (sectionId: string) => {
    onNavigateToSection(sectionId);
  };

  return (
    <div className="min-h-full pb-12">
      {/* Hub Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Business Brain</h1>
            <p className="text-muted-foreground">
              Everything your AI needs to know about your business
            </p>
          </div>
        </div>

        {/* Progress and Mode Hint */}
        <div className="grid gap-4 md:grid-cols-2 mt-6">
          <HubProgress
            completedSteps={completedCount}
            totalSteps={totalSteps}
            mode={businessMode}
          />
          <ModeHint mode={businessMode} />
        </div>
      </div>

      {/* Quick Start CTA for incomplete setups */}
      {completedCount < totalSteps && (
        <div className="mb-6 rounded-lg border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Continue Setup</h3>
              <p className="text-sm text-muted-foreground">
                Complete {totalSteps - completedCount} more step{totalSteps - completedCount > 1 ? "s" : ""} to get the most out of your AI
              </p>
            </div>
            <Button
              onClick={() => {
                // Find first incomplete step
                const firstIncomplete = orderedSteps.find(s => !getStepCompletion(s.id));
                if (firstIncomplete) {
                  handleEdit(firstIncomplete.sectionId);
                }
              }}
              className="gap-2"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Setup Steps */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Setup Steps
        </h2>
        {orderedSteps.map((step, index) => {
          const isComplete = getStepCompletion(step.id);
          const isEmphasized = isStepEmphasized(step, businessMode);
          
          // Dynamic title for offerings
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
              onEdit={handleEdit}
            />
          );
        })}
      </div>
    </div>
  );
}
