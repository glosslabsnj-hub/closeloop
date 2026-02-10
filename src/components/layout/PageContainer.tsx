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
        "px-6 md:px-10 lg:px-14 pb-14",
        padTop && "pt-8",
        maxWidth === "sm" && "max-w-2xl mx-auto",
        maxWidth === "md" && "max-w-4xl mx-auto",
        maxWidth === "lg" && "max-w-7xl",
        maxWidth === "xl" && "max-w-[1440px]",
        maxWidth === "full" && "w-full",
        className
      )}
    >
      {children}
    </div>
  );
}
