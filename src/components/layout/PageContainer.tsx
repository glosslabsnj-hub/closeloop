import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "default" | "wide" | "full";
  animate?: boolean;
}

/**
 * Standardized page container with consistent padding and max-width.
 * Use this as the root element for all app pages.
 */
export function PageContainer({ 
  children, 
  className, 
  maxWidth = "default",
  animate = true,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "p-5 md:p-6 lg:p-8",
        maxWidth === "wide" && "max-w-[1400px] mx-auto",
        maxWidth === "default" && "max-w-[1200px] mx-auto",
        maxWidth === "full" && "w-full",
        animate && "animate-fade-in",
        className
      )}
    >
      {children}
    </div>
  );
}
