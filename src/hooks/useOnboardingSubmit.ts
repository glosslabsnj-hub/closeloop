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
import { getTemplate, fetchCurrentBrainState, previewTemplateApplication, applyTemplate } from "@/lib/industryTemplates";
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
  businessAddress: string;
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
  // Idempotency: remember the tenant ID created in step 1 so retries don't duplicate
  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null);

  const handleComplete = useCallback(async (params: SubmitParams, clearProgress: () => void) => {
    if (!user) {
      toast({ variant: "destructive", title: "Not logged in", description: "Please log in to complete setup." });
      navigate("/login?redirect=/app/onboarding");
      return;
    }
    setLoading(true);
    setCompletionError(null);

    // Collect non-critical step failures (steps 2-16) instead of silently swallowing them.
    // Design: always proceed to dashboard — partial config is fixable in the Brain,
    // but a stuck onboarding screen is a dead end.
    const stepFailures: string[] = [];
    const runStep = async (name: string, fn: () => Promise<void>) => {
      try { await fn(); }
      catch (e) {
        console.error(`Onboarding [${name}]:`, e);
        stepFailures.push(name);
      }
    };

    try {
      const {
        businessName, businessAddress, businessMode, industrySlug, workStyle, enabledModules,
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

      // ── STEP 1: Create tenant (CRITICAL — failure stops everything) ──
      let tenantId = createdTenantId;
      if (!tenantId) {
        const agencySlug = sessionStorage.getItem("referralAgencySlug") || undefined;
        const { data: createResult, error: createError } = await supabase.functions.invoke("create-tenant", {
          body: {
            name: businessName.trim(), business_mode: businessMode, timezone,
            hours_json: hoursToSave, industry: industrySlug, enabled_modules: enabledModules,
            capabilities_json: capabilitiesJson, hipaa_mode: businessMode === "medical",
            address: businessAddress || businessDetails.location || undefined, default_capacity: defaultCapacity,
            plan_code: planCode,
            agency_slug: agencySlug,
            tagline: industryEntry ? `Your trusted ${industryEntry.name.toLowerCase()} professionals` : undefined,
          },
        });
        if (createError) throw new Error(createError.message || "Failed to create business profile");
        if (createResult?.error) throw new Error(createResult.error);
        tenantId = createResult.tenant_id;
        if (!tenantId) throw new Error("No tenant ID returned");
        setCreatedTenantId(tenantId);
      }

      // ── STEPS 2-16: Configuration (non-critical, retry-safe) ──
      // INSERT steps use delete-then-insert so retries don't create duplicates.
      // UPDATE/UPSERT steps are naturally idempotent.

      // 2. Services (idempotent: clear + insert)
      const config = resolveIndustryTemplate(industrySlug);
      await runStep("services", async () => {
        const servicesToInsert = templateServices
          .filter(s => s.enabled && s.name.trim().length > 0)
          .map(s => ({
            tenant_id: tenantId!, name: s.name, description: s.description || null,
            duration_minutes: s.duration, price_amount: s.price,
            price_type: (s.priceType || "fixed") as "fixed" | "starting_at" | "quote_only",
            is_active: true,
          }));
        if (servicesToInsert.length > 0) {
          await supabase.from("services").delete().eq("tenant_id", tenantId!);
          const { error } = await supabase.from("services").insert(servicesToInsert);
          if (error) throw error;
        }
      });

      // 3. FAQs (idempotent: clear + insert)
      await runStep("FAQs", async () => {
        const faqsToInsert = templateFAQs
          .filter(f => f.enabled && f.question.trim().length > 0 && f.answer.trim().length > 0)
          .map((faq, i) => ({ tenant_id: tenantId!, question: faq.question, answer: faq.answer, priority_weight: i }));
        if (faqsToInsert.length > 0) {
          await supabase.from("business_faqs").delete().eq("tenant_id", tenantId!);
          const { error } = await supabase.from("business_faqs").insert(faqsToInsert);
          if (error) throw error;
        }
      });

      // 4. Objections (idempotent: clear + insert)
      await runStep("objections", async () => {
        const objectionsToInsert = config.objections
          .filter(o => o.objection.trim().length > 0 && o.response.trim().length > 0)
          .map((obj, i) => ({ tenant_id: tenantId!, objection: obj.objection, response: obj.response, priority_weight: i }));
        if (objectionsToInsert.length > 0) {
          await supabase.from("objection_responses").delete().eq("tenant_id", tenantId!);
          const { error } = await supabase.from("objection_responses").insert(objectionsToInsert);
          if (error) throw error;
        }
      });

      // 5. Policies (update — naturally idempotent)
      await runStep("policies", async () => {
        const { error } = await supabase.from("tenants").update({
          cancellation_policy: templatePolicies.cancellation || null,
          deposit_policy: templatePolicies.deposit || null,
          refund_policy: templatePolicies.refund || null,
          // Default payment methods so AI answers match policies (QA handoff #311)
          payment_methods: ["cash", "credit_card", "debit_card"],
        }).eq("id", tenantId!);
        if (error) throw error;
      });

      // 5b. Auto-apply rich industry template (best-effort merge)
      // Skip if the industry already has a catalog entry — Steps 2-5 already seeded
      // from the authoritative industryCatalog. Applying the legacy template on top
      // can create duplicate services (e.g., HVAC "Filter Replacement" only in old template).
      const hasCatalogEntry = !!getIndustryBySlug(industrySlug);
      await runStep("industry template", async () => {
        if (hasCatalogEntry) return; // catalog data already applied in Steps 2-5
        const richTemplate = getTemplate(industrySlug);
        if (richTemplate && tenantId) {
          const currentState = await fetchCurrentBrainState(tenantId);
          const preview = previewTemplateApplication(currentState, richTemplate, "merge");
          if (preview.totals.itemsToAdd > 0) {
            await applyTemplate(tenantId, richTemplate, "merge", preview);
          }
        }
      });

      // 6. Service area (update — naturally idempotent)
      await runStep("service area", async () => {
        const showsCoverage = workStyle === "go_to_customer" || workStyle === "both" || ["dispatch", "food"].includes(businessMode);
        if (showsCoverage) {
          const { error } = await supabase.from("tenants").update({
            service_area_json: {
              radius_miles: serviceArea.radiusMiles,
              zip_codes: serviceArea.zipCodes ? serviceArea.zipCodes.split(",").map(z => z.trim()).filter(Boolean) : [],
              out_of_area_message: serviceArea.outOfAreaMessage,
            },
          }).eq("id", tenantId!);
          if (error) throw error;
        }
      });

      // 7. Scenario flags + seeds
      await runStep("scenario settings", async () => {
        await updateCapabilityFlags(tenantId!, scenarioAnswers);
        await applyScenarioSeeds(tenantId!, scenarioAnswers, businessMode);
      });

      // 8. Food settings (idempotent: upsert)
      if (isFoodMode) {
        await runStep("food settings", async () => {
          const { error } = await supabase.from("food_order_settings").upsert({
            tenant_id: tenantId!, accepts_pickup: true,
            accepts_delivery: scenarioAnswers.offersDelivery ?? false,
            accepts_dine_in: true, accepts_catering: scenarioAnswers.offersCatering ?? false,
            order_confirmation_mode: "auto_confirm",
          }, { onConflict: "tenant_id" });
          if (error) throw error;
        });
      }

      // 9. Automations (idempotent: clear + insert)
      await runStep("automations", async () => {
        await supabase.from("automations").delete().eq("tenant_id", tenantId!);
        const { error } = await supabase.from("automations").insert([
          { tenant_id: tenantId!, name: "Missed Call Follow-up", trigger: "missed_call" as const, is_enabled: true, steps_json: [{ type: "send_message", body: "Hi! We noticed we missed your call. How can we help you today?" }] },
          { tenant_id: tenantId!, name: "Booking Confirmation", trigger: "booking_created" as const, is_enabled: true, steps_json: [{ type: "send_message", body: "Your appointment is confirmed! We'll see you soon." }] },
        ]);
        if (error) throw error;
      });

      // 9b. Booking delivery settings (upsert — ensures post-booking handoff runs)
      // Without this row, booking-handoff skips customer SMS, calendar sync, and notifications.
      await runStep("delivery settings", async () => {
        const notifyEmail = user?.email || null;
        const { error } = await supabase.from("booking_delivery_settings").upsert({
          tenant_id: tenantId!,
          enabled: true,
          handoff_methods: notifyEmail ? ["internal", "email"] : ["internal"],
          notify_email: notifyEmail,
          notify_phone: notificationPhone || null,
        }, { onConflict: "tenant_id" });
        if (error) throw error;
      });

      // 9c. Dispatch delivery settings (upsert — ensures dispatch-handoff runs for dispatch tenants)
      // Without this row, dispatch-handoff skips ALL notifications for new dispatch tenants.
      if (businessMode === "dispatch" || enabledModules.includes("dispatch_queue")) {
        await runStep("dispatch delivery settings", async () => {
          const notifyEmail = user?.email || null;
          const { error } = await supabase.from("dispatch_delivery_settings").upsert({
            tenant_id: tenantId!,
            enabled: true,
            handoff_methods: notifyEmail ? ["internal", "email"] : ["internal"],
            notify_email: notifyEmail,
            notify_phone: notificationPhone || null,
          }, { onConflict: "tenant_id" });
          if (error) throw error;
        });
      }

      // 9d. Order delivery settings (upsert — ensures order-handoff runs for food tenants)
      // Without this row, order-handoff skips ALL notifications for new food tenants.
      if (isFoodMode) {
        await runStep("order delivery settings", async () => {
          const notifyEmail = user?.email || null;
          const { error } = await supabase.from("order_delivery_settings").upsert({
            tenant_id: tenantId!,
            enabled: true,
            handoff_methods: notifyEmail ? ["internal", "email"] : ["internal"],
            notify_email: notifyEmail,
            notify_phone: notificationPhone || null,
          }, { onConflict: "tenant_id" });
          if (error) throw error;
        });
      }

      // 10. Communication / AI settings (update — naturally idempotent)
      await runStep("AI settings", async () => {
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

        const { error } = await supabase.from("assistant_settings").update(commUpdate).eq("tenant_id", tenantId!);
        if (error) throw error;

        // AI assistant tone & greeting (upsert pattern)
        const assistantData: Record<string, unknown> = { tone: aiTone };
        if (customGreeting) assistantData.greeting_script = customGreeting;
        const { data: existingAssistant } = await supabase.from("ai_assistants").select("id").eq("tenant_id", tenantId!).maybeSingle();
        if (existingAssistant) {
          await supabase.from("ai_assistants").update(assistantData).eq("tenant_id", tenantId!);
        } else {
          await supabase.from("ai_assistants").insert({ tenant_id: tenantId!, ...assistantData });
        }
      });

      // 11. Team members (update — naturally idempotent)
      await runStep("team members", async () => {
        if (!isSoloOperator && teamMembers.length > 0) {
          const teamData = teamMembers.filter(m => m.name.trim().length > 0).map(m => ({
            name: m.name.trim(), role: m.role, phone: m.phone || null,
            email: m.email || null, canPerformAllServices: m.canPerformAllServices,
            serviceNames: m.serviceNames,
          }));
          if (teamData.length > 0) {
            const { error } = await supabase.from("tenants").update({
              capabilities_json: { ...(capabilitiesJson as Record<string, unknown>), _team_members: teamData } as unknown as import("@/integrations/supabase/types").Json,
            }).eq("id", tenantId!);
            if (error) throw error;
          }
        }
      });

      // 12. Pricing rules (update — naturally idempotent)
      await runStep("pricing", async () => {
        const pricingFromDetails: Record<string, unknown> = {};
        if (scenarioDetails.depositType) pricingFromDetails.deposit_type = scenarioDetails.depositType;
        if (scenarioDetails.depositAmount) pricingFromDetails.deposit_amount = Number(scenarioDetails.depositAmount);
        if (scenarioDetails.tripFeeAmount) pricingFromDetails.trip_fee = Number(scenarioDetails.tripFeeAmount);
        if (scenarioDetails.minimumChargeAmount) pricingFromDetails.minimum_charge = Number(scenarioDetails.minimumChargeAmount);
        if (scenarioDetails.afterHoursSurcharge) pricingFromDetails.after_hours_surcharge = Number(scenarioDetails.afterHoursSurcharge);
        if (scenarioDetails.baseRate) pricingFromDetails.base_rate = Number(scenarioDetails.baseRate);
        if (scenarioDetails.perMileRate) pricingFromDetails.per_mile_rate = Number(scenarioDetails.perMileRate);
        if (Object.keys(pricingFromDetails).length > 0) {
          const { error } = await supabase.from("tenants").update({ pricing_rules_jsonb: pricingFromDetails as unknown as import("@/integrations/supabase/types").Json }).eq("id", tenantId!);
          if (error) throw error;
        }
      });

      // 13. Service area from details (update — naturally idempotent)
      await runStep("coverage area", async () => {
        if (scenarioDetails.serviceRadiusMiles || scenarioDetails.deliveryRadiusMiles) {
          const currentRadius = Number(scenarioDetails.serviceRadiusMiles || scenarioDetails.deliveryRadiusMiles);
          if (currentRadius > 0) {
            const { error } = await supabase.from("tenants").update({
              service_area_json: {
                radius_miles: currentRadius,
                zip_codes: serviceArea.zipCodes ? serviceArea.zipCodes.split(",").map(z => z.trim()).filter(Boolean) : [],
                out_of_area_message: serviceArea.outOfAreaMessage,
              },
            }).eq("id", tenantId!);
            if (error) throw error;
          }
        }
      });

      // 14. A2P registration (upsert — naturally idempotent)
      await runStep("SMS registration", async () => {
        if (a2pData.legalBusinessName || a2pData.ein || a2pData.entityType) {
          const { error } = await supabase.from("a2p_registrations").upsert({
            tenant_id: tenantId!, status: "pending_data",
            legal_business_name: a2pData.legalBusinessName || businessName,
            ein: a2pData.ein || null, entity_type: a2pData.entityType || null,
            street_address: a2pData.streetAddress || null, city: a2pData.city || null,
            state: a2pData.state || null, zip_code: a2pData.zipCode || null,
            contact_first_name: a2pData.contactFirstName || null,
            contact_last_name: a2pData.contactLastName || null,
            contact_email: a2pData.contactEmail || user?.email || null,
            contact_phone: null, website_url: a2pData.websiteUrl || null,
          }, { onConflict: "tenant_id" });
          if (error) throw error;
        }
      });

      // 15. Twilio provisioning
      await runStep("phone number", async () => {
        const voicePlans = ["voice", "both", "base-", "growth-", "scale-", "power-", "enterprise"];
        const shouldProvision = voicePlans.some(p => planCode.startsWith(p));
        if (shouldProvision && !isSuperAdmin) {
          const { data: provisionData, error: provisionError } = await supabase.functions.invoke("provision-twilio-number", {
            body: { tenant_id: tenantId!, number_type: "local" },
          });
          if (provisionError) throw provisionError;
          if (provisionData?.success && provisionData.phone_number) {
            setProvisionedPhone(provisionData.phone_number);
          }
        }
      });

      // 16. Default workflows
      await runStep("workflows", async () => {
        await createDefaultWorkflowsForMode(tenantId!, (industryEntry?.businessMode || "service") as BusinessMode);
      });

      // ── STEP 17: Mark complete (always — partial config is fixable in Brain) ──
      await supabase.from("tenants").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", tenantId);
      sessionStorage.removeItem("selectedPlan");
      sessionStorage.removeItem("referralAgencySlug");
      await refreshTenant();
      await new Promise(r => setTimeout(r, 100));
      clearOnboardingData(userId);
      clearProgress();
      setIsComplete(true);

      // Surface any partial failures so the user knows what to check in the Brain
      if (stepFailures.length > 0) {
        toast({
          title: "Almost there!",
          description: `Your AI is live! A few settings (${stepFailures.join(", ")}) couldn't be saved automatically — you can update them in your Business Brain.`,
        });
      }
    } catch (error: unknown) {
      // Critical failure (tenant creation or mark-complete)
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
  }, [user, navigate, toast, refreshTenant, isSuperAdmin, retryCount, userId, createdTenantId]);

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
