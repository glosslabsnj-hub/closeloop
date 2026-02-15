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
    hasJobTracking: boolean;
    isFoodBusiness: boolean;
    isDispatchBusiness: boolean;
    [key: string]: unknown;
  };
  terms: { bookingsPageTitle?: string; [key: string]: unknown };
  conflictsCount: number;
  effectiveHasSubscription: boolean;
  displayTenant: { name?: string } | null;
  subtitle?: string;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
}: AppSidebarProps) {
  const location = useLocation();

  const iconClass = "h-5 w-5 shrink-0 text-sidebar-foreground";

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

  const coreItems: NavItem[] = [
    { href: "/app/dashboard", label: "Dashboard", icon: <LayoutDashboard className={iconClass} /> },
    { href: "/app/inbox", label: (terms.inboxPageTitle as string) || "Leads", icon: caps.isDispatchBusiness ? <Phone className={iconClass} /> : <Users className={iconClass} /> },
    { href: "/app/customers", label: (terms.customers ? String(terms.customers).charAt(0).toUpperCase() + String(terms.customers).slice(1) : "Customers"), icon: <UserCircle className={iconClass} /> },
  ];

  const toolItems: NavItem[] = [
    { href: "/app/business-brain", label: "Business Brain", icon: <Bot className={iconClass} />, badge: conflictsCount || undefined },
    { href: "/app/simulator", label: "Test Your AI", icon: <FlaskConical className={iconClass} /> },
    { href: "/app/settings", label: "Settings", icon: <Settings className={iconClass} /> },
  ];

  const secondaryItems: NavItem[] = [
    { href: "/app/partner", label: "AI Insights", icon: <Sparkles className={iconClass} /> },
    { href: "/app/integrations", label: "Integrations", icon: <Route className={iconClass} /> },
    { href: "/app/reports/roi", label: "Reports", icon: <BarChart3 className={iconClass} /> },
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

  return (
    <AnimatedSidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-6">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {/* Logo */}
          <Link to="/app/dashboard" className="flex items-center gap-3 py-1 mb-4">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-primary flex items-center justify-center">
              <AudioWaveform className="h-4 w-4 text-primary-foreground" />
            </div>
            <motion.div
              animate={{ display: open ? "flex" : "none", opacity: open ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-col gap-0.5 leading-none"
            >
              <span className="font-semibold text-sm text-sidebar-accent-foreground">
                {displayTenant?.name || BRAND.name}
              </span>
              <span className="text-[11px] text-sidebar-foreground/50">
                {subtitle || "AI Receptionist"}
              </span>
            </motion.div>
          </Link>

          {/* Core nav */}
          <div className="flex flex-col gap-0.5">
            {coreItems.map(renderLink)}
          </div>

          {/* Workspace items */}
          {workspaceItems.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-4">
              {workspaceItems.map(renderLink)}
            </div>
          )}

          {/* Tools */}
          <div className="flex flex-col gap-0.5 mt-4">
            {toolItems.map(renderLink)}
          </div>

          {/* Secondary */}
          <div className="flex flex-col gap-0.5 mt-4">
            {secondaryItems.map(renderLink)}
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
