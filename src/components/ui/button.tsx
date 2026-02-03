import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Rich cobalt blue with strong shadow
        default: "bg-primary text-primary-foreground border border-primary shadow-[0_2px_8px_hsl(220_75%_45%/0.25),0_4px_16px_hsl(220_75%_45%/0.15)] hover:bg-primary/90 hover:shadow-[0_4px_12px_hsl(220_75%_45%/0.35),0_8px_24px_hsl(220_75%_45%/0.2)] hover:-translate-y-0.5 active:translate-y-0",
        destructive: "bg-destructive text-destructive-foreground border border-destructive shadow-[0_2px_8px_hsl(0_72%_50%/0.25)] hover:bg-destructive/90 hover:shadow-[0_4px_16px_hsl(0_72%_50%/0.3)]",
        // Outline: Clean border with hover lift
        outline: "border-2 border-border bg-card shadow-[0_1px_3px_hsl(220_20%_10%/0.05)] hover:bg-secondary hover:border-primary/40 hover:shadow-[0_2px_8px_hsl(220_20%_10%/0.08)] text-foreground",
        // Secondary: Soft gray panel
        secondary: "bg-secondary text-secondary-foreground border border-border/50 shadow-[0_1px_2px_hsl(220_20%_10%/0.04)] hover:bg-secondary/80 hover:shadow-[0_2px_6px_hsl(220_20%_10%/0.06)]",
        // Ghost: Minimal with subtle hover
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-lg px-7 text-base",
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
