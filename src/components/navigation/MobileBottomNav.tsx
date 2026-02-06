import { Link, useLocation } from "react-router-dom";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Settings,
  Bot,
  Truck,
  UtensilsCrossed,
  Stethoscope,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface MobileBottomNavProps {
  effectiveTenant: any;
}

export function MobileBottomNav({ effectiveTenant }: MobileBottomNavProps) {
  const { enabledModules } = useTenantConfig();
  const terms = useTerminology();
  const location = useLocation();

  const businessMode = effectiveTenant?.business_mode || "service";

  // Build bottom nav items based on business mode
  const navItems: NavItem[] = [
    { href: "/app/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
  ];

  // Mode-specific center item
  if (businessMode === "dispatch" && enabledModules.includes("dispatch_queue")) {
    navItems.push({ href: "/app/dispatch", label: "Jobs", icon: Truck });
  } else if (businessMode === "food" && enabledModules.includes("food_orders")) {
    navItems.push({ href: "/app/orders", label: "Orders", icon: UtensilsCrossed });
  } else if (businessMode === "medical" && enabledModules.includes("medical_intake")) {
    navItems.push({ href: "/app/medical-intake", label: "Patients", icon: Stethoscope });
  } else if (enabledModules.includes("booking")) {
    navItems.push({ href: "/app/bookings", label: terms.bookingsPageTitle || "Bookings", icon: Calendar });
  } else {
    // Default to Business Brain if no modules
    navItems.push({ href: "/app/business-brain", label: "Setup", icon: Bot });
  }

  // Add AI and Settings
  navItems.push({ href: "/app/business-brain", label: "AI", icon: Bot });
  navItems.push({ href: "/app/settings", label: "Settings", icon: Settings });

  // Limit to 5 items
  const displayItems = navItems.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-background/95 backdrop-blur-lg border-t border-border/50 safe-area-pb">
      <div className="grid grid-cols-5 h-full">
        {displayItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
