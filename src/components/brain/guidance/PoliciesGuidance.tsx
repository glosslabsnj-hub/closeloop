/**
 * Policies Guidance Component
 * Provides UX guidance for payment, deposits, and cancellation policies
 */

import { useState } from "react";
import { Shield, Copy, Check, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, Eye, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface PoliciesGuidanceProps {
  businessMode: BusinessMode;
  policiesSummary?: string | null;
}

interface PolicyExample {
  field: string;
  value: string;
}

interface ModeExamples {
  mode: BusinessMode;
  label: string;
  examples: PolicyExample[];
  avoidList: string[];
}

const POLICY_EXAMPLES: ModeExamples[] = [
  {
    mode: "service",
    label: "Service Business",
    examples: [
      { field: "Deposit", value: "We require a 25% deposit to secure your appointment." },
      { field: "Cancellation", value: "Cancellations within 24 hours may be subject to a fee." },
      { field: "Payment", value: "We accept all major credit cards, cash, and checks." },
    ],
    avoidList: [
      '"No refunds ever." (unless you truly mean it)',
      '"It depends." (without context)',
    ],
  },
  {
    mode: "dispatch",
    label: "Dispatch / Towing",
    examples: [
      { field: "Payment", value: "Payment is due at service. We accept card and cash." },
      { field: "Cancellation", value: "If you cancel after dispatch is en route, a cancellation fee may apply." },
      { field: "After-hours", value: "After-hours calls may have an additional service fee." },
    ],
    avoidList: [
      '"Guaranteed free cancellation." (dispatch has real costs)',
      'Mentioning exact fees without confirming (prices change)',
    ],
  },
  {
    mode: "food",
    label: "Restaurant / Food",
    examples: [
      { field: "Payment", value: "We accept card online or on pickup." },
      { field: "Refund", value: "If there's an issue with the order, we'll make it right—call us and we'll fix it." },
      { field: "Delivery minimum", value: "There's a $15 minimum for delivery orders." },
    ],
    avoidList: [
      '"All sales final." (unless you want that reputation)',
      'Long policy text (keep it conversational)',
    ],
  },
  {
    mode: "medical",
    label: "Medical Practice",
    examples: [
      { field: "Cancellation", value: "Please give us 24 hours notice if you need to reschedule." },
      { field: "Insurance", value: "We accept most major insurance plans. We'll verify your coverage before your visit." },
      { field: "Payment", value: "Copays are due at time of service." },
    ],
    avoidList: [
      'Discussing specific insurance rates (verify first)',
      'Making medical claims or promises',
    ],
  },
  {
    mode: "general",
    label: "General Business",
    examples: [
      { field: "Payment", value: "We accept card, cash, and invoicing for approved accounts." },
      { field: "Cancellation", value: "Let us know as soon as possible if plans change." },
    ],
    avoidList: [
      'Vague "maybe" statements',
      'Overly legal language (keep it friendly)',
    ],
  },
];

export function PoliciesGuidance({
  businessMode,
  policiesSummary,
}: PoliciesGuidanceProps) {
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const modeExamples = POLICY_EXAMPLES.find((e) => e.mode === businessMode) || POLICY_EXAMPLES[4];

  const handleCopy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className="border-border/50 bg-card/50 mb-6">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Shield className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-sm">Payment, deposits, and cancellations</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              This tells the AI what to say when customers ask about refunds, deposits, and payment methods.
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
            <li>• If a caller asks about policy, the AI reads from your policy text.</li>
            <li>• If policy is blank, the AI will keep it generic and offer a callback for specifics.</li>
            <li>• Customers often ask about these before booking—clear policies reduce hesitation.</li>
          </ul>
        </div>

        {/* Speech-ready reminder */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium">Write these how you want them spoken</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Short, direct, no legal jargon. Keep each policy to 1-2 sentences.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">Tip</Badge>
        </div>

        {/* Mode-aware examples */}
        <Collapsible open={examplesOpen} onOpenChange={setExamplesOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2">
              <span className="flex items-center gap-2 text-xs">
                <Eye className="h-3.5 w-3.5" />
                See examples for {modeExamples.label}
              </span>
              {examplesOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              {modeExamples.examples.map((example, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{example.field}</p>
                    <p className="text-xs mt-0.5 italic">"{example.value}"</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 shrink-0"
                    onClick={() => handleCopy(example.value, example.field)}
                  >
                    {copied === example.field ? (
                      <Check className="h-3 w-3 text-primary" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground/70 pt-1 border-t">
                Click copy to use an example — it won't save until you paste and confirm.
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
            {modeExamples.avoidList.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
            <li>• Policies over 400 characters (hard to understand on a call)</li>
          </ul>
        </div>

        {/* Preview snippet */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Preview: What the AI will say</span>
          </div>
          <p className="text-xs italic">
            {policiesSummary
              ? `"${policiesSummary}"`
              : '"The AI will ask what you prefer and offer a callback for policy details."'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
