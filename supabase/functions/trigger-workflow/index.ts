import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TriggerWorkflowRequest {
  tenant_id: string;
  trigger: string;
  entity_type: string;
  entity_id: string;
  location_id?: string;
  details?: Record<string, any>;
  customer?: Record<string, any>;
  summary?: string;
  dry_run?: boolean; // If true, simulate without sending webhooks/SMS
  retry_run_id?: string; // If set, this is a retry of a previous run
}

// Helper for consistent JSON responses with CORS
function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...headers },
  });
}

function nowIso() {
  return new Date().toISOString();
}

// Resolve nested path like "details.priority" from context
function resolvePath(path: string, ctx: Record<string, any>): any {
  return path.split(".").reduce((acc: any, k: string) => (acc ? acc[k] : undefined), ctx);
}

// Evaluate edge conditions - supports multiple formats
function evalCondition(condition: any, ctx: Record<string, any>): boolean {
  if (!condition || Object.keys(condition).length === 0) return true;

  // New format: { "equals": ["order_type", "delivery"] }
  if (condition.equals?.length === 2) {
    const [path, value] = condition.equals;
    const got = resolvePath(path, ctx);
    return String(got) === String(value);
  }

  // New format: { "exists": ["customer_email"] }
  if (condition.exists?.length === 1) {
    const [path] = condition.exists;
    const got = resolvePath(path, ctx);
    return got !== undefined && got !== null && got !== "";
  }

  // Existing format: { index: 0 } for branch nodes - handled in traversal
  if (condition.index !== undefined) return true;

  return false;
}

// Load workflow graph with adjacency list for efficient traversal
async function loadGraph(supabase: any, workflow_id: string) {
  const [nodesRes, edgesRes] = await Promise.all([
    supabase.from("workflow_nodes").select("*").eq("workflow_id", workflow_id),
    supabase.from("workflow_edges").select("*").eq("workflow_id", workflow_id),
  ]);

  if (nodesRes.error) throw new Error(nodesRes.error.message);
  if (edgesRes.error) throw new Error(edgesRes.error.message);

  const nodes = nodesRes.data ?? [];
  const edges = edgesRes.data ?? [];

  // Build adjacency list for O(1) edge lookup
  const outgoing = new Map<string, any[]>();
  for (const e of edges) {
    const arr = outgoing.get(e.from_node_id) ?? [];
    arr.push(e);
    outgoing.set(e.from_node_id, arr);
  }

  // Find start node: named "Start" OR node with no incoming edges
  const incomingCount = new Map<string, number>();
  for (const n of nodes) incomingCount.set(n.id, 0);
  for (const e of edges) {
    incomingCount.set(e.to_node_id, (incomingCount.get(e.to_node_id) ?? 0) + 1);
  }

  let start = nodes.find((n: any) => (n.name || "").toLowerCase() === "start")?.id;
  if (!start) start = nodes.find((n: any) => (incomingCount.get(n.id) ?? 0) === 0)?.id;
  if (!start && nodes.length > 0) start = nodes[0].id;

  return { nodes, edges, outgoing, start };
}

// Load delivery settings for webhook URLs, notify phones
async function loadDeliverySettings(supabase: any, tenant_id: string) {
  const { data } = await supabase
    .from("universal_delivery_settings")
    .select("*")
    .eq("tenant_id", tenant_id)
    .maybeSingle();
  return data ?? {};
}

// Find matching active workflow with location priority
async function getActiveWorkflow(
  supabase: any,
  tenant_id: string,
  trigger: string,
  location_id?: string
) {
  // Priority 1: location-specific default
  if (location_id) {
    const { data: locationWorkflow } = await supabase
      .from("workflows")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("trigger", trigger)
      .eq("location_id", location_id)
      .eq("status", "active")
      .eq("is_default", true)
      .limit(1)
      .single();

    if (locationWorkflow) return locationWorkflow;
  }

  // Priority 2: tenant-wide default
  const { data: tenantWorkflow } = await supabase
    .from("workflows")
    .select("*")
    .eq("tenant_id", tenant_id)
    .eq("trigger", trigger)
    .is("location_id", null)
    .eq("status", "active")
    .eq("is_default", true)
    .limit(1)
    .single();

  return tenantWorkflow ?? null;
}

// Build context from entity data
async function buildContext(
  supabase: any,
  entityType: string,
  entityId: string,
  tenantId: string
): Promise<Record<string, any>> {
  const context: Record<string, any> = {
    entity_type: entityType,
    entity_id: entityId,
    tenant_id: tenantId,
    timestamp: nowIso(),
  };

  // Fetch tenant info
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, phone_public")
    .eq("id", tenantId)
    .single();

  if (tenant) {
    context.business_name = tenant.name;
    context.business_phone = tenant.phone_public;
  }

  // Fetch entity-specific data
  switch (entityType) {
    case "order": {
      const { data: order } = await supabase
        .from("food_orders")
        .select("*, customer:customers(*)")
        .eq("id", entityId)
        .single();

      if (order) {
        context.order_number = order.order_number;
        context.order_type = order.order_type;
        context.status = order.status;
        context.total_cents = order.total_cents;
        context.total_formatted = order.total_cents
          ? `$${(order.total_cents / 100).toFixed(2)}`
          : "";
        context.special_instructions = order.special_instructions;
        context.delivery_address = order.delivery_address;
        context.requested_time = order.requested_time;
        context.items_summary = formatItems(order.items_json);

        if (order.customer) {
          context.customer_name = order.customer.full_name;
          context.customer_phone = order.customer.phone_e164;
          context.customer_email = order.customer.email;
        } else {
          context.customer_name = order.customer_name;
          context.customer_phone = order.customer_phone;
        }
      }
      break;
    }

    case "booking": {
      const { data: booking } = await supabase
        .from("bookings")
        .select("*, lead:leads(*), service:services(*)")
        .eq("id", entityId)
        .single();

      if (booking) {
        context.booking_id = booking.id;
        context.status = booking.status;
        context.start_time = booking.start_at;
        context.end_time = booking.end_at;
        context.start_date = booking.start_at?.split("T")[0];
        context.deposit_required = booking.deposit_required;
        context.deposit_paid = booking.deposit_paid;

        if (booking.service) {
          context.service_name = booking.service.name;
          context.service_duration = booking.service.duration_minutes;
        }

        if (booking.lead) {
          context.customer_name = booking.lead.full_name;
          context.customer_phone = booking.lead.phone;
          context.customer_email = booking.lead.email;
        }
      }
      break;
    }

    case "dispatch": {
      const { data: dispatch } = await supabase
        .from("dispatch_jobs")
        .select("*, customer:customers(*)")
        .eq("id", entityId)
        .single();

      if (dispatch) {
        context.job_number = dispatch.job_number;
        context.job_type = dispatch.job_type;
        context.priority = dispatch.priority;
        context.status = dispatch.status;
        context.pickup_address = dispatch.pickup_address;
        context.dropoff_address = dispatch.dropoff_address;
        context.scheduled_at = dispatch.scheduled_at;
        context.estimated_duration = dispatch.estimated_duration_minutes;

        if (dispatch.customer) {
          context.customer_name = dispatch.customer.full_name;
          context.customer_phone = dispatch.customer.phone_e164;
        } else {
          context.customer_name = dispatch.customer_name;
          context.customer_phone = dispatch.customer_phone;
        }
      }
      break;
    }

    case "call": {
      const { data: call } = await supabase
        .from("ai_call_sessions")
        .select("*, customer:customers(*)")
        .eq("id", entityId)
        .single();

      if (call) {
        context.caller_phone = call.caller_phone;
        context.transcript = call.transcript;
        context.summary = call.summary;
        context.outcome = call.outcome;
        context.call_duration =
          call.ended_at && call.started_at
            ? Math.round(
                (new Date(call.ended_at).getTime() -
                  new Date(call.started_at).getTime()) /
                  1000
              )
            : 0;

        if (call.customer) {
          context.customer_name = call.customer.full_name;
        }
      }
      break;
    }
  }

  return context;
}

function formatItems(itemsJson: any): string {
  if (!Array.isArray(itemsJson)) return "";
  return itemsJson
    .map((item: any) => `${item.quantity || 1}x ${item.name || item.item_name}`)
    .join(", ");
}

// Template resolution with nested path support
function resolveTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
    const value = resolvePath(path, context);
    return value !== undefined ? String(value) : "";
  });
}

// Log step execution
async function stepLog(
  supabase: any,
  run_id: string,
  node: any,
  status: string,
  output: any = {},
  error?: string
) {
  await supabase.from("workflow_run_steps").insert({
    run_id,
    node_id: node.id,
    node_type: node.node_type,
    status,
    finished_at:
      status === "success" || status === "failed" || status === "skipped"
        ? nowIso()
        : null,
    output,
    error: error ?? null,
  });
}

// Execute a single node
async function executeNode(
  supabase: any,
  runId: string,
  node: any,
  context: Record<string, any>,
  tenantId: string,
  isDryRun: boolean = false
): Promise<Record<string, any>> {
  const config = node.config ?? {};
  let output: Record<string, any> = {};
  let error: string | null = null;

  try {
    switch (node.node_type) {
      case "print_ticket":
        output = isDryRun 
          ? { dry_run: true, would_print: { format: config?.format || "thermal", copies: config?.copies || 1 } }
          : await executePrintTicket(supabase, config, context);
        break;

      case "notify_sms":
        output = isDryRun
          ? { dry_run: true, would_send: { to: resolveTemplate(config?.to || "{{customer_phone}}", context), message: resolveTemplate(config?.message || "", context) } }
          : await executeNotifySms(config, context, tenantId);
        break;

      case "notify_email":
        output = isDryRun
          ? { dry_run: true, would_send: { to: resolveTemplate(config?.to || "{{customer_email}}", context), subject: resolveTemplate(config?.subject || "", context) } }
          : await executeNotifyEmail(config, context);
        break;

      case "webhook_push":
        output = await executeWebhookPush(supabase, config, context, node.id, runId, tenantId, isDryRun);
        break;

      case "delay":
        output = executeDelay(config);
        if (isDryRun) output.dry_run = true;
        break;

      case "branch":
        output = executeBranch(config, context);
        break;

      case "set_field":
        output = isDryRun
          ? { dry_run: true, would_set: { path: config?.path || config?.entity_field, value: resolveTemplate(String(config?.value || ""), context) } }
          : await executeSetField(supabase, config, context);
        break;

      case "assign_to_user":
        output = await executeAssignToUser(supabase, config, context);
        if (isDryRun) output.dry_run = true;
        break;

      default:
        output = { skipped: true, reason: `Unsupported node type: ${node.node_type}` };
    }
  } catch (e) {
    error = String(e);
    console.error(`[executeNode] ${node.node_type} failed:`, e);
  }

  await stepLog(supabase, runId, node, error ? "failed" : "success", output, error ?? undefined);

  if (error) throw new Error(error);
  return output;
}

async function executePrintTicket(
  supabase: any,
  config: any,
  context: Record<string, any>
): Promise<Record<string, any>> {
  if (context.entity_type === "order" && context.entity_id) {
    const { data: existing } = await supabase
      .from("food_orders")
      .select("handoff_state")
      .eq("id", context.entity_id)
      .single();

    await supabase
      .from("food_orders")
      .update({
        handoff_state: {
          ...(existing?.handoff_state || {}),
          print_requested: true,
          print_format: config?.format || "thermal",
          print_copies: config?.copies || 1,
          print_requested_at: nowIso(),
        },
      })
      .eq("id", context.entity_id);
  }

  return {
    print_requested: true,
    format: config?.format || "thermal",
    copies: config?.copies || 1,
  };
}

async function executeNotifySms(
  config: any,
  context: Record<string, any>,
  tenantId: string
): Promise<Record<string, any>> {
  const to = resolveTemplate(config?.to || "{{customer_phone}}", context);
  const message = resolveTemplate(config?.message || "", context);

  if (!to || !message) {
    throw new Error("SMS requires 'to' and 'message'");
  }

  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
    console.warn("[executeNotifySms] Twilio not configured, simulating send");
    return { simulated: true, to, message };
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: twilioFromNumber,
        Body: message,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio error: ${errorText}`);
  }

  const result = await response.json();
  return { message_sid: result.sid, status: "sent", to };
}

async function executeNotifyEmail(
  config: any,
  context: Record<string, any>
): Promise<Record<string, any>> {
  const to = resolveTemplate(config?.to || "{{customer_email}}", context);
  const subject = resolveTemplate(config?.subject || "", context);
  const body = resolveTemplate(config?.body || "", context);

  if (!to) {
    throw new Error("Email requires 'to'");
  }

  console.log(`[executeNotifyEmail] Would send email to ${to}: ${subject}`);

  return {
    simulated: true,
    to,
    subject,
    message: "Email service not configured - logged only",
  };
}

async function executeWebhookPush(
  supabase: any,
  config: any,
  context: Record<string, any>,
  nodeId: string,
  runId: string,
  tenantId: string,
  isDryRun: boolean
): Promise<Record<string, any>> {
  // Allow config URL or fallback to delivery settings
  const url = config?.url || context.delivery?.webhook_url;
  const method = config?.method || "POST";
  const headers = config?.headers || {};

  if (!url) {
    return { ok: false, skipped: true, reason: "No webhook URL configured" };
  }

  // Build idempotency key from entity_id + node_id
  const idempotencyKey = `${context.entity_id}:${nodeId}`;

  // Check for existing execution (idempotency)
  const { data: existing } = await supabase
    .from("webhook_executions")
    .select("id, status, response_code")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing && existing.status === "success") {
    return {
      idempotent_skip: true,
      reason: "Webhook already executed for this entity+node",
      previous_status: existing.response_code,
    };
  }

  // Build body from template
  let body: any = config?.body_template || context;
  if (typeof body === "object") {
    body = JSON.parse(resolveTemplate(JSON.stringify(body), context));
  }

  // Dry run mode - return simulated output
  if (isDryRun) {
    return {
      dry_run: true,
      would_send: {
        url,
        method,
        headers,
        body,
      },
    };
  }

  // Record webhook execution attempt
  const { data: execution } = await supabase
    .from("webhook_executions")
    .insert({
      tenant_id: tenantId,
      run_id: runId,
      node_id: nodeId,
      entity_id: context.entity_id,
      idempotency_key: idempotencyKey,
      status: "pending",
    })
    .select()
    .single();

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    // Update execution record
    if (execution) {
      await supabase
        .from("webhook_executions")
        .update({
          status: response.ok ? "success" : "failed",
          response_code: response.status,
          response_body: responseText.slice(0, 2000),
        })
        .eq("id", execution.id);
    }

    return {
      status_code: response.status,
      response: responseText.slice(0, 1000),
      success: response.ok,
    };
  } catch (error) {
    // Update execution record with error
    if (execution) {
      await supabase
        .from("webhook_executions")
        .update({
          status: "failed",
          response_body: String(error).slice(0, 2000),
        })
        .eq("id", execution.id);
    }
    throw error;
  }
}

function executeDelay(config: any): Record<string, any> {
  let delayMs = 0;

  if (config?.minutes) {
    delayMs = config.minutes * 60 * 1000;
  } else if (config?.hours) {
    delayMs = config.hours * 60 * 60 * 1000;
  } else if (config?.seconds) {
    delayMs = config.seconds * 1000;
  }

  const scheduledFor = new Date(Date.now() + delayMs).toISOString();

  return {
    scheduled_for: scheduledFor,
    delay_ms: delayMs,
  };
}

function executeBranch(config: any, context: Record<string, any>): Record<string, any> {
  const conditions = config?.conditions || [];

  for (let i = 0; i < conditions.length; i++) {
    const { field, op, value } = conditions[i];
    const fieldValue = resolvePath(field, context);

    let matches = false;
    switch (op) {
      case "eq":
        matches = fieldValue === value;
        break;
      case "neq":
        matches = fieldValue !== value;
        break;
      case "gt":
        matches = fieldValue > value;
        break;
      case "gte":
        matches = fieldValue >= value;
        break;
      case "lt":
        matches = fieldValue < value;
        break;
      case "lte":
        matches = fieldValue <= value;
        break;
      case "contains":
        matches = String(fieldValue).includes(String(value));
        break;
      case "not_contains":
        matches = !String(fieldValue).includes(String(value));
        break;
    }

    if (matches) {
      return { matched_condition: i, field, op, value, field_value: fieldValue };
    }
  }

  return { matched_condition: -1, no_match: true };
}

async function executeSetField(
  supabase: any,
  config: any,
  context: Record<string, any>
): Promise<Record<string, any>> {
  // Support nested path like "details.priority" or simple field
  const path = String(config?.path || config?.entity_field || "");
  const value = resolveTemplate(String(config?.value || ""), context);

  if (!path) {
    throw new Error("set_field requires 'path' or 'entity_field'");
  }

  // If path contains dots, update context directly (for workflow variables)
  if (path.includes(".")) {
    const parts = path.split(".");
    let cur: any = context;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] ?? {};
      cur = cur[parts[i]];
    }
    const oldValue = cur[parts[parts.length - 1]];
    cur[parts[parts.length - 1]] = value;
    return { path, old_value: oldValue, new_value: value, type: "context" };
  }

  // Otherwise, update entity in database
  const entityType = context.entity_type;
  const entityId = context.entity_id;

  const tableMap: Record<string, string> = {
    order: "food_orders",
    booking: "bookings",
    dispatch: "dispatch_jobs",
  };

  const table = tableMap[entityType];
  if (!table) {
    return { skipped: true, reason: `Cannot set field on ${entityType}` };
  }

  const { data: before } = await supabase
    .from(table)
    .select(path)
    .eq("id", entityId)
    .single();
  const oldValue = before?.[path];

  await supabase.from(table).update({ [path]: value }).eq("id", entityId);

  return { field: path, old_value: oldValue, new_value: value, type: "database" };
}

async function executeAssignToUser(
  supabase: any,
  config: any,
  context: Record<string, any>
): Promise<Record<string, any>> {
  return {
    simulated: true,
    user_id: config?.user_id,
    message: "Assignment system not yet implemented",
  };
}

// Main handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json(405, { error: "POST only" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: TriggerWorkflowRequest = await req.json();
    const { tenant_id, trigger, entity_type, entity_id, location_id, details, customer, summary, dry_run, retry_run_id } = body;

    const isDryRun = dry_run === true;

    if (!tenant_id || !trigger || !entity_type || !entity_id) {
      return json(400, { error: "Missing required fields: tenant_id, trigger, entity_type, entity_id" });
    }

    console.log(`[trigger-workflow] Triggering ${trigger} for ${entity_type}/${entity_id}${isDryRun ? " (DRY RUN)" : ""}`);

    // Get retry count if this is a retry
    let retryCount = 0;
    if (retry_run_id) {
      const { data: parentRun } = await supabase
        .from("workflow_runs")
        .select("retry_count")
        .eq("id", retry_run_id)
        .single();
      retryCount = (parentRun?.retry_count || 0) + 1;
    }

    // Find matching active workflow
    const workflow = await getActiveWorkflow(supabase, tenant_id, trigger, location_id);

    if (!workflow) {
      console.log(`[trigger-workflow] No active workflow found for ${trigger}`);
      return json(200, { ok: true, status: "no_workflow", message: "No active workflow for this trigger" });
    }

    console.log(`[trigger-workflow] Found workflow: ${workflow.name} (${workflow.id})`);

    // Load delivery settings and graph in parallel
    const [delivery, graph] = await Promise.all([
      loadDeliverySettings(supabase, tenant_id),
      loadGraph(supabase, workflow.id),
    ]);

    // Build execution context
    const entityContext = await buildContext(supabase, entity_type, entity_id, tenant_id);
    const context: Record<string, any> = {
      ...entityContext,
      delivery,
      details: details ?? {},
      customer: customer ?? {},
      summary: summary ?? "",
      trigger,
      is_dry_run: isDryRun,
    };

    // Create workflow run
    const { data: run, error: createRunError } = await supabase
      .from("workflow_runs")
      .insert({
        tenant_id,
        workflow_id: workflow.id,
        trigger,
        entity_type,
        entity_id,
        status: "running",
        context,
        is_dry_run: isDryRun,
        retry_count: retryCount,
        parent_run_id: retry_run_id || null,
      })
      .select()
      .single();

    if (createRunError) {
      console.error("[trigger-workflow] Failed to create run:", createRunError);
      throw createRunError;
    }

    if (!graph.start) {
      await supabase
        .from("workflow_runs")
        .update({ status: "failed", finished_at: nowIso(), error: "Workflow has no start node" })
        .eq("id", run.id);
      return json(200, { ok: false, run_id: run.id, error: "Workflow has no start node" });
    }

    // BFS traversal with adjacency list
    let stepsExecuted = 0;
    let executionError: string | null = null;
    const visited = new Set<string>();
    const queue: string[] = [graph.start];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = graph.nodes.find((n: any) => n.id === nodeId);
      if (!node) continue;

      try {
        const result = await executeNode(supabase, run.id, node, context, tenant_id, isDryRun);
        stepsExecuted++;

        // Handle delay nodes - schedule continuation
        if (node.node_type === "delay" && result.scheduled_for) {
          await supabase.from("workflow_scheduled_steps").insert({
            run_id: run.id,
            node_id: node.id,
            scheduled_for: result.scheduled_for,
          });
          break; // Stop execution - will be resumed by scheduled job
        }

        // Handle branch nodes - only follow matching edge
        if (node.node_type === "branch" && result.matched_condition !== undefined) {
          const outEdges = graph.outgoing.get(nodeId) ?? [];
          const matchingEdge = outEdges.find(
            (e: any) => (e.condition as any)?.index === result.matched_condition
          );
          if (matchingEdge) {
            queue.push(matchingEdge.to_node_id);
          }
          continue;
        }

        // Traverse outgoing edges with condition evaluation
        const outEdges = graph.outgoing.get(nodeId) ?? [];
        for (const edge of outEdges) {
          if (evalCondition(edge.condition, context) && !visited.has(edge.to_node_id)) {
            queue.push(edge.to_node_id);
          }
        }
      } catch (error) {
        console.error(`[trigger-workflow] Node ${node.id} failed:`, error);
        executionError = String(error);
        break;
      }
    }

    // Update run status
    const finalStatus = executionError ? "failed" : "success";
    await supabase
      .from("workflow_runs")
      .update({
        status: finalStatus,
        finished_at: nowIso(),
        error: executionError,
      })
      .eq("id", run.id);

    console.log(`[trigger-workflow] Completed with status: ${finalStatus}, steps: ${stepsExecuted}`);

    return json(200, {
      ok: !executionError,
      run_id: run.id,
      status: finalStatus,
      steps_executed: stepsExecuted,
      error: executionError,
    });
  } catch (error) {
    console.error("[trigger-workflow] Error:", error);
    return json(500, { ok: false, error: String(error) });
  }
});
