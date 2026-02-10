import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useTerminology } from "@/hooks/useTerminology";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, MessageSquare, Calendar, Settings, LogOut, Bot,
  Route, FlaskConical, Lock, CreditCard, Truck, UtensilsCrossed, Clock, Cake,
  Stethoscope, HelpCircle, Search, Menu, X, FileText, BarChart3,
  Warehouse, Users, AudioWaveform, PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState, useCallback } from "react";
import { AdminModeSwitcher } from "@/components/admin/AdminModeSwitcher";
import { AdminTenantSwitcher } from "@/components/admin/AdminTenantSwitcher";
import { AdminModeSelector } from "@/components/admin/AdminModeSelector";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { DispatchJobListener } from "@/components/notifications/DispatchJobListener";
import { BRAND } from "@/config/brand";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  separator?: "before";
}

const alwaysAccessibleRoutes = ["/app/settings", "/app/go-live"];

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 48;
const TOPBAR_HEIGHT = 44;
const AUTO_COLLAPSE_BREAKPOINT = 1280;

function AppLayoutContent() {
  const { user, tenant, effectiveTenant, signOut, loading, hasActiveSubscription, isSuperAdmin } = useAuth();
  const { enabledModules } = useTenantConfig();
  const caps = useCapabilities();
  const terms = useTerminology();
  const { unresolvedCount: conflictsCount } = useKnowledgeConflicts();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth >= AUTO_COLLAPSE_BREAKPOINT;
    return true;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const effectiveHasSubscription = isSuperAdmin || hasActiveSubscription;
  const displayTenant = isSuperAdmin ? (effectiveTenant ?? tenant) : tenant;

  // Auto-collapse sidebar on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < AUTO_COLLAPSE_BREAKPOINT) {
        setSidebarExpanded(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Build nav items
  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
    ];

    // Module-gated items — with separator before
    const moduleItems: NavItem[] = [];
    if (enabledModules.includes("booking")) {
      moduleItems.push({ href: "/app/bookings", label: terms.bookingsPageTitle || "Bookings", icon: Calendar });
    }
    if (caps.hasDispatchQueue) {
      moduleItems.push({ href: "/app/dispatch", label: "Dispatch", icon: Truck });
    }
    if (caps.hasImpoundLot) {
      moduleItems.push({ href: "/app/impound-lot", label: "Impound Lot", icon: Warehouse });
    }
    if (caps.hasFleetManagement) {
      moduleItems.push({ href: "/app/fleet", label: "Fleet", icon: Users });
    }
    if (enabledModules.includes("food_orders")) {
      moduleItems.push({ href: "/app/orders", label: "Orders", icon: UtensilsCrossed });
    }
    if (enabledModules.includes("reservations")) {
      moduleItems.push({ href: "/app/reservations", label: "Reservations", icon: Clock });
    }
    if (enabledModules.includes("catering")) {
      moduleItems.push({ href: "/app/catering", label: "Catering", icon: Cake });
    }
    if (enabledModules.includes("medical_intake")) {
      moduleItems.push({ href: "/app/medical-intake", label: "Patients", icon: Stethoscope });
    }
    moduleItems.push({ href: "/app/estimates", label: "Estimates", icon: FileText });

    if (moduleItems.length > 0) {
      moduleItems[0].separator = "before";
    }
    items.push(...moduleItems);

    // Configure section — with separator
    const configItems: NavItem[] = [
      { href: "/app/business-brain", label: "Business Brain", icon: Bot, badge: conflictsCount || undefined, separator: "before" },
      { href: "/app/integrations", label: "Integrations", icon: Route },
      { href: "/app/simulator", label: "Test Calls", icon: FlaskConical },
      { href: "/app/reports/roi", label: "Reports", icon: BarChart3 },
    ];
    items.push(...configItems);

    return items;
  }, [enabledModules, caps, terms, conflictsCount]);

  // Footer items (pinned to bottom)
  const footerItems: NavItem[] = [
    { href: "/app/settings", label: "Settings", icon: Settings },
    { href: "/app/help", label: "Help", icon: HelpCircle },
  ];

  // Mobile bottom nav
  const mobileNavItems = useMemo(() => {
    const items: NavItem[] = [
      { href: "/app/dashboard", label: "Home", icon: LayoutDashboard },
      { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
    ];
    if (caps.isFoodBusiness && caps.hasFoodOrders) {
      items.push({ href: "/app/orders", label: "Orders", icon: UtensilsCrossed });
    } else if (caps.isDispatchBusiness && caps.hasDispatchQueue) {
      items.push({ href: "/app/dispatch", label: "Jobs", icon: Truck });
    } else if (caps.hasBooking) {
      items.push({ href: "/app/bookings", label: terms.bookingsPageTitle || "Bookings", icon: Calendar });
    }
    items.push({ href: "/app/business-brain", label: "Setup", icon: Bot });
    items.push({ href: "/app/settings", label: "Settings", icon: Settings });
    return items.slice(0, 5);
  }, [enabledModules, caps, terms]);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !tenant && !isSuperAdmin) {
      if (location.pathname !== "/app/onboarding") navigate("/app/onboarding");
    }
  }, [loading, user, tenant, isSuperAdmin, location.pathname, navigate]);

  useEffect(() => {
    if (isSuperAdmin) return;
    const justCompletedOnboarding = sessionStorage.getItem("selectedPlan") !== null;
    if (justCompletedOnboarding) return;
    if (!loading && tenant && !hasActiveSubscription) {
      const isAllowedRoute = alwaysAccessibleRoutes.some(route => location.pathname.startsWith(route));
      if (!isAllowedRoute && location.pathname !== "/app/go-live") {
        navigate("/app/go-live");
      }
    }
  }, [loading, tenant, hasActiveSubscription, isSuperAdmin, location.pathname, navigate]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const toggleSidebar = useCallback(() => setSidebarExpanded(prev => !prev), []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const isRouteAccessible = effectiveHasSubscription || alwaysAccessibleRoutes.some(route => location.pathname.startsWith(route));

  // ─── Sidebar Nav Link ───
  const SidebarLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href || (item.href !== "/app/dashboard" && location.pathname.startsWith(item.href));
    const isLocked = !effectiveHasSubscription && !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));

    const linkContent = (
      <Link
        to={isLocked ? "/app/go-live" : item.href}
        className={cn(
          "nav-item group",
          isActive && "nav-item-active",
          isLocked && "opacity-40 pointer-events-auto",
          !sidebarExpanded && "justify-center px-0"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} strokeWidth={1.75} />
        {sidebarExpanded && (
          <>
            <span className="truncate text-[13px]">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="count-badge ml-auto">{item.badge}</span>
            )}
            {isLocked && <Lock className="h-3 w-3 ml-auto opacity-40" />}
          </>
        )}
      </Link>
    );

    if (!sidebarExpanded) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <span className="text-xs">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="count-badge ml-2">{item.badge}</span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const adminBarHeight = isSuperAdmin ? 40 : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Super Admin Bar ─── */}
      {isSuperAdmin && (
        <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-10 bg-background/95 backdrop-blur-lg border-b border-border/20 items-center justify-end px-4 gap-3">
          <div className="flex items-center gap-2 text-warning mr-2">
            <FlaskConical className="h-3.5 w-3.5" />
            <span className="text-micro">Admin Testing</span>
          </div>
          <AdminModeSelector />
          <AdminTenantSwitcher />
        </header>
      )}

      {/* ─── Desktop Sidebar ─── */}
      <aside
        className={cn(
          "hidden md:flex fixed left-0 z-40 flex-col border-r border-border/30 bg-sidebar transition-all duration-200 ease-out overflow-hidden",
          sidebarExpanded ? "w-[240px]" : "w-[48px]"
        )}
        style={{
          top: `${adminBarHeight}px`,
          height: `calc(100vh - ${adminBarHeight}px)`,
        }}
      >
        {/* Sidebar Header — Logo + tenant */}
        <div className={cn(
          "flex items-center shrink-0 border-b border-sidebar-border/50",
          sidebarExpanded ? "px-4 py-4 gap-3" : "px-0 py-4 justify-center"
        )}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
            <AudioWaveform className="h-4 w-4 text-primary-foreground" />
          </div>
          {sidebarExpanded && (
            <span className="text-sm font-semibold text-foreground truncate">
              {displayTenant?.name || BRAND.name}
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2 space-y-0.5">
          {navItems.map((item, idx) => (
            <div key={item.href}>
              {item.separator === "before" && (
                <div className={cn("nav-divider", !sidebarExpanded && "mx-1")} />
              )}
              <SidebarLink item={item} />
            </div>
          ))}
        </nav>

        {/* Footer — Settings + Help */}
        <div className="shrink-0 border-t border-sidebar-border/50 py-2 px-2 space-y-0.5">
          {footerItems.map((item) => (
            <SidebarLink key={item.href} item={item} />
          ))}
        </div>
      </aside>

      {/* ─── Desktop Top Bar (slim, 44px) ─── */}
      <header
        className={cn(
          "hidden md:flex fixed right-0 z-30 h-[44px] bg-background/80 backdrop-blur-xl border-b border-border/20 items-center px-4 gap-3"
        )}
        style={{
          top: `${adminBarHeight}px`,
          left: sidebarExpanded ? `${SIDEBAR_WIDTH}px` : `${SIDEBAR_COLLAPSED_WIDTH}px`,
          transition: "left 200ms ease-out",
        }}
      >
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 transition-colors">
            <Search className="h-4 w-4" />
          </button>
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center rounded-full transition-colors hover:bg-muted/30 p-0.5 ml-1">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {user.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2.5 border-b border-border/50">
                <p className="text-sm font-medium truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground truncate">{displayTenant?.name}</p>
              </div>
              <DropdownMenuItem onClick={() => navigate("/app/settings")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/app/help")} className="cursor-pointer">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ─── Mobile Header ─── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background/95 backdrop-blur-lg border-b border-border/20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-9 w-9">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <AudioWaveform className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">{displayTenant?.name || BRAND.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">{user.email?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2.5">
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ─── Mobile Slide Menu (hamburger sheet) ─── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-background border-r border-border/20 overflow-y-auto"
            >
              <div className="p-4 border-b border-border/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <AudioWaveform className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-semibold">{displayTenant?.name || BRAND.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <nav className="p-3 space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <div key={item.href}>
                      {item.separator === "before" && <div className="nav-divider" />}
                      <Link
                        to={item.href}
                        className={cn(
                          "nav-item",
                          isActive && "nav-item-active"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isActive && "text-primary")} strokeWidth={1.75} />
                        <span className="text-[13px]">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className="count-badge ml-auto">{item.badge}</span>
                        )}
                      </Link>
                    </div>
                  );
                })}
                <div className="nav-divider" />
                {footerItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn("nav-item", isActive && "nav-item-active")}
                    >
                      <Icon className={cn("h-4 w-4", isActive && "text-primary")} strokeWidth={1.75} />
                      <span className="text-[13px]">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Mobile Bottom Nav ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 mobile-nav">
        <div className="grid grid-cols-5 h-full">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "mobile-nav-item",
                  isActive && "mobile-nav-item-active"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.75} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ─── Main Content ─── */}
      <main
        className={cn("flex-1 min-h-screen transition-[margin] duration-200 ease-out")}
        style={{
          marginLeft: isMobile ? 0 : (sidebarExpanded ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH),
          paddingTop: isMobile ? 56 : (adminBarHeight + TOPBAR_HEIGHT),
          paddingBottom: isMobile ? 72 : 0,
        }}
      >
        {isRouteAccessible ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="p-6 flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md text-center">
              <CardHeader className="pb-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
                  <Lock className="h-7 w-7 text-muted-foreground" />
                </div>
                <CardTitle>Subscription Required</CardTitle>
                <CardDescription className="mt-2">Choose a plan to unlock all features.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => navigate("/app/go-live")} className="w-full" size="lg">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Choose a Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export function AppLayout() {
  return (
    <AdminModeProvider>
      <DispatchJobListener />
      <AppLayoutContent />
    </AdminModeProvider>
  );
}
