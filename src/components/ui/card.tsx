import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    interactive?: boolean;
    elevated?: boolean;
    glass?: boolean;
  }
>(({ className, interactive, elevated, glass = true, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl text-card-foreground transition-all duration-200",
      glass
        ? [
            "bg-card/80 backdrop-blur-xl",
            "border border-white/[0.08]",
            "shadow-[0_8px_32px_hsl(var(--shadow-dark)/var(--shadow-opacity-dark)),inset_0_1px_0_hsl(var(--inner-glow)/var(--inner-glow-opacity))]",
          ]
        : "bg-card border border-border/30",
      elevated && "shadow-glass-lg",
      interactive && [
        "cursor-pointer",
        "hover:shadow-[0_12px_40px_hsl(var(--shadow-dark)/calc(var(--shadow-opacity-dark)*1.3)),inset_0_1px_0_hsl(var(--inner-glow)/calc(var(--inner-glow-opacity)*1.2))]",
        "hover:-translate-y-0.5",
        "hover:border-white/[0.12]",
      ],
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-base font-medium leading-none tracking-tight", className)}
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
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
