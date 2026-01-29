-- Create webhook_executions table for idempotency
-- This prevents duplicate webhook calls for the same entity+node combination
CREATE TABLE public.webhook_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES public.workflow_nodes(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_code INTEGER,
  response_body TEXT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(idempotency_key)
);

-- Enable RLS
ALTER TABLE public.webhook_executions ENABLE ROW LEVEL SECURITY;

-- Tenant users can view their own executions
CREATE POLICY "Tenant users can view webhook executions"
  ON public.webhook_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = webhook_executions.tenant_id
      AND tu.user_id = auth.uid()
    )
  );

-- Index for idempotency lookup
CREATE INDEX idx_webhook_executions_idempotency ON public.webhook_executions(idempotency_key);
CREATE INDEX idx_webhook_executions_run ON public.webhook_executions(run_id);

-- Add retry_count and is_dry_run to workflow_runs for better observability
ALTER TABLE public.workflow_runs 
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_dry_run BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parent_run_id UUID REFERENCES public.workflow_runs(id);

-- Add retry capability to workflow_run_steps
ALTER TABLE public.workflow_run_steps
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS can_retry BOOLEAN DEFAULT TRUE;