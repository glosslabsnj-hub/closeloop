import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
    direction?: "up" | "down";
  };
  className?: string;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
}

/**
 * Premium stat card for dashboard metrics.
 * Shows key numbers with optional icon, description, and trend indicator.
 */
export function StatCard({ label, value, icon: Icon, description, trend, className, variant = "default" }: StatCardProps) {
  const TrendIcon = trend?.direction === "down" ? TrendingDown : TrendingUp;

  const variantStyles = {
    default: "",
    primary: "border-primary/20 bg-primary/5",
    success: "border-success/20 bg-success/5",
    warning: "border-warning/20 bg-warning/5",
    destructive: "border-destructive/20 bg-destructive/5",
  };

  return (
    <Card className={cn("border-border/30 bg-card/60 backdrop-blur-sm card-interactive", variantStyles[variant], className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2.5">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <div
              className={cn(
                "p-2 rounded-xl",
                variant === "primary" && "bg-primary/10 text-primary",
                variant === "success" && "bg-success/10 text-success",
                variant === "warning" && "bg-warning/10 text-warning-foreground",
                variant === "destructive" && "bg-destructive/10 text-destructive",
                variant === "default" && "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[28px] font-bold tracking-tight leading-none">{value}</p>

          {description && <p className="text-xs text-muted-foreground">{description}</p>}

          {trend && (
            <div className="flex items-center gap-1 text-xs">
              <TrendIcon
                className={cn(
                  "h-3 w-3",
                  trend.direction === "up" ? "text-success" : "text-destructive"
                )}
              />
              <span
                className={cn(
                  "font-medium",
                  trend.direction === "up" ? "text-success" : "text-destructive"
                )}
              >
                {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
