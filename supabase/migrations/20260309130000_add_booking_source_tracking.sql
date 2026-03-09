-- ============================================================
-- Booking source tracking — know where every booking came from
-- ============================================================

-- Values: website, phone_ai, square_direct, square_online, api_unknown, manual, unknown
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source TEXT;
COMMENT ON COLUMN bookings.booking_source IS 'How this booking was created: website, phone_ai, square_direct, square_online, manual, unknown';

-- Index for filtering by source in dashboard
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings (tenant_id, booking_source) WHERE booking_source IS NOT NULL;
