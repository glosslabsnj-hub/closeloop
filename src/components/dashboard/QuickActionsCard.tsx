import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
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
  const { businessMode, enabledModules } = useTenantConfig();
  const terms = useTerminology();

  const getActions = (): QuickAction[] => {
    const actions: QuickAction[] = [];

    // Mode-specific primary actions
    switch (businessMode) {
      case "food":
        if (enabledModules.includes("food_orders")) {
          actions.push({ label: terms.viewBookings, icon: UtensilsCrossed, href: "/app/orders" });
        }
        if (enabledModules.includes("reservations")) {
          actions.push({ label: "Reservations", icon: Clock, href: "/app/reservations" });
        }
        break;
      case "dispatch":
        actions.push({ label: terms.viewBookings, icon: Truck, href: "/app/dispatch" });
        break;
      case "service":
      case "medical":
      case "general":
      default:
        if (enabledModules.includes("booking")) {
          actions.push({ label: terms.viewBookings, icon: Calendar, href: "/app/bookings" });
        }
        break;
    }

    // Common actions
    actions.push({ label: "Test AI", icon: FlaskConical, href: "/app/simulator", variant: "outline" });
    actions.push({ label: "Add Knowledge", icon: Bot, href: "/app/business-brain", variant: "outline" });

    return actions.slice(0, 4);
  };

  const actions = getActions();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Common tasks you can do right now
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.variant || "secondary"}
              className="w-full justify-start gap-2 h-10"
              onClick={() => navigate(action.href)}
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
