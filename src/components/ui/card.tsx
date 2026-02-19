import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-lg border border-border/60 text-card-foreground transition-colors duration-150",
  {
    variants: {
      variant: {
        default: "bg-card",
        elevated: "bg-card shadow-sm",
        hoverable: "bg-card hover:bg-accent cursor-pointer",
        interactive: "bg-card hover:bg-accent cursor-pointer",
        selected: "bg-primary/5 border-primary/20",
        subtle: "bg-muted/30 border-transparent",
      },
      status: {
        none: "",
        success: "border-success/20",
        warning: "border-warning/20",
        error: "border-destructive/20",
      },
    },
    defaultVariants: {
      variant: "default",
      status: "none",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, status, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, status, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5 pb-3", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-sm font-semibold text-foreground tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground/80 leading-relaxed", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-3 border-t border-border/40", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, cardVariants, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
