import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminModeProvider } from "@/contexts/AdminModeContext";
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
  LayoutDashboard,
  Building2,
  HeadphonesIcon,
  LogOut,
  Shield,
  Music,
  ClipboardCheck,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { AdminModeSelector } from "@/components/admin/AdminModeSelector";
import { AdminTenantSwitcher } from "@/components/admin/AdminTenantSwitcher";

const navItems = [
  { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/demo-library", label: "Demo Library", icon: Music },
  { href: "/admin/golden-path", label: "Golden Path QA", icon: ClipboardCheck },
  { href: "/admin/support", label: "Support", icon: HeadphonesIcon },
  { href: "/admin/agency-applications", label: "Applications", icon: FileText },
];

export function AdminLayout() {
  const { user, isSuperAdmin, signOut, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) {
      navigate("/login");
    }
  }, [user, isSuperAdmin, loading, navigate]);

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

  if (!user || !isSuperAdmin) {
    return null;
  }

  return (
    <AdminModeProvider>
      <div className="min-h-screen bg-secondary/30">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 border-b border-border/40 bg-sidebar/98">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold hidden lg:inline">Voxly Admin</span>
            </div>

            {/* Mode Selector - Center */}
            <div className="flex-1 flex justify-center px-4">
              <AdminModeSelector />
            </div>

            {/* Right side: Tenant Switcher + User Menu */}
            <div className="flex items-center gap-3">
              <AdminTenantSwitcher />
              
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
                <p className="text-xs text-muted-foreground">Super Admin</p>
              </div>
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

        <div className="flex">
          {/* Sidebar */}
          <aside className="hidden md:flex w-64 flex-col fixed left-0 top-14 bottom-0 border-r bg-background">
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Mobile Nav */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
            <div className="grid grid-cols-6 h-16">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate max-w-[60px]">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Page Content */}
          <main className="flex-1 md:ml-64 pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminModeProvider>
  );
}
