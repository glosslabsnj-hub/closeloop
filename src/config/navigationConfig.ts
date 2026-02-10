import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Truck,
  Warehouse,
  UtensilsCrossed,
  Clock,
  Stethoscope,
  FileText,
  BarChart3,
  Bot,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { BusinessMode } from "@/hooks/useTenantConfig";
import type { Capabilities } from "@/hooks/useCapabilities";

export interface NavItemConfig {
  id: string;
  route: string;
  icon: LucideIcon;
  /** Static label — overridden by terminology for dynamic labels */
  label: string;
  /** If set, only show when this capability flag is true */
  requiresCap?: keyof Capabilities;
  /** Use terminology key instead of static label */
  useDynamicLabel?: boolean;
}

/**
 * Primary navigation items per business mode.
 * Maximum 6-7 items per mode. Operational items only — no config/settings.
 *
 * Order matters: this is the display order in the sidebar and mobile nav.
 */
export const NAV_CONFIG: Record<BusinessMode, NavItemConfig[]> = {
  service: [
    { id: "home", route: "/app/dashboard", icon: LayoutDashboard, label: "Home" },
    { id: "inbox", route: "/app/inbox", icon: MessageSquare, label: "Inbox" },
    { id: "bookings", route: "/app/bookings", icon: Calendar, label: "Schedule", useDynamicLabel: true, requiresCap: "hasBooking" },
    { id: "estimates", route: "/app/estimates", icon: FileText, label: "Estimates", requiresCap: "hasEstimates" },
    { id: "reports", route: "/app/reports/roi", icon: BarChart3, label: "Reports" },
    { id: "setup", route: "/app/business-brain", icon: Bot, label: "Setup" },
  ],

  dispatch: [
    { id: "home", route: "/app/dashboard", icon: LayoutDashboard, label: "Home" },
    { id: "inbox", route: "/app/inbox", icon: MessageSquare, label: "Inbox" },
    { id: "dispatch", route: "/app/dispatch", icon: Truck, label: "Jobs", useDynamicLabel: true, requiresCap: "hasDispatchQueue" },
    { id: "impound", route: "/app/impound-lot", icon: Warehouse, label: "Impound", requiresCap: "hasImpoundLot" },
    { id: "reports", route: "/app/reports/roi", icon: BarChart3, label: "Reports" },
    { id: "setup", route: "/app/business-brain", icon: Bot, label: "Setup" },
  ],

  food: [
    { id: "home", route: "/app/dashboard", icon: LayoutDashboard, label: "Home" },
    { id: "inbox", route: "/app/inbox", icon: MessageSquare, label: "Inbox" },
    { id: "orders", route: "/app/orders", icon: UtensilsCrossed, label: "Orders", useDynamicLabel: true, requiresCap: "hasFoodOrders" },
    { id: "reservations", route: "/app/reservations", icon: Clock, label: "Reservations", requiresCap: "hasReservations" },
    { id: "reports", route: "/app/reports/roi", icon: BarChart3, label: "Reports" },
    { id: "setup", route: "/app/business-brain", icon: Bot, label: "Setup" },
  ],

  medical: [
    { id: "home", route: "/app/dashboard", icon: LayoutDashboard, label: "Home" },
    { id: "inbox", route: "/app/inbox", icon: MessageSquare, label: "Inbox" },
    { id: "bookings", route: "/app/bookings", icon: Calendar, label: "Appointments", useDynamicLabel: true, requiresCap: "hasBooking" },
    { id: "patients", route: "/app/medical-intake", icon: Stethoscope, label: "Patients", requiresCap: "hasMedicalIntake" },
    { id: "reports", route: "/app/reports/roi", icon: BarChart3, label: "Reports" },
    { id: "setup", route: "/app/business-brain", icon: Bot, label: "Setup" },
  ],

  general: [
    { id: "home", route: "/app/dashboard", icon: LayoutDashboard, label: "Home" },
    { id: "inbox", route: "/app/inbox", icon: MessageSquare, label: "Inbox" },
    { id: "reports", route: "/app/reports/roi", icon: BarChart3, label: "Reports" },
    { id: "setup", route: "/app/business-brain", icon: Bot, label: "Setup" },
  ],
};

/** Bottom-pinned items — same for all modes */
export const BOTTOM_NAV_CONFIG: NavItemConfig[] = [
  { id: "settings", route: "/app/settings", icon: Settings, label: "Settings" },
];

/**
 * Mobile bottom nav: 5 items per mode (explicitly chosen, not sliced).
 * Must be a subset of the primary nav items.
 */
export const MOBILE_NAV_CONFIG: Record<BusinessMode, string[]> = {
  service: ["home", "inbox", "bookings", "reports", "setup"],
  dispatch: ["home", "inbox", "dispatch", "reports", "setup"],
  food: ["home", "inbox", "orders", "reports", "setup"],
  medical: ["home", "inbox", "bookings", "reports", "setup"],
  general: ["home", "inbox", "reports", "setup", "settings"],
};
