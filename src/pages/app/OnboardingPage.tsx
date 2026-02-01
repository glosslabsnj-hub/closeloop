import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Clock, MessageCircle, ShieldQuestion,
  FileText, CheckCircle2, Loader2, ArrowRight, ArrowLeft,
  Sparkles, Edit2, Brain, Wrench, Sliders
} from "lucide-react";
import { createDefaultWorkflowsForMode } from "@/lib/createDefaultWorkflows";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { resolveIndustryTemplate } from "@/lib/templateResolver";
import { getModeContract } from "@/lib/businessModeContract";
import { BusinessModeSelector, type BusinessMode, getDefaultModulesForMode } from "@/components/onboarding/BusinessModeSelector";
import IndustrySelector from "@/components/onboarding/IndustrySelector";
import { ModuleSelector } from "@/components/onboarding/ModuleSelector";
import BusinessBasicsForm, { BusinessBasicsData, validateBusinessBasics } from "@/components/onboarding/BusinessBasicsForm";
import ServiceEditorAdvanced, { AdvancedService } from "@/components/onboarding/ServiceEditorAdvanced";
import FAQEditor, { FAQ } from "@/components/onboarding/FAQEditor";
import ObjectionEditor, { ObjectionResponse } from "@/components/onboarding/ObjectionEditor";
import PoliciesEditor, { BusinessPolicies } from "@/components/onboarding/PoliciesEditor";
import { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import { AIKnowledgePreview } from "@/components/onboarding/AIKnowledgePreview";
import type { PlanCode } from "@/types/database";

const defaultBusinessHours: BusinessHours = {
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: "10:00", close: "14:00", closed: false },
  sunday: { open: "00:00", close: "00:00", closed: true },
};

const stepInfo = [
  { icon: Wrench, title: "Business Mode", description: "What type of business are you?" },
  { icon: Building2, title: "Industry", description: "Choose your industry for smart defaults" },
  { icon: Sliders, title: "Features", description: "Select which modules to enable" },
  { icon: Clock, title: "Business Basics", description: "Name, phone, hours" },
  { icon: Sparkles, title: "Offerings", description: "Your services or menu" },
  { icon: FileText, title: "Policies", description: "Your business rules" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

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

  const totalSteps = 6;
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

  // Validation
  const canProceedStep1 = businessMode.length > 0; // Always true
  const canProceedStep2 = industrySlug.length > 0;
  const canProceedStep3 = enabledModules.length > 0; // Always true
  const canProceedStep4 = validateBusinessBasics(businessBasics);
  const canProceedStep5 = services.length > 0 && services.every(s => s.name.trim().length > 0);
  const canProceedStep6 = true; // Policies optional

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
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
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
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
      // IMPORTANT (RLS): we cannot immediately `select()` the newly inserted tenant row
      // because the user isn't linked in `tenant_users` yet, so the tenants SELECT policy
      // would block the read. Generate the tenant id client-side and insert without RETURNING.
      const tenantId = globalThis.crypto?.randomUUID?.();
      if (!tenantId) {
        throw new Error("Unable to generate business id. Please refresh and try again.");
      }

      // Use business mode and enabled modules from state (selected in Steps 1-3)
      const isFoodMode = businessMode === "food" || enabledModules.includes("food_orders");
      const industryEntry = getIndustryBySlug(industrySlug);

      console.log("Onboarding: business mode determined", {
        industry: industrySlug,
        businessMode,
        enabledModules,
        isFoodMode
      });

      // Map new state structure to tenant database row
      const tenantData = {
        id: tenantId,
        // From Step 4: Business Basics
        name: businessBasics.businessName,
        tagline: businessBasics.tagline || null,
        phone_public: businessBasics.phoneNumber,
        address: businessBasics.address || null,
        timezone: businessBasics.timezone,
        hours_json: businessBasics.hoursJson as any,

        // From Steps 1-2: Business Mode & Industry
        business_mode: businessMode,
        industry: industrySlug as any,
        enabled_modules: enabledModules,

        // From Step 6: Policies
        cancellation_policy: policies.cancellationPolicy || null,
        deposit_policy: policies.depositPolicy || null,
        refund_policy: policies.refundPolicy || null,
        payment_methods: policies.paymentMethods,
        ai_never_promise: policies.aiNeverPromise,

        // Defaults for fields not collected in new flow
        custom_industry: null,
        website_url: null,
        years_in_business: null,
        context_fields_json: [] as any,
  

        // System fields
        ai_enabled: false,
       hipaa_mode: businessMode === "medical",

      };

      const { error: tenantError } = await supabase
        .from("tenants")
        .insert(tenantData as any);

      if (tenantError) {
        console.error("Tenant creation error:", tenantError);
        throw new Error(tenantError.message || "Failed to create business profile");
      }

      // Create tenant user
      const { error: tuError } = await supabase
        .from("tenant_users")
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          role: "owner",
        });

      if (tuError) {
        console.error("Tenant user creation error:", tuError);
        throw new Error(tuError.message || "Failed to link user to business");
      }

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
            accepts_pickup: true,
            accepts_delivery: true,
            accepts_dine_in: true,
            delivery_radius_miles: 5,
            delivery_minimum_cents: 1500,
            estimated_prep_minutes: 20,
            order_confirmation_mode: "auto_confirm",
          });

        if (foodSettingsError) {
          console.error("Food order settings creation error:", foodSettingsError);
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
        const industryEntry = getIndustryBySlug(businessIdentity.industry);
        const businessMode = industryEntry?.businessMode || "service";
        console.log("WorkflowsAutoCreate: start", { tenantId, businessMode });
        
        const { success, workflowIds, error: workflowError } = await createDefaultWorkflowsForMode(
          tenantId, 
          businessMode as any
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

      toast({
        title: "You're all set! 🎉",
        description: "Your 7-day free trial has started. Try your AI with suggested tests!",
      });

      // Redirect to simulator with suggested tests
      navigate("/app/simulator?suggested=true");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        variant: "destructive",
        title: "Error setting up business",
        description: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (targetStep: number) => {
    setStep(targetStep);
  };

  const StepIcon = stepInfo[step - 1].icon;

  return (
    <div className="min-h-screen bg-secondary/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Step {step} of {totalSteps}</span>
            <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-3">
            {stepInfo.map((info, index) => {
              const Icon = info.icon;
              const isActive = step === index + 1;
              const isComplete = step > index + 1;
              return (
                <button
                  key={index}
                  onClick={() => isComplete && goToStep(index + 1)}
                  disabled={!isComplete}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    isComplete ? 'cursor-pointer hover:text-primary' : ''
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : isComplete 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
              <StepIcon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{stepInfo[step - 1].title}</CardTitle>
            <CardDescription>{stepInfo[step - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Business Mode */}
            {step === 1 && (
              <>
                <BusinessModeSelector value={businessMode} onChange={setBusinessMode} />
                <Button
                  className="w-full"
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {/* Step 2: Industry */}
            {step === 2 && (
              <>
                <IndustrySelector
                  value={industrySlug}
                  onChange={(slug) => setIndustrySlug(slug)}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(3)} disabled={!canProceedStep2}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Modules */}
            {step === 3 && (
              <>
                <ModuleSelector
                  businessMode={businessMode}
                  enabledModules={enabledModules}
                  onChange={setEnabledModules}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(4)} disabled={!canProceedStep3}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 4: Business Basics */}
            {step === 4 && (
              <>
                <BusinessBasicsForm data={businessBasics} onChange={setBusinessBasics} />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(5)} disabled={!canProceedStep4}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 5: Offerings */}
            {step === 5 && (
              <>
                {industrySlug && (
                  <div className="text-sm text-muted-foreground mb-2">
                    Template: <span className="font-medium text-foreground">{resolveIndustryTemplate(industrySlug).label}</span>
                    <span className="ml-2 text-xs">(all fields are editable)</span>
                  </div>
                )}

                <ServiceEditorAdvanced
                  services={services}
                  onChange={setServices}
                  modeContract={getModeContract(businessMode)}
                />

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(4)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(6)} disabled={!canProceedStep5}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 6: Policies + FAQs + Objections + Review */}
            {step === 6 && (
              <>
                <div className="space-y-6">
                  {/* Policies section */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Business Policies</h3>
                    <PoliciesEditor data={policies} onChange={setPolicies} />
                  </div>

                  {/* FAQs section */}
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium mb-3">Common Questions (FAQs)</h3>
                    <FAQEditor faqs={faqs} onChange={setFaqs} />
                  </div>

                  {/* Objections section */}
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium mb-3">Objection Handling</h3>
                    <ObjectionEditor objections={objections} onChange={setObjections} />
                  </div>

                  {/* AI Knowledge Preview */}
                  <div className="border-t pt-6">
                    <AIKnowledgePreview
                      businessName={businessBasics.businessName}
                      services={services.filter(s => s.name.trim())}
                      faqs={faqs.filter(f => f.question && f.answer)}
                      objections={objections.filter(o => o.objection && o.response)}
                      policies={{
                        cancellationPolicy: policies.cancellationPolicy,
                        depositPolicy: policies.depositPolicy,
                      }}
                      businessHours={businessBasics.hoursJson}
                      intakeQuestions={[]}
                      aiNeverPromise={policies.aiNeverPromise}
                    />
                  </div>

                  {/* AI Readiness Note */}
                  <div className="p-4 rounded-lg border bg-primary/5">
                    <div className="flex items-start gap-3">
                      <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Your AI is trained on all of this!</p>
                        <p className="text-xs text-muted-foreground">
                          After setup, test your AI in the simulator with suggested prompts.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(5)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1" onClick={handleComplete} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Launch CloseLoop
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

