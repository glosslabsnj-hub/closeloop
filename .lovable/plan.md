

# Visual Workflow Engine Implementation
## Orgs, Locations, Workflows, Nodes, Edges, Runs, and Run Steps

---

## Summary

This plan implements a complete visual workflow engine that transforms CloseLoop from a simple handoff system into a powerful, configurable automation platform. Workflows are triggered by events (order.created, booking.confirmed, call.ended, etc.) and execute a series of nodes (print_ticket, notify_sms, webhook_push, delay, branch, etc.).

The system integrates with the existing `tenant_locations` table and adds organization/brand hierarchy for multi-tenant scenarios while maintaining full backward compatibility.

---

## Architecture Decision: Tenant vs Org Model

The provided schema introduces `orgs` and `brands` as new hierarchical layers. However, CloseLoop already has:
- `tenants` as the primary business entity
- `tenant_locations` for multi-location support
- `tenant_users` for user membership

**Recommended Approach**: Map the new schema to existing structures:
- `tenant_id` = business (equivalent to `org_id` in the provided schema)
- `tenant_locations.id` = `location_id` (already exists)
- Skip `brands` table for v1 (can add later for franchise scenarios)

This avoids a major refactor while preserving the workflow capabilities.

---

## Phase 1: Database Schema

### 1.1 Workflow Core Tables

```sql
-- Workflow triggers
CREATE TYPE workflow_trigger AS ENUM (
  'order.created', 'order.confirmed', 'order.ready', 'order.completed',
  'booking.created', 'booking.confirmed', 'booking.completed',
  'dispatch.created', 'dispatch.confirmed', 'dispatch.completed',
  'reservation.created', 'reservation.confirmed',
  'catering.created', 'catering.quoted',
  'intake.created', 'intake.scheduled',
  'call.ended', 'sms.received', 'missed_call'
);

CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'archived');

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES tenant_locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger workflow_trigger NOT NULL,
  status workflow_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT false, -- default workflow per trigger
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: only one default per trigger per tenant (optionally per location)
CREATE UNIQUE INDEX workflows_default_idx 
  ON workflows(tenant_id, trigger) 
  WHERE is_default = true AND location_id IS NULL;

CREATE UNIQUE INDEX workflows_default_location_idx 
  ON workflows(tenant_id, trigger, location_id) 
  WHERE is_default = true AND location_id IS NOT NULL;

CREATE INDEX workflows_tenant_trigger_idx ON workflows(tenant_id, trigger, status);
```

### 1.2 Workflow Nodes (Actions)

```sql
CREATE TYPE workflow_node_type AS ENUM (
  'print_ticket',
  'notify_sms',
  'notify_email',
  'webhook_push',
  'update_crm',
  'create_calendar_event',
  'assign_to_user',
  'delay',
  'branch',
  'set_field'
);

CREATE TABLE workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  node_type workflow_node_type NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}', -- action-specific params
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}', -- for visual builder
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX workflow_nodes_workflow_idx ON workflow_nodes(workflow_id);
```

### 1.3 Workflow Edges (Connections)

```sql
CREATE TABLE workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  condition JSONB NOT NULL DEFAULT '{}', -- for branch nodes
  label TEXT, -- optional edge label
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX workflow_edges_workflow_idx ON workflow_edges(workflow_id);
CREATE INDEX workflow_edges_from_idx ON workflow_edges(from_node_id);
```

### 1.4 Workflow Runs (Execution)

```sql
CREATE TYPE workflow_run_status AS ENUM ('running', 'success', 'failed', 'cancelled');

CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger workflow_trigger NOT NULL,
  entity_type TEXT NOT NULL, -- 'order'|'booking'|'dispatch'|'call'|'sms'
  entity_id UUID NOT NULL,
  status workflow_run_status NOT NULL DEFAULT 'running',
  context JSONB NOT NULL DEFAULT '{}', -- runtime variables
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX workflow_runs_entity_idx ON workflow_runs(tenant_id, entity_type, entity_id);
CREATE INDEX workflow_runs_status_idx ON workflow_runs(tenant_id, status, started_at DESC);
```

### 1.5 Workflow Run Steps (Node Execution Logs)

```sql
CREATE TABLE workflow_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  node_type workflow_node_type NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued'|'running'|'success'|'failed'|'skipped'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  output JSONB NOT NULL DEFAULT '{}',
  error TEXT
);

CREATE INDEX workflow_run_steps_run_idx ON workflow_run_steps(run_id);
```

### 1.6 Row Level Security

```sql
-- RLS for all workflow tables
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_run_steps ENABLE ROW LEVEL SECURITY;

-- Workflows
CREATE POLICY "Tenant users can view workflows"
  ON workflows FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can manage workflows"
  ON workflows FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id));

-- Nodes (via workflow)
CREATE POLICY "Tenant users can manage nodes"
  ON workflow_nodes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_nodes.workflow_id 
    AND has_tenant_access(auth.uid(), w.tenant_id)
  ));

-- Edges (via workflow)
CREATE POLICY "Tenant users can manage edges"
  ON workflow_edges FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_edges.workflow_id 
    AND has_tenant_access(auth.uid(), w.tenant_id)
  ));

-- Runs
CREATE POLICY "Tenant users can view runs"
  ON workflow_runs FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can insert runs"
  ON workflow_runs FOR INSERT
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

-- Run Steps (via run)
CREATE POLICY "Tenant users can view run steps"
  ON workflow_run_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflow_runs r 
    WHERE r.id = workflow_run_steps.run_id 
    AND has_tenant_access(auth.uid(), r.tenant_id)
  ));
```

---

## Phase 2: Edge Functions

### 2.1 New Edge Function: `trigger-workflow`

The central orchestrator that fires when an event occurs.

**Location:** `supabase/functions/trigger-workflow/index.ts`

```text
Inputs:
- tenant_id: UUID
- trigger: workflow_trigger (e.g., "order.created")
- entity_type: string (e.g., "order")
- entity_id: UUID
- location_id?: UUID (optional, for location-specific workflows)

Logic:
1. Find matching active workflow(s):
   a. First check for location-specific default
   b. Fall back to tenant-wide default
2. Create workflow_run record
3. Build initial context (entity data, customer info, etc.)
4. Find starting nodes (nodes with no incoming edges)
5. Execute nodes in order, respecting edges and conditions
6. For delay nodes: schedule continuation (use pg_cron or Deno.cron)
7. Log each step in workflow_run_steps
8. Update run status on completion/failure

Returns:
{
  run_id: UUID,
  status: "running" | "success" | "failed",
  steps_executed: number
}
```

### 2.2 New Edge Function: `execute-workflow-node`

Executes a single node action.

**Location:** `supabase/functions/execute-workflow-node/index.ts`

```text
Inputs:
- run_id: UUID
- node_id: UUID
- context: JSONB (runtime variables)

Supported node_type actions:

1. print_ticket:
   - Mark print request in entity record
   - Return { print_requested: true }

2. notify_sms:
   - Config: { to: "{{customer_phone}}" | "+1234567890", message: "..." }
   - Use Twilio to send SMS
   - Return { message_sid: "...", status: "sent" }

3. notify_email:
   - Config: { to: "{{customer_email}}" | "owner@...", subject: "...", body: "..." }
   - Integrate with email service (Resend/SendGrid)
   - Return { email_id: "...", status: "sent" }

4. webhook_push:
   - Config: { url: "https://...", method: "POST", headers: {}, body_template: {} }
   - Send HTTP request with HMAC signature
   - Return { status_code: 200, response: "..." }

5. update_crm:
   - Config: { crm: "hubspot"|"salesforce", action: "create_contact"|"update_deal" }
   - Call CRM API (future integration)
   - Return { crm_id: "..." }

6. create_calendar_event:
   - Config: { calendar_provider: "google"|"outlook", event_data: {...} }
   - Use existing calendar integration
   - Return { event_id: "..." }

7. assign_to_user:
   - Config: { user_id: UUID | "round_robin" }
   - Update entity assigned_to field
   - Return { assigned_to: UUID }

8. delay:
   - Config: { minutes: 5 | hours: 2 | until: "09:00" }
   - Schedule continuation
   - Return { scheduled_for: "2026-01-29T10:00:00Z" }

9. branch:
   - Config: { conditions: [{ field: "...", op: "eq"|"gt"|"contains", value: "..." }] }
   - Evaluate conditions to determine next edge
   - Return { matched_condition: 0 | 1 | ... }

10. set_field:
    - Config: { entity_field: "status", value: "confirmed" }
    - Update entity record
    - Return { field: "status", old_value: "pending", new_value: "confirmed" }
```

### 2.3 Update: `universal-delivery/index.ts`

Modify to trigger workflows instead of hardcoded actions.

```typescript
// After building payload and before executing delivery methods:
// Check if a workflow should handle this

const { data: workflow } = await supabase
  .from("workflows")
  .select("id")
  .eq("tenant_id", tenantId)
  .eq("trigger", `${entityType}.created`)
  .eq("status", "active")
  .eq("is_default", true)
  .limit(1)
  .single();

if (workflow) {
  // Trigger workflow instead of legacy handoff
  await supabase.functions.invoke("trigger-workflow", {
    body: {
      tenant_id: tenantId,
      trigger: `${entityType}.created`,
      entity_type: entityType,
      entity_id: entityId,
    },
  });
  
  return { status: "workflow_triggered", workflow_id: workflow.id };
}

// Fall back to existing delivery logic if no workflow
```

### 2.4 Update: `elevenlabs-webhook/index.ts`

Add workflow trigger for call.ended.

```typescript
// After processing call data:
if (tenantId) {
  await supabase.functions.invoke("trigger-workflow", {
    body: {
      tenant_id: tenantId,
      trigger: "call.ended",
      entity_type: "call",
      entity_id: sessionId,
    },
  });
}
```

---

## Phase 3: Frontend Components

### 3.1 New Page: `WorkflowsPage.tsx`

**Location:** `src/pages/app/WorkflowsPage.tsx`

```text
┌─────────────────────────────────────────────────────────────┐
│ Workflows                                      [+ New Workflow]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─ ACTIVE ──────────────────────────────────────────────────┐
│ │                                                            │
│ │ ⚡ New Order → Print & Notify          trigger: order.created│
│ │    5 nodes · Last run: 2 min ago · ✓ 47 runs today        │
│ │                                        [Edit] [View Runs] │
│ │                                                            │
│ │ 📞 Post-Call Follow-up                 trigger: call.ended │
│ │    3 nodes · Last run: 15 min ago · ✓ 12 runs today       │
│ │                                        [Edit] [View Runs] │
│ │                                                            │
│ └────────────────────────────────────────────────────────────┘
│                                                              │
│ ┌─ DRAFT ────────────────────────────────────────────────────┐
│ │                                                            │
│ │ 🔧 Booking Reminder                    trigger: booking.created│
│ │    Work in progress · Not yet active                       │
│ │                                       [Edit] [Activate]   │
│ │                                                            │
│ └────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### 3.2 New Component: `WorkflowBuilder.tsx`

A visual node-based editor for building workflows.

**Location:** `src/components/workflows/WorkflowBuilder.tsx`

```text
┌─────────────────────────────────────────────────────────────────┐
│ Edit: New Order → Print & Notify            [Save] [Test] [Back]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    VISUAL CANVAS                            ││
│  │                                                              ││
│  │   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ ││
│  │   │  🎯 Trigger │─────▶│ 🖨️ Print   │─────▶│ 📱 SMS      │ ││
│  │   │ order.created│      │   Ticket    │      │   Owner     │ ││
│  │   └─────────────┘      └─────────────┘      └──────┬──────┘ ││
│  │                                                     │        ││
│  │                                              ┌──────▼──────┐ ││
│  │                                              │ ⏰ Delay    │ ││
│  │                                              │   5 min     │ ││
│  │                                              └──────┬──────┘ ││
│  │                                                     │        ││
│  │                                              ┌──────▼──────┐ ││
│  │                                              │ 📧 Email   │ ││
│  │                                              │  Customer   │ ││
│  │                                              └─────────────┘ ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌── NODE PALETTE ──────────────────────────────────────────────┐│
│  │ 🖨️ Print  📱 SMS  📧 Email  🔗 Webhook  ⏰ Delay  🔀 Branch │ ││
│  │ 👤 Assign  📝 Set Field  📅 Calendar  🔄 CRM                 ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

For v1, consider a simplified list-based builder instead of full drag-and-drop canvas:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Steps (executed in order)                          [+ Add Step] │
├─────────────────────────────────────────────────────────────────┤
│ 1. 🖨️ Print Ticket                                    [⚙️] [🗑️] │
│    Format: thermal · Copies: 1                                  │
│                                                                  │
│ 2. 📱 Send SMS to Owner                               [⚙️] [🗑️] │
│    To: +1234567890 · Message: "New order #{{order_number}}"     │
│                                                                  │
│ 3. ⏰ Wait 5 minutes                                  [⚙️] [🗑️] │
│                                                                  │
│ 4. 📧 Send Email to Customer                          [⚙️] [🗑️] │
│    To: {{customer_email}} · Subject: "Order Confirmation"       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 New Component: `WorkflowRunHistory.tsx`

Shows execution history for a workflow.

**Location:** `src/components/workflows/WorkflowRunHistory.tsx`

```text
┌─────────────────────────────────────────────────────────────────┐
│ Run History: New Order → Print & Notify             [Refresh]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ✓ Run #1234 · Order #ORD-ABC123 · 2 min ago · 5 steps · 1.2s   │
│   └ 🖨️ Print ✓ → 📱 SMS ✓ → ⏰ Wait → 📧 Email ✓               │
│                                                                  │
│ ✓ Run #1233 · Order #ORD-ABC122 · 15 min ago · 5 steps · 0.8s  │
│   └ 🖨️ Print ✓ → 📱 SMS ✓ → ⏰ Wait → 📧 Email ✓               │
│                                                                  │
│ ✗ Run #1232 · Order #ORD-ABC121 · 1 hour ago · 5 steps         │
│   └ 🖨️ Print ✓ → 📱 SMS ✗ "Twilio error: invalid number"       │
│                                     [View Details] [Retry]      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 New Component: `NodeConfigEditor.tsx`

Modal for configuring individual nodes.

**Location:** `src/components/workflows/NodeConfigEditor.tsx`

Dynamic form based on `node_type`:

- **print_ticket**: Format (thermal/full), copies
- **notify_sms**: To (variable or phone), message template
- **notify_email**: To, subject, body (with variable picker)
- **webhook_push**: URL, method, headers, body template
- **delay**: Duration (minutes/hours) or until time
- **branch**: Condition builder (field, operator, value)
- **set_field**: Entity field, new value

### 3.5 Update: `AutomationsPage.tsx`

Replace demo data with link to new Workflows system.

```typescript
// Add prominent link to Workflows
<Card className="bg-primary/5 border-primary/20">
  <CardContent className="p-6 text-center">
    <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
    <h3 className="text-lg font-semibold">New: Visual Workflows</h3>
    <p className="text-muted-foreground mb-4">
      Build powerful automations with our visual workflow builder
    </p>
    <Button asChild>
      <Link to="/app/workflows">Open Workflow Builder</Link>
    </Button>
  </CardContent>
</Card>
```

---

## Phase 4: Hooks and Types

### 4.1 New Hook: `useWorkflows.ts`

```typescript
export function useWorkflows(tenantId: string | null) {
  // Fetch all workflows for tenant
  // Filter by status, trigger
  // CRUD operations
}

export function useWorkflow(workflowId: string | null) {
  // Fetch single workflow with nodes and edges
  // Update workflow metadata
}

export function useWorkflowNodes(workflowId: string | null) {
  // CRUD operations for nodes
}

export function useWorkflowEdges(workflowId: string | null) {
  // CRUD operations for edges
}
```

### 4.2 New Hook: `useWorkflowRuns.ts`

```typescript
export function useWorkflowRuns(workflowId: string | null) {
  // Fetch runs for a workflow
  // Filter by status, date range
  // Retry failed runs
}

export function useWorkflowRunDetails(runId: string | null) {
  // Fetch run with all steps
  // Real-time updates for running workflows
}
```

### 4.3 New Types: `src/types/workflow.ts`

```typescript
export type WorkflowTrigger = 
  | "order.created" | "order.confirmed" | "order.ready" | "order.completed"
  | "booking.created" | "booking.confirmed" | "booking.completed"
  | "dispatch.created" | "dispatch.confirmed" | "dispatch.completed"
  | "reservation.created" | "reservation.confirmed"
  | "catering.created" | "catering.quoted"
  | "intake.created" | "intake.scheduled"
  | "call.ended" | "sms.received" | "missed_call";

export type WorkflowStatus = "draft" | "active" | "paused" | "archived";

export type WorkflowNodeType = 
  | "print_ticket" | "notify_sms" | "notify_email" | "webhook_push"
  | "update_crm" | "create_calendar_event" | "assign_to_user"
  | "delay" | "branch" | "set_field";

export type WorkflowRunStatus = "running" | "success" | "failed" | "cancelled";

export interface Workflow {
  id: string;
  tenant_id: string;
  location_id: string | null;
  name: string;
  description: string | null;
  trigger: WorkflowTrigger;
  status: WorkflowStatus;
  version: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_type: WorkflowNodeType;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  created_at: string;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  from_node_id: string;
  to_node_id: string;
  condition: Record<string, unknown>;
  label: string | null;
  created_at: string;
}

export interface WorkflowRun {
  id: string;
  tenant_id: string;
  workflow_id: string;
  trigger: WorkflowTrigger;
  entity_type: string;
  entity_id: string;
  status: WorkflowRunStatus;
  context: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

export interface WorkflowRunStep {
  id: string;
  run_id: string;
  node_id: string;
  node_type: WorkflowNodeType;
  status: "queued" | "running" | "success" | "failed" | "skipped";
  started_at: string;
  finished_at: string | null;
  output: Record<string, unknown>;
  error: string | null;
}
```

---

## Phase 5: Template Variables System

### 5.1 Variable Resolution

Workflows support template variables like `{{customer_name}}`, `{{order_number}}`, etc.

**Available Variables by Entity Type:**

```text
ORDER:
  {{order_number}}, {{order_type}}, {{status}}
  {{customer_name}}, {{customer_phone}}, {{customer_email}}
  {{items_summary}}, {{special_instructions}}
  {{total_cents}}, {{total_formatted}}
  {{requested_time}}, {{delivery_address}}

BOOKING:
  {{booking_id}}, {{status}}
  {{customer_name}}, {{customer_phone}}, {{customer_email}}
  {{service_name}}, {{service_duration}}
  {{start_time}}, {{end_time}}, {{start_date}}
  {{deposit_required}}, {{deposit_paid}}

DISPATCH:
  {{job_number}}, {{job_type}}, {{priority}}, {{status}}
  {{customer_name}}, {{customer_phone}}
  {{pickup_address}}, {{dropoff_address}}
  {{scheduled_at}}, {{estimated_duration}}

CALL:
  {{caller_phone}}, {{call_duration}}
  {{transcript}}, {{summary}}, {{outcome}}
  {{customer_name}}, {{service_requested}}

COMMON:
  {{business_name}}, {{business_phone}}
  {{today}}, {{now}}, {{timezone}}
```

### 5.2 Variable Picker Component

Add a variable picker dropdown in message editors:

```text
┌─────────────────────────────────────────────────────┐
│ Message: Hello {{customer_name}}, your order #...   │
│                                        [📋 Insert] │
│          ┌─────────────────────────────────────────┐│
│          │ Customer                                ││
│          │   {{customer_name}}                     ││
│          │   {{customer_phone}}                    ││
│          │   {{customer_email}}                    ││
│          │ Order                                   ││
│          │   {{order_number}}                      ││
│          │   {{order_type}}                        ││
│          │   {{total_formatted}}                   ││
│          └─────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## Phase 6: Routing and Navigation

### 6.1 New Routes

```typescript
// In App.tsx or router config
{ path: "/app/workflows", element: <WorkflowsPage /> }
{ path: "/app/workflows/new", element: <WorkflowEditPage /> }
{ path: "/app/workflows/:id", element: <WorkflowEditPage /> }
{ path: "/app/workflows/:id/runs", element: <WorkflowRunsPage /> }
{ path: "/app/workflows/:id/runs/:runId", element: <WorkflowRunDetailPage /> }
```

### 6.2 Sidebar Navigation

Add "Workflows" to the sidebar under Automations:

```typescript
{
  label: "Workflows",
  icon: GitBranch,
  path: "/app/workflows",
  badge: activeWorkflowCount > 0 ? activeWorkflowCount : undefined,
}
```

---

## Phase 7: Migration Strategy

### 7.1 Backward Compatibility

Existing `automations` table and delivery settings continue to work. Workflows are an **additive** layer:

1. If a workflow exists for a trigger → execute workflow
2. If no workflow → fall back to legacy `universal-delivery` logic
3. Existing `delivery_rules` (auto_confirm, review_queue) still apply

### 7.2 Default Workflow Templates

On first visit to Workflows page, offer to create default workflows based on:
- Current `delivery_rules` settings
- Enabled modules (food_orders, dispatch_queue, etc.)
- Business mode (service, food, dispatch, medical)

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/trigger-workflow/index.ts` | Workflow orchestrator |
| `supabase/functions/execute-workflow-node/index.ts` | Node action executor |
| `src/pages/app/WorkflowsPage.tsx` | Workflow list page |
| `src/pages/app/WorkflowEditPage.tsx` | Workflow builder/editor |
| `src/pages/app/WorkflowRunsPage.tsx` | Run history page |
| `src/pages/app/WorkflowRunDetailPage.tsx` | Single run detail |
| `src/components/workflows/WorkflowBuilder.tsx` | Visual builder |
| `src/components/workflows/NodeConfigEditor.tsx` | Node config modal |
| `src/components/workflows/WorkflowRunHistory.tsx` | Run list component |
| `src/components/workflows/VariablePicker.tsx` | Template variable picker |
| `src/hooks/useWorkflows.ts` | Workflow CRUD hooks |
| `src/hooks/useWorkflowRuns.ts` | Run tracking hooks |
| `src/types/workflow.ts` | TypeScript types |

### Modified Files

| File | Changes |
|------|---------|
| `supabase/functions/universal-delivery/index.ts` | Check for workflow before legacy handoff |
| `supabase/functions/elevenlabs-webhook/index.ts` | Trigger call.ended workflow |
| `src/pages/app/AutomationsPage.tsx` | Add link to Workflows |
| `src/App.tsx` | Add workflow routes |
| `src/components/layouts/AppLayout.tsx` | Add sidebar link |

---

## Technical Considerations

### Delay Node Execution

For `delay` nodes, options include:

1. **pg_cron** (database-level scheduling)
2. **Deno.cron** (edge function scheduling - Supabase native)
3. **Simple polling** (check for due delays every minute)

Recommended for v1: Use a `workflow_scheduled_steps` table and poll every minute.

### Concurrency & Idempotency

- Each run has a unique ID
- Steps are logged before execution
- Failed steps can be retried
- Duplicate triggers are detected by entity_id + workflow_id + recent timestamp

### Performance

- Workflows execute asynchronously
- Heavy actions (webhook, email) have timeout limits
- Run history is paginated and indexed

---

## Implementation Order

1. **Database**: Create all tables and RLS policies
2. **Types**: Add TypeScript types
3. **Hooks**: Implement data fetching hooks
4. **Edge Functions**: Build trigger-workflow and execute-workflow-node
5. **Workflows Page**: List view with CRUD
6. **Workflow Builder**: Simple list-based editor (v1)
7. **Run History**: View execution logs
8. **Integration**: Wire into universal-delivery and elevenlabs-webhook
9. **Templates**: Offer default workflows on first use

