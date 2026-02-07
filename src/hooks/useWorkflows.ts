import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { 
  Workflow, 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowWithNodes,
  WorkflowTrigger,
  WorkflowStatus,
  WorkflowNodeType
} from "@/types/workflow";
import { useToast } from "@/hooks/use-toast";

// Fetch all workflows for a tenant
export function useWorkflows(tenantId: string | null) {
  return useQuery({
    queryKey: ["workflows", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Workflow[];
    },
    enabled: !!tenantId,
  });
}

// Fetch a single workflow with its nodes and edges
export function useWorkflow(workflowId: string | null) {
  return useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      
      const [workflowRes, nodesRes, edgesRes] = await Promise.all([
        supabase.from("workflows").select("*").eq("id", workflowId).single(),
        supabase.from("workflow_nodes").select("*").eq("workflow_id", workflowId).order("created_at"),
        supabase.from("workflow_edges").select("*").eq("workflow_id", workflowId),
      ]);
      
      if (workflowRes.error) throw workflowRes.error;
      if (nodesRes.error) throw nodesRes.error;
      if (edgesRes.error) throw edgesRes.error;
      
      return {
        ...workflowRes.data,
        nodes: nodesRes.data,
        edges: edgesRes.data,
      } as WorkflowWithNodes;
    },
    enabled: !!workflowId,
  });
}

// CRUD mutations for workflows
export function useWorkflowMutations(tenantId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createWorkflow = useMutation({
    mutationFn: async (data: {
      name: string;
      trigger: WorkflowTrigger;
      description?: string;
      location_id?: string;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      
      const { data: workflow, error } = await supabase
        .from("workflows")
        .insert({
          tenant_id: tenantId,
          name: data.name,
          trigger: data.trigger,
          description: data.description || null,
          location_id: data.location_id || null,
          status: "draft" as WorkflowStatus,
        })
        .select()
        .single();
      
      if (error) throw error;
      return workflow as Workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", tenantId] });
      toast({ title: "Workflow created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create workflow", description: String(error), variant: "destructive" });
    },
  });

  const updateWorkflow = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Workflow> & { id: string }) => {
      const { data: workflow, error } = await supabase
        .from("workflows")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return workflow as Workflow;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: ["workflows", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["workflow", workflow.id] });
      toast({ title: "Workflow updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update workflow", description: String(error), variant: "destructive" });
    },
  });

  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", tenantId] });
      toast({ title: "Workflow deleted" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete workflow", description: String(error), variant: "destructive" });
    },
  });

  const activateWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { data: workflow, error } = await supabase
        .from("workflows")
        .update({ status: "active" as WorkflowStatus, is_default: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return workflow as Workflow;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: ["workflows", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["workflow", workflow.id] });
      toast({ title: "Workflow activated" });
    },
    onError: (error) => {
      toast({ title: "Failed to activate workflow", description: String(error), variant: "destructive" });
    },
  });

  const pauseWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { data: workflow, error } = await supabase
        .from("workflows")
        .update({ status: "paused" as WorkflowStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return workflow as Workflow;
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: ["workflows", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["workflow", workflow.id] });
      toast({ title: "Workflow paused" });
    },
    onError: (error) => {
      toast({ title: "Failed to pause workflow", description: String(error), variant: "destructive" });
    },
  });

  return {
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    activateWorkflow,
    pauseWorkflow,
  };
}

// CRUD mutations for workflow nodes
export function useWorkflowNodeMutations(workflowId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addNode = useMutation({
    mutationFn: async (data: {
      node_type: WorkflowNodeType;
      name: string;
      config?: Record<string, unknown>;
      position?: { x: number; y: number };
    }) => {
      if (!workflowId) throw new Error("No workflow");
      
      // Use type assertion to bypass strict typing for workflow_id
      const insertData = {
        workflow_id: workflowId,
        node_type: data.node_type,
        name: data.name,
        config: (data.config || {}) as Record<string, unknown>,
        position: (data.position || { x: 0, y: 0 }) as { x: number; y: number },
      };
      
      const { data: node, error } = await supabase
        .from("workflow_nodes")
        .insert(insertData as never)
        .select()
        .single();
      
      if (error) throw error;
      return node as WorkflowNode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
    },
    onError: (error) => {
      toast({ title: "Failed to add step", description: String(error), variant: "destructive" });
    },
  });

  const updateNode = useMutation({
    mutationFn: async ({ id, ...data }: Partial<WorkflowNode> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.node_type !== undefined) updateData.node_type = data.node_type;
      if (data.config !== undefined) updateData.config = data.config as Record<string, unknown>;
      if (data.position !== undefined) updateData.position = data.position as { x: number; y: number };
      
      const { data: node, error } = await supabase
        .from("workflow_nodes")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return node as WorkflowNode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
    },
    onError: (error) => {
      toast({ title: "Failed to update step", description: String(error), variant: "destructive" });
    },
  });

  const deleteNode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflow_nodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
    },
    onError: (error) => {
      toast({ title: "Failed to delete step", description: String(error), variant: "destructive" });
    },
  });

  return { addNode, updateNode, deleteNode };
}

// CRUD mutations for workflow edges
export function useWorkflowEdgeMutations(workflowId: string | null) {
  const queryClient = useQueryClient();

  const addEdge = useMutation({
    mutationFn: async (data: {
      from_node_id: string;
      to_node_id: string;
      condition?: Record<string, unknown>;
      label?: string;
    }) => {
      if (!workflowId) throw new Error("No workflow");
      
      // Use type assertion to bypass strict typing for workflow_id
      const insertData = {
        workflow_id: workflowId,
        from_node_id: data.from_node_id,
        to_node_id: data.to_node_id,
        condition: (data.condition || {}) as Record<string, unknown>,
        label: data.label || null,
      };
      
      const { data: edge, error } = await supabase
        .from("workflow_edges")
        .insert(insertData as never)
        .select()
        .single();
      
      if (error) throw error;
      return edge as WorkflowEdge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
    },
  });

  const deleteEdge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflow_edges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
    },
  });

  return { addEdge, deleteEdge };
}
