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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: TriggerWorkflowRequest = await req.json();
    const { tenant_id, trigger, entity_type, entity_id, location_id } = body;

    if (!tenant_id || !trigger || !entity_type || !entity_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[trigger-workflow] Triggering ${trigger} for ${entity_type}/${entity_id}`);

    // Find matching active workflow
    // Priority: location-specific default > tenant-wide default
    let workflow = null;

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
      
      workflow = locationWorkflow;
    }

    if (!workflow) {
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
      
      workflow = tenantWorkflow;
    }

    if (!workflow) {
      console.log(`[trigger-workflow] No active workflow found for ${trigger}`);
      return new Response(
        JSON.stringify({ status: "no_workflow", message: "No active workflow for this trigger" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[trigger-workflow] Found workflow: ${workflow.name} (${workflow.id})`);

    // Build initial context based on entity type
    const context = await buildContext(supabase, entity_type, entity_id, tenant_id);

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
      })
      .select()
      .single();

    if (createRunError) {
      console.error("[trigger-workflow] Failed to create run:", createRunError);
      throw createRunError;
    }

    // Fetch workflow nodes
    const { data: nodes, error: nodesError } = await supabase
      .from("workflow_nodes")
      .select("*")
      .eq("workflow_id", workflow.id)
      .order("created_at");

    if (nodesError) throw nodesError;

    // Fetch workflow edges
    const { data: edges, error: edgesError } = await supabase
      .from("workflow_edges")
      .select("*")
      .eq("workflow_id", workflow.id);

    if (edgesError) throw edgesError;

    // Find starting nodes (nodes with no incoming edges)
    const nodesWithIncoming = new Set(edges?.map(e => e.to_node_id) || []);
    const startingNodes = nodes?.filter(n => !nodesWithIncoming.has(n.id)) || [];

    if (startingNodes.length === 0 && nodes && nodes.length > 0) {
      // If no clear starting node, start with the first node
      startingNodes.push(nodes[0]);
    }

    let stepsExecuted = 0;
    let executionError: string | null = null;

    // Execute nodes in sequence (following edges)
    const executedNodes = new Set<string>();
    const queue = [...startingNodes];

    while (queue.length > 0) {
      const node = queue.shift()!;
      
      if (executedNodes.has(node.id)) continue;
      executedNodes.add(node.id);

      try {
        const result = await executeNode(supabase, run.id, node, context, tenant_id);
        stepsExecuted++;

        // Handle delay nodes - schedule continuation
        if (node.node_type === "delay" && result.scheduled_for) {
          await supabase.from("workflow_scheduled_steps").insert({
            run_id: run.id,
            node_id: node.id,
            scheduled_for: result.scheduled_for,
          });
          // Stop execution here - will be resumed by scheduled job
          break;
        }

        // Handle branch nodes - only follow matching edge
        if (node.node_type === "branch" && result.matched_condition !== undefined) {
          const matchingEdge = edges?.find(
            e => e.from_node_id === node.id && 
            (e.condition as any)?.index === result.matched_condition
          );
          if (matchingEdge) {
            const nextNode = nodes?.find(n => n.id === matchingEdge.to_node_id);
            if (nextNode) queue.push(nextNode);
          }
          continue;
        }

        // Find next nodes via edges
        const outgoingEdges = edges?.filter(e => e.from_node_id === node.id) || [];
        for (const edge of outgoingEdges) {
          const nextNode = nodes?.find(n => n.id === edge.to_node_id);
          if (nextNode && !executedNodes.has(nextNode.id)) {
            queue.push(nextNode);
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
        finished_at: new Date().toISOString(),
        error: executionError,
      })
      .eq("id", run.id);

    console.log(`[trigger-workflow] Completed with status: ${finalStatus}, steps: ${stepsExecuted}`);

    return new Response(
      JSON.stringify({
        run_id: run.id,
        status: finalStatus,
        steps_executed: stepsExecuted,
        error: executionError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[trigger-workflow] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    timestamp: new Date().toISOString(),
  };

  // Fetch tenant info
  const { data: tenant } = await supabase
    .from("tenants")
    .select("business_name, phone")
    .eq("id", tenantId)
    .single();

  if (tenant) {
    context.business_name = tenant.business_name;
    context.business_phone = tenant.phone;
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
        context.total_formatted = order.total_cents ? `$${(order.total_cents / 100).toFixed(2)}` : "";
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
        context.call_duration = call.ended_at && call.started_at
          ? Math.round((new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 1000)
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

async function executeNode(
  supabase: any,
  runId: string,
  node: any,
  context: Record<string, any>,
  tenantId: string
): Promise<Record<string, any>> {
  // Create step record
  const { data: step, error: stepError } = await supabase
    .from("workflow_run_steps")
    .insert({
      run_id: runId,
      node_id: node.id,
      node_type: node.node_type,
      status: "running",
    })
    .select()
    .single();

  if (stepError) throw stepError;

  let output: Record<string, any> = {};
  let error: string | null = null;

  try {
    switch (node.node_type) {
      case "print_ticket":
        output = await executePrintTicket(supabase, node.config, context);
        break;
      
      case "notify_sms":
        output = await executeNotifySms(node.config, context, tenantId);
        break;
      
      case "notify_email":
        output = await executeNotifyEmail(node.config, context);
        break;
      
      case "webhook_push":
        output = await executeWebhookPush(node.config, context);
        break;
      
      case "delay":
        output = executeDelay(node.config);
        break;
      
      case "branch":
        output = executeBranch(node.config, context);
        break;
      
      case "set_field":
        output = await executeSetField(supabase, node.config, context);
        break;
      
      case "assign_to_user":
        output = await executeAssignToUser(supabase, node.config, context);
        break;
      
      default:
        output = { skipped: true, reason: `Unsupported node type: ${node.node_type}` };
    }
  } catch (e) {
    error = String(e);
    console.error(`[executeNode] ${node.node_type} failed:`, e);
  }

  // Update step with result
  await supabase
    .from("workflow_run_steps")
    .update({
      status: error ? "failed" : "success",
      finished_at: new Date().toISOString(),
      output,
      error,
    })
    .eq("id", step.id);

  if (error) throw new Error(error);
  return output;
}

async function executePrintTicket(
  supabase: any,
  config: any,
  context: Record<string, any>
): Promise<Record<string, any>> {
  // Mark entity for printing (the frontend or POS will poll for print requests)
  if (context.entity_type === "order" && context.entity_id) {
    await supabase
      .from("food_orders")
      .update({ 
        handoff_state: { 
          ...((await supabase.from("food_orders").select("handoff_state").eq("id", context.entity_id).single()).data?.handoff_state || {}),
          print_requested: true,
          print_format: config?.format || "thermal",
          print_copies: config?.copies || 1,
          print_requested_at: new Date().toISOString(),
        }
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

  // Call Twilio via environment or existing SMS infrastructure
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
        "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
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
    const error = await response.text();
    throw new Error(`Twilio error: ${error}`);
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

  // For now, log the email (integrate with Resend/SendGrid in production)
  console.log(`[executeNotifyEmail] Would send email to ${to}: ${subject}`);
  
  return { 
    simulated: true, 
    to, 
    subject,
    message: "Email service not configured - logged only",
  };
}

async function executeWebhookPush(
  config: any,
  context: Record<string, any>
): Promise<Record<string, any>> {
  const url = config?.url;
  const method = config?.method || "POST";
  const headers = config?.headers || {};
  
  if (!url) {
    throw new Error("Webhook requires 'url'");
  }

  // Build body from template
  let body: any = config?.body_template || context;
  if (typeof body === "object") {
    body = JSON.parse(resolveTemplate(JSON.stringify(body), context));
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  
  return {
    status_code: response.status,
    response: responseText.slice(0, 1000), // Truncate large responses
    success: response.ok,
  };
}

function executeDelay(config: any): Record<string, any> {
  let delayMs = 0;
  
  if (config?.minutes) {
    delayMs = config.minutes * 60 * 1000;
  } else if (config?.hours) {
    delayMs = config.hours * 60 * 60 * 1000;
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
    const fieldValue = context[field];
    
    let matches = false;
    switch (op) {
      case "eq": matches = fieldValue === value; break;
      case "neq": matches = fieldValue !== value; break;
      case "gt": matches = fieldValue > value; break;
      case "gte": matches = fieldValue >= value; break;
      case "lt": matches = fieldValue < value; break;
      case "lte": matches = fieldValue <= value; break;
      case "contains": matches = String(fieldValue).includes(String(value)); break;
      case "not_contains": matches = !String(fieldValue).includes(String(value)); break;
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
  const field = config?.entity_field;
  const value = resolveTemplate(String(config?.value || ""), context);
  
  if (!field) {
    throw new Error("set_field requires 'entity_field'");
  }

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

  const { data: before } = await supabase.from(table).select(field).eq("id", entityId).single();
  const oldValue = before?.[field];

  await supabase.from(table).update({ [field]: value }).eq("id", entityId);

  return { field, old_value: oldValue, new_value: value };
}

async function executeAssignToUser(
  supabase: any,
  config: any,
  context: Record<string, any>
): Promise<Record<string, any>> {
  // This would integrate with a crew/assignment system
  return { 
    simulated: true,
    user_id: config?.user_id,
    message: "Assignment system not yet implemented",
  };
}

function resolveTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return context[key] !== undefined ? String(context[key]) : "";
  });
}
