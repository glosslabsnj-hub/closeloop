import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useIndustryContext } from "@/hooks/useIndustryContext";
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
  Calendar,
  Users,
  Settings,
  LogOut,
  Bot,
  Lock,
  CreditCard,
  Truck,
  UtensilsCrossed,
  Clock,
  Cake,
  Stethoscope,
  FlaskConical,
  AudioWaveform,
  DollarSign,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { AdminModeSwitcher } from "@/components/admin/AdminModeSwitcher";
import { AdminTenantSwitcher } from "@/components/admin/AdminTenantSwitcher";
import { AdminModeSelector } from "@/components/admin/AdminModeSelector";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { DispatchJobListener } from "@/components/notifications/DispatchJobListener";

import { AppSidebar } from "@/components/layouts/AppSidebar";
import { SlimTopBar } from "@/components/layouts/SlimTopBar";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { BRAND } from "@/config/brand";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

// Routes that are always accessible (even without subscription)
const alwaysAccessibleRoutes = ["/app/settings", "/app/go-live", "/app/agency"];

function AppLayoutContent() {
  const { user, tenant, effectiveTenant, signOut, loading, hasActiveSubscription, isSuperAdmin, assistantSettings } = useAuth();
  const { enabledModules } = useTenantConfig();
  const caps = useCapabilities();
  const { terms, catalog } = useIndustryContext();
  const { unresolvedCount: conflictsCount } = useKnowledgeConflicts();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const effectiveHasSubscription = isSuperAdmin || hasActiveSubscription;
  const displayTenant = isSuperAdmin ? (effectiveTenant ?? tenant) : tenant;

  // Business-aware sidebar subtitle
  const sidebarSubtitle = useMemo(() => {
    const tagline = (assistantSettings as Record<string, unknown> | null)?.business_tagline as string | undefined;
    if (tagline) return tagline;
    if (catalog?.name) return `AI for ${catalog.name}`;
    return "AI Receptionist";
  }, [assistantSettings, catalog]);

  // Mobile nav - simplified (unchanged from before)
  const mobileNavItems = useMemo(() => {
    const items: NavItem[] = [
      { href: "/app/dashboard", label: "Home", icon: LayoutDashboard },
      { href: "/app/inbox", label: (terms.inboxPageTitle as string) || "Leads", icon: caps.isDispatchBusiness ? Phone : Users },
    ];
    if (caps.isFoodBusiness && caps.hasFoodOrders) {
      items.push({ href: "/app/orders", label: "Orders", icon: UtensilsCrossed });
    } else if (caps.isDispatchBusiness && caps.hasDispatchQueue) {
      items.push({ href: "/app/dispatch", label: "Jobs", icon: Truck });
    } else if (caps.isSalesBusiness && caps.hasSalesLeads) {
      items.push({ href: "/app/sales-pipeline", label: "Pipeline", icon: DollarSign });
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

  return (
    <>
      {/* Super Admin Bar — full width, above everything */}
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

      <div className={cn("flex min-h-screen", isSuperAdmin && "md:pt-10")}>
        {/* App Sidebar */}
        <AppSidebar
          enabledModules={enabledModules}
          caps={caps}
          terms={terms}
          conflictsCount={conflictsCount}
          effectiveHasSubscription={effectiveHasSubscription}
          displayTenant={displayTenant}
          subtitle={sidebarSubtitle}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
        />

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Slim top bar — desktop only */}
          <SlimTopBar
            userEmail={user.email || ""}
            tenantName={displayTenant?.name}
            onSignOut={handleSignOut}
          />

          {/* Trial banner — shown when subscription is trialing */}
          <TrialBanner />

          <MobileHeader
            displayTenant={displayTenant}
            userEmail={user.email || ""}
            onSignOut={handleSignOut}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          {/* Page content */}
          <div className={cn(
            "flex-1",
            "pt-14 md:pt-0", // Mobile header offset (mobile only — desktop slim bar is in flow)
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
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav — unchanged */}
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
    </>
  );
}

/** Mobile header */
function MobileHeader({
  displayTenant,
  userEmail,
  onSignOut,
  onToggleSidebar,
}: {
  displayTenant: { name?: string } | null;
  userEmail: string;
  onSignOut: () => void;
  onToggleSidebar: () => void;
}) {
  const navigate = useNavigate();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background/95 backdrop-blur-lg border-b border-border/20 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-9 w-9"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="5" x2="17" y2="5" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="15" x2="17" y2="15" />
          </svg>
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg gradient-brand flex items-center justify-center">
            <AudioWaveform className="h-3.5 w-3.5 text-white" />
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
                  {userEmail?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium truncate">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
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
