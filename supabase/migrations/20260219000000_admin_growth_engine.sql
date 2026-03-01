-- ============================================================
-- Admin Growth Engine — 9 new tables
-- Autonomous outreach, ad generation, social content, activity log
-- ============================================================

-- 1. admin_growth_settings — global autopilot config
create table if not exists admin_growth_settings (
  id uuid primary key default gen_random_uuid(),
  -- Discovery
  auto_discovery_enabled boolean not null default false,
  discovery_industries text[] not null default '{}',
  discovery_locations text[] not null default '{}',
  discovery_frequency_hours int not null default 24,
  discovery_max_per_run int not null default 50,
  -- Outreach
  auto_outreach_enabled boolean not null default false,
  outreach_from_email text not null default 'hello@closeloop.ai',
  outreach_from_name text not null default 'CloseLoop',
  outreach_daily_email_limit int not null default 50,
  outreach_daily_sms_limit int not null default 20,
  outreach_quiet_hours_start text not null default '21:00',
  outreach_quiet_hours_end text not null default '08:00',
  outreach_quiet_days text[] not null default '{sunday}',
  -- Social
  auto_social_enabled boolean not null default false,
  social_platforms text[] not null default '{linkedin,twitter}',
  social_posts_per_week int not null default 5,
  social_tone text not null default 'professional',
  social_auto_post boolean not null default false,
  -- Ads
  auto_ads_enabled boolean not null default false,
  ads_platforms text[] not null default '{google,meta}',
  ads_weekly_budget_hint numeric(10,2),
  -- Notifications
  notification_email text,
  notify_on_response boolean not null default true,
  notify_on_conversion boolean not null default true,
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_growth_settings enable row level security;
DROP POLICY IF EXISTS "super_admin_growth_settings" ON admin_growth_settings;
CREATE POLICY "super_admin_growth_settings"
  ON admin_growth_settings
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

-- 2. admin_outreach_sequences — multi-step outreach templates
create table if not exists admin_outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  target_type text not null default 'business', -- 'business' | 'reseller'
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_outreach_sequences enable row level security;
DROP POLICY IF EXISTS "super_admin_outreach_sequences" ON admin_outreach_sequences;
CREATE POLICY "super_admin_outreach_sequences"
  ON admin_outreach_sequences
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

-- 3. admin_outreach_sequence_steps — individual steps in a sequence
create table if not exists admin_outreach_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references admin_outreach_sequences(id) on delete cascade,
  step_order int not null,
  step_type text not null, -- 'email' | 'sms' | 'wait' | 'condition'
  delay_hours int not null default 0,
  subject text, -- email subject line
  message_template text, -- message body with {{tokens}}
  use_ai_personalization boolean not null default false,
  skip_if_responded boolean not null default true,
  created_at timestamptz not null default now(),
  unique(sequence_id, step_order)
);

alter table admin_outreach_sequence_steps enable row level security;
DROP POLICY IF EXISTS "super_admin_outreach_steps" ON admin_outreach_sequence_steps;
CREATE POLICY "super_admin_outreach_steps"
  ON admin_outreach_sequence_steps
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

-- 4. admin_outreach_campaigns — campaign linking sequence to target audience
create table if not exists admin_outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sequence_id uuid not null references admin_outreach_sequences(id),
  status text not null default 'active', -- 'active' | 'paused' | 'completed'
  target_type text not null default 'business', -- 'business' | 'reseller'
  filters jsonb not null default '{}', -- industry, location, temperature filters
  total_enrolled int not null default 0,
  total_responded int not null default 0,
  total_converted int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_outreach_campaigns enable row level security;
DROP POLICY IF EXISTS "super_admin_outreach_campaigns" ON admin_outreach_campaigns;
CREATE POLICY "super_admin_outreach_campaigns"
  ON admin_outreach_campaigns
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

-- 5. admin_outreach_enrollments — individual lead in a campaign
create table if not exists admin_outreach_enrollments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references admin_outreach_campaigns(id) on delete cascade,
  lead_type text not null default 'business', -- 'business' | 'reseller'
  lead_id uuid not null, -- references admin_saved_leads or admin_reseller_leads
  lead_name text not null,
  lead_email text,
  lead_phone text,
  status text not null default 'active', -- 'active' | 'paused' | 'completed' | 'responded' | 'converted' | 'unsubscribed'
  current_step int not null default 0,
  next_action_at timestamptz,
  last_action_at timestamptz,
  response_text text,
  response_sentiment text, -- 'positive' | 'neutral' | 'negative'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(campaign_id, lead_id)
);

alter table admin_outreach_enrollments enable row level security;
DROP POLICY IF EXISTS "super_admin_outreach_enrollments" ON admin_outreach_enrollments;
CREATE POLICY "super_admin_outreach_enrollments"
  ON admin_outreach_enrollments
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

CREATE INDEX IF NOT EXISTS idx_enrollments_next_action on admin_outreach_enrollments(status, next_action_at)
  where status = 'active';
CREATE INDEX IF NOT EXISTS idx_enrollments_campaign on admin_outreach_enrollments(campaign_id);

-- 6. admin_outreach_actions — log of every email/SMS sent
create table if not exists admin_outreach_actions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references admin_outreach_enrollments(id) on delete cascade,
  campaign_id uuid not null references admin_outreach_campaigns(id),
  step_order int not null,
  action_type text not null, -- 'email' | 'sms'
  message_sent text,
  subject_sent text,
  delivery_status text not null default 'pending', -- 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  delivery_error text,
  external_message_id text,
  executed_at timestamptz not null default now()
);

alter table admin_outreach_actions enable row level security;
DROP POLICY IF EXISTS "super_admin_outreach_actions" ON admin_outreach_actions;
CREATE POLICY "super_admin_outreach_actions"
  ON admin_outreach_actions
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

CREATE INDEX IF NOT EXISTS idx_outreach_actions_enrollment on admin_outreach_actions(enrollment_id);

-- 7. admin_ad_campaigns — generated ad copy/targeting
create table if not exists admin_ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null, -- 'google' | 'meta' | 'linkedin'
  industry text,
  location text,
  objective text,
  status text not null default 'draft', -- 'draft' | 'active' | 'completed'
  headlines jsonb not null default '[]',
  descriptions jsonb not null default '[]',
  keywords jsonb not null default '[]',
  targeting jsonb not null default '{}',
  cta text,
  performance_metrics jsonb not null default '{}', -- manually entered click/impression/conversion data
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_ad_campaigns enable row level security;
DROP POLICY IF EXISTS "super_admin_ad_campaigns" ON admin_ad_campaigns;
CREATE POLICY "super_admin_ad_campaigns"
  ON admin_ad_campaigns
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

-- 8. admin_social_posts — generated social content with scheduling
create table if not exists admin_social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null, -- 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'tiktok'
  content text not null,
  hashtags text[] not null default '{}',
  media_url text,
  scheduled_for timestamptz not null,
  status text not null default 'draft', -- 'draft' | 'scheduled' | 'posted' | 'failed'
  external_post_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_social_posts enable row level security;
DROP POLICY IF EXISTS "super_admin_social_posts" ON admin_social_posts;
CREATE POLICY "super_admin_social_posts"
  ON admin_social_posts
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled on admin_social_posts(status, scheduled_for)
  where status = 'scheduled';

-- 9. admin_growth_activity_log — unified activity stream
create table if not exists admin_growth_activity_log (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null, -- 'discovery' | 'outreach_sent' | 'outreach_response' | 'social_posted' | 'ad_created' | 'enrollment' | 'conversion'
  title text not null,
  description text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table admin_growth_activity_log enable row level security;
DROP POLICY IF EXISTS "super_admin_growth_activity_log" ON admin_growth_activity_log;
CREATE POLICY "super_admin_growth_activity_log"
  ON admin_growth_activity_log
  for all using (
    exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin')
  );

CREATE INDEX IF NOT EXISTS idx_growth_activity_log_created on admin_growth_activity_log(created_at desc);

-- ============================================================
-- Seed default outreach sequences
-- ============================================================

-- Cold Business 5-Step
insert into admin_outreach_sequences (id, name, description, target_type, is_default)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Cold Business 5-Step',
  'Full cold outreach sequence for business leads: 3 emails + 2 SMS over 3 weeks',
  'business',
  true
);

insert into admin_outreach_sequence_steps (sequence_id, step_order, step_type, delay_hours, subject, message_template, use_ai_personalization) values
('a0000000-0000-0000-0000-000000000001', 1, 'email', 0,
 'We noticed {{business_name}} might be missing calls',
 E'Hi there,\n\nI came across {{business_name}} and noticed something — {{reason_snippet}}.\n\nCloseLoop is an AI phone receptionist that answers every call 24/7, books appointments, and captures leads your team might be missing.\n\nWould it be worth a quick look? Here''s a 2-minute demo: {{demo_link}}\n\nBest,\n{{from_name}}',
 true),
('a0000000-0000-0000-0000-000000000001', 2, 'wait', 72, null, null, false),
('a0000000-0000-0000-0000-000000000001', 3, 'sms', 0, null,
 'Hi, this is {{from_name}} from CloseLoop. Sent you an email about how {{business_name}} could capture more calls with AI. Worth 2 min?',
 false),
('a0000000-0000-0000-0000-000000000001', 4, 'wait', 96, null, null, false),
('a0000000-0000-0000-0000-000000000001', 5, 'email', 0,
 'Quick follow-up — {{business_name}}',
 E'Hi again,\n\nJust checking in — {{reason_snippet}}.\n\nHere''s a quick demo showing how CloseLoop works for businesses like yours: {{demo_link}}\n\nHappy to answer any questions.\n\n{{from_name}}',
 true),
('a0000000-0000-0000-0000-000000000001', 6, 'wait', 120, null, null, false),
('a0000000-0000-0000-0000-000000000001', 7, 'sms', 0, null,
 'Last note — {{business_name}} could answer 100% of calls 24/7. Free trial at {{trial_link}}. No pressure!',
 false),
('a0000000-0000-0000-0000-000000000001', 8, 'wait', 168, null, null, false),
('a0000000-0000-0000-0000-000000000001', 9, 'email', 0,
 'Closing the loop on this',
 E'Hi,\n\nClosing the loop on this (pun intended). If the timing isn''t right, no worries at all.\n\nWe''re here whenever you''re ready to stop missing calls. Just reply to this email or check out {{demo_link}}.\n\nAll the best,\n{{from_name}}',
 false);

-- Cold Reseller 4-Step
insert into admin_outreach_sequences (id, name, description, target_type, is_default)
values (
  'a0000000-0000-0000-0000-000000000002',
  'Cold Reseller 4-Step',
  'Partnership outreach for agencies and resellers: 3 emails + 1 SMS over 2 weeks',
  'reseller',
  true
);

insert into admin_outreach_sequence_steps (sequence_id, step_order, step_type, delay_hours, subject, message_template, use_ai_personalization) values
('a0000000-0000-0000-0000-000000000002', 1, 'email', 0,
 'Partnership opportunity — AI receptionist for your clients',
 E'Hi,\n\nYour clients at {{business_name}} could benefit from an AI phone receptionist that answers calls 24/7, books appointments, and captures leads.\n\nCloseLoop offers a white-label reseller program with recurring commissions. Your clients get better phone coverage, you get a new revenue stream.\n\nWorth a quick conversation?\n\n{{from_name}}',
 true),
('a0000000-0000-0000-0000-000000000002', 2, 'wait', 72, null, null, false),
('a0000000-0000-0000-0000-000000000002', 3, 'email', 0,
 'Re: Partnership opportunity — commission details',
 E'Hi,\n\nFollowing up on the CloseLoop reseller opportunity. Quick highlights:\n\n- Recurring monthly commissions per client\n- White-label options available\n- Full onboarding support for your clients\n- Clients see improved call handling and lead capture\n\nWe''re seeing agencies add $2-5K/month in recurring revenue. Would love to show you how.\n\n{{from_name}}',
 true),
('a0000000-0000-0000-0000-000000000002', 4, 'wait', 120, null, null, false),
('a0000000-0000-0000-0000-000000000002', 5, 'sms', 0, null,
 'Quick follow-up on the CloseLoop partnership opportunity. Agencies earn recurring revenue per client. 5 min call? Reply YES and I''ll send a calendar link.',
 false),
('a0000000-0000-0000-0000-000000000002', 6, 'wait', 168, null, null, false),
('a0000000-0000-0000-0000-000000000002', 7, 'email', 0,
 'Last note — CloseLoop partner program',
 E'Hi,\n\nLast follow-up on this. We''d love to have {{business_name}} as a CloseLoop partner.\n\nHere''s a case study showing how one agency added $4K/month: {{demo_link}}\n\nIf the timing isn''t right, no worries. We''re here when you''re ready.\n\n{{from_name}}',
 false);

-- Quick Follow-Up 2-Step
insert into admin_outreach_sequences (id, name, description, target_type, is_default)
values (
  'a0000000-0000-0000-0000-000000000003',
  'Quick Follow-Up 2-Step',
  'Fast follow-up for warm leads: 1 SMS + 1 email',
  'business',
  true
);

insert into admin_outreach_sequence_steps (sequence_id, step_order, step_type, delay_hours, subject, message_template, use_ai_personalization) values
('a0000000-0000-0000-0000-000000000003', 1, 'sms', 0, null,
 'Hi! This is {{from_name}} from CloseLoop. We help businesses like {{business_name}} answer every call with AI. Interested in a quick demo?',
 false),
('a0000000-0000-0000-0000-000000000003', 2, 'wait', 72, null, null, false),
('a0000000-0000-0000-0000-000000000003', 3, 'email', 0,
 'Quick demo — AI phone answering for {{business_name}}',
 E'Hi,\n\nFollowing up on my text — CloseLoop is an AI receptionist that answers calls 24/7 for businesses like {{business_name}}.\n\nHere''s a 2-minute demo: {{demo_link}}\n\nWould love to chat if you have questions.\n\n{{from_name}}',
 true);

-- Seed a default campaign for business leads
insert into admin_outreach_campaigns (id, name, sequence_id, target_type, filters)
values (
  'b0000000-0000-0000-0000-000000000001',
  'Default Business Outreach',
  'a0000000-0000-0000-0000-000000000001',
  'business',
  '{"temperature": ["hot", "warm"]}'::jsonb
);

-- Seed a default campaign for reseller leads
insert into admin_outreach_campaigns (id, name, sequence_id, target_type, filters)
values (
  'b0000000-0000-0000-0000-000000000002',
  'Default Reseller Outreach',
  'a0000000-0000-0000-0000-000000000002',
  'reseller',
  '{"temperature": ["hot", "warm"]}'::jsonb
);

-- Insert default growth settings (single row)
insert into admin_growth_settings (id)
values ('c0000000-0000-0000-0000-000000000001');
