import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg px-4 py-3 text-sm transition-all duration-200",
        "bg-background",
        "border border-border/40",
        "placeholder:text-muted-foreground/50",
        "focus-visible:outline-none",
        "focus-visible:border-primary/50",
        "focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.3)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:shadow-[0_0_0_3px_hsl(var(--destructive)/0.2)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
