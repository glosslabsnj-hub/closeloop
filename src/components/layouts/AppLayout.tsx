import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
    <div className="min-h-screen bg-secondary/30">
      {/* Admin Mode Switcher Banner */}
      <AdminModeSwitcher />
      
      {/* Top Navigation - Mobile First */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Phone className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold hidden sm:inline">{tenant?.name || "CloseLoop"}</span>
          </Link>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">{tenant?.name}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
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
        <aside className="hidden md:flex w-64 flex-col fixed left-0 top-14 bottom-0 border-r bg-background">
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              const isLocked = !hasActiveSubscription && 
                !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));
              
              return (
                <Link
                  key={item.href}
                  to={isLocked ? "/app/go-live" : item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isLocked
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {isLocked && <Lock className="h-3 w-3 ml-auto" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
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
                    "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                    isActive 
                      ? "text-primary" 
                      : isLocked 
                        ? "text-muted-foreground/50" 
                        : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Page Content */}
        <main className="flex-1 md:ml-64 pb-20 md:pb-0">
          {isRouteAccessible ? (
            <Outlet />
          ) : (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
              <Card className="max-w-md text-center">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-2">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle>Subscription Required</CardTitle>
                  <CardDescription>
                    Choose a plan to unlock all features and start using CloseLoop.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={() => navigate("/app/go-live")} className="w-full">
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
