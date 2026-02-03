import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  Settings,
  LogOut,
  Phone,
  PhoneCall,
  Bot,
  Route,
  Briefcase,
  FlaskConical,
  Lock,
  CreditCard,
  Truck,
  UtensilsCrossed,
  BookOpen,
  Clock,
  Cake,
  Stethoscope,
  HelpCircle,
  AlertTriangle,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState, useCallback } from "react";
import { AdminModeSwitcher } from "@/components/admin/AdminModeSwitcher";
import { AdminTenantSwitcher } from "@/components/admin/AdminTenantSwitcher";
import { AdminModeSelector } from "@/components/admin/AdminModeSelector";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredModules?: string[];
  dynamicLabelKey?: "bookingsPageTitle" | "servicesPageTitle";
}

const baseNavItems: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/app/bookings", label: "Bookings", icon: Calendar, requiredModules: ["booking"], dynamicLabelKey: "bookingsPageTitle" },
  { href: "/app/dispatch", label: "Dispatch", icon: Truck, requiredModules: ["dispatch_queue"] },
  { href: "/app/orders", label: "Orders", icon: UtensilsCrossed, requiredModules: ["food_orders"] },
  { href: "/app/reservations", label: "Reservations", icon: Clock, requiredModules: ["reservations"] },
  { href: "/app/catering", label: "Catering", icon: Cake, requiredModules: ["catering"] },
  { href: "/app/medical-intake", label: "Medical Intake", icon: Stethoscope, requiredModules: ["medical_intake"] },
  { href: "/app/business-brain", label: "Business Brain", icon: Bot },
  { href: "/app/integrations", label: "Integrations", icon: Route },
  { href: "/app/simulator", label: "Simulator", icon: FlaskConical },
  { href: "/app/help", label: "Help Center", icon: HelpCircle },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

// Routes that are always accessible (even without subscription)
const alwaysAccessibleRoutes = [
  "/app/settings",
  "/app/go-live",
];

function AppLayoutContent() {
  const { user, tenant, effectiveTenant, signOut, loading, hasActiveSubscription, isSuperAdmin } = useAuth();
  const { enabledModules } = useTenantConfig();
  const terms = useTerminology();
  const { unresolvedCount: conflictsCount } = useKnowledgeConflicts();
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar collapse state with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  // Focus mode state (from Business Brain)
  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem('business-brain-focus-mode') === 'true';
  });

  const toggleSidebar = useCallback(() => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  }, [sidebarCollapsed]);

  // Auto-collapse sidebar when entering Business Brain
  const isBusinessBrain = location.pathname === "/app/business-brain";
  useEffect(() => {
    if (isBusinessBrain && !sidebarCollapsed) {
      setSidebarCollapsed(true);
      localStorage.setItem('sidebar-collapsed', 'true');
    }
  }, [isBusinessBrain]);

  // Listen for focus mode changes from Business Brain
  useEffect(() => {
    const handleFocusMode = (e: CustomEvent) => {
      setFocusMode(e.detail);
    };
    window.addEventListener('business-brain-focus-mode', handleFocusMode as EventListener);
    return () => window.removeEventListener('business-brain-focus-mode', handleFocusMode as EventListener);
  }, []);

  // Keyboard shortcut: Ctrl/Cmd + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Hide sidebar completely in focus mode on Business Brain
  const hideSidebar = isBusinessBrain && focusMode;

  // Super admins bypass subscription gating for testing
  const effectiveHasSubscription = isSuperAdmin || hasActiveSubscription;

  // For super-admin testing, use the effective tenant everywhere in the app shell.
  const displayTenant = isSuperAdmin ? (effectiveTenant ?? tenant) : tenant;

  // Filter nav items based on enabled modules and apply dynamic labels
  const navItems = useMemo(() => {
    return baseNavItems
      .filter(item => {
        if (!item.requiredModules) return true;
        return item.requiredModules.some(mod => enabledModules.includes(mod));
      })
      .map(item => ({
        ...item,
        label: item.dynamicLabelKey ? terms[item.dynamicLabelKey] : item.label,
      }));
  }, [enabledModules, terms]);

  // Get priority mobile nav items based on business mode
  const mobileNavItems = useMemo(() => {
    const prioritized: NavItem[] = [
      { href: "/app/dashboard", label: "Home", icon: LayoutDashboard },
    ];

    // Add mode-specific priority items
    const businessMode = (displayTenant as any)?.business_mode || "service";
    
    if (businessMode === "food" && enabledModules.includes("food_orders")) {
      prioritized.push({ href: "/app/orders", label: terms.bookingsPageTitle, icon: UtensilsCrossed });
    } else if (businessMode === "dispatch" && enabledModules.includes("dispatch_queue")) {
      prioritized.push({ href: "/app/dispatch", label: terms.bookingsPageTitle, icon: Truck });
    } else if (businessMode === "medical" && enabledModules.includes("booking")) {
      prioritized.push({ href: "/app/bookings", label: terms.bookingsPageTitle, icon: Calendar });
    } else if (enabledModules.includes("booking")) {
      prioritized.push({ href: "/app/bookings", label: terms.bookingsPageTitle, icon: Calendar });
    }

    // Always include Inbox (unified: messages, calls, leads)
    prioritized.push({ href: "/app/inbox", label: "Inbox", icon: MessageSquare });

    // Add settings as last item
    prioritized.push({ href: "/app/settings", label: "Settings", icon: Settings });

    return prioritized.slice(0, 5); // Max 5 items for mobile nav
  }, [enabledModules, displayTenant, terms]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Redirect users without a tenant to onboarding (skip for super_admin)
  useEffect(() => {
    if (!loading && user && !tenant && !isSuperAdmin) {
      if (location.pathname !== "/app/onboarding") {
        navigate("/app/onboarding");
      }
    }
  }, [loading, user, tenant, isSuperAdmin, location.pathname, navigate]);

  // Check if user needs to go through go-live (with debounce to prevent race conditions)
  // Super admins bypass this check entirely for testing
  useEffect(() => {
    if (isSuperAdmin) return; // Super admins can access everything
    
    // Skip check if coming from onboarding (give time for subscription to be created)
    const justCompletedOnboarding = sessionStorage.getItem("selectedPlan") !== null;
    if (justCompletedOnboarding) {
      return; // Let onboarding handle the navigation
    }
    
    if (!loading && tenant && !hasActiveSubscription) {
      // If no subscription and not on allowed routes, redirect to go-live
      const isAllowedRoute = alwaysAccessibleRoutes.some(route => 
        location.pathname.startsWith(route)
      );
      if (!isAllowedRoute && location.pathname !== "/app/go-live") {
        navigate("/app/go-live");
      }
    }
  }, [loading, tenant, hasActiveSubscription, isSuperAdmin, location.pathname, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check if current route is accessible (super admins can access everything)
  const isRouteAccessible = effectiveHasSubscription || 
    alwaysAccessibleRoutes.some(route => location.pathname.startsWith(route));

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen app-bg">
        {/* Admin Mode Switcher Banner */}
        <AdminModeSwitcher />
        
        {/* Top Navigation - Mobile First */}
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between px-3 md:px-5">
            <div className="flex items-center gap-2">
              {/* Sidebar Toggle Button - Desktop Only */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="hidden md:flex h-8 w-8 hover:bg-muted/50"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
              
              <Link to="/app/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-soft">
                  <Phone className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-sm hidden sm:inline truncate max-w-[140px]">{displayTenant?.name || "CloseLoop"}</span>
              </Link>
            </div>

            {/* Right side controls - ensure no overflow clipping */}
            <div className="flex items-center gap-1.5 relative z-50">
              {/* Admin Mode Selector and Tenant Switcher - only visible to super admins */}
              {isSuperAdmin && <AdminModeSelector />}
              <AdminTenantSwitcher />
              <NotificationBell />
              
              {/* Profile Dropdown - FIX: Use Portal with proper collision handling */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:ring-2 hover:ring-primary/20 transition-all">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                        {user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  side="bottom"
                  sideOffset={8}
                  collisionPadding={12}
                  avoidCollisions={true}
                  className="w-52 z-[100]"
                >
                  <div className="px-3 py-2.5 border-b border-border/30">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{displayTenant?.name}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate("/app/settings")} className="cursor-pointer py-2.5">
                    <Settings className="mr-2 h-4 w-4 opacity-60" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer py-2.5">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex relative z-10">
          {/* Desktop Sidebar - Collapsible, hidden in focus mode */}
          {!hideSidebar && (
            <aside 
              className={cn(
                "hidden md:flex flex-col fixed left-0 top-14 bottom-0 border-r border-border/40 transition-all duration-300 ease-out z-40",
                "bg-sidebar/95 backdrop-blur-xl",
                sidebarCollapsed ? "w-14" : "w-60"
              )}
            >
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto relative z-10">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                const isLocked = !effectiveHasSubscription && 
                  !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));
                const showBadge = item.href === "/app/business-brain" && conflictsCount > 0;
                
                const navLink = (
                  <Link
                    key={item.href}
                    to={isLocked ? "/app/go-live" : item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 relative",
                      sidebarCollapsed ? "px-2.5 py-2.5 justify-center" : "px-3 py-2.5",
                      isActive
                        ? "bg-primary/12 text-primary border-l-2 border-l-primary ml-[-1px] shadow-[inset_0_0_12px_-4px_hsl(var(--primary)/0.15)]"
                        : isLocked
                          ? "text-muted-foreground/40 cursor-not-allowed"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground hover:border-l-2 hover:border-l-primary/30 hover:ml-[-1px]"
                    )}
                  >
                    <Icon className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                      !isActive && !isLocked && "group-hover:scale-105"
                    )} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {showBadge && (
                          <Badge variant="destructive" size="sm" className="ml-auto">
                            <AlertTriangle className="h-3 w-3" />
                          </Badge>
                        )}
                        {isLocked && <Lock className="h-3.5 w-3.5 ml-auto opacity-40" />}
                      </>
                    )}
                    {sidebarCollapsed && showBadge && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive animate-pulse-soft" />
                    )}
                  </Link>
                );

                // Wrap in tooltip when collapsed
                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          {navLink}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8} className="font-medium">
                        {item.label}
                        {isLocked && " (Locked)"}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navLink;
              })}
            </nav>
            
            {/* Keyboard shortcut hint when expanded */}
            {!sidebarCollapsed && (
              <div className="p-3 border-t border-sidebar-border/30">
                <p className="text-[11px] text-muted-foreground/50 text-center">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted/30 rounded border border-border/20">⌘B</kbd> to collapse
                </p>
              </div>
            )}
          </aside>
          )}

          {/* Mobile Bottom Nav - Higher z-index than content */}
          <nav className="md:hidden mobile-nav-floating safe-area-pb z-40">
            <div className="grid grid-cols-5 h-14">
              {mobileNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                const isLocked = !effectiveHasSubscription && 
                  !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));
                const showBadge = item.href === "/app/dashboard" && conflictsCount > 0;
                
                return (
                  <Link
                    key={item.href}
                    to={isLocked ? "/app/go-live" : item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all duration-200 relative min-h-[44px] active:scale-95",
                      isActive 
                        ? "text-primary" 
                        : isLocked 
                          ? "text-muted-foreground/40" 
                          : "text-muted-foreground"
                    )}
                  >
                    {isActive && (
                      <span className="absolute top-0 w-10 h-0.5 rounded-full bg-primary shadow-glow" />
                    )}
                    <div className="relative">
                      <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                      {showBadge && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive animate-pulse-soft" />
                      )}
                    </div>
                    <span className="truncate text-[10px]">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Page Content - z-index lower than nav */}
          <main 
            className={cn(
              "flex-1 pb-20 md:pb-0 min-h-[calc(100vh-4rem)] transition-all duration-200 ease-in-out relative z-10",
              hideSidebar ? "md:ml-0" : sidebarCollapsed ? "md:ml-14" : "md:ml-60"
            )}
          >
            {isRouteAccessible ? (
              <Outlet />
            ) : (
              <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md text-center shadow-soft-lg">
                  <CardHeader className="pb-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
                      <Lock className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-xl">Subscription Required</CardTitle>
                    <CardDescription className="text-base">
                      Choose a plan to unlock all features and start using CloseLoop.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    <Button onClick={() => navigate("/app/go-live")} className="w-full" size="lg">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Choose a Plan
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate("/app/settings")}
                      className="w-full"
                    >
                      Billing Settings
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Wrap with AdminModeProvider for super admin mode switching
export function AppLayout() {
  return (
    <AdminModeProvider>
      <AppLayoutContent />
    </AdminModeProvider>
  );
}
