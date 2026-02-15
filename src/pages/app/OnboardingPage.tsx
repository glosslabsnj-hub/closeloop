import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, CheckCircle2, Loader2,
  ChevronRight, ChevronLeft, Sliders,
  HelpCircle, ExternalLink, Clock,
  UtensilsCrossed, Users
} from "lucide-react";
import { createDefaultWorkflowsForMode } from "@/lib/createDefaultWorkflows";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { resolveIndustryTemplate } from "@/lib/templateResolver";
import { BusinessModeSelector, type BusinessMode, getDefaultModulesForMode } from "@/components/onboarding/BusinessModeSelector";
import { ScenarioDiscovery } from "@/components/onboarding/ScenarioDiscovery";
import { CommunicationPreferences, getDefaultCommunicationPrefs, type CommunicationPrefs } from "@/components/onboarding/CommunicationPreferences";
import { ConfirmationSummary } from "@/components/onboarding/ConfirmationSummary";
import { BusinessDetailsForm, getDefaultBusinessDetails, type BusinessDetails } from "@/components/onboarding/BusinessDetailsForm";
import { A2PBusinessFields, getDefaultA2PData, type A2PBusinessData } from "@/components/onboarding/A2PBusinessFields";
import { SchedulingSetup, getDefaultSchedulingPrefs, getDefaultHoursForMode, type SchedulingPrefs } from "@/components/onboarding/SchedulingSetup";
import { TeamSetupStep, type TeamMember } from "@/components/onboarding/TeamSetupStep";
import { formatErrorForToast } from "@/lib/errorMessages";
import { OnboardingProgress, OnboardingProgressMobile, type OnboardingStep } from "@/components/onboarding/OnboardingProgress";
import { OnboardingComplete } from "@/components/onboarding/OnboardingComplete";
import { IndustrySelectorGrid } from "@/components/onboarding/IndustrySelectorGrid";
import { updateCapabilityFlags } from "@/hooks/useBusinessCapabilities";
import { getQuestionsForMode, getDefaultAnswers, deriveModulesFromScenario } from "@/lib/scenarioQuestions";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/hoursUtils";
import { applyScenarioSeeds } from "@/lib/scenarioSeeding";
import { ServicePreviewStep, type EditableService } from "@/components/onboarding/ServicePreviewStep";
import { getDefaultServiceArea, type ServiceAreaConfig } from "@/components/onboarding/ServiceAreaStep";
import type { EditablePolicies } from "@/components/onboarding/PolicyPreviewStep";
import type { EditableFAQ } from "@/components/onboarding/FAQPreviewStep";
import { getIndustryOnboardingConfig } from "@/config/industryOnboardingConfig";
import type { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import type { PlanCode } from "@/types/database";

/** 7-step onboarding — deeper, business-aware setup */
const ALL_STEPS: OnboardingStep[] = [
  { id: "identity", icon: Building2, title: "Your Business", description: "Name, industry & profile" },
  { id: "scenarios", icon: HelpCircle, title: "Discovery", description: "How you operate" },
  { id: "services-preview", icon: UtensilsCrossed, title: "Your Offerings", description: "Review services" },
  { id: "scheduling", icon: Clock, title: "Scheduling", description: "Hours & availability" },
  { id: "team", icon: Users, title: "Your Team", description: "Staff & scheduling" },
  { id: "communication", icon: Sliders, title: "AI Behavior", description: "Tone & booking mode" },
  { id: "confirm", icon: CheckCircle2, title: "Review", description: "Confirm and launch" },
];

const ONBOARDING_STORAGE_KEY = "closeloop_onboarding_progress";

interface OnboardingState {
  step: number;
  businessName: string;
  businessMode: BusinessMode;
  industrySlug: string;
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
}

function saveOnboardingProgress(state: OnboardingState) {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore quota errors */ }
}

function loadOnboardingProgress(): OnboardingState | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
}

function clearOnboardingProgress() {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

export default function OnboardingPage() {
  // Restore saved progress
  const saved = useRef(loadOnboardingProgress());

  const [step, setStep] = useState(saved.current?.step ?? 1);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [provisionedPhone, setProvisionedPhone] = useState<string | undefined>();

  // Track if industry template has been initialized
  const initializedIndustryRef = useRef<string | null>(saved.current?.industrySlug || null);

  // Step 1: Identity
  const [businessName, setBusinessName] = useState(saved.current?.businessName ?? "");
  const [businessMode, setBusinessMode] = useState<BusinessMode>(saved.current?.businessMode ?? "service");

  // Step 2: Industry
  const [industrySlug, setIndustrySlug] = useState(saved.current?.industrySlug ?? "");

  // Modules (derived from industry + scenario answers)
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  // Keep a ref to the "base" modules from industry so scenario derivation can diff
  const baseModulesRef = useRef<string[]>([]);

  // Step 3: Business Details
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>(saved.current?.businessDetails ?? getDefaultBusinessDetails());

  // Step 4: Scenario Discovery
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<string, boolean>>(saved.current?.scenarioAnswers ?? {});
  const [scenarioDetails, setScenarioDetails] = useState<Record<string, string>>(saved.current?.scenarioDetails ?? {});

  // Team setup
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(saved.current?.teamMembers ?? []);
  const [isSoloOperator, setIsSoloOperator] = useState(saved.current?.isSoloOperator ?? true);
  const [a2pData, setA2pData] = useState<A2PBusinessData>(saved.current?.a2pData ?? getDefaultA2PData());

  // Step 5: Scheduling & Hours
  const [businessHours, setBusinessHours] = useState<BusinessHours>(saved.current?.businessHours ?? DEFAULT_BUSINESS_HOURS);
  const [schedulingPrefs, setSchedulingPrefs] = useState<SchedulingPrefs>(saved.current?.schedulingPrefs ?? getDefaultSchedulingPrefs("service"));

  // Step 6: Communication Preferences
  const [communicationPrefs, setCommunicationPrefs] = useState<CommunicationPrefs>(
    saved.current?.communicationPrefs ?? getDefaultCommunicationPrefs("service")
  );

  // New preview steps state (populated from template when industry changes)
  const [templateServices, setTemplateServices] = useState<EditableService[]>(saved.current?.templateServices ?? []);
  const [templateFAQs, setTemplateFAQs] = useState<EditableFAQ[]>(saved.current?.templateFAQs ?? []);
  const [templatePolicies, setTemplatePolicies] = useState<EditablePolicies>(saved.current?.templatePolicies ?? { cancellation: "", deposit: "", refund: "" });
  const [serviceArea, setServiceArea] = useState<ServiceAreaConfig>(saved.current?.serviceArea ?? getDefaultServiceArea("service"));

  // "Can't find your industry?" fallback toggle
  const [showModeFallback, setShowModeFallback] = useState(false);

  // Auto-save progress on state changes
  useEffect(() => {
    if (isComplete) return;
    const timer = setTimeout(() => {
      saveOnboardingProgress({
        step, businessName, businessMode, industrySlug,
        scenarioAnswers, scenarioDetails, schedulingPrefs, communicationPrefs,
        templateServices, templateFAQs, templatePolicies,
        serviceArea, businessDetails, businessHours,
        teamMembers, isSoloOperator, a2pData,
      });
    }, 500); // debounce
    return () => clearTimeout(timer);
  }, [step, businessName, businessMode, industrySlug, scenarioAnswers, scenarioDetails, schedulingPrefs, communicationPrefs, templateServices, templateFAQs, templatePolicies, serviceArea, businessDetails, businessHours, teamMembers, isSoloOperator, a2pData, isComplete]);

  const { user, tenant, loading: authLoading, refreshTenant, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const steps = ALL_STEPS;
  const totalSteps = steps.length;
  const progress = (step / totalSteps) * 100;

  // Load industry from sessionStorage (set from demo player or signup flow)
  useEffect(() => {
    const storedIndustry = sessionStorage.getItem("selectedIndustry");
    if (storedIndustry && storedIndustry !== industrySlug) {
      const isValidIndustry = getIndustryBySlug(storedIndustry);
      if (isValidIndustry) {
        console.log(`[Onboarding] Loading stored industry from sessionStorage: ${storedIndustry}`);
        setIndustrySlug(storedIndustry);
      }
      sessionStorage.removeItem("selectedIndustry");
    }
  }, []); // Only on mount

  // Redirect if user already has a tenant (onboarding completed)
  useEffect(() => {
    if (!authLoading && tenant) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [authLoading, tenant, navigate]);

  // Initialize data when industry changes
  useEffect(() => {
    if (!industrySlug) return;
    if (initializedIndustryRef.current === industrySlug) return;

    const industryEntry = getIndustryBySlug(industrySlug);

    // Auto-update business_mode from industry
    if (industryEntry?.businessMode) {
      const newMode = industryEntry.businessMode;
      setBusinessMode(newMode);
      // Reset communication prefs to match new mode
      setCommunicationPrefs(getDefaultCommunicationPrefs(newMode));
      // Reset scheduling prefs to match new mode
      setSchedulingPrefs(getDefaultSchedulingPrefs(newMode, undefined, industrySlug));
      setBusinessHours(getDefaultHoursForMode(newMode));
      // Reset scenario answers to match new mode (with industry context for filtering)
      const ctx = { slug: industrySlug, category: industryEntry.category };
      const defaults = getDefaultAnswers(newMode, ctx);
      // Merge in industry pre-answers (user can still override in Discovery step)
      const onboardingConfig = getIndustryOnboardingConfig(newMode, industryEntry.category, industrySlug);
      setScenarioAnswers({ ...defaults, ...onboardingConfig.preAnswers });
    }

    // Auto-update enabled_modules from industry
    const modules = industryEntry?.enabledModules ?? getDefaultModulesForMode(businessMode);
    setEnabledModules(modules);
    baseModulesRef.current = modules;

    // Populate template preview state
    const config = resolveIndustryTemplate(industrySlug);
    setTemplateServices(
      config.services.map(s => ({
        name: s.name,
        duration: s.duration,
        price: s.price,
        priceType: s.priceType || "fixed",
        description: s.description,
        enabled: true,
      }))
    );
    setTemplateFAQs(
      config.faqs.map(f => ({
        question: f.question,
        answer: f.answer,
        enabled: true,
      }))
    );
    setTemplatePolicies({
      cancellation: config.defaultPolicies?.cancellation || "",
      deposit: config.defaultPolicies?.deposit || "",
      refund: config.defaultPolicies?.refund || "",
    });
    const newMode = industryEntry?.businessMode || businessMode;
    setServiceArea(getDefaultServiceArea(newMode as BusinessMode));

    console.log(`[Onboarding] Loading template for industry: ${industrySlug}`);

    // Mark this industry as initialized
    initializedIndustryRef.current = industrySlug;
  }, [industrySlug, businessMode]);

  // When scenario answers change, derive modules
  useEffect(() => {
    if (Object.keys(scenarioAnswers).length === 0) return;
    const industryEntry = industrySlug ? getIndustryBySlug(industrySlug) : undefined;
    const ctx = industryEntry ? { slug: industrySlug, category: industryEntry.category } : undefined;
    const questions = getQuestionsForMode(businessMode, ctx);
    const derived = deriveModulesFromScenario(baseModulesRef.current, scenarioAnswers, questions);
    setEnabledModules(derived);
  }, [scenarioAnswers, businessMode, industrySlug]);

  // When business mode changes (from Step 1 manual selection), reset scenario + comm prefs
  const handleBusinessModeChange = (mode: BusinessMode) => {
    setBusinessMode(mode);
    const industryEntry = industrySlug ? getIndustryBySlug(industrySlug) : undefined;
    const ctx = industryEntry ? { slug: industrySlug, category: industryEntry.category } : undefined;
    setScenarioAnswers(getDefaultAnswers(mode, ctx));
    setCommunicationPrefs(getDefaultCommunicationPrefs(mode));
    setSchedulingPrefs(getDefaultSchedulingPrefs(mode, undefined, industrySlug));
    setBusinessHours(getDefaultHoursForMode(mode));
    setServiceArea(getDefaultServiceArea(mode));
  };

  // Current step ID based on numeric position
  const currentStepId = steps[step - 1]?.id || "";

  // Step validation
  const canProceed = (stepNum: number) => {
    const stepId = steps[stepNum - 1]?.id;
    switch (stepId) {
      case "identity": return businessName.trim().length > 0 && industrySlug.length > 0;
      case "scenarios": {
        if (businessMode === "medical") return scenarioAnswers.requiresHIPAA === true;
        return true;
      }
      case "services-preview": return templateServices.some(s => s.enabled && s.name.trim().length > 0);
      case "scheduling": return true;
      case "team": return true; // Solo toggle or team members — always valid
      case "communication": return true;
      case "confirm": return true;
      default: return false;
    }
  };

  // Show loading while checking auth state
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

  // If tenant already exists, show redirect message (fallback while navigating)
  if (tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-8 w-8 mx-auto text-success" />
          <p className="text-muted-foreground">You already have a business set up. Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const handleComplete = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not logged in",
        description: "Please log in to complete setup.",
      });
      navigate("/login?redirect=/app/onboarding");
      return;
    }

    setLoading(true);

    try {
      const isFoodMode = businessMode === "food" || enabledModules.includes("food_orders");
      const industryEntry = getIndustryBySlug(industrySlug);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      console.log("Onboarding: business mode determined", {
        industry: industrySlug,
        businessMode,
        enabledModules,
        isFoodMode,
      });

      // Build capabilities_json from modules + scenario answers + details + business profile
      const capabilitiesJson: Record<string, boolean | string> = {};
      for (const mod of enabledModules) {
        capabilitiesJson[mod] = true;
      }
      for (const [key, val] of Object.entries(scenarioAnswers)) {
        capabilitiesJson[key] = val;
      }
      // Merge follow-up detail values (e.g. depositAmount, serviceRadiusMiles)
      for (const [key, val] of Object.entries(scenarioDetails)) {
        if (val) capabilitiesJson[`_${key}`] = val;
      }
      // Store business details as capability metadata
      capabilitiesJson._teamSize = businessDetails.teamSize;
      capabilitiesJson._locationType = businessDetails.locationType;
      capabilitiesJson._pricingPosition = businessDetails.pricingPosition;
      capabilitiesJson._customerType = businessDetails.customerType;
      capabilitiesJson._expectedCallVolume = businessDetails.expectedCallVolume;
      capabilitiesJson._yearsInBusiness = businessDetails.yearsInBusiness;
      capabilitiesJson._isSoloOperator = isSoloOperator;

      // Derive team/fleet capabilities from team size (prefer discovery follow-up over businessDetails)
      const discoveryTeamSize = (scenarioAnswers as Record<string, any>)._teamSize as string | undefined;
      const effectiveTeamSize = discoveryTeamSize || businessDetails.teamSize;
      const hasTeam = effectiveTeamSize === "small" || effectiveTeamSize === "medium" || effectiveTeamSize === "large";
      if (hasTeam) {
        capabilitiesJson.hasMultipleStaff = true;
        capabilitiesJson.fleet_management = true;
        if (!enabledModules.includes("fleet_management")) {
          enabledModules.push("fleet_management");
        }
      }

      // Derive default_capacity from team size
      const teamCapacityMap: Record<string, number> = {
        solo: 1,
        small: 3,
        medium: 9,
        large: 20,
      };
      const defaultCapacity = teamCapacityMap[effectiveTeamSize] || 1;

      // Use the hours from scheduling step (not default)
      const hoursToSave = schedulingPrefs.is24x7
        ? (await import("@/lib/hoursUtils")).HOURS_24_7
        : businessHours;

      // 1. Create tenant via edge function (also creates subscription + assistant settings)
      const selectedPlan = sessionStorage.getItem("selectedPlan") as PlanCode | null;
      const planCode: PlanCode = selectedPlan || "voice";

      const { data: createResult, error: createError } = await supabase.functions.invoke(
        "create-tenant",
        {
            body: {
            name: businessName.trim(),
            business_mode: businessMode,
            timezone,
            hours_json: hoursToSave,
            industry: industrySlug,
            enabled_modules: enabledModules,
            capabilities_json: capabilitiesJson,
            hipaa_mode: businessMode === "medical",
            location: businessDetails.location || undefined,
            default_capacity: defaultCapacity,
            plan_code: planCode,
          },
        }
      );

      if (createError) {
        console.error("Tenant creation transport error:", createError);
        throw new Error(createError.message || "Failed to create business profile");
      }

      if (createResult?.error) {
        console.error("Tenant creation app error:", createResult.error);
        throw new Error(createResult.error);
      }

      const tenantId = createResult.tenant_id;
      if (!tenantId) {
        throw new Error("No tenant ID returned from server");
      }

      console.log("Tenant created via edge function:", tenantId.substring(0, 8) + "...");

      // 2. Apply user-validated template data (services, FAQs, objections, policies, coverage)
      const config = resolveIndustryTemplate(industrySlug);

      // Insert services from user-edited preview (only enabled ones)
      const servicesToInsert = templateServices
        .filter(s => s.enabled && s.name.trim().length > 0)
        .map(s => ({
          tenant_id: tenantId,
          name: s.name,
          description: s.description || null,
          duration_minutes: s.duration,
          price_amount: s.price,
          price_type: (s.priceType || "fixed") as "fixed" | "starting_at" | "quote_only",
          is_active: true,
        }));

      if (servicesToInsert.length > 0) {
        const { error: servicesError } = await supabase
          .from("services")
          .insert(servicesToInsert);
        if (servicesError) {
          console.error("Services creation error:", servicesError);
        }
      }

      // Insert FAQs from user-edited preview (only enabled ones)
      const faqsToInsert = templateFAQs
        .filter(f => f.enabled && f.question.trim().length > 0 && f.answer.trim().length > 0)
        .map((faq, index) => ({
          tenant_id: tenantId,
          question: faq.question,
          answer: faq.answer,
          priority_weight: index,
        }));

      if (faqsToInsert.length > 0) {
        const { error: faqsError } = await supabase
          .from("business_faqs")
          .insert(faqsToInsert);
        if (faqsError) {
          console.error("FAQs creation error:", faqsError);
        }
      }

      // Insert objections from template (not user-edited, kept as-is)
      const objectionsToInsert = config.objections
        .filter(o => o.objection.trim().length > 0 && o.response.trim().length > 0)
        .map((obj, index) => ({
          tenant_id: tenantId,
          objection: obj.objection,
          response: obj.response,
          priority_weight: index,
        }));

      if (objectionsToInsert.length > 0) {
        const { error: objectionsError } = await supabase
          .from("objection_responses")
          .insert(objectionsToInsert);
        if (objectionsError) {
          console.error("Objections creation error:", objectionsError);
        }
      }

      // Apply user-edited policies
      const { error: policyError } = await supabase
        .from("tenants")
        .update({
          cancellation_policy: templatePolicies.cancellation || null,
          deposit_policy: templatePolicies.deposit || null,
          refund_policy: templatePolicies.refund || null,
        })
        .eq("id", tenantId);
      if (policyError) {
        console.error("Policies update error:", policyError);
      }

      // Apply service area settings (if coverage step was shown)
      const showsCoverage = ["dispatch", "service", "food"].includes(businessMode);
      if (showsCoverage) {
        const { error: areaError } = await supabase
          .from("tenants")
          .update({
            service_area_json: {
              radius_miles: serviceArea.radiusMiles,
              zip_codes: serviceArea.zipCodes ? serviceArea.zipCodes.split(",").map(z => z.trim()).filter(Boolean) : [],
              out_of_area_message: serviceArea.outOfAreaMessage,
            },
          })
          .eq("id", tenantId);
        if (areaError) {
          console.error("Service area update error:", areaError);
        }
      }

      // 3. Save scenario flags
      await updateCapabilityFlags(tenantId, scenarioAnswers);

      // 3b. Seed high-confidence content from scenario answers
      await applyScenarioSeeds(tenantId, scenarioAnswers, businessMode);

      // 4. Create food order settings for food mode (with defaults from scenario)
      if (isFoodMode) {
        const { error: foodSettingsError } = await supabase
          .from("food_order_settings")
          .insert({
            tenant_id: tenantId,
            accepts_pickup: true,
            accepts_delivery: scenarioAnswers.offersDelivery ?? false,
            accepts_dine_in: true,
            accepts_catering: scenarioAnswers.offersCatering ?? false,
            order_confirmation_mode: "auto_confirm",
          });
        if (foodSettingsError) {
          console.error("Food order settings creation error:", foodSettingsError);
        }
      }

      // 5. Create default automations
      const automationsToInsert = [
        {
          tenant_id: tenantId,
          name: "Missed Call Follow-up",
          trigger: "missed_call" as const,
          is_enabled: true,
          steps_json: [
            { type: "send_message", body: "Hi! We noticed we missed your call. How can we help you today?" },
          ],
        },
        {
          tenant_id: tenantId,
          name: "Booking Confirmation",
          trigger: "booking_created" as const,
          is_enabled: true,
          steps_json: [
            { type: "send_message", body: "Your appointment is confirmed! We'll see you soon." },
          ],
        },
      ];

      const { error: autoError } = await supabase
        .from("automations")
        .insert(automationsToInsert);
      if (autoError) {
        console.error("Automations creation error:", autoError);
      }

      // 6. Subscription + assistant settings already created by create-tenant edge function
      // Save communication preferences (including new fields)
      const commUpdate: Record<string, unknown> = {
        ai_booking_mode: communicationPrefs.aiBookingMode,
        missed_call_behavior: communicationPrefs.missedCallBehavior,
        unknown_question_behavior: communicationPrefs.unknownQuestionBehavior,
      };

      // Store all enriched settings in settings_json
      const settingsJson: Record<string, unknown> = {};
      if (communicationPrefs.aiTone) settingsJson.ai_tone = communicationPrefs.aiTone;
      if (communicationPrefs.followUpCadence) settingsJson.followup_cadence = communicationPrefs.followUpCadence;
      if (communicationPrefs.customGreeting) settingsJson.custom_greeting = communicationPrefs.customGreeting;
      if (communicationPrefs.aiGuardrails) settingsJson.ai_guardrails = communicationPrefs.aiGuardrails;
      if (communicationPrefs.requiredIntakeFields?.length) settingsJson.required_intake_fields = communicationPrefs.requiredIntakeFields;
      if (communicationPrefs.escalationRules) settingsJson.escalation_rules = communicationPrefs.escalationRules;

      if (Object.keys(settingsJson).length > 0) {
        commUpdate.settings_json = settingsJson;
      }

      const { error: commPrefsError } = await supabase
        .from("assistant_settings")
        .update(commUpdate)
        .eq("tenant_id", tenantId);

      if (commPrefsError) {
        console.error("Communication prefs save error:", commPrefsError);
      }

      // Save greeting and tone to ai_assistants (canonical source for AI behavior)
      const assistantUpsertData: Record<string, unknown> = {};
      if (communicationPrefs.aiTone) assistantUpsertData.tone = communicationPrefs.aiTone;
      if (communicationPrefs.customGreeting) assistantUpsertData.greeting_script = communicationPrefs.customGreeting;

      if (Object.keys(assistantUpsertData).length > 0) {
        const { data: existingAssistant } = await supabase
          .from("ai_assistants").select("id").eq("tenant_id", tenantId).maybeSingle();
        if (existingAssistant) {
          await supabase.from("ai_assistants").update(assistantUpsertData).eq("tenant_id", tenantId);
        } else {
          await supabase.from("ai_assistants").insert({ tenant_id: tenantId, ...assistantUpsertData });
        }
      }

      // 7b. Save team members (stored in capabilities_json for now; Phase 3 creates staff_members table)
      if (!isSoloOperator && teamMembers.length > 0) {
        const teamData = teamMembers
          .filter((m) => m.name.trim().length > 0)
          .map((m) => ({
            name: m.name.trim(),
            role: m.role,
            phone: m.phone || null,
            email: m.email || null,
            canPerformAllServices: m.canPerformAllServices,
            serviceNames: m.serviceNames,
          }));

        if (teamData.length > 0) {
          const { error: teamError } = await supabase
            .from("tenants")
            .update({
              context_fields_json: supabase.rpc ? undefined : undefined, // handled below
            })
            .eq("id", tenantId);

          // Store team data in capabilities_json (alongside other capabilities)
          // This will be migrated to staff_members table in Phase 3
          const { error: teamCapError } = await supabase
            .from("tenants")
            .update({
              capabilities_json: {
                ...(capabilitiesJson as Record<string, unknown> || {}),
                _team_members: teamData,
              } as unknown as import("@/integrations/supabase/types").Json,
            })
            .eq("id", tenantId);

          if (teamCapError) {
            console.error("Team members save error:", teamCapError);
          }
        }
      }

      // 7c. Save scenario details (pricing data from follow-ups) to pricing_rules_jsonb
      const pricingFromDetails: Record<string, unknown> = {};
      if (scenarioDetails.depositType) pricingFromDetails.deposit_type = scenarioDetails.depositType;
      if (scenarioDetails.depositAmount) pricingFromDetails.deposit_amount = Number(scenarioDetails.depositAmount);
      if (scenarioDetails.tripFeeAmount) pricingFromDetails.trip_fee = Number(scenarioDetails.tripFeeAmount);
      if (scenarioDetails.minimumChargeAmount) pricingFromDetails.minimum_charge = Number(scenarioDetails.minimumChargeAmount);
      if (scenarioDetails.afterHoursSurcharge) pricingFromDetails.after_hours_surcharge = Number(scenarioDetails.afterHoursSurcharge);
      if (scenarioDetails.baseRate) pricingFromDetails.base_rate = Number(scenarioDetails.baseRate);
      if (scenarioDetails.perMileRate) pricingFromDetails.per_mile_rate = Number(scenarioDetails.perMileRate);
      if (scenarioDetails.cancellationNoticeHours) pricingFromDetails.cancellation_notice_hours = Number(scenarioDetails.cancellationNoticeHours);
      if (scenarioDetails.cancellationFee) pricingFromDetails.cancellation_fee = Number(scenarioDetails.cancellationFee);

      if (Object.keys(pricingFromDetails).length > 0) {
        const { error: pricingError } = await supabase
          .from("tenants")
          .update({ pricing_rules_jsonb: pricingFromDetails as unknown as import("@/integrations/supabase/types").Json })
          .eq("id", tenantId);
        if (pricingError) {
          console.error("Pricing rules save error:", pricingError);
        }
      }

      // 7d. Save service area details from follow-ups
      if (scenarioDetails.serviceRadiusMiles || scenarioDetails.deliveryRadiusMiles) {
        const currentRadius = Number(scenarioDetails.serviceRadiusMiles || scenarioDetails.deliveryRadiusMiles);
        if (currentRadius > 0) {
          const { error: areaUpdateError } = await supabase
            .from("tenants")
            .update({
              service_area_json: {
                radius_miles: currentRadius,
                zip_codes: serviceArea.zipCodes ? serviceArea.zipCodes.split(",").map(z => z.trim()).filter(Boolean) : [],
                out_of_area_message: serviceArea.outOfAreaMessage,
              },
            })
            .eq("id", tenantId);
          if (areaUpdateError) {
            console.error("Service area update from details error:", areaUpdateError);
          }
        }
      }

      // 8. Save A2P registration data (for SMS compliance)
      if (a2pData.legalBusinessName || a2pData.ein || a2pData.entityType) {
        const { error: a2pError } = await supabase
          .from("a2p_registrations")
          .upsert({
            tenant_id: tenantId,
            status: "pending_data",
            legal_business_name: a2pData.legalBusinessName || businessName,
            ein: a2pData.ein || null,
            entity_type: a2pData.entityType || null,
            street_address: a2pData.streetAddress || null,
            city: a2pData.city || null,
            state: a2pData.state || null,
            zip_code: a2pData.zipCode || null,
            contact_first_name: a2pData.contactFirstName || null,
            contact_last_name: a2pData.contactLastName || null,
            contact_email: a2pData.contactEmail || user?.email || null,
            contact_phone: null, // Will be set after provisioning
            website_url: a2pData.websiteUrl || null,
          }, { onConflict: "tenant_id" });

        if (a2pError) {
          console.error("A2P registration data save error:", a2pError);
        } else {
          console.log("A2P registration data saved for tenant:", tenantId.substring(0, 8));
        }
      }

      // 9. Twilio provisioning
      const shouldProvision = planCode.startsWith("voice") || planCode.startsWith("both");

      if (shouldProvision && !isSuperAdmin) {
        try {
          console.log("TwilioProvision: start", { tenantId, planCode });
          const { data: provisionData, error: provisionError } = await supabase.functions.invoke(
            "provision-twilio-number",
            {
              body: { tenant_id: tenantId, number_type: "local" },
            }
          );

          if (provisionError) {
            console.error("TwilioProvision: error", { message: provisionError.message });
          } else if (provisionData?.success) {
            if (provisionData.phone_number) {
              setProvisionedPhone(provisionData.phone_number);
            }
            console.log("TwilioProvision: success", {
              phone_e164: provisionData.phone_number,
              twilio_sid: provisionData.phone_sid,
            });

            // A2P 10DLC registration is now handled server-side inside provision-twilio-number
            console.log("A2P Registration: handled server-side during provisioning");
          } else {
            console.error("TwilioProvision: failed", { error: provisionData?.error });
          }
        } catch (provErr: unknown) {
          console.error("TwilioProvision: exception", { message: provErr instanceof Error ? provErr.message : String(provErr) });
        }
      } else {
        console.log("TwilioProvision: skipped", { reason: isSuperAdmin ? "admin-test-tenant" : "no-voice-feature", planCode });
      }

      // 10. Auto-create default workflows
      try {
        const workflowBusinessMode = industryEntry?.businessMode || "service";
        console.log("WorkflowsAutoCreate: start", { tenantId, businessMode: workflowBusinessMode });

        const { success, workflowIds, error: workflowError } = await createDefaultWorkflowsForMode(
          tenantId,
          workflowBusinessMode as BusinessMode
        );

        if (success) {
          console.log("WorkflowsAutoCreate: success", { workflowCount: workflowIds.length });
        } else {
          console.error("WorkflowsAutoCreate: failed", { error: workflowError });
        }
      } catch (wfErr: unknown) {
        console.error("WorkflowsAutoCreate: exception", { message: wfErr instanceof Error ? wfErr.message : String(wfErr) });
      }

      // 11. Mark onboarding as complete
      await supabase
        .from("tenants")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", tenantId);

      sessionStorage.removeItem("selectedPlan");

      await refreshTenant();
      await new Promise(resolve => setTimeout(resolve, 100));

      clearOnboardingProgress();
      setIsComplete(true);
    } catch (error: unknown) {
      console.error("Onboarding error:", error);
      const errorInfo = formatErrorForToast(error);
      toast({
        variant: "destructive",
        title: errorInfo.title,
        description: errorInfo.description,
      });
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const currentStepInfo = steps[step - 1] || steps[0];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-80 border-r bg-card flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CL</span>
            </div>
            <span className="font-semibold text-lg">Voxly</span>
          </div>
        </div>

        {/* Progress Nav */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <OnboardingProgress
            steps={steps}
            currentStep={step}
            onStepClick={(s) => s < step && setStep(s)}
          />
        </nav>

        {/* Help Footer */}
        <div className="p-6 border-t">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <a
              href="https://docs.lovable.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Contact support
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Progress Bar */}
        <div className="lg:hidden">
          <OnboardingProgressMobile
            currentStep={step}
            totalSteps={totalSteps}
            stepTitle={currentStepInfo?.title || ""}
          />
        </div>

        {/* Step Content - Centered */}
        <div className="flex-1 flex items-center justify-center p-6">
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
                  <OnboardingComplete businessName={businessName} phoneNumber={provisionedPhone} businessMode={businessMode} scenarioAnswers={scenarioAnswers} industrySlug={industrySlug} />
                </motion.div>
              ) : (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Identity + Industry + Business Profile (combined step) */}
                  {currentStepId === "identity" && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight">
                          What's your business called?
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                          This is how your AI will introduce itself on calls.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business-name">Business Name</Label>
                        <Input
                          id="business-name"
                          placeholder="e.g. Mike's Auto Detailing"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <IndustrySelectorGrid
                        value={industrySlug}
                        onChange={(slug) => {
                          setIndustrySlug(slug);
                          setShowModeFallback(false);
                        }}
                      />
                      {!showModeFallback ? (
                        <button
                          type="button"
                          className="text-sm text-muted-foreground hover:text-primary underline"
                          onClick={() => setShowModeFallback(true)}
                        >
                          Can't find your industry?
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Choose your business type instead:</p>
                          <BusinessModeSelector value={businessMode} onChange={handleBusinessModeChange} />
                        </div>
                      )}

                      {/* Business Profile — shown after industry is selected */}
                      {industrySlug && (
                        <div className="pt-4 border-t space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold tracking-tight">
                              Tell us a bit more
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              These details help us customize your AI and dashboard.
                            </p>
                          </div>
                          <BusinessDetailsForm
                            businessMode={businessMode}
                            value={businessDetails}
                            onChange={setBusinessDetails}
                          />

                          {/* A2P Business Identity for SMS compliance */}
                          <div className="pt-4 border-t">
                            <A2PBusinessFields
                              value={a2pData}
                              onChange={setA2pData}
                              businessName={businessName}
                              userEmail={user?.email || undefined}
                              userDisplayName={user?.user_metadata?.full_name || undefined}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scenario Discovery — with inline follow-up fields */}
                  {currentStepId === "scenarios" && (
                    <ScenarioDiscovery
                      businessMode={businessMode}
                      answers={scenarioAnswers}
                      onChange={setScenarioAnswers}
                      details={scenarioDetails}
                      onDetailsChange={setScenarioDetails}
                      industrySlug={industrySlug}
                      industryCategory={getIndustryBySlug(industrySlug)?.category}
                    />
                  )}

                  {/* Services Preview (NEW) */}
                  {currentStepId === "services-preview" && (
                    <ServicePreviewStep
                      businessMode={businessMode}
                      industrySlug={industrySlug}
                      services={templateServices}
                      onChange={setTemplateServices}
                    />
                  )}

                  {/* Scheduling & Hours */}
                  {currentStepId === "scheduling" && (
                    <SchedulingSetup
                      businessMode={businessMode}
                      hours={businessHours}
                      onHoursChange={setBusinessHours}
                      prefs={schedulingPrefs}
                      onPrefsChange={setSchedulingPrefs}
                      scenarioAnswers={scenarioAnswers}
                    />
                  )}

                  {/* Team Setup */}
                  {currentStepId === "team" && (
                    <TeamSetupStep
                      isSolo={isSoloOperator}
                      onSoloChange={setIsSoloOperator}
                      members={teamMembers}
                      onChange={setTeamMembers}
                      services={templateServices}
                    />
                  )}

                  {/* Communication Preferences */}
                  {currentStepId === "communication" && (
                    <CommunicationPreferences
                      businessMode={businessMode}
                      value={communicationPrefs}
                      onChange={setCommunicationPrefs}
                      scenarioAnswers={scenarioAnswers}
                    />
                  )}

                  {/* Confirmation */}
                  {currentStepId === "confirm" && (
                    <ConfirmationSummary
                      businessName={businessName}
                      businessMode={businessMode}
                      industrySlug={industrySlug}
                      scenarioAnswers={scenarioAnswers}
                      communicationPrefs={communicationPrefs}
                      schedulingPrefs={schedulingPrefs}
                      templateServices={templateServices}
                      teamMembers={teamMembers}
                      isSoloOperator={isSoloOperator}
                      onEditStep={(stepNum) => setStep(stepNum)}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Navigation */}
        {!isComplete && (
          <div className="border-t bg-card p-6">
            <div className="max-w-2xl mx-auto flex justify-between gap-4">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={step === 1}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={step === totalSteps ? handleComplete : goNext}
                disabled={!canProceed(step) || loading}
                className="gap-2 min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : step === totalSteps ? (
                  "Complete Setup"
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
