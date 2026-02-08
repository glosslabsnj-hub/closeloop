/**
 * InlineFieldHelp - Compact tooltip-based help system
 * 
 * Replaces large SectionHelper boxes with compact tooltips:
 * - Small (?) icon next to section title
 * - Hover shows 1-line explanation
 * - Click opens popover with full details + AI example
 */

import { HelpCircle, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/hooks/useTenantConfig";

interface InlineFieldHelpProps {
  /** Quick 1-line summary shown on hover */
  summary: string;
  /** Full explanation shown in popover */
  details?: string;
  /** Example of how AI uses this data */
  aiExample?: string;
  /** Mode-specific tips */
  modeTips?: Partial<Record<BusinessMode, string>>;
  /** Current business mode */
  mode?: BusinessMode;
  /** Additional class names */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

export function InlineFieldHelp({
  summary,
  details,
  aiExample,
  modeTips,
  mode = "general",
  className,
  size = "sm",
}: InlineFieldHelpProps) {
  const modeTip = modeTips?.[mode];
  const hasPopoverContent = details || aiExample || modeTip;

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  // If no detailed content, just show tooltip
  if (!hasPopoverContent) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors",
                className
              )}
              aria-label="Help"
            >
              <HelpCircle className={iconSize} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{summary}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // With detailed content, show popover on click
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <Popover>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors",
                  className
                )}
                aria-label="Help"
              >
                <HelpCircle className={iconSize} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{summary}</p>
          </TooltipContent>
          
          <PopoverContent 
            side="bottom" 
            align="start" 
            className="w-80 p-0"
          >
            <div className="p-3 space-y-3">
              {/* Summary */}
              <p className="text-sm text-foreground">{summary}</p>
              
              {/* Details */}
              {details && (
                <p className="text-xs text-muted-foreground">{details}</p>
              )}
              
              {/* AI Example */}
              {aiExample && (
                <div className="rounded-lg bg-primary/5 p-3 border border-primary/10">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1.5">
                    <Sparkles className="h-3 w-3" />
                    <span>What your AI will say</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    "{aiExample}"
                  </p>
                </div>
              )}
              
              {/* Mode-specific tip */}
              {modeTip && (
                <div className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2">
                  <span className="font-medium">Tip: </span>
                  {modeTip}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Section title with integrated help
 */
interface SectionTitleWithHelpProps {
  title: string;
  help: Omit<InlineFieldHelpProps, "className" | "size">;
  className?: string;
}

export function SectionTitleWithHelp({ 
  title, 
  help, 
  className 
}: SectionTitleWithHelpProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="font-medium text-sm">{title}</span>
      <InlineFieldHelp {...help} size="sm" />
    </div>
  );
}
