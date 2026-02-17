-- Cross-Tenant Referral Network
-- Enables businesses on CloseLoop to refer callers to each other
-- when they can't help (out of area, wrong service, fully booked).

-- 0. Add 'referral_transfer' to ai_call_outcome enum (used by source session)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ai_call_outcome') AND enumlabel = 'referral_transfer') THEN
    ALTER TYPE public.ai_call_outcome ADD VALUE 'referral_transfer';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1. Referral Network Settings (1:1 with tenants, like assistant_settings)
CREATE TABLE IF NOT EXISTS referral_network_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,

  -- Opt-in
  enabled               BOOLEAN NOT NULL DEFAULT false,
  accept_referrals      BOOLEAN NOT NULL DEFAULT true,
  send_referrals        BOOLEAN NOT NULL DEFAULT true,

  -- What this business offers the network
  network_services      TEXT[] DEFAULT '{}',
  network_categories    TEXT[] DEFAULT '{}',
  network_tags          TEXT[] DEFAULT '{}',

  -- Geographic (denormalized from service_area_json for fast matching)
  network_lat           DOUBLE PRECISION,
  network_lng           DOUBLE PRECISION,
  network_radius_miles  NUMERIC DEFAULT 50,

  -- Quality signals (precomputed by cron)
  quality_score         NUMERIC DEFAULT 0,
  go_live_ready         BOOLEAN DEFAULT false,
  voice_ai_active       BOOLEAN DEFAULT false,

  -- Controls
  preferred_partners    UUID[] DEFAULT '{}',
  blocked_tenant_ids    UUID[] DEFAULT '{}',
  same_industry_ok      BOOLEAN DEFAULT false,
  max_referrals_per_day INTEGER DEFAULT 20,
  referrals_today       INTEGER DEFAULT 0,
  referrals_today_reset DATE,
  intro_style           TEXT DEFAULT 'enthusiastic',

  -- HIPAA
  hipaa_compliant       BOOLEAN DEFAULT false,

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Indexes for matching queries
CREATE INDEX IF NOT EXISTS idx_rns_enabled
  ON referral_network_settings (enabled, accept_referrals)
  WHERE enabled = true AND accept_referrals = true;

CREATE INDEX IF NOT EXISTS idx_rns_geo
  ON referral_network_settings (network_lat, network_lng)
  WHERE enabled = true;

-- 2. Referral Transfers (audit log)
CREATE TABLE IF NOT EXISTS referral_transfers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  source_tenant_id      UUID NOT NULL REFERENCES tenants(id),
  source_session_id     UUID REFERENCES ai_call_sessions(id),

  -- Target
  target_tenant_id      UUID REFERENCES tenants(id),
  target_session_id     UUID REFERENCES ai_call_sessions(id),
  target_business_name  TEXT,

  -- Caller
  caller_phone_e164     TEXT NOT NULL,
  caller_name           TEXT,
  twilio_call_sid       TEXT,

  -- What was needed
  service_requested     TEXT NOT NULL,
  service_category      TEXT,
  caller_location       TEXT,
  caller_lat            DOUBLE PRECISION,
  caller_lng            DOUBLE PRECISION,
  referral_reason       TEXT,

  -- Matching
  candidates_found      INTEGER DEFAULT 0,
  match_scores_json     JSONB,

  -- Status
  status                TEXT NOT NULL DEFAULT 'searching',
  failure_reason        TEXT,
  referral_depth        INTEGER DEFAULT 1,

  -- Outcome tracking
  target_outcome        TEXT,
  commission_cents      INTEGER DEFAULT 0,

  created_at            TIMESTAMPTZ DEFAULT now(),
  completed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rt_source
  ON referral_transfers(source_tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rt_target
  ON referral_transfers(target_tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rt_status
  ON referral_transfers(status)
  WHERE status IN ('searching', 'matched', 'transferring');

-- 3. Add referral linkage to ai_call_sessions
ALTER TABLE ai_call_sessions
  ADD COLUMN IF NOT EXISTS referral_transfer_id UUID REFERENCES referral_transfers(id),
  ADD COLUMN IF NOT EXISTS is_referral_receiving BOOLEAN DEFAULT false;

-- 4. RLS Policies

-- referral_network_settings: tenant members can read/write their own
ALTER TABLE referral_network_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_network_settings_select"
  ON referral_network_settings FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "referral_network_settings_insert"
  ON referral_network_settings FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "referral_network_settings_update"
  ON referral_network_settings FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- Service role bypass for edge functions (matching engine reads all opted-in tenants)
CREATE POLICY "referral_network_settings_service_role"
  ON referral_network_settings FOR SELECT
  USING (auth.role() = 'service_role');

-- referral_transfers: both source AND target tenants can read their transfers
ALTER TABLE referral_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_transfers_select_source"
  ON referral_transfers FOR SELECT
  USING (
    source_tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "referral_transfers_select_target"
  ON referral_transfers FOR SELECT
  USING (
    target_tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- Service role for edge function writes
CREATE POLICY "referral_transfers_service_role"
  ON referral_transfers FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Updated_at trigger for referral_network_settings
CREATE OR REPLACE FUNCTION update_referral_network_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_referral_network_settings_updated_at
  BEFORE UPDATE ON referral_network_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_network_settings_updated_at();

-- 6. RPC: increment_referrals_today (called by transfer function to enforce daily limits)
CREATE OR REPLACE FUNCTION increment_referrals_today(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE referral_network_settings
  SET referrals_today = COALESCE(referrals_today, 0) + 1
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
