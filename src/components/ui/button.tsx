import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "hover:bg-[hsl(239,84%,60%)] hover:-translate-y-0.5 hover:shadow-md",
          "active:bg-[hsl(239,84%,53%)] active:translate-y-0 active:shadow-sm",
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",
          "hover:bg-destructive/90 hover:shadow-md",
        ].join(" "),
        outline: [
          "border border-[hsl(215,20%,35%)] bg-transparent",
          "text-muted-foreground",
          "hover:bg-[hsl(217,33%,27%)] hover:text-foreground",
        ].join(" "),
        secondary: [
          "border border-[hsl(215,20%,35%)] bg-transparent",
          "text-muted-foreground",
          "hover:bg-[hsl(217,33%,27%)] hover:text-foreground",
        ].join(" "),
        ghost: "text-[hsl(215,20%,65%)] hover:text-muted-foreground hover:bg-transparent",
        accent: [
          "bg-accent-signature/10 text-accent-signature",
          "border border-accent-signature/20",
          "hover:bg-accent-signature/15 hover:border-accent-signature/30",
        ].join(" "),
        link: "text-muted-foreground underline-offset-4 hover:underline hover:text-foreground",
      },
      size: {
        sm: "h-9 px-3 text-sm [&_svg]:size-4",
        default: "h-10 px-4 py-2.5 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-[15px] [&_svg]:size-5",
        icon: "h-10 w-10 rounded-lg bg-[hsl(217,33%,27%)] text-muted-foreground [&_svg]:size-5",
        "icon-sm": "h-8 w-8 rounded-lg [&_svg]:size-4",
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
