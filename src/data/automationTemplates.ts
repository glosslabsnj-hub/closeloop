import type { BusinessMode } from "@/hooks/useTenantConfig";

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: "booking" | "order" | "dispatch" | "call" | "intake" | "notification";
  businessModes: BusinessMode[];
  steps: AutomationTemplateStep[];
  recommended?: boolean;
}

export interface AutomationTemplateStep {
  order: number;
  action: string;
  provider: string;
  description: string;
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  // Service Business Templates
  {
    id: "booking-full-workflow",
    name: "Complete Booking Workflow",
    description: "When a booking is created, sync to calendar, send SMS confirmation, and notify via webhook",
    category: "booking",
    businessModes: ["service", "medical", "general"],
    recommended: true,
    steps: [
      { order: 1, action: "create_calendar_event", provider: "google_calendar", description: "Add to Google Calendar" },
      { order: 2, action: "send_sms", provider: "sms", description: "Send SMS confirmation to customer" },
      { order: 3, action: "send_webhook", provider: "webhook", description: "Notify your external system" },
    ],
  },
  {
    id: "booking-cancellation",
    name: "Handle Cancellation",
    description: "When a booking is cancelled, update calendar, alert owner, and message customer",
    category: "booking",
    businessModes: ["service", "medical", "general"],
    steps: [
      { order: 1, action: "delete_calendar_event", provider: "google_calendar", description: "Remove from calendar" },
      { order: 2, action: "send_sms_to_owner", provider: "sms", description: "Alert business owner" },
      { order: 3, action: "send_sms", provider: "sms", description: "Confirm cancellation to customer" },
    ],
  },
  {
    id: "job-complete",
    name: "Job Completion Follow-up",
    description: "After a job is marked complete, trigger invoice and request review",
    category: "booking",
    businessModes: ["service"],
    steps: [
      { order: 1, action: "send_webhook", provider: "webhook", description: "Trigger invoice generation" },
      { order: 2, action: "send_sms", provider: "sms", description: "Request review from customer" },
    ],
  },

  // Restaurant Templates
  {
    id: "order-kitchen-flow",
    name: "New Order → Kitchen",
    description: "When an order comes in, print ticket, SMS customer, and sync to POS",
    category: "order",
    businessModes: ["food"],
    recommended: true,
    steps: [
      { order: 1, action: "print_receipt", provider: "printer", description: "Print kitchen ticket" },
      { order: 2, action: "send_sms", provider: "sms", description: "Confirm order to customer" },
      { order: 3, action: "send_webhook", provider: "webhook", description: "Sync to POS system" },
    ],
  },
  {
    id: "order-ready",
    name: "Order Ready Notification",
    description: "When order is marked ready, notify customer for pickup",
    category: "order",
    businessModes: ["food"],
    steps: [
      { order: 1, action: "send_sms", provider: "sms", description: "SMS customer their order is ready" },
    ],
  },
  {
    id: "delivery-dispatch",
    name: "Delivery Order Dispatch",
    description: "For delivery orders, dispatch to driver and track ETA",
    category: "order",
    businessModes: ["food"],
    steps: [
      { order: 1, action: "print_receipt", provider: "printer", description: "Print delivery ticket" },
      { order: 2, action: "send_webhook", provider: "webhook", description: "Dispatch to driver system" },
      { order: 3, action: "send_sms", provider: "sms", description: "Notify customer with ETA" },
    ],
  },

  // Dispatch Templates
  {
    id: "dispatch-urgent",
    name: "Urgent Dispatch Alert",
    description: "For urgent jobs, immediately SMS the team and log to system",
    category: "dispatch",
    businessModes: ["dispatch"],
    recommended: true,
    steps: [
      { order: 1, action: "send_sms_to_owner", provider: "sms", description: "Alert dispatch team" },
      { order: 2, action: "send_webhook", provider: "webhook", description: "Log to dispatch system" },
      { order: 3, action: "append_sheet_row", provider: "google_sheets", description: "Track in spreadsheet" },
    ],
  },
  {
    id: "dispatch-assigned",
    name: "Job Assigned Notification",
    description: "When a job is assigned, notify the driver and customer",
    category: "dispatch",
    businessModes: ["dispatch"],
    steps: [
      { order: 1, action: "send_sms", provider: "sms", description: "Notify assigned driver" },
      { order: 2, action: "send_sms", provider: "sms", description: "Update customer with ETA" },
    ],
  },
  {
    id: "dispatch-complete",
    name: "Job Completion & Billing",
    description: "When job is complete, trigger billing and request feedback",
    category: "dispatch",
    businessModes: ["dispatch"],
    steps: [
      { order: 1, action: "send_webhook", provider: "webhook", description: "Trigger invoice/billing" },
      { order: 2, action: "send_sms", provider: "sms", description: "Request customer feedback" },
      { order: 3, action: "append_sheet_row", provider: "google_sheets", description: "Log completion" },
    ],
  },

  {
    id: "dispatch-en-route",
    name: "Driver En Route Notification",
    description: "When driver starts heading out, SMS the customer with ETA",
    category: "dispatch",
    businessModes: ["dispatch"],
    steps: [
      { order: 1, action: "send_sms", provider: "sms", description: "SMS customer with driver ETA" },
    ],
  },
  {
    id: "dispatch-escalation",
    name: "Job Escalation Alert",
    description: "Alert manager when a job stays pending too long",
    category: "dispatch",
    businessModes: ["dispatch"],
    steps: [
      { order: 1, action: "send_sms_to_owner", provider: "sms", description: "Alert manager about stuck job" },
      { order: 2, action: "send_webhook", provider: "webhook", description: "Log escalation event" },
    ],
  },
  {
    id: "dispatch-customer-eta",
    name: "Customer ETA Update",
    description: "Send updated ETA to customer when driver status changes",
    category: "dispatch",
    businessModes: ["dispatch"],
    steps: [
      { order: 1, action: "send_sms", provider: "sms", description: "SMS customer with updated ETA" },
    ],
  },
  {
    id: "dispatch-no-show",
    name: "Customer No-Show",
    description: "When driver arrives but customer isn't there, notify team and log it",
    category: "dispatch",
    businessModes: ["dispatch"],
    steps: [
      { order: 1, action: "send_sms_to_owner", provider: "sms", description: "Alert dispatch about no-show" },
      { order: 2, action: "send_webhook", provider: "webhook", description: "Log no-show to external system" },
      { order: 3, action: "send_sms", provider: "sms", description: "SMS customer about missed arrival" },
    ],
  },

  // Medical Templates
  {
    id: "appointment-booked",
    name: "Appointment Confirmation",
    description: "New appointment: sync calendar, update patient portal, log record",
    category: "intake",
    businessModes: ["medical"],
    recommended: true,
    steps: [
      { order: 1, action: "create_calendar_event", provider: "google_calendar", description: "Add to provider calendar" },
      { order: 2, action: "send_sms", provider: "sms", description: "Confirm with patient" },
      { order: 3, action: "send_webhook", provider: "webhook", description: "Sync to EHR/patient portal" },
    ],
  },
  {
    id: "no-show-handling",
    name: "No-Show Handling",
    description: "Patient no-show: flag record, send reschedule prompt",
    category: "intake",
    businessModes: ["medical"],
    steps: [
      { order: 1, action: "send_webhook", provider: "webhook", description: "Flag patient record" },
      { order: 2, action: "send_sms", provider: "sms", description: "Send reschedule prompt" },
    ],
  },
  {
    id: "intake-complete",
    name: "Intake Completion",
    description: "After intake is done, notify provider and sync to EHR",
    category: "intake",
    businessModes: ["medical"],
    steps: [
      { order: 1, action: "send_sms_to_owner", provider: "sms", description: "Notify provider" },
      { order: 2, action: "send_webhook", provider: "webhook", description: "Sync to EHR system" },
    ],
  },

  // Universal Templates
  {
    id: "call-summary-log",
    name: "Log All Calls",
    description: "After every call, log summary to spreadsheet and webhook",
    category: "call",
    businessModes: ["service", "food", "dispatch", "medical", "general"],
    steps: [
      { order: 1, action: "append_sheet_row", provider: "google_sheets", description: "Log to spreadsheet" },
      { order: 2, action: "send_webhook", provider: "webhook", description: "Send to CRM/external system" },
    ],
  },
  {
    id: "lead-capture-full",
    name: "Full Lead Capture",
    description: "New lead: log to sheets, send to CRM, notify team",
    category: "call",
    businessModes: ["service", "dispatch", "medical", "general"],
    recommended: true,
    steps: [
      { order: 1, action: "append_sheet_row", provider: "google_sheets", description: "Add to lead spreadsheet" },
      { order: 2, action: "send_webhook", provider: "webhook", description: "Push to CRM" },
      { order: 3, action: "send_sms_to_owner", provider: "sms", description: "Alert sales team" },
    ],
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: "booking", label: "Booking & Scheduling", icon: "📅" },
  { id: "order", label: "Orders & Kitchen", icon: "🍽️" },
  { id: "dispatch", label: "Dispatch & Jobs", icon: "🚚" },
  { id: "call", label: "Calls & Leads", icon: "📞" },
  { id: "intake", label: "Patient Intake", icon: "🏥" },
  { id: "notification", label: "Notifications", icon: "🔔" },
];

export function getTemplatesForMode(mode: BusinessMode): AutomationTemplate[] {
  return AUTOMATION_TEMPLATES.filter(t => t.businessModes.includes(mode));
}

export function getRecommendedTemplates(mode: BusinessMode): AutomationTemplate[] {
  return AUTOMATION_TEMPLATES.filter(t => t.businessModes.includes(mode) && t.recommended);
}
