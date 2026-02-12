import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Settings,
  Bot,
  Route,
  FlaskConical,
  Lock,
  Truck,
  UtensilsCrossed,
  Clock,
  Cake,
  Stethoscope,
  HelpCircle,
  FileText,
  BarChart3,
  Warehouse,
  Users,
  UserCircle,
  AudioWaveform,
  DollarSign,
  Car,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

// Routes that are always accessible (even without subscription)
const alwaysAccessibleRoutes = ["/app/settings", "/app/go-live"];

interface AppSidebarProps {
  enabledModules: string[];
  caps: {
    hasDispatchQueue: boolean;
    hasImpoundLot: boolean;
    hasFleetManagement: boolean;
    hasBooking: boolean;
    hasFoodOrders: boolean;
    hasReservations: boolean;
    hasCatering: boolean;
    hasMedicalIntake: boolean;
    hasSalesLeads: boolean;
    hasTestDrives: boolean;
    hasSalesInventory: boolean;
    hasEstimates: boolean;
    hasPhoneQuotes: boolean;
    isFoodBusiness: boolean;
    isDispatchBusiness: boolean;
    [key: string]: unknown;
  };
  terms: { bookingsPageTitle?: string; [key: string]: unknown };
  conflictsCount: number;
  effectiveHasSubscription: boolean;
  displayTenant: { name?: string } | null;
  subtitle?: string;
}

export function AppSidebar({
  enabledModules,
  caps,
  terms,
  conflictsCount,
  effectiveHasSubscription,
  displayTenant,
  subtitle,
}: AppSidebarProps) {
  const location = useLocation();

  // Build workspace items (capability-gated)
  const workspaceItems: NavItem[] = [];
  if (caps.hasBooking) {
    workspaceItems.push({ href: "/app/bookings", label: terms.bookingsPageTitle || "Bookings", icon: Calendar });
  }
  if (caps.hasDispatchQueue) {
    workspaceItems.push({ href: "/app/dispatch", label: "Dispatch", icon: Truck });
  }
  if (caps.hasImpoundLot) {
    workspaceItems.push({ href: "/app/impound-lot", label: "Impound Lot", icon: Warehouse });
  }
  if (caps.hasFleetManagement) {
    workspaceItems.push({ href: "/app/fleet", label: "Fleet", icon: Users });
  }
  if (caps.hasFoodOrders) {
    workspaceItems.push({ href: "/app/orders", label: "Orders", icon: UtensilsCrossed });
  }
  if (caps.hasReservations) {
    workspaceItems.push({ href: "/app/reservations", label: "Reservations", icon: Clock });
  }
  if (caps.hasCatering) {
    workspaceItems.push({ href: "/app/catering", label: "Catering", icon: Cake });
  }
  if (caps.hasMedicalIntake) {
    workspaceItems.push({ href: "/app/medical-intake", label: "Patients", icon: Stethoscope });
  }
  if (caps.hasSalesLeads) {
    workspaceItems.push({ href: "/app/sales-pipeline", label: "Sales Pipeline", icon: DollarSign });
  }
  if (caps.hasTestDrives) {
    workspaceItems.push({ href: "/app/test-drives", label: "Test Drives", icon: Car });
  }
  if (caps.hasSalesInventory) {
    workspaceItems.push({ href: "/app/sales-inventory", label: "Inventory", icon: Warehouse });
  }
  if (caps.hasEstimates || caps.hasPhoneQuotes) {
    workspaceItems.push({ href: "/app/estimates", label: "Estimates", icon: FileText });
  }

  const renderItem = (item: NavItem) => {
    const isActive = location.pathname === item.href;
    const isLocked = !effectiveHasSubscription && !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.label}
          className={cn(isLocked && "opacity-40 pointer-events-none")}
        >
          <Link to={isLocked ? "/app/go-live" : item.href}>
            <item.icon className="shrink-0" />
            <span>{item.label}</span>
            {isLocked && <Lock className="h-3 w-3 ml-auto opacity-60" />}
          </Link>
        </SidebarMenuButton>
        {item.badge && item.badge > 0 && (
          <SidebarMenuBadge className="bg-destructive text-destructive-foreground text-[9px] font-semibold rounded-full h-4 min-w-4 px-1">
            {item.badge}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50">
      {/* Header: Logo + tenant name */}
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={displayTenant?.name || BRAND.name}>
              <Link to="/app/dashboard">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-brand">
                  <AudioWaveform className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sm">{displayTenant?.name || BRAND.name}</span>
                  <span className="text-[11px] text-sidebar-foreground/50">{subtitle || "AI Receptionist"}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Scrollable nav content — flat list with thin separators */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {/* Core nav */}
            {renderItem({ href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard })}
            {renderItem({ href: "/app/inbox", label: "Leads", icon: Users })}
            {renderItem({ href: "/app/customers", label: (terms.customers ? String(terms.customers).charAt(0).toUpperCase() + String(terms.customers).slice(1) : "Customers"), icon: UserCircle })}

            {/* Workspace (module-gated) */}
            {workspaceItems.length > 0 && (
              <>
                <SidebarSeparator className="my-2" />
                {workspaceItems.map(renderItem)}
              </>
            )}

            {/* Configure */}
            <SidebarSeparator className="my-2" />
            {renderItem({ href: "/app/business-brain", label: "Business Brain", icon: Bot, badge: conflictsCount || undefined })}
            {renderItem({ href: "/app/partner", label: "Business Partner", icon: Sparkles })}
            {renderItem({ href: "/app/integrations", label: "Integrations", icon: Route })}
            {renderItem({ href: "/app/simulator", label: "Test Calls", icon: FlaskConical })}
            {renderItem({ href: "/app/reports/roi", label: "Reports", icon: BarChart3 })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: Settings + Help */}
      <SidebarFooter>
        <SidebarMenu>
          {renderItem({ href: "/app/settings", label: "Settings", icon: Settings })}
          {renderItem({ href: "/app/help", label: "Help", icon: HelpCircle })}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
