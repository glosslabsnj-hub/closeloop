import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Search,
  Command,
  ChevronRight,
  HelpCircle,
  BookOpen,
  Keyboard,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";

interface Breadcrumb {
  label: string;
  href?: string;
}

const routeLabels: Record<string, string> = {
  "/app/dashboard": "Dashboard",
  "/app/inbox": "Inbox",
  "/app/bookings": "Bookings",
  "/app/dispatch": "Dispatch",
  "/app/orders": "Orders",
  "/app/reservations": "Reservations",
  "/app/catering": "Catering",
  "/app/medical-intake": "Patients",
  "/app/customers": "Customers",
  "/app/calendar": "Calendar",
  "/app/business-brain": "Business Brain",
  "/app/integrations": "Integrations",
  "/app/simulator": "Test Calls",
  "/app/reports": "Reports",
  "/app/reports/roi": "Revenue & ROI",
  "/app/reports/recovery": "Lead Recovery",
  "/app/settings": "Settings",
  "/app/settings/business": "Business Profile",
  "/app/settings/voice": "Phone & Voice",
  "/app/settings/team": "Team",
  "/app/help": "Help",
  "/app/go-live": "Go Live",
  "/app/estimates": "Estimates",
  "/app/impound-lot": "Impound Lot",
  "/app/dispatch-map": "Dispatch Map",
};

function useBreadcrumbs(): Breadcrumb[] {
  const location = useLocation();
  const path = location.pathname;

  // Build breadcrumb trail
  const crumbs: Breadcrumb[] = [];

  // Always start with App/Dashboard conceptually, but don't show if we're on dashboard
  if (path !== "/app/dashboard") {
    // Find the current page
    const segments = path.split("/").filter(Boolean);
    let currentPath = "";

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      if (index === 0) return; // Skip "app"
      
      const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
      
      if (index < segments.length - 1) {
        crumbs.push({ label, href: currentPath });
      } else {
        crumbs.push({ label }); // Current page, no link
      }
    });
  } else {
    crumbs.push({ label: "Dashboard" });
  }

  return crumbs;
}

export function AppHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const breadcrumbs = useBreadcrumbs();

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur-lg border-b border-border/50 flex items-center justify-between px-6">
        {/* Left: Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-1.5 min-w-0">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              )}
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground truncate max-w-[200px]">
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Global Search */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 h-9 px-3 text-muted-foreground bg-muted/30 border-border/50 hover:bg-muted/50"
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Search...</span>
            <kbd className="hidden md:inline-flex h-5 items-center gap-0.5 rounded border border-border/50 bg-muted/50 px-1.5 text-[10px] font-mono text-muted-foreground">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>
          
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="sm:hidden h-9 w-9"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <NotificationBell />

          {/* Help Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href="https://docs.closeloop.ai" target="_blank" rel="noopener noreferrer">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Documentation
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/app/help">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact Support
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={() => setSearchOpen(true)}
                className="cursor-pointer"
              >
                <Keyboard className="mr-2 h-4 w-4" />
                Keyboard Shortcuts
                <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">?</kbd>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
