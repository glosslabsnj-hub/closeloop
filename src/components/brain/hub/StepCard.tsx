/**
 * StepCard - Compact step card for the Business Brain Hub (64px height)
 */

import { Check, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface StepCardProps {
  stepNumber: number;
  sectionId: string;
  title: string;
  purpose: string;
  icon: React.ElementType;
  usedByAI: string[];
  isComplete: boolean;
  isEmphasized?: boolean;
  mode: BusinessMode;
  onEdit: (sectionId: string) => void;
}

export function StepCard({
  stepNumber,
  sectionId,
  title,
  purpose,
  icon: Icon,
  isComplete,
  isEmphasized,
  onEdit,
}: StepCardProps) {
  return (
    <button
      type="button"
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg py-3 px-4 text-left transition-colors",
        "hover:bg-muted/40",
        isComplete && "bg-emerald-500/5",
        isEmphasized && !isComplete && "bg-primary/5",
      )}
      onClick={() => onEdit(sectionId)}
    >
      {/* Completion indicator */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          isComplete
            ? "bg-emerald-500 text-white"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isComplete ? <Check className="h-3.5 w-3.5" /> : stepNumber}
      </div>

      {/* Icon */}
      <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />

      {/* Title & description */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm">{title}</span>
        <p className="text-sm text-muted-foreground line-clamp-1">{purpose}</p>
      </div>

      {/* Status badge + chevron */}
      <div className="shrink-0 flex items-center gap-2">
        <Badge
          variant={isComplete ? "secondary" : "outline"}
          className={cn(
            "hidden sm:flex text-[11px] h-5",
            isComplete && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          )}
        >
          {isComplete ? "Done" : "Set up"}
        </Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
