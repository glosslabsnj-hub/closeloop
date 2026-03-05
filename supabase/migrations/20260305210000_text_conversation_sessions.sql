-- text_conversation_sessions: server-side session storage for text-conversation API
-- Allows QA agents and external callers to pass a sessionId instead of threading
-- the full conversationMessages array between API calls.
-- Auto-expires after 24 hours (cleaned up via updated_at).

CREATE TABLE IF NOT EXISTS text_conversation_sessions (
  id TEXT PRIMARY KEY,                        -- client-provided sessionId (e.g. "qa-hvac-r5-context1")
  tenant_id UUID NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',       -- full Claude API message history (MessageParam[])
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_text_conv_sessions_tenant ON text_conversation_sessions(tenant_id);

-- Index for cleanup of old sessions
CREATE INDEX IF NOT EXISTS idx_text_conv_sessions_updated ON text_conversation_sessions(updated_at);

-- RLS: service_role only (this table is written by edge functions, not the browser)
ALTER TABLE text_conversation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON text_conversation_sessions
  FOR ALL USING (auth.role() = 'service_role');
