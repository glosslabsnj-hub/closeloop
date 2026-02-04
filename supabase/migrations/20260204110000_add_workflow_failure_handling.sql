-- Migration: Add workflow failure handling and retry support
-- Adds columns to track retries and identify critical failures that need attention

-- Add retry tracking columns to workflow_runs
ALTER TABLE workflow_runs
ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INT NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS needs_retry BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS alerted_at TIMESTAMPTZ;

-- Create index for finding runs that need retry
CREATE INDEX IF NOT EXISTS workflow_runs_needs_retry_idx
  ON workflow_runs(tenant_id, needs_retry, next_retry_at)
  WHERE needs_retry = true;

-- Create index for finding critical failures that haven't been alerted
CREATE INDEX IF NOT EXISTS workflow_runs_critical_unalerted_idx
  ON workflow_runs(tenant_id, is_critical, status, alerted_at)
  WHERE is_critical = true AND status = 'failed' AND alerted_at IS NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN workflow_runs.needs_retry IS 'True if this run failed and should be retried';
COMMENT ON COLUMN workflow_runs.next_retry_at IS 'When the next retry should be attempted (exponential backoff)';
COMMENT ON COLUMN workflow_runs.is_critical IS 'True for critical triggers (order.created, booking.created) that need attention on failure';
COMMENT ON COLUMN workflow_runs.alerted_at IS 'When the business owner was alerted about this failure';

-- Create a view for monitoring failed workflows
CREATE OR REPLACE VIEW workflow_failures_monitor AS
SELECT
  wr.id,
  wr.tenant_id,
  t.business_name,
  wr.trigger,
  wr.entity_type,
  wr.entity_id,
  wr.error,
  wr.retry_count,
  wr.max_retries,
  wr.needs_retry,
  wr.next_retry_at,
  wr.is_critical,
  wr.alerted_at,
  wr.started_at,
  wr.finished_at
FROM workflow_runs wr
JOIN tenants t ON t.id = wr.tenant_id
WHERE wr.status = 'failed'
ORDER BY wr.is_critical DESC, wr.started_at DESC;

-- Grant access to the view
GRANT SELECT ON workflow_failures_monitor TO authenticated;
GRANT SELECT ON workflow_failures_monitor TO service_role;
