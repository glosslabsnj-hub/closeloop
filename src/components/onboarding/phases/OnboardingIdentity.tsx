import React from "react";
/**
 * Phase 1: YOUR BUSINESS — Industry-first, then business name + address + work style.
 * Industry selection is shown FIRST so all templates, labels, and presets
 * adapt immediately. Work style is shown inline after industry selection.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HelpCircle, Globe, Check, Phone } from "lucide-react";
import { IndustrySelectorGrid } from "@/components/onboarding/IndustrySelectorGrid";
import { BusinessModeSelector, type BusinessMode } from "@/components/onboarding/BusinessModeSelector";
import { FieldErrorMessage } from "@/components/onboarding/FieldErrorMessage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { getIndustryBySlug } from "@/data/industryCatalog";
import type { WorkStyle } from "./OnboardingHowYouWork";

// Re-export WorkStyle for backward compatibility
export type { WorkStyle } from "./OnboardingHowYouWork";

const workStyleOptions: { value: WorkStyle; label: string; description: string }[] = [
  { value: "go_to_customer", label: "I go to customers", description: "Mobile or on-site services" },
  { value: "customer_comes", label: "Customers come to me", description: "Shop, office, or storefront" },
  { value: "both", label: "Both", description: "Shop + mobile services" },
  { value: "online_remote", label: "Online / Remote", description: "Virtual or phone-based" },
];

interface OnboardingIdentityProps {
  businessName: string;
  onBusinessNameChange: (name: string) => void;
  businessAddress: string;
  onBusinessAddressChange: (address: string) => void;
  industrySlug: string;
  onIndustryChange: (slug: string) => void;
  businessMode: BusinessMode;
  onBusinessModeChange: (mode: BusinessMode) => void;
  workStyle: WorkStyle;
  onWorkStyleChange: (style: WorkStyle) => void;
  getFieldError: (field: string) => string | undefined;
  otherDescription?: string;
  onOtherDescriptionChange?: (desc: string) => void;
  onWebsiteImport?: () => void;
  websiteImportActive?: boolean;
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
  onWorkStyleChange,
  getFieldError,
  otherDescription,
  onOtherDescriptionChange,
  onWebsiteImport,
  websiteImportActive,
}: OnboardingIdentityProps) {
  const [showModeFallback, setShowModeFallback] = useState(false);

  const industryEntry = industrySlug ? getIndustryBySlug(industrySlug) : undefined;

  // Dynamic placeholder using industry catalog name
  const SLUG_PLACEHOLDERS: Record<string, string> = {
    plumbing: "Mike's Plumbing Pros",
    "hair-salon": "Bella's Hair Studio",
    dental: "Bright Smile Dental",
    hvac: "Comfort Air HVAC",
    "auto-repair": "FastLane Auto Repair",
    pizza: "Tony's Pizza",
    towing: "Rapid Tow & Recovery",
    "lawn-care": "GreenPro Landscaping",
    electrical: "Spark Electric Services",
    cleaning: "Sparkle Clean Co.",
    chiropractic: "Aligned Chiropractic",
    "pet-grooming": "Happy Paws Grooming",
    "general-contractor": "Summit Builders LLC",
    "real-estate": "Keystone Realty",
    barbershop: "Classic Cuts Barbershop",
    "nail-salon": "Polished Nails",
    tattoo: "Ink Masters Studio",
    photography: "Shutter Click Photography",
    "personal-trainer": "FitPro Training",
    massage: "Serenity Massage",
    locksmith: "QuickKey Locksmith",
    "pest-control": "Shield Pest Control",
    roofing: "TopRidge Roofing",
    painting: "Fresh Coat Painters",
    veterinary: "Pawcare Veterinary",
  };
  const namePlaceholder = industrySlug
    ? `e.g. ${SLUG_PLACEHOLDERS[industrySlug] || "Your Business Name"}`
    : "e.g. Mike's Plumbing Pros";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {industryEntry
            ? `Let's set up your ${industryEntry.name.toLowerCase()} AI receptionist`
            : "Let's set up your AI receptionist"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {industryEntry
            ? `We'll pre-fill services, pricing, FAQs, and scripts for ${industryEntry.name.toLowerCase()} businesses. You can customize everything later.`
            : "Pick your industry and we'll set up everything — services, pricing, FAQs, and AI scripts — tailored just for you."}
        </p>
        {onWebsiteImport && !websiteImportActive && (
          <button
            type="button"
            onClick={onWebsiteImport}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            Have a website? Import your info automatically
          </button>
        )}
        {websiteImportActive && (
          <div className="mt-3 flex items-center gap-2 text-sm text-primary">
            <Check className="h-3.5 w-3.5" />
            <span>Website data imported — fields pre-filled below</span>
          </div>
        )}
      </div>

      {/* Industry Selection — FIRST so everything adapts */}
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
          Don't see your industry?
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Choose your business type instead:</p>
          <BusinessModeSelector value={businessMode} onChange={onBusinessModeChange} />
        </div>
      )}

      {/* Business Name — personalized after industry selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="business-name">What's your business called?</Label>
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
          placeholder={namePlaceholder}
          value={businessName}
          onChange={(e) => onBusinessNameChange(e.target.value)}
          className={cn(getFieldError("business-name") && "border-destructive ring-destructive/30 ring-2")}
        />
        <FieldErrorMessage message={getFieldError("business-name")} />
        {industrySlug && businessName && (
          <div className="flex items-center gap-2 mt-1 animate-fade-in">
            <Phone className="h-3 w-3 text-primary/60 shrink-0" />
            <p className="text-xs text-primary/80 italic">
              "Thanks for calling {businessName}! How can I help you today?"
            </p>
          </div>
        )}
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

      {/* Work Style — moved from former Phase 2 */}
      {industrySlug && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Where do your customers find you?</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">If you travel to customers, we'll set up a service area so your AI knows where you cover.</p>
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
});
