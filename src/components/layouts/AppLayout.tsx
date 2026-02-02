import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo } from "react";
import { AdminModeSwitcher } from "@/components/admin/AdminModeSwitcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredModules?: string[];
  section?: string;
}

// Navigation items grouped by section
const allNavItems: NavItem[] = [
  // Core
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "core" },
  { href: "/app/inbox", label: "Inbox", icon: MessageSquare, section: "core" },
  { href: "/app/calls", label: "Calls", icon: PhoneCall, requiredModules: ["ai_voice"], section: "core" },
  
  // Customers
  { href: "/app/leads", label: "Leads", icon: Users, section: "customers" },
  { href: "/app/bookings", label: "Bookings", icon: Calendar, requiredModules: ["booking"], section: "customers" },
  { href: "/app/dispatch", label: "Dispatch", icon: Truck, requiredModules: ["dispatch_queue"], section: "customers" },
  { href: "/app/orders", label: "Orders", icon: UtensilsCrossed, requiredModules: ["food_orders"], section: "customers" },
  { href: "/app/reservations", label: "Reservations", icon: Clock, requiredModules: ["reservations"], section: "customers" },
  { href: "/app/catering", label: "Catering", icon: Cake, requiredModules: ["catering"], section: "customers" },
  { href: "/app/medical-intake", label: "Medical Intake", icon: Stethoscope, requiredModules: ["medical_intake"], section: "customers" },
  
  // Setup
  { href: "/app/services", label: "Services", icon: Briefcase, section: "setup" },
  { href: "/app/menu-center", label: "Menu Center", icon: BookOpen, requiredModules: ["menu_knowledge"], section: "setup" },
  { href: "/app/business-brain", label: "Business Brain", icon: Bot, section: "setup" },
  { href: "/app/integrations", label: "Integrations", icon: Route, section: "setup" },
  { href: "/app/simulator", label: "Simulator", icon: FlaskConical, section: "setup" },
  
  // Settings
  { href: "/app/help", label: "Help Center", icon: HelpCircle, section: "settings" },
  { href: "/app/settings", label: "Settings", icon: Settings, section: "settings" },
];

// Section labels
const sectionLabels: Record<string, string> = {
  core: "",
  customers: "Operations",
  setup: "Setup",
  settings: "",
};

// Routes that are always accessible (even without subscription)
const alwaysAccessibleRoutes = [
  "/app/settings",
  "/app/go-live",
];

export function AppLayout() {
  const { user, tenant, signOut, loading, hasActiveSubscription, isSuperAdmin } = useAuth();
  const { enabledModules } = useTenantConfig();
  const { unresolvedCount: conflictsCount } = useKnowledgeConflicts();
  const location = useLocation();
  const navigate = useNavigate();

  // Filter nav items based on enabled modules
  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      if (!item.requiredModules) return true;
      return item.requiredModules.some(mod => enabledModules.includes(mod));
    });
  }, [enabledModules]);

  // Group nav items by section
  const groupedNavItems = useMemo(() => {
    const groups: Record<string, NavItem[]> = {};
    navItems.forEach(item => {
      const section = item.section || "core";
      if (!groups[section]) groups[section] = [];
      groups[section].push(item);
    });
    return groups;
  }, [navItems]);

  // Get priority mobile nav items based on business mode
  const mobileNavItems = useMemo(() => {
    const prioritized: NavItem[] = [
      { href: "/app/dashboard", label: "Home", icon: LayoutDashboard },
    ];

    // Add mode-specific priority items
    const businessMode = (tenant as any)?.business_mode || "service";
    
    if (businessMode === "food" && enabledModules.includes("food_orders")) {
      prioritized.push({ href: "/app/orders", label: "Orders", icon: UtensilsCrossed });
    } else if (businessMode === "dispatch" && enabledModules.includes("dispatch_queue")) {
      prioritized.push({ href: "/app/dispatch", label: "Dispatch", icon: Truck });
    } else if (enabledModules.includes("booking")) {
      prioritized.push({ href: "/app/bookings", label: "Bookings", icon: Calendar });
    }

    // Always include Inbox and Calls if voice enabled
    prioritized.push({ href: "/app/inbox", label: "Inbox", icon: MessageSquare });
    
    if (enabledModules.includes("ai_voice")) {
      prioritized.push({ href: "/app/calls", label: "Calls", icon: PhoneCall });
    }

    // Add settings as last item
    prioritized.push({ href: "/app/settings", label: "Settings", icon: Settings });

    return prioritized.slice(0, 5); // Max 5 items for mobile nav
  }, [enabledModules, tenant]);

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
  useEffect(() => {
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
  }, [loading, tenant, hasActiveSubscription, location.pathname, navigate]);

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

  // Check if current route is accessible
  const isRouteAccessible = hasActiveSubscription || 
    alwaysAccessibleRoutes.some(route => location.pathname.startsWith(route));

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;
    const isLocked = !hasActiveSubscription && 
      !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));
    const showBadge = item.href === "/app/business-brain" && conflictsCount > 0;
    
    return (
      <Link
        key={item.href}
        to={isLocked ? "/app/go-live" : item.href}
        className={cn(
          "nav-item group",
          isActive
            ? "nav-item-active"
            : isLocked
              ? "nav-item-locked"
              : "nav-item-inactive"
        )}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {showBadge && (
          <Badge variant="destructive" className="h-5 px-1.5 text-xs">
            <AlertTriangle className="h-3 w-3" />
          </Badge>
        )}
        {isLocked && <Lock className="h-3.5 w-3.5 opacity-50" />}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Mode Switcher Banner */}
      <AdminModeSwitcher />
      
      {/* Top Navigation - Mobile First */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <Link to="/app/dashboard" className="flex items-center gap-3 hover-lift">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Phone className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-base hidden sm:inline truncate max-w-[180px]">
              {tenant?.name || "CloseLoop"}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:ring-2 hover:ring-primary/20 transition-all">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      {user.email?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{tenant?.name}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/app/settings")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-60 flex-col fixed left-0 top-14 bottom-0 border-r bg-sidebar">
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            {Object.entries(groupedNavItems).map(([section, items]) => (
              <div key={section}>
                {sectionLabels[section] && (
                  <div className="nav-section-header">{sectionLabels[section]}</div>
                )}
                <div className="space-y-0.5">
                  {items.map(renderNavItem)}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 safe-area-pb">
          <div className="grid grid-cols-5 h-14">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              const isLocked = !hasActiveSubscription && 
                !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));
              const showBadge = item.href === "/app/dashboard" && conflictsCount > 0;
              
              return (
                <Link
                  key={item.href}
                  to={isLocked ? "/app/go-live" : item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors relative min-h-[44px]",
                    isActive 
                      ? "text-primary" 
                      : isLocked 
                        ? "text-muted-foreground/50" 
                        : "text-muted-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute top-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />
                    )}
                  </div>
                  <span className="truncate text-[10px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Page Content */}
        <main className="flex-1 md:ml-60 pb-20 md:pb-0 min-h-[calc(100vh-3.5rem)]">
          {isRouteAccessible ? (
            <Outlet />
          ) : (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
              <Card className="max-w-md text-center">
                <CardHeader className="pb-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
                    <Lock className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <CardTitle>Subscription Required</CardTitle>
                  <CardDescription>
                    Choose a plan to unlock all features and start using CloseLoop.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
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
  );
}
