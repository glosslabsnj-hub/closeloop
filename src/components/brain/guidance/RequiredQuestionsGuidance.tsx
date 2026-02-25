/**
 * Required Questions Guidance Component
 * Provides UX guidance and recommended defaults by business mode
 */

import { useState } from "react";
import { MessageSquare, Copy, Check, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface RequiredQuestionsGuidanceProps {
  businessMode: BusinessMode;
  requiredCount?: number;
}

interface RecommendedDefault {
  question: string;
}

const RECOMMENDED_DEFAULTS: Record<BusinessMode, RecommendedDefault[]> = {
  dispatch: [
    { question: "Exact pickup address (street + city + ZIP, or highway + mile marker)" },
    { question: "Service needed: tow, jump start, lockout, tire change, or fuel delivery" },
    { question: "Vehicle year, make, model (e.g., '2019 Honda Civic')" },
    { question: "Vehicle color (so driver can identify you)" },
    { question: "Is the vehicle drivable? (yes/no — determines equipment needed)" },
    { question: "Where should we take it? (home, shop, or our lot)" },
    { question: "Are you with the vehicle right now?" },
    { question: "Your name and callback number" },
  ],
  food: [
    { question: "Pickup or delivery" },
    { question: "Delivery address (if delivery)" },
    { question: "Order items + quantities" },
    { question: "Requested time (ASAP or scheduled)" },
    { question: "Name + callback number" },
  ],
  service: [
    { question: "Service requested" },
    { question: "Address/ZIP (if mobile)" },
    { question: "Preferred day/time" },
    { question: "Name + callback number" },
    { question: "Any special notes (pets, access, etc.)" },
  ],
  medical: [
    { question: "Reason for appointment" },
    { question: "Patient name + date of birth" },
    { question: "Preferred day/time" },
    { question: "Callback number" },
    { question: "Insurance provider (if applicable)" },
  ],
  general: [
    { question: "What you need help with" },
    { question: "Name + callback number" },
    { question: "Best time to reach you" },
  ],
  sales: [
    { question: "What product or service are you interested in" },
    { question: "Your budget range" },
    { question: "Name + callback number" },
    { question: "Preferred time for a viewing or consultation" },
  ],
};

const MODE_LABELS: Record<BusinessMode, string> = {
  dispatch: "Dispatch / Towing",
  food: "Restaurant / Food",
  service: "Service Business",
  medical: "Medical Practice",
  general: "General Business",
  sales: "Sales Business",
};

export function RequiredQuestionsGuidance({
  businessMode,
  requiredCount = 0,
}: RequiredQuestionsGuidanceProps) {
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const defaults = RECOMMENDED_DEFAULTS[businessMode] || RECOMMENDED_DEFAULTS.general;

  const handleCopy = (question: string, index: number) => {
    navigator.clipboard.writeText(question);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className="border-border/50 bg-card/50 mb-6">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-sm">What your AI must ask every time</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              These are mandatory intake questions the AI must collect before confirming a booking/order/dispatch.
            </p>
          </div>
        </div>

        {/* How AI uses it */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">How your AI uses this</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• If any required answer is missing, the AI will keep asking until it has it (or it will take a callback request).</li>
            <li>• These questions prevent incomplete tickets.</li>
            <li>• Write questions exactly how you want them asked.</li>
            {businessMode === "dispatch" && (
              <li>• Towing dispatches need exact location, vehicle info, and service type to dispatch the right equipment.</li>
            )}
            {businessMode === "medical" && (
              <li>• Medical practices should collect patient name, DOB, and insurance upfront for verification.</li>
            )}
            {businessMode === "food" && (
              <li>• Food orders need at minimum: items, pickup/delivery preference, and contact info.</li>
            )}
            {businessMode === "service" && (
              <li>• Service appointments need the job type, preferred time, and property address (if mobile).</li>
            )}
          </ul>
        </div>

        {/* Recommended defaults */}
        <Collapsible open={defaultsOpen} onOpenChange={setDefaultsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2">
              <span className="flex items-center gap-2 text-xs">
                <Eye className="h-3.5 w-3.5" />
                Recommended defaults for {MODE_LABELS[businessMode]}
              </span>
              {defaultsOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              {defaults.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <p className="text-xs flex-1">{item.question}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 shrink-0"
                    onClick={() => handleCopy(item.question, i)}
                  >
                    {copied === i ? (
                      <Check className="h-3 w-3 text-primary" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground/70 pt-2 border-t">
                Click copy to use a question — add it below to make it required.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Avoid list */}
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Avoid these</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Asking for too many things at once (one answer per question)</li>
            <li>• Vague questions like "Tell me about yourself"</li>
            <li>• Questions the AI can't verify (e.g., "Are you 18+")</li>
          </ul>
        </div>

        {/* Preview snippet */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Preview: What the AI will say</span>
          </div>
          <p className="text-xs italic">
            {requiredCount > 0
              ? `"The AI will not confirm until it has answers to ${requiredCount} required question${requiredCount === 1 ? "" : "s"}."`
              : '"The AI will use best-practice intake questions and ask for missing details naturally."'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
