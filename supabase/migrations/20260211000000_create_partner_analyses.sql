-- Partner Analyses: cached AI-generated business analysis per tenant
CREATE TABLE IF NOT EXISTS partner_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  analysis_json JSONB NOT NULL,
  model_used TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  refresh_count_today INTEGER NOT NULL DEFAULT 1,
  refresh_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_partner_analyses_tenant UNIQUE (tenant_id)
);

ALTER TABLE partner_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access" ON partner_analyses
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
