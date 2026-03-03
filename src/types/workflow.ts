// Workflow Engine Types

export type WorkflowTrigger =
  | "order.created" | "order.confirmed" | "order.ready" | "order.completed"
  | "booking.created" | "booking.confirmed" | "booking.completed"
  | "dispatch.created" | "dispatch.confirmed" | "dispatch.completed"
  | "reservation.created" | "reservation.confirmed"
  | "catering.created" | "catering.quoted"
  | "intake.created" | "intake.scheduled"
  | "call.ended" | "sms.received" | "missed_call";

export type WorkflowStatus = "draft" | "active" | "paused" | "archived";

export type WorkflowNodeType =
  | "print_ticket" | "notify_sms" | "notify_email" | "webhook_push"
  | "update_crm" | "create_calendar_event" | "assign_to_user"
  | "delay" | "branch" | "set_field";

export type WorkflowRunStatus = "running" | "success" | "failed" | "cancelled";

export type WorkflowRunStepStatus = "queued" | "running" | "success" | "failed" | "skipped";

export interface Workflow {
  id: string;
  tenant_id: string;
  location_id: string | null;
  name: string;
  description: string | null;
  trigger: WorkflowTrigger;
  status: WorkflowStatus;
  version: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_type: WorkflowNodeType;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  created_at: string;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  from_node_id: string;
  to_node_id: string;
  condition: Record<string, unknown>;
  label: string | null;
  created_at: string;
}

export interface WorkflowRun {
  id: string;
  tenant_id: string;
  workflow_id: string;
  trigger: WorkflowTrigger;
  entity_type: string;
  entity_id: string;
  status: WorkflowRunStatus;
  context: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

export interface WorkflowRunStep {
  id: string;
  run_id: string;
  node_id: string;
  node_type: WorkflowNodeType;
  status: WorkflowRunStepStatus;
  started_at: string;
  finished_at: string | null;
  output: Record<string, unknown>;
  error: string | null;
}

export interface WorkflowScheduledStep {
  id: string;
  run_id: string;
  node_id: string;
  scheduled_for: string;
  executed: boolean;
  created_at: string;
}

// Extended types with relations
export interface WorkflowWithNodes extends Workflow {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowRunWithSteps extends WorkflowRun {
  steps: WorkflowRunStep[];
  workflow?: Workflow;
}

// Node configuration schemas
export interface PrintTicketConfig {
  format?: "thermal" | "full";
  copies?: number;
}

export interface NotifySmsConfig {
  to: string; // phone number or {{variable}}
  message: string;
}

export interface NotifyEmailConfig {
  to: string; // email or {{variable}}
  subject: string;
  body: string;
}

export interface WebhookPushConfig {
  url: string;
  method?: "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
  body_template?: Record<string, unknown>;
}

export interface DelayConfig {
  minutes?: number;
  hours?: number;
  until?: string; // time like "09:00"
}

export interface BranchCondition {
  field: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains";
  value: string | number | boolean;
}

export interface BranchConfig {
  conditions: BranchCondition[];
}

export interface SetFieldConfig {
  entity_field: string;
  value: string | number | boolean;
}

export interface AssignToUserConfig {
  user_id: string | "round_robin";
}

// Template variables available by entity type
export const TEMPLATE_VARIABLES = {
  order: [
    "order_number", "order_type", "status",
    "customer_name", "customer_phone", "customer_email",
    "items_summary", "special_instructions",
    "total_cents", "total_formatted",
    "requested_time", "delivery_address"
  ],
  booking: [
    "booking_id", "status",
    "customer_name", "customer_phone", "customer_email",
    "service_name", "service_duration",
    "start_time", "end_time", "start_date",
    "deposit_required", "deposit_paid"
  ],
  dispatch: [
    "job_number", "job_type", "priority", "status",
    "customer_name", "customer_phone",
    "pickup_address", "dropoff_address",
    "scheduled_at", "estimated_duration"
  ],
  call: [
    "caller_phone", "call_duration",
    "transcript", "summary", "outcome",
    "customer_name", "service_requested"
  ],
  common: [
    "business_name", "business_phone",
    "today", "now", "timezone"
  ]
} as const;

// Trigger display metadata
export const TRIGGER_METADATA: Record<WorkflowTrigger, { label: string; icon: string; entityType: string }> = {
  "order.created": { label: "Order Created", icon: "🛒", entityType: "order" },
  "order.confirmed": { label: "Order Confirmed", icon: "✅", entityType: "order" },
  "order.ready": { label: "Order Ready", icon: "🍽️", entityType: "order" },
  "order.completed": { label: "Order Completed", icon: "📦", entityType: "order" },
  "booking.created": { label: "Booking Created", icon: "📅", entityType: "booking" },
  "booking.confirmed": { label: "Booking Confirmed", icon: "✅", entityType: "booking" },
  "booking.completed": { label: "Booking Completed", icon: "✔️", entityType: "booking" },
  "dispatch.created": { label: "Dispatch Created", icon: "🚚", entityType: "dispatch" },
  "dispatch.confirmed": { label: "Dispatch Confirmed", icon: "✅", entityType: "dispatch" },
  "dispatch.completed": { label: "Dispatch Completed", icon: "🏁", entityType: "dispatch" },
  "reservation.created": { label: "Reservation Created", icon: "🍴", entityType: "reservation" },
  "reservation.confirmed": { label: "Reservation Confirmed", icon: "✅", entityType: "reservation" },
  "catering.created": { label: "Catering Request", icon: "🎉", entityType: "catering" },
  "catering.quoted": { label: "Catering Quoted", icon: "💰", entityType: "catering" },
  "intake.created": { label: "Intake Created", icon: "📋", entityType: "intake" },
  "intake.scheduled": { label: "Intake Scheduled", icon: "📅", entityType: "intake" },
  "call.ended": { label: "Call Ended", icon: "📞", entityType: "call" },
  "sms.received": { label: "SMS Received", icon: "💬", entityType: "sms" },
  "missed_call": { label: "Missed Call", icon: "📵", entityType: "call" },
};

// Node type display metadata
export const NODE_TYPE_METADATA: Record<WorkflowNodeType, { label: string; icon: string; description: string }> = {
  print_ticket: { label: "Print Ticket", icon: "🖨️", description: "Print a ticket for the order" },
  notify_sms: { label: "Send SMS", icon: "📱", description: "Send an SMS notification" },
  notify_email: { label: "Send Email", icon: "📧", description: "Send an email notification" },
  webhook_push: { label: "Forward to App", icon: "🔗", description: "Send info to your other business software" },
  update_crm: { label: "Update CRM", icon: "🔄", description: "Sync with your CRM" },
  create_calendar_event: { label: "Calendar Event", icon: "📅", description: "Create a calendar event" },
  assign_to_user: { label: "Assign", icon: "👤", description: "Assign to a team member" },
  delay: { label: "Wait", icon: "⏰", description: "Wait before continuing" },
  branch: { label: "Branch", icon: "🔀", description: "Conditional branching" },
  set_field: { label: "Set Field", icon: "📝", description: "Update a field value" },
};
