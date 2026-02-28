/**
 * useOnboardingFormState — All onboarding form state, initialization effects, and auto-save.
 * Extracted from OnboardingPage.tsx for maintainability.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { MappedOnboardingData } from "@/lib/mapWebsiteImportToOnboarding";
import { type BusinessMode, getDefaultModulesForMode } from "@/components/onboarding/BusinessModeSelector";
import { getDefaultCommunicationPrefs, type CommunicationPrefs, type AITone, type AIBookingMode } from "@/components/onboarding/CommunicationPreferences";
import { getDefaultBusinessDetails, type BusinessDetails } from "@/components/onboarding/BusinessDetailsForm";
import { getDefaultA2PData, type A2PBusinessData } from "@/components/onboarding/A2PBusinessFields";
import { getDefaultSchedulingPrefs, getDefaultHoursForMode, type SchedulingPrefs } from "@/components/onboarding/SchedulingSetup";
import { type TeamMember } from "@/components/onboarding/TeamSetupStep";
import { getQuestionsForMode, getDefaultAnswers, deriveModulesFromScenario } from "@/lib/scenarioQuestions";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/hoursUtils";
import { type EditableService } from "@/components/onboarding/ServicePreviewStep";
import { getDefaultServiceArea, type ServiceAreaConfig } from "@/components/onboarding/ServiceAreaStep";
import type { EditablePolicies } from "@/components/onboarding/PolicyPreviewStep";
import type { EditableFAQ } from "@/components/onboarding/FAQPreviewStep";
import { getIndustryOnboardingConfig } from "@/config/industryOnboardingConfig";
import type { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import { getIndustryBySlug, getIndustryDefaultWorkStyle } from "@/data/industryCatalog";
import { resolveIndustryTemplate } from "@/lib/templateResolver";
import type { WorkStyle } from "@/components/onboarding/phases/OnboardingIdentity";
import type { AfterHoursBehavior } from "@/components/onboarding/phases/OnboardingAI";

// ─── Persistence helpers ────────────────────────────────────────────────────

export interface OnboardingDataState {
  businessName: string;
  businessAddress: string;
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
  otherDescription: string;
  savedAt?: string;
}

function getOldStorageKey(userId?: string) {
  return `voxly_onboarding_progress_${userId || "anon"}`;
}

function getDataStorageKey(userId?: string) {
  return `voxly_onboarding_data_v2_${userId || "anon"}`;
}

export function saveOnboardingData(state: Partial<OnboardingDataState>, userId?: string) {
  try {
    localStorage.setItem(getDataStorageKey(userId), JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
  } catch { /* ignore */ }
}

export function loadOnboardingData(userId?: string): OnboardingDataState | null {
  try {
    const raw = localStorage.getItem(getDataStorageKey(userId));
    if (raw) return JSON.parse(raw) as OnboardingDataState;
    const oldRaw = localStorage.getItem(getOldStorageKey(userId));
    if (oldRaw) return JSON.parse(oldRaw) as OnboardingDataState;
  } catch { /* ignore */ }
  return null;
}

export function clearOnboardingData(userId?: string) {
  localStorage.removeItem(getDataStorageKey(userId));
  localStorage.removeItem(getOldStorageKey(userId));
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOnboardingFormState(userId?: string) {
  const saved = useRef(loadOnboardingData(userId));
  const initializedIndustryRef = useRef<string | null>(saved.current?.industrySlug || null);
  const websiteImportActiveRef = useRef(false);

  // Auto-save indicator
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // --- All form state ---
  const initialBusinessName = saved.current?.businessName || sessionStorage.getItem("businessName") || "";
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [businessAddress, setBusinessAddress] = useState(saved.current?.businessAddress ?? "");
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

  // Phase 3 state
  const [aiTone, setAiTone] = useState<AITone>(saved.current?.aiTone ?? "friendly");
  const [bookingMode, setBookingMode] = useState<AIBookingMode>(saved.current?.bookingMode ?? "auto_book");
  const [afterHours, setAfterHours] = useState<AfterHoursBehavior>(saved.current?.afterHours ?? "ai_24_7");
  const [customGreeting, setCustomGreeting] = useState(saved.current?.customGreeting ?? "");

  // Phase 4 state
  const [notificationPhone, setNotificationPhone] = useState(saved.current?.notificationPhone ?? "");
  const [calendarConnected] = useState(false);

  // "Other" industry description
  const [otherDescription, setOtherDescription] = useState(saved.current?.otherDescription ?? "");

  // Clear signup sessionStorage
  useEffect(() => { sessionStorage.removeItem("businessName"); }, []);

  // Load industry from sessionStorage
  useEffect(() => {
    const storedIndustry = sessionStorage.getItem("selectedIndustry");
    if (storedIndustry && storedIndustry !== industrySlug) {
      const isValid = getIndustryBySlug(storedIndustry);
      if (isValid) setIndustrySlug(storedIndustry);
      sessionStorage.removeItem("selectedIndustry");
    }
  }, []);

  // Initialize when industry changes
  useEffect(() => {
    if (!industrySlug) return;
    if (initializedIndustryRef.current === industrySlug) return;
    const industryEntry = getIndustryBySlug(industrySlug);
    const newMode = industryEntry?.businessMode || businessMode;
    if (industryEntry?.businessMode) {
      setBusinessMode(newMode);
      setCommunicationPrefs(getDefaultCommunicationPrefs(newMode));
      setSchedulingPrefs(getDefaultSchedulingPrefs(newMode, undefined, industrySlug));
      const ctx = { slug: industrySlug, category: industryEntry.category };
      const defaults = getDefaultAnswers(newMode, ctx);
      const onboardingConfig = getIndustryOnboardingConfig(newMode, industryEntry.category, industrySlug);
      setScenarioAnswers({ ...defaults, ...onboardingConfig.preAnswers });
      const modePrefs = getDefaultCommunicationPrefs(newMode);
      setAiTone(modePrefs.aiTone);
      setBookingMode(modePrefs.aiBookingMode);
    }
    const modules = industryEntry?.enabledModules ?? getDefaultModulesForMode(businessMode);
    setEnabledModules(modules);
    baseModulesRef.current = modules;

    // GUARD: If website import is active, skip overwriting services/FAQs/hours
    if (!websiteImportActiveRef.current) {
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
      setBusinessHours(getDefaultHoursForMode(newMode));
      setServiceArea(getDefaultServiceArea(newMode as BusinessMode, industrySlug));
    }
    // Auto-infer work style from industry so user doesn't have to think about it
    setWorkStyle(getIndustryDefaultWorkStyle(industrySlug));
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

  const handleBusinessModeChange = useCallback((mode: BusinessMode) => {
    setBusinessMode(mode);
    const industryEntry = industrySlug ? getIndustryBySlug(industrySlug) : undefined;
    const ctx = industryEntry ? { slug: industrySlug, category: industryEntry.category } : undefined;
    setScenarioAnswers(getDefaultAnswers(mode, ctx));
    setCommunicationPrefs(getDefaultCommunicationPrefs(mode));
    setSchedulingPrefs(getDefaultSchedulingPrefs(mode, undefined, industrySlug));
    setBusinessHours(getDefaultHoursForMode(mode));
    setServiceArea(getDefaultServiceArea(mode, industrySlug));
    const modePrefs = getDefaultCommunicationPrefs(mode);
    setAiTone(modePrefs.aiTone);
    setBookingMode(modePrefs.aiBookingMode);
  }, [industrySlug]);

  // Auto-save debounced
  const triggerAutoSave = useCallback((isComplete: boolean, resumeDecided: boolean) => {
    if (isComplete || !resumeDecided) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      saveOnboardingData({
        businessName, businessAddress, businessMode, industrySlug, workStyle,
        scenarioAnswers, scenarioDetails, schedulingPrefs, communicationPrefs,
        templateServices, templateFAQs, templatePolicies,
        serviceArea, businessDetails, businessHours,
        teamMembers, isSoloOperator, a2pData,
        aiTone, bookingMode, afterHours, customGreeting, notificationPhone, otherDescription,
      }, userId);
      setSaveStatus("saved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    }, 3000);
    return () => clearTimeout(timer);
  }, [businessName, businessAddress, businessMode, industrySlug, workStyle, scenarioAnswers, scenarioDetails, schedulingPrefs, communicationPrefs, templateServices, templateFAQs, templatePolicies, serviceArea, businessDetails, businessHours, teamMembers, isSoloOperator, a2pData, aiTone, bookingMode, afterHours, customGreeting, notificationPhone, otherDescription, userId]);

  // --- Website import support ---
  const applyWebsiteImport = useCallback((mapped: MappedOnboardingData) => {
    websiteImportActiveRef.current = true;

    if (mapped.businessName) setBusinessName(mapped.businessName);
    if (mapped.suggestedIndustrySlug) setIndustrySlug(mapped.suggestedIndustrySlug);
    if (mapped.address) {
      setBusinessAddress(mapped.address);
      setBusinessDetails(prev => ({ ...prev, location: mapped.address! }));
    }

    // Direct-set imported data (protected from template override by the guard)
    if (mapped.services.length > 0) setTemplateServices(mapped.services);
    if (mapped.faqs.length > 0) setTemplateFAQs(mapped.faqs);
    if (mapped.hours) setBusinessHours(mapped.hours);
  }, []);

  const clearWebsiteImport = useCallback(() => {
    websiteImportActiveRef.current = false;
  }, []);

  const websiteImportActive = useMemo(() => websiteImportActiveRef.current, [
    // Re-derive when industry changes (the ref is set in applyWebsiteImport/clearWebsiteImport)
    industrySlug,
  ]);

  const resetFormState = useCallback(() => {
    setBusinessName(sessionStorage.getItem("businessName") || "");
    setBusinessAddress("");
    setIndustrySlug("");
    setScenarioAnswers({});
    setScenarioDetails({});
    setTemplateServices([]);
    setTemplateFAQs([]);
    setTemplatePolicies({ cancellation: "", deposit: "", refund: "" });
    setOtherDescription("");
    initializedIndustryRef.current = null;
    websiteImportActiveRef.current = false;
  }, []);

  return {
    // Form state
    businessName, setBusinessName,
    businessAddress, setBusinessAddress,
    businessMode, setBusinessMode,
    industrySlug, setIndustrySlug,
    workStyle, setWorkStyle,
    enabledModules, setEnabledModules,
    businessDetails, setBusinessDetails,
    scenarioAnswers, setScenarioAnswers,
    scenarioDetails, setScenarioDetails,
    teamMembers, setTeamMembers,
    isSoloOperator, setIsSoloOperator,
    a2pData, setA2pData,
    businessHours, setBusinessHours,
    schedulingPrefs, setSchedulingPrefs,
    communicationPrefs, setCommunicationPrefs,
    templateServices, setTemplateServices,
    templateFAQs, setTemplateFAQs,
    templatePolicies, setTemplatePolicies,
    serviceArea, setServiceArea,
    aiTone, setAiTone,
    bookingMode, setBookingMode,
    afterHours, setAfterHours,
    customGreeting, setCustomGreeting,
    notificationPhone, setNotificationPhone,
    otherDescription, setOtherDescription,
    calendarConnected,
    // Actions
    handleBusinessModeChange,
    triggerAutoSave,
    resetFormState,
    // Website import
    applyWebsiteImport,
    clearWebsiteImport,
    websiteImportActive,
    // Auto-save
    saveStatus,
    saved,
  };
}
