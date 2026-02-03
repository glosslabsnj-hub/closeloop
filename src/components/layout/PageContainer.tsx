import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "default" | "wide" | "focus" | "full";
  animate?: boolean;
  /** Use focus rail for centered, framed content */
  focusRail?: boolean;
}

/**
 * Executive workspace page container.
 * Focus rail creates the signature "calm desk" feeling.
 */
export function PageContainer({ 
  children, 
  className, 
  maxWidth = "default",
  animate = true,
  focusRail = false,
}: PageContainerProps) {
  const content = (
    <div
      className={cn(
        "p-6 md:p-10 lg:p-12",
        maxWidth === "wide" && "max-w-[1200px] mx-auto",
        maxWidth === "default" && "max-w-[1000px] mx-auto",
        maxWidth === "focus" && "max-w-[880px] mx-auto",
        maxWidth === "full" && "w-full",
        animate && "animate-fade-in",
        className
      )}
    >
      {children}
    </div>
  );

  if (focusRail) {
    return (
      <div className="focus-rail">
        {content}
      </div>
    );
  }

  return content;
}
