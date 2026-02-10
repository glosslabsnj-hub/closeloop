import type { BusinessMode } from "@/hooks/useTenantConfig";
import type { WorkflowTrigger, WorkflowNodeType } from "@/types/workflow";

// Variable categories for grouping in UI
export type VariableCategory = "customer" | "order" | "booking" | "dispatch" | "call" | "business";

// Comprehensive variable info with descriptions and examples
export interface VariableInfo {
  key: string;
  label: string;
  description: string;
  example: string;
  category: VariableCategory;
  modes?: BusinessMode[]; // If only applicable to certain modes
}

// All available variables with business-friendly descriptions
export const VARIABLE_INFO: Record<string, VariableInfo> = {
  // Customer Variables (available in all modes)
  customer_name: {
    key: "customer_name",
    label: "Customer Name",
    description: "The customer's full name",
    example: "Sarah Johnson",
    category: "customer",
  },
  customer_phone: {
    key: "customer_phone",
    label: "Customer Phone",
    description: "The customer's phone number",
    example: "(555) 123-4567",
    category: "customer",
  },
  customer_email: {
    key: "customer_email",
    label: "Customer Email",
    description: "The customer's email address",
    example: "sarah@example.com",
    category: "customer",
  },
  caller_phone: {
    key: "caller_phone",
    label: "Caller Phone",
    description: "Phone number of the person who called",
    example: "(555) 987-6543",
    category: "call",
  },

  // Order Variables (food mode)
  order_number: {
    key: "order_number",
    label: "Order Number",
    description: "The unique order reference number",
    example: "#1234",
    category: "order",
    modes: ["food"],
  },
  order_type: {
    key: "order_type",
    label: "Order Type",
    description: "Whether the order is pickup, delivery, or dine-in",
    example: "Pickup",
    category: "order",
    modes: ["food"],
  },
  items_summary: {
    key: "items_summary",
    label: "Items Summary",
    description: "A list of items in the order",
    example: "2x Pizza, 1x Salad, 1x Soda",
    category: "order",
    modes: ["food"],
  },
  special_instructions: {
    key: "special_instructions",
    label: "Special Instructions",
    description: "Any special requests or notes from the customer",
    example: "No onions, extra cheese",
    category: "order",
    modes: ["food"],
  },
  total_cents: {
    key: "total_cents",
    label: "Total (cents)",
    description: "The order total in cents",
    example: "4599",
    category: "order",
    modes: ["food"],
  },
  total_formatted: {
    key: "total_formatted",
    label: "Total",
    description: "The order total formatted with currency",
    example: "$45.99",
    category: "order",
    modes: ["food"],
  },
  requested_time: {
    key: "requested_time",
    label: "Requested Time",
    description: "When the customer wants their order ready",
    example: "6:30 PM",
    category: "order",
    modes: ["food"],
  },
  delivery_address: {
    key: "delivery_address",
    label: "Delivery Address",
    description: "The delivery address for the order",
    example: "123 Main St, Apt 4",
    category: "order",
    modes: ["food"],
  },

  // Booking Variables (service/medical mode)
  booking_id: {
    key: "booking_id",
    label: "Booking ID",
    description: "The unique booking reference number",
    example: "BK-5678",
    category: "booking",
    modes: ["service", "medical"],
  },
  service_name: {
    key: "service_name",
    label: "Service Name",
    description: "The name of the booked service",
    example: "Haircut & Style",
    category: "booking",
    modes: ["service", "medical"],
  },
  service_duration: {
    key: "service_duration",
    label: "Service Duration",
    description: "How long the service takes",
    example: "45 minutes",
    category: "booking",
    modes: ["service", "medical"],
  },
  start_time: {
    key: "start_time",
    label: "Start Time",
    description: "The appointment start time",
    example: "2:00 PM",
    category: "booking",
    modes: ["service", "medical"],
  },
  end_time: {
    key: "end_time",
    label: "End Time",
    description: "The appointment end time",
    example: "2:45 PM",
    category: "booking",
    modes: ["service", "medical"],
  },
  start_date: {
    key: "start_date",
    label: "Appointment Date",
    description: "The date of the appointment",
    example: "Tuesday, March 15",
    category: "booking",
    modes: ["service", "medical"],
  },
  deposit_required: {
    key: "deposit_required",
    label: "Deposit Required",
    description: "Whether a deposit is needed",
    example: "Yes",
    category: "booking",
    modes: ["service"],
  },
  deposit_paid: {
    key: "deposit_paid",
    label: "Deposit Paid",
    description: "Whether the deposit has been paid",
    example: "Yes",
    category: "booking",
    modes: ["service"],
  },

  // Dispatch Variables (dispatch mode)
  job_number: {
    key: "job_number",
    label: "Job Number",
    description: "The unique job reference number",
    example: "J-9012",
    category: "dispatch",
    modes: ["dispatch"],
  },
  job_type: {
    key: "job_type",
    label: "Job Type",
    description: "The type of service requested",
    example: "Airport Pickup",
    category: "dispatch",
    modes: ["dispatch"],
  },
  priority: {
    key: "priority",
    label: "Priority Level",
    description: "How urgent the job is",
    example: "High",
    category: "dispatch",
    modes: ["dispatch"],
  },
  pickup_address: {
    key: "pickup_address",
    label: "Pickup Address",
    description: "Where to pick up the customer/items",
    example: "456 Oak Ave",
    category: "dispatch",
    modes: ["dispatch"],
  },
  dropoff_address: {
    key: "dropoff_address",
    label: "Dropoff Address",
    description: "Where to deliver the customer/items",
    example: "Airport Terminal B",
    category: "dispatch",
    modes: ["dispatch"],
  },
  scheduled_at: {
    key: "scheduled_at",
    label: "Scheduled Time",
    description: "When the job is scheduled",
    example: "3:30 PM today",
    category: "dispatch",
    modes: ["dispatch"],
  },
  estimated_duration: {
    key: "estimated_duration",
    label: "Estimated Duration",
    description: "How long the job should take",
    example: "25 minutes",
    category: "dispatch",
    modes: ["dispatch"],
  },

  // Call Variables (all modes)
  call_duration: {
    key: "call_duration",
    label: "Call Duration",
    description: "How long the call lasted",
    example: "3 minutes 42 seconds",
    category: "call",
  },
  transcript: {
    key: "transcript",
    label: "Call Transcript",
    description: "Full text of the conversation",
    example: "Customer: Hi, I'd like to book...",
    category: "call",
  },
  summary: {
    key: "summary",
    label: "Call Summary",
    description: "AI-generated summary of the call",
    example: "Customer inquired about availability for haircut next Tuesday",
    category: "call",
  },
  outcome: {
    key: "outcome",
    label: "Call Outcome",
    description: "What was accomplished on the call",
    example: "Booked appointment",
    category: "call",
  },
  service_requested: {
    key: "service_requested",
    label: "Service Requested",
    description: "What service the caller asked about",
    example: "Oil change",
    category: "call",
  },

  // Business Variables (all modes)
  business_name: {
    key: "business_name",
    label: "Business Name",
    description: "Your business name",
    example: "Sarah's Salon",
    category: "business",
  },
  business_phone: {
    key: "business_phone",
    label: "Business Phone",
    description: "Your business phone number",
    example: "(555) 111-2222",
    category: "business",
  },
  today: {
    key: "today",
    label: "Today's Date",
    description: "The current date",
    example: "March 15, 2024",
    category: "business",
  },
  now: {
    key: "now",
    label: "Current Time",
    description: "The current time",
    example: "2:45 PM",
    category: "business",
  },
  timezone: {
    key: "timezone",
    label: "Timezone",
    description: "Your business timezone",
    example: "Eastern Time",
    category: "business",
  },
};

// Get variables filtered by business mode
export function getVariablesForMode(mode: BusinessMode): VariableInfo[] {
  return Object.values(VARIABLE_INFO).filter(v => {
    if (!v.modes) return true; // Universal variable
    return v.modes.includes(mode);
  });
}

// Get variables grouped by category
export function getVariablesByCategory(mode: BusinessMode): Record<VariableCategory, VariableInfo[]> {
  const variables = getVariablesForMode(mode);
  const grouped: Record<VariableCategory, VariableInfo[]> = {
    customer: [],
    order: [],
    booking: [],
    dispatch: [],
    call: [],
    business: [],
  };

  for (const v of variables) {
    grouped[v.category].push(v);
  }

  return grouped;
}

// Category labels for display
export const CATEGORY_LABELS: Record<VariableCategory, { label: string; icon: string }> = {
  customer: { label: "Customer Information", icon: "👤" },
  order: { label: "Order Details", icon: "🛒" },
  booking: { label: "Booking Details", icon: "📅" },
  dispatch: { label: "Job Details", icon: "🚚" },
  call: { label: "Call Information", icon: "📞" },
  business: { label: "Business Information", icon: "🏢" },
};

// Automation guide for each business mode
export interface AutomationGuide {
  id: string;
  title: string;
  description: string;
  trigger: WorkflowTrigger;
  primaryAction: WorkflowNodeType;
  steps: string[];
  defaultMessage: string;
  variables: string[];
  tips?: string[];
}

export interface IndustryGuide {
  title: string;
  subtitle: string;
  description: string;
  automations: AutomationGuide[];
  quickStartSteps: string[];
}

export const INDUSTRY_GUIDES: Record<BusinessMode, IndustryGuide> = {
  food: {
    title: "Restaurant & Food Service",
    subtitle: "Orders, Reservations & Catering",
    description: "Set up automations to confirm orders, notify customers when food is ready, and streamline your kitchen workflow.",
    quickStartSteps: [
      "Toggle ON 'Order Confirmation' to automatically text customers when their order is received",
      "Toggle ON 'Order Ready' to notify customers when their food is ready for pickup",
      "Toggle ON 'Print Ticket' to automatically print kitchen tickets for new orders",
      "Customize your messages by clicking 'Edit message' and adding personal touches",
    ],
    automations: [
      {
        id: "order-confirmed",
        title: "Order Confirmation Text",
        description: "Let customers know their order was received and is being prepared",
        trigger: "order.confirmed",
        primaryAction: "notify_sms",
        steps: [
          "Toggle ON 'Text when order is confirmed'",
          "Click 'Edit message' to customize the text",
          "Add the customer's name using {{customer_name}}",
          "Include the order number using {{order_number}}",
          "Optionally mention the pickup time using {{requested_time}}",
        ],
        defaultMessage: "Hi {{customer_name}}! Your order #{{order_number}} is confirmed. We'll have it ready shortly!",
        variables: ["customer_name", "customer_phone", "order_number", "items_summary", "total_formatted", "requested_time"],
        tips: [
          "Keep it short - texts over 160 characters cost more",
          "Include the order number so customers can reference it when they arrive",
        ],
      },
      {
        id: "order-ready",
        title: "Order Ready Notification",
        description: "Alert customers when their food is ready for pickup",
        trigger: "order.ready",
        primaryAction: "notify_sms",
        steps: [
          "Toggle ON 'Text when order is ready'",
          "Edit the message to be friendly and informative",
          "Include the order number for easy reference",
        ],
        defaultMessage: "Great news {{customer_name}}! Your order #{{order_number}} is ready for pickup!",
        variables: ["customer_name", "order_number"],
        tips: [
          "Send this notification as soon as the order is ready to reduce wait times",
        ],
      },
      {
        id: "kitchen-ticket",
        title: "Print Kitchen Ticket",
        description: "Automatically print order tickets for your kitchen",
        trigger: "order.confirmed",
        primaryAction: "print_ticket",
        steps: [
          "Toggle ON 'Print ticket when order confirmed'",
          "Choose between thermal (receipt) or full-page format",
          "Set the number of copies to print",
        ],
        defaultMessage: "",
        variables: [],
        tips: [
          "Use thermal format for quick orders, full-page for detailed catering orders",
        ],
      },
    ],
  },
  service: {
    title: "Service Business",
    subtitle: "Bookings & Appointments",
    description: "Automate booking confirmations, reminders, and follow-ups to keep your schedule running smoothly.",
    quickStartSteps: [
      "Toggle ON 'Booking Confirmation' to automatically confirm new appointments",
      "Customize your confirmation message with appointment details",
      "Toggle ON 'Missed Call Follow-up' to capture leads even when you can't answer",
      "Connect your CRM to automatically sync call summaries",
    ],
    automations: [
      {
        id: "booking-confirmed",
        title: "Booking Confirmation",
        description: "Send automatic confirmation when a booking is made",
        trigger: "booking.confirmed",
        primaryAction: "notify_sms",
        steps: [
          "Toggle ON 'Text when booking is confirmed'",
          "Click 'Edit message' to customize",
          "Include the service name and appointment time",
          "Add any preparation instructions for the customer",
        ],
        defaultMessage: "Hi {{customer_name}}! Your appointment for {{service_name}} on {{start_date}} at {{start_time}} is confirmed. See you soon!",
        variables: ["customer_name", "customer_phone", "service_name", "start_date", "start_time", "end_time"],
        tips: [
          "Include the date AND time to avoid confusion",
          "Mention any preparation needed (e.g., 'Please arrive 10 minutes early')",
        ],
      },
      {
        id: "call-summary-crm",
        title: "Push Call Summaries to CRM",
        description: "Automatically sync call information with your CRM",
        trigger: "call.ended",
        primaryAction: "webhook_push",
        steps: [
          "Toggle ON 'Push call summaries to CRM'",
          "Click 'Set up webhook' to configure",
          "Enter your CRM's webhook URL (or use Zapier)",
          "Test the connection to make sure it works",
        ],
        defaultMessage: "",
        variables: ["customer_name", "caller_phone", "summary", "outcome"],
        tips: [
          "Use Zapier if your CRM doesn't have a direct webhook option",
          "The call summary includes what was discussed and any actions taken",
        ],
      },
      {
        id: "missed-call-followup",
        title: "Missed Call Follow-up",
        description: "Automatically text back when you miss a call",
        trigger: "missed_call",
        primaryAction: "notify_sms",
        steps: [
          "Toggle ON 'Text on missed call'",
          "Customize the follow-up message",
          "Include a way for them to reach you or book online",
        ],
        defaultMessage: "Sorry we missed your call! We'll get back to you shortly. You can also book online at your convenience.",
        variables: ["caller_phone", "business_name", "business_phone"],
        tips: [
          "Respond quickly - leads are more likely to convert within the first few minutes",
          "Include a booking link if you have one",
        ],
      },
    ],
  },
  dispatch: {
    title: "Dispatch & Delivery",
    subtitle: "Jobs & Service Calls",
    description: "Keep customers informed about their service requests and help your team stay organized.",
    quickStartSteps: [
      "Toggle ON 'Job Created Notification' to confirm service requests",
      "Toggle ON 'Job Completed' to request feedback after jobs",
      "Set up team notifications via webhook or SMS",
      "Customize messages with job details and ETAs",
    ],
    automations: [
      {
        id: "dispatch-created",
        title: "Job Request Confirmation",
        description: "Confirm that a service request has been received",
        trigger: "dispatch.created",
        primaryAction: "notify_sms",
        steps: [
          "Toggle ON 'Text when dispatch is created'",
          "Include the job number and type",
          "Add an estimated arrival time if available",
        ],
        defaultMessage: "Hi {{customer_name}}! Your {{job_type}} request #{{job_number}} has been received. A driver will be dispatched shortly.",
        variables: ["customer_name", "customer_phone", "job_number", "job_type", "priority", "pickup_address"],
        tips: [
          "Set expectations early - let customers know roughly when to expect service",
        ],
      },
      {
        id: "dispatch-completed",
        title: "Job Completed & Feedback",
        description: "Thank customers and request feedback after a job",
        trigger: "dispatch.completed",
        primaryAction: "notify_sms",
        steps: [
          "Toggle ON 'Text when job is completed'",
          "Thank the customer for their business",
          "Request a review or rating",
        ],
        defaultMessage: "Thank you for using {{business_name}}! How was your experience with job #{{job_number}}? Reply with 1-5 stars.",
        variables: ["customer_name", "job_number", "business_name"],
        tips: [
          "Keep feedback requests simple - a 1-5 star rating is easy to respond to",
        ],
      },
      {
        id: "team-notification",
        title: "Team Notification",
        description: "Alert your dispatch team when new jobs come in",
        trigger: "dispatch.created",
        primaryAction: "webhook_push",
        steps: [
          "Toggle ON 'Notify team via webhook'",
          "Configure your team notification system",
          "Include priority and pickup location",
        ],
        defaultMessage: "",
        variables: ["job_number", "job_type", "priority", "pickup_address", "customer_phone"],
        tips: [
          "Use Slack or Teams integration via Zapier for instant team alerts",
        ],
      },
    ],
  },
  medical: {
    title: "Medical Practice",
    subtitle: "Appointments & Patient Intake",
    description: "Handle patient communications professionally while maintaining HIPAA compliance.",
    quickStartSteps: [
      "Toggle ON 'Appointment Confirmation' for appointment reminders",
      "Set up intake form notifications for your front desk",
      "Keep messages HIPAA-compliant - avoid including medical details",
      "Use general language that doesn't reveal protected health information",
    ],
    automations: [
      {
        id: "appointment-confirmed",
        title: "Appointment Confirmation",
        description: "Confirm appointments with pre-visit instructions",
        trigger: "booking.confirmed",
        primaryAction: "notify_sms",
        steps: [
          "Toggle ON 'Text when appointment is confirmed'",
          "Keep the message general (HIPAA compliant)",
          "Include arrival instructions",
        ],
        defaultMessage: "Your appointment on {{start_date}} at {{start_time}} is confirmed. Please arrive 15 minutes early with your ID and insurance card.",
        variables: ["customer_name", "start_date", "start_time"],
        tips: [
          "IMPORTANT: Don't include medical details in SMS messages",
          "Remind patients about what to bring (ID, insurance, forms)",
        ],
      },
      {
        id: "intake-notification",
        title: "Intake Form Notification",
        description: "Notify front desk when intake forms are submitted",
        trigger: "intake.created",
        primaryAction: "webhook_push",
        steps: [
          "Toggle ON 'Notify when intake is created'",
          "Set up notification to your front desk",
          "Include urgency level if applicable",
        ],
        defaultMessage: "",
        variables: [],
        tips: [
          "Route urgent intakes to clinical staff immediately",
          "Keep intake data within your secure systems",
        ],
      },
    ],
  },
  general: {
    title: "General Business",
    subtitle: "Leads & Follow-ups",
    description: "Capture every lead and follow up automatically to never miss an opportunity.",
    quickStartSteps: [
      "Toggle ON 'Missed Call Follow-up' to capture leads from missed calls",
      "Set up CRM integration to track all conversations",
      "Customize your follow-up messages to match your brand",
    ],
    automations: [
      {
        id: "missed-call-followup",
        title: "Missed Call Follow-up",
        description: "Automatically reach out when you miss a call",
        trigger: "missed_call",
        primaryAction: "notify_sms",
        steps: [
          "Toggle ON 'Text on missed call'",
          "Write a friendly follow-up message",
          "Include how they can reach you or get more info",
        ],
        defaultMessage: "Sorry we missed your call! We'll get back to you shortly, or you can leave a message here.",
        variables: ["caller_phone", "business_name"],
        tips: [
          "Fast responses convert more leads - aim to respond within minutes",
        ],
      },
      {
        id: "call-summary-crm",
        title: "Call Summary to CRM",
        description: "Push call information to your CRM automatically",
        trigger: "call.ended",
        primaryAction: "webhook_push",
        steps: [
          "Toggle ON 'Push call summaries to CRM'",
          "Configure your webhook URL or use Zapier",
          "Test to make sure data is flowing correctly",
        ],
        defaultMessage: "",
        variables: ["caller_phone", "customer_name", "summary", "outcome"],
        tips: [
          "Use Zapier's 'Webhooks by Zapier' trigger to connect to any CRM",
        ],
      },
    ],
  },
};

// Zapier setup instructions
export const ZAPIER_SETUP_STEPS = [
  {
    step: 1,
    title: "Create a new Zap",
    description: "Go to Zapier.com and click 'Create Zap' or 'Make a Zap'",
  },
  {
    step: 2,
    title: "Choose 'Webhooks by Zapier'",
    description: "Search for 'Webhooks' and select 'Webhooks by Zapier' as your trigger app",
  },
  {
    step: 3,
    title: "Select 'Catch Hook'",
    description: "Choose 'Catch Hook' as the trigger event - this receives data from Voxly",
  },
  {
    step: 4,
    title: "Copy the webhook URL",
    description: "Zapier will give you a unique webhook URL - copy this URL",
  },
  {
    step: 5,
    title: "Paste in Voxly",
    description: "Go back to your automation settings and paste the webhook URL",
  },
  {
    step: 6,
    title: "Send a test",
    description: "Click 'Test Webhook' to send sample data to Zapier",
  },
  {
    step: 7,
    title: "Set up your action",
    description: "Choose what Zapier should do with the data (add to spreadsheet, create CRM record, etc.)",
  },
  {
    step: 8,
    title: "Turn on your Zap",
    description: "Review and turn on your Zap - it will now run automatically!",
  },
];

// Common integration examples
export const INTEGRATION_EXAMPLES = [
  {
    name: "Google Sheets",
    description: "Log all calls to a spreadsheet",
    zapierAction: "Create Spreadsheet Row",
    icon: "📊",
  },
  {
    name: "Slack",
    description: "Get notified in Slack when calls come in",
    zapierAction: "Send Channel Message",
    icon: "💬",
  },
  {
    name: "HubSpot",
    description: "Create or update contacts in HubSpot",
    zapierAction: "Create/Update Contact",
    icon: "🎯",
  },
  {
    name: "Salesforce",
    description: "Log activities and create leads",
    zapierAction: "Create Lead / Log Activity",
    icon: "☁️",
  },
  {
    name: "Gmail",
    description: "Send email notifications to your team",
    zapierAction: "Send Email",
    icon: "📧",
  },
  {
    name: "Trello",
    description: "Create cards for follow-ups",
    zapierAction: "Create Card",
    icon: "📋",
  },
];

// Troubleshooting tips
export const TROUBLESHOOTING_TIPS = [
  {
    problem: "SMS not sending",
    solutions: [
      "Make sure the automation is toggled ON (green)",
      "Check that the customer phone number is valid",
      "Verify your account has SMS credits remaining",
    ],
  },
  {
    problem: "Webhook not working",
    solutions: [
      "Double-check the webhook URL is correct",
      "Make sure the URL starts with https://",
      "Use the 'Test Webhook' button to verify connectivity",
      "Check if your receiving service is online",
    ],
  },
  {
    problem: "Ticket not printing",
    solutions: [
      "Ensure your printer is connected and online",
      "Check that print automation is enabled",
      "Verify the printer is set as the default device",
    ],
  },
  {
    problem: "Variables showing as empty",
    solutions: [
      "Make sure the variable name is spelled correctly with {{brackets}}",
      "Some variables are only available for certain triggers",
      "Check that the source data (order, booking) has that field filled in",
    ],
  },
];
