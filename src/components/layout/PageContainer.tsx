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
        "p-4 md:p-5 lg:p-6",
        maxWidth === "wide" && "max-w-screen-2xl mx-auto",
        maxWidth === "default" && "max-w-screen-xl mx-auto",
        maxWidth === "full" && "w-full",
        animate && "animate-fade-in",
        className
      )}
    >
      {children}
    </div>
  );
}
