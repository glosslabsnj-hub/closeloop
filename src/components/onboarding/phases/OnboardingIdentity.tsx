import React from "react";
/**
 * Phase 1: YOUR BUSINESS — Business name, address, industry selection
 * Work style and scenario questions moved to Phase 2 (OnboardingHowYouWork).
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import { IndustrySelectorGrid } from "@/components/onboarding/IndustrySelectorGrid";
import { BusinessModeSelector, type BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import { FieldErrorMessage } from "@/components/onboarding/FieldErrorMessage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

// Re-export WorkStyle for backward compatibility
export type { WorkStyle } from "./OnboardingHowYouWork";

interface OnboardingIdentityProps {
  businessName: string;
  onBusinessNameChange: (name: string) => void;
  businessAddress: string;
  onBusinessAddressChange: (address: string) => void;
  industrySlug: string;
  onIndustryChange: (slug: string) => void;
  businessMode: BusinessMode;
  onBusinessModeChange: (mode: BusinessMode) => void;
  workStyle: string; // still needed for address label
  getFieldError: (field: string) => string | undefined;
  otherDescription?: string;
  onOtherDescriptionChange?: (desc: string) => void;
}

export const OnboardingIdentity = React.memo(function OnboardingIdentity({
  businessName,
  onBusinessNameChange,
  businessAddress,
  onBusinessAddressChange,
  industrySlug,
  onIndustryChange,
  businessMode,
  onBusinessModeChange,
  workStyle,
  getFieldError,
  otherDescription,
  onOtherDescriptionChange,
}: OnboardingIdentityProps) {
  const [showModeFallback, setShowModeFallback] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Let's set up your AI receptionist
        </h2>
        <p className="mt-2 text-muted-foreground">
          We'll use this to personalize how your AI answers calls.
        </p>
      </div>

      {/* Business Name */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="business-name">What's your business name?</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">This is how your AI will answer calls: "Thanks for calling [name]!"</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="business-name"
          placeholder="e.g. Mike's Plumbing Pros"
          value={businessName}
          onChange={(e) => onBusinessNameChange(e.target.value)}
          autoFocus
          className={cn(getFieldError("business-name") && "border-destructive ring-destructive/30 ring-2")}
        />
        <FieldErrorMessage message={getFieldError("business-name")} />
      </div>

      {/* Business Address (optional) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="business-address">
            {workStyle === "go_to_customer" || workStyle === "online_remote"
              ? "Home base address"
              : "Business address"}
          </Label>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">Optional</Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">Your AI uses this to give callers directions and confirm your location</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="business-address"
          placeholder="e.g. 123 Main St, Anytown, USA"
          value={businessAddress}
          onChange={(e) => onBusinessAddressChange(e.target.value)}
        />
      </div>

      {/* Industry Selection */}
      <div data-field="industry-selector">
        <IndustrySelectorGrid
          value={industrySlug}
          onChange={(slug) => {
            onIndustryChange(slug);
            setShowModeFallback(false);
          }}
          otherDescription={otherDescription}
          onOtherDescriptionChange={onOtherDescriptionChange}
        />
        <FieldErrorMessage message={getFieldError("industry-selector")} />
      </div>

      {!showModeFallback ? (
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-primary underline"
          onClick={() => setShowModeFallback(true)}
        >
          Can't find your industry?
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Choose your business type instead:</p>
          <BusinessModeSelector value={businessMode} onChange={onBusinessModeChange} />
        </div>
      )}
    </div>
  );
});
