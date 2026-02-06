/**
 * Premium App Sidebar
 * 
 * Clean, modern navigation with:
 * - Purple accent active states with glow
 * - Collapsible with icons-only mode
 * - User card with dropdown at bottom
 * - Cmd+K shortcut indicator
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Phone,
  Users,
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
  Settings,
  HelpCircle,
  LogOut,
  Warehouse,
  Calendar,
  Sparkles,
  Command,
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
  emphasized?: boolean;
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

  // Build navigation sections
  const navSections: NavSection[] = [];

  // OVERVIEW section
  const overviewItems: NavItem[] = [
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/calls", label: "Calls", icon: Phone },
    { href: "/app/customers", label: "Customers", icon: Users },
  ];
  navSections.push({ label: "Overview", items: overviewItems });

  // OPERATIONS section - mode-specific
  const operationsItems: NavItem[] = [
    { href: "/app/business-brain", label: "Business Brain", icon: Sparkles, badge: conflictsCount || undefined, emphasized: true },
  ];

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

  navSections.push({ label: "Operations", items: operationsItems });

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
          "group relative flex items-center rounded-lg transition-all duration-200",
          isCollapsed ? "p-2.5 justify-center" : "px-3 py-2.5 gap-3",
          isActive
            ? "bg-primary/15 text-primary border-l-[3px] border-primary shadow-[inset_0_0_20px_hsl(var(--primary)/0.15)]"
            : isLocked
              ? "text-muted-foreground/30 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
          item.emphasized && !isActive && "text-foreground/80"
        )}
        style={isActive && !isCollapsed ? { marginLeft: '-3px' } : undefined}
      >
        <Icon className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          isActive && "text-primary",
          item.emphasized && !isActive && "text-primary/70"
        )} />

        {!isCollapsed && (
          <span className={cn(
            "text-[13px] font-medium truncate",
            item.emphasized && "font-semibold"
          )}>
            {item.label}
          </span>
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
          <TooltipContent side="right" sideOffset={12} className="bg-popover border-border">
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

  // Get subscription tier label
  const planLabel = effectiveTenant?.subscription_tier === "pro" ? "Pro Plan" : 
                    effectiveTenant?.subscription_tier === "starter" ? "Starter" : "Free";

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40",
        "bg-sidebar border-r border-sidebar-border",
        "transition-all duration-200 ease-out",
        isCollapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo Header */}
      <div className={cn(
        "flex items-center h-16 border-b border-sidebar-border shrink-0",
        isCollapsed ? "justify-center px-2" : "px-4 justify-between"
      )}>
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold tracking-tight">CloseLoop</p>
                {/* Cmd+K indicator */}
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/50 border border-border/50">
                  <Command className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">K</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">{planLabel}</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="absolute -right-3 top-5 h-6 w-6 rounded-full border border-border bg-card shadow-md hover:bg-muted"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Admin Controls */}
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
              <TooltipContent side="right" sideOffset={12}>
                <span className="text-warning font-medium">Admin Mode Active</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 space-y-6">
        {navSections.map((section) => (
          <div key={section.label} className={cn(isCollapsed ? "px-2" : "px-3")}>
            {!isCollapsed && (
              <p className="px-3 mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className={cn("mx-4 h-px bg-sidebar-border/50", isCollapsed && "mx-2")} />

      {/* Bottom Links */}
      <div className={cn(
        "shrink-0 py-3",
        isCollapsed ? "px-2" : "px-3"
      )}>
        <div className="space-y-1">
          <NavLink item={{ href: "/app/settings", label: "Settings", icon: Settings }} />
          <NavLink item={{ href: "/app/help", label: "Help & Support", icon: HelpCircle }} />
        </div>
        
        {isSuperAdmin && (
          <div className="mt-2">
            <NavLink item={{ href: "/app/simulator", label: "Test Calls", icon: FlaskConical }} />
          </div>
        )}
      </div>

      {/* User Card */}
      <div className={cn(
        "border-t border-sidebar-border shrink-0",
        isCollapsed ? "p-2" : "p-3"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 rounded-xl transition-all duration-150",
                "hover:bg-white/[0.04] active:scale-[0.98]",
                isCollapsed ? "p-2 justify-center" : "px-3 py-3"
              )}
            >
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-sm font-semibold">
                  {user?.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold truncate">{effectiveTenant?.name || "My Business"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              )}
              {!isCollapsed && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side={isCollapsed ? "right" : "top"} 
            align={isCollapsed ? "start" : "end"}
            className="w-56 mb-2 bg-popover/95 backdrop-blur-xl border-border"
          >
            <div className="px-3 py-3 border-b border-border/50">
              <p className="text-sm font-semibold truncate">{effectiveTenant?.name || "My Business"}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
            </div>
            <div className="py-1">
              <DropdownMenuItem onClick={() => navigate("/app/settings")} className="cursor-pointer py-2">
                <Settings className="mr-2.5 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/app/help")} className="cursor-pointer py-2">
                <HelpCircle className="mr-2.5 h-4 w-4" />
                Help & Support
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer py-2 text-destructive focus:text-destructive">
              <LogOut className="mr-2.5 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
