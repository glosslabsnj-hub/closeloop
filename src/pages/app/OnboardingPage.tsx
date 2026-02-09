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
  ChevronRight, ChevronLeft, Sparkles, Sliders,
  HelpCircle, ExternalLink, Briefcase, Clock
} from "lucide-react";
import { createDefaultWorkflowsForMode } from "@/lib/createDefaultWorkflows";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { resolveIndustryTemplate } from "@/lib/templateResolver";
import { BusinessModeSelector, type BusinessMode, getDefaultModulesForMode } from "@/components/onboarding/BusinessModeSelector";
import { ScenarioDiscovery } from "@/components/onboarding/ScenarioDiscovery";
import { CommunicationPreferences, getDefaultCommunicationPrefs, type CommunicationPrefs } from "@/components/onboarding/CommunicationPreferences";
import { ConfirmationSummary } from "@/components/onboarding/ConfirmationSummary";
import { BusinessDetailsForm, getDefaultBusinessDetails, type BusinessDetails } from "@/components/onboarding/BusinessDetailsForm";
import { SchedulingSetup, getDefaultSchedulingPrefs, getDefaultHoursForMode, type SchedulingPrefs } from "@/components/onboarding/SchedulingSetup";
import { formatErrorForToast } from "@/lib/errorMessages";
import { OnboardingProgress, OnboardingProgressMobile, type OnboardingStep } from "@/components/onboarding/OnboardingProgress";
import { OnboardingComplete } from "@/components/onboarding/OnboardingComplete";
import { IndustrySelectorGrid } from "@/components/onboarding/IndustrySelectorGrid";
import { updateCapabilityFlags } from "@/hooks/useBusinessCapabilities";
import { getQuestionsForMode, getDefaultAnswers, deriveModulesFromScenario } from "@/lib/scenarioQuestions";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/hoursUtils";
import { applyScenarioSeeds } from "@/lib/scenarioSeeding";
import type { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import type { PlanCode } from "@/types/database";

const steps: OnboardingStep[] = [
  { id: "identity", icon: Building2, title: "Business Name", description: "What your AI will call itself" },
  { id: "industry", icon: Sparkles, title: "Industry", description: "Customize your setup" },
  { id: "details", icon: Briefcase, title: "Details", description: "Size, pricing & volume" },
  { id: "scenarios", icon: HelpCircle, title: "Discovery", description: "How your business operates" },
  { id: "scheduling", icon: Clock, title: "Scheduling", description: "Hours & availability" },
  { id: "communication", icon: Sliders, title: "AI Behavior", description: "Tone, booking & follow-ups" },
  { id: "confirm", icon: CheckCircle2, title: "Review", description: "Confirm and launch" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [provisionedPhone, setProvisionedPhone] = useState<string | undefined>();

  // Track if industry template has been initialized
  const initializedIndustryRef = useRef<string | null>(null);

  // Step 1: Identity
  const [businessName, setBusinessName] = useState("");
  const [businessMode, setBusinessMode] = useState<BusinessMode>("service");

  // Step 2: Industry
  const [industrySlug, setIndustrySlug] = useState("");

  // Modules (derived from industry + scenario answers)
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  // Keep a ref to the "base" modules from industry so scenario derivation can diff
  const baseModulesRef = useRef<string[]>([]);

  // Step 3: Business Details
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>(getDefaultBusinessDetails());

  // Step 4: Scenario Discovery
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<string, boolean>>({});

  // Step 5: Scheduling & Hours
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [schedulingPrefs, setSchedulingPrefs] = useState<SchedulingPrefs>(getDefaultSchedulingPrefs("service"));

  // Step 6: Communication Preferences
  const [communicationPrefs, setCommunicationPrefs] = useState<CommunicationPrefs>(
    getDefaultCommunicationPrefs("service")
  );

  const { user, tenant, loading: authLoading, refreshTenant } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
      setSchedulingPrefs(getDefaultSchedulingPrefs(newMode));
      setBusinessHours(getDefaultHoursForMode(newMode));
      // Reset scenario answers to match new mode (with industry context for filtering)
      const ctx = { slug: industrySlug, category: industryEntry.category };
      setScenarioAnswers(getDefaultAnswers(newMode, ctx));
    }

    // Auto-update enabled_modules from industry
    const modules = industryEntry?.enabledModules ?? getDefaultModulesForMode(businessMode);
    setEnabledModules(modules);
    baseModulesRef.current = modules;

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
    setSchedulingPrefs(getDefaultSchedulingPrefs(mode));
    setBusinessHours(getDefaultHoursForMode(mode));
  };

  // Step validation
  const canProceed = (stepNum: number) => {
    switch (stepNum) {
      case 1: return businessName.trim().length > 0 && businessMode.length > 0;
      case 2: return industrySlug.length > 0;
      case 3: return true; // Business details all have defaults
      case 4: {
        // Medical mode requires HIPAA acknowledgment
        if (businessMode === "medical") {
          return scenarioAnswers.requiresHIPAA === true;
        }
        return true;
      }
      case 5: return true; // Scheduling has defaults
      case 6: return true; // Communication has defaults
      case 7: return true; // Confirmation
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

      // Build capabilities_json from modules + scenario answers + business details
      const capabilitiesJson: Record<string, boolean | string> = {};
      for (const mod of enabledModules) {
        capabilitiesJson[mod] = true;
      }
      for (const [key, val] of Object.entries(scenarioAnswers)) {
        capabilitiesJson[key] = val;
      }
      // Store business details as capability metadata
      capabilitiesJson._teamSize = businessDetails.teamSize;
      capabilitiesJson._pricingPosition = businessDetails.pricingPosition;
      capabilitiesJson._customerType = businessDetails.customerType;
      capabilitiesJson._expectedCallVolume = businessDetails.expectedCallVolume;
      capabilitiesJson._yearsInBusiness = businessDetails.yearsInBusiness;

      // Use the hours from scheduling step (not default)
      const hoursToSave = schedulingPrefs.is24x7
        ? (await import("@/lib/hoursUtils")).HOURS_24_7
        : businessHours;

      // 1. Create tenant via edge function
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

      // 2. Apply industry template data (services, FAQs, objections, policies)
      const config = resolveIndustryTemplate(industrySlug);

      // Insert services from template
      const servicesToInsert = config.services
        .filter(s => s.name.trim().length > 0)
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

      // Insert FAQs from template
      const faqsToInsert = config.faqs
        .filter(f => f.question.trim().length > 0 && f.answer.trim().length > 0)
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

      // Insert objections from template
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

      // Apply template policies
      if (config.defaultPolicies) {
        const { error: policyError } = await supabase
          .from("tenants")
          .update({
            cancellation_policy: config.defaultPolicies.cancellation || null,
            deposit_policy: config.defaultPolicies.deposit || null,
            refund_policy: config.defaultPolicies.refund || null,
          })
          .eq("id", tenantId);
        if (policyError) {
          console.error("Policies update error:", policyError);
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

      // 6. Subscription
      const selectedPlan = sessionStorage.getItem("selectedPlan") as PlanCode | null;
      const planCode: PlanCode = selectedPlan || "voice";

      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          tenant_id: tenantId,
          plan_code: planCode,
          status: "trialing",
          current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (subError) {
        console.error("Subscription creation error:", subError);
        throw new Error("Failed to activate trial");
      }

      // 7. Initialize assistant settings, then save communication prefs
      const { error: settingsError } = await supabase.rpc("initialize_assistant_settings", {
        _tenant_id: tenantId,
        _plan_code: planCode,
      });

      if (settingsError) {
        console.error("Assistant settings error:", settingsError);
      }

      // Save communication preferences (including new fields)
      const commUpdate: Record<string, unknown> = {
        ai_booking_mode: communicationPrefs.aiBookingMode,
        missed_call_behavior: communicationPrefs.missedCallBehavior,
        unknown_question_behavior: communicationPrefs.unknownQuestionBehavior,
      };

      // Store AI tone, follow-up cadence, and custom greeting in settings_json as backup
      const settingsJson: Record<string, string> = {};
      if (communicationPrefs.aiTone) settingsJson.ai_tone = communicationPrefs.aiTone;
      if (communicationPrefs.followUpCadence) settingsJson.followup_cadence = communicationPrefs.followUpCadence;
      if (communicationPrefs.customGreeting) settingsJson.custom_greeting = communicationPrefs.customGreeting;

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

      // 8. Twilio provisioning
      const shouldProvision = planCode.startsWith("voice") || planCode.startsWith("both");

      if (shouldProvision) {
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
          } else {
            console.error("TwilioProvision: failed", { error: provisionData?.error });
          }
        } catch (provErr: unknown) {
          console.error("TwilioProvision: exception", { message: provErr instanceof Error ? provErr.message : String(provErr) });
        }
      } else {
        console.log("TwilioProvision: skipped", { reason: "no-voice-feature", planCode });
      }

      // 9. Auto-create default workflows
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

      // 10. Mark onboarding as complete
      await supabase
        .from("tenants")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", tenantId);

      sessionStorage.removeItem("selectedPlan");

      await refreshTenant();
      await new Promise(resolve => setTimeout(resolve, 100));

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

  const currentStepInfo = steps[step - 1];

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
            <span className="font-semibold text-lg">CloseLoop</span>
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
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              {isComplete ? (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <OnboardingComplete businessName={businessName} phoneNumber={provisionedPhone} />
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
                  {/* Step 1: Identity */}
                  {step === 1 && (
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
                      <BusinessModeSelector value={businessMode} onChange={handleBusinessModeChange} />
                    </div>
                  )}

                  {/* Step 2: Industry */}
                  {step === 2 && (
                    <IndustrySelectorGrid
                      value={industrySlug}
                      onChange={(slug) => setIndustrySlug(slug)}
                    />
                  )}

                  {/* Step 3: Business Details */}
                  {step === 3 && (
                    <BusinessDetailsForm
                      businessMode={businessMode}
                      value={businessDetails}
                      onChange={setBusinessDetails}
                    />
                  )}

                  {/* Step 4: Scenario Discovery */}
                  {step === 4 && (
                    <ScenarioDiscovery
                      businessMode={businessMode}
                      answers={scenarioAnswers}
                      onChange={setScenarioAnswers}
                      industrySlug={industrySlug}
                      industryCategory={getIndustryBySlug(industrySlug)?.category}
                    />
                  )}

                  {/* Step 5: Scheduling & Hours */}
                  {step === 5 && (
                    <SchedulingSetup
                      businessMode={businessMode}
                      hours={businessHours}
                      onHoursChange={setBusinessHours}
                      prefs={schedulingPrefs}
                      onPrefsChange={setSchedulingPrefs}
                    />
                  )}

                  {/* Step 6: Communication Preferences */}
                  {step === 6 && (
                    <CommunicationPreferences
                      businessMode={businessMode}
                      value={communicationPrefs}
                      onChange={setCommunicationPrefs}
                    />
                  )}

                  {/* Step 7: Confirmation */}
                  {step === 7 && (
                    <ConfirmationSummary
                      businessName={businessName}
                      businessMode={businessMode}
                      industrySlug={industrySlug}
                      scenarioAnswers={scenarioAnswers}
                      communicationPrefs={communicationPrefs}
                      businessDetails={businessDetails}
                      schedulingPrefs={schedulingPrefs}
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
            <div className="max-w-lg mx-auto flex justify-between gap-4">
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
