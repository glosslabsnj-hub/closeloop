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
  Zap,
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
}

const allNavItems: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/app/calls", label: "Calls", icon: PhoneCall, requiredModules: ["ai_voice"] },
  { href: "/app/leads", label: "Leads", icon: Users },
  { href: "/app/bookings", label: "Bookings", icon: Calendar, requiredModules: ["booking"] },
  { href: "/app/dispatch", label: "Dispatch", icon: Truck, requiredModules: ["dispatch_queue"] },
  { href: "/app/orders", label: "Orders", icon: UtensilsCrossed, requiredModules: ["food_orders"] },
  { href: "/app/menu-center", label: "Menu Center", icon: BookOpen, requiredModules: ["menu_knowledge"] },
  { href: "/app/reservations", label: "Reservations", icon: Clock, requiredModules: ["reservations"] },
  { href: "/app/catering", label: "Catering", icon: Cake, requiredModules: ["catering"] },
  { href: "/app/medical-intake", label: "Medical Intake", icon: Stethoscope, requiredModules: ["medical_intake"] },
  { href: "/app/services", label: "Services", icon: Briefcase },
  { href: "/app/business-brain", label: "Business Brain", icon: Bot },
  { href: "/app/automations", label: "Automations", icon: Zap },
  { href: "/app/simulator", label: "Simulator", icon: FlaskConical },
  { href: "/app/help", label: "Help Center", icon: HelpCircle },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

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

  // Check if user needs to go through go-live
  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Admin Mode Switcher Banner */}
      <AdminModeSwitcher />
      
      {/* Top Navigation - Mobile First */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <Link to="/app/dashboard" className="flex items-center gap-3 hover-lift">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Phone className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">{tenant?.name || "CloseLoop"}</span>
          </Link>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
                  <Avatar className="h-9 w-9">
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
        <aside className="hidden md:flex w-64 flex-col fixed left-0 top-16 bottom-0 border-r bg-background">
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isLocked
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                  {showBadge && (
                    <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                    </Badge>
                  )}
                  {isLocked && <Lock className="h-3.5 w-3.5 ml-auto opacity-50" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 safe-area-pb">
          <div className="grid grid-cols-5 h-16">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              const isLocked = !hasActiveSubscription && 
                !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));
              
              return (
                <Link
                  key={item.href}
                  to={isLocked ? "/app/go-live" : item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors relative",
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
                  <Icon className="h-5 w-5" />
                  <span className="truncate text-[10px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Page Content */}
        <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-[calc(100vh-4rem)]">
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
  );
}
