import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-150 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.3)] focus-visible:border-primary/50 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
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
        outline: [
          "border border-white/[0.1] bg-transparent backdrop-blur-sm",
          "text-foreground/80",
          "hover:bg-muted/30 hover:border-white/[0.15]",
        ].join(" "),
        secondary: [
          "bg-muted/50 backdrop-blur-sm text-muted-foreground",
          "hover:bg-muted/70 hover:text-foreground/80",
        ].join(" "),
        ghost: "text-muted-foreground hover:bg-muted/40 hover:text-foreground/80",
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
        sm: "h-8 px-3 text-[13px] [&_svg]:size-3.5",
        default: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-[15px] [&_svg]:size-5",
        icon: "h-10 w-10 [&_svg]:size-4",
        "icon-sm": "h-8 w-8 [&_svg]:size-3.5",
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
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
