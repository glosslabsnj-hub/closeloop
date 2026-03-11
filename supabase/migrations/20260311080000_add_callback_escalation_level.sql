-- Add escalation_level to callback_requests for cron-callback-escalation tracking.
-- 0 = no escalation sent, 1 = reminder (2h), 2 = urgent (4h), 3 = critical (8h+, marked escalated)
ALTER TABLE callback_requests
  ADD COLUMN IF NOT EXISTS escalation_level smallint NOT NULL DEFAULT 0;

-- Index for the cron query: pending callbacks that may need escalation
CREATE INDEX IF NOT EXISTS idx_callback_requests_pending_escalation
  ON callback_requests (status, created_at)
  WHERE status = 'pending';
