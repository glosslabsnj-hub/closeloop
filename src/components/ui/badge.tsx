import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border/60 bg-secondary text-secondary-foreground",
        destructive: "border-destructive/30 bg-destructive/12 text-destructive",
        success: "border-success/30 bg-success/12 text-success",
        warning: "border-warning/30 bg-warning/12 text-warning",
        outline: "text-foreground border-border/70 bg-transparent",
        muted: "border-transparent bg-muted text-muted-foreground",
        ghost: "border-transparent bg-transparent text-muted-foreground",
        primary: "border-primary/30 bg-primary/12 text-primary",
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
