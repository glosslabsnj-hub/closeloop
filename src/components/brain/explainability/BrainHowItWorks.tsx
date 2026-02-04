/**
 * Business Brain - "How This Works" Info Strip
 * 
 * A compact, non-invasive strip at the top of Business Brain
 * explaining how the AI uses this information.
 */

import { useState } from "react";
import { Info, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface BrainHowItWorksProps {
  onOpenPreview?: () => void;
  className?: string;
}

export function BrainHowItWorks({ onOpenPreview, className }: BrainHowItWorksProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn(
      "rounded-lg border bg-muted/30 overflow-hidden",
      className
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium">How your AI uses this</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Everything you enter here trains your AI receptionist
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenPreview && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPreview();
                }}
                className="gap-2 hidden sm:flex"
              >
                <Eye className="h-4 w-4" />
                Preview what AI sees
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                {isOpen ? (
                  <>
                    <span className="hidden sm:inline">Less</span>
                    <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Learn more</span>
                    <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t">
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">1.</span>
                <span>
                  <strong className="text-foreground">You fill this out once.</strong>{" "}
                  Your AI learns from everything you enter here.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">2.</span>
                <span>
                  <strong className="text-foreground">Your AI uses it to answer questions.</strong>{" "}
                  It quotes your prices, explains your policies, and collects the right details.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">3.</span>
                <span>
                  <strong className="text-foreground">If something is blank, the AI asks instead of guessing.</strong>{" "}
                  Missing info means the AI will gather it from the caller.
                </span>
              </li>
            </ul>
            {onOpenPreview && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenPreview}
                className="gap-2 mt-4 sm:hidden w-full"
              >
                <Eye className="h-4 w-4" />
                Preview what the AI sees
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
