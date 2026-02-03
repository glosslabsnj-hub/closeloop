import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Electric cyan gradient with glow
        default: "bg-gradient-to-r from-primary via-[hsl(190,80%,45%)] to-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 active:shadow-lg",
        destructive: "bg-gradient-to-r from-destructive to-[hsl(10,70%,50%)] text-destructive-foreground shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/35 hover:-translate-y-0.5",
        // Outline: Glass effect with cyan border on hover
        outline: "border border-border/60 bg-card/50 backdrop-blur-sm hover:bg-accent/50 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 text-foreground",
        // Secondary: Soft violet panel
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent hover:text-foreground shadow-md shadow-black/20",
        // Ghost: Invisible until hover with subtle glow
        ghost: "text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:shadow-md hover:shadow-primary/5",
        link: "text-primary underline-offset-4 hover:underline hover:text-[hsl(185,90%,60%)]",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
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
