import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition - Wraps page content with a fade-in animation
 * Use this to wrap page content for smooth transitions
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={cn("animate-fade-in", className)}>
      {children}
    </div>
  );
}

/**
 * ContentLoader - Shows loading state with optional skeleton
 */
interface ContentLoaderProps {
  loading: boolean;
  skeleton?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Minimum time to show loading (prevents flash) */
  minLoadingTime?: number;
}

export function ContentLoader({ 
  loading, 
  skeleton, 
  children, 
  className 
}: ContentLoaderProps) {
  if (loading) {
    return skeleton ? (
      <div className={className}>{skeleton}</div>
    ) : (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={cn("animate-fade-in", className)}>
      {children}
    </div>
  );
}
