import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-border/60 bg-input px-4 py-3 text-sm ring-offset-background transition-all duration-200",
        "shadow-inner-soft",
        "placeholder:text-muted-foreground/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 focus-visible:border-primary/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive/50 aria-[invalid=true]:ring-destructive/20",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
