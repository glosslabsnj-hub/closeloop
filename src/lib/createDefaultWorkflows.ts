import { supabase } from "@/integrations/supabase/client";
import type { WorkflowTrigger, WorkflowNodeType, WorkflowStatus } from "@/types/workflow";
import type { BusinessMode } from "@/hooks/useTenantConfig";

// Pre-configured node for workflow templates
interface TemplateNode {
  node_type: WorkflowNodeType;
  name: string;
  config: Record<string, unknown>;
}

interface DefaultWorkflow {
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  nodes: TemplateNode[];
}

// Default workflows by business mode
const DEFAULT_WORKFLOWS: Record<BusinessMode, DefaultWorkflow[]> = {
  service: [
    {
      name: "Booking Confirmed",
      description: "Notify customer when a booking is confirmed",
      trigger: "booking.confirmed",
      nodes: [
        {
          node_type: "notify_sms",
          name: "Send SMS Confirmation",
          config: {
            to: "{{customer_phone}}",
            message: "Hi {{customer_name}}! Your appointment for {{service_name}} on {{start_date}} is confirmed. See you soon!",
          },
        },
      ],
    },
    {
      name: "Call Summary to CRM",
      description: "Push call summaries to your CRM",
      trigger: "call.ended",
      nodes: [
        {
          node_type: "webhook_push",
          name: "Push to CRM",
          config: {
            url: "",
            method: "POST",
            body_template: {
              event: "call.ended",
              customer_name: "{{customer_name}}",
              summary: "{{summary}}",
              outcome: "{{outcome}}",
            },
          },
        },
      ],
    },
  ],
  food: [
    {
      name: "Order Confirmed",
      description: "Print ticket and SMS customer when order is confirmed",
      trigger: "order.confirmed",
      nodes: [
        {
          node_type: "print_ticket",
          name: "Print Kitchen Ticket",
          config: {
            format: "thermal",
            copies: 1,
          },
        },
        {
          node_type: "notify_sms",
          name: "SMS Customer",
          config: {
            to: "{{customer_phone}}",
            message: "Hi {{customer_name}}! Your order #{{order_number}} is confirmed. We'll have it ready shortly!",
          },
        },
      ],
    },
    {
      name: "Order Ready",
      description: "Alert customer when order is ready for pickup",
      trigger: "order.ready",
      nodes: [
        {
          node_type: "notify_sms",
          name: "Notify Customer Ready",
          config: {
            to: "{{customer_phone}}",
            message: "Great news {{customer_name}}! Your order #{{order_number}} is ready for pickup!",
          },
        },
      ],
    },
  ],
  dispatch: [
    {
      name: "Dispatch Created",
      description: "Notify team and send follow-up SMS to customer",
      trigger: "dispatch.created",
      nodes: [
        {
          node_type: "notify_sms",
          name: "SMS Customer",
          config: {
            to: "{{customer_phone}}",
            message: "Hi {{customer_name}}! Your {{job_type}} request #{{job_number}} has been received. A driver will be dispatched shortly.",
          },
        },
      ],
    },
    {
      name: "Job Completed",
      description: "Send feedback request to customer",
      trigger: "dispatch.completed",
      nodes: [
        {
          node_type: "notify_sms",
          name: "Request Feedback",
          config: {
            to: "{{customer_phone}}",
            message: "Thank you for choosing us! How was your experience with job #{{job_number}}? Reply with 1-5 stars.",
          },
        },
      ],
    },
  ],
  medical: [
    {
      name: "Intake Created",
      description: "Route intake form and notify staff (HIPAA compliant)",
      trigger: "intake.created",
      nodes: [
        {
          node_type: "webhook_push",
          name: "Notify Front Desk",
          config: {
            url: "",
            method: "POST",
            body_template: {
              event: "intake.created",
              urgency: "{{urgency_level}}",
              preferred_date: "{{preferred_date}}",
            },
          },
        },
      ],
    },
    {
      name: "Appointment Confirmed",
      description: "Send confirmation SMS with pre-visit instructions",
      trigger: "booking.confirmed",
      nodes: [
        {
          node_type: "notify_sms",
          name: "Confirm Appointment",
          config: {
            to: "{{customer_phone}}",
            message: "Your appointment on {{start_date}} is confirmed. Please arrive 15 minutes early with your ID and insurance card.",
          },
        },
      ],
    },
  ],
  general: [
    {
      name: "Call Summary",
      description: "Push call summary to webhook after calls",
      trigger: "call.ended",
      nodes: [
        {
          node_type: "webhook_push",
          name: "Push Call Summary",
          config: {
            url: "",
            method: "POST",
            body_template: {
              event: "call.ended",
              caller: "{{caller_phone}}",
              summary: "{{summary}}",
              outcome: "{{outcome}}",
            },
          },
        },
      ],
    },
  ],
  sales: [
    {
      name: "Appointment Confirmed",
      description: "Notify prospect when a showroom appointment is confirmed",
      trigger: "booking.confirmed",
      nodes: [
        {
          node_type: "notify_sms",
          name: "Send SMS Confirmation",
          config: {
            to: "{{customer_phone}}",
            message: "Hi {{customer_name}}! Your appointment at {{business_name}} on {{start_date}} is confirmed. We look forward to seeing you!",
          },
        },
      ],
    },
    {
      name: "Call Summary to CRM",
      description: "Push call summaries and lead info to your CRM",
      trigger: "call.ended",
      nodes: [
        {
          node_type: "webhook_push",
          name: "Push to CRM",
          config: {
            url: "",
            method: "POST",
            body_template: {
              event: "call.ended",
              customer_name: "{{customer_name}}",
              summary: "{{summary}}",
              outcome: "{{outcome}}",
              service_requested: "{{service_requested}}",
            },
          },
        },
      ],
    },
  ],
};

// Universal workflow for all modes
const UNIVERSAL_WORKFLOW: DefaultWorkflow = {
  name: "Missed Call Follow-up",
  description: "Automatically text when a call is missed",
  trigger: "missed_call",
  nodes: [
    {
      node_type: "notify_sms",
      name: "Send Callback Text",
      config: {
        to: "{{caller_phone}}",
        message: "Sorry we missed your call! We'll get back to you shortly, or you can leave a message here.",
      },
    },
  ],
};

/**
 * Create default workflows for a new tenant based on their business mode.
 * Called automatically during onboarding to provide zero-setup automation.
 */
export async function createDefaultWorkflowsForMode(
  tenantId: string,
  businessMode: BusinessMode
): Promise<{ success: boolean; workflowIds: string[]; error?: string }> {
  try {
    const workflowIds: string[] = [];
    
    // Get mode-specific workflows + universal workflow
    const modeWorkflows = DEFAULT_WORKFLOWS[businessMode] || DEFAULT_WORKFLOWS.general;
    const allWorkflows = [...modeWorkflows, UNIVERSAL_WORKFLOW];

    for (const template of allWorkflows) {
      // Create the workflow
      const { data: workflow, error: workflowError } = await supabase
        .from("workflows")
        .insert({
          tenant_id: tenantId,
          name: template.name,
          description: template.description,
          trigger: template.trigger,
          status: "active" as WorkflowStatus,
          is_default: true,
        })
        .select()
        .single();

      if (workflowError) {
        console.error(`Failed to create workflow ${template.name}:`, workflowError);
        continue;
      }

      workflowIds.push(workflow.id);

      // Create nodes for this workflow
      for (let i = 0; i < template.nodes.length; i++) {
        const nodeConfig = template.nodes[i];
        const { error: nodeError } = await supabase
          .from("workflow_nodes")
          .insert({
            workflow_id: workflow.id,
            node_type: nodeConfig.node_type,
            name: nodeConfig.name,
            config: nodeConfig.config as any,
            position: { x: 100, y: 100 + i * 150 },
          });

        if (nodeError) {
          console.error(`Failed to create node ${nodeConfig.name}:`, nodeError);
        }
      }
    }

    console.log(`[createDefaultWorkflows] Created ${workflowIds.length} workflows for ${businessMode} mode`);
    return { success: true, workflowIds };
  } catch (error) {
    console.error("[createDefaultWorkflows] Error:", error);
    return { 
      success: false, 
      workflowIds: [], 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Automation toggle definitions for the Simple Mode UI.
 * Maps user-friendly toggles to workflow triggers and node types.
 */
export interface AutomationToggle {
  id: string;
  label: string;
  description: string;
  trigger: WorkflowTrigger;
  primaryNodeType: WorkflowNodeType;
  category: "notifications" | "kitchen" | "integrations";
  defaultMessage?: string;
  applicableModes: BusinessMode[];
}

export const AUTOMATION_TOGGLES: AutomationToggle[] = [
  // Customer Notifications
  {
    id: "booking-confirmed-sms",
    label: "Text when booking is confirmed",
    description: "Send SMS confirmation to customers after booking",
    trigger: "booking.confirmed",
    primaryNodeType: "notify_sms",
    category: "notifications",
    defaultMessage: "Hi {{customer_name}}! Your appointment for {{service_name}} on {{start_date}} is confirmed. See you soon!",
    applicableModes: ["service", "medical", "sales"],
  },
  {
    id: "order-confirmed-sms",
    label: "Text when order is confirmed",
    description: "Send SMS confirmation for new orders",
    trigger: "order.confirmed",
    primaryNodeType: "notify_sms",
    category: "notifications",
    defaultMessage: "Hi {{customer_name}}! Your order #{{order_number}} is confirmed. We'll have it ready shortly!",
    applicableModes: ["food"],
  },
  {
    id: "order-ready-sms",
    label: "Text when order is ready",
    description: "Alert customer when their order is ready",
    trigger: "order.ready",
    primaryNodeType: "notify_sms",
    category: "notifications",
    defaultMessage: "Great news {{customer_name}}! Your order #{{order_number}} is ready for pickup!",
    applicableModes: ["food"],
  },
  {
    id: "dispatch-created-sms",
    label: "Text when dispatch is created",
    description: "Notify customer when job is received",
    trigger: "dispatch.created",
    primaryNodeType: "notify_sms",
    category: "notifications",
    defaultMessage: "Hi {{customer_name}}! Your {{job_type}} request #{{job_number}} has been received.",
    applicableModes: ["dispatch"],
  },
  {
    id: "missed-call-sms",
    label: "Text on missed call",
    description: "Auto-respond to missed calls",
    trigger: "missed_call",
    primaryNodeType: "notify_sms",
    category: "notifications",
    defaultMessage: "Sorry we missed your call! We'll get back to you shortly, or you can leave a message here.",
    applicableModes: ["service", "food", "dispatch", "medical", "general", "sales"],
  },
  // Kitchen/Team Alerts
  {
    id: "print-ticket",
    label: "Print ticket when order confirmed",
    description: "Print kitchen ticket for new orders",
    trigger: "order.confirmed",
    primaryNodeType: "print_ticket",
    category: "kitchen",
    applicableModes: ["food"],
  },
  // External Integrations
  {
    id: "call-crm-push",
    label: "Push call summaries to CRM",
    description: "Send call data to external webhook",
    trigger: "call.ended",
    primaryNodeType: "webhook_push",
    category: "integrations",
    applicableModes: ["service", "food", "dispatch", "medical", "general", "sales"],
  },
];

/**
 * Get automation toggles applicable to a specific business mode.
 */
export function getAutomationTogglesForMode(mode: BusinessMode): AutomationToggle[] {
  return AUTOMATION_TOGGLES.filter(toggle => toggle.applicableModes.includes(mode));
}
