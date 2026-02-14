-- Add reminder tracking columns to bookings table
-- Used by cron-appointment-reminders to avoid duplicate sends
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_24h boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_1h boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_confirmed_at timestamptz DEFAULT null;

-- Index for cron query efficiency: find bookings needing reminders
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_24h
  ON bookings (tenant_id, status, start_at)
  WHERE reminder_sent_24h = false;

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_1h
  ON bookings (tenant_id, status, start_at)
  WHERE reminder_sent_1h = false;
