import React from "react";
/**
 * Phase 3: YOUR OFFERINGS — Services / menu from template
 * Hours and service area moved to Phase 4 (OnboardingHoursArea).
 */
import { ServicePreviewStep, type EditableService } from "@/components/onboarding/ServicePreviewStep";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

interface OnboardingOfferingsProps {
  businessMode: BusinessMode;
  industrySlug: string;
  services: EditableService[];
  onServicesChange: (services: EditableService[]) => void;
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
          What do you offer?
        </h2>
        <p className="mt-2 text-muted-foreground">
          We've pre-filled this based on your industry. Edit, add, or remove anything.
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
