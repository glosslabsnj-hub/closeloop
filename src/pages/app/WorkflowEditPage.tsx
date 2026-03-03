import { useState } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Save, Play, GripVertical, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkflow, useWorkflowMutations, useWorkflowNodeMutations } from "@/hooks/useWorkflows";
import { 
  NODE_TYPE_METADATA, 
  TRIGGER_METADATA,
  TEMPLATE_VARIABLES,
  type WorkflowNodeType,
  type WorkflowNode 
} from "@/types/workflow";
import { NodeConfigEditor } from "@/components/workflows/NodeConfigEditor";
import { useAuth } from "@/contexts/AuthContext";

export default function WorkflowEditPage() {
  const { id } = useParams<{ id: string }>();
  const _navigate = useNavigate();
  const { tenant } = useAuth();
  const tenantId = tenant?.id ?? null;
  
  const { data: workflow, isLoading } = useWorkflow(id ?? null);
  const { updateWorkflow, activateWorkflow } = useWorkflowMutations(tenantId);
  const { addNode, updateNode, deleteNode } = useWorkflowNodeMutations(id ?? null);
  
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [selectedNodeType, setSelectedNodeType] = useState<WorkflowNodeType | "">("");
  const [editingNode, setEditingNode] = useState<WorkflowNode | null>(null);
  const [saving, setSaving] = useState(false);
  const [localName, setLocalName] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);

  // Derive display values: use local state if user has edited, otherwise use server data
  const displayName = localName ?? workflow?.name ?? "";
  const displayDescription = localDescription ?? workflow?.description ?? "";

  const handleSave = async () => {
    if (!workflow) return;
    setSaving(true);
    try {
      await updateWorkflow.mutateAsync({
        id: workflow.id,
        name: displayName,
        description: displayDescription,
      });
      // Reset local overrides so we track server state again
      setLocalName(null);
      setLocalDescription(null);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNode = async () => {
    if (!selectedNodeType) return;
    
    const meta = NODE_TYPE_METADATA[selectedNodeType];
    await addNode.mutateAsync({
      node_type: selectedNodeType,
      name: meta.label,
      config: {},
    });
    
    setAddNodeOpen(false);
    setSelectedNodeType("");
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (confirm("Delete this step?")) {
      await deleteNode.mutateAsync(nodeId);
    }
  };

  const handleActivate = async () => {
    if (!workflow) return;
    await activateWorkflow.mutateAsync(workflow.id);
  };

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="container py-6">
        <p>Workflow not found</p>
      </div>
    );
  }

  const triggerMeta = TRIGGER_METADATA[workflow.trigger];
  const entityType = triggerMeta?.entityType || "order";
  const availableVariables = [
    ...(TEMPLATE_VARIABLES[entityType as keyof typeof TEMPLATE_VARIABLES] || []),
    ...TEMPLATE_VARIABLES.common,
  ];

  return (
    <ErrorBoundary context="loading your workflow editor">
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/workflows">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{triggerMeta?.icon}</span>
              <span>{triggerMeta?.label || workflow.trigger}</span>
              <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
                {workflow.status}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          {workflow.status !== "active" && (
            <Button onClick={handleActivate}>
              <Play className="h-4 w-4 mr-2" />
              Activate
            </Button>
          )}
        </div>
      </div>

      {/* Workflow Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Workflow name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={displayDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Steps</CardTitle>
            <CardDescription>Actions executed in order when the workflow runs</CardDescription>
          </div>
          <Dialog open={addNodeOpen} onOpenChange={setAddNodeOpen}>
            <Button variant="outline" onClick={() => setAddNodeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Step</DialogTitle>
                <DialogDescription>Choose an action to add to this workflow</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-4">
                {Object.entries(NODE_TYPE_METADATA).map(([type, meta]) => (
                  <button
                    key={type}
                    className={`p-4 rounded-lg border text-left transition-colors hover:bg-muted ${
                      selectedNodeType === type ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedNodeType(type as WorkflowNodeType)}
                  >
                    <div className="text-2xl mb-2">{meta.icon}</div>
                    <div className="font-medium">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">{meta.description}</div>
                  </button>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddNodeOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNode} disabled={!selectedNodeType}>
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {workflow.nodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No steps yet. Add your first step to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workflow.nodes.map((node, index) => {
                const meta = NODE_TYPE_METADATA[node.node_type];
                return (
                  <div
                    key={node.id}
                    className="flex items-center gap-3 p-4 rounded-lg border bg-card"
                  >
                    <div className="text-muted-foreground cursor-grab">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="text-2xl">{meta?.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium">{node.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatNodeConfig(node)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingNode(node)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteNode(node.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Variables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available Variables</CardTitle>
          <CardDescription>
            Use these in your messages and templates: {"{{variable_name}}"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableVariables.map((v) => (
              <Badge key={v} variant="outline" className="font-mono text-xs">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Node Config Editor */}
      {editingNode && (
        <NodeConfigEditor
          node={editingNode}
          open={!!editingNode}
          onClose={() => setEditingNode(null)}
          onSave={async (config) => {
            await updateNode.mutateAsync({
              id: editingNode.id,
              config,
            });
            setEditingNode(null);
          }}
          availableVariables={availableVariables}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}

function formatNodeConfig(node: WorkflowNode): string {
  const config = node.config as Record<string, any>;
  
  switch (node.node_type) {
    case "notify_sms":
      return `To: ${config.to || "Not set"} · Message: ${(config.message || "").slice(0, 30)}...`;
    case "notify_email":
      return `To: ${config.to || "Not set"} · Subject: ${config.subject || "Not set"}`;
    case "delay":
      if (config.minutes) return `Wait ${config.minutes} minutes`;
      if (config.hours) return `Wait ${config.hours} hours`;
      return "Wait duration not set";
    case "webhook_push":
      return `${config.method || "POST"} ${config.url || "URL not set"}`;
    case "print_ticket":
      return `Format: ${config.format || "thermal"} · Copies: ${config.copies || 1}`;
    case "set_field":
      return `Set ${config.entity_field || "field"} = ${config.value || "value"}`;
    default:
      return "Configure this step";
  }
}
