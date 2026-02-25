import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useIndustryContext } from "@/hooks/useIndustryContext";
import { 
  Calendar, 
  FlaskConical, 
  Plus, 
  Bot,
  UtensilsCrossed,
  Truck,
  Clock,
  Zap,
} from "lucide-react";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  href: string;
  variant?: "default" | "outline" | "secondary";
}

export function QuickActionsCard() {
  const navigate = useNavigate();
  const { _businessMode, _enabledModules } = useTenantConfig();
  const caps = useCapabilities();
  const { terms } = useIndustryContext();

  const getActions = (): QuickAction[] => {
    const actions: QuickAction[] = [];

    // Capability-based primary actions
    if (caps.hasFoodOrders) {
      actions.push({ label: terms.viewBookings, icon: UtensilsCrossed, href: "/app/orders" });
    }
    if (caps.hasReservations) {
      actions.push({ label: "Reservations", icon: Clock, href: "/app/reservations" });
    }
    if (caps.hasDispatchQueue && !caps.hasFoodOrders) {
      actions.push({ label: terms.viewBookings, icon: Truck, href: "/app/dispatch" });
    }
    if (caps.hasBooking && !caps.hasFoodOrders && !caps.hasDispatchQueue) {
      actions.push({ label: terms.viewBookings, icon: Calendar, href: "/app/bookings" });
    }

    // Common actions
    actions.push({ label: "Test AI", icon: FlaskConical, href: "/app/simulator", variant: "outline" });
    actions.push({ label: "Add Knowledge", icon: Bot, href: "/app/business-brain", variant: "outline" });

    return actions.slice(0, 4);
  };

  const actions = getActions();

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-primary" />
          </div>
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 px-4 pb-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.variant || "secondary"}
              className={cn(
                "w-full justify-start gap-2.5 h-9 text-sm font-normal hover:translate-x-0.5 transition-all",
                action.variant === "outline" && "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => navigate(action.href)}
            >
              <Icon className="h-4 w-4 opacity-70" />
              {action.label}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
