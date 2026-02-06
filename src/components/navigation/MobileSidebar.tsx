import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTerminology } from "@/hooks/useTerminology";
import { useKnowledgeConflicts } from "@/hooks/useKnowledgeConflicts";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Settings,
  LogOut,
  Phone,
  Bot,
  X,
  Truck,
  UtensilsCrossed,
  Clock,
  Cake,
  Stethoscope,
  Users,
  BookOpen,
  Zap,
  BarChart3,
  TrendingUp,
  FileText,
  Building2,
  Mic,
  PlugZap,
  UserCog,
  HelpCircle,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  effectiveTenant: any;
  isSuperAdmin: boolean;
  hasActiveSubscription: boolean;
}

export function MobileSidebar({ 
  isOpen, 
  onClose, 
  effectiveTenant, 
  isSuperAdmin, 
  hasActiveSubscription 
}: MobileSidebarProps) {
  const { user, signOut } = useAuth();
  const { enabledModules } = useTenantConfig();
  const terms = useTerminology();
  const { unresolvedCount: conflictsCount } = useKnowledgeConflicts();
  const location = useLocation();
  const navigate = useNavigate();

  const businessMode = effectiveTenant?.business_mode || "service";

  // Build navigation sections based on business mode and enabled modules
  const navSections: NavSection[] = [];

  // MAIN section
  const mainItems: NavItem[] = [
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/inbox", label: "Calls & Sessions", icon: MessageSquare },
  ];

  // Mode-specific items
  if (businessMode === "dispatch" && enabledModules.includes("dispatch_queue")) {
    mainItems.push({ href: "/app/dispatch", label: "Jobs", icon: Truck });
    mainItems.push({ href: "/app/impound-lot", label: "Impound Lot", icon: Warehouse });
  } else if (businessMode === "food") {
    if (enabledModules.includes("food_orders")) {
      mainItems.push({ href: "/app/orders", label: "Orders", icon: UtensilsCrossed });
    }
    if (enabledModules.includes("reservations")) {
      mainItems.push({ href: "/app/reservations", label: "Reservations", icon: Clock });
    }
    if (enabledModules.includes("catering")) {
      mainItems.push({ href: "/app/catering", label: "Catering", icon: Cake });
    }
  } else if (businessMode === "medical" && enabledModules.includes("medical_intake")) {
    mainItems.push({ href: "/app/medical-intake", label: "Appointments", icon: Stethoscope });
  } else if (enabledModules.includes("booking")) {
    mainItems.push({ href: "/app/bookings", label: terms.bookingsPageTitle || "Bookings", icon: Calendar });
  }

  mainItems.push({ href: "/app/customers", label: "Customers", icon: Users });
  
  navSections.push({ label: "Main", items: mainItems });

  // BUSINESS BRAIN section
  const brainItems: NavItem[] = [
    { href: "/app/business-brain", label: "AI Assistant", icon: Bot, badge: conflictsCount || undefined },
    { href: "/app/business-brain?tab=knowledge", label: "Knowledge Base", icon: BookOpen },
    { href: "/app/integrations", label: "Automations", icon: Zap },
  ];
  navSections.push({ label: "Business Brain", items: brainItems });

  // INSIGHTS section
  const insightsItems: NavItem[] = [
    { href: "/app/reports/roi", label: "Revenue & ROI", icon: TrendingUp },
    { href: "/app/reports", label: "Reports", icon: BarChart3 },
  ];
  navSections.push({ label: "Insights", items: insightsItems });

  // SETTINGS section
  const settingsItems: NavItem[] = [
    { href: "/app/settings", label: "Settings", icon: Settings },
    { href: "/app/help", label: "Help & Support", icon: HelpCircle },
  ];
  navSections.push({ label: "Settings", items: settingsItems });

  const alwaysAccessibleRoutes = ["/app/settings", "/app/go-live"];
  const effectiveHasSubscription = isSuperAdmin || hasActiveSubscription;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      {/* Sidebar */}
      <aside className="absolute left-0 top-0 bottom-0 w-80 bg-background border-r border-border overflow-y-auto animate-slide-up-fade">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Phone className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold">{effectiveTenant?.name || "CloseLoop"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Sections */}
        <nav className="p-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  const isLocked = !effectiveHasSubscription && 
                    !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));

                  return (
                    <Link
                      key={item.href}
                      to={isLocked ? "/app/go-live" : item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : isLocked
                            ? "text-muted-foreground/30"
                            : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
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
              </div>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="sticky bottom-0 p-4 bg-background border-t border-border/50">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                {user?.email?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{effectiveTenant?.name || "My Business"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full mt-2 justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
    </div>
  );
}
