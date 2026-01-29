import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, GitBranch, Play, Pause, Settings, History, Trash2, Calendar, UtensilsCrossed, Truck, PhoneCall, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useWorkflows, useWorkflowMutations } from "@/hooks/useWorkflows";
import { useWorkflowStats } from "@/hooks/useWorkflowRuns";
import { TRIGGER_METADATA, type WorkflowTrigger, type Workflow } from "@/types/workflow";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantConfig, type BusinessMode } from "@/hooks/useTenantConfig";

// Workflow templates by business mode
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  icon: React.ElementType;
  steps: string[];
}

const WORKFLOW_TEMPLATES: Record<BusinessMode, WorkflowTemplate[]> = {
  service: [
    {
      id: "service-booking-confirmed",
      name: "Booking Confirmed",
      description: "Notify customer and update CRM when a booking is confirmed",
      trigger: "booking.confirmed",
      icon: Calendar,
      steps: ["Notify customer via SMS", "Update CRM record", "Send calendar invite"],
    },
    {
      id: "service-call-ended",
      name: "Call Wrap-Up",
      description: "Summarize call and push to CRM",
      trigger: "call.ended",
      icon: PhoneCall,
      steps: ["Generate AI summary", "Push to CRM", "Tag lead"],
    },
  ],
  food: [
    {
      id: "food-order-confirmed",
      name: "Order Confirmed",
      description: "Print ticket, notify kitchen, and SMS customer",
      trigger: "order.confirmed",
      icon: UtensilsCrossed,
      steps: ["Print kitchen ticket", "Notify kitchen display", "SMS customer with ETA"],
    },
    {
      id: "food-order-ready",
      name: "Order Ready",
      description: "Alert customer when order is ready for pickup",
      trigger: "order.ready",
      icon: UtensilsCrossed,
      steps: ["SMS customer", "Update order status"],
    },
  ],
  dispatch: [
    {
      id: "dispatch-job-created",
      name: "Dispatch Created",
      description: "Notify driver and send follow-up SMS",
      trigger: "dispatch.created",
      icon: Truck,
      steps: ["Notify assigned driver", "SMS customer with ETA", "Update dispatch board"],
    },
    {
      id: "dispatch-job-completed",
      name: "Job Completed",
      description: "Send feedback request and update records",
      trigger: "dispatch.completed",
      icon: Truck,
      steps: ["Request customer feedback", "Update CRM", "Close job record"],
    },
  ],
  medical: [
    {
      id: "medical-intake-created",
      name: "Intake Created",
      description: "Route intake form and notify staff (HIPAA compliant)",
      trigger: "intake.created",
      icon: Calendar,
      steps: ["Route to provider", "Update patient record", "Notify front desk"],
    },
    {
      id: "medical-booking-confirmed",
      name: "Appointment Confirmed",
      description: "Send confirmation and pre-visit instructions",
      trigger: "booking.confirmed",
      icon: Calendar,
      steps: ["Confirm via SMS", "Send pre-visit forms", "Update schedule"],
    },
  ],
  general: [
    {
      id: "general-call-ended",
      name: "Call Summary",
      description: "Generate summary and push to CRM after calls",
      trigger: "call.ended",
      icon: PhoneCall,
      steps: ["Generate AI summary", "Push to CRM", "Create follow-up task"],
    },
    {
      id: "general-sms-received",
      name: "Inbound Message",
      description: "Process inbound SMS and route appropriately",
      trigger: "sms.received",
      icon: PhoneCall,
      steps: ["Analyze intent", "Auto-reply or escalate", "Log interaction"],
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
    steps: ["Generate AI summary", "Push to CRM", "Update lead status"],
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

  // Check if user has access to workflows
  const hasWorkflowAccess = useMemo(() => {
    const workflowModules = ["booking", "food_orders", "dispatch_queue", "ai_voice", "instant_text_back"];
    return workflowModules.some(mod => enabledModules.includes(mod));
  }, [enabledModules]);

  // Get mode-specific templates
  const modeTemplates = useMemo(() => {
    const templates = WORKFLOW_TEMPLATES[businessMode] || WORKFLOW_TEMPLATES.general;
    return [...templates, ...UNIVERSAL_TEMPLATES];
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

  const handleCreateFromTemplate = async (template: WorkflowTemplate) => {
    const workflow = await createWorkflow.mutateAsync({
      name: template.name,
      trigger: template.trigger,
    });
    navigate(`/app/workflows/${workflow.id}`);
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
                      {Object.entries(TRIGGER_METADATA).map(([key, meta]) => (
                        <SelectItem key={key} value={key}>
                          <span className="mr-2">{meta.icon}</span>
                          {meta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    {Object.entries(TRIGGER_METADATA).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>
                        <span className="mr-2">{meta.icon}</span>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.success}</div>
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
              <div className="text-2xl font-bold text-primary">{stats.running}</div>
              <div className="text-sm text-muted-foreground">Running</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Workflows */}
      {activeWorkflows.length > 0 && (
        <WorkflowSection
          title="Active"
          description="These workflows are running"
          workflows={activeWorkflows}
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
          onActivate={(id) => activateWorkflow.mutateAsync(id)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function WorkflowSection({
  title,
  description,
  workflows,
  onActivate,
  onPause,
  onDelete,
}: {
  title: string;
  description: string;
  workflows: Workflow[];
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
