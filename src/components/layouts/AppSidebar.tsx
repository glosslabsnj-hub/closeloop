import { useLocation } from "react-router-dom";
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
  ClipboardCheck,
  Phone,
  Building2,
  Package,
  ChefHat,
  Heart,
  FileCheck,
  UserSearch,
  Map,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  AnimatedSidebar,
  SidebarBody,
  SidebarLink,
  useAnimatedSidebar,
} from "@/components/ui/animated-sidebar";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const alwaysAccessibleRoutes = ["/app/settings", "/app/go-live", "/app/agency"];

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
    hasJobTracking: boolean;
    hasLeadFollowUp: boolean;
    isFoodBusiness: boolean;
    isDispatchBusiness: boolean;
    isServiceBusiness: boolean;
    [key: string]: unknown;
  };
  terms: { bookingsPageTitle?: string; [key: string]: unknown };
  conflictsCount: number;
  effectiveHasSubscription: boolean;
  displayTenant: { name?: string } | null;
  subtitle?: string;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showAgency?: boolean;
  isAgencyOnly?: boolean;
}

export function AppSidebar({
  enabledModules,
  caps,
  terms,
  conflictsCount,
  effectiveHasSubscription,
  displayTenant,
  subtitle,
  open,
  setOpen,
  showAgency,
  isAgencyOnly,
}: AppSidebarProps) {
  const location = useLocation();

  const iconClass = "h-4 w-4 shrink-0";

  // Build workspace items (capability-gated)
  const workspaceItems: NavItem[] = [];
  if (caps.hasBooking) {
    workspaceItems.push({ href: "/app/bookings", label: terms.bookingsPageTitle || "Bookings", icon: <Calendar className={iconClass} /> });
  }
  if (caps.hasDispatchQueue) {
    workspaceItems.push({ href: "/app/dispatch", label: "Dispatch", icon: <Truck className={iconClass} /> });
  }
  if (caps.hasImpoundLot) {
    workspaceItems.push({ href: "/app/impound-lot", label: "Impound Lot", icon: <Warehouse className={iconClass} /> });
  }
  if (caps.hasFleetManagement) {
    workspaceItems.push({ href: "/app/fleet", label: caps.isDispatchBusiness ? "Fleet" : "Team", icon: <Users className={iconClass} /> });
  }
  if (caps.hasFoodOrders) {
    workspaceItems.push({ href: "/app/orders", label: "Orders", icon: <UtensilsCrossed className={iconClass} /> });
  }
  if (caps.hasReservations) {
    workspaceItems.push({ href: "/app/reservations", label: "Reservations", icon: <Clock className={iconClass} /> });
  }
  if (caps.hasCatering) {
    workspaceItems.push({ href: "/app/catering", label: "Catering", icon: <Cake className={iconClass} /> });
  }
  if (caps.hasMedicalIntake) {
    workspaceItems.push({ href: "/app/medical-intake", label: "Patients", icon: <Stethoscope className={iconClass} /> });
  }
  if (caps.hasSalesLeads) {
    workspaceItems.push({ href: "/app/sales-pipeline", label: "Sales Pipeline", icon: <DollarSign className={iconClass} /> });
  }
  if (caps.hasTestDrives) {
    workspaceItems.push({ href: "/app/test-drives", label: "Test Drives", icon: <Car className={iconClass} /> });
  }
  if (caps.hasSalesInventory) {
    workspaceItems.push({ href: "/app/sales-inventory", label: "Inventory", icon: <Warehouse className={iconClass} /> });
  }
  if (caps.hasEstimates || caps.hasPhoneQuotes) {
    workspaceItems.push({ href: "/app/estimates", label: "Estimates", icon: <FileText className={iconClass} /> });
  }
  if (caps.hasJobTracking) {
    workspaceItems.push({ href: "/app/jobs", label: "Active Jobs", icon: <ClipboardCheck className={iconClass} /> });
  }
  if (caps.hasJobTracking) {
    workspaceItems.push({ href: "/app/time-tracking", label: "Time Tracking", icon: <Clock className={iconClass} /> });
  }
  if (caps.hasJobTracking) {
    workspaceItems.push({ href: "/app/inventory", label: "Parts Inventory", icon: <Package className={iconClass} /> });
  }
  if (caps.hasFoodOrders) {
    workspaceItems.push({ href: "/app/kitchen", label: "Kitchen Display", icon: <ChefHat className={iconClass} /> });
  }
  if (caps.hasFoodOrders || caps.hasReservations) {
    workspaceItems.push({ href: "/app/loyalty", label: "Loyalty", icon: <Heart className={iconClass} /> });
  }
  if (caps.hasBooking || caps.hasJobTracking) {
    workspaceItems.push({ href: "/app/agreements", label: "Agreements", icon: <FileCheck className={iconClass} /> });
  }
  if (caps.hasDispatchQueue) {
    workspaceItems.push({ href: "/app/dispatch-map", label: "Dispatch Map", icon: <Map className={iconClass} /> });
  }

  const coreItems: NavItem[] = [
    { href: "/app/dashboard", label: "Dashboard", icon: <LayoutDashboard className={iconClass} /> },
    { href: "/app/inbox", label: (terms.inboxPageTitle as string) || "Leads", icon: caps.isDispatchBusiness ? <Phone className={iconClass} /> : <Users className={iconClass} /> },
    { href: "/app/customers", label: (terms.customers ? String(terms.customers).charAt(0).toUpperCase() + String(terms.customers).slice(1) : "Customers"), icon: <UserCircle className={iconClass} /> },
    ...(caps.hasLeadFollowUp ? [{ href: "/app/leads/recovery", label: "Lead Recovery", icon: <UserSearch className={iconClass} /> }] : []),
  ];

  const aiCenterItems: NavItem[] = [
    { href: "/app/business-brain", label: "Business Brain", icon: <Bot className={iconClass} />, badge: conflictsCount || undefined },
    { href: "/app/simulator", label: "Test Your AI", icon: <FlaskConical className={iconClass} /> },
    { href: "/app/partner", label: "AI Insights", icon: <Sparkles className={iconClass} /> },
  ];

  const manageItems: NavItem[] = [
    { href: "/app/integrations", label: "Integrations", icon: <Route className={iconClass} /> },
    { href: "/app/reports/roi", label: "Reports", icon: <BarChart3 className={iconClass} /> },
    ...(showAgency ? [{ href: "/app/agency", label: "Agency", icon: <Building2 className={iconClass} /> }] : []),
    { href: "/app/settings", label: "Settings", icon: <Settings className={iconClass} /> },
  ];

  const bottomItems: NavItem[] = [
    { href: "/app/help", label: "Help", icon: <HelpCircle className={iconClass} /> },
  ];

  const renderLink = (item: NavItem) => {
    const isActive = location.pathname === item.href;
    const isLocked = !effectiveHasSubscription && !alwaysAccessibleRoutes.some(route => item.href.startsWith(route));
    return (
      <SidebarLink
        key={item.href}
        link={{ label: item.label, href: item.href, icon: item.icon, badge: item.badge }}
        isActive={isActive}
        isLocked={isLocked}
      />
    );
  };

  // Agency-only users get a full agency-optimized sidebar
  if (isAgencyOnly) {
    const agencyCoreItems: NavItem[] = [
      { href: "/app/agency", label: "Dashboard", icon: <LayoutDashboard className={iconClass} /> },
      { href: "/app/agency", label: "Clients", icon: <Building2 className={iconClass} /> },
    ];

    const agencyGrowthItems: NavItem[] = [
      { href: "/app/agency", label: "Lead Finder", icon: <UserSearch className={iconClass} /> },
      { href: "/app/agency", label: "Saved Leads", icon: <Users className={iconClass} /> },
    ];

    const agencyBusinessItems: NavItem[] = [
      { href: "/app/agency", label: "Commissions", icon: <DollarSign className={iconClass} /> },
      { href: "/app/agency", label: "Reports", icon: <BarChart3 className={iconClass} /> },
    ];

    const agencyManageItems: NavItem[] = [
      { href: "/app/settings", label: "Settings", icon: <Settings className={iconClass} /> },
    ];

    return (
      <AnimatedSidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-6">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* CORE */}
            {open && <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40 px-3 pt-1 pb-1">Agency</p>}
            <div className="flex flex-col gap-0.5">
              {agencyCoreItems.map(renderLink)}
            </div>

            {/* GROWTH */}
            {open && <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40 px-3 pt-4 pb-1">Growth</p>}
            <div className={cn("flex flex-col gap-0.5", !open && "mt-4")}>
              {agencyGrowthItems.map(renderLink)}
            </div>

            {/* BUSINESS */}
            {open && <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40 px-3 pt-4 pb-1">Business</p>}
            <div className={cn("flex flex-col gap-0.5", !open && "mt-4")}>
              {agencyBusinessItems.map(renderLink)}
            </div>

            {/* MANAGE */}
            {open && <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40 px-3 pt-4 pb-1">Manage</p>}
            <div className={cn("flex flex-col gap-0.5", !open && "mt-4")}>
              {agencyManageItems.map(renderLink)}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col gap-0.5">
            {bottomItems.map(renderLink)}
          </div>
        </SidebarBody>
      </AnimatedSidebar>
    );
  }

  return (
    <AnimatedSidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-6">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {/* MAIN */}
          {open && <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40 px-3 pt-1 pb-1">Main</p>}
          <div className="flex flex-col gap-0.5">
            {coreItems.map(renderLink)}
          </div>

          {/* Workspace items */}
          {workspaceItems.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-3">
              {workspaceItems.map(renderLink)}
            </div>
          )}

          {/* AI CENTER */}
          {open && <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40 px-3 pt-4 pb-1">AI Center</p>}
          <div className={cn("flex flex-col gap-0.5", !open && "mt-4")}>
            {aiCenterItems.map(renderLink)}
          </div>

          {/* MANAGE */}
          {open && <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40 px-3 pt-4 pb-1">Manage</p>}
          <div className={cn("flex flex-col gap-0.5", !open && "mt-4")}>
            {manageItems.map(renderLink)}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-0.5">
          {bottomItems.map(renderLink)}
        </div>
      </SidebarBody>
    </AnimatedSidebar>
  );
}
