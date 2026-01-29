import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { 
  WorkflowRun, 
  WorkflowRunStep, 
  WorkflowRunWithSteps,
  WorkflowRunStatus
} from "@/types/workflow";
import { useToast } from "@/hooks/use-toast";

// Fetch runs for a specific workflow
export function useWorkflowRuns(workflowId: string | null, options?: { limit?: number }) {
  return useQuery({
    queryKey: ["workflow-runs", workflowId, options?.limit],
    queryFn: async () => {
      if (!workflowId) return [];
      
      let query = supabase
        .from("workflow_runs")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("started_at", { ascending: false });
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as WorkflowRun[];
    },
    enabled: !!workflowId,
  });
}

// Fetch runs for a tenant (all workflows)
export function useTenantWorkflowRuns(tenantId: string | null, options?: { limit?: number; status?: WorkflowRunStatus }) {
  return useQuery({
    queryKey: ["tenant-workflow-runs", tenantId, options],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from("workflow_runs")
        .select("*, workflow:workflows(name, trigger)")
        .eq("tenant_id", tenantId)
        .order("started_at", { ascending: false });
      
      if (options?.status) {
        query = query.eq("status", options.status);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as (WorkflowRun & { workflow: { name: string; trigger: string } | null })[];
    },
    enabled: !!tenantId,
  });
}

// Fetch a single run with all its steps
export function useWorkflowRunDetails(runId: string | null) {
  return useQuery({
    queryKey: ["workflow-run", runId],
    queryFn: async () => {
      if (!runId) return null;
      
      const [runRes, stepsRes] = await Promise.all([
        supabase
          .from("workflow_runs")
          .select("*, workflow:workflows(*)")
          .eq("id", runId)
          .single(),
        supabase
          .from("workflow_run_steps")
          .select("*")
          .eq("run_id", runId)
          .order("started_at"),
      ]);
      
      if (runRes.error) throw runRes.error;
      if (stepsRes.error) throw stepsRes.error;
      
      return {
        ...runRes.data,
        steps: stepsRes.data,
      } as WorkflowRunWithSteps;
    },
    enabled: !!runId,
  });
}

// Retry a failed workflow run
export function useRetryWorkflowRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (runId: string) => {
      // Fetch the original run
      const { data: run, error: runError } = await supabase
        .from("workflow_runs")
        .select("*")
        .eq("id", runId)
        .single();
      
      if (runError) throw runError;
      
      // Trigger the workflow again with retry_run_id
      const { data, error } = await supabase.functions.invoke("trigger-workflow", {
        body: {
          tenant_id: run.tenant_id,
          trigger: run.trigger,
          entity_type: run.entity_type,
          entity_id: run.entity_id,
          retry_run_id: runId,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, runId) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-run", runId] });
      queryClient.invalidateQueries({ queryKey: ["workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-workflow-runs"] });
      toast({ title: "Workflow retry triggered" });
    },
    onError: (error) => {
      toast({ title: "Failed to retry workflow", description: String(error), variant: "destructive" });
    },
  });
}

// Dry run a workflow (simulate execution without side effects)
export function useDryRunWorkflow() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ tenantId, trigger, entityType, entityId }: { 
      tenantId: string; 
      trigger: string; 
      entityType: string; 
      entityId: string 
    }) => {
      const { data, error } = await supabase.functions.invoke("trigger-workflow", {
        body: {
          tenant_id: tenantId,
          trigger,
          entity_type: entityType,
          entity_id: entityId,
          dry_run: true,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: "Dry Run Complete", 
        description: `Simulated ${data.steps_executed || 0} steps without side effects` 
      });
    },
    onError: (error) => {
      toast({ title: "Dry run failed", description: String(error), variant: "destructive" });
    },
  });
}

// Cancel a running workflow
export function useCancelWorkflowRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await supabase
        .from("workflow_runs")
        .update({ 
          status: "cancelled" as WorkflowRunStatus, 
          finished_at: new Date().toISOString() 
        })
        .eq("id", runId);
      
      if (error) throw error;
    },
    onSuccess: (_, runId) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-run", runId] });
      queryClient.invalidateQueries({ queryKey: ["workflow-runs"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-workflow-runs"] });
      toast({ title: "Workflow cancelled" });
    },
    onError: (error) => {
      toast({ title: "Failed to cancel workflow", description: String(error), variant: "destructive" });
    },
  });
}

// Get workflow run statistics
export function useWorkflowStats(tenantId: string | null) {
  return useQuery({
    queryKey: ["workflow-stats", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get workflow counts
      const [runsResult, workflowsResult] = await Promise.all([
        supabase
          .from("workflow_runs")
          .select("status")
          .eq("tenant_id", tenantId)
          .gte("started_at", today.toISOString()),
        supabase
          .from("workflows")
          .select("id, status")
          .eq("tenant_id", tenantId),
      ]);
      
      if (runsResult.error) throw runsResult.error;
      if (workflowsResult.error) throw workflowsResult.error;
      
      const runs = runsResult.data || [];
      const workflows = workflowsResult.data || [];
      
      const stats = {
        total: runs.length,
        total_runs: runs.length,
        success: runs.filter(r => r.status === "success").length,
        successful_runs: runs.filter(r => r.status === "success").length,
        failed: runs.filter(r => r.status === "failed").length,
        failed_runs: runs.filter(r => r.status === "failed").length,
        running: runs.filter(r => r.status === "running").length,
        active_workflows: workflows.filter(w => w.status === "active").length,
      };
      
      return stats;
    },
    enabled: !!tenantId,
  });
}

// Get recent workflow runs across all workflows
export function useRecentWorkflowRuns(tenantId: string | null, limit: number = 5) {
  return useQuery({
    queryKey: ["recent-workflow-runs", tenantId, limit],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from("workflow_runs")
        .select("*, workflow:workflows(name)")
        .eq("tenant_id", tenantId)
        .order("started_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as (WorkflowRun & { workflow: { name: string } | null })[];
    },
    enabled: !!tenantId,
  });
}
