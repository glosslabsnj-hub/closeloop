/**
 * mapWebsiteImportToOnboarding — Pure function that converts the import-business-website
 * edge function response into onboarding form state types.
 */
import type { EditableService } from "@/components/onboarding/ServicePreviewStep";
import type { EditableFAQ } from "@/components/onboarding/FAQPreviewStep";
import type { BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import { createDayHours } from "@/lib/hoursUtils";
import { getIndustryBySlug } from "@/data/industryCatalog";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

// Mirrors the edge function's ExtractionResult
interface ImportedDayHours {
  open: string;
  close: string;
  is_open: boolean;
}

interface ImportedHours {
  monday: ImportedDayHours;
  tuesday: ImportedDayHours;
  wednesday: ImportedDayHours;
  thursday: ImportedDayHours;
  friday: ImportedDayHours;
  saturday: ImportedDayHours;
  sunday: ImportedDayHours;
}

export interface WebsiteExtractionResult {
  business_name: string;
  phone: string | null;
  address: string | null;
  hours: ImportedHours | null;
  services: {
    name: string;
    description: string;
    price_amount: number | null;
    duration_minutes: number | null;
  }[];
  faqs: { question: string; answer: string }[];
  description: string;
  suggested_industry: string;
  suggested_business_mode: string;
}

export interface MappedOnboardingData {
  businessName: string;
  suggestedIndustrySlug: string;
  suggestedBusinessMode: BusinessMode;
  address: string | null;
  services: EditableService[];
  faqs: EditableFAQ[];
  hours: BusinessHours | null;
}

const VALID_MODES: BusinessMode[] = ["service", "dispatch", "food", "medical", "general"];

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export function mapWebsiteImportToOnboarding(
  result: WebsiteExtractionResult,
): MappedOnboardingData {
  // Map services
  const services: EditableService[] = (result.services || []).map((s) => ({
    name: s.name,
    duration: s.duration_minutes ?? 60,
    price: s.price_amount ?? 0,
    priceType: s.price_amount == null ? "quote_only" : "fixed",
    description: s.description || undefined,
    enabled: true,
  }));

  // Map FAQs
  const faqs: EditableFAQ[] = (result.faqs || []).map((f) => ({
    question: f.question,
    answer: f.answer,
    enabled: true,
  }));

  // Map hours
  let hours: BusinessHours | null = null;
  if (result.hours) {
    hours = {} as BusinessHours;
    for (const day of DAY_KEYS) {
      const imported = result.hours[day];
      if (imported) {
        hours[day] = createDayHours(imported.open, imported.close, !imported.is_open);
      } else {
        hours[day] = createDayHours("09:00", "17:00");
      }
    }
  }

  // Validate industry slug
  const industryEntry = getIndustryBySlug(result.suggested_industry);
  const suggestedIndustrySlug = industryEntry ? result.suggested_industry : "other";

  // Validate business mode
  const rawMode = result.suggested_business_mode as BusinessMode;
  const suggestedBusinessMode: BusinessMode = VALID_MODES.includes(rawMode)
    ? rawMode
    : "service";

  return {
    businessName: result.business_name || "",
    suggestedIndustrySlug,
    suggestedBusinessMode,
    address: result.address || null,
    services,
    faqs,
    hours,
  };
}
