/**
 * Business Brain - Explainability Layer
 * 
 * Components that help business owners understand how their
 * configuration affects AI behavior.
 */

export { BrainHowItWorks } from "./BrainHowItWorks";
export { BrainTabHeader, TAB_GUIDANCE, type TabGuidance } from "./BrainTabHeader";
export { BrainSetupChecklist } from "./BrainSetupChecklist";
export { BrainPreviewPanel } from "./BrainPreviewPanel";

// Re-export the new guidance components for convenience
export {
  SectionGuidanceCard,
  FieldHelper,
  SpeechReadyBadge,
  ServiceAreaGuidance,
  PricingEtaGuidance,
  RequiredQuestionsGuidance,
  PoliciesGuidance,
} from "../guidance";
