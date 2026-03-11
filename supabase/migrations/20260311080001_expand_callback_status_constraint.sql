-- Expand callback_requests status check constraint to include 'escalated'
-- needed by the cron-callback-escalation function for 8h+ pending callbacks.
ALTER TABLE callback_requests DROP CONSTRAINT IF EXISTS callback_requests_status_check;
ALTER TABLE callback_requests ADD CONSTRAINT callback_requests_status_check
  CHECK (status IN ('pending', 'contacted', 'called_back', 'completed', 'cancelled', 'escalated'));
