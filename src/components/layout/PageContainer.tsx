import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "default" | "wide" | "full" | "narrow";
}

/**
 * Standardized page container with consistent padding and max-width.
 * Use this as the root element for all app pages.
 * 
 * Spacing follows 8px rhythm:
 * - Mobile: 16px (p-4)
 * - Tablet: 24px (p-6)
 * - Desktop: 32px (p-8)
 */
export function PageContainer({ children, className, maxWidth = "default" }: PageContainerProps) {
  return (
    <div
      className={cn(
        "p-4 md:p-6 lg:p-8 animate-fade-in",
        maxWidth === "narrow" && "max-w-3xl mx-auto",
        maxWidth === "default" && "max-w-screen-xl mx-auto",
        maxWidth === "wide" && "max-w-screen-2xl mx-auto",
        maxWidth === "full" && "w-full",
        className
      )}
    >
      {children}
    </div>
  );
}
