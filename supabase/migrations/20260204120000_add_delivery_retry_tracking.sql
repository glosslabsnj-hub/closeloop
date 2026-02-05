-- Add retry tracking columns to delivery_attempts table
-- These columns support automatic retry with exponential backoff

ALTER TABLE IF EXISTS delivery_attempts
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Index for finding deliveries that are ready for retry
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_retry_ready
ON delivery_attempts (status, retry_count, next_retry_at)
WHERE status = 'failed' AND retry_count < 3;

-- Also add retry tracking to handoff_attempts for legacy support
ALTER TABLE IF EXISTS handoff_attempts
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Index for finding handoff_attempts that are ready for retry
CREATE INDEX IF NOT EXISTS idx_handoff_attempts_retry_ready
ON handoff_attempts (status, retry_count, next_retry_at)
WHERE status = 'failed' AND retry_count < 3;

COMMENT ON COLUMN delivery_attempts.retry_count IS 'Number of retry attempts made for this delivery';
COMMENT ON COLUMN delivery_attempts.last_retry_at IS 'Timestamp of the most recent retry attempt';
COMMENT ON COLUMN delivery_attempts.next_retry_at IS 'Scheduled timestamp for the next retry attempt';
