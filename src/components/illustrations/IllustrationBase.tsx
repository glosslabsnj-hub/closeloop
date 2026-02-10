import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface IllustrationBaseProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeMap = {
  sm: "w-24 h-24",
  md: "w-32 h-32",
  lg: "w-40 h-40",
};

export function IllustrationBase({
  children,
  className,
  size = "md",
  label = "Illustration",
}: IllustrationBaseProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeMap[size], className)}
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}
