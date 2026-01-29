import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, GitBranch, Play, Pause, Settings, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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

export default function WorkflowsPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  
  const { data: workflows, isLoading } = useWorkflows(tenantId);
  const { data: stats } = useWorkflowStats(tenantId);
  const { createWorkflow, deleteWorkflow, activateWorkflow, pauseWorkflow } = useWorkflowMutations(tenantId);
  const navigate = useNavigate();
  
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState<WorkflowTrigger | "">("");

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

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      await deleteWorkflow.mutateAsync(id);
    }
  };

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

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">
            Automate actions when events happen in your business
          </p>
        </div>
        
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Runs Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.success}</div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
              <div className="text-sm text-muted-foreground">Running</div>
            </CardContent>
          </Card>
        </div>
      )}

      {workflows?.length === 0 && (
        <EmptyState
          icon={GitBranch}
          title="No workflows yet"
          description="Create your first workflow to automate actions when events happen"
          action={{ label: "Create Workflow", onClick: () => setCreateOpen(true) }}
        />
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
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
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
              
              <div className="flex items-center gap-2">
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
