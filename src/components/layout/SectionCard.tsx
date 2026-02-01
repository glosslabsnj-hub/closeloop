import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  variant?: "default" | "elevated" | "interactive";
  noPadding?: boolean;
}

/**
 * Standardized card component for page sections.
 * Provides consistent spacing and optional header.
 */
export function SectionCard({
  title,
  description,
  children,
  className,
  headerAction,
  variant = "default",
  noPadding = false,
}: SectionCardProps) {
  return (
    <Card
      className={cn(
        variant === "elevated" && "shadow-soft hover:shadow-soft-lg transition-shadow duration-200",
        variant === "interactive" && "card-interactive cursor-pointer",
        className
      )}
    >
      {(title || description) && (
        <CardHeader className={cn(headerAction && "flex-row items-start justify-between space-y-0")}>
          <div className="space-y-1.5">
            {title && <CardTitle className="text-lg">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding && "p-0")}>{children}</CardContent>
    </Card>
  );
}
