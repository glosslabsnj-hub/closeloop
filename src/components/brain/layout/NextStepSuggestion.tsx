/**
 * NextStepSuggestion - Contextual guidance after completing a section
 * 
 * Suggests the most relevant next step based on what the user
 * just completed and their business mode.
 */

import { ArrowRight, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface NextStepSuggestionProps {
  /** The section that was just completed */
  completedSection: string;
  /** Current business mode */
  mode: BusinessMode;
  /** Callback when user clicks the suggestion */
  onNavigate: (section: string) => void;
  /** Additional class names */
  className?: string;
}

/** Map of completed section -> suggested next step by mode */
const NEXT_STEP_MAP: Record<string, Record<BusinessMode | "default", { section: string; label: string; reason: string }>> = {
  "business": {
    default: { section: "services", label: "Add your services", reason: "So your AI can tell callers what you offer" },
    service: { section: "services", label: "Add your services", reason: "So your AI can tell callers what you offer" },
    dispatch: { section: "services", label: "Add tow services", reason: "So your AI can quote prices" },
    food: { section: "services", label: "Add menu items", reason: "So your AI can take orders" },
    medical: { section: "services", label: "Add services", reason: "Define procedures and pricing" },
    general: { section: "services", label: "Add your services", reason: "So your AI can tell callers what you offer" },
    sales: { section: "services", label: "Add your products", reason: "So your AI can answer product inquiries" },
  },
  "services": {
    default: { section: "operations", label: "Set your rules", reason: "Policies, service area, and required info" },
    service: { section: "operations", label: "Set your coverage", reason: "Define where you work and your policies" },
    dispatch: { section: "operations", label: "Configure zones", reason: "Set up pricing by distance and policies" },
    food: { section: "operations", label: "Set order policies", reason: "Delivery minimums and prep times" },
    medical: { section: "operations", label: "Set policies", reason: "Cancellation and payment rules" },
    general: { section: "operations", label: "Set your rules", reason: "Policies, service area, and required info" },
    sales: { section: "operations", label: "Set your policies", reason: "Returns, warranties, and financing terms" },
  },
  "operations": {
    default: { section: "ai-voice", label: "Customize your greeting", reason: "First impressions matter" },
    service: { section: "ai-voice", label: "Customize your greeting", reason: "First impressions matter" },
    dispatch: { section: "ai-voice", label: "Customize your greeting", reason: "Set your AI's tone" },
    food: { section: "ai-voice", label: "Customize your greeting", reason: "Make your AI welcoming" },
    medical: { section: "ai-voice", label: "Customize scripts", reason: "HIPAA-appropriate language" },
    general: { section: "ai-voice", label: "Customize your greeting", reason: "First impressions matter" },
    sales: { section: "ai-voice", label: "Customize your greeting", reason: "Make a great first impression" },
  },
  "ai-voice": {
    default: { section: "training", label: "Add FAQs", reason: "So your AI can answer common questions" },
    service: { section: "training", label: "Add FAQs", reason: "Answer pricing and process questions" },
    dispatch: { section: "training", label: "Add FAQs", reason: "Handle common caller questions" },
    food: { section: "training", label: "Add allergen info", reason: "Handle dietary questions" },
    medical: { section: "training", label: "Add FAQs", reason: "Common patient questions" },
    general: { section: "training", label: "Add FAQs", reason: "So your AI can answer common questions" },
    sales: { section: "training", label: "Add FAQs", reason: "Handle product and pricing questions" },
  },
  "profile": {
    default: { section: "services", label: "Add your services", reason: "So your AI can tell callers what you offer" },
    service: { section: "services", label: "Add your services", reason: "So your AI can tell callers what you offer" },
    dispatch: { section: "services", label: "Add tow services", reason: "So your AI can quote prices" },
    food: { section: "services", label: "Add menu items", reason: "So your AI can take orders" },
    medical: { section: "services", label: "Add services", reason: "Define procedures and pricing" },
    general: { section: "services", label: "Add your services", reason: "So your AI can tell callers what you offer" },
    sales: { section: "services", label: "Add your products", reason: "So your AI can answer product inquiries" },
  },
  "hours": {
    default: { section: "services", label: "Add services", reason: "Now define what you offer" },
    service: { section: "services", label: "Add services", reason: "Now define what you offer" },
    dispatch: { section: "operations", label: "Set service area", reason: "Define where you dispatch to" },
    food: { section: "services", label: "Build your menu", reason: "Add items customers can order" },
    medical: { section: "services", label: "Add services", reason: "Define procedures and pricing" },
    general: { section: "services", label: "Add services", reason: "Define what you offer" },
    sales: { section: "services", label: "Add products", reason: "Define your product catalog" },
  },
  "service-area": {
    default: { section: "operations", label: "Set policies", reason: "Cancellation and payment terms" },
    service: { section: "operations", label: "Set policies", reason: "Cancellation and payment terms" },
    dispatch: { section: "operations", label: "Set policies", reason: "Payment and impound rules" },
    food: { section: "ai-voice", label: "Customize greeting", reason: "Make your AI welcoming" },
    medical: { section: "business", label: "Sync calendar", reason: "Enable real-time booking" },
    general: { section: "operations", label: "Set policies", reason: "Cancellation and payment terms" },
    sales: { section: "operations", label: "Set policies", reason: "Return and warranty terms" },
  },
  "policies": {
    default: { section: "ai-voice", label: "Customize greeting", reason: "First impressions matter" },
    service: { section: "ai-voice", label: "Customize greeting", reason: "First impressions matter" },
    dispatch: { section: "ai-voice", label: "Customize greeting", reason: "Set your AI's tone" },
    food: { section: "training", label: "Add FAQs", reason: "Answer common questions" },
    medical: { section: "ai-voice", label: "Customize scripts", reason: "HIPAA-appropriate language" },
    general: { section: "ai-voice", label: "Customize greeting", reason: "First impressions matter" },
    sales: { section: "ai-voice", label: "Customize greeting", reason: "Set your AI's sales tone" },
  },
  "ai-behavior": {
    default: { section: "training", label: "Add FAQs", reason: "So your AI can answer common questions" },
    service: { section: "training", label: "Add FAQs", reason: "Answer pricing and process questions" },
    dispatch: { section: "training", label: "Add FAQs", reason: "Handle common caller questions" },
    food: { section: "training", label: "Add allergen info", reason: "Handle dietary questions" },
    medical: { section: "training", label: "Add FAQs", reason: "Common patient questions" },
    general: { section: "training", label: "Add FAQs", reason: "So your AI can answer common questions" },
    sales: { section: "training", label: "Add FAQs", reason: "Handle product questions" },
  },
};

export function NextStepSuggestion({
  completedSection,
  mode,
  onNavigate,
  className,
}: NextStepSuggestionProps) {
  const stepsForSection = NEXT_STEP_MAP[completedSection];
  if (!stepsForSection) return null;

  const suggestion = stepsForSection[mode] || stepsForSection.default;
  if (!suggestion) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-3 rounded-lg",
        "bg-primary/5 border border-primary/20",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Lightbulb className="h-4 w-4 text-primary shrink-0" />
        <div className="text-sm">
          <span className="font-medium text-foreground">Next: {suggestion.label}</span>
          <span className="text-muted-foreground ml-1">— {suggestion.reason}</span>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onNavigate(suggestion.section)}
        className="shrink-0"
      >
        Go
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}
