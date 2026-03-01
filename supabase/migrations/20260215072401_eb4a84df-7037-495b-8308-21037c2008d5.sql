-- Add SMS tracking columns to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reminder_sent_24h boolean DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reminder_sent_1h boolean DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS confirmation_sent boolean DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS review_sent boolean DEFAULT false;

-- Add review_link to tenants for easy access
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS review_link text;

-- CREATE INDEX IF NOT EXISTS for reminder cron queries
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_24h ON public.bookings (tenant_id, start_at, reminder_sent_24h) WHERE status IN ('confirmed', 'pending') AND reminder_sent_24h = false;
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_1h ON public.bookings (tenant_id, start_at, reminder_sent_1h) WHERE status IN ('confirmed', 'pending') AND reminder_sent_1h = false;
CREATE INDEX IF NOT EXISTS idx_bookings_review ON public.bookings (tenant_id, start_at, review_sent) WHERE status = 'completed' AND review_sent = false;
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation ON public.bookings (tenant_id, confirmation_sent) WHERE confirmation_sent = false;