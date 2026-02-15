/**
 * Phase 2: WHAT You Do — Services, hours, service area (industry-specific)
 */
import { Separator } from "@/components/ui/separator";
import { ServicePreviewStep, type EditableService } from "@/components/onboarding/ServicePreviewStep";
import BusinessHoursEditor, { type BusinessHours } from "@/components/onboarding/BusinessHoursEditor";
import { ServiceAreaStep, type ServiceAreaConfig } from "@/components/onboarding/ServiceAreaStep";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { HOURS_24_7 } from "@/lib/hoursUtils";
import { getDefaultHoursForMode } from "@/components/onboarding/SchedulingSetup";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import type { WorkStyle } from "./OnboardingIdentity";

interface OnboardingOfferingsProps {
  businessMode: BusinessMode;
  industrySlug: string;
  services: EditableService[];
  onServicesChange: (services: EditableService[]) => void;
  hours: BusinessHours;
  onHoursChange: (hours: BusinessHours) => void;
  is24x7: boolean;
  onIs24x7Change: (enabled: boolean) => void;
  serviceArea: ServiceAreaConfig;
  onServiceAreaChange: (area: ServiceAreaConfig) => void;
  workStyle: WorkStyle;
}

export function OnboardingOfferings({
  businessMode,
  industrySlug,
  services,
  onServicesChange,
  hours,
  onHoursChange,
  is24x7,
  onIs24x7Change,
  serviceArea,
  onServiceAreaChange,
  workStyle,
}: OnboardingOfferingsProps) {
  const showCoverage = workStyle === "go_to_customer" || workStyle === "both" ||
    businessMode === "dispatch" || businessMode === "food";
  const showDispatch24x7 = businessMode === "dispatch";

  const handle24x7Toggle = (enabled: boolean) => {
    onIs24x7Change(enabled);
    if (enabled) {
      onHoursChange(HOURS_24_7);
    } else {
      onHoursChange(getDefaultHoursForMode(businessMode));
    }
  };

  return (
    <div className="space-y-8">
      {/* Services Section */}
      <ServicePreviewStep
        businessMode={businessMode}
        industrySlug={industrySlug}
        services={services}
        onChange={onServicesChange}
      />

      <Separator />

      {/* Hours Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold tracking-tight">When are you available?</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">Your AI uses these hours to tell callers if you're open and to schedule within your availability.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {showDispatch24x7 && (
          <Card className={cn(is24x7 && "border-primary bg-primary/5")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">24/7 Operations</p>
                  <p className="text-xs text-muted-foreground">Available around the clock</p>
                </div>
                <Switch checked={is24x7} onCheckedChange={handle24x7Toggle} />
              </div>
            </CardContent>
          </Card>
        )}

        {!is24x7 && (
          <div className="border rounded-lg p-4 max-h-[320px] overflow-y-auto">
            <BusinessHoursEditor hours={hours} onChange={onHoursChange} />
          </div>
        )}
      </div>

      {/* Service Area — only if mobile/both or dispatch/food */}
      {showCoverage && (
        <>
          <Separator />
          <ServiceAreaStep
            businessMode={businessMode}
            value={serviceArea}
            onChange={onServiceAreaChange}
          />
        </>
      )}
    </div>
  );
}
