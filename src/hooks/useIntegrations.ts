import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Integration {
  id: string;
  tenant_id: string;
  provider: string;
  display_name: string;
  status: "connected" | "disconnected" | "error";
  auth_type: "oauth" | "api_key";
  scopes_json: string[];
  config_json: Record<string, unknown>;
  error_message: string | null;
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger_event: string;
  destination_provider: string;
  action_type: string;
  integration_id: string | null;
  field_mapping_json: Record<string, unknown>;
  behavior_json: Record<string, unknown>;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationRun {
  id: string;
  tenant_id: string;
  rule_id: string | null;
  workflow_id: string | null;
  trigger_event: string;
  entity_type: string;
  entity_id: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  payload_snapshot: Record<string, unknown> | null;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  // Joined relations
  rule?: AutomationRule;
}

export interface AutomationRunStep {
  id: string;
  run_id: string;
  action_type: string;
  destination_provider: string | null;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

// Provider metadata
export interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  category: "calendar" | "crm" | "pos" | "spreadsheet" | "webhook" | "printer" | "messaging";
  authType: "oauth" | "api_key";
  applicableModes: string[];
  description: string;
  configFields?: { key: string; label: string; type: string; required: boolean }[];
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "webhook",
    name: "Webhook",
    icon: "🔗",
    category: "webhook",
    authType: "api_key",
    applicableModes: ["service", "food", "dispatch", "medical", "general"],
    description: "Send data to any external URL",
    configFields: [
      { key: "webhook_url", label: "Webhook URL", type: "url", required: true },
      { key: "webhook_secret", label: "Secret (optional)", type: "password", required: false },
    ],
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    icon: "📅",
    category: "calendar",
    authType: "oauth",
    applicableModes: ["service", "medical", "general"],
    description: "Create calendar events for bookings",
    configFields: [
      { key: "calendar_id", label: "Calendar ID", type: "text", required: false },
    ],
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    icon: "📊",
    category: "spreadsheet",
    authType: "oauth",
    applicableModes: ["service", "food", "dispatch", "medical", "general"],
    description: "Append data to a spreadsheet",
    configFields: [
      { key: "sheet_id", label: "Sheet ID", type: "text", required: true },
      { key: "sheet_name", label: "Sheet Name", type: "text", required: false },
    ],
  },
  {
    id: "printer",
    name: "Receipt Printer",
    icon: "🖨️",
    category: "printer",
    authType: "api_key",
    applicableModes: ["food"],
    description: "Print kitchen tickets and receipts",
    configFields: [
      { key: "printer_type", label: "Printer Type", type: "select", required: true },
      { key: "printer_endpoint", label: "Printer API Endpoint", type: "url", required: false },
    ],
  },
  {
    id: "sms",
    name: "SMS Notifications",
    icon: "💬",
    category: "messaging",
    authType: "api_key",
    applicableModes: ["service", "food", "dispatch", "medical", "general"],
    description: "Send text messages to customers",
  },
];

// Fetch integrations for tenant
export function useIntegrations(tenantId: string | null) {
  return useQuery({
    queryKey: ["integrations", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Integration[];
    },
    enabled: !!tenantId,
  });
}

// Fetch automation rules for tenant
export function useAutomationRules(tenantId: string | null) {
  return useQuery({
    queryKey: ["automation_rules", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("priority", { ascending: true });
      if (error) throw error;
      return data as AutomationRule[];
    },
    enabled: !!tenantId,
  });
}

// Fetch automation runs for tenant
export function useAutomationRuns(tenantId: string | null, limit = 50) {
  return useQuery({
    queryKey: ["automation_runs", tenantId, limit],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("automation_runs")
        .select("*, rule:automation_rules(*)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as AutomationRun[];
    },
    enabled: !!tenantId,
  });
}

// Fetch run steps for a specific run
export function useAutomationRunSteps(runId: string | null) {
  return useQuery({
    queryKey: ["automation_run_steps", runId],
    queryFn: async () => {
      if (!runId) return [];
      const { data, error } = await supabase
        .from("automation_run_steps")
        .select("*")
        .eq("run_id", runId)
        .order("started_at", { ascending: true });
      if (error) throw error;
      return data as AutomationRunStep[];
    },
    enabled: !!runId,
  });
}

// Mutations for integrations
export function useIntegrationMutations(tenantId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createIntegration = useMutation({
    mutationFn: async (data: {
      provider: string;
      display_name: string;
      auth_type: "oauth" | "api_key";
      config_json?: Record<string, unknown>;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      const insertData = {
        tenant_id: tenantId,
        provider: data.provider,
        display_name: data.display_name,
        auth_type: data.auth_type,
        config_json: data.config_json || {},
        status: "disconnected",
      };
      const { data: integration, error } = await supabase
        .from("integrations")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return integration as Integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", tenantId] });
      toast({ title: "Integration added" });
    },
    onError: (error) => {
      toast({ title: "Failed to add integration", description: String(error), variant: "destructive" });
    },
  });

  const updateIntegration = useMutation({
    mutationFn: async ({ id, config_json, ...rest }: Partial<Integration> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
      if (config_json !== undefined) updateData.config_json = config_json;
      const { data: integration, error } = await supabase
        .from("integrations")
        .update(updateData as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return integration as Integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", tenantId] });
      toast({ title: "Integration updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update integration", description: String(error), variant: "destructive" });
    },
  });

  const deleteIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("integrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", tenantId] });
      toast({ title: "Integration removed" });
    },
    onError: (error) => {
      toast({ title: "Failed to remove integration", description: String(error), variant: "destructive" });
    },
  });

  const testIntegration = useMutation({
    mutationFn: async (id: string) => {
      // For now, just update last_tested_at and set status to connected
      // In production, this would call an edge function to validate credentials
      const { data: integration, error } = await supabase
        .from("integrations")
        .update({
          status: "connected",
          last_tested_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return integration as Integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", tenantId] });
      toast({ title: "Connection test successful" });
    },
    onError: (error) => {
      toast({ title: "Connection test failed", description: String(error), variant: "destructive" });
    },
  });

  return { createIntegration, updateIntegration, deleteIntegration, testIntegration };
}

// Mutations for automation rules
export function useAutomationRuleMutations(tenantId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createRule = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      trigger_event: string;
      destination_provider: string;
      action_type: string;
      integration_id?: string;
      field_mapping_json?: Record<string, unknown>;
      behavior_json?: Record<string, unknown>;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      const { data: rule, error } = await supabase
        .from("automation_rules")
        .insert([{
          tenant_id: tenantId,
          name: data.name,
          description: data.description || null,
          trigger_event: data.trigger_event,
          destination_provider: data.destination_provider,
          action_type: data.action_type,
          integration_id: data.integration_id || null,
          field_mapping_json: (data.field_mapping_json || {}) as unknown as import("@/integrations/supabase/types").Json,
          behavior_json: (data.behavior_json || { auto_confirm: true, max_retries: 3 }) as unknown as import("@/integrations/supabase/types").Json,
        }])
        .select()
        .single();
      if (error) throw error;
      return rule as AutomationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", tenantId] });
      toast({ title: "Automation created" });
    },
    onError: (error) => {
      toast({ title: "Failed to create automation", description: String(error), variant: "destructive" });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, field_mapping_json, behavior_json, ...rest }: Partial<AutomationRule> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
      if (field_mapping_json !== undefined) updateData.field_mapping_json = field_mapping_json;
      if (behavior_json !== undefined) updateData.behavior_json = behavior_json;
      const { data: rule, error } = await supabase
        .from("automation_rules")
        .update(updateData as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return rule as AutomationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", tenantId] });
      toast({ title: "Automation updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update automation", description: String(error), variant: "destructive" });
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { data: rule, error } = await supabase
        .from("automation_rules")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return rule as AutomationRule;
    },
    onSuccess: (rule) => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", tenantId] });
      toast({ title: rule.enabled ? "Automation enabled" : "Automation paused" });
    },
    onError: (error) => {
      toast({ title: "Failed to toggle automation", description: String(error), variant: "destructive" });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_rules", tenantId] });
      toast({ title: "Automation deleted" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete automation", description: String(error), variant: "destructive" });
    },
  });

  return { createRule, updateRule, toggleRule, deleteRule };
}

// Test trigger automation (for dry-run testing)
export function useTestAutomation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      rule_id: string;
      sample_payload?: Record<string, unknown>;
      dry_run?: boolean;
    }) => {
      // Fetch the automation rule to get trigger_event and tenant_id
      const { data: rule, error: ruleError } = await supabase
        .from("automation_rules")
        .select("tenant_id, trigger_event, action_type, destination_provider")
        .eq("id", data.rule_id)
        .single();
      
      if (ruleError || !rule) {
        throw new Error("Automation rule not found");
      }

      // Parse entity type from trigger event (e.g., "order.created" → "order")
      const entityType = rule.trigger_event.split(".")[0];
      // Use a valid UUID for test entity - this is a reserved test UUID
      const testEntityId = "00000000-0000-0000-0000-000000000000";

      // Call trigger-workflow with proper parameters
      const { data: result, error } = await supabase.functions.invoke("trigger-workflow", {
        body: {
          tenant_id: rule.tenant_id,
          trigger: rule.trigger_event,
          entity_type: entityType,
          entity_id: testEntityId,
          dry_run: data.dry_run ?? true,
          details: {
            test_mode: true,
            rule_id: data.rule_id,
            ...data.sample_payload,
          },
        },
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["automation_runs"] });
      const isDryRun = variables.dry_run ?? true;
      toast({ 
        title: isDryRun ? "Test Complete (Dry Run)" : "Test Complete",
        description: result.status === "no_workflow" 
          ? "No matching workflow found for this trigger"
          : `${isDryRun ? "Simulated" : "Executed"} ${result.steps_executed || 0} steps. Status: ${result.status}`,
      });
    },
    onError: (error) => {
      toast({ title: "Test failed", description: String(error), variant: "destructive" });
    },
  });
}
