import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  /** Add top padding for pages without a header */
  padTop?: boolean;
}

/**
 * Clean, minimal page container.
 * Linear/Notion-inspired spacing.
 */
export function PageContainer({
  children,
  className,
  maxWidth = "lg",
  padTop = false,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "px-6 md:px-8 lg:px-12 pb-12",
        padTop && "pt-8",
        maxWidth === "sm" && "max-w-2xl mx-auto",
        maxWidth === "md" && "max-w-4xl mx-auto",
        maxWidth === "lg" && "max-w-5xl mx-auto",
        maxWidth === "xl" && "max-w-6xl mx-auto",
        maxWidth === "full" && "w-full",
        className
      )}
    >
      {children}
    </div>
  );
}
