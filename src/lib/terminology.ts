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
  },
};

export function getTerminology(mode: BusinessMode): IndustryTerms {
  return TERMINOLOGY[mode] || TERMINOLOGY.service;
}
