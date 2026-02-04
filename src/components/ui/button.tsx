import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Glass morphism with inner glow and hover shadow
        default: [
          "bg-primary text-primary-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:bg-primary/90",
          "hover:shadow-[0_4px_12px_hsl(var(--primary)/0.3),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]",
          "active:scale-[0.98]",
        ].join(" "),
        destructive: [
          "bg-destructive/80 text-destructive-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]",
          "hover:bg-destructive/70",
          "hover:shadow-[0_4px_12px_hsl(var(--destructive)/0.25)]",
        ].join(" "),
        // Outline: Glass border effect
        outline: [
          "border border-white/[0.1] bg-transparent backdrop-blur-sm",
          "text-foreground/80",
          "hover:bg-muted/30 hover:border-white/[0.15]",
        ].join(" "),
        // Secondary: Subtle glass
        secondary: [
          "bg-muted/50 backdrop-blur-sm text-muted-foreground",
          "hover:bg-muted/70 hover:text-foreground/80",
        ].join(" "),
        // Ghost: invisible until hover
        ghost: "text-muted-foreground hover:bg-muted/40 hover:text-foreground/80",
        // Glass: Full glass morphism effect
        glass: [
          "bg-white/10 dark:bg-white/5 backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "text-foreground",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
          "hover:bg-white/15 dark:hover:bg-white/10",
          "hover:border-white/25 dark:hover:border-white/15",
        ].join(" "),
        link: "text-foreground/70 underline-offset-4 hover:underline hover:text-foreground",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-6",
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
