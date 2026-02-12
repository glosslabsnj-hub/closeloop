/**
 * FAQPreviewStep - Onboarding step for previewing/editing template FAQs
 *
 * Shows template FAQs in expandable cards with edit/toggle capability.
 * User can add their own FAQs.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { getIndustryTerminology } from "@/data/industryTerminology";
import type { BusinessMode } from "@/components/onboarding/BusinessModeSelector";

export interface EditableFAQ {
  question: string;
  answer: string;
  enabled: boolean;
}

interface FAQPreviewStepProps {
  businessMode: BusinessMode;
  industrySlug: string;
  faqs: EditableFAQ[];
  onChange: (faqs: EditableFAQ[]) => void;
}

export function FAQPreviewStep({
  businessMode,
  industrySlug,
  faqs,
  onChange,
}: FAQPreviewStepProps) {
  const terms = getIndustryTerminology(businessMode);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const toggleFAQ = (idx: number) => {
    const updated = [...faqs];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    onChange(updated);
  };

  const updateFAQ = (idx: number, field: "question" | "answer", value: string) => {
    const updated = [...faqs];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const removeFAQ = (idx: number) => {
    const updated = faqs.filter((_, i) => i !== idx);
    onChange(updated);
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const addFAQ = () => {
    onChange([
      ...faqs,
      { question: "", answer: "", enabled: true },
    ]);
    setExpandedIdx(faqs.length);
  };

  const toggleExpand = (idx: number) => {
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  const enabledCount = faqs.filter((f) => f.enabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Common Questions
        </h2>
        <p className="mt-2 text-muted-foreground">
          These are the most common questions {terms.customerLabel}s ask.
          Your AI will use these to answer instantly instead of guessing.
        </p>
      </div>

      <div className="space-y-2">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="rounded-lg border bg-card overflow-hidden"
          >
            {/* Header row */}
            <div className="flex items-center gap-3 p-3">
              <Switch
                checked={faq.enabled}
                onCheckedChange={() => toggleFAQ(idx)}
              />
              <button
                type="button"
                className="flex-1 flex items-center gap-2 text-left min-w-0"
                onClick={() => toggleExpand(idx)}
              >
                {expandedIdx === idx ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className={`text-sm font-medium truncate ${!faq.enabled ? "text-muted-foreground line-through" : ""}`}>
                  {faq.question || "New question"}
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeFAQ(idx)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Expanded content */}
            {expandedIdx === idx && (
              <div className="px-3 pb-3 space-y-3 border-t pt-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Question</label>
                  <Input
                    value={faq.question}
                    onChange={(e) => updateFAQ(idx, "question", e.target.value)}
                    placeholder="e.g. What are your hours?"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Answer</label>
                  <Textarea
                    value={faq.answer}
                    onChange={(e) => updateFAQ(idx, "answer", e.target.value)}
                    rows={3}
                    placeholder="How your AI should answer this..."
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={addFAQ}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Your Own
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        {enabledCount} FAQ{enabledCount !== 1 ? "s" : ""} will be loaded into your AI
      </p>
    </div>
  );
}
