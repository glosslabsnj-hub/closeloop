import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Default uses muted, not primary accent
        default: "border-border/30 bg-muted/60 text-foreground/80",
        secondary: "border-border/25 bg-muted/40 text-muted-foreground",
        // Status colors - only for meaning, very muted
        destructive: "border-destructive/20 bg-destructive/6 text-destructive/80",
        success: "border-success/20 bg-success/6 text-success/80",
        warning: "border-warning/20 bg-warning/6 text-warning/80",
        outline: "text-foreground/70 border-border/40 bg-transparent",
        muted: "border-transparent bg-muted/40 text-muted-foreground",
        ghost: "border-transparent bg-transparent text-muted-foreground",
        primary: "border-border/30 bg-muted/50 text-foreground/75",
      },
      size: {
        default: "px-2 py-0.5 text-xs",
        sm: "px-1.5 py-0.5 text-[10px]",
        lg: "px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
