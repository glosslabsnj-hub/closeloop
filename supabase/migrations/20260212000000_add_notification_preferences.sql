-- Notification preferences per user per tenant
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  channel_email BOOLEAN NOT NULL DEFAULT true,
  channel_sms BOOLEAN NOT NULL DEFAULT false,
  channel_push BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_tenant_user
  ON notification_preferences(tenant_id, user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid() AND tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));
