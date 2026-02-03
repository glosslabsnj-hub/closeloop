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
 * Generous padding for breathing room.
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
        "p-6 md:p-8 lg:p-10",
        maxWidth === "wide" && "max-w-[1280px] mx-auto",
        maxWidth === "default" && "max-w-[1100px] mx-auto",
        maxWidth === "full" && "w-full",
        animate && "animate-fade-in",
        className
      )}
    >
      {children}
    </div>
  );
}
