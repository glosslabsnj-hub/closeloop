import React from "react";
/**
 * Phase 3: YOUR OFFERINGS — Services / menu from template
 * Hours and service area moved to Phase 4 (OnboardingHoursArea).
 * Headers and descriptions adapt to the business mode.
 */
import { ServicePreviewStep, type EditableService } from "@/components/onboarding/ServicePreviewStep";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

interface OnboardingOfferingsProps {
  businessMode: BusinessMode;
  industrySlug: string;
  services: EditableService[];
  onServicesChange: (services: EditableService[]) => void;
}

/** Mode-specific heading so each business type feels custom */
function getOfferingsHeading(mode: BusinessMode): string {
  switch (mode) {
    case "food": return "What's on your menu?";
    case "dispatch": return "What services do you dispatch?";
    case "medical": return "What services do you provide?";
    case "sales": return "What do you sell?";
    case "general": return "What do you offer?";
    default: return "What services do you offer?";
  }
}

function getOfferingsSubtext(mode: BusinessMode): string {
  switch (mode) {
    case "food": return "We've pre-filled popular items for your type of restaurant. Edit prices, add specials, or remove anything.";
    case "dispatch": return "We've added common services for your industry. Adjust rates, add your specialties, or remove what doesn't apply.";
    case "medical": return "We've pre-filled typical services for your practice. Adjust descriptions, add procedures, or remove anything.";
    case "sales": return "We've added sample products for your industry. Update details, add your inventory, or remove what doesn't fit.";
    default: return "We've pre-filled this based on your industry. Edit, add, or remove anything.";
  }
}

export const OnboardingOfferings = React.memo(function OnboardingOfferings({
  businessMode,
  industrySlug,
  services,
  onServicesChange,
}: OnboardingOfferingsProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {getOfferingsHeading(businessMode)}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {getOfferingsSubtext(businessMode)}
        </p>
      </div>

      <ServicePreviewStep
        businessMode={businessMode}
        industrySlug={industrySlug}
        services={services}
        onChange={onServicesChange}
      />
    </div>
  );
});
