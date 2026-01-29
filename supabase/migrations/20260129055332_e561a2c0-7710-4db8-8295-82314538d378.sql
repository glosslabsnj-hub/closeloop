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

CREATE TYPE workflow_run_status AS ENUM ('running', 'success', 'failed', 'cancelled');

-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES tenant_locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger workflow_trigger NOT NULL,
  status workflow_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT false,
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

-- Workflow Nodes table
CREATE TABLE workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  node_type workflow_node_type NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX workflow_nodes_workflow_idx ON workflow_nodes(workflow_id);

-- Workflow Edges table
CREATE TABLE workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  condition JSONB NOT NULL DEFAULT '{}',
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX workflow_edges_workflow_idx ON workflow_edges(workflow_id);
CREATE INDEX workflow_edges_from_idx ON workflow_edges(from_node_id);

-- Workflow Runs table
CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger workflow_trigger NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  status workflow_run_status NOT NULL DEFAULT 'running',
  context JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX workflow_runs_entity_idx ON workflow_runs(tenant_id, entity_type, entity_id);
CREATE INDEX workflow_runs_status_idx ON workflow_runs(tenant_id, status, started_at DESC);
CREATE INDEX workflow_runs_workflow_idx ON workflow_runs(workflow_id);

-- Workflow Run Steps table
CREATE TABLE workflow_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  node_type workflow_node_type NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  output JSONB NOT NULL DEFAULT '{}',
  error TEXT
);

CREATE INDEX workflow_run_steps_run_idx ON workflow_run_steps(run_id);

-- Scheduled steps for delay nodes
CREATE TABLE workflow_scheduled_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX workflow_scheduled_due_idx ON workflow_scheduled_steps(scheduled_for, executed) WHERE NOT executed;

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_scheduled_steps ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY "Tenant users can view workflows"
  ON workflows FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can manage workflows"
  ON workflows FOR ALL
  USING (has_tenant_access(auth.uid(), tenant_id));

-- Nodes policies (via workflow)
CREATE POLICY "Tenant users can view nodes"
  ON workflow_nodes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_nodes.workflow_id 
    AND has_tenant_access(auth.uid(), w.tenant_id)
  ));

CREATE POLICY "Tenant users can manage nodes"
  ON workflow_nodes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_nodes.workflow_id 
    AND has_tenant_access(auth.uid(), w.tenant_id)
  ));

-- Edges policies (via workflow)
CREATE POLICY "Tenant users can view edges"
  ON workflow_edges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_edges.workflow_id 
    AND has_tenant_access(auth.uid(), w.tenant_id)
  ));

CREATE POLICY "Tenant users can manage edges"
  ON workflow_edges FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_edges.workflow_id 
    AND has_tenant_access(auth.uid(), w.tenant_id)
  ));

-- Runs policies
CREATE POLICY "Tenant users can view runs"
  ON workflow_runs FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can insert runs"
  ON workflow_runs FOR INSERT
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can update runs"
  ON workflow_runs FOR UPDATE
  USING (has_tenant_access(auth.uid(), tenant_id));

-- Run Steps policies (via run)
CREATE POLICY "Tenant users can view run steps"
  ON workflow_run_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflow_runs r 
    WHERE r.id = workflow_run_steps.run_id 
    AND has_tenant_access(auth.uid(), r.tenant_id)
  ));

CREATE POLICY "Tenant users can manage run steps"
  ON workflow_run_steps FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflow_runs r 
    WHERE r.id = workflow_run_steps.run_id 
    AND has_tenant_access(auth.uid(), r.tenant_id)
  ));

-- Scheduled steps policies (via run)
CREATE POLICY "Tenant users can view scheduled steps"
  ON workflow_scheduled_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workflow_runs r 
    WHERE r.id = workflow_scheduled_steps.run_id 
    AND has_tenant_access(auth.uid(), r.tenant_id)
  ));

CREATE POLICY "Tenant users can manage scheduled steps"
  ON workflow_scheduled_steps FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workflow_runs r 
    WHERE r.id = workflow_scheduled_steps.run_id 
    AND has_tenant_access(auth.uid(), r.tenant_id)
  ));

-- Update trigger for workflows
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();