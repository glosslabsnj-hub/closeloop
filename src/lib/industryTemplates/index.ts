/**
 * Industry Templates Module
 *
 * Pre-configured templates for different business types.
 * Provides smart defaults that are fully editable in Business Brain.
 *
 * @example
 * ```typescript
 * import {
 *   getTemplate,
 *   previewTemplateApplication,
 *   applyTemplate,
 *   fetchCurrentBrainState,
 * } from "@/lib/industryTemplates";
 *
 * // Get template for industry
 * const template = getTemplate("detailing");
 *
 * // Preview what will change
 * const currentState = await fetchCurrentBrainState(tenantId);
 * const preview = previewTemplateApplication(currentState, template, "merge");
 *
 * // Apply the template
 * const result = await applyTemplate(tenantId, template, "merge", preview);
 * ```
 *
 * @see docs/refactors/REFACTOR_STEP5_INDUSTRY_TEMPLATES.md
 */

// Types
export type {
  IndustryTemplate,
  ServiceTemplateItem,
  RequiredQuestionItem,
  PolicyItem,
  FAQItem,
  ObjectionItem,
  ServiceAreaDefaults,
  SchedulingDefaults,
  CurrentBrainState,
  TemplatePreviewResult,
  ApplyMode,
  IntentType,
  PolicyType,
} from "./types";

// Templates
export {
  industryTemplates,
  getTemplate,
  getAvailableTemplateKeys,
  getTemplateOptions,
  getTemplateOptionsForMode,
} from "./templates";

// Application logic
export {
  previewTemplateApplication,
  applyTemplate,
  fetchCurrentBrainState,
  type ApplyTemplateResult,
} from "./templateApplication";
