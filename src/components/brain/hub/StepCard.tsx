/**
 * StepCard - Individual step card for the Business Brain Hub
 * 
 * Shows:
 * - Step number and title
 * - Purpose description
 * - "Used by AI for" bullets
 * - Mode-specific emphasis
 * - Completion status
 * - CTA to edit
 */

import { ReactNode } from "react";
import { Check, ChevronRight, AlertCircle, Clock, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  badge,
  badgeVariant = "default",
}: StepCardProps) {
  return (
    <Card
      className={cn(
        "group relative transition-all duration-200 hover:shadow-md",
        isComplete && "border-emerald-500/30 bg-emerald-500/5",
        isEmphasized && !isComplete && "border-primary/30 bg-primary/5 ring-1 ring-primary/10",
        !isComplete && !isEmphasized && "border-border hover:border-border/80"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-4">
          {/* Step Number Circle */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
              isComplete
                ? "bg-emerald-500 text-white"
                : isEmphasized
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isComplete ? (
              <Check className="h-5 w-5" />
            ) : (
              stepNumber
            )}
          </div>

          {/* Title & Purpose */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Icon className={cn(
                "h-4 w-4",
                isComplete ? "text-emerald-600" : isEmphasized ? "text-primary" : "text-muted-foreground"
              )} />
              <h3 className="font-semibold text-base">{title}</h3>
              {isEmphasized && !isComplete && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  Key for {mode}
                </Badge>
              )}
              {badge && (
                <Badge variant={badgeVariant} className="text-[10px]">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{purpose}</p>
          </div>

          {/* Status & CTA */}
          <div className="shrink-0 flex items-center gap-2">
            {isComplete ? (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <Check className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                Needs setup
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(sectionId)}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              {isComplete ? "Edit" : "Set up"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        {/* Used by AI bullets */}
        <div className="ml-14 mt-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3 w-3 text-primary/70" />
            <span className="text-[11px] font-medium text-primary/70 uppercase tracking-wide">
              Your AI uses this to
            </span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {usedByAI.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-muted-foreground/50">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Optional children content */}
        {children && (
          <div className="ml-14 mt-3 pt-3 border-t border-border/50">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
