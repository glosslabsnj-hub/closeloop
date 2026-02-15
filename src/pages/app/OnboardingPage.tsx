import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, CheckCircle2, Loader2,
  ChevronRight, ChevronLeft,
  ExternalLink, RefreshCw, LogOut,
  Briefcase, Sparkles, Link2, Rocket,
} from "lucide-react";
import { useOnboardingValidation } from "@/hooks/useOnboardingValidation";
import { cn } from "@/lib/utils";
import { createDefaultWorkflowsForMode } from "@/lib/createDefaultWorkflows";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { resolveIndustryTemplate } from "@/lib/templateResolver";
import { type BusinessMode, getDefaultModulesForMode } from "@/components/onboarding/BusinessModeSelector";
import { getDefaultCommunicationPrefs, type CommunicationPrefs, type AITone, type AIBookingMode } from "@/components/onboarding/CommunicationPreferences";
import { getDefaultBusinessDetails, type BusinessDetails } from "@/components/onboarding/BusinessDetailsForm";
import { getDefaultA2PData, type A2PBusinessData } from "@/components/onboarding/A2PBusinessFields";
import { getDefaultSchedulingPrefs, getDefaultHoursForMode, type SchedulingPrefs } from "@/components/onboarding/SchedulingSetup";
import { type TeamMember } from "@/components/onboarding/TeamSetupStep";
import { formatErrorForToast } from "@/lib/errorMessages";
import { OnboardingComplete } from "@/components/onboarding/OnboardingComplete";
import { updateCapabilityFlags } from "@/hooks/useBusinessCapabilities";
import { ResumeOnboardingModal } from "@/components/onboarding/ResumeOnboardingModal";
import { AutoSaveIndicator } from "@/components/onboarding/AutoSaveIndicator";
import { getQuestionsForMode, getDefaultAnswers, deriveModulesFromScenario } from "@/lib/scenarioQuestions";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/hoursUtils";
import { applyScenarioSeeds } from "@/lib/scenarioSeeding";
import { type EditableService } from "@/components/onboarding/ServicePreviewStep";
import { getDefaultServiceArea, type ServiceAreaConfig } from "@/components/onboarding/ServiceAreaStep";
import type { EditablePolicies } from "@/components/onboarding/PolicyPreviewStep";
import type { EditableFAQ } from "@/components/onboarding/FAQPreviewStep";
import { getIndustryOnboardingConfig } from "@/config/industryOnboardingConfig";
import type { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import type { PlanCode } from "@/types/database";
import { useOnboardingProgress, ONBOARDING_PHASES } from "@/hooks/useOnboardingProgress";

// Phase sub-components
import { OnboardingIdentity, type WorkStyle } from "@/components/onboarding/phases/OnboardingIdentity";
import { OnboardingOfferings } from "@/components/onboarding/phases/OnboardingOfferings";
import { OnboardingAI, type AfterHoursBehavior } from "@/components/onboarding/phases/OnboardingAI";
import { OnboardingConnect } from "@/components/onboarding/phases/OnboardingConnect";
import { OnboardingReview } from "@/components/onboarding/phases/OnboardingReview";

/** Phase icons for sidebar */
const PHASE_ICONS = [Building2, Briefcase, Sparkles, Link2, Rocket];

function getOldStorageKey(userId?: string) {
  return `voxly_onboarding_progress_${userId || "anon"}`;
}

interface OnboardingDataState {
  businessName: string;
  businessMode: BusinessMode;
  industrySlug: string;
  workStyle: WorkStyle;
  scenarioAnswers: Record<string, boolean>;
  scenarioDetails: Record<string, string>;
  schedulingPrefs: SchedulingPrefs;
  communicationPrefs: CommunicationPrefs;
  templateServices: EditableService[];
  templateFAQs: EditableFAQ[];
  templatePolicies: EditablePolicies;
  serviceArea: ServiceAreaConfig;
  businessDetails: BusinessDetails;
  businessHours: BusinessHours;
  teamMembers: TeamMember[];
  isSoloOperator: boolean;
  a2pData: A2PBusinessData;
  aiTone: AITone;
  bookingMode: AIBookingMode;
  afterHours: AfterHoursBehavior;
  customGreeting: string;
  notificationPhone: string;
  savedAt?: string;
}

function getDataStorageKey(userId?: string) {
  return `voxly_onboarding_data_v2_${userId || "anon"}`;
}

function saveOnboardingData(state: Partial<OnboardingDataState>, userId?: string) {
  try {
    localStorage.setItem(getDataStorageKey(userId), JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
  } catch { /* ignore */ }
}

function loadOnboardingData(userId?: string): OnboardingDataState | null {
  try {
    const raw = localStorage.getItem(getDataStorageKey(userId));
    if (raw) return JSON.parse(raw) as OnboardingDataState;
    // Try migrating from old format
    const oldRaw = localStorage.getItem(getOldStorageKey(userId));
    if (oldRaw) return JSON.parse(oldRaw) as OnboardingDataState;
  } catch { /* ignore */ }
  return null;
}

function clearOnboardingData(userId?: string) {
  localStorage.removeItem(getDataStorageKey(userId));
  localStorage.removeItem(getOldStorageKey(userId));
}

export default function OnboardingPage() {
  const { user, tenant, loading: authLoading, refreshTenant, isSuperAdmin } = useAuth();
  const userId = user?.id;
  const saved = useRef(loadOnboardingData(userId));

  const {
    phase, currentPhase, progressPercent, totalPhases, totalMinutes,
    hasSavedProgress, goNext: progressGoNext, goBack: progressGoBack,
    goToPhase, resetProgress, clearProgress,
  } = useOnboardingProgress(userId);

  // State
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [provisionedPhone, setProvisionedPhone] = useState<string | undefined>();
  const [retryCount, setRetryCount] = useState(0);
  const [showRetry, setShowRetry] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const MAX_RETRIES = 3;

  // Resume modal
  const [showResumeModal, setShowResumeModal] = useState(
    () => hasSavedProgress
  );
  const [resumeDecided, setResumeDecided] = useState(!hasSavedProgress);

  // Auto-save indicator
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const { validateStep, getFieldError, clearErrors } = useOnboardingValidation();

  const initializedIndustryRef = useRef<string | null>(saved.current?.industrySlug || null);

  // --- All form state ---
  const initialBusinessName = saved.current?.businessName || sessionStorage.getItem("businessName") || "";
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [businessMode, setBusinessMode] = useState<BusinessMode>(saved.current?.businessMode ?? "service");
  const [industrySlug, setIndustrySlug] = useState(saved.current?.industrySlug ?? "");
  const [workStyle, setWorkStyle] = useState<WorkStyle>(saved.current?.workStyle ?? "customer_comes");
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const baseModulesRef = useRef<string[]>([]);
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>(saved.current?.businessDetails ?? getDefaultBusinessDetails());
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<string, boolean>>(saved.current?.scenarioAnswers ?? {});
  const [scenarioDetails, setScenarioDetails] = useState<Record<string, string>>(saved.current?.scenarioDetails ?? {});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(saved.current?.teamMembers ?? []);
  const [isSoloOperator, setIsSoloOperator] = useState(saved.current?.isSoloOperator ?? true);
  const [a2pData, setA2pData] = useState<A2PBusinessData>(saved.current?.a2pData ?? getDefaultA2PData());
  const [businessHours, setBusinessHours] = useState<BusinessHours>(saved.current?.businessHours ?? DEFAULT_BUSINESS_HOURS);
  const [schedulingPrefs, setSchedulingPrefs] = useState<SchedulingPrefs>(saved.current?.schedulingPrefs ?? getDefaultSchedulingPrefs("service"));
  const [communicationPrefs, setCommunicationPrefs] = useState<CommunicationPrefs>(
    saved.current?.communicationPrefs ?? getDefaultCommunicationPrefs("service")
  );
  const [templateServices, setTemplateServices] = useState<EditableService[]>(saved.current?.templateServices ?? []);
  const [templateFAQs, setTemplateFAQs] = useState<EditableFAQ[]>(saved.current?.templateFAQs ?? []);
  const [templatePolicies, setTemplatePolicies] = useState<EditablePolicies>(saved.current?.templatePolicies ?? { cancellation: "", deposit: "", refund: "" });
  const [serviceArea, setServiceArea] = useState<ServiceAreaConfig>(saved.current?.serviceArea ?? getDefaultServiceArea("service"));

  // Phase 3 specific state
  const [aiTone, setAiTone] = useState<AITone>(saved.current?.aiTone ?? "friendly");
  const [bookingMode, setBookingMode] = useState<AIBookingMode>(saved.current?.bookingMode ?? "auto_book");
  const [afterHours, setAfterHours] = useState<AfterHoursBehavior>(saved.current?.afterHours ?? "ai_24_7");
  const [customGreeting, setCustomGreeting] = useState(saved.current?.customGreeting ?? "");

  // Phase 4 specific state
  const [notificationPhone, setNotificationPhone] = useState(saved.current?.notificationPhone ?? "");
  const [calendarConnected] = useState(false);

  // Clear signup sessionStorage
  useEffect(() => { sessionStorage.removeItem("businessName"); }, []);

  // Resume handlers
  const handleResume = () => { setShowResumeModal(false); setResumeDecided(true); };
  const handleStartFresh = () => {
    setShowResumeModal(false);
    setResumeDecided(true);
    clearOnboardingData(userId);
    resetProgress();
    setBusinessName(sessionStorage.getItem("businessName") || "");
    setIndustrySlug("");
    setScenarioAnswers({});
    setScenarioDetails({});
    setTemplateServices([]);
    setTemplateFAQs([]);
    setTemplatePolicies({ cancellation: "", deposit: "", refund: "" });
    initializedIndustryRef.current = null;
  };

  // Auto-save debounced
  useEffect(() => {
    if (isComplete || !resumeDecided) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      saveOnboardingData({
        businessName, businessMode, industrySlug, workStyle,
        scenarioAnswers, scenarioDetails, schedulingPrefs, communicationPrefs,
        templateServices, templateFAQs, templatePolicies,
        serviceArea, businessDetails, businessHours,
        teamMembers, isSoloOperator, a2pData,
        aiTone, bookingMode, afterHours, customGreeting, notificationPhone,
      }, userId);
      setSaveStatus("saved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    }, 3000);
    return () => clearTimeout(timer);
  }, [phase, businessName, businessMode, industrySlug, workStyle, scenarioAnswers, scenarioDetails, schedulingPrefs, communicationPrefs, templateServices, templateFAQs, templatePolicies, serviceArea, businessDetails, businessHours, teamMembers, isSoloOperator, a2pData, aiTone, bookingMode, afterHours, customGreeting, notificationPhone, isComplete, resumeDecided, userId]);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Load industry from sessionStorage
  useEffect(() => {
    const storedIndustry = sessionStorage.getItem("selectedIndustry");
    if (storedIndustry && storedIndustry !== industrySlug) {
      const isValid = getIndustryBySlug(storedIndustry);
      if (isValid) setIndustrySlug(storedIndustry);
      sessionStorage.removeItem("selectedIndustry");
    }
  }, []);

  // Redirect if already has tenant
  useEffect(() => {
    if (!authLoading && tenant) navigate("/app/dashboard", { replace: true });
  }, [authLoading, tenant, navigate]);

  // Initialize when industry changes
  useEffect(() => {
    if (!industrySlug) return;
    if (initializedIndustryRef.current === industrySlug) return;
    const industryEntry = getIndustryBySlug(industrySlug);
    if (industryEntry?.businessMode) {
      const newMode = industryEntry.businessMode;
      setBusinessMode(newMode);
      setCommunicationPrefs(getDefaultCommunicationPrefs(newMode));
      setSchedulingPrefs(getDefaultSchedulingPrefs(newMode, undefined, industrySlug));
      setBusinessHours(getDefaultHoursForMode(newMode));
      const ctx = { slug: industrySlug, category: industryEntry.category };
      const defaults = getDefaultAnswers(newMode, ctx);
      const onboardingConfig = getIndustryOnboardingConfig(newMode, industryEntry.category, industrySlug);
      setScenarioAnswers({ ...defaults, ...onboardingConfig.preAnswers });
      // Set AI defaults from mode
      const modePrefs = getDefaultCommunicationPrefs(newMode);
      setAiTone(modePrefs.aiTone);
      setBookingMode(modePrefs.aiBookingMode);
    }
    const modules = industryEntry?.enabledModules ?? getDefaultModulesForMode(businessMode);
    setEnabledModules(modules);
    baseModulesRef.current = modules;
    const config = resolveIndustryTemplate(industrySlug);
    setTemplateServices(config.services.map(s => ({
      name: s.name, duration: s.duration, price: s.price,
      priceType: s.priceType || "fixed", description: s.description, enabled: true,
    })));
    setTemplateFAQs(config.faqs.map(f => ({ question: f.question, answer: f.answer, enabled: true })));
    setTemplatePolicies({
      cancellation: config.defaultPolicies?.cancellation || "",
      deposit: config.defaultPolicies?.deposit || "",
      refund: config.defaultPolicies?.refund || "",
    });
    const newMode = industryEntry?.businessMode || businessMode;
    setServiceArea(getDefaultServiceArea(newMode as BusinessMode));
    // Auto-detect work style from mode
    if (newMode === "dispatch") setWorkStyle("go_to_customer");
    else if (newMode === "food") setWorkStyle("customer_comes");
    initializedIndustryRef.current = industrySlug;
  }, [industrySlug, businessMode]);

  // Derive modules from scenario answers
  useEffect(() => {
    if (Object.keys(scenarioAnswers).length === 0) return;
    const industryEntry = industrySlug ? getIndustryBySlug(industrySlug) : undefined;
    const ctx = industryEntry ? { slug: industrySlug, category: industryEntry.category } : undefined;
    const questions = getQuestionsForMode(businessMode, ctx);
    const derived = deriveModulesFromScenario(baseModulesRef.current, scenarioAnswers, questions);
    setEnabledModules(derived);
  }, [scenarioAnswers, businessMode, industrySlug]);

  const handleBusinessModeChange = (mode: BusinessMode) => {
    setBusinessMode(mode);
    const industryEntry = industrySlug ? getIndustryBySlug(industrySlug) : undefined;
    const ctx = industryEntry ? { slug: industrySlug, category: industryEntry.category } : undefined;
    setScenarioAnswers(getDefaultAnswers(mode, ctx));
    setCommunicationPrefs(getDefaultCommunicationPrefs(mode));
    setSchedulingPrefs(getDefaultSchedulingPrefs(mode, undefined, industrySlug));
    setBusinessHours(getDefaultHoursForMode(mode));
    setServiceArea(getDefaultServiceArea(mode));
    const modePrefs = getDefaultCommunicationPrefs(mode);
    setAiTone(modePrefs.aiTone);
    setBookingMode(modePrefs.aiBookingMode);
  };

  // Phase validation
  const canProceed = (phaseNum: number) => {
    switch (phaseNum) {
      case 1: return businessName.trim().length > 0 && industrySlug.length > 0;
      case 2: return templateServices.some(s => s.enabled && s.name.trim().length > 0);
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // --- COMPLETION LOGIC (preserved from original) ---
  const handleComplete = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Not logged in", description: "Please log in to complete setup." });
      navigate("/login?redirect=/app/onboarding");
      return;
    }
    setLoading(true);
    try {
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
      if (servicesToInsert.length > 0) {
        await supabase.from("services").insert(servicesToInsert);
      }

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
  };

  const goNext = () => {
    if (phase === 1) {
      const isValid = validateStep("identity", { businessName, industrySlug, businessDetails });
      if (!isValid) return;
    } else if (phase === 2) {
      const isValid = validateStep("services-preview", { templateServices });
      if (!isValid) return;
    }
    clearErrors();
    if (phase < totalPhases) progressGoNext();
  };

  const goBack = () => {
    clearErrors();
    if (phase > 1) progressGoBack();
  };

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRIES) {
      setCompletionError("We're having trouble saving. Please refresh and try again, or contact support.");
      return;
    }
    setLoading(true);
    setCompletionError(null);
    await new Promise(r => setTimeout(r, Math.pow(2, retryCount) * 1000));
    setRetryCount(prev => prev + 1);
    handleComplete();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-80 border-r bg-card flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CL</span>
            </div>
            <span className="font-semibold text-lg">CloseLoop</span>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {ONBOARDING_PHASES.map((p, idx) => {
              const phaseNum = idx + 1;
              const isActive = phaseNum === phase;
              const isCompleted = phaseNum < phase;
              const isFuture = phaseNum > phase;
              const Icon = PHASE_ICONS[idx];
              const isLast = idx === ONBOARDING_PHASES.length - 1;

              return (
                <div key={p.id} className="relative">
                  {/* Connector */}
                  {!isLast && (
                    <div className={cn(
                      "absolute left-4 top-12 w-0.5 h-6",
                      isCompleted ? "bg-primary/30" : "bg-border"
                    )} />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (phaseNum <= phase) goToPhase(phaseNum);
                    }}
                    disabled={isFuture}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all relative z-10",
                      isActive && "bg-primary/10",
                      isCompleted && "hover:bg-muted/50 cursor-pointer",
                      isFuture && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isActive && "bg-primary text-primary-foreground border-primary",
                      isCompleted && "bg-primary/15 text-primary border-primary/40",
                      isFuture && "bg-background text-muted-foreground border-border"
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isActive && "text-foreground",
                        (isCompleted || isFuture) && "text-muted-foreground"
                      )}>
                        {p.title}
                      </p>
                      {isActive && (
                        <p className="text-xs text-muted-foreground truncate">{p.subtitle} · ~{p.estimatedMinutes} min</p>
                      )}
                      {isCompleted && (
                        <p className="text-xs text-primary/70 truncate">Click to edit</p>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="p-6 border-t">
          <p className="text-sm text-muted-foreground">
            About {totalMinutes} minutes total
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Progress */}
        <div className="lg:hidden p-4 border-b bg-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">
              Step {phase} of {totalPhases}
            </p>
            <p className="text-sm text-muted-foreground">{currentPhase.title}</p>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Desktop Progress Bar */}
        <div className="hidden lg:block px-6 pt-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                Step {phase} of {totalPhases} — About {totalMinutes} minutes total
              </p>
              <AutoSaveIndicator status={saveStatus} />
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait">
              {isComplete ? (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <OnboardingComplete
                    businessName={businessName}
                    phoneNumber={provisionedPhone}
                    businessMode={businessMode}
                    scenarioAnswers={scenarioAnswers}
                    industrySlug={industrySlug}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {phase === 1 && (
                    <OnboardingIdentity
                      businessName={businessName}
                      onBusinessNameChange={setBusinessName}
                      industrySlug={industrySlug}
                      onIndustryChange={setIndustrySlug}
                      businessMode={businessMode}
                      onBusinessModeChange={handleBusinessModeChange}
                      workStyle={workStyle}
                      onWorkStyleChange={setWorkStyle}
                      getFieldError={getFieldError}
                    />
                  )}
                  {phase === 2 && (
                    <OnboardingOfferings
                      businessMode={businessMode}
                      industrySlug={industrySlug}
                      services={templateServices}
                      onServicesChange={setTemplateServices}
                      hours={businessHours}
                      onHoursChange={setBusinessHours}
                      is24x7={schedulingPrefs.is24x7}
                      onIs24x7Change={(v) => setSchedulingPrefs({ ...schedulingPrefs, is24x7: v })}
                      serviceArea={serviceArea}
                      onServiceAreaChange={setServiceArea}
                      workStyle={workStyle}
                    />
                  )}
                  {phase === 3 && (
                    <OnboardingAI
                      businessMode={businessMode}
                      aiTone={aiTone}
                      onAiToneChange={setAiTone}
                      bookingMode={bookingMode}
                      onBookingModeChange={setBookingMode}
                      afterHours={afterHours}
                      onAfterHoursChange={setAfterHours}
                      customGreeting={customGreeting}
                      onCustomGreetingChange={setCustomGreeting}
                    />
                  )}
                  {phase === 4 && (
                    <OnboardingConnect
                      notificationPhone={notificationPhone}
                      onNotificationPhoneChange={setNotificationPhone}
                      calendarConnected={calendarConnected}
                      onConnectCalendar={() => {
                        toast({ title: "Calendar", description: "Calendar connection will be available after setup." });
                      }}
                    />
                  )}
                  {phase === 5 && (
                    <OnboardingReview
                      businessName={businessName}
                      businessMode={businessMode}
                      industrySlug={industrySlug}
                      services={templateServices}
                      aiTone={aiTone}
                      bookingMode={bookingMode}
                      afterHours={afterHours}
                      is24x7={schedulingPrefs.is24x7}
                      workStyle={workStyle}
                      serviceAreaRadius={serviceArea.radiusMiles}
                      onEditPhase={goToPhase}
                      onTestAI={() => toast({ title: "Test AI", description: "AI testing will be available after setup." })}
                      onGoLive={handleComplete}
                      loading={loading}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Navigation */}
        {!isComplete && phase < 5 && (
          <div className="border-t bg-card p-6">
            <div className="max-w-2xl mx-auto space-y-3">
              {completionError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">
                  {completionError}
                </div>
              )}
              <div className="flex justify-between gap-4">
                <Button variant="ghost" onClick={goBack} disabled={phase === 1} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                <div className="flex gap-2">
                  {phase === 4 && (
                    <Button variant="ghost" onClick={goNext} className="text-muted-foreground">
                      Skip for now
                    </Button>
                  )}
                  <Button
                    onClick={goNext}
                    disabled={!canProceed(phase)}
                    className="gap-2 min-w-[140px]"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 5 has its own CTA buttons */}
        {!isComplete && phase === 5 && showRetry && !loading && (
          <div className="border-t bg-card p-6">
            <div className="max-w-2xl mx-auto flex justify-center gap-3">
              <Button variant="ghost" onClick={() => goToPhase(1)} className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Go back and edit
              </Button>
              <Button variant="outline" onClick={handleRetry} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Retry ({MAX_RETRIES - retryCount} left)
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Resume Modal */}
      <ResumeOnboardingModal
        open={showResumeModal}
        savedAt={saved.current?.savedAt}
        onResume={handleResume}
        onStartFresh={handleStartFresh}
      />
    </div>
  );
}
