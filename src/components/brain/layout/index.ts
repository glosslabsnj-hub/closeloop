/**
 * Business Brain Layout Components
 * 
 * Exports all layout-related components for the Business Brain redesign.
 */

// Existing components
export { BusinessBrainNav } from "./BusinessBrainNav";
export { BusinessBrainTabs } from "./BusinessBrainTabs";
export { BusinessBrainSectionCard, SpeechReadyBadge, PreviewSentence, HIPAAWarning } from "./BusinessBrainSectionCard";
export { CollapsibleBrainSection } from "./CollapsibleBrainSection";
export { SetupProgressBar } from "./SetupProgressBar";
export { SummaryHeader } from "./SummaryHeader";
export { SectionHelper } from "./SectionHelper";
export { SectionGroupHeader } from "./SectionGroupHeader";

// NEW: Phase 1 Foundation Components
export { SectionSummaryCard, type SectionStatus } from "./SectionSummaryCard";
export { InlineFieldHelp, SectionTitleWithHelp } from "./InlineFieldHelp";
export { BrainProgressIndicator, BrainProgressRing } from "./BrainProgressIndicator";
export { AIPreviewBanner, AIPreviewInline } from "./AIPreviewBanner";
export { EssentialGroup } from "./EssentialGroup";
export { AdvancedGroup } from "./AdvancedGroup";
export { BrainSetupBanner } from "./BrainSetupBanner";
export { CompletionCelebration } from "./CompletionCelebration";
export { NextStepSuggestion } from "./NextStepSuggestion";
export { getModeTheme, getModeGradient, getModeDisplayName, type ModeThemeColors } from "./ModeTheme";

// Config exports
export {
  BRAIN_CATEGORIES,
  getOrderedCategories,
  getVisibleCards,
  SECTION_TO_CATEGORY,
  CATEGORY_TO_SECTION,
  type CategoryConfig,
  type CardConfig,
} from "./businessBrainNavConfig";
