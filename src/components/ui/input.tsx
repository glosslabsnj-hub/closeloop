import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl px-4 py-2.5 text-base ring-offset-background transition-all duration-150",
          // Glass morphism background
          "bg-muted/50 dark:bg-black/20 backdrop-blur-sm",
          "border border-white/[0.08]",
          // Neumorphic inset shadow
          "shadow-[inset_0_1px_2px_hsl(var(--shadow-dark)/calc(var(--shadow-opacity-dark)*0.3))]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/50",
          // Focus state with glow
          "focus-visible:outline-none",
          "focus-visible:border-primary/50",
          "focus-visible:ring-2 focus-visible:ring-primary/20",
          "focus-visible:shadow-[inset_0_1px_2px_hsl(var(--shadow-dark)/calc(var(--shadow-opacity-dark)*0.3)),0_0_0_3px_hsl(var(--primary)/0.1)]",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "md:text-sm",
          "aria-[invalid=true]:border-destructive/50 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/20",
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
