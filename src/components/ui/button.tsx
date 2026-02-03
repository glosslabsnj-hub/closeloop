import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: slightly lighter than background, confident but not aggressive
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive/80 text-destructive-foreground hover:bg-destructive/70",
        // Outline: almost blends in
        outline: "border border-border/50 bg-transparent hover:bg-muted/30 text-foreground/80",
        // Secondary: nearly invisible
        secondary: "bg-muted/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground/80",
        // Ghost: invisible until hover
        ghost: "text-muted-foreground hover:bg-muted/30 hover:text-foreground/80",
        link: "text-foreground/70 underline-offset-4 hover:underline hover:text-foreground",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-11 rounded-lg px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
