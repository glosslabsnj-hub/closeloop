/**
 * StepCard - Simplified step card for the Business Brain Hub
 * 
 * Clean, minimal design that's easy to scan.
 */

import { ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface StepCardProps {
  /** Step number (1-8) */
  stepNumber: number;
  /** Section ID for navigation */
  sectionId: string;
  /** Step title */
  title: string;
  /** One-line purpose */
  purpose: string;
  /** Icon component */
  icon: React.ElementType;
  /** How the AI uses this data */
  usedByAI: string[];
  /** Current completion status */
  isComplete: boolean;
  /** Whether this step is emphasized for the current mode */
  isEmphasized?: boolean;
  /** Current business mode for styling */
  mode: BusinessMode;
  /** Click handler to navigate to step editor */
  onEdit: (sectionId: string) => void;
  /** Optional additional content */
  children?: ReactNode;
  /** Optional badge text */
  badge?: string;
  /** Optional badge variant */
  badgeVariant?: "default" | "destructive" | "outline" | "secondary";
}

export function StepCard({
  stepNumber,
  sectionId,
  title,
  purpose,
  icon: Icon,
  usedByAI,
  isComplete,
  isEmphasized,
  mode,
  onEdit,
  children,
}: StepCardProps) {
  return (
    <Card
      className={cn(
        "group transition-all duration-200 hover:shadow-sm cursor-pointer",
        isComplete && "border-emerald-500/30 bg-emerald-500/5",
        isEmphasized && !isComplete && "border-primary/30 bg-primary/5",
      )}
      onClick={() => onEdit(sectionId)}
    >
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-4">
          {/* Step Number / Check */}
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              isComplete
                ? "bg-emerald-500 text-white"
                : isEmphasized
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isComplete ? <Check className="h-4 w-4" /> : stepNumber}
          </div>

          {/* Title & Purpose */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Icon className={cn(
                "h-4 w-4 shrink-0",
                isComplete ? "text-emerald-600" : isEmphasized ? "text-primary" : "text-muted-foreground"
              )} />
              <h3 className="font-medium">{title}</h3>
              {isEmphasized && !isComplete && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary h-5">
                  Important
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{purpose}</p>
          </div>

          {/* Status & CTA */}
          <div className="shrink-0 flex items-center gap-3">
            <Badge 
              variant={isComplete ? "secondary" : "outline"} 
              className={cn(
                "hidden sm:flex",
                isComplete && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              )}
            >
              {isComplete ? "Done" : "Set up"}
            </Badge>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </div>

        {/* Optional children content */}
        {children && (
          <div className="mt-3 pt-3 border-t">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
