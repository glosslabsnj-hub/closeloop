/**
 * useOnboardingSubmit — Handles the complete onboarding submission flow.
 * Extracted from OnboardingPage.tsx for maintainability.
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatErrorForToast } from "@/lib/errorMessages";
import { resolveIndustryTemplate } from "@/lib/templateResolver";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { updateCapabilityFlags } from "@/hooks/useBusinessCapabilities";
import { applyScenarioSeeds } from "@/lib/scenarioSeeding";
import { createDefaultWorkflowsForMode } from "@/lib/createDefaultWorkflows";
import { clearOnboardingData } from "@/hooks/useOnboardingFormState";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import type { EditableService } from "@/components/onboarding/ServicePreviewStep";
import type { EditableFAQ } from "@/components/onboarding/FAQPreviewStep";
import type { EditablePolicies } from "@/components/onboarding/PolicyPreviewStep";
import type { ServiceAreaConfig } from "@/components/onboarding/ServiceAreaStep";
import type { BusinessDetails } from "@/components/onboarding/BusinessDetailsForm";
import type { CommunicationPrefs, AITone, AIBookingMode } from "@/components/onboarding/CommunicationPreferences";
import type { SchedulingPrefs } from "@/components/onboarding/SchedulingSetup";
import type { A2PBusinessData } from "@/components/onboarding/A2PBusinessFields";
import type { WorkStyle } from "@/components/onboarding/phases/OnboardingIdentity";
import type { AfterHoursBehavior } from "@/components/onboarding/phases/OnboardingAI";
import type { PlanCode } from "@/types/database";

const MAX_RETRIES = 3;

interface SubmitParams {
  businessName: string;
  businessMode: BusinessMode;
  industrySlug: string;
  workStyle: WorkStyle;
  enabledModules: string[];
  scenarioAnswers: Record<string, boolean>;
  scenarioDetails: Record<string, string>;
  schedulingPrefs: SchedulingPrefs;
  communicationPrefs: CommunicationPrefs;
  templateServices: EditableService[];
  templateFAQs: EditableFAQ[];
  templatePolicies: EditablePolicies;
  serviceArea: ServiceAreaConfig;
  businessDetails: BusinessDetails;
  businessHours: Record<string, unknown>;
  teamMembers: { name: string; role: string; phone?: string; email?: string; canPerformAllServices: boolean; serviceNames: string[] }[];
  isSoloOperator: boolean;
  a2pData: A2PBusinessData;
  aiTone: AITone;
  bookingMode: AIBookingMode;
  afterHours: AfterHoursBehavior;
  customGreeting: string;
  notificationPhone: string;
}

export function useOnboardingSubmit(userId?: string) {
  const { user, refreshTenant, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [provisionedPhone, setProvisionedPhone] = useState<string | undefined>();
  const [retryCount, setRetryCount] = useState(0);
  const [showRetry, setShowRetry] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const handleComplete = useCallback(async (params: SubmitParams, clearProgress: () => void) => {
    if (!user) {
      toast({ variant: "destructive", title: "Not logged in", description: "Please log in to complete setup." });
      navigate("/login?redirect=/app/onboarding");
      return;
    }
    setLoading(true);
    try {
      const {
        businessName, businessMode, industrySlug, workStyle, enabledModules,
        scenarioAnswers, scenarioDetails, schedulingPrefs, communicationPrefs,
        templateServices, templateFAQs, templatePolicies, serviceArea,
        businessDetails, businessHours, teamMembers, isSoloOperator, a2pData,
        aiTone, bookingMode, afterHours, customGreeting, notificationPhone,
      } = params;

      const isFoodMode = businessMode === "food" || enabledModules.includes("food_orders");
      const industryEntry = getIndustryBySlug(industrySlug);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Build capabilities_json
      const capabilitiesJson: Record<string, boolean | string> = {};
      for (const mod of enabledModules) capabilitiesJson[mod] = true;
      for (const [key, val] of Object.entries(scenarioAnswers)) capabilitiesJson[key] = val;
      for (const [key, val] of Object.entries(scenarioDetails)) {
        if (val) capabilitiesJson[`_${key}`] = val;
      }
      capabilitiesJson._teamSize = businessDetails.teamSize;
      capabilitiesJson._locationType = businessDetails.locationType;
      capabilitiesJson._pricingPosition = businessDetails.pricingPosition;
      capabilitiesJson._customerType = businessDetails.customerType;
      capabilitiesJson._expectedCallVolume = businessDetails.expectedCallVolume;
      capabilitiesJson._yearsInBusiness = businessDetails.yearsInBusiness;
      capabilitiesJson._isSoloOperator = isSoloOperator;
      capabilitiesJson._workStyle = workStyle;

      const discoveryTeamSize = (scenarioAnswers as Record<string, any>)._teamSize as string | undefined;
      const effectiveTeamSize = discoveryTeamSize || businessDetails.teamSize;
      const hasTeam = effectiveTeamSize === "small" || effectiveTeamSize === "medium" || effectiveTeamSize === "large";
      if (hasTeam) {
        capabilitiesJson.hasMultipleStaff = true;
        capabilitiesJson.fleet_management = true;
        if (!enabledModules.includes("fleet_management")) enabledModules.push("fleet_management");
      }

      const teamCapacityMap: Record<string, number> = { solo: 1, small: 3, medium: 9, large: 20 };
      const defaultCapacity = teamCapacityMap[effectiveTeamSize] || 1;

      const hoursToSave = schedulingPrefs.is24x7
        ? (await import("@/lib/hoursUtils")).HOURS_24_7
        : businessHours;

      const selectedPlan = sessionStorage.getItem("selectedPlan") as PlanCode | null;
      const planCode: PlanCode = selectedPlan || "voice";

      // 1. Create tenant
      const { data: createResult, error: createError } = await supabase.functions.invoke("create-tenant", {
        body: {
          name: businessName.trim(), business_mode: businessMode, timezone,
          hours_json: hoursToSave, industry: industrySlug, enabled_modules: enabledModules,
          capabilities_json: capabilitiesJson, hipaa_mode: businessMode === "medical",
          location: businessDetails.location || undefined, default_capacity: defaultCapacity,
          plan_code: planCode,
        },
      });
      if (createError) throw new Error(createError.message || "Failed to create business profile");
      if (createResult?.error) throw new Error(createResult.error);
      const tenantId = createResult.tenant_id;
      if (!tenantId) throw new Error("No tenant ID returned");

      // 2. Services
      const config = resolveIndustryTemplate(industrySlug);
      const servicesToInsert = templateServices
        .filter(s => s.enabled && s.name.trim().length > 0)
        .map(s => ({
          tenant_id: tenantId, name: s.name, description: s.description || null,
          duration_minutes: s.duration, price_amount: s.price,
          price_type: (s.priceType || "fixed") as "fixed" | "starting_at" | "quote_only",
          is_active: true,
        }));
      if (servicesToInsert.length > 0) await supabase.from("services").insert(servicesToInsert);

      // 3. FAQs
      const faqsToInsert = templateFAQs
        .filter(f => f.enabled && f.question.trim().length > 0 && f.answer.trim().length > 0)
        .map((faq, i) => ({ tenant_id: tenantId, question: faq.question, answer: faq.answer, priority_weight: i }));
      if (faqsToInsert.length > 0) await supabase.from("business_faqs").insert(faqsToInsert);

      // 4. Objections
      const objectionsToInsert = config.objections
        .filter(o => o.objection.trim().length > 0 && o.response.trim().length > 0)
        .map((obj, i) => ({ tenant_id: tenantId, objection: obj.objection, response: obj.response, priority_weight: i }));
      if (objectionsToInsert.length > 0) await supabase.from("objection_responses").insert(objectionsToInsert);

      // 5. Policies
      await supabase.from("tenants").update({
        cancellation_policy: templatePolicies.cancellation || null,
        deposit_policy: templatePolicies.deposit || null,
        refund_policy: templatePolicies.refund || null,
      }).eq("id", tenantId);

      // 6. Service area
      const showsCoverage = workStyle === "go_to_customer" || workStyle === "both" || ["dispatch", "food"].includes(businessMode);
      if (showsCoverage) {
        await supabase.from("tenants").update({
          service_area_json: {
            radius_miles: serviceArea.radiusMiles,
            zip_codes: serviceArea.zipCodes ? serviceArea.zipCodes.split(",").map(z => z.trim()).filter(Boolean) : [],
            out_of_area_message: serviceArea.outOfAreaMessage,
          },
        }).eq("id", tenantId);
      }

      // 7. Scenario flags + seeds
      await updateCapabilityFlags(tenantId, scenarioAnswers);
      await applyScenarioSeeds(tenantId, scenarioAnswers, businessMode);

      // 8. Food settings
      if (isFoodMode) {
        await supabase.from("food_order_settings").insert({
          tenant_id: tenantId, accepts_pickup: true,
          accepts_delivery: scenarioAnswers.offersDelivery ?? false,
          accepts_dine_in: true, accepts_catering: scenarioAnswers.offersCatering ?? false,
          order_confirmation_mode: "auto_confirm",
        });
      }

      // 9. Automations
      await supabase.from("automations").insert([
        { tenant_id: tenantId, name: "Missed Call Follow-up", trigger: "missed_call" as const, is_enabled: true, steps_json: [{ type: "send_message", body: "Hi! We noticed we missed your call. How can we help you today?" }] },
        { tenant_id: tenantId, name: "Booking Confirmation", trigger: "booking_created" as const, is_enabled: true, steps_json: [{ type: "send_message", body: "Your appointment is confirmed! We'll see you soon." }] },
      ]);

      // 10. Communication / AI settings
      const mappedAfterHours = afterHours === "ai_24_7" ? undefined : afterHours === "voicemail" ? "voicemail" : "text_back";
      const commUpdate: Record<string, unknown> = {
        ai_booking_mode: bookingMode,
        missed_call_behavior: communicationPrefs.missedCallBehavior,
      };
      if (mappedAfterHours) commUpdate.off_behavior = mappedAfterHours;

      const settingsJson: Record<string, unknown> = {};
      settingsJson.ai_tone = aiTone;
      if (customGreeting) settingsJson.custom_greeting = customGreeting;
      if (notificationPhone) settingsJson.notification_phone = notificationPhone;
      if (communicationPrefs.aiGuardrails) settingsJson.ai_guardrails = communicationPrefs.aiGuardrails;
      if (communicationPrefs.requiredIntakeFields?.length) settingsJson.required_intake_fields = communicationPrefs.requiredIntakeFields;
      if (communicationPrefs.escalationRules) settingsJson.escalation_rules = communicationPrefs.escalationRules;
      commUpdate.settings_json = settingsJson;

      await supabase.from("assistant_settings").update(commUpdate).eq("tenant_id", tenantId);

      // AI assistant tone & greeting
      const assistantData: Record<string, unknown> = { tone: aiTone };
      if (customGreeting) assistantData.greeting_script = customGreeting;
      const { data: existingAssistant } = await supabase.from("ai_assistants").select("id").eq("tenant_id", tenantId).maybeSingle();
      if (existingAssistant) {
        await supabase.from("ai_assistants").update(assistantData).eq("tenant_id", tenantId);
      } else {
        await supabase.from("ai_assistants").insert({ tenant_id: tenantId, ...assistantData });
      }

      // 11. Team members
      if (!isSoloOperator && teamMembers.length > 0) {
        const teamData = teamMembers.filter(m => m.name.trim().length > 0).map(m => ({
          name: m.name.trim(), role: m.role, phone: m.phone || null,
          email: m.email || null, canPerformAllServices: m.canPerformAllServices,
          serviceNames: m.serviceNames,
        }));
        if (teamData.length > 0) {
          await supabase.from("tenants").update({
            capabilities_json: { ...(capabilitiesJson as Record<string, unknown>), _team_members: teamData } as unknown as import("@/integrations/supabase/types").Json,
          }).eq("id", tenantId);
        }
      }

      // 12. Pricing rules
      const pricingFromDetails: Record<string, unknown> = {};
      if (scenarioDetails.depositType) pricingFromDetails.deposit_type = scenarioDetails.depositType;
      if (scenarioDetails.depositAmount) pricingFromDetails.deposit_amount = Number(scenarioDetails.depositAmount);
      if (scenarioDetails.tripFeeAmount) pricingFromDetails.trip_fee = Number(scenarioDetails.tripFeeAmount);
      if (scenarioDetails.minimumChargeAmount) pricingFromDetails.minimum_charge = Number(scenarioDetails.minimumChargeAmount);
      if (scenarioDetails.afterHoursSurcharge) pricingFromDetails.after_hours_surcharge = Number(scenarioDetails.afterHoursSurcharge);
      if (scenarioDetails.baseRate) pricingFromDetails.base_rate = Number(scenarioDetails.baseRate);
      if (scenarioDetails.perMileRate) pricingFromDetails.per_mile_rate = Number(scenarioDetails.perMileRate);
      if (Object.keys(pricingFromDetails).length > 0) {
        await supabase.from("tenants").update({ pricing_rules_jsonb: pricingFromDetails as unknown as import("@/integrations/supabase/types").Json }).eq("id", tenantId);
      }

      // 13. Service area from details
      if (scenarioDetails.serviceRadiusMiles || scenarioDetails.deliveryRadiusMiles) {
        const currentRadius = Number(scenarioDetails.serviceRadiusMiles || scenarioDetails.deliveryRadiusMiles);
        if (currentRadius > 0) {
          await supabase.from("tenants").update({
            service_area_json: {
              radius_miles: currentRadius,
              zip_codes: serviceArea.zipCodes ? serviceArea.zipCodes.split(",").map(z => z.trim()).filter(Boolean) : [],
              out_of_area_message: serviceArea.outOfAreaMessage,
            },
          }).eq("id", tenantId);
        }
      }

      // 14. A2P registration
      if (a2pData.legalBusinessName || a2pData.ein || a2pData.entityType) {
        await supabase.from("a2p_registrations").upsert({
          tenant_id: tenantId, status: "pending_data",
          legal_business_name: a2pData.legalBusinessName || businessName,
          ein: a2pData.ein || null, entity_type: a2pData.entityType || null,
          street_address: a2pData.streetAddress || null, city: a2pData.city || null,
          state: a2pData.state || null, zip_code: a2pData.zipCode || null,
          contact_first_name: a2pData.contactFirstName || null,
          contact_last_name: a2pData.contactLastName || null,
          contact_email: a2pData.contactEmail || user?.email || null,
          contact_phone: null, website_url: a2pData.websiteUrl || null,
        }, { onConflict: "tenant_id" });
      }

      // 15. Twilio provisioning
      const shouldProvision = planCode.startsWith("voice") || planCode.startsWith("both");
      if (shouldProvision && !isSuperAdmin) {
        try {
          const { data: provisionData, error: provisionError } = await supabase.functions.invoke("provision-twilio-number", {
            body: { tenant_id: tenantId, number_type: "local" },
          });
          if (!provisionError && provisionData?.success && provisionData.phone_number) {
            setProvisionedPhone(provisionData.phone_number);
          }
        } catch (e) { console.error("TwilioProvision: exception", e); }
      }

      // 16. Default workflows
      try {
        await createDefaultWorkflowsForMode(tenantId, (industryEntry?.businessMode || "service") as BusinessMode);
      } catch (e) { console.error("WorkflowsAutoCreate: exception", e); }

      // 17. Mark complete
      await supabase.from("tenants").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", tenantId);
      sessionStorage.removeItem("selectedPlan");
      await refreshTenant();
      await new Promise(r => setTimeout(r, 100));
      clearOnboardingData(userId);
      clearProgress();
      setIsComplete(true);
    } catch (error: unknown) {
      console.error("Onboarding error:", error);
      const errorInfo = formatErrorForToast(error);
      toast({ variant: "destructive", title: errorInfo.title, description: errorInfo.description });
      if (retryCount < MAX_RETRIES) {
        setShowRetry(true);
      } else {
        setShowRetry(false);
        setCompletionError("We're having trouble saving. Please refresh and try again, or contact support.");
      }
    } finally {
      setLoading(false);
    }
  }, [user, navigate, toast, refreshTenant, isSuperAdmin, retryCount, userId]);

  const handleRetry = useCallback(async (params: SubmitParams, clearProgress: () => void) => {
    if (retryCount >= MAX_RETRIES) {
      setCompletionError("We're having trouble saving. Please refresh and try again, or contact support.");
      return;
    }
    setLoading(true);
    setCompletionError(null);
    await new Promise(r => setTimeout(r, Math.pow(2, retryCount) * 1000));
    setRetryCount(prev => prev + 1);
    handleComplete(params, clearProgress);
  }, [retryCount, handleComplete]);

  return {
    loading,
    isComplete,
    provisionedPhone,
    retryCount,
    showRetry,
    completionError,
    handleComplete,
    handleRetry,
    MAX_RETRIES,
  };
}
