import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, CheckCircle2, Loader2,
  ChevronRight, ChevronLeft, Sparkles, Sliders,
  HelpCircle, FlaskConical, ArrowLeft
} from "lucide-react";
import { createDefaultWorkflowsForMode } from "@/lib/createDefaultWorkflows";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { resolveIndustryTemplate } from "@/lib/templateResolver";
import { BusinessModeSelector, type BusinessMode, getDefaultModulesForMode } from "@/components/onboarding/BusinessModeSelector";
import { ScenarioDiscovery } from "@/components/onboarding/ScenarioDiscovery";
import { CommunicationPreferences, getDefaultCommunicationPrefs, type CommunicationPrefs } from "@/components/onboarding/CommunicationPreferences";
import { ConfirmationSummary } from "@/components/onboarding/ConfirmationSummary";
import { formatErrorForToast } from "@/lib/errorMessages";
import { OnboardingProgress, type OnboardingStep } from "@/components/onboarding/OnboardingProgress";
import { IndustrySelectorGrid } from "@/components/onboarding/IndustrySelectorGrid";
import { updateCapabilityFlags } from "@/hooks/useBusinessCapabilities";
import { getQuestionsForMode, getDefaultAnswers, deriveModulesFromScenario } from "@/lib/scenarioQuestions";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/hoursUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps: OnboardingStep[] = [
  { id: "identity", icon: Building2, title: "Identity", description: "Name your business" },
  { id: "industry", icon: Sparkles, title: "Industry", description: "Choose your industry" },
  { id: "scenarios", icon: HelpCircle, title: "Discovery", description: "How you operate" },
  { id: "communication", icon: Sliders, title: "Communication", description: "AI behavior" },
  { id: "confirm", icon: CheckCircle2, title: "Confirm", description: "Review and apply" },
];

export default function AdminTestOnboardingPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") as BusinessMode || "service";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [testTenantName, setTestTenantName] = useState<string>("");

  // Track if industry template has been initialized
  const initializedIndustryRef = useRef<string | null>(null);

  // Step 1: Identity
  const [businessName, setBusinessName] = useState("");
  const [businessMode, setBusinessMode] = useState<BusinessMode>(initialMode);

  // Step 2: Industry
  const [industrySlug, setIndustrySlug] = useState("");

  // Modules (derived from industry + scenario answers)
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const baseModulesRef = useRef<string[]>([]);

  // Step 3: Scenario Discovery
  const [scenarioAnswers, setScenarioAnswers] = useState<Record<string, boolean>>({});

  // Step 4: Communication Preferences
  const [communicationPrefs, setCommunicationPrefs] = useState<CommunicationPrefs>(
    getDefaultCommunicationPrefs(initialMode)
  );

  const { user, isSuperAdmin, setActiveTenantId } = useAuth();
  const adminModeContext = useAdminMode();
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalSteps = steps.length;
  const progress = (step / totalSteps) * 100;

  // Redirect if not super admin
  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/admin/overview");
    }
  }, [isSuperAdmin, navigate]);

  // Initialize data when industry changes
  useEffect(() => {
    if (!industrySlug) return;
    if (initializedIndustryRef.current === industrySlug) return;

    const industryEntry = getIndustryBySlug(industrySlug);

    // Auto-update business_mode from industry
    if (industryEntry?.businessMode) {
      setBusinessMode(industryEntry.businessMode);
      setCommunicationPrefs(getDefaultCommunicationPrefs(industryEntry.businessMode));
      setScenarioAnswers(getDefaultAnswers(industryEntry.businessMode));
    }

    // Auto-update enabled_modules from industry
    const modules = industryEntry?.enabledModules ?? getDefaultModulesForMode(businessMode);
    setEnabledModules(modules);
    baseModulesRef.current = modules;

    console.log(`[AdminTestOnboarding] Loading template for industry: ${industrySlug}`);

    // Mark this industry as initialized
    initializedIndustryRef.current = industrySlug;
  }, [industrySlug, businessMode]);

  // When scenario answers change, derive modules
  useEffect(() => {
    if (Object.keys(scenarioAnswers).length === 0) return;
    const questions = getQuestionsForMode(businessMode);
    const derived = deriveModulesFromScenario(baseModulesRef.current, scenarioAnswers, questions);
    setEnabledModules(derived);
  }, [scenarioAnswers, businessMode]);

  // When business mode changes (from Step 1 manual selection), reset scenario + comm prefs
  const handleBusinessModeChange = (mode: BusinessMode) => {
    setBusinessMode(mode);
    setScenarioAnswers(getDefaultAnswers(mode));
    setCommunicationPrefs(getDefaultCommunicationPrefs(mode));
  };

  // Step validation
  const canProceed = (stepNum: number) => {
    switch (stepNum) {
      case 1: return businessName.trim().length > 0 && businessMode.length > 0;
      case 2: return industrySlug.length > 0;
      case 3: {
        if (businessMode === "medical") {
          return scenarioAnswers.requiresHIPAA === true;
        }
        return true;
      }
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const isFoodMode = businessMode === "food" || enabledModules.includes("food_orders");
      const industryEntry = getIndustryBySlug(industrySlug);

      // Build capabilities_json from modules + scenario answers
      const capabilitiesJson: Record<string, boolean> = {};
      for (const mod of enabledModules) {
        capabilitiesJson[mod] = true;
      }
      for (const [key, val] of Object.entries(scenarioAnswers)) {
        capabilitiesJson[key] = val;
      }

      // 1. Create tenant via edge function
      const { data: createResult, error: createError } = await supabase.functions.invoke(
        "create-tenant",
        {
          body: {
            name: businessName.trim(),
            business_mode: businessMode,
            timezone: "America/New_York",
            hours_json: DEFAULT_BUSINESS_HOURS,
            industry: industrySlug || "general",
            enabled_modules: enabledModules,
            capabilities_json: capabilitiesJson,
            hipaa_mode: businessMode === "medical",
          },
        }
      );

      if (createError) throw new Error(createError.message);
      if (createResult?.error) throw new Error(createResult.error);

      const tenantId = createResult.tenant_id;
      if (!tenantId) throw new Error("No tenant ID returned");

      setTestTenantName(businessName);

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
          .insert(servicesToInsert as any);
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

      // 4. Create food order settings for food mode
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

      // 5. Create assistant settings and save communication prefs
      await supabase
        .from("assistant_settings")
        .insert({
          tenant_id: tenantId,
          voice_ai_enabled: true,
          instant_text_enabled: true,
          ai_booking_mode: communicationPrefs.aiBookingMode,
          missed_call_behavior: communicationPrefs.missedCallBehavior,
          unknown_question_behavior: communicationPrefs.unknownQuestionBehavior,
        });

      // 6. Create default automations
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

      // 7. Create default workflows
      const workflowBusinessMode = industryEntry?.businessMode || businessMode;
      await createDefaultWorkflowsForMode(tenantId, workflowBusinessMode as any);

      // 8. Admin-specific: Set as active tenant for testing
      await setActiveTenantId(tenantId);

      // Update admin mode to match
      if (adminModeContext) {
        await adminModeContext.setSelectedMode(businessMode);
      }

      setIsComplete(true);

      toast({
        title: "Test tenant created!",
        description: `${businessName} is ready for testing.`,
      });
    } catch (error: unknown) {
      console.error("Failed to create test tenant:", error);
      const errorInfo = formatErrorForToast(error);
      toast({
        ...errorInfo,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToAdmin = () => {
    navigate("/admin/overview");
  };

  const handleTestCall = () => {
    navigate("/admin/golden-path");
  };

  // Show completion screen
  if (isComplete) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-success/30 bg-success/5">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl">Test Tenant Created!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">{testTenantName}</p>
              <Badge variant="secondary" className="text-sm">
                {businessMode.charAt(0).toUpperCase() + businessMode.slice(1)} Mode
              </Badge>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Test this tenant by calling:</p>
              <p className="font-mono text-lg font-medium">+1 (855) 329-7357</p>
              <p className="text-xs text-muted-foreground">
                This tenant is now the active test tenant. All calls to the test line will route here.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={handleTestCall} className="w-full">
                <FlaskConical className="h-4 w-4 mr-2" />
                Go to Golden Path Testing
              </Button>
              <Button variant="outline" onClick={handleBackToAdmin} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin Overview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-background to-secondary/20">
      {/* Admin Context Banner */}
      <div className="bg-warning/10 border-b border-warning/30 px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">
              Admin Test Mode: Creating a new test tenant
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToAdmin}
            className="text-warning hover:text-warning hover:bg-warning/10"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <OnboardingProgress steps={steps} currentStep={step} />
          <Progress value={progress} className="mt-4 h-2" />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-[400px]"
          >
            {/* Step 1: Identity */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Identity
                  </CardTitle>
                  <p className="text-muted-foreground">Name your business and choose how it operates.</p>
                </CardHeader>
                <CardContent className="space-y-6">
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
                </CardContent>
              </Card>
            )}

            {/* Step 2: Industry */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Industry
                  </CardTitle>
                  <p className="text-muted-foreground">Choose your industry for smart defaults.</p>
                </CardHeader>
                <CardContent>
                  <IndustrySelectorGrid
                    value={industrySlug}
                    onChange={(slug) => setIndustrySlug(slug)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 3: Scenario Discovery */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    Discovery
                  </CardTitle>
                  <p className="text-muted-foreground">Tell us how your business operates.</p>
                </CardHeader>
                <CardContent>
                  <ScenarioDiscovery
                    businessMode={businessMode}
                    answers={scenarioAnswers}
                    onChange={setScenarioAnswers}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 4: Communication Preferences */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-primary" />
                    Communication
                  </CardTitle>
                  <p className="text-muted-foreground">Configure AI behavior.</p>
                </CardHeader>
                <CardContent>
                  <CommunicationPreferences
                    businessMode={businessMode}
                    value={communicationPrefs}
                    onChange={setCommunicationPrefs}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 5: Confirmation */}
            {step === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Confirm
                  </CardTitle>
                  <p className="text-muted-foreground">Review and create test tenant.</p>
                </CardHeader>
                <CardContent>
                  <ConfirmationSummary
                    businessName={businessName}
                    businessMode={businessMode}
                    industrySlug={industrySlug}
                    scenarioAnswers={scenarioAnswers}
                    communicationPrefs={communicationPrefs}
                  />
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed(step) || loading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed(step) || loading}
              className="bg-success hover:bg-success/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Test Tenant
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
