import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border-0 px-3 py-1 h-6 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-muted/60 text-foreground/80",
        secondary: "bg-muted/40 text-muted-foreground",
        destructive: "bg-[hsl(0,93%,94%)] text-[hsl(0,74%,42%)]",
        success: "bg-[hsl(138,76%,93%)] text-[hsl(143,64%,24%)]",
        warning: "bg-[hsl(48,96%,89%)] text-[hsl(32,95%,30%)]",
        outline: "text-foreground/70 border border-border/40 bg-transparent",
        muted: "bg-muted/40 text-muted-foreground",
        ghost: "bg-transparent text-muted-foreground",
        primary: "bg-[hsl(219,93%,93%)] text-[hsl(224,76%,48%)]",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px] h-5",
        lg: "px-3.5 py-1.5 text-sm h-7",
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
