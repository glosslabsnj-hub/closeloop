// Template resolver for industry-specific service templates
// This bridges the old industryTemplates.ts system with the new industryCatalog.ts

import { 
  industryConfigs, 
  ExtendedIndustryType, 
  ServiceTemplate,
  ContextField,
  FAQ,
  ObjectionResponse,
  IndustryConfig
} from "@/data/industryTemplates";

import {
  getIndustryBySlug,
  normalizeIndustrySlug,
  type IndustryCatalogEntry,
} from "@/data/industryCatalog";

/**
 * Resolves the correct industry template based on selected industry.
 * 
 * Now supports BOTH:
 * - Legacy ExtendedIndustryType keys (e.g., "plumber", "detailing")
 * - New industry slugs from industryCatalog (e.g., "plumbing", "auto_detailing")
 * 
 * Falls back to a generic service business template if industry not found.
 * 
 * @param industry - The selected industry (slug or legacy key)
 * @returns The industry configuration with services, FAQs, etc.
 */
export function resolveIndustryTemplate(industry: string): IndustryConfig {
  // First, try to normalize the slug (handles legacy -> new mapping)
  const normalizedSlug = normalizeIndustrySlug(industry);
  
  // Try the new catalog first
  const catalogEntry = getIndustryBySlug(normalizedSlug);
  if (catalogEntry) {
    // Convert catalog entry to IndustryConfig format
    return catalogEntryToConfig(catalogEntry);
  }
  
  // Fall back to legacy industryConfigs
  if (industry in industryConfigs) {
    const config = industryConfigs[industry as ExtendedIndustryType];
    return config;
  }

  // Also try the normalized slug in legacy configs
  if (normalizedSlug in industryConfigs) {
    const config = industryConfigs[normalizedSlug as ExtendedIndustryType];
    return config;
  }

  // Fallback to "other" template (generic service business)
  return industryConfigs.other;
}

/**
 * Converts a catalog entry to the legacy IndustryConfig format
 */
function catalogEntryToConfig(entry: IndustryCatalogEntry): IndustryConfig {
  return {
    label: entry.name,
    icon: entry.icon,
    services: entry.services,
    contextFields: entry.contextFields,
    faqs: entry.faqs,
    objections: entry.objections,
    defaultPolicies: entry.defaultPolicies,
  };
}

/**
 * Gets the default services for an industry
 */
export function getIndustryServices(industry: string): ServiceTemplate[] {
  const config = resolveIndustryTemplate(industry);
  return config.services;
}

/**
 * Gets the default context fields (intake questions) for an industry
 */
export function getIndustryContextFields(industry: string): ContextField[] {
  const config = resolveIndustryTemplate(industry);
  return config.contextFields;
}

/**
 * Gets the default FAQs for an industry
 */
export function getIndustryFAQs(industry: string): FAQ[] {
  const config = resolveIndustryTemplate(industry);
  return config.faqs;
}

/**
 * Gets the default objection responses for an industry
 */
export function getIndustryObjections(industry: string): ObjectionResponse[] {
  const config = resolveIndustryTemplate(industry);
  return config.objections;
}

/**
 * Gets the default policies for an industry
 */
export function getIndustryPolicies(industry: string): {
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
export function hasIndustryTemplate(industry: string): boolean {
  const normalizedSlug = normalizeIndustrySlug(industry);
  return !!getIndustryBySlug(normalizedSlug) || industry in industryConfigs;
}

/**
 * Gets all available industry options sorted by label
 * Now returns from the new catalog
 */
export function getAvailableIndustries(): { value: string; label: string; icon: string }[] {
  // Import from new catalog would create circular dependency, so we use the legacy approach
  return Object.entries(industryConfigs)
    .map(([value, config]) => ({
      value,
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

/**
 * Get business mode and enabled modules for an industry
 * New helper that works with the catalog
 */
export function getIndustryModeInfo(industry: string): {
  businessMode: string;
  enabledModules: string[];
  hipaaMode: boolean;
} {
  const normalizedSlug = normalizeIndustrySlug(industry);
  const catalogEntry = getIndustryBySlug(normalizedSlug);
  
  if (catalogEntry) {
    return {
      businessMode: catalogEntry.businessMode,
      enabledModules: catalogEntry.enabledModules,
      hipaaMode: catalogEntry.hipaaMode || false,
    };
  }
  
  // Default for legacy industries
  return {
    businessMode: 'service',
    enabledModules: ['ai_voice', 'instant_text_back', 'booking'],
    hipaaMode: industry === 'medspa' || industry === 'dental',
  };
}
