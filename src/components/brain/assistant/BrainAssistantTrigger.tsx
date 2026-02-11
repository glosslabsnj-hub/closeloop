/**
 * BrainAssistantTrigger — Floating action button to open the Brain Assistant panel.
 *
 * Shows a sparkles icon with optional pulse animation when the Brain has gaps.
 */

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BrainAssistantTriggerProps {
  onClick: () => void;
  hasGaps?: boolean;
}

export function BrainAssistantTrigger({ onClick, hasGaps }: BrainAssistantTriggerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Button
        onClick={onClick}
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all",
          "bg-primary hover:bg-primary/90",
          hasGaps && "animate-pulse"
        )}
        title="Open Brain Assistant"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    </div>
  );
}
