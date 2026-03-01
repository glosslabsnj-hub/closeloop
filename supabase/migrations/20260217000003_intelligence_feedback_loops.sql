-- =============================================================================
-- Intelligence Feedback Loops + Outbound Calling Infrastructure
-- Phase 1: Close the intelligence feedback loops
-- Phase 2: Make every call smarter before it starts
-- Phase 3: Warm outbound calling
-- Phase 4: Foundation fixes
-- =============================================================================

-- 1.1 Auto-FAQ from knowledge gaps
-- resolved_by UUID column already exists on knowledge_gaps from original migration
-- We use resolution_notes TEXT for tracking auto-resolution source

-- Add auto_suggested flag and suggestion_status to business_faqs
ALTER TABLE business_faqs ADD COLUMN IF NOT EXISTS auto_suggested boolean DEFAULT false;
ALTER TABLE business_faqs ADD COLUMN IF NOT EXISTS suggestion_status text DEFAULT 'approved'
  CHECK (suggestion_status IN ('pending_review', 'approved', 'rejected'));
ALTER TABLE business_faqs ADD COLUMN IF NOT EXISTS source_gap_ids uuid[] DEFAULT '{}';

-- 1.2 Objection response effectiveness tracking
CREATE TABLE IF NOT EXISTS objection_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  objection_response_id uuid NOT NULL REFERENCES objection_responses(id) ON DELETE CASCADE,
  session_id uuid REFERENCES ai_call_sessions(id) ON DELETE SET NULL,
  call_outcome text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_objection_usage_tenant ON objection_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_objection_usage_response ON objection_usage(objection_response_id);
CREATE INDEX IF NOT EXISTS idx_objection_usage_created ON objection_usage(created_at);

ALTER TABLE objection_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "objection_usage_tenant_access" ON objection_usage;
CREATE POLICY "objection_usage_tenant_access"
  ON objection_usage
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- 1.4 Revenue attribution - call_outcomes.conversion_value_cents already exists
-- but ensure it can be updated with real values
-- (No schema change needed - just updating values in code)

-- 1.5 Call quality scoring
ALTER TABLE ai_call_sessions ADD COLUMN IF NOT EXISTS quality_score integer CHECK (quality_score >= 0 AND quality_score <= 100);
ALTER TABLE ai_call_sessions ADD COLUMN IF NOT EXISTS quality_details jsonb;

-- 2.4 Greeting A/B testing
ALTER TABLE assistant_settings ADD COLUMN IF NOT EXISTS greeting_variant_b text;
ALTER TABLE assistant_settings ADD COLUMN IF NOT EXISTS greeting_test_enabled boolean DEFAULT false;
ALTER TABLE ai_call_sessions ADD COLUMN IF NOT EXISTS greeting_variant text CHECK (greeting_variant IN ('A', 'B'));

-- 3.1 Outbound call infrastructure
ALTER TABLE ai_call_sessions ADD COLUMN IF NOT EXISTS direction text DEFAULT 'inbound'
  CHECK (direction IN ('inbound', 'outbound'));
ALTER TABLE ai_call_sessions ADD COLUMN IF NOT EXISTS call_purpose text
  CHECK (call_purpose IN ('reminder', 'followup', 'recovery', 'review', 'no_show_recovery'));

CREATE TABLE IF NOT EXISTS outbound_call_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_phone text NOT NULL,
  call_purpose text NOT NULL CHECK (call_purpose IN ('reminder', 'followup', 'recovery', 'review', 'no_show_recovery')),
  context_json jsonb DEFAULT '{}',
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'calling', 'completed', 'failed', 'skipped', 'cancelled')),
  attempt_count integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  last_attempt_at timestamptz,
  result_session_id uuid REFERENCES ai_call_sessions(id) ON DELETE SET NULL,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_queue_tenant ON outbound_call_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_outbound_queue_status ON outbound_call_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_outbound_queue_customer ON outbound_call_queue(customer_id);
CREATE INDEX IF NOT EXISTS idx_outbound_queue_purpose ON outbound_call_queue(call_purpose);

ALTER TABLE outbound_call_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outbound_queue_tenant_access" ON outbound_call_queue;
CREATE POLICY "outbound_queue_tenant_access"
  ON outbound_call_queue
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- Customer opt-out tracking for outbound calls
CREATE TABLE IF NOT EXISTS outbound_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  opted_out_at timestamptz DEFAULT now(),
  reason text,
  UNIQUE(tenant_id, customer_phone)
);

ALTER TABLE outbound_opt_outs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outbound_opt_outs_tenant_access" ON outbound_opt_outs;
CREATE POLICY "outbound_opt_outs_tenant_access"
  ON outbound_opt_outs
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );
