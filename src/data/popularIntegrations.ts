// Integration categories
export const INTEGRATION_CATEGORIES = [
  { id: "pos", label: "Point of Sale", icon: "💳" },
  { id: "crm", label: "CRM & Marketing", icon: "📈" },
  { id: "scheduling", label: "Scheduling", icon: "📅" },
  { id: "field_service", label: "Field Service", icon: "🔧" },
  { id: "dispatch", label: "Dispatch & Logistics", icon: "🚚" },
  { id: "medical", label: "Medical / Healthcare", icon: "🏥" },
] as const;

export type IntegrationCategory = typeof INTEGRATION_CATEGORIES[number]["id"];

export interface PopularIntegration {
  id: string;
  name: string;
  icon: string;
  category: IntegrationCategory;
  description: string;
}

// All integrations available for concierge setup
export const POPULAR_INTEGRATIONS: PopularIntegration[] = [
  // Point of Sale
  { id: "square_pos", name: "Square POS", icon: "⬛", category: "pos", description: "Sync orders and payments with Square" },
  { id: "toast", name: "Toast", icon: "🍞", category: "pos", description: "Restaurant POS integration" },
  { id: "clover", name: "Clover", icon: "🍀", category: "pos", description: "Connect your Clover POS" },
  { id: "lightspeed", name: "Lightspeed", icon: "⚡", category: "pos", description: "Retail and restaurant POS" },
  { id: "touchbistro", name: "TouchBistro", icon: "📱", category: "pos", description: "iPad restaurant POS" },

  // CRM & Marketing
  { id: "hubspot", name: "HubSpot", icon: "🟠", category: "crm", description: "CRM and marketing automation" },
  { id: "salesforce", name: "Salesforce", icon: "☁️", category: "crm", description: "Enterprise CRM platform" },
  { id: "gohighlevel", name: "GoHighLevel", icon: "🚀", category: "crm", description: "All-in-one marketing platform" },
  { id: "pipedrive", name: "Pipedrive", icon: "🔵", category: "crm", description: "Sales CRM and pipeline" },
  { id: "mailchimp", name: "Mailchimp", icon: "🐵", category: "crm", description: "Email marketing and automation" },

  // Scheduling
  { id: "calendly", name: "Calendly", icon: "📆", category: "scheduling", description: "Online appointment scheduling" },
  { id: "acuity", name: "Acuity Scheduling", icon: "📋", category: "scheduling", description: "Client scheduling software" },
  { id: "square_appointments", name: "Square Appointments", icon: "📅", category: "scheduling", description: "Booking integrated with Square" },

  // Field Service
  { id: "servicetitan", name: "ServiceTitan", icon: "🛠️", category: "field_service", description: "Home service business software" },
  { id: "housecallpro", name: "Housecall Pro", icon: "🏠", category: "field_service", description: "Field service management" },
  { id: "jobber", name: "Jobber", icon: "🔧", category: "field_service", description: "Job scheduling and invoicing" },
  { id: "fieldedge", name: "FieldEdge", icon: "⚙️", category: "field_service", description: "HVAC and plumbing software" },
  { id: "workiz", name: "Workiz", icon: "📊", category: "field_service", description: "Field service scheduling" },

  // Dispatch & Logistics
  { id: "towbook", name: "Towbook", icon: "🚗", category: "dispatch", description: "Towing dispatch software" },
  { id: "onfleet", name: "Onfleet", icon: "🚚", category: "dispatch", description: "Delivery management platform" },
  { id: "samsara", name: "Samsara", icon: "📍", category: "dispatch", description: "Fleet operations platform" },

  // Medical
  { id: "athenahealth", name: "AthenaHealth", icon: "🏥", category: "medical", description: "Medical practice management" },
  { id: "epic", name: "Epic", icon: "💊", category: "medical", description: "Healthcare EHR system" },
  { id: "practicefusion", name: "Practice Fusion", icon: "🩺", category: "medical", description: "Cloud-based EHR" },
];

// Self-setup integrations (user can connect themselves)
export const SELF_SETUP_INTEGRATIONS = [
  { id: "google_calendar", name: "Google Calendar", icon: "📅", description: "Sync bookings to your calendar" },
  { id: "google_sheets", name: "Google Sheets", icon: "📊", description: "Log data to spreadsheets" },
  { id: "webhook", name: "Webhook", icon: "🔗", description: "Send data to any URL (Zapier, Make, etc.)" },
  { id: "printer", name: "Printer", icon: "🖨️", description: "Print kitchen tickets and receipts" },
] as const;

// Featured expert-setup integrations shown on main page
export const FEATURED_EXPERT_INTEGRATIONS = [
  { id: "square", name: "Square", icon: "⬛", description: "POS and payments" },
  { id: "calendly", name: "Calendly", icon: "📆", description: "Online scheduling" },
  { id: "jobber", name: "Jobber", icon: "🔧", description: "Field service CRM" },
  { id: "hubspot", name: "HubSpot", icon: "🟠", description: "CRM & marketing" },
] as const;
