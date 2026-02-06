import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Settings,
  LogOut,
  Phone,
  Bot,
  X,
  Truck,
  UtensilsCrossed,
  Clock,
  Cake,
  Stethoscope,
  Users,
  TrendingUp,
  HelpCircle,
  Warehouse,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  hasArrow?: boolean;
}

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  effectiveTenant: any;
  isSuperAdmin: boolean;
  hasActiveSubscription: boolean;
}

export function MobileSidebar({ 
  isOpen, 
  onClose, 
  effectiveTenant, 
  isSuperAdmin, 
  hasActiveSubscription 
}: MobileSidebarProps) {
  const { user, signOut } = useAuth();
  const { enabledModules } = useTenantConfig();
  const terms = useTerminology();
  const { unresolvedCount: conflictsCount } = useKnowledgeConflicts();
  const location = useLocation();
  const navigate = useNavigate();

  const businessMode = effectiveTenant?.business_mode || "service";
  const alwaysAccessibleRoutes = ["/app/settings", "/app/go-live"];
  const effectiveHasSubscription = isSuperAdmin || hasActiveSubscription;

  // MAIN NAVIGATION items
  const mainItems: NavItem[] = [
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/inbox", label: "Calls & Sessions", icon: MessageSquare },
  ];

  // Mode-specific items
  if (businessMode === "dispatch" && enabledModules.includes("dispatch_queue")) {
    mainItems.push({ href: "/app/dispatch", label: "Jobs", icon: Truck });
    mainItems.push({ href: "/app/impound-lot", label: "Impound Lot", icon: Warehouse });
  } else if (businessMode === "food") {
    if (enabledModules.includes("food_orders")) {
      mainItems.push({ href: "/app/orders", label: "Orders", icon: UtensilsCrossed });
    }
    if (enabledModules.includes("reservations")) {
      mainItems.push({ href: "/app/reservations", label: "Reservations", icon: Clock });
    }
    if (enabledModules.includes("catering")) {
      mainItems.push({ href: "/app/catering", label: "Catering", icon: Cake });
    }
  } else if (businessMode === "medical" && enabledModules.includes("medical_intake")) {
    mainItems.push({ href: "/app/medical-intake", label: "Appointments", icon: Stethoscope });
  } else if (enabledModules.includes("booking")) {
    mainItems.push({ href: "/app/bookings", label: terms.bookingsPageTitle || "Bookings", icon: Calendar });
  }

  mainItems.push({ href: "/app/customers", label: "Customers", icon: Users });
  mainItems.push({ href: "/app/calendar", label: "Calendar", icon: Calendar });

  // SECONDARY items (with arrows for expandable)
  const secondaryItems: NavItem[] = [
    { href: "/app/business-brain", label: "Business Brain", icon: Bot, badge: conflictsCount || undefined, hasArrow: true },
    { href: "/app/reports/roi", label: "Revenue & ROI", icon: TrendingUp },
    { href: "/app/lead-recovery", label: "Lead Recovery", icon: RefreshCw },
  ];

  // BOTTOM items
  const bottomItems: NavItem[] = [
    { href: "/app/settings", label: "Settings", icon: Settings, hasArrow: true },
    { href: "/app/help", label: "Help & Support", icon: HelpCircle },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    onClose();
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;
    const isLocked = !effectiveHasSubscription && 
      !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));

    return (
      <Link
        key={item.href}
        to={isLocked ? "/app/go-live" : item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 px-4 py-3 text-[15px] transition-colors",
          isActive 
            ? "bg-primary/10 text-primary font-medium" 
            : isLocked
              ? "text-muted-foreground/30"
              : "text-foreground hover:bg-muted/50"
        )}
      >
        <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
        <span className="flex-1">{item.label}</span>
        {item.badge && item.badge > 0 && (
          <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
            {item.badge}
          </span>
        )}
        {item.hasArrow && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </Link>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      {/* Sidebar */}
      <aside className="absolute left-0 top-0 bottom-0 w-80 bg-background border-r border-border flex flex-col animate-slide-up-fade">
        {/* Header with user info */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/20 text-primary text-lg font-semibold">
                {user?.email?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {user?.email?.split('@')[0] || "User"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {effectiveTenant?.name || "My Business"}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto">
          {/* Main Navigation */}
          <div className="py-2">
            {mainItems.map(renderNavItem)}
          </div>
          
          <Separator className="mx-4" />
          
          {/* Secondary Navigation */}
          <div className="py-2">
            {secondaryItems.map(renderNavItem)}
          </div>
          
          <Separator className="mx-4" />
          
          {/* Bottom Navigation */}
          <div className="py-2">
            {bottomItems.map(renderNavItem)}
          </div>
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Log Out
          </Button>
        </div>
      </aside>
    </div>
  );
}
