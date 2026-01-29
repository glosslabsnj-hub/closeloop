// Template resolver for industry-specific service templates
// This ensures the correct template loads based on the selected industry

import { 
  industryConfigs, 
  ExtendedIndustryType, 
  ServiceTemplate,
  ContextField,
  FAQ,
  ObjectionResponse,
  IndustryConfig
} from "@/data/industryTemplates";

/**
 * Resolves the correct industry template based on selected industry.
 * Falls back to a generic service business template if industry not found.
 * 
 * @param industry - The selected industry from Step 1
 * @returns The industry configuration with services, FAQs, etc.
 */
export function resolveIndustryTemplate(industry: ExtendedIndustryType): IndustryConfig {
  // Check if the industry exists in our configs
  const config = industryConfigs[industry];
  
  if (config) {
    console.log(`[templateResolver] Loaded template for industry: ${industry}`);
    return config;
  }
  
  // Fallback to "other" template (generic service business)
  console.warn(`[templateResolver] No template found for industry: ${industry}, falling back to generic`);
  return industryConfigs.other;
}

/**
 * Gets the default services for an industry
 */
export function getIndustryServices(industry: ExtendedIndustryType): ServiceTemplate[] {
  const config = resolveIndustryTemplate(industry);
  return config.services;
}

/**
 * Gets the default context fields (intake questions) for an industry
 */
export function getIndustryContextFields(industry: ExtendedIndustryType): ContextField[] {
  const config = resolveIndustryTemplate(industry);
  return config.contextFields;
}

/**
 * Gets the default FAQs for an industry
 */
export function getIndustryFAQs(industry: ExtendedIndustryType): FAQ[] {
  const config = resolveIndustryTemplate(industry);
  return config.faqs;
}

/**
 * Gets the default objection responses for an industry
 */
export function getIndustryObjections(industry: ExtendedIndustryType): ObjectionResponse[] {
  const config = resolveIndustryTemplate(industry);
  return config.objections;
}

/**
 * Gets the default policies for an industry
 */
export function getIndustryPolicies(industry: ExtendedIndustryType): {
  cancellation: string;
  deposit: string;
  refund: string;
} {
  const config = resolveIndustryTemplate(industry);
  return config.defaultPolicies;
}

/**
 * Validates that an industry has a valid template
 */
export function hasIndustryTemplate(industry: ExtendedIndustryType): boolean {
  return industry in industryConfigs;
}

/**
 * Gets all available industry options sorted by label
 */
export function getAvailableIndustries(): { value: ExtendedIndustryType; label: string; icon: string }[] {
  return Object.entries(industryConfigs)
    .map(([value, config]) => ({
      value: value as ExtendedIndustryType,
      label: config.label,
      icon: config.icon,
    }))
    .sort((a, b) => {
      // Put "Other" at the end
      if (a.value === "other") return 1;
      if (b.value === "other") return -1;
      return a.label.localeCompare(b.label);
    });
}
