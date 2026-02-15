/**
 * Phase 1: WHO You Are — Business name, industry, work style
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, HelpCircle } from "lucide-react";
import { IndustrySelectorGrid } from "@/components/onboarding/IndustrySelectorGrid";
import { BusinessModeSelector, type BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import { FieldErrorMessage } from "@/components/onboarding/FieldErrorMessage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

export type WorkStyle = "go_to_customer" | "customer_comes" | "both" | "online_remote";

const workStyleOptions: { value: WorkStyle; label: string; description: string }[] = [
  { value: "go_to_customer", label: "I go to customers", description: "Mobile or on-site services" },
  { value: "customer_comes", label: "Customers come to me", description: "Shop, office, or storefront" },
  { value: "both", label: "Both", description: "Shop + mobile services" },
  { value: "online_remote", label: "Online / Remote", description: "Virtual or phone-based" },
];

interface OnboardingIdentityProps {
  businessName: string;
  onBusinessNameChange: (name: string) => void;
  industrySlug: string;
  onIndustryChange: (slug: string) => void;
  businessMode: BusinessMode;
  onBusinessModeChange: (mode: BusinessMode) => void;
  workStyle: WorkStyle;
  onWorkStyleChange: (style: WorkStyle) => void;
  getFieldError: (field: string) => string | undefined;
}

export function OnboardingIdentity({
  businessName,
  onBusinessNameChange,
  industrySlug,
  onIndustryChange,
  businessMode,
  onBusinessModeChange,
  workStyle,
  onWorkStyleChange,
  getFieldError,
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

      {/* Industry Selection */}
      <div data-field="industry-selector">
        <IndustrySelectorGrid
          value={industrySlug}
          onChange={(slug) => {
            onIndustryChange(slug);
            setShowModeFallback(false);
          }}
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

      {/* Work Style — shown after industry is selected */}
      {industrySlug && (
        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">How do you work?</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">This determines whether we set up service areas, coverage zones, or just a shop address.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {workStyleOptions.map((opt) => (
              <Card
                key={opt.value}
                className={cn(
                  "cursor-pointer transition-all",
                  workStyle === opt.value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                )}
                onClick={() => onWorkStyleChange(opt.value)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  {workStyle === opt.value && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
