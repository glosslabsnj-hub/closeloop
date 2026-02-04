/**
 * Reusable section guidance card for Business Brain
 * Provides consistent UX pattern for section headers with:
 * - What this controls
 * - How the AI uses it
 * - Mode-aware examples
 * - Common mistakes to avoid
 */

import { ReactNode, useState } from "react";
import { Info, Lightbulb, AlertTriangle, Copy, Check, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface SectionExample {
  mode: BusinessMode;
  label: string;
  examples: {
    field: string;
    value: string;
  }[];
}

export interface SectionGuidanceProps {
  /** Section title */
  title: string;
  /** Icon to display */
  icon?: ReactNode;
  /** What this section controls (1 sentence) */
  whatItControls: string;
  /** How the AI uses this (1-3 bullets) */
  howAIUsesIt: string[];
  /** Mode-aware examples */
  examples?: SectionExample[];
  /** Common mistakes to avoid */
  avoidList?: string[];
  /** Current business mode */
  businessMode?: BusinessMode;
  /** Optional preview content */
  previewContent?: string | null;
  /** Preview fallback when content is empty */
  previewFallback?: string;
  /** Custom class name */
  className?: string;
}

export function SectionGuidanceCard({
  title,
  icon,
  whatItControls,
  howAIUsesIt,
  examples = [],
  avoidList = [],
  businessMode = "general",
  previewContent,
  previewFallback,
  className,
}: SectionGuidanceProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [examplesOpen, setExamplesOpen] = useState(false);

  // Get examples for current mode
  const currentModeExamples = examples.find((e) => e.mode === businessMode) || examples[0];

  const handleCopyExample = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className={cn("border-border/50 bg-card/50", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {icon && <div className="text-primary mt-0.5">{icon}</div>}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{whatItControls}</p>
          </div>
        </div>

        {/* How AI uses it */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">How your AI uses this</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            {howAIUsesIt.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>

        {/* Mode-aware examples (collapsible) */}
        {currentModeExamples && currentModeExamples.examples.length > 0 && (
          <Collapsible open={examplesOpen} onOpenChange={setExamplesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2">
                <span className="flex items-center gap-2 text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  See examples for {currentModeExamples.label}
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
                {currentModeExamples.examples.map((example, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{example.field}</p>
                      <p className="text-xs mt-0.5 italic">"{example.value}"</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 shrink-0"
                      onClick={() => handleCopyExample(example.value, example.field)}
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
        )}

        {/* Avoid list */}
        {avoidList.length > 0 && (
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Avoid these</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {avoidList.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview snippet */}
        {(previewContent !== undefined || previewFallback) && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Preview: What the AI will say</span>
            </div>
            <p className="text-xs italic">
              {previewContent ? `"${previewContent}"` : previewFallback}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Inline helper text component for individual fields
 */
export interface FieldHelperProps {
  usedWhen?: string;
  sayItLike?: string;
  avoid?: string;
  characterCount?: number;
  characterWarning?: number;
  className?: string;
}

export function FieldHelper({
  usedWhen,
  sayItLike,
  avoid,
  characterCount,
  characterWarning = 240,
  className,
}: FieldHelperProps) {
  const isLong = characterCount !== undefined && characterCount > characterWarning;

  return (
    <div className={cn("space-y-1 mt-1.5", className)}>
      {usedWhen && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Used when:</span> {usedWhen}
        </p>
      )}
      {sayItLike && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Say it like:</span> <span className="italic">"{sayItLike}"</span>
        </p>
      )}
      {avoid && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          <span className="font-medium">Avoid:</span> {avoid}
        </p>
      )}
      {characterCount !== undefined && (
        <p className={cn("text-xs", isLong ? "text-amber-500" : "text-muted-foreground")}>
          {characterCount} characters {isLong && "(consider shortening for clarity)"}
        </p>
      )}
    </div>
  );
}

/**
 * Speech-ready reminder badge
 */
export function SpeechReadyBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("text-xs gap-1", className)}>
      <Info className="h-3 w-3" />
      Write it how you want it spoken
    </Badge>
  );
}
