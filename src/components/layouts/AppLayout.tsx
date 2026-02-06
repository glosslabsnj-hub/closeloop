import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Lock, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { AdminModeSwitcher } from "@/components/admin/AdminModeSwitcher";
import { AppSidebar } from "@/components/navigation/AppSidebar";
import { AppHeader } from "@/components/navigation/AppHeader";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { MobileSidebar } from "@/components/navigation/MobileSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";

// Routes that are always accessible (even without subscription)
const alwaysAccessibleRoutes = ["/app/settings", "/app/go-live"];

// Local storage key for sidebar collapsed state
const SIDEBAR_COLLAPSED_KEY = "closeloop_sidebar_collapsed";

function AppLayoutContent() {
  const { user, tenant, effectiveTenant, signOut, loading, hasActiveSubscription, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === "true";
  });

  const effectiveHasSubscription = isSuperAdmin || hasActiveSubscription;
  const displayTenant = isSuperAdmin ? (effectiveTenant ?? tenant) : tenant;

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

  // Listen for sidebar collapse state changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      setSidebarCollapsed(stored === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also check periodically for local changes
    const interval = setInterval(() => {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      setSidebarCollapsed(stored === "true");
    }, 100);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

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
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar */}
        <AppSidebar 
          effectiveTenant={displayTenant}
          isSuperAdmin={isSuperAdmin}
          hasActiveSubscription={effectiveHasSubscription}
        />

        {/* Mobile Header */}
        <MobileHeader 
          effectiveTenant={displayTenant}
          onMenuClick={() => setMobileMenuOpen(true)}
          onSearchClick={() => setSearchOpen(true)}
        />

        {/* Mobile Sidebar */}
        <MobileSidebar 
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          effectiveTenant={displayTenant}
          isSuperAdmin={isSuperAdmin}
          hasActiveSubscription={effectiveHasSubscription}
        />

        {/* Mobile Bottom Nav */}
        <MobileBottomNav effectiveTenant={displayTenant} />

        {/* Main Content Area */}
        <div className={cn(
          "flex-1 min-h-screen flex flex-col",
          sidebarCollapsed ? "md:ml-[72px]" : "md:ml-64",
          "transition-[margin] duration-200 ease-out",
          "pt-14 md:pt-0", // Mobile header
          "pb-16 md:pb-0" // Mobile bottom nav
        )}>
          {/* Desktop Header */}
          <div className="hidden md:block">
            <AdminModeSwitcher />
            <AppHeader />
          </div>

          {/* Page Content */}
          <main className="flex-1">
            {isRouteAccessible ? (
              <Outlet />
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

        {/* Global Search Dialog */}
        <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TooltipProvider>
  );
}

export function AppLayout() {
  return (
    <AdminModeProvider>
      <AppLayoutContent />
    </AdminModeProvider>
  );
}
