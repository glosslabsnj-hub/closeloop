import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, GitBranch, Play, Pause, Settings, History, Trash2, Calendar, UtensilsCrossed, Truck, PhoneCall, Lock, ArrowRight, Loader2, ToggleLeft, Sliders, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkflows, useWorkflowMutations, useWorkflowNodeMutations } from "@/hooks/useWorkflows";
import { useWorkflowStats } from "@/hooks/useWorkflowRuns";
import { TRIGGER_METADATA, NODE_TYPE_METADATA, type WorkflowTrigger, type Workflow, type WorkflowNodeType } from "@/types/workflow";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";
import { supabase } from "@/integrations/supabase/client";
import { SimpleAutomationPanel } from "@/components/workflows/SimpleAutomationPanel";
import { HelpGuideWorkflows } from "@/components/help/HelpGuideWorkflows";
import { WorkflowRunLogCard } from "@/components/workflows/WorkflowRunLogCard";
import { TestTriggerButton } from "@/components/workflows/TestTriggerButton";

// Pre-configured node for workflow templates
interface TemplateNode {
  node_type: WorkflowNodeType;
  name: string;
  config: Record<string, unknown>;
}

// Workflow templates by business mode
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  icon: React.ElementType;
  steps: string[];
  nodes: TemplateNode[]; // Pre-configured nodes to create
}

const WORKFLOW_TEMPLATES: Record<BusinessMode, WorkflowTemplate[]> = {
  service: [
    {
      id: "service-booking-confirmed",
      name: "Booking Confirmed",
      description: "Notify customer and update CRM when a booking is confirmed",
      trigger: "booking.confirmed",
      icon: Calendar,
      steps: ["Notify customer via SMS", "Update CRM record"],
      nodes: [
        {
          node_type: "notify_sms",
          name: "Send SMS Confirmation",
          config: {
            to: "{{customer_phone}}",
            message: "Hi {{customer_name}}! Your appointment for {{service_name}} on {{start_date}} is confirmed. See you soon!",
          },
        },
        {
          node_type: "webhook_push",
          name: "Update CRM",
          config: {
            url: "",
            method: "POST",
            body_template: {
              event: "booking.confirmed",
              customer_name: "{{customer_name}}",
              service: "{{service_name}}",
              date: "{{start_date}}",
            },
          },
        },
      ],
    },
    {
      id: "service-call-ended",
      name: "Call Wrap-Up",
      description: "Summarize call and push to CRM",
      trigger: "call.ended",
      icon: PhoneCall,
      steps: ["Push call summary to CRM"],
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
      id: "food-order-confirmed",
      name: "Order Confirmed",
      description: "Print ticket and SMS customer when order is confirmed",
      trigger: "order.confirmed",
      icon: UtensilsCrossed,
      steps: ["Print kitchen ticket", "SMS customer with ETA"],
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
            message: "Hi {{customer_name}}! Your order #{{order_number}} is confirmed. {{#if requested_time}}Ready by {{requested_time}}.{{else}}We'll have it ready shortly!{{/if}}",
          },
        },
      ],
    },
    {
      id: "food-order-ready",
      name: "Order Ready",
      description: "Alert customer when order is ready for pickup",
      trigger: "order.ready",
      icon: UtensilsCrossed,
      steps: ["SMS customer"],
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
      id: "dispatch-job-created",
      name: "Dispatch Created",
      description: "Notify team and send follow-up SMS to customer",
      trigger: "dispatch.created",
      icon: Truck,
      steps: ["SMS customer with ETA", "Notify team via webhook"],
      nodes: [
        {
          node_type: "notify_sms",
          name: "SMS Customer",
          config: {
            to: "{{customer_phone}}",
            message: "Hi {{customer_name}}! Your {{job_type}} request #{{job_number}} has been received. A driver will be dispatched shortly.",
          },
        },
        {
          node_type: "webhook_push",
          name: "Notify Dispatch Team",
          config: {
            url: "",
            method: "POST",
            body_template: {
              event: "dispatch.created",
              job_number: "{{job_number}}",
              job_type: "{{job_type}}",
              priority: "{{priority}}",
              pickup: "{{pickup_address}}",
            },
          },
        },
      ],
    },
    {
      id: "dispatch-job-completed",
      name: "Job Completed",
      description: "Send feedback request to customer",
      trigger: "dispatch.completed",
      icon: Truck,
      steps: ["Request customer feedback"],
      nodes: [
        {
          node_type: "notify_sms",
          name: "Request Feedback",
          config: {
            to: "{{customer_phone}}",
            message: "Thank you for using {{business_name}}! How was your experience with job #{{job_number}}? Reply with 1-5 stars.",
          },
        },
      ],
    },
  ],
  medical: [
    {
      id: "medical-intake-created",
      name: "Intake Created",
      description: "Route intake form and notify staff (HIPAA compliant)",
      trigger: "intake.created",
      icon: Calendar,
      steps: ["Notify front desk via webhook"],
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
      id: "medical-booking-confirmed",
      name: "Appointment Confirmed",
      description: "Send confirmation SMS with pre-visit instructions",
      trigger: "booking.confirmed",
      icon: Calendar,
      steps: ["Send confirmation SMS"],
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
      id: "general-call-ended",
      name: "Call Summary",
      description: "Push call summary to webhook after calls",
      trigger: "call.ended",
      icon: PhoneCall,
      steps: ["Push to CRM"],
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
    {
      id: "general-missed-call",
      name: "Missed Call Follow-up",
      description: "Automatically text when a call is missed",
      trigger: "missed_call",
      icon: PhoneCall,
      steps: ["Send follow-up SMS"],
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
    },
  ],
};

// Universal templates available to all modes
const UNIVERSAL_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "universal-call-ended",
    name: "Call Summary to CRM",
    description: "Push call summaries to your CRM after every call",
    trigger: "call.ended",
    icon: PhoneCall,
    steps: ["Push call summary to CRM"],
    nodes: [
      {
        node_type: "webhook_push",
        name: "Push to CRM",
        config: {
          url: "",
          method: "POST",
          body_template: {
            event: "call.ended",
            caller: "{{caller_phone}}",
            customer: "{{customer_name}}",
            summary: "{{summary}}",
            outcome: "{{outcome}}",
          },
        },
      },
    ],
  },
];

export default function WorkflowsPage() {
  const { tenant, hasActiveSubscription } = useAuth();
  const { businessMode, enabledModules } = useTenantConfig();
  const tenantId = tenant?.id ?? null;
  
  const { data: workflows, isLoading } = useWorkflows(tenantId);
  const { data: stats } = useWorkflowStats(tenantId);
  const { createWorkflow, deleteWorkflow, activateWorkflow, pauseWorkflow } = useWorkflowMutations(tenantId);
  const navigate = useNavigate();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState<WorkflowTrigger | "">("");
  const [viewMode, setViewMode] = useState<"simple" | "advanced" | "help">("simple");

  // Check if user has access to workflows
  const hasWorkflowAccess = useMemo(() => {
    const workflowModules = ["booking", "food_orders", "dispatch_queue", "ai_voice", "instant_text_back"];
    return workflowModules.some(mod => enabledModules.includes(mod));
  }, [enabledModules]);

  // Get mode-specific templates (strictly gated by business mode)
  const modeTemplates = useMemo(() => {
    const templates = WORKFLOW_TEMPLATES[businessMode] || WORKFLOW_TEMPLATES.general;
    return [...templates, ...UNIVERSAL_TEMPLATES];
  }, [businessMode]);

  // Get mode-appropriate triggers for the create dialog
  const availableTriggers = useMemo(() => {
    const modeTriggerMap: Record<BusinessMode, WorkflowTrigger[]> = {
      service: ["booking.created", "booking.confirmed", "booking.completed", "call.ended", "sms.received", "missed_call"],
      food: ["order.created", "order.confirmed", "order.ready", "order.completed", "reservation.created", "reservation.confirmed", "catering.created", "catering.quoted", "call.ended", "sms.received"],
      dispatch: ["dispatch.created", "dispatch.confirmed", "dispatch.completed", "call.ended", "sms.received", "missed_call"],
      medical: ["intake.created", "intake.scheduled", "booking.created", "booking.confirmed", "call.ended", "sms.received"],
      general: ["call.ended", "sms.received", "missed_call"],
    };
    return modeTriggerMap[businessMode] || modeTriggerMap.general;
  }, [businessMode]);

  const activeWorkflows = workflows?.filter(w => w.status === "active") || [];
  const draftWorkflows = workflows?.filter(w => w.status === "draft") || [];
  const pausedWorkflows = workflows?.filter(w => w.status === "paused") || [];

  const handleCreate = async () => {
    if (!newName || !newTrigger) return;
    
    const workflow = await createWorkflow.mutateAsync({
      name: newName,
      trigger: newTrigger as WorkflowTrigger,
    });
    
    setCreateOpen(false);
    setNewName("");
    setNewTrigger("");
    navigate(`/app/workflows/${workflow.id}`);
  };

  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);
  
  const handleCreateFromTemplate = async (template: WorkflowTemplate) => {
    setCreatingFromTemplate(true);
    try {
      // Create the workflow first
      const workflow = await createWorkflow.mutateAsync({
        name: template.name,
        trigger: template.trigger,
      });
      
      // Add pre-configured nodes from the template
      if (template.nodes && template.nodes.length > 0) {
        for (const nodeConfig of template.nodes) {
          await supabase
            .from("workflow_nodes")
            .insert({
              workflow_id: workflow.id,
              node_type: nodeConfig.node_type,
              name: nodeConfig.name,
              config: nodeConfig.config as any,
              position: { x: 0, y: 0 },
            });
        }
      }
      
      navigate(`/app/workflows/${workflow.id}`);
    } catch (error) {
      console.error("Failed to create workflow from template:", error);
    } finally {
      setCreatingFromTemplate(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      await deleteWorkflow.mutateAsync(id);
    }
  };

  // Access denied state
  if (!hasWorkflowAccess) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center shadow-soft-lg">
          <CardHeader className="pb-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-3">
              <Lock className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Workflows Not Available</CardTitle>
            <CardDescription className="text-base">
              Workflows require at least one of the following modules: Booking, Orders, Dispatch, Voice AI, or Text Back.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <Button onClick={() => navigate("/app/settings")} className="w-full" size="lg">
              Manage Modules
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/app/dashboard")}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state with templates
  if (workflows?.length === 0) {
    return (
      <div className="container py-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Workflows</h1>
            <p className="text-muted-foreground">
              Automate what happens after calls, bookings, orders, and dispatches.
            </p>
          </div>
          
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Workflow</DialogTitle>
                <DialogDescription>
                  Choose a trigger event and give your workflow a name
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Workflow Name</Label>
                  <Input
                    placeholder="e.g., New Order Notification"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trigger Event</Label>
                  <Select value={newTrigger} onValueChange={(v) => setNewTrigger(v as WorkflowTrigger)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select when this workflow runs" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTriggers.map((key) => {
                        const meta = TRIGGER_METADATA[key];
                        return (
                          <SelectItem key={key} value={key}>
                            <span className="mr-2">{meta.icon}</span>
                            {meta.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only triggers relevant to {businessMode} mode are shown
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!newName || !newTrigger}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Empty State with Templates */}
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <GitBranch className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Get Started with Workflows</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Choose a template below to quickly set up automation, or create a custom workflow from scratch.
            </p>
          </div>

          {/* Template Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modeTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <Card 
                  key={template.id} 
                  className="group cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
                  onClick={() => handleCreateFromTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    <div className="space-y-1.5">
                      {template.steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                            {idx + 1}
                          </div>
                          {step}
                        </div>
                      ))}
                    </div>
                    <div className="pt-2">
                      <Button variant="ghost" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        Use Template
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header with View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-muted-foreground">
            Automate what happens after calls, bookings, orders, and dispatches.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Simple/Advanced/Help Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "simple" | "advanced" | "help")}>
            <TabsList className="h-9">
              <TabsTrigger value="simple" className="text-xs gap-1.5">
                <ToggleLeft className="h-3.5 w-3.5" />
                Simple
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs gap-1.5">
                <Sliders className="h-3.5 w-3.5" />
                Advanced
              </TabsTrigger>
              <TabsTrigger value="help" className="text-xs gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                Help
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === "advanced" && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Workflow</DialogTitle>
                  <DialogDescription>
                    Choose a trigger event and give your workflow a name
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Workflow Name</Label>
                    <Input
                      placeholder="e.g., New Order Notification"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trigger Event</Label>
                    <Select value={newTrigger} onValueChange={(v) => setNewTrigger(v as WorkflowTrigger)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select when this workflow runs" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTriggers.map((key) => {
                          const meta = TRIGGER_METADATA[key];
                          return (
                            <SelectItem key={key} value={key}>
                              <span className="mr-2">{meta.icon}</span>
                              {meta.label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Only triggers relevant to {businessMode} mode are shown
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={!newName || !newTrigger}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Simple Mode: Toggle-based automation panel */}
      {viewMode === "simple" && (
        <SimpleAutomationPanel onAdvancedClick={() => setViewMode("advanced")} />
      )}

      {/* Help Mode: Full documentation */}
      {viewMode === "help" && (
        <HelpGuideWorkflows mode={businessMode} />
      )}

      {/* Advanced Mode: Full workflow list */}
      {viewMode === "advanced" && (
        <>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <div className="text-sm text-muted-foreground">Runs Today</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{stats.success}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-muted-foreground">{stats.running}</div>
                  <div className="text-sm text-muted-foreground">Running</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty state for advanced mode */}
          {workflows?.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <GitBranch className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Custom Workflows Yet</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Create custom workflows with conditional logic, delays, and multi-step automations.
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Workflow
              </Button>
            </div>
          )}

          {/* Active Workflows */}
          {activeWorkflows.length > 0 && (
            <WorkflowSection
              title="Active"
              description="These workflows are running"
              workflows={activeWorkflows}
              tenantId={tenantId!}
              onPause={(id) => pauseWorkflow.mutateAsync(id)}
              onDelete={handleDelete}
            />
          )}

          {/* Draft Workflows */}
          {draftWorkflows.length > 0 && (
            <WorkflowSection
              title="Drafts"
              description="Work in progress"
              workflows={draftWorkflows}
              tenantId={tenantId!}
              onActivate={(id) => activateWorkflow.mutateAsync(id)}
              onDelete={handleDelete}
            />
          )}

          {/* Paused Workflows */}
          {pausedWorkflows.length > 0 && (
            <WorkflowSection
              title="Paused"
              description="Temporarily stopped"
              workflows={pausedWorkflows}
              tenantId={tenantId!}
              onActivate={(id) => activateWorkflow.mutateAsync(id)}
              onDelete={handleDelete}
            />
          )}

          {/* Recent Runs */}
          {tenantId && (
            <WorkflowRunLogCard tenantId={tenantId} limit={10} />
          )}
        </>
      )}
    </div>
  );
}

function WorkflowSection({
  title,
  description,
  workflows,
  tenantId,
  onActivate,
  onPause,
  onDelete,
}: {
  title: string;
  description: string;
  workflows: Workflow[];
  tenantId: string;
  onActivate?: (id: string) => void;
  onPause?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {workflows.map((workflow) => {
          const triggerMeta = TRIGGER_METADATA[workflow.trigger];
          
          return (
            <div
              key={workflow.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl">{triggerMeta?.icon || "⚡"}</div>
                <div>
                  <div className="font-medium">{workflow.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Trigger: {triggerMeta?.label || workflow.trigger}
                    {workflow.is_default && (
                      <Badge variant="outline" className="ml-2">Default</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Test Trigger Button */}
                <TestTriggerButton
                  tenantId={tenantId}
                  workflowId={workflow.id}
                  trigger={workflow.trigger}
                  disabled={workflow.status !== "active"}
                />
                
                {onActivate && workflow.status !== "active" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onActivate(workflow.id)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Activate
                  </Button>
                )}
                {onPause && workflow.status === "active" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPause(workflow.id)}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                )}
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/app/workflows/${workflow.id}`}>
                    <Settings className="h-4 w-4 mr-1" />
                    Edit
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/app/workflows/${workflow.id}/runs`}>
                    <History className="h-4 w-4 mr-1" />
                    Runs
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(workflow.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
