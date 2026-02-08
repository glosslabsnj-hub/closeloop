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
  "profile": {
    default: { section: "hours", label: "Set your hours", reason: "So your AI knows when you're available" },
    service: { section: "hours", label: "Set your hours", reason: "So your AI knows when you're available" },
    dispatch: { section: "services", label: "Add tow services", reason: "So your AI can quote prices" },
    food: { section: "services", label: "Add menu items", reason: "So your AI can take orders" },
    medical: { section: "hours", label: "Set practice hours", reason: "So patients know when to call" },
    general: { section: "hours", label: "Set your hours", reason: "So your AI knows when you're available" },
  },
  "hours": {
    default: { section: "services", label: "Add services", reason: "Now define what you offer" },
    service: { section: "services", label: "Add services", reason: "Now define what you offer" },
    dispatch: { section: "service-area", label: "Set service area", reason: "Define where you dispatch to" },
    food: { section: "services", label: "Build your menu", reason: "Add items customers can order" },
    medical: { section: "services", label: "Add services", reason: "Define procedures and pricing" },
    general: { section: "services", label: "Add services", reason: "Define what you offer" },
  },
  "services": {
    default: { section: "ai-behavior", label: "Customize greeting", reason: "Make your AI sound like you" },
    service: { section: "service-area", label: "Set service area", reason: "Define where you work" },
    dispatch: { section: "service-area", label: "Configure zones", reason: "Set up pricing by distance" },
    food: { section: "policies", label: "Set order policies", reason: "Delivery minimums and prep times" },
    medical: { section: "policies", label: "Set policies", reason: "Cancellation and payment rules" },
    general: { section: "ai-behavior", label: "Customize greeting", reason: "Make your AI sound like you" },
  },
  "service-area": {
    default: { section: "policies", label: "Set policies", reason: "Cancellation and payment terms" },
    service: { section: "policies", label: "Set policies", reason: "Cancellation and payment terms" },
    dispatch: { section: "policies", label: "Set policies", reason: "Payment and impound rules" },
    food: { section: "ai-behavior", label: "Customize greeting", reason: "Make your AI welcoming" },
    medical: { section: "availability", label: "Sync calendar", reason: "Enable real-time booking" },
    general: { section: "policies", label: "Set policies", reason: "Cancellation and payment terms" },
  },
  "policies": {
    default: { section: "ai-behavior", label: "Customize greeting", reason: "First impressions matter" },
    service: { section: "ai-behavior", label: "Customize greeting", reason: "First impressions matter" },
    dispatch: { section: "ai-behavior", label: "Customize greeting", reason: "Set your AI's tone" },
    food: { section: "knowledge", label: "Add FAQs", reason: "Answer common questions" },
    medical: { section: "ai-behavior", label: "Customize scripts", reason: "HIPAA-appropriate language" },
    general: { section: "ai-behavior", label: "Customize greeting", reason: "First impressions matter" },
  },
  "ai-behavior": {
    default: { section: "knowledge", label: "Add FAQs", reason: "Reduce \"I don't know\" responses" },
    service: { section: "knowledge", label: "Add FAQs", reason: "Answer pricing and process questions" },
    dispatch: { section: "knowledge", label: "Add FAQs", reason: "Handle common caller questions" },
    food: { section: "knowledge", label: "Add allergen info", reason: "Handle dietary questions" },
    medical: { section: "knowledge", label: "Add FAQs", reason: "Common patient questions" },
    general: { section: "knowledge", label: "Add FAQs", reason: "Reduce \"I don't know\" responses" },
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
