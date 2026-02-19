-- Unified OAuth token storage for all integration providers.
-- Replaces the fragmented approach of calendar_tokens + tenant_integrations.credentials_json.
-- Calendar tokens are ALSO stored in calendar_tokens for backward compatibility
-- with existing sync logic; this table is the single source of truth going forward.

CREATE TABLE IF NOT EXISTS integration_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'error', 'revoked')),
  error_message TEXT,
  extra_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, provider)
);

-- Index for quick lookups by tenant
CREATE INDEX IF NOT EXISTS idx_integration_oauth_tokens_tenant
  ON integration_oauth_tokens(tenant_id);

-- Index for finding tokens that need refresh (expired or about to expire)
CREATE INDEX IF NOT EXISTS idx_integration_oauth_tokens_expires
  ON integration_oauth_tokens(expires_at)
  WHERE status = 'connected' AND expires_at IS NOT NULL;

-- RLS
ALTER TABLE integration_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Owners and managers can view their tokens (but NOT the raw access/refresh token values
-- — those are only accessed via service role from edge functions)
CREATE POLICY "Tenant members can view own oauth tokens" ON integration_oauth_tokens
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Only service role should insert/update/delete tokens
-- (Edge functions use service role client, not user JWT)

-- Webhook events audit table for inbound 2-way sync
CREATE TABLE IF NOT EXISTS integration_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_provider
  ON integration_webhook_events(tenant_id, provider);

CREATE INDEX IF NOT EXISTS idx_webhook_events_external_id
  ON integration_webhook_events(provider, external_id)
  WHERE external_id IS NOT NULL;

-- RLS
ALTER TABLE integration_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view webhook events" ON integration_webhook_events
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );
