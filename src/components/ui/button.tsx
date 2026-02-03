import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Warm amber gradient, inviting and premium
        default: "bg-gradient-to-r from-primary to-[hsl(38,80%,48%)] text-primary-foreground hover:brightness-110 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/20",
        // Outline: Clean with subtle amber hover
        outline: "border border-border/60 bg-transparent hover:bg-accent/50 hover:border-accent-foreground/20 text-foreground",
        // Secondary: Subtle navy panel
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent hover:text-foreground",
        // Ghost: Invisible until hover
        ghost: "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
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
