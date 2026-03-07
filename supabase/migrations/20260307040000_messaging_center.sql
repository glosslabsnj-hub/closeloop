-- Messaging Center: campaigns, templates, and automation settings
-- Builds on existing: messages, conversations, review_requests, lead_recovery_templates

-- ═══════════════════════════════════════════════════════════════
-- 1. Messaging Templates (reusable across campaigns + automations)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS messaging_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
    -- categories: booking_confirmation, appointment_reminder, post_service_followup,
    --             review_request, re_engagement, promotion, custom
  variables TEXT[] DEFAULT '{}',
    -- e.g. {'first_name','service','date','time','business_name','review_link'}
  is_system BOOLEAN DEFAULT FALSE,
    -- system templates can't be deleted, only edited
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messaging_templates_tenant ON messaging_templates(tenant_id);

ALTER TABLE messaging_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view templates"
  ON messaging_templates FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can manage templates"
  ON messaging_templates FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- 2. Messaging Automations (toggle-based automated messages)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS messaging_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
    -- triggers: booking_confirmed, appointment_reminder, service_completed,
    --           review_request, re_engagement
  enabled BOOLEAN DEFAULT FALSE,
  delay_minutes INTEGER DEFAULT 0,
    -- how long after the trigger event to send (0 = immediately)
  template_id UUID REFERENCES messaging_templates(id) ON DELETE SET NULL,
  custom_body TEXT,
    -- if no template_id, use this body directly
  settings_json JSONB DEFAULT '{}',
    -- flexible settings: { reminder_hours_before: 24, re_engagement_days: 30 }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, trigger_type)
);

CREATE INDEX IF NOT EXISTS idx_messaging_automations_tenant ON messaging_automations(tenant_id);

ALTER TABLE messaging_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view automations"
  ON messaging_automations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can manage automations"
  ON messaging_automations FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- 3. Messaging Campaigns (one-time or scheduled blasts)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS messaging_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
    -- statuses: draft, scheduled, sending, completed, cancelled
  template_id UUID REFERENCES messaging_templates(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
    -- resolved body (with variables filled in from template)
  audience_filter JSONB DEFAULT '{}',
    -- { type: 'all' | 'tag' | 'recent' | 'custom', value: 'past_customer', days: 90 }
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  opted_out_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messaging_campaigns_tenant ON messaging_campaigns(tenant_id);

ALTER TABLE messaging_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view campaigns"
  ON messaging_campaigns FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can manage campaigns"
  ON messaging_campaigns FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- 4. Campaign Recipients (per-recipient tracking)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS messaging_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES messaging_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
    -- statuses: pending, sent, delivered, failed, opted_out
  twilio_sid TEXT,
  error_code TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcr_campaign ON messaging_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mcr_customer ON messaging_campaign_recipients(customer_id);

ALTER TABLE messaging_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view campaign recipients"
  ON messaging_campaign_recipients FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM messaging_campaigns
    WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ));

CREATE POLICY "Tenant members can manage campaign recipients"
  ON messaging_campaign_recipients FOR ALL
  USING (campaign_id IN (
    SELECT id FROM messaging_campaigns
    WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ));

-- ═══════════════════════════════════════════════════════════════
-- 5. Seed default templates for every existing tenant
-- ═══════════════════════════════════════════════════════════════
INSERT INTO messaging_templates (tenant_id, name, body, category, variables, is_system)
SELECT
  t.id,
  'Booking Confirmation',
  'Hi {{first_name}}, your {{service}} with {{business_name}} is confirmed for {{date}} at {{time}}. See you then! Reply STOP to opt out.',
  'booking_confirmation',
  ARRAY['first_name','service','business_name','date','time'],
  TRUE
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM messaging_templates mt
  WHERE mt.tenant_id = t.id AND mt.category = 'booking_confirmation' AND mt.is_system = TRUE
);

INSERT INTO messaging_templates (tenant_id, name, body, category, variables, is_system)
SELECT
  t.id,
  'Appointment Reminder',
  'Reminder: Your {{service}} with {{business_name}} is tomorrow at {{time}}. Need to reschedule? Give us a call. Reply STOP to opt out.',
  'appointment_reminder',
  ARRAY['first_name','service','business_name','date','time'],
  TRUE
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM messaging_templates mt
  WHERE mt.tenant_id = t.id AND mt.category = 'appointment_reminder' AND mt.is_system = TRUE
);

INSERT INTO messaging_templates (tenant_id, name, body, category, variables, is_system)
SELECT
  t.id,
  'Post-Service Follow-Up',
  'Hey {{first_name}}, thanks for choosing {{business_name}}! How did everything turn out? We''d love to hear your feedback. Reply STOP to opt out.',
  'post_service_followup',
  ARRAY['first_name','business_name'],
  TRUE
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM messaging_templates mt
  WHERE mt.tenant_id = t.id AND mt.category = 'post_service_followup' AND mt.is_system = TRUE
);

INSERT INTO messaging_templates (tenant_id, name, body, category, variables, is_system)
SELECT
  t.id,
  'Review Request',
  'Hi {{first_name}}, glad you chose {{business_name}}! If you have 30 seconds, a quick review would mean the world to us: {{review_link}} Reply STOP to opt out.',
  'review_request',
  ARRAY['first_name','business_name','review_link'],
  TRUE
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM messaging_templates mt
  WHERE mt.tenant_id = t.id AND mt.category = 'review_request' AND mt.is_system = TRUE
);

INSERT INTO messaging_templates (tenant_id, name, body, category, variables, is_system)
SELECT
  t.id,
  'We Miss You',
  'Hey {{first_name}}, it''s been a while! {{business_name}} has a special offer for returning customers. Interested? Reply STOP to opt out.',
  're_engagement',
  ARRAY['first_name','business_name'],
  TRUE
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM messaging_templates mt
  WHERE mt.tenant_id = t.id AND mt.category = 're_engagement' AND mt.is_system = TRUE
);

INSERT INTO messaging_templates (tenant_id, name, body, category, variables, is_system)
SELECT
  t.id,
  'Promotion',
  'Hey {{first_name}}! {{business_name}} is running a special this month. Reply for details or give us a call! Reply STOP to opt out.',
  'promotion',
  ARRAY['first_name','business_name'],
  TRUE
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM messaging_templates mt
  WHERE mt.tenant_id = t.id AND mt.category = 'promotion' AND mt.is_system = TRUE
);

-- ═══════════════════════════════════════════════════════════════
-- 6. Seed default automations (all OFF by default, business owner toggles ON)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO messaging_automations (tenant_id, trigger_type, enabled, delay_minutes, settings_json)
SELECT t.id, 'booking_confirmed', FALSE, 0, '{"description":"Send confirmation when a booking is created"}'::jsonb
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM messaging_automations ma WHERE ma.tenant_id = t.id AND ma.trigger_type = 'booking_confirmed');

INSERT INTO messaging_automations (tenant_id, trigger_type, enabled, delay_minutes, settings_json)
SELECT t.id, 'appointment_reminder', FALSE, 0, '{"description":"Send reminder before appointment","hours_before":24}'::jsonb
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM messaging_automations ma WHERE ma.tenant_id = t.id AND ma.trigger_type = 'appointment_reminder');

INSERT INTO messaging_automations (tenant_id, trigger_type, enabled, delay_minutes, settings_json)
SELECT t.id, 'service_completed', FALSE, 120, '{"description":"Follow up after service is completed"}'::jsonb
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM messaging_automations ma WHERE ma.tenant_id = t.id AND ma.trigger_type = 'service_completed');

INSERT INTO messaging_automations (tenant_id, trigger_type, enabled, delay_minutes, settings_json)
SELECT t.id, 'review_request', FALSE, 240, '{"description":"Request a review after follow-up","delay_after_followup_minutes":120}'::jsonb
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM messaging_automations ma WHERE ma.tenant_id = t.id AND ma.trigger_type = 'review_request');

INSERT INTO messaging_automations (tenant_id, trigger_type, enabled, delay_minutes, settings_json)
SELECT t.id, 're_engagement', FALSE, 0, '{"description":"Re-engage customers who haven''t visited recently","days_since_last_visit":60}'::jsonb
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM messaging_automations ma WHERE ma.tenant_id = t.id AND ma.trigger_type = 're_engagement');
