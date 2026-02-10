import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface DetailSheetAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  /** Primary action in sticky footer */
  primaryAction?: DetailSheetAction;
  /** Secondary action in sticky footer */
  secondaryAction?: DetailSheetAction;
  /** Additional header-level actions (buttons/dropdowns) */
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Width override */
  width?: "sm" | "md" | "lg";
}

const widthClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
};

export function DetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  badges,
  primaryAction,
  secondaryAction,
  headerActions,
  children,
  className,
  width = "lg",
}: DetailSheetProps) {
  const hasFooter = primaryAction || secondaryAction;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn("p-0 flex flex-col", widthClasses[width], className)}
        side="right"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <SheetHeader className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <SheetTitle className="truncate">{title}</SheetTitle>
                {badges}
              </div>
              {headerActions}
            </div>
            {subtitle && (
              <SheetDescription>{subtitle}</SheetDescription>
            )}
          </SheetHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {children}
        </div>

        {/* Sticky Footer */}
        {hasFooter && (
          <>
            <Separator />
            <div className="sticky bottom-0 bg-background px-6 py-4 flex items-center gap-2">
              {secondaryAction && (
                <Button
                  variant={secondaryAction.variant || "outline"}
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.loading || secondaryAction.disabled}
                  className="gap-2"
                >
                  {secondaryAction.icon}
                  {secondaryAction.label}
                </Button>
              )}
              <div className="flex-1" />
              {primaryAction && (
                <Button
                  variant={primaryAction.variant || "default"}
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.loading || primaryAction.disabled}
                  className="gap-2"
                >
                  {primaryAction.icon}
                  {primaryAction.label}
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * A labeled section within a DetailSheet body.
 * Use to group related fields.
 */
export function DetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

/**
 * A key-value row for displaying metadata in a DetailSheet.
 */
export function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-1.5", className)}>
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value || "—"}</span>
    </div>
  );
}
