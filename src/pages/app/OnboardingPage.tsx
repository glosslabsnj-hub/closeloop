/**
 * OnboardingPage — 7-phase industry-aware onboarding flow.
 * Form state extracted to useOnboardingFormState, submission to useOnboardingSubmit.
 */
import { useState, useEffect } from "react";
import { StepNavigator } from "@/components/onboarding/StepNavigator";
import { useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, CheckCircle2, Loader2,
  ChevronRight, ChevronLeft,
  RefreshCw, Briefcase, Sparkles, Link2, Rocket,
  Settings2, Clock,
} from "lucide-react";
import { useOnboardingValidation } from "@/hooks/useOnboardingValidation";
import { useOnboardingProgress, ONBOARDING_PHASES } from "@/hooks/useOnboardingProgress";
import { useOnboardingFormState, clearOnboardingData } from "@/hooks/useOnboardingFormState";
import { useOnboardingSubmit } from "@/hooks/useOnboardingSubmit";
import { OnboardingComplete } from "@/components/onboarding/OnboardingComplete";
import { ResumeOnboardingModal } from "@/components/onboarding/ResumeOnboardingModal";
import { AutoSaveIndicator } from "@/components/onboarding/AutoSaveIndicator";
import { WebsiteQuickStart } from "@/components/onboarding/WebsiteQuickStart";
import { mapWebsiteImportToOnboarding } from "@/lib/mapWebsiteImportToOnboarding";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Phase sub-components
import { OnboardingIdentity } from "@/components/onboarding/phases/OnboardingIdentity";
import { OnboardingHowYouWork } from "@/components/onboarding/phases/OnboardingHowYouWork";
import { OnboardingOfferings } from "@/components/onboarding/phases/OnboardingOfferings";
import { OnboardingHoursArea } from "@/components/onboarding/phases/OnboardingHoursArea";
import { OnboardingAI } from "@/components/onboarding/phases/OnboardingAI";
import { OnboardingConnect } from "@/components/onboarding/phases/OnboardingConnect";
import { OnboardingReview } from "@/components/onboarding/phases/OnboardingReview";

/** Phase icons for sidebar — 7 phases */
const PHASE_ICONS = [Building2, Settings2, Briefcase, Clock, Sparkles, Link2, Rocket];

export default function OnboardingPage() {
  const { user, tenant, loading: authLoading } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    phase, currentPhase, progressPercent, totalPhases, totalMinutes,
    hasSavedProgress, goNext: progressGoNext, goBack: progressGoBack,
    goToPhase, resetProgress, clearProgress,
  } = useOnboardingProgress(userId);

  const form = useOnboardingFormState(userId);
  const submit = useOnboardingSubmit(userId);

  const { validateStep, getFieldError, clearErrors } = useOnboardingValidation();

  // Resume modal
  const [showResumeModal, setShowResumeModal] = useState(() => hasSavedProgress);
  const [resumeDecided, setResumeDecided] = useState(!hasSavedProgress);

  // Import conflict dialog
  const [showImportConflictDialog, setShowImportConflictDialog] = useState(false);
  const [pendingIndustrySlug, setPendingIndustrySlug] = useState("");

  const handleResume = () => { setShowResumeModal(false); setResumeDecided(true); };
  const handleStartFresh = () => {
    setShowResumeModal(false);
    setResumeDecided(true);
    clearOnboardingData(userId);
    resetProgress();
    form.resetFormState();
  };

  // Industry change handler that checks for import conflict
  const handleIndustryChange = (slug: string) => {
    if (form.websiteImportActive) {
      setPendingIndustrySlug(slug);
      setShowImportConflictDialog(true);
    } else {
      form.setIndustrySlug(slug);
    }
  };

  // Auto-save debounced
  useEffect(() => {
    return form.triggerAutoSave(submit.isComplete, resumeDecided);
  }, [phase, form.businessName, form.businessAddress, form.businessMode, form.industrySlug, form.workStyle,
    form.scenarioAnswers, form.scenarioDetails, form.schedulingPrefs, form.communicationPrefs,
    form.templateServices, form.templateFAQs, form.templatePolicies, form.serviceArea,
    form.businessDetails, form.businessHours, form.teamMembers, form.isSoloOperator,
    form.a2pData, form.aiTone, form.bookingMode, form.afterHours, form.customGreeting,
    form.notificationPhone, form.otherDescription, submit.isComplete, resumeDecided, userId]);

  // Redirect if already has tenant
  useEffect(() => {
    if (!authLoading && tenant) navigate("/app/dashboard", { replace: true });
  }, [authLoading, tenant, navigate]);

  // Phase validation
  const canProceed = (phaseNum: number) => {
    switch (phaseNum) {
      case 1: return form.businessName.trim().length > 0 && form.industrySlug.length > 0;
      case 2: return true; // work style + scenario questions are optional
      case 3: return form.templateServices.some(s => s.enabled && s.name.trim().length > 0);
      case 4: return true; // hours have defaults
      case 5: return true; // AI settings have defaults
      case 6: return true; // connect is optional
      case 7: return true; // review
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

  if (!user) return <Navigate to="/login" replace />;

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

  const buildSubmitParams = () => ({
    businessName: form.businessName,
    businessAddress: form.businessAddress,
    businessMode: form.businessMode,
    industrySlug: form.industrySlug,
    workStyle: form.workStyle,
    enabledModules: form.enabledModules,
    scenarioAnswers: form.scenarioAnswers,
    scenarioDetails: form.scenarioDetails,
    schedulingPrefs: form.schedulingPrefs,
    communicationPrefs: form.communicationPrefs,
    templateServices: form.templateServices,
    templateFAQs: form.templateFAQs,
    templatePolicies: form.templatePolicies,
    serviceArea: form.serviceArea,
    businessDetails: form.businessDetails,
    businessHours: form.businessHours as Record<string, unknown>,
    teamMembers: form.teamMembers,
    isSoloOperator: form.isSoloOperator,
    a2pData: form.a2pData,
    aiTone: form.aiTone,
    bookingMode: form.bookingMode,
    afterHours: form.afterHours,
    customGreeting: form.customGreeting,
    notificationPhone: form.notificationPhone,
    otherDescription: form.otherDescription,
  });

  const goNext = () => {
    if (phase === 1) {
      const isValid = validateStep("identity", { businessName: form.businessName, industrySlug: form.industrySlug, businessDetails: form.businessDetails });
      if (!isValid) return;
    } else if (phase === 3) {
      const isValid = validateStep("services-preview", { templateServices: form.templateServices });
      if (!isValid) return;
    }
    clearErrors();
    if (phase < totalPhases) progressGoNext();
  };

  const goBack = () => {
    clearErrors();
    if (phase > 1) progressGoBack();
  };

  const REVIEW_PHASE = totalPhases; // 7

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar — hidden during quick start */}
      {phase >= 1 && (
        <StepNavigator
          steps={ONBOARDING_PHASES}
          icons={PHASE_ICONS}
          currentStep={phase}
          onStepClick={goToPhase}
          totalMinutes={totalMinutes}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Progress — hidden during quick start */}
        {phase >= 1 && (
          <div className="lg:hidden p-4 border-b bg-card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">
                Step {phase} of {totalPhases} — {currentPhase.title}
              </p>
              <span className="text-sm font-medium text-muted-foreground">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}

        {/* Desktop Progress Bar — hidden during quick start */}
        {phase >= 1 && (
          <div className="hidden lg:block px-6 pt-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  Step {phase} of {totalPhases} — {currentPhase.title}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">{progressPercent}%</span>
                  <AutoSaveIndicator status={form.saveStatus} />
                </div>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className={`flex-1 flex justify-center p-6 overflow-y-auto ${phase === 0 ? "items-center" : "items-start"}`}>
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait">
              {phase === 0 ? (
                <motion.div
                  key="quickstart"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <WebsiteQuickStart
                    onImportComplete={(result) => {
                      const mapped = mapWebsiteImportToOnboarding(result);
                      form.applyWebsiteImport(mapped);
                      progressGoNext(); // advance to Phase 1
                    }}
                    onSkip={() => progressGoNext()}
                  />
                </motion.div>
              ) : submit.isComplete ? (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <OnboardingComplete
                    businessName={form.businessName}
                    phoneNumber={submit.provisionedPhone}
                    businessMode={form.businessMode}
                    scenarioAnswers={form.scenarioAnswers}
                    industrySlug={form.industrySlug}
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
                  {/* Phase 1: Your Business */}
                  {phase === 1 && (
                    <OnboardingIdentity
                      businessName={form.businessName}
                      onBusinessNameChange={form.setBusinessName}
                      businessAddress={form.businessAddress}
                      onBusinessAddressChange={form.setBusinessAddress}
                      industrySlug={form.industrySlug}
                      onIndustryChange={handleIndustryChange}
                      businessMode={form.businessMode}
                      onBusinessModeChange={form.handleBusinessModeChange}
                      workStyle={form.workStyle}
                      getFieldError={getFieldError}
                      otherDescription={form.otherDescription}
                      onOtherDescriptionChange={form.setOtherDescription}
                    />
                  )}
                  {/* Phase 2: How You Work */}
                  {phase === 2 && (
                    <OnboardingHowYouWork
                      businessMode={form.businessMode}
                      industrySlug={form.industrySlug}
                      workStyle={form.workStyle}
                      onWorkStyleChange={form.setWorkStyle}
                      scenarioAnswers={form.scenarioAnswers}
                      onScenarioAnswersChange={form.setScenarioAnswers}
                      scenarioDetails={form.scenarioDetails}
                      onScenarioDetailsChange={form.setScenarioDetails}
                    />
                  )}
                  {/* Phase 3: Your Offerings */}
                  {phase === 3 && (
                    <OnboardingOfferings
                      businessMode={form.businessMode}
                      industrySlug={form.industrySlug}
                      services={form.templateServices}
                      onServicesChange={form.setTemplateServices}
                    />
                  )}
                  {/* Phase 4: Hours & Area */}
                  {phase === 4 && (
                    <OnboardingHoursArea
                      businessMode={form.businessMode}
                      hours={form.businessHours}
                      onHoursChange={form.setBusinessHours}
                      is24x7={form.schedulingPrefs.is24x7}
                      onIs24x7Change={(v) => form.setSchedulingPrefs({ ...form.schedulingPrefs, is24x7: v })}
                      serviceArea={form.serviceArea}
                      onServiceAreaChange={form.setServiceArea}
                      workStyle={form.workStyle}
                    />
                  )}
                  {/* Phase 5: Your AI Assistant */}
                  {phase === 5 && (
                    <OnboardingAI
                      businessName={form.businessName}
                      businessMode={form.businessMode}
                      aiTone={form.aiTone}
                      onAiToneChange={form.setAiTone}
                      bookingMode={form.bookingMode}
                      onBookingModeChange={form.setBookingMode}
                      afterHours={form.afterHours}
                      onAfterHoursChange={form.setAfterHours}
                      customGreeting={form.customGreeting}
                      onCustomGreetingChange={form.setCustomGreeting}
                    />
                  )}
                  {/* Phase 6: Connect Tools */}
                  {phase === 6 && (
                    <OnboardingConnect
                      businessMode={form.businessMode}
                      notificationPhone={form.notificationPhone}
                      onNotificationPhoneChange={form.setNotificationPhone}
                      calendarConnected={form.calendarConnected}
                      onConnectCalendar={() => {
                        toast({ title: "Calendar", description: "Calendar connection will be available after setup." });
                      }}
                      onConnectIntegration={(providerId) => {
                        toast({ title: "Coming soon", description: `${providerId} integration will be available after setup.` });
                      }}
                    />
                  )}
                  {/* Phase 7: Review & Launch */}
                  {phase === REVIEW_PHASE && (
                    <OnboardingReview
                      businessName={form.businessName}
                      businessAddress={form.businessAddress}
                      businessMode={form.businessMode}
                      industrySlug={form.industrySlug}
                      services={form.templateServices}
                      templateFAQs={form.templateFAQs}
                      templatePolicies={form.templatePolicies}
                      businessHours={form.businessHours}
                      aiTone={form.aiTone}
                      bookingMode={form.bookingMode}
                      afterHours={form.afterHours}
                      is24x7={form.schedulingPrefs.is24x7}
                      workStyle={form.workStyle}
                      serviceAreaRadius={form.serviceArea.radiusMiles}
                      scenarioAnswers={form.scenarioAnswers}
                      customGreeting={form.customGreeting}
                      onEditPhase={goToPhase}
                      onTestAI={() => toast({ title: "Test AI", description: "AI testing will be available after setup." })}
                      onGoLive={() => submit.handleComplete(buildSubmitParams(), clearProgress)}
                      loading={submit.loading}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Navigation — hidden during quick start and review */}
        {!submit.isComplete && phase >= 1 && phase < REVIEW_PHASE && (
          <div className="border-t bg-card p-6">
            <div className="max-w-2xl mx-auto space-y-3">
              {submit.completionError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">
                  {submit.completionError}
                </div>
              )}
              <div className="flex justify-between gap-4">
                <Button variant="ghost" onClick={goBack} disabled={phase === 1} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                <div className="flex gap-2">
                  {phase === 6 && (
                    <Button variant="ghost" onClick={goNext} className="text-muted-foreground">
                      Skip for now
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast({ title: "Progress saved", description: "You can resume anytime." });
                      navigate("/");
                    }}
                  >
                    Save & Exit
                  </Button>
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

        {/* Review phase retry buttons */}
        {!submit.isComplete && phase === REVIEW_PHASE && submit.showRetry && !submit.loading && (
          <div className="border-t bg-card p-6">
            <div className="max-w-2xl mx-auto flex justify-center gap-3">
              <Button variant="ghost" onClick={() => goToPhase(1)} className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Go back and edit
              </Button>
              <Button variant="outline" onClick={() => submit.handleRetry(buildSubmitParams(), clearProgress)} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Retry ({submit.MAX_RETRIES - submit.retryCount} left)
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Resume Modal */}
      <ResumeOnboardingModal
        open={showResumeModal}
        savedAt={form.saved.current?.savedAt}
        onResume={handleResume}
        onStartFresh={handleStartFresh}
      />

      {/* Import Conflict Dialog */}
      <AlertDialog open={showImportConflictDialog} onOpenChange={setShowImportConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace imported data?</AlertDialogTitle>
            <AlertDialogDescription>
              You imported services, FAQs, and hours from your website. Changing your industry will replace them with default templates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                // Keep imported data, just change industry for mode/modules
                form.setIndustrySlug(pendingIndustrySlug);
                setShowImportConflictDialog(false);
              }}
            >
              Keep my imported data
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                form.clearWebsiteImport();
                form.setIndustrySlug(pendingIndustrySlug);
                setShowImportConflictDialog(false);
              }}
            >
              Use industry defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
