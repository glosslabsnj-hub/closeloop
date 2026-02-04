/**
 * Business Brain Layout Components
 * 
 * Exports all layout-related components for the Business Brain redesign.
 */

export { BusinessBrainNav } from "./BusinessBrainNav";
export { BusinessBrainTabs } from "./BusinessBrainTabs";
export { BusinessBrainSectionCard, SpeechReadyBadge, PreviewSentence, HIPAAWarning } from "./BusinessBrainSectionCard";
export { CollapsibleBrainSection } from "./CollapsibleBrainSection";
export { SetupProgressBar } from "./SetupProgressBar";
export { SummaryHeader } from "./SummaryHeader";
export { SectionHelper } from "./SectionHelper";
export {
  BRAIN_CATEGORIES,
  getOrderedCategories,
  getVisibleCards,
  SECTION_TO_CATEGORY,
  CATEGORY_TO_SECTION,
  type CategoryConfig,
  type CardConfig,
} from "./businessBrainNavConfig";
