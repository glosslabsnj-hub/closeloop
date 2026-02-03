import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg px-4 py-2 text-base ring-offset-background transition-all duration-200",
          "bg-input border border-border/60",
          "shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.2)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/60",
          "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.2),0_0_0_3px_hsl(var(--primary)/0.15)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-sm",
          "aria-[invalid=true]:border-destructive/50 aria-[invalid=true]:shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.2),0_0_0_3px_hsl(var(--destructive)/0.15)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
