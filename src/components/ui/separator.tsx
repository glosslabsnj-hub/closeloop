import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "@/lib/utils";

interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  /** Use warm signature accent styling */
  warm?: boolean;
}

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(({ className, orientation = "horizontal", decorative = true, warm = false, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      warm ? "" : "bg-border",
      className
    )}
    style={warm ? {
      background: orientation === "horizontal" 
        ? 'linear-gradient(90deg, hsl(var(--warm-signature) / 0.2), hsl(var(--border) / 0.15) 40%, transparent)'
        : 'linear-gradient(to bottom, hsl(var(--warm-signature) / 0.2), transparent)'
    } : undefined}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
