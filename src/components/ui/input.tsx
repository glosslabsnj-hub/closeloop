import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg px-3.5 py-2 text-base ring-offset-background transition-all duration-150",
          "bg-input border border-border/70",
          "shadow-inner-soft",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/60",
          "focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/15",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-sm",
          "aria-[invalid=true]:border-destructive/70 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/15",
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
