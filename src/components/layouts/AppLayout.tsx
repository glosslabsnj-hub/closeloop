import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useTerminology } from "@/hooks/useTerminology";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Settings,
  LogOut,
  Bot,
  Route,
  FlaskConical,
  Lock,
  CreditCard,
  Truck,
  UtensilsCrossed,
  Clock,
  Cake,
  Stethoscope,
  HelpCircle,
  Search,
  Menu,
  X,
  FileText,
  BarChart3,
  Warehouse,
  Users,
  AudioWaveform,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
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
}

// Routes that are always accessible (even without subscription)
const alwaysAccessibleRoutes = ["/app/settings", "/app/go-live"];

const MAX_VISIBLE_NAV = 8;

function AppLayoutContent() {
  const { user, tenant, effectiveTenant, signOut, loading, hasActiveSubscription, isSuperAdmin } = useAuth();
  const { enabledModules } = useTenantConfig();
  const caps = useCapabilities();
  const terms = useTerminology();
  const { unresolvedCount: conflictsCount } = useKnowledgeConflicts();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const effectiveHasSubscription = isSuperAdmin || hasActiveSubscription;
  const displayTenant = isSuperAdmin ? (effectiveTenant ?? tenant) : tenant;

  // Flatten navigation - no groups, just a clean list
  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
    ];

    // Add enabled modules
    if (enabledModules.includes("booking")) {
      items.push({ href: "/app/bookings", label: terms.bookingsPageTitle || "Bookings", icon: Calendar });
    }
    if (caps.hasDispatchQueue) {
      items.push({ href: "/app/dispatch", label: "Dispatch", icon: Truck });
    }
    if (caps.hasImpoundLot) {
      items.push({ href: "/app/impound-lot", label: "Impound Lot", icon: Warehouse });
    }
    if (caps.hasFleetManagement) {
      items.push({ href: "/app/fleet", label: "Fleet", icon: Users });
    }
    if (enabledModules.includes("food_orders")) {
      items.push({ href: "/app/orders", label: "Orders", icon: UtensilsCrossed });
    }
    if (enabledModules.includes("reservations")) {
      items.push({ href: "/app/reservations", label: "Reservations", icon: Clock });
    }
    if (enabledModules.includes("catering")) {
      items.push({ href: "/app/catering", label: "Catering", icon: Cake });
    }
    if (enabledModules.includes("medical_intake")) {
      items.push({ href: "/app/medical-intake", label: "Patients", icon: Stethoscope });
    }

    // Business features
    items.push({ href: "/app/estimates", label: "Estimates", icon: FileText });

    // Configure items
    items.push({ href: "/app/business-brain", label: "Business Brain", icon: Bot, badge: conflictsCount || undefined });
    items.push({ href: "/app/integrations", label: "Integrations", icon: Route });
    items.push({ href: "/app/simulator", label: "Test Calls", icon: FlaskConical });
    items.push({ href: "/app/reports/roi", label: "Reports", icon: BarChart3 });

    return items;
  }, [enabledModules, caps, terms, conflictsCount]);

  // Split nav items into visible + overflow
  const visibleNavItems = navItems.length > MAX_VISIBLE_NAV ? navItems.slice(0, MAX_VISIBLE_NAV - 1) : navItems;
  const overflowNavItems = navItems.length > MAX_VISIBLE_NAV ? navItems.slice(MAX_VISIBLE_NAV - 1) : [];

  // Mobile nav - simplified
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const isRouteAccessible = effectiveHasSubscription || alwaysAccessibleRoutes.some(route => location.pathname.startsWith(route));

  const TopNavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;
    const isLocked = !effectiveHasSubscription && !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));

    return (
      <Link
        to={isLocked ? "/app/go-live" : item.href}
        className={cn(
          "relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-primary/10 text-foreground"
            : isLocked
              ? "text-muted-foreground/30 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
        <span className="truncate">{item.label}</span>
        {item.badge && item.badge > 0 && (
          <span className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold">
            {item.badge}
          </span>
        )}
        {isLocked && <Lock className="h-3 w-3 opacity-40" />}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Super Admin Bar — slim bar above main nav */}
      {isSuperAdmin && (
        <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-10 bg-background/95 backdrop-blur-lg border-b border-border/20 items-center justify-end px-4 gap-3">
          <div className="flex items-center gap-2 text-warning mr-2">
            <FlaskConical className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Admin Testing</span>
          </div>
          <AdminModeSelector />
          <AdminTenantSwitcher />
        </header>
      )}

      {/* Desktop Top Navigation Bar */}
      <header className={cn(
        "hidden md:flex fixed left-0 right-0 z-40 h-14 bg-background/95 backdrop-blur-lg border-b border-border/20 items-center px-4 gap-4",
        isSuperAdmin ? "top-10" : "top-0"
      )}>
        {/* Left: Logo */}
        <Link to="/app/dashboard" className="flex items-center gap-2.5 shrink-0 mr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
            <AudioWaveform className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">{displayTenant?.name || BRAND.name}</span>
        </Link>

        {/* Center: Nav links */}
        <nav className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-thin">
          {visibleNavItems.map((item) => (
            <TopNavLink key={item.href} item={item} />
          ))}

          {/* More dropdown for overflow items */}
          {overflowNavItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  overflowNavItems.some(i => location.pathname === i.href)
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}>
                  More
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {overflowNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <DropdownMenuItem
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className={cn("cursor-pointer", isActive && "bg-primary/10")}
                    >
                      <Icon className={cn("mr-2 h-4 w-4", isActive && "text-primary")} />
                      {item.label}
                      {item.badge && item.badge > 0 && (
                        <span className="ml-auto flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Right: Search, Notifications, Avatar */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30 transition-colors">
            <Search className="h-4 w-4" />
          </button>
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center rounded-full transition-colors hover:bg-muted/30 p-1">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
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

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background/95 backdrop-blur-lg border-b border-border/20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-9 w-9"
          >
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
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {user.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2.5">
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Slide Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-background border-r border-border/20 overflow-y-auto">
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
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium",
                      isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px]", isActive && "text-primary")} />
                    {item.label}
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-background/95 backdrop-blur-lg border-t border-border/20 safe-area-pb">
        <div className="grid grid-cols-5 h-full">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className={cn(
        "flex-1 min-h-screen",
        isSuperAdmin ? "md:pt-24" : "md:pt-14", // top nav bar height (+ admin bar if super admin)
        "pt-14", // Mobile header
        "pb-16 md:pb-0" // Mobile bottom nav
      )}>
        {isRouteAccessible ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
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
                <CardDescription className="mt-2">
                  Choose a plan to unlock all features.
                </CardDescription>
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
