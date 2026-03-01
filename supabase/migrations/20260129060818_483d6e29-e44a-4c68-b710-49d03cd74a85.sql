-- Audit event type enum
CREATE TYPE audit_event_type AS ENUM (
  'call.started', 'call.ended', 'sms.received', 'sms.sent',
  'order.created', 'order.confirmed', 'booking.created', 'booking.confirmed',
  'dispatch.created', 'dispatch.confirmed',
  'handoff.sent', 'handoff.failed',
  'ai.summary.created', 'ai.policy.violation'
);

-- Comprehensive audit events table
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES tenant_locations(id) ON DELETE SET NULL,
  event_type audit_event_type NOT NULL,
  entity_type text,
  entity_id uuid,
  actor_type text NOT NULL DEFAULT 'system', -- 'ai'|'user'|'system'
  actor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant ON audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_occurred ON audit_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);

-- Enable RLS
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_events
DROP POLICY IF EXISTS "Users can view tenant audit events" ON audit_events;
CREATE POLICY "Users can view tenant audit events"
  ON audit_events FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "System can insert audit events" ON audit_events;
CREATE POLICY "System can insert audit events"
  ON audit_events FOR INSERT
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

-- Dispute-safe confirmation receipts
CREATE TABLE IF NOT EXISTS confirmation_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- order|booking|dispatch|reservation
  entity_id uuid NOT NULL,
  confirmed_by text NOT NULL, -- 'customer_voice'|'customer_sms'|'staff'|'ai'
  confirmation_summary text NOT NULL,
  confirmation_hash text NOT NULL, -- hash of summary + key fields
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for confirmation_receipts
CREATE INDEX IF NOT EXISTS idx_confirmation_receipts_tenant ON confirmation_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_receipts_entity ON confirmation_receipts(entity_type, entity_id);

-- Enable RLS
ALTER TABLE confirmation_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for confirmation_receipts
DROP POLICY IF EXISTS "Users can view tenant confirmation receipts" ON confirmation_receipts;
CREATE POLICY "Users can view tenant confirmation receipts"
  ON confirmation_receipts FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "System can insert confirmation receipts" ON confirmation_receipts;
CREATE POLICY "System can insert confirmation receipts"
  ON confirmation_receipts FOR INSERT
  WITH CHECK (has_tenant_access(auth.uid(), tenant_id));

-- Per-tenant retention policies
CREATE TABLE IF NOT EXISTS retention_policies (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  hipaa_mode boolean NOT NULL DEFAULT false,
  store_transcripts boolean NOT NULL DEFAULT false,
  store_recordings boolean NOT NULL DEFAULT false,
  transcript_days int NOT NULL DEFAULT 0,
  recording_days int NOT NULL DEFAULT 0,
  audit_days int NOT NULL DEFAULT 365,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;

-- RLS policies for retention_policies
DROP POLICY IF EXISTS "Owners can manage retention policies" ON retention_policies;
CREATE POLICY "Owners can manage retention policies"
  ON retention_policies FOR ALL
  USING (
    (tenant_id IN (
      SELECT tenant_users.tenant_id FROM tenant_users
      WHERE tenant_users.user_id = auth.uid() AND tenant_users.role = 'owner'::user_role
    )) OR has_role(auth.uid(), 'super_admin'::user_role)
  );

DROP POLICY IF EXISTS "Users can view tenant retention policies" ON retention_policies;
CREATE POLICY "Users can view tenant retention policies"
  ON retention_policies FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));