import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, Clock, Calendar, MessageCircle, ShieldQuestion, 
  FileText, CheckCircle2, Loader2, ArrowRight, ArrowLeft, 
  Users, Sparkles, Edit2
} from "lucide-react";
import { industryConfigs, ExtendedIndustryType } from "@/data/industryTemplates";
import BusinessIdentityForm, { BusinessIdentity } from "@/components/onboarding/BusinessIdentityForm";
import ServiceEditorAdvanced, { AdvancedService } from "@/components/onboarding/ServiceEditorAdvanced";
import BookingPoliciesEditor, { BookingPolicies } from "@/components/onboarding/BookingPoliciesEditor";
import CustomerIntakeEditor, { IntakeQuestion } from "@/components/onboarding/CustomerIntakeEditor";
import FAQEditor, { FAQ } from "@/components/onboarding/FAQEditor";
import ObjectionEditor, { ObjectionResponse } from "@/components/onboarding/ObjectionEditor";
import PoliciesEditor, { BusinessPolicies } from "@/components/onboarding/PoliciesEditor";
import { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
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
  { icon: Building2, title: "Business Identity", description: "Tell us about your business" },
  { icon: Clock, title: "Services & Pricing", description: "What services do you offer?" },
  { icon: Calendar, title: "Availability", description: "When can customers book?" },
  { icon: Users, title: "Customer Intake", description: "What info do you need?" },
  { icon: MessageCircle, title: "FAQs", description: "Common questions customers ask" },
  { icon: ShieldQuestion, title: "Objection Handling", description: "How to overcome hesitation" },
  { icon: FileText, title: "Policies", description: "Your business rules" },
  { icon: CheckCircle2, title: "Review & Launch", description: "You're ready to go!" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Business Identity
  const [businessIdentity, setBusinessIdentity] = useState<BusinessIdentity>({
    businessName: "",
    tagline: "",
    industry: "detailing",
    customIndustry: "",
    phoneNumber: "",
    websiteUrl: "",
    address: "",
    yearsInBusiness: null,
    timezone: "America/New_York",
  });
  
  // Step 2: Services
  const [services, setServices] = useState<AdvancedService[]>([]);
  
  // Step 3: Booking Policies
  const [bookingPolicies, setBookingPolicies] = useState<BookingPolicies>({
    businessHours: defaultBusinessHours,
    minLeadHours: 24,
    maxAdvanceDays: 30,
    appointmentBufferMinutes: 15,
  });
  
  // Step 4: Customer Intake Questions
  const [intakeQuestions, setIntakeQuestions] = useState<IntakeQuestion[]>([]);
  
  // Step 5: FAQs
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  
  // Step 6: Objection Handling
  const [objections, setObjections] = useState<ObjectionResponse[]>([]);
  
  // Step 7: Business Policies
  const [policies, setPolicies] = useState<BusinessPolicies>({
    cancellationPolicy: "",
    depositPolicy: "",
    refundPolicy: "",
    paymentMethods: ["cash", "card"],
    aiNeverPromise: [],
  });

  const { user, refreshTenant } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalSteps = 8;
  const progress = (step / totalSteps) * 100;

  // Initialize data when industry changes
  useEffect(() => {
    const config = industryConfigs[businessIdentity.industry];
    
    // Update services
    setServices(config.services.map(s => ({
      ...s,
      description: s.description || "",
      preparationInstructions: "",
      upsellSuggestions: [],
      depositRequired: false,
    })));
    
    // Update intake questions
    setIntakeQuestions(config.contextFields.map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
      options: f.options,
      required: f.required,
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
  }, [businessIdentity.industry]);

  // Validation
  const canProceedStep1 = businessIdentity.businessName.trim().length > 0 && 
    businessIdentity.phoneNumber.trim().length > 0 &&
    (businessIdentity.industry !== "other" || businessIdentity.customIndustry.trim().length > 0);
  
  const canProceedStep2 = services.length > 0 && 
    services.every(s => s.name.trim().length > 0);

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
      // Create tenant with all the collected data
      const tenantData = {
        name: businessIdentity.businessName,
        tagline: businessIdentity.tagline || null,
        industry: businessIdentity.industry as any,
        custom_industry: businessIdentity.industry === "other" ? businessIdentity.customIndustry : null,
        phone_public: businessIdentity.phoneNumber,
        website_url: businessIdentity.websiteUrl || null,
        address: businessIdentity.address || null,
        years_in_business: businessIdentity.yearsInBusiness,
        timezone: businessIdentity.timezone,
        hours_json: bookingPolicies.businessHours as any,
        context_fields_json: intakeQuestions as any,
        min_lead_hours: bookingPolicies.minLeadHours,
        max_advance_days: bookingPolicies.maxAdvanceDays,
        appointment_buffer_minutes: bookingPolicies.appointmentBufferMinutes,
        cancellation_policy: policies.cancellationPolicy || null,
        deposit_policy: policies.depositPolicy || null,
        refund_policy: policies.refundPolicy || null,
        payment_methods: policies.paymentMethods,
        ai_never_promise: policies.aiNeverPromise,
        ai_enabled: false,
      };

      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert(tenantData as any)
        .select()
        .single();

      if (tenantError) {
        console.error("Tenant creation error:", tenantError);
        throw new Error(tenantError.message || "Failed to create business profile");
      }

      if (!tenant) {
        throw new Error("Failed to create business profile - no data returned");
      }

      // Create tenant user
      const { error: tuError } = await supabase
        .from("tenant_users")
        .insert({
          tenant_id: tenant.id,
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
          tenant_id: tenant.id,
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

      // Create FAQs
      const faqsToInsert = faqs
        .filter(f => f.question.trim().length > 0 && f.answer.trim().length > 0)
        .map((faq, index) => ({
          tenant_id: tenant.id,
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
          tenant_id: tenant.id,
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
          tenant_id: tenant.id,
          name: "Missed Call Follow-up",
          trigger: "missed_call" as const,
          is_enabled: true,
          steps_json: [
            { type: "send_message", body: "Hi! We noticed we missed your call. How can we help you today?" },
          ],
        },
        {
          tenant_id: tenant.id,
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
          tenant_id: tenant.id,
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
        _tenant_id: tenant.id,
        _plan_code: planCode,
      });

      if (settingsError) {
        console.error("Assistant settings error:", settingsError);
      }

      // Mark onboarding as complete
      await supabase
        .from("tenants")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", tenant.id);

      // Clear the stored plan
      sessionStorage.removeItem("selectedPlan");

      await refreshTenant();

      toast({
        title: "You're all set! 🎉",
        description: "Your 7-day free trial has started. Complete the setup checklist to go live.",
      });

      // Redirect directly to dashboard
      navigate("/app/dashboard");
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
            {/* Step 1: Business Identity */}
            {step === 1 && (
              <>
                <BusinessIdentityForm 
                  data={businessIdentity} 
                  onChange={setBusinessIdentity} 
                />
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

            {/* Step 2: Services */}
            {step === 2 && (
              <>
                <ServiceEditorAdvanced services={services} onChange={setServices} />
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

            {/* Step 3: Booking Policies */}
            {step === 3 && (
              <>
                <BookingPoliciesEditor data={bookingPolicies} onChange={setBookingPolicies} />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(4)}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 4: Customer Intake */}
            {step === 4 && (
              <>
                <CustomerIntakeEditor questions={intakeQuestions} onChange={setIntakeQuestions} />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(5)}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 5: FAQs */}
            {step === 5 && (
              <>
                <FAQEditor faqs={faqs} onChange={setFaqs} />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(4)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(6)}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 6: Objection Handling */}
            {step === 6 && (
              <>
                <ObjectionEditor objections={objections} onChange={setObjections} />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(5)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(7)}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 7: Policies */}
            {step === 7 && (
              <>
                <PoliciesEditor data={policies} onChange={setPolicies} />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(6)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(8)}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 8: Review & Launch */}
            {step === 8 && (
              <>
                <div className="space-y-4">
                  {/* Summary sections */}
                  <div className="space-y-3">
                    <ReviewSection
                      icon={Building2}
                      title="Business"
                      value={businessIdentity.businessName}
                      subtitle={industryConfigs[businessIdentity.industry].label}
                      onEdit={() => goToStep(1)}
                    />
                    <ReviewSection
                      icon={Clock}
                      title="Services"
                      value={`${services.filter(s => s.name.trim()).length} services`}
                      onEdit={() => goToStep(2)}
                    />
                    <ReviewSection
                      icon={Calendar}
                      title="Availability"
                      value={`${bookingPolicies.minLeadHours}h notice • ${bookingPolicies.maxAdvanceDays} days advance`}
                      onEdit={() => goToStep(3)}
                    />
                    <ReviewSection
                      icon={Users}
                      title="Intake Questions"
                      value={`${intakeQuestions.length} questions`}
                      onEdit={() => goToStep(4)}
                    />
                    <ReviewSection
                      icon={MessageCircle}
                      title="FAQs"
                      value={`${faqs.filter(f => f.question && f.answer).length} answers ready`}
                      onEdit={() => goToStep(5)}
                    />
                    <ReviewSection
                      icon={ShieldQuestion}
                      title="Objection Handlers"
                      value={`${objections.filter(o => o.objection && o.response).length} responses`}
                      onEdit={() => goToStep(6)}
                    />
                    <ReviewSection
                      icon={FileText}
                      title="Policies"
                      value={`${policies.paymentMethods.length} payment methods`}
                      onEdit={() => goToStep(7)}
                    />
                  </div>

                  {/* AI Upsell */}
                  <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">AI Voice Assistant</p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Your AI is now trained on your business! Enable voice calls to let AI answer 24/7.
                        </p>
                        <span className="text-xs font-medium text-primary">Available in Settings →</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(7)}>
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

function ReviewSection({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  onEdit 
}: { 
  icon: React.ElementType; 
  title: string; 
  value: string; 
  subtitle?: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            {value}
            {subtitle && ` • ${subtitle}`}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
