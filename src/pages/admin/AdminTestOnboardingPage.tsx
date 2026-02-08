import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminMode } from "@/contexts/AdminModeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Clock, FileText, Loader2,
  ChevronRight, ChevronLeft, Sparkles, Wrench, Sliders,
  FlaskConical, ArrowLeft, CheckCircle2
} from "lucide-react";
import { createDefaultWorkflowsForMode } from "@/lib/createDefaultWorkflows";
import { getIndustryBySlug } from "@/data/industryCatalog";
import { resolveIndustryTemplate } from "@/lib/templateResolver";
import { BusinessModeSelector, type BusinessMode, getDefaultModulesForMode } from "@/components/onboarding/BusinessModeSelector";
import { ModuleSelector } from "@/components/onboarding/ModuleSelector";
import BusinessBasicsForm, { BusinessBasicsData, validateBusinessBasics } from "@/components/onboarding/BusinessBasicsForm";
import ServiceEditorAdvanced, { AdvancedService } from "@/components/onboarding/ServiceEditorAdvanced";
import FAQEditor, { FAQ } from "@/components/onboarding/FAQEditor";
import ObjectionEditor, { ObjectionResponse } from "@/components/onboarding/ObjectionEditor";
import PoliciesEditor, { BusinessPolicies } from "@/components/onboarding/PoliciesEditor";
import { FoodSetupEditor, FoodSetupData } from "@/components/onboarding/FoodSetupEditor";
import { DispatchSetupEditor, DispatchSetupData } from "@/components/onboarding/DispatchSetupEditor";
import { MedicalSetupEditor, MedicalSetupData } from "@/components/onboarding/MedicalSetupEditor";
import { formatErrorForToast } from "@/lib/errorMessages";
import { OnboardingProgress, type OnboardingStep } from "@/components/onboarding/OnboardingProgress";
import { IndustrySelectorGrid } from "@/components/onboarding/IndustrySelectorGrid";
import { cn } from "@/lib/utils";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/hoursUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IndustryCatalogEntry } from "@/data/industryCatalog";

const defaultBusinessHours = DEFAULT_BUSINESS_HOURS;

const steps: OnboardingStep[] = [
  { id: "mode", icon: Wrench, title: "Business Mode", description: "What type of business are you?" },
  { id: "industry", icon: Building2, title: "Industry", description: "Choose your industry for smart defaults" },
  { id: "features", icon: Sliders, title: "Features", description: "Select which modules to enable" },
  { id: "basics", icon: Clock, title: "Business Info", description: "Name, phone, and hours" },
  { id: "offerings", icon: Sparkles, title: "Offerings", description: "Your services or menu" },
  { id: "policies", icon: FileText, title: "Policies & FAQs", description: "Business rules and common questions" },
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

  // Step 1: Business Mode
  const [businessMode, setBusinessMode] = useState<BusinessMode>(initialMode);

  // Step 2: Industry
  const [industrySlug, setIndustrySlug] = useState("");

  // Step 3: Enabled Modules
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

  // Step 5: Food Setup
  const [foodSetup, setFoodSetup] = useState<FoodSetupData>({
    acceptsPickup: true,
    acceptsDelivery: false,
    acceptsDineIn: false,
    deliveryRadius: 5,
    deliveryMinimumCents: 1500,
    estimatedPrepMinutes: 15,
    busyBufferMinutes: 30,
    deliveryWindowMin: 20,
    deliveryWindowMax: 40,
    acceptsCatering: false,
    cateringMinGuests: 10,
    cateringLeadDays: 3,
    menuNotes: "",
  });

  // Step 5: Dispatch Setup
  const [dispatchSetup, setDispatchSetup] = useState<DispatchSetupData>({
    serviceRadius: 25,
    estimatedResponseMinutes: 30,
    requiresDropoff: true,
    jobTypes: [],
    crews: [],
    vehicles: [],
    dispatchNotes: "",
    hasImpoundLot: false,
    impoundLotAddress: "",
    impoundBaseFee: 150,
    impoundDailyStorageFee: 35,
    impoundAdminFee: 75,
    impoundGateFee: 0,
    impoundReleaseNotes: "",
  });

  // Step 5: Medical Setup
  const [medicalSetup, setMedicalSetup] = useState<MedicalSetupData>({
    requireVerbalConsent: true,
    storeTranscripts: false,
    storeRecordings: false,
    retentionDays: 30,
    urgentEscalationNumber: "",
    intakeTypes: ["appointment_request"],
    schedulingNotes: "",
    hipaaAcknowledged: false,
  });

  // Step 6: Policies
  const [policies, setPolicies] = useState<BusinessPolicies>({
    cancellationPolicy: "",
    depositPolicy: "",
    refundPolicy: "",
    paymentMethods: ["cash", "card"],
    aiNeverPromise: [],
  });

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

  // When industry changes, apply template
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
    console.log(`[AdminTestOnboarding] Loading template for industry: ${industrySlug}`, config.label);

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

  // When mode changes, update default modules if industry hasn't set them
  useEffect(() => {
    if (!industrySlug) {
      setEnabledModules(getDefaultModulesForMode(businessMode));
    }
  }, [businessMode, industrySlug]);

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!businessMode;
      case 2: return !!industrySlug;
      case 3: return enabledModules.length > 0;
      case 4: return validateBusinessBasics(businessBasics);
      case 5: 
        if (businessMode === "food") {
          return foodSetup.acceptsPickup || foodSetup.acceptsDelivery || foodSetup.acceptsDineIn;
        } else if (businessMode === "dispatch") {
          return dispatchSetup.serviceRadius > 0;
        } else if (businessMode === "medical") {
          return medicalSetup.hipaaAcknowledged === true;
        } else {
          return services.length > 0 && services.every(s => s.name.trim().length > 0);
        }
      case 6: return true;
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

  // Handle industry selection
  const handleIndustryChange = (slug: string, industry: IndustryCatalogEntry) => {
    setIndustrySlug(slug);
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Step 1: Create the test tenant via edge function
      const { data: createResult, error: createError } = await supabase.functions.invoke(
        "create-tenant",
        {
          body: {
            name: businessBasics.businessName.trim(),
            business_mode: businessMode,
            timezone: businessBasics.timezone,
            enabled_modules: enabledModules,
            hipaa_mode: businessMode === "medical",
            tagline: businessBasics.tagline || null,
            address: businessBasics.address || null,
            hours_json: businessBasics.hoursJson || null,
            industry: industrySlug || "general",
          },
        }
      );

      if (createError) throw new Error(createError.message);
      if (createResult?.error) throw new Error(createResult.error);

      const tenantId = createResult.tenant_id;
      if (!tenantId) throw new Error("No tenant ID returned");

      setTestTenantName(businessBasics.businessName);

      // Create assistant_settings
      await supabase
        .from("assistant_settings")
        .insert({
          tenant_id: tenantId,
          voice_ai_enabled: true,
          instant_text_enabled: true,
        });

      // Save services for service/general/medical modes
      if (services.length > 0 && (businessMode === "service" || businessMode === "general" || businessMode === "medical")) {
        const serviceRows = services.map((s, idx) => ({
          tenant_id: tenantId,
          name: s.name,
          description: s.description || "",
          duration_minutes: s.duration,
          price_amount: s.price,
          price_type: s.priceType,
          is_active: true,
        }));
        await supabase.from("services").insert(serviceRows);
      }

      // Save FAQs
      if (faqs.length > 0) {
        const faqRows = faqs.map((f, idx) => ({
          tenant_id: tenantId,
          question: f.question,
          answer: f.answer,
          priority_weight: idx + 1,
        }));
        await supabase.from("business_faqs").insert(faqRows);
      }

      // Save policies
      await supabase.from("tenants").update({
        cancellation_policy: policies.cancellationPolicy || null,
        deposit_policy: policies.depositPolicy || null,
        refund_policy: policies.refundPolicy || null,
        payment_methods: policies.paymentMethods,
        ai_never_promise: policies.aiNeverPromise,
      }).eq("id", tenantId);

      // Food mode saves
      if (businessMode === "food") {
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
          manual_busyness_pct: 50,
          use_queue_metrics: false,
        };

        await supabase
          .from("tenants")
          .update({ busyness_rules_jsonb: busynessRules } as any)
          .eq("id", tenantId);

        // Save food menu items from quick-add
        if (foodSetup.quickMenuItems && foodSetup.quickMenuItems.length > 0) {
          const menuItemsToInsert = foodSetup.quickMenuItems.map((item, index) => ({
            tenant_id: tenantId,
            name: item.name,
            price_cents: Math.round(item.price * 100),
            category: item.category,
            is_available: true,
            sort_order: index,
          }));

          await supabase.from("menu_items").insert(menuItemsToInsert);
        }
      }

      // Dispatch mode saves
      if (businessMode === "dispatch") {
        // Create dispatch services from job types
        if (dispatchSetup.jobTypes && dispatchSetup.jobTypes.length > 0) {
          const dispatchServicesToInsert = dispatchSetup.jobTypes.map((jobType) => ({
            tenant_id: tenantId,
            name: jobType,
            description: `${jobType} service`,
            duration_minutes: dispatchSetup.estimatedResponseMinutes,
            price_amount: 0,
            price_type: "quote_only" as const,
            is_active: true,
          }));

          await supabase.from("services").insert(dispatchServicesToInsert);
        }

        // Save impound lot data if configured
        if (dispatchSetup.hasImpoundLot) {
          await supabase.from("impound_lots").insert({
            tenant_id: tenantId,
            name: "Main Lot",
            address: dispatchSetup.impoundLotAddress || null,
            is_active: true,
          });

          await supabase.from("impound_settings").insert({
            tenant_id: tenantId,
            impound_handling_enabled: true,
            base_tow_fee_cents: Math.round((dispatchSetup.impoundBaseFee || 150) * 100),
            daily_storage_cents: Math.round((dispatchSetup.impoundDailyStorageFee || 35) * 100),
            admin_fee_cents: Math.round((dispatchSetup.impoundAdminFee || 75) * 100),
            gate_fee_cents: Math.round((dispatchSetup.impoundGateFee || 0) * 100),
            default_release_requirements: ["Valid ID", "Registration or Title", "Payment"],
          });
        }
      }

      // Medical mode saves
      if (businessMode === "medical") {
        await supabase.from("medical_settings").upsert({
          tenant_id: tenantId,
          require_verbal_consent: medicalSetup.requireVerbalConsent,
          store_transcripts: medicalSetup.storeTranscripts,
          store_recordings: medicalSetup.storeRecordings,
          retention_days: medicalSetup.retentionDays,
          urgent_escalation_number: medicalSetup.urgentEscalationNumber || null,
          intake_types: medicalSetup.intakeTypes,
          scheduling_notes: medicalSetup.schedulingNotes || null,
        }, { onConflict: "tenant_id" });
      }

      // Create default workflows
      await createDefaultWorkflowsForMode(tenantId, businessMode);

      // Set as active tenant for testing
      await setActiveTenantId(tenantId);

      // Update admin mode to match
      if (adminModeContext) {
        await adminModeContext.setSelectedMode(businessMode);
      }

      setIsComplete(true);
      
      toast({
        title: "Test tenant created!",
        description: `${businessBasics.businessName} is ready for testing.`,
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

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <BusinessModeSelector
            value={businessMode}
            onChange={setBusinessMode}
          />
        );

      case 2:
        return (
          <IndustrySelectorGrid
            value={industrySlug}
            onChange={handleIndustryChange}
          />
        );

      case 3:
        return (
          <ModuleSelector
            businessMode={businessMode}
            enabledModules={enabledModules}
            onChange={setEnabledModules}
          />
        );

      case 4:
        return (
          <BusinessBasicsForm
            data={businessBasics}
            onChange={setBusinessBasics}
          />
        );

      case 5:
        if (businessMode === "food") {
          return (
            <FoodSetupEditor
              data={foodSetup}
              onChange={setFoodSetup}
            />
          );
        }
        if (businessMode === "dispatch") {
          return (
            <DispatchSetupEditor
              data={dispatchSetup}
              onChange={setDispatchSetup}
            />
          );
        }
        if (businessMode === "medical") {
          return (
            <MedicalSetupEditor
              data={medicalSetup}
              onChange={setMedicalSetup}
            />
          );
        }
        return (
          <div className="space-y-6">
            <ServiceEditorAdvanced
              services={services}
              onChange={setServices}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-8">
            <PoliciesEditor
              data={policies}
              onChange={setPolicies}
            />
            <FAQEditor
              faqs={faqs}
              onChange={setFaqs}
            />
            <ObjectionEditor
              objections={objections}
              onChange={setObjections}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = steps[step - 1];
  const StepIcon = currentStepData.icon;

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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {StepIcon && <StepIcon className="h-5 w-5 text-primary" />}
                  {currentStepData.title}
                </CardTitle>
                <p className="text-muted-foreground">{currentStepData.description}</p>
              </CardHeader>
              <CardContent>
                {renderStepContent()}
              </CardContent>
            </Card>
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
              disabled={!canProceed() || loading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed() || loading}
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
