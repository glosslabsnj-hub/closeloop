/**
 * Business Brain - Standardized Tab Header
 * 
 * Provides consistent structure for each tab:
 * A) What this controls (1 sentence)
 * B) How the AI uses it (1-2 bullets)
 * C) Common mistakes (mode-aware)
 */

import { ReactNode } from "react";
import { Info, AlertCircle, Lightbulb, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface TabGuidance {
  /** What this tab controls */
  whatItControls: string;
  /** How the AI uses this information */
  howAIUsesIt: string[];
  /** Common mistakes to avoid (can be mode-specific) */
  commonMistakes: string[];
  /** Tips for success */
  tips?: string[];
}

interface BrainTabHeaderProps {
  title: string;
  icon?: ReactNode;
  guidance: TabGuidance;
  businessMode?: BusinessMode;
  onPreviewSection?: () => void;
  className?: string;
}

export function BrainTabHeader({
  title,
  icon,
  guidance,
  businessMode,
  onPreviewSection,
  className,
}: BrainTabHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {/* Title with tooltip */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-semibold">{title}</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="font-medium mb-1">{guidance.whatItControls}</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {guidance.howAIUsesIt.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {onPreviewSection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviewSection}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
        )}
      </div>

      {/* What this controls */}
      <p className="text-sm text-muted-foreground mb-4">
        {guidance.whatItControls}
      </p>

      {/* Guidance cards row */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* How AI uses it */}
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">How your AI uses this</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            {guidance.howAIUsesIt.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>

        {/* Common mistakes */}
        {guidance.commonMistakes.length > 0 && (
          <div className="rounded-lg border bg-amber-500/5 border-amber-500/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Avoid these mistakes</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {guidance.commonMistakes.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Pre-defined guidance for each Business Brain tab
 * Mode-aware where applicable
 */
export const TAB_GUIDANCE: Record<string, (mode: BusinessMode) => TabGuidance> = {
  profile: () => ({
    whatItControls: "Your business identity — name, contact info, timezone, and location.",
    howAIUsesIt: [
      "Introduces your business by name on every call",
      "Mentions your years in business to build trust",
      "Answers questions about location and contact info",
    ],
    commonMistakes: [
      "Leaving the business name blank or using a personal name",
      "Forgetting to set your timezone (causes scheduling confusion)",
      "Missing your business address (required for service area)",
    ],
  }),

  hours: (mode) => {
    const label = mode === "food" ? "orders" : mode === "dispatch" ? "dispatches" : mode === "medical" ? "patient visits" : "scheduling";
    return {
      whatItControls: `When your business is open for calls and ${label}.`,
      howAIUsesIt: [
        "Tells callers if you're currently open or closed",
        "Suggests available times when booking",
        "Explains your hours when asked",
      ],
      commonMistakes: [
        "Not setting hours (AI can't tell callers when you're open)",
        "Forgetting to mark holidays or special closures",
        "Setting hours that don't match your actual availability",
      ],
    };
  },

  services: (mode) => {
    if (mode === "food") {
      return {
        whatItControls: "Your menu items, categories, and pricing.",
        howAIUsesIt: [
          "Reads menu items when customers ask what you serve",
          "Quotes prices accurately for each item",
          "Suggests items when customers aren't sure what to order",
        ],
        commonMistakes: [
          "Missing prices (AI can't quote costs)",
          "Vague item names (be specific: 'Large Pepperoni Pizza' not 'Pizza')",
          "Forgetting modifiers and add-ons",
        ],
      };
    }
    if (mode === "dispatch") {
      return {
        whatItControls: "Your dispatch services, rates, and distance-based pricing.",
        howAIUsesIt: [
          "Calculates quotes based on pickup/dropoff locations",
          "Applies the right rate for each service type",
          "Explains your pricing tiers to callers",
        ],
        commonMistakes: [
          "Missing distance tiers (can't quote long-distance jobs)",
          "Not setting a base price (quotes will be $0)",
          "Forgetting vehicle-specific rates",
        ],
      };
    }
    return {
      whatItControls: "What services you offer and how much they cost.",
      howAIUsesIt: [
        "Tells callers what you offer when they ask",
        "Quotes prices accurately (fixed or 'starting at')",
        "Helps match caller needs to the right service",
      ],
      commonMistakes: [
        "Leaving prices blank (AI can't quote)",
        "Vague service names (be specific about what's included)",
        "Missing duration estimates (hard to schedule)",
      ],
    };
  },

  "service-area": (mode) => ({
    whatItControls: "Where your business provides service and estimated travel times.",
    howAIUsesIt: [
      "Checks if caller's location is within your service area",
      mode === "sales"
        ? "Lets customers know which areas you serve or deliver to"
        : "Politely handles callers outside your coverage area",
      mode === "dispatch"
        ? "Calculates accurate ETAs based on distance"
        : "Estimates arrival or travel times when relevant",
    ],
    commonMistakes: [
      "No base address set (can't calculate distances)",
      "Service radius too small (missing potential customers)",
      "Forgetting to exclude areas you don't serve",
    ],
  }),

  availability: (mode) => {
    const label = mode === "food" ? "reservations" : mode === "dispatch" ? "dispatches" : mode === "medical" ? "patient visits" : "bookings";
    return {
      whatItControls: "Your calendar connections and time blocking for real-time availability.",
      howAIUsesIt: [
        `Syncs with your calendar to see real ${label}`,
        "Avoids double-booking by checking before offering times",
        "Respects manually blocked times and buffer periods",
      ],
      commonMistakes: [
        "Not connecting your calendar (AI might double-book)",
        "Forgetting to block personal time",
        "Not granting correct calendar permissions",
      ],
    };
  },

  policies: (mode) => {
    const modeSpecific = mode === "food" 
      ? "Explains delivery minimums and pickup procedures"
      : mode === "dispatch"
      ? "Communicates payment terms and urgency fees"
      : mode === "medical"
      ? "Explains intake requirements and HIPAA protections"
      : "Explains deposits, cancellation terms, and payment options";
    
    return {
      whatItControls: "Business rules: payments, cancellations, deposits, and what info to collect from callers.",
      howAIUsesIt: [
        modeSpecific,
        "Answers policy questions before they become objections",
        "Collects required information (name, phone, address) correctly",
      ],
      commonMistakes: [
        "No cancellation policy (callers will ask)",
        "Missing required questions (AI won't collect needed info)",
        "Policies too long (keep them clear and brief)",
      ],
    };
  },

  "ai-behavior": () => ({
    whatItControls: "How your AI speaks, negotiates, and handles different situations.",
    howAIUsesIt: [
      "Uses your custom greeting and fallback scripts",
      "Follows your rules about what to promise (or not)",
      "Adjusts intelligence settings for different scenarios",
    ],
    commonMistakes: [
      "Overly formal scripts (sound robotic)",
      "Not setting 'never promise' rules (AI might overpromit)",
      "Forgetting to customize the greeting",
    ],
  }),

  knowledge: () => ({
    whatItControls: "FAQs, common customer concerns, custom facts, and uploaded documents.",
    howAIUsesIt: [
      "Answers frequently asked questions instantly",
      "Handles objections with your approved responses",
      "References uploaded documents for detailed info",
    ],
    commonMistakes: [
      "Too few FAQs (AI makes up answers)",
      "Not adding objection responses (AI can't handle concerns)",
      "Uploading irrelevant documents (confuses the AI)",
    ],
  }),
};
