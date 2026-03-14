-- booking_events: audit log for booking lifecycle changes (reschedule, cancel, etc.)
-- Tracks the source of the change and whether notifications were sent.

CREATE TABLE IF NOT EXISTS booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'rescheduled', 'cancelled', 'completed', 'confirmed'
  source TEXT NOT NULL, -- 'phone_ai', 'square_webhook', 'google_calendar_webhook', 'dashboard', 'api'
  previous_start_at TIMESTAMPTZ,
  new_start_at TIMESTAMPTZ,
  notification_sent_customer BOOLEAN DEFAULT FALSE,
  notification_sent_owner BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for looking up events by booking
CREATE INDEX idx_booking_events_booking_id ON booking_events(booking_id);

-- Index for tenant-scoped queries (dashboard, audit)
CREATE INDEX idx_booking_events_tenant_id_created ON booking_events(tenant_id, created_at DESC);

-- Index for filtering by event type (e.g. find all reschedules)
CREATE INDEX idx_booking_events_event_type ON booking_events(tenant_id, event_type);

-- Enable RLS
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see their own tenant's events
CREATE POLICY "Tenant isolation for booking_events"
  ON booking_events
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Service role bypass for edge functions
CREATE POLICY "Service role full access to booking_events"
  ON booking_events
  FOR ALL
  USING (auth.role() = 'service_role');
