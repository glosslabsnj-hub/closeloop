import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  FlaskConical,
  Lock,
  Truck,
  UtensilsCrossed,
  Clock,
  Cake,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Users,
  BarChart3,
  TrendingUp,
  FileText,
  HelpCircle,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AdminModeSelector } from "@/components/admin/AdminModeSelector";
import { AdminTenantSwitcher } from "@/components/admin/AdminTenantSwitcher";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const SIDEBAR_COLLAPSED_KEY = "closeloop_sidebar_collapsed";

interface AppSidebarProps {
  effectiveTenant: any;
  isSuperAdmin: boolean;
  hasActiveSubscription: boolean;
}

export function AppSidebar({ effectiveTenant, isSuperAdmin, hasActiveSubscription }: AppSidebarProps) {
  const { user, signOut } = useAuth();
  const { enabledModules } = useTenantConfig();
  const terms = useTerminology();
  const { unresolvedCount: conflictsCount } = useKnowledgeConflicts();
  const location = useLocation();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const businessMode = effectiveTenant?.business_mode || "service";

  // Build navigation sections based on business mode and enabled modules
  const navSections: NavSection[] = [];

  // OPERATIONS section - daily workflow items
  const operationsItems: NavItem[] = [
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
  ];

  // Mode-specific operational items
  if (businessMode === "dispatch" && enabledModules.includes("dispatch_queue")) {
    operationsItems.push({ href: "/app/dispatch", label: "Jobs", icon: Truck });
    operationsItems.push({ href: "/app/impound-lot", label: "Impound Lot", icon: Warehouse });
  } else if (businessMode === "food") {
    if (enabledModules.includes("food_orders")) {
      operationsItems.push({ href: "/app/orders", label: "Orders", icon: UtensilsCrossed });
    }
    if (enabledModules.includes("reservations")) {
      operationsItems.push({ href: "/app/reservations", label: "Reservations", icon: Clock });
    }
    if (enabledModules.includes("catering")) {
      operationsItems.push({ href: "/app/catering", label: "Catering", icon: Cake });
    }
  } else if (businessMode === "medical" && enabledModules.includes("medical_intake")) {
    operationsItems.push({ href: "/app/medical-intake", label: "Appointments", icon: Stethoscope });
  } else if (enabledModules.includes("booking")) {
    operationsItems.push({ href: "/app/bookings", label: terms.bookingsPageTitle || "Bookings", icon: Calendar });
  }

  // Add customers and calendar
  operationsItems.push({ href: "/app/customers", label: "Customers", icon: Users });
  if (enabledModules.includes("booking")) {
    operationsItems.push({ href: "/app/calendar", label: "Calendar", icon: Calendar });
  }

  navSections.push({ label: "Operations", items: operationsItems });

  // BUSINESS BRAIN section - single source of truth for all business config
  const brainItems: NavItem[] = [
    { href: "/app/business-brain", label: "Business Brain", icon: Bot, badge: conflictsCount || undefined },
  ];
  navSections.push({ label: "AI & Config", items: brainItems });

  // INSIGHTS section
  const insightsItems: NavItem[] = [
    { href: "/app/reports/roi", label: "Revenue & ROI", icon: TrendingUp },
    { href: "/app/reports/recovery", label: "Lead Recovery", icon: BarChart3 },
    { href: "/app/reports", label: "Reports", icon: FileText },
  ];
  navSections.push({ label: "Insights", items: insightsItems });

  // SETTINGS section - account & technical only (business config is in Brain)
  const settingsItems: NavItem[] = [
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];
  navSections.push({ label: "Account", items: settingsItems });

  const alwaysAccessibleRoutes = ["/app/settings", "/app/go-live"];
  const effectiveHasSubscription = isSuperAdmin || hasActiveSubscription;

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href || 
      (item.href.includes("?") && location.pathname + location.search === item.href);
    const isLocked = !effectiveHasSubscription && !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));

    const linkContent = (
      <Link
        to={isLocked ? "/app/go-live" : item.href}
        className={cn(
          "group relative flex items-center rounded-lg transition-all duration-150",
          isCollapsed ? "p-2.5 justify-center" : "px-3 py-2 gap-3",
          isActive
            ? "bg-primary/10 text-primary"
            : isLocked
              ? "text-muted-foreground/30 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
        )}
      >
        <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-primary")} />

        {!isCollapsed && (
          <span className="text-[13px] font-medium truncate">{item.label}</span>
        )}

        {item.badge && item.badge > 0 && (
          <span className={cn(
            "flex items-center justify-center rounded-full bg-destructive text-destructive-foreground font-semibold",
            isCollapsed
              ? "absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[9px]"
              : "ml-auto h-5 min-w-5 px-1.5 text-[10px]"
          )}>
            {item.badge}
          </span>
        )}

        {isLocked && !isCollapsed && (
          <Lock className="ml-auto h-3.5 w-3.5 opacity-40" />
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="bg-popover border-border">
            <span className={isActive ? "text-primary font-medium" : ""}>{item.label}</span>
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40",
        "bg-sidebar border-r border-sidebar-border",
        "transition-all duration-200 ease-out",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo & Collapse Toggle */}
      <div className={cn(
        "flex items-center h-14 border-b border-sidebar-border shrink-0",
        isCollapsed ? "justify-center px-2" : "px-4 justify-between"
      )}>
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shrink-0">
            <Phone className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">CloseLoop</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="absolute -right-3 top-4 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-muted"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Admin Controls - Only for super admins */}
      {isSuperAdmin && (
        <div className={cn(
          "border-b border-sidebar-border shrink-0",
          isCollapsed ? "p-2" : "p-3"
        )}>
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-warning mb-2">
                <FlaskConical className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Admin Testing</span>
              </div>
              <AdminModeSelector />
              <AdminTenantSwitcher />
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center p-2 rounded-lg bg-warning/10">
                  <FlaskConical className="h-4 w-4 text-warning" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <span className="text-warning font-medium">Admin Mode Active</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.label} className={cn(isCollapsed ? "px-2" : "px-3")}>
            {!isCollapsed && (
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className={cn(
        "border-t border-sidebar-border shrink-0",
        isCollapsed ? "p-2" : "p-3"
      )}>
        {/* Help Link */}
        <NavLink item={{ href: "/app/help", label: "Help & Support", icon: HelpCircle }} />
        
        {/* Simulator - if super admin or for testing */}
        {isSuperAdmin && (
          <NavLink item={{ href: "/app/simulator", label: "Test Calls", icon: FlaskConical }} />
        )}
      </div>

      {/* User Section */}
      <div className={cn(
        "border-t border-sidebar-border shrink-0",
        isCollapsed ? "p-2" : "p-3"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 rounded-lg transition-colors hover:bg-white/[0.04]",
                isCollapsed ? "p-2 justify-center" : "px-3 py-2.5"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                  {user?.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{effectiveTenant?.name || "My Business"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side={isCollapsed ? "right" : "top"} 
            align={isCollapsed ? "start" : "end"}
            className="w-56 mb-2 bg-popover border-border"
          >
            <div className="px-3 py-2.5 border-b border-border/50">
              <p className="text-sm font-medium truncate">{effectiveTenant?.name || "My Business"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => navigate("/app/settings")} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/app/help")} className="cursor-pointer">
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
