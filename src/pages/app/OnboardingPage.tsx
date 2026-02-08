import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Clock, FileText, CheckCircle2, Loader2,
  ChevronRight, ChevronLeft, Sparkles, Brain, Wrench, Sliders,
  HelpCircle, ExternalLink
} from "lucide-react";
import { createDefaultWorkflowsForMode } from "@/lib/createDefaultWorkflows";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { resolveIndustryTemplate } from "@/lib/templateResolver";
import { getModeContract } from "@/lib/businessModeContract";
import { BusinessModeSelector, type BusinessMode, getDefaultModulesForMode } from "@/components/onboarding/BusinessModeSelector";
import { ModuleSelector } from "@/components/onboarding/ModuleSelector";
import BusinessBasicsForm, { BusinessBasicsData, validateBusinessBasics } from "@/components/onboarding/BusinessBasicsForm";
import ServiceEditorAdvanced, { AdvancedService } from "@/components/onboarding/ServiceEditorAdvanced";
import FAQEditor, { FAQ } from "@/components/onboarding/FAQEditor";
import ObjectionEditor, { ObjectionResponse } from "@/components/onboarding/ObjectionEditor";
import PoliciesEditor, { BusinessPolicies } from "@/components/onboarding/PoliciesEditor";
import { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import { FoodSetupEditor, FoodSetupData } from "@/components/onboarding/FoodSetupEditor";
import { formatErrorForToast } from "@/lib/errorMessages";
import { OnboardingProgress, type OnboardingStep } from "@/components/onboarding/OnboardingProgress";
import { OnboardingComplete } from "@/components/onboarding/OnboardingComplete";
import { IndustrySelectorGrid } from "@/components/onboarding/IndustrySelectorGrid";
import { cn } from "@/lib/utils";
import type { PlanCode } from "@/types/database";

import { DEFAULT_BUSINESS_HOURS } from "@/lib/hoursUtils";

const defaultBusinessHours = DEFAULT_BUSINESS_HOURS;

const steps: OnboardingStep[] = [
  { id: "mode", icon: Wrench, title: "Business Mode", description: "What type of business are you?" },
  { id: "industry", icon: Building2, title: "Industry", description: "Choose your industry for smart defaults" },
  { id: "features", icon: Sliders, title: "Features", description: "Select which modules to enable" },
  { id: "basics", icon: Clock, title: "Business Info", description: "Name, phone, and hours" },
  { id: "offerings", icon: Sparkles, title: "Offerings", description: "Your services or menu" },
  { id: "policies", icon: FileText, title: "Policies & FAQs", description: "Business rules and common questions" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Track if industry template has been initialized
  const initializedIndustryRef = useRef<string | null>(null);

  // Step 1: Business Mode
  const [businessMode, setBusinessMode] = useState<BusinessMode>("service");

  // Step 2: Industry
  const [industrySlug, setIndustrySlug] = useState("");

  // Step 3: Enabled Modules (start empty, will be set by industry selection)
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  // Step 4: Business Basics
  const [businessBasics, setBusinessBasics] = useState<BusinessBasicsData>({
    businessName: "",
    tagline: "",
    phoneNumber: "",
    address: "",
    timezone: "America/New_York",
    hoursJson: defaultBusinessHours,
  });

  // Step 5: Services
  const [services, setServices] = useState<AdvancedService[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [objections, setObjections] = useState<ObjectionResponse[]>([]);

  // Step 5: Food Setup (for food mode)
  const [foodSetup, setFoodSetup] = useState<FoodSetupData>({
    acceptsPickup: true,
    acceptsDelivery: false,
    acceptsDineIn: false,
    deliveryRadius: 5,
    deliveryMinimumCents: 1500, // $15
    estimatedPrepMinutes: 15,
    busyBufferMinutes: 30,
    deliveryWindowMin: 20,
    deliveryWindowMax: 40,
    acceptsCatering: false,
    cateringMinGuests: 10,
    cateringLeadDays: 3,
    menuNotes: "",
  });

  // Step 6: Policies
  const [policies, setPolicies] = useState<BusinessPolicies>({
    cancellationPolicy: "",
    depositPolicy: "",
    refundPolicy: "",
    paymentMethods: ["cash", "card"],
    aiNeverPromise: [],
  });

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

  // Initialize data when industry changes - uses template resolver
  useEffect(() => {
    if (!industrySlug) return;
    if (initializedIndustryRef.current === industrySlug) return;

    // Get industry entry from catalog
    const industryEntry = getIndustryBySlug(industrySlug);

    // Auto-update business_mode from industry
    if (industryEntry?.businessMode) {
      setBusinessMode(industryEntry.businessMode);
    }

    // Auto-update enabled_modules from industry
    if (industryEntry?.enabledModules) {
      setEnabledModules(industryEntry.enabledModules);
    } else {
      setEnabledModules(getDefaultModulesForMode(businessMode));
    }

    // Use the template resolver to get the correct config
    const config = resolveIndustryTemplate(industrySlug);
    console.log(`[Onboarding] Loading template for industry: ${industrySlug}`, config.label);

    // Update services from the resolved template
    setServices(config.services.map(s => ({
      ...s,
      description: s.description || "",
      preparationInstructions: "",
      upsellSuggestions: [],
      depositRequired: false,
    })));

    // Update FAQs
    setFaqs(config.faqs.map(f => ({ ...f })));

    // Update objections
    setObjections(config.objections.map(o => ({ ...o })));

    // Update policies
    setPolicies({
      cancellationPolicy: config.defaultPolicies.cancellation,
      depositPolicy: config.defaultPolicies.deposit,
      refundPolicy: config.defaultPolicies.refund,
      paymentMethods: ["cash", "card"],
      aiNeverPromise: [],
    });

    // Mark this industry as initialized
    initializedIndustryRef.current = industrySlug;
  }, [industrySlug, businessMode]);

  // Step validation
  const canProceed = (stepNum: number) => {
    switch (stepNum) {
      case 1: return businessMode.length > 0;
      case 2: return industrySlug.length > 0;
      case 3: return enabledModules.length > 0;
      case 4: return validateBusinessBasics(businessBasics);
      case 5: return services.length > 0 && services.every(s => s.name.trim().length > 0);
      case 6: return true;
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
      // Use business mode and enabled modules from state (selected in Steps 1-3)
      const isFoodMode = businessMode === "food" || enabledModules.includes("food_orders");
      const industryEntry = getIndustryBySlug(industrySlug);

      console.log("Onboarding: business mode determined", {
        industry: industrySlug,
        businessMode,
        enabledModules,
        isFoodMode
      });

      // Create tenant via edge function (handles RLS bypass and membership creation)
      const { data: createResult, error: createError } = await supabase.functions.invoke(
        "create-tenant",
        {
          body: {
            name: businessBasics.businessName,
            business_mode: businessMode,
            timezone: businessBasics.timezone,
            tagline: businessBasics.tagline || null,
            phone_public: businessBasics.phoneNumber,
            address: businessBasics.address || null,
            hours_json: businessBasics.hoursJson,
            industry: industrySlug,
            enabled_modules: enabledModules,
            cancellation_policy: policies.cancellationPolicy || null,
            deposit_policy: policies.depositPolicy || null,
            refund_policy: policies.refundPolicy || null,
            payment_methods: policies.paymentMethods,
            ai_never_promise: policies.aiNeverPromise,
            hipaa_mode: businessMode === "medical",
          },
        }
      );

      // Handle transport error
      if (createError) {
        console.error("Tenant creation transport error:", createError);
        throw new Error(createError.message || "Failed to create business profile");
      }

      // Handle application error from edge function
      if (createResult?.error) {
        console.error("Tenant creation app error:", createResult.error);
        throw new Error(createResult.error);
      }

      const tenantId = createResult.tenant_id;
      if (!tenantId) {
        throw new Error("No tenant ID returned from server");
      }

      console.log("Tenant created via edge function:", tenantId.substring(0, 8) + "...");

      // Create services
      const servicesToInsert = services
        .filter(s => s.name.trim().length > 0)
        .map(service => ({
          tenant_id: tenantId,
          name: service.name,
          description: service.description || null,
          duration_minutes: service.duration,
          price_amount: service.price,
          price_type: service.priceType as "fixed" | "starting_at" | "quote_only",
          preparation_instructions: service.preparationInstructions || null,
          upsell_suggestions: service.upsellSuggestions.length > 0 ? service.upsellSuggestions : null,
          deposit_required: service.depositRequired,
          is_active: true,
        }));

      if (servicesToInsert.length > 0) {
        const { error: servicesError } = await supabase
          .from("services")
          .insert(servicesToInsert as any);

        if (servicesError) {
          console.error("Services creation error:", servicesError);
        }
      }

      // Create food order settings for food mode
      if (isFoodMode) {
        // Create food order settings
        const { error: foodSettingsError } = await supabase
          .from("food_order_settings")
          .insert({
            tenant_id: tenantId,
            accepts_pickup: foodSetup.acceptsPickup,
            accepts_delivery: foodSetup.acceptsDelivery,
            accepts_dine_in: foodSetup.acceptsDineIn,
            delivery_radius_miles: foodSetup.deliveryRadius,
            delivery_minimum_cents: foodSetup.deliveryMinimumCents,
            estimated_prep_minutes: foodSetup.estimatedPrepMinutes,
            accepts_catering: foodSetup.acceptsCatering,
            catering_min_guests: foodSetup.cateringMinGuests,
            catering_lead_days: foodSetup.cateringLeadDays,
            order_confirmation_mode: "auto_confirm",
          });

        if (foodSettingsError) {
          console.error("Food order settings creation error:", foodSettingsError);
        }

        // Save busyness/ETA rules for food mode
        const busynessRules = {
          base_buffer_minutes: foodSetup.estimatedPrepMinutes,
          busy_buffer_minutes: foodSetup.busyBufferMinutes,
          delivery_window_min: foodSetup.deliveryWindowMin,
          delivery_window_max: foodSetup.deliveryWindowMax,
          manual_busyness_pct: 50, // Default to medium
          use_queue_metrics: false,
          low: {
            busynessLevel: "low",
            etaMultiplier: 1.0,
          },
          medium: {
            busynessLevel: "medium",
            etaMultiplier: 1.3,
          },
          high: {
            busynessLevel: "high",
            etaMultiplier: 1.8,
          },
        };

        const { error: busynessError } = await supabase
          .from("tenants")
          .update({ busyness_rules_jsonb: busynessRules } as any)
          .eq("id", tenantId);

        if (busynessError) {
          console.error("Busyness rules save error:", busynessError);
        }
      }

      // Create FAQs
      const faqsToInsert = faqs
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

      // Create objection responses
      const objectionsToInsert = objections
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

      // Create default automations
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

      // Get the selected plan from sessionStorage (set during signup)
      const selectedPlan = sessionStorage.getItem("selectedPlan") as PlanCode | null;
      const planCode: PlanCode = selectedPlan || "voice"; // Default to voice if somehow missing

      // Create subscription with trialing status
      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          tenant_id: tenantId,
          plan_code: planCode,
          status: "trialing",
          current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 day trial
        });

      if (subError) {
        console.error("Subscription creation error:", subError);
        throw new Error("Failed to activate trial");
      }

      // Initialize assistant settings based on plan
      const { error: settingsError } = await supabase.rpc("initialize_assistant_settings", {
        _tenant_id: tenantId,
        _plan_code: planCode,
      });

      if (settingsError) {
        console.error("Assistant settings error:", settingsError);
      }

      // Provision Twilio number for voice/both plans (supports both legacy and SKU-based codes)
      // hasVoiceFeature handles both legacy codes ("voice", "both") and SKU-based codes ("voice-200", "both-200-500")
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
            console.log("TwilioProvision: success", {
              phone_e164: provisionData.phone_number,
              twilio_sid: provisionData.phone_sid
            });
          } else {
            console.error("TwilioProvision: failed", { error: provisionData?.error });
          }
        } catch (provErr: any) {
          console.error("TwilioProvision: exception", { message: provErr?.message });
          // Don't fail onboarding if provisioning fails - it can be retried later
        }
      } else {
        console.log("TwilioProvision: skipped", { reason: "no-voice-feature", planCode });
      }

      // Auto-create default workflows based on business mode (from industry config)
      try {
        const industryEntry = getIndustryBySlug(industrySlug);
        const workflowBusinessMode = industryEntry?.businessMode || "service";
        console.log("WorkflowsAutoCreate: start", { tenantId, businessMode: workflowBusinessMode });

        const { success, workflowIds, error: workflowError } = await createDefaultWorkflowsForMode(
          tenantId,
          workflowBusinessMode as any
        );

        if (success) {
          console.log("WorkflowsAutoCreate: success", { workflowCount: workflowIds.length });
        } else {
          console.error("WorkflowsAutoCreate: failed", { error: workflowError });
        }
      } catch (wfErr: any) {
        console.error("WorkflowsAutoCreate: exception", { message: wfErr?.message });
        // Don't fail onboarding if workflow creation fails
      }

      // Mark onboarding as complete
      await supabase
        .from("tenants")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", tenantId);

      // Clear the stored plan
      sessionStorage.removeItem("selectedPlan");

      // Wait for tenant data refresh to complete before navigating
      await refreshTenant();

      // Small delay to ensure auth context has updated state
      await new Promise(resolve => setTimeout(resolve, 100));

      // Show completion screen
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
        <div className="lg:hidden p-4 border-b bg-card">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Step {step} of {totalSteps}: {currentStepInfo?.title}
          </p>
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
                  <OnboardingComplete businessName={businessBasics.businessName} />
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
                  {/* Step 1: Business Mode */}
                  {step === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight">
                          What type of business do you run?
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                          This helps us configure the right features for you.
                        </p>
                      </div>
                      <BusinessModeSelector value={businessMode} onChange={setBusinessMode} />
                    </div>
                  )}

                  {/* Step 2: Industry */}
                  {step === 2 && (
                    <IndustrySelectorGrid
                      value={industrySlug}
                      onChange={(slug) => setIndustrySlug(slug)}
                    />
                  )}

                  {/* Step 3: Modules */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight">
                          What features do you need?
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                          Select the capabilities you want for your AI receptionist.
                        </p>
                      </div>
                      <ModuleSelector
                        businessMode={businessMode}
                        enabledModules={enabledModules}
                        onChange={setEnabledModules}
                      />
                    </div>
                  )}

                  {/* Step 4: Business Basics */}
                  {step === 4 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight">
                          Tell us about your business
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                          This information helps your AI answer customer questions.
                        </p>
                      </div>
                      <BusinessBasicsForm data={businessBasics} onChange={setBusinessBasics} />
                    </div>
                  )}

                  {/* Step 5: Offerings */}
                  {step === 5 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight">
                          {businessMode === "food" ? "Food & Ordering Setup" : "Your Services"}
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                          {businessMode === "food"
                            ? "Configure how customers can order from you."
                            : "Add the services you offer. These will be pre-filled from your industry template."}
                        </p>
                        {industrySlug && industrySlug !== "other" && (
                          <p className="mt-1 text-sm text-primary">
                            Template: {resolveIndustryTemplate(industrySlug).label}
                          </p>
                        )}
                      </div>
                      {businessMode === "food" ? (
                        <FoodSetupEditor data={foodSetup} onChange={setFoodSetup} />
                      ) : (
                        <ServiceEditorAdvanced
                          services={services}
                          onChange={setServices}
                          modeContract={getModeContract(businessMode)}
                        />
                      )}
                    </div>
                  )}

                  {/* Step 6: Policies & FAQs */}
                  {step === 6 && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight">
                          Policies & Common Questions
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                          Help your AI answer questions about your business rules.
                        </p>
                      </div>

                      {/* Policies */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">Business Policies</h3>
                        <PoliciesEditor data={policies} onChange={setPolicies} />
                      </div>

                      {/* FAQs */}
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-sm font-medium">Common Questions (FAQs)</h3>
                        <FAQEditor faqs={faqs} onChange={setFaqs} />
                      </div>

                      {/* Objections */}
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-sm font-medium">Objection Handling</h3>
                        <ObjectionEditor objections={objections} onChange={setObjections} />
                      </div>

                      {/* AI Note */}
                      <div className="p-4 rounded-lg border bg-primary/5">
                        <div className="flex items-start gap-3">
                          <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Your AI is trained on all of this!</p>
                            <p className="text-[13px] text-muted-foreground mt-1">
                              You can always update this later from the Business Brain.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
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
