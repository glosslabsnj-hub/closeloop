import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  variant?: "default" | "elevated" | "interactive" | "work-area";
  noPadding?: boolean;
  /** Use workspace frame with left accent */
  framed?: boolean;
}

/**
 * Executive workspace section card.
 * Work-area variant creates a signature "focus zone" feeling.
 */
export function SectionCard({
  title,
  description,
  children,
  className,
  headerAction,
  variant = "default",
  noPadding = false,
  framed = false,
}: SectionCardProps) {
  const cardContent = (
    <Card
      className={cn(
        variant === "elevated" && "shadow-sm",
        variant === "interactive" && "card-interactive cursor-pointer",
        variant === "work-area" && "work-area-compact",
        className
      )}
    >
      {(title || description) && (
        <CardHeader className={cn(
          "pb-4",
          headerAction && "flex-row items-start justify-between space-y-0"
        )}>
          <div className="space-y-1">
            {title && <CardTitle className="text-base font-medium">{title}</CardTitle>}
            {description && <CardDescription className="text-muted-foreground/60">{description}</CardDescription>}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding && "p-0")}>{children}</CardContent>
    </Card>
  );

  if (framed) {
    return (
      <div className="workspace-frame-subtle">
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
