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
  logo?: string;
  category: IntegrationCategory;
  description: string;
}

// All integrations available for concierge setup
export const POPULAR_INTEGRATIONS: PopularIntegration[] = [
  // Point of Sale
  { id: "square_pos", name: "Square POS", icon: "⬛", logo: "https://cdn.brandfetch.io/idH3E_aos0/w/400/h/400/theme/dark/icon.png", category: "pos", description: "Sync orders and payments with Square" },
  { id: "toast", name: "Toast", icon: "🍞", logo: "https://cdn.brandfetch.io/idJnYpnZvK/w/400/h/400/theme/dark/icon.png", category: "pos", description: "Restaurant POS integration" },
  { id: "clover", name: "Clover", icon: "🍀", logo: "https://cdn.brandfetch.io/idCHPwTnYc/w/400/h/400/theme/dark/icon.png", category: "pos", description: "Connect your Clover POS" },
  { id: "lightspeed", name: "Lightspeed", icon: "⚡", logo: "https://cdn.brandfetch.io/idQELrpev5/w/400/h/400/theme/dark/icon.png", category: "pos", description: "Retail and restaurant POS" },
  { id: "touchbistro", name: "TouchBistro", icon: "📱", logo: "https://cdn.brandfetch.io/id_KsyK_DJ/w/400/h/400/theme/dark/icon.png", category: "pos", description: "iPad restaurant POS" },

  // CRM & Marketing
  { id: "hubspot", name: "HubSpot", icon: "🟠", logo: "https://cdn.brandfetch.io/idZHcZ_i7F/w/400/h/400/theme/dark/icon.png", category: "crm", description: "CRM and marketing automation" },
  { id: "salesforce", name: "Salesforce", icon: "☁️", logo: "https://cdn.brandfetch.io/id20mQyGeY/w/400/h/400/theme/dark/icon.png", category: "crm", description: "Enterprise CRM platform" },
  { id: "gohighlevel", name: "GoHighLevel", icon: "🚀", logo: "https://cdn.brandfetch.io/idibKqG8hq/w/400/h/400/theme/dark/icon.png", category: "crm", description: "All-in-one marketing platform" },
  { id: "pipedrive", name: "Pipedrive", icon: "🔵", logo: "https://cdn.brandfetch.io/idoJ_D2sU3/w/400/h/400/theme/dark/icon.png", category: "crm", description: "Sales CRM and pipeline" },
  { id: "mailchimp", name: "Mailchimp", icon: "🐵", logo: "https://cdn.brandfetch.io/idnrCPuv87/w/400/h/400/theme/dark/icon.png", category: "crm", description: "Email marketing and automation" },

  // Scheduling
  { id: "calendly", name: "Calendly", icon: "📆", logo: "https://cdn.brandfetch.io/idOJxVnpHC/w/400/h/400/theme/dark/icon.png", category: "scheduling", description: "Online appointment scheduling" },
  { id: "acuity", name: "Acuity Scheduling", icon: "📋", logo: "https://cdn.brandfetch.io/idJecp74LI/w/400/h/400/theme/dark/icon.png", category: "scheduling", description: "Client scheduling software" },
  { id: "square_appointments", name: "Square Appointments", icon: "📅", logo: "https://cdn.brandfetch.io/idH3E_aos0/w/400/h/400/theme/dark/icon.png", category: "scheduling", description: "Booking integrated with Square" },

  // Field Service
  { id: "servicetitan", name: "ServiceTitan", icon: "🛠️", logo: "https://cdn.brandfetch.io/idjJU3DLHO/w/400/h/400/theme/dark/icon.png", category: "field_service", description: "Home service business software" },
  { id: "housecallpro", name: "Housecall Pro", icon: "🏠", logo: "https://cdn.brandfetch.io/idCQDfdhLz/w/400/h/400/theme/dark/icon.png", category: "field_service", description: "Field service management" },
  { id: "jobber", name: "Jobber", icon: "🔧", logo: "https://cdn.brandfetch.io/id2S3pCLbu/w/400/h/400/theme/dark/icon.png", category: "field_service", description: "Job scheduling and invoicing" },
  { id: "fieldedge", name: "FieldEdge", icon: "⚙️", logo: "https://cdn.brandfetch.io/idHKtLfVPo/w/400/h/400/theme/dark/icon.png", category: "field_service", description: "HVAC and plumbing software" },
  { id: "workiz", name: "Workiz", icon: "📊", logo: "https://cdn.brandfetch.io/idyOUYYHCA/w/400/h/400/theme/dark/icon.png", category: "field_service", description: "Field service scheduling" },

  // Dispatch & Logistics
  { id: "towbook", name: "Towbook", icon: "🚗", logo: "https://cdn.brandfetch.io/ideSc6Lc1O/w/400/h/400/theme/dark/icon.png", category: "dispatch", description: "Towing dispatch software" },
  { id: "onfleet", name: "Onfleet", icon: "🚚", logo: "https://cdn.brandfetch.io/idaAwm0z3o/w/400/h/400/theme/dark/icon.png", category: "dispatch", description: "Delivery management platform" },
  { id: "samsara", name: "Samsara", icon: "📍", logo: "https://cdn.brandfetch.io/idVVWT5VRb/w/400/h/400/theme/dark/icon.png", category: "dispatch", description: "Fleet operations platform" },

  // Medical
  { id: "athenahealth", name: "AthenaHealth", icon: "🏥", logo: "https://cdn.brandfetch.io/idZ5Z6RBhG/w/400/h/400/theme/dark/icon.png", category: "medical", description: "Medical practice management" },
  { id: "epic", name: "Epic", icon: "💊", logo: "https://cdn.brandfetch.io/idWqBXvqnl/w/400/h/400/theme/dark/icon.png", category: "medical", description: "Healthcare EHR system" },
  { id: "practicefusion", name: "Practice Fusion", icon: "🩺", logo: "https://cdn.brandfetch.io/ideqAU0Yb5/w/400/h/400/theme/dark/icon.png", category: "medical", description: "Cloud-based EHR" },
];

// Self-setup integrations (user can connect themselves)
// modes: which business modes see this integration. Omit = all modes.
// comingSoon: true = show "Coming Soon" badge, never show a Connect button that will fail.
// whatWillSync: shown on the success screen after connecting.
export const SELF_SETUP_INTEGRATIONS = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    icon: "📅",
    logo: "https://cdn.brandfetch.io/idnrCPuv87/theme/dark/symbol.svg?c=1id1sPTWgaw12fOGbUd",
    description: "Sync bookings to your calendar",
    modes: ["service", "medical", "sales", "general"],
    whatWillSync: "New bookings will appear as events on your Google Calendar. Cancellations and reschedules update automatically.",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    icon: "📊",
    logo: "https://cdn.brandfetch.io/idnrCPuv87/theme/dark/symbol.svg?c=1id1sPTWgaw12fOGbUd",
    description: "Log calls and leads to a spreadsheet",
    whatWillSync: "Every call, lead, and booking will be logged as a new row in your spreadsheet. Includes caller name, phone, date, and outcome.",
  },
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    icon: "📒",
    logo: "https://cdn.brandfetch.io/id_0dwMfEz/w/400/h/400/theme/dark/icon.png",
    description: "Sync invoices & payments",
    comingSoon: true,
    whatWillSync: "Confirmed bookings will create invoices in QuickBooks. Customer records will sync both ways.",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    icon: "🟠",
    logo: "https://cdn.brandfetch.io/idZHcZ_i7F/w/400/h/400/theme/dark/icon.png",
    description: "CRM and marketing automation",
    modes: ["service", "general", "sales"],
    comingSoon: true,
    whatWillSync: "New leads and contacts from calls will sync to your HubSpot CRM. Deal pipeline updates automatically when bookings are created.",
  },
  {
    id: "square_pos",
    name: "Square",
    icon: "⬛",
    logo: "https://cdn.brandfetch.io/idH3E_aos0/w/400/h/400/theme/dark/icon.png",
    description: "POS, orders & payments",
    modes: ["food", "service", "general"],
    comingSoon: true,
    whatWillSync: "Orders placed via phone will appear in your Square POS. Payments and refunds sync back to Flux.",
  },
  {
    id: "stripe_connect",
    name: "Stripe",
    icon: "💳",
    logo: "https://cdn.brandfetch.io/idxAg10C0L/w/400/h/400/theme/dark/icon.png",
    description: "Collect deposits when booking",
    comingSoon: true,
    whatWillSync: "Customers can pay a deposit by card when the AI books their appointment. Payments go directly to your Stripe account.",
  },
  {
    id: "jobber",
    name: "Jobber",
    icon: "🔧",
    logo: "https://cdn.brandfetch.io/id2S3pCLbu/w/400/h/400/theme/dark/icon.png",
    description: "Field service scheduling & invoicing",
    modes: ["service", "dispatch"],
    comingSoon: true,
    whatWillSync: "New bookings create work orders in Jobber. Customer info and job details sync both ways.",
  },
  {
    id: "housecallpro",
    name: "Housecall Pro",
    icon: "🏠",
    logo: "https://cdn.brandfetch.io/idCQDfdhLz/w/400/h/400/theme/dark/icon.png",
    description: "Field service management",
    modes: ["service", "dispatch"],
    comingSoon: true,
    whatWillSync: "New bookings create jobs in Housecall Pro. Customer profiles and job notes sync automatically.",
  },
  {
    id: "fieldedge",
    name: "FieldEdge",
    icon: "⚙️",
    logo: "https://cdn.brandfetch.io/idHKtLfVPo/w/400/h/400/theme/dark/icon.png",
    description: "Sync bookings & dispatches with FieldEdge",
    modes: ["service", "dispatch"],
    whatWillSync: "Bookings sync as service calls in FieldEdge. Customer records and technician assignments update in real time.",
  },
  {
    id: "webhook",
    name: "Custom Connection",
    icon: "🔗",
    description: "Send data to any app (Zapier, Make, etc.)",
    whatWillSync: "We'll POST call, booking, and lead data to your URL every time something happens. Works with Zapier, Make, and any custom system.",
  },
  {
    id: "printer",
    name: "Printer",
    icon: "🖨️",
    description: "Print kitchen tickets and receipts",
    modes: ["food"],
    whatWillSync: "New orders will automatically print to your kitchen or receipt printer.",
  },
] as const;

// Featured expert-setup integrations shown on main page
// These are integrations that require concierge/custom setup
// Each mode should show 3-4 relevant integrations so the section never looks empty.
export const FEATURED_EXPERT_INTEGRATIONS = [
  // Service mode
  { id: "servicetitan", name: "ServiceTitan", icon: "🛠️", logo: "https://cdn.brandfetch.io/idjJU3DLHO/w/400/h/400/theme/dark/icon.png", description: "Home service management", modes: ["service"] },
  { id: "calendly", name: "Calendly", icon: "📆", logo: "https://cdn.brandfetch.io/idOJxVnpHC/w/400/h/400/theme/dark/icon.png", description: "Online scheduling", modes: ["service", "medical", "sales", "general"] },
  { id: "salesforce", name: "Salesforce", icon: "☁️", logo: "https://cdn.brandfetch.io/id20mQyGeY/w/400/h/400/theme/dark/icon.png", description: "Enterprise CRM", modes: ["service", "sales", "general"] },
  // Food mode
  { id: "toast", name: "Toast", icon: "🍞", logo: "https://cdn.brandfetch.io/idJnYpnZvK/w/400/h/400/theme/dark/icon.png", description: "Restaurant POS", modes: ["food"] },
  { id: "clover", name: "Clover", icon: "🍀", logo: "https://cdn.brandfetch.io/idCHPwTnYc/w/400/h/400/theme/dark/icon.png", description: "POS for restaurants and cafes", modes: ["food"] },
  { id: "touchbistro", name: "TouchBistro", icon: "📱", logo: "https://cdn.brandfetch.io/id_KsyK_DJ/w/400/h/400/theme/dark/icon.png", description: "iPad restaurant POS", modes: ["food"] },
  // Medical mode
  { id: "athenahealth", name: "AthenaHealth", icon: "🏥", logo: "https://cdn.brandfetch.io/idZ5Z6RBhG/w/400/h/400/theme/dark/icon.png", description: "Medical practice management", modes: ["medical"] },
  { id: "practicefusion", name: "Practice Fusion", icon: "🩺", logo: "https://cdn.brandfetch.io/ideqAU0Yb5/w/400/h/400/theme/dark/icon.png", description: "Cloud EHR and scheduling", modes: ["medical"] },
  { id: "epic", name: "Epic", icon: "💊", logo: "https://cdn.brandfetch.io/idWqBXvqnl/w/400/h/400/theme/dark/icon.png", description: "Enterprise healthcare EHR", modes: ["medical"] },
  // Dispatch mode
  { id: "towbook", name: "Towbook", icon: "🚗", logo: "https://cdn.brandfetch.io/ideSc6Lc1O/w/400/h/400/theme/dark/icon.png", description: "Towing dispatch and management", modes: ["dispatch"] },
  { id: "onfleet", name: "Onfleet", icon: "🚚", logo: "https://cdn.brandfetch.io/idaAwm0z3o/w/400/h/400/theme/dark/icon.png", description: "Last-mile delivery management", modes: ["dispatch"] },
  { id: "samsara", name: "Samsara", icon: "📍", logo: "https://cdn.brandfetch.io/idVVWT5VRb/w/400/h/400/theme/dark/icon.png", description: "Fleet GPS and operations", modes: ["dispatch"] },
  // Sales mode
  { id: "hubspot", name: "HubSpot", icon: "🟠", logo: "https://cdn.brandfetch.io/idZHcZ_i7F/w/400/h/400/theme/dark/icon.png", description: "CRM and sales automation", modes: ["sales"] },
  { id: "pipedrive", name: "Pipedrive", icon: "🔵", logo: "https://cdn.brandfetch.io/idoJ_D2sU3/w/400/h/400/theme/dark/icon.png", description: "Sales pipeline management", modes: ["sales"] },
  // General mode
  { id: "gohighlevel", name: "GoHighLevel", icon: "🚀", logo: "https://cdn.brandfetch.io/idibKqG8hq/w/400/h/400/theme/dark/icon.png", description: "All-in-one marketing platform", modes: ["general"] },
] as const;
