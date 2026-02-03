import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIPreviewCardProps {
  /** The preview text showing what the AI will say */
  preview: string;
  /** Optional title override - defaults to "What the AI will say" */
  title?: string;
  /** Optional subtitle/context for the preview */
  subtitle?: string;
  /** Optional icon override */
  icon?: ReactNode;
  /** Compact mode for inline previews */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * AIPreviewCard - Standardized component showing "What the AI will say"
 * 
 * Used across Business Brain to help business owners understand
 * how their configured data translates to spoken AI responses.
 */
export function AIPreviewCard({
  preview,
  title = "What the AI will say",
  subtitle,
  icon,
  compact = false,
  className,
}: AIPreviewCardProps) {
  if (compact) {
    return (
      <div className={cn(
        "rounded-lg border bg-primary/5 border-primary/20 p-3",
        className
      )}>
        <div className="flex items-start gap-2">
          <div className="shrink-0 mt-0.5">
            {icon || <Volume2 className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary mb-1">{title}</p>
            <p className="text-sm italic text-foreground">"{preview}"</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("bg-primary/5 border-primary/20", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
          {icon || <MessageSquare className="h-4 w-4" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm italic text-foreground leading-relaxed">
          "{preview}"
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * AIPreviewInline - Even more compact inline preview for forms
 */
export function AIPreviewInline({
  preview,
  label = "AI says:",
  className,
}: {
  preview: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("text-sm bg-muted/50 rounded-md px-3 py-2", className)}>
      <span className="text-muted-foreground">{label}</span>{" "}
      <span className="italic">"{preview}"</span>
    </div>
  );
}
