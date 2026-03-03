import type { BusinessMode } from "@/hooks/useTenantConfig";

/**
 * Industry-aware terminology mapping
 * Provides business-mode-specific terms throughout the UI
 */
export interface IndustryTerms {
  [key: string]: unknown;
  // Core entities (singular/plural)
  booking: string;
  bookings: string;
  service: string;
  services: string;
  customer: string;
  customers: string;

  // Actions and events
  bookingCreated: string;
  viewBookings: string;
  addService: string;
  newBooking: string;

  // Page titles and navigation
  bookingsPageTitle: string;
  bookingsPageSubtitle: string;
  servicesPageTitle: string;
  servicesPageSubtitle: string;

  // Setup checklist
  addServicesStep: string;
  addServicesDescription: string;

  // Attention items
  pendingBooking: string;
  pendingBookings: string;

  // Activity feed
  bookingConfirmed: string;

  // Metrics
  bookingsMetricLabel: string;

  // Inbox / nav
  inboxPageTitle: string;
  inboxPageSubtitle: string;
}

const TERMINOLOGY: Record<BusinessMode, IndustryTerms> = {
  service: {
    booking: "booking",
    bookings: "bookings",
    service: "service",
    services: "services",
    customer: "customer",
    customers: "customers",
    bookingCreated: "Booking created",
    viewBookings: "View Bookings",
    addService: "Add Service",
    newBooking: "New Booking",
    bookingsPageTitle: "Schedule",
    bookingsPageSubtitle: "Your calendar and upcoming appointments",
    servicesPageTitle: "Services",
    servicesPageSubtitle: "View your services catalog",
    addServicesStep: "Add your services",
    addServicesDescription: "What you offer and pricing",
    pendingBooking: "pending booking",
    pendingBookings: "pending bookings",
    bookingConfirmed: "Booking confirmed",
    bookingsMetricLabel: "Bookings",
    inboxPageTitle: "Inbox",
    inboxPageSubtitle: "Every customer call and lead, organized.",
  },
  dispatch: {
    booking: "job",
    bookings: "jobs",
    service: "service",
    services: "services",
    customer: "customer",
    customers: "customers",
    bookingCreated: "Job dispatched",
    viewBookings: "Dispatch Queue",
    addService: "Add Service",
    newBooking: "New Job",
    bookingsPageTitle: "Dispatch Queue",
    bookingsPageSubtitle: "Manage incoming jobs and dispatch assignments",
    servicesPageTitle: "Services",
    servicesPageSubtitle: "View your services and rates",
    addServicesStep: "Add your services",
    addServicesDescription: "What jobs you handle and rates",
    pendingBooking: "pending job",
    pendingBookings: "pending jobs",
    bookingConfirmed: "Job assigned",
    bookingsMetricLabel: "Jobs",
    inboxPageTitle: "Inbox",
    inboxPageSubtitle: "Every call and dispatch request, organized.",
  },
  food: {
    booking: "order",
    bookings: "orders",
    service: "menu item",
    services: "menu",
    customer: "guest",
    customers: "guests",
    bookingCreated: "Order placed",
    viewBookings: "View Orders",
    addService: "Add Menu Item",
    newBooking: "New Order",
    bookingsPageTitle: "Orders",
    bookingsPageSubtitle: "Manage incoming orders and kitchen prep",
    servicesPageTitle: "Menu",
    servicesPageSubtitle: "View your menu catalog",
    addServicesStep: "Add your menu",
    addServicesDescription: "Items you serve and pricing",
    pendingBooking: "new order",
    pendingBookings: "new orders",
    bookingConfirmed: "Order confirmed",
    bookingsMetricLabel: "Orders",
    inboxPageTitle: "Inbox",
    inboxPageSubtitle: "Every guest call and order, organized.",
  },
  medical: {
    booking: "appointment",
    bookings: "appointments",
    service: "service",
    services: "services",
    customer: "patient",
    customers: "patients",
    bookingCreated: "Appointment scheduled",
    viewBookings: "View Appointments",
    addService: "Add Service",
    newBooking: "New Appointment",
    bookingsPageTitle: "Appointments",
    bookingsPageSubtitle: "View and manage patient appointments",
    servicesPageTitle: "Services",
    servicesPageSubtitle: "Procedures and visit types",
    addServicesStep: "Add your services",
    addServicesDescription: "Procedures and visit types",
    pendingBooking: "pending appointment",
    pendingBookings: "pending appointments",
    bookingConfirmed: "Appointment confirmed",
    bookingsMetricLabel: "Appointments",
    inboxPageTitle: "Inbox",
    inboxPageSubtitle: "Every patient call and inquiry, organized.",
  },
  general: {
    booking: "booking",
    bookings: "bookings",
    service: "offering",
    services: "offerings",
    customer: "customer",
    customers: "customers",
    bookingCreated: "Booking created",
    viewBookings: "View Bookings",
    addService: "Add Offering",
    newBooking: "New Booking",
    bookingsPageTitle: "Bookings",
    bookingsPageSubtitle: "View and manage your bookings",
    servicesPageTitle: "Offerings",
    servicesPageSubtitle: "View your offerings catalog",
    addServicesStep: "Add your offerings",
    addServicesDescription: "What you provide and pricing",
    pendingBooking: "pending booking",
    pendingBookings: "pending bookings",
    bookingConfirmed: "Booking confirmed",
    bookingsMetricLabel: "Bookings",
    inboxPageTitle: "Inbox",
    inboxPageSubtitle: "Every customer call and inquiry, organized.",
  },
  sales: {
    booking: "appointment",
    bookings: "appointments",
    service: "product",
    services: "products",
    customer: "prospect",
    customers: "prospects",
    bookingCreated: "Appointment scheduled",
    viewBookings: "View Appointments",
    addService: "Add Product",
    newBooking: "New Appointment",
    bookingsPageTitle: "Appointments",
    bookingsPageSubtitle: "View and manage showroom appointments",
    servicesPageTitle: "Products",
    servicesPageSubtitle: "View your product catalog",
    addServicesStep: "Add your products",
    addServicesDescription: "Products, pricing, and inventory",
    pendingBooking: "pending appointment",
    pendingBookings: "pending appointments",
    bookingConfirmed: "Appointment confirmed",
    bookingsMetricLabel: "Appointments",
    inboxPageTitle: "Inbox",
    inboxPageSubtitle: "Every prospect call and lead, organized.",
  },
};

export function getTerminology(mode: BusinessMode): IndustryTerms {
  return TERMINOLOGY[mode] || TERMINOLOGY.service;
}

/**
 * Overlay industry-specific appointmentLabel onto base mode terms.
 *
 * The 3-tier industry terminology system (industryTerminology.ts) resolves
 * appointmentLabel per category/slug (e.g. "job" for home_services, "visit"
 * for health_medical). This function applies that label to the simple UI terms
 * so a plumber sees "Job scheduled" instead of "Booking created".
 */
export function applyAppointmentLabel(
  base: IndustryTerms,
  appointmentLabel: string | undefined,
): IndustryTerms {
  // Only override when the label differs from the mode default
  if (!appointmentLabel || appointmentLabel === "appointment" || appointmentLabel === "booking") {
    return base;
  }

  // Already matches (e.g. dispatch mode already uses "job")
  if (base.booking === appointmentLabel) {
    return base;
  }

  const s = appointmentLabel; // e.g. "job", "visit", "consultation"
  const p = s + "s"; // "jobs", "visits", "consultations"
  const cap = s.charAt(0).toUpperCase() + s.slice(1);
  const capP = p.charAt(0).toUpperCase() + p.slice(1);

  return {
    ...base,
    booking: s,
    bookings: p,
    bookingCreated: `${cap} scheduled`,
    bookingConfirmed: `${cap} confirmed`,
    newBooking: `New ${cap}`,
    viewBookings: `View ${capP}`,
    pendingBooking: `pending ${s}`,
    pendingBookings: `pending ${p}`,
    bookingsMetricLabel: capP,
    bookingsPageSubtitle: `Your calendar and upcoming ${p}`,
  };
}
