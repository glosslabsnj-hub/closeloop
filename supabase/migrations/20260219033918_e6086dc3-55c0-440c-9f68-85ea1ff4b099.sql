
-- ============================================================
-- 1. admin_growth_settings (singleton config)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_growth_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auto_discovery_enabled BOOLEAN NOT NULL DEFAULT false,
  discovery_industries TEXT[] NOT NULL DEFAULT '{}',
  discovery_locations TEXT[] NOT NULL DEFAULT '{}',
  discovery_frequency_hours INT NOT NULL DEFAULT 24,
  discovery_max_per_run INT NOT NULL DEFAULT 50,
  auto_outreach_enabled BOOLEAN NOT NULL DEFAULT false,
  outreach_from_email TEXT NOT NULL DEFAULT '',
  outreach_from_name TEXT NOT NULL DEFAULT '',
  outreach_daily_email_limit INT NOT NULL DEFAULT 50,
  outreach_daily_sms_limit INT NOT NULL DEFAULT 20,
  outreach_quiet_hours_start TEXT NOT NULL DEFAULT '20:00',
  outreach_quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
  outreach_quiet_days TEXT[] NOT NULL DEFAULT '{"sunday"}',
  auto_social_enabled BOOLEAN NOT NULL DEFAULT false,
  social_platforms TEXT[] NOT NULL DEFAULT '{}',
  social_posts_per_week INT NOT NULL DEFAULT 5,
  social_tone TEXT NOT NULL DEFAULT 'professional',
  social_auto_post BOOLEAN NOT NULL DEFAULT false,
  auto_ads_enabled BOOLEAN NOT NULL DEFAULT false,
  ads_platforms TEXT[] NOT NULL DEFAULT '{}',
  ads_weekly_budget_hint NUMERIC DEFAULT NULL,
  notification_email TEXT DEFAULT NULL,
  notify_on_response BOOLEAN NOT NULL DEFAULT true,
  notify_on_conversion BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_growth_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage growth settings" ON public.admin_growth_settings;
CREATE POLICY "Super admins can manage growth settings"
  ON public.admin_growth_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- 2. admin_social_posts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  media_url TEXT DEFAULT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft',
  external_post_id TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage social posts" ON public.admin_social_posts;
CREATE POLICY "Super admins can manage social posts"
  ON public.admin_social_posts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- 3. admin_growth_activity_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_growth_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_growth_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view activity log" ON public.admin_growth_activity_log;
CREATE POLICY "Super admins can view activity log"
  ON public.admin_growth_activity_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "Super admins can insert activity log" ON public.admin_growth_activity_log;
CREATE POLICY "Super admins can insert activity log"
  ON public.admin_growth_activity_log FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- 4. admin_outreach_sequences
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_outreach_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  target_type TEXT NOT NULL DEFAULT 'business',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_outreach_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage outreach sequences" ON public.admin_outreach_sequences;
CREATE POLICY "Super admins can manage outreach sequences"
  ON public.admin_outreach_sequences FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- 5. admin_outreach_sequence_steps
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_outreach_sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.admin_outreach_sequences(id) ON DELETE CASCADE,
  step_order INT NOT NULL DEFAULT 1,
  step_type TEXT NOT NULL DEFAULT 'email',
  delay_hours INT NOT NULL DEFAULT 24,
  subject TEXT DEFAULT NULL,
  message_template TEXT DEFAULT NULL,
  use_ai_personalization BOOLEAN NOT NULL DEFAULT true,
  skip_if_responded BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_outreach_sequence_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage sequence steps" ON public.admin_outreach_sequence_steps;
CREATE POLICY "Super admins can manage sequence steps"
  ON public.admin_outreach_sequence_steps FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- 6. admin_outreach_campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_outreach_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sequence_id UUID NOT NULL REFERENCES public.admin_outreach_sequences(id),
  status TEXT NOT NULL DEFAULT 'active',
  target_type TEXT NOT NULL DEFAULT 'business',
  filters JSONB NOT NULL DEFAULT '{}',
  total_enrolled INT NOT NULL DEFAULT 0,
  total_responded INT NOT NULL DEFAULT 0,
  total_converted INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_outreach_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage outreach campaigns" ON public.admin_outreach_campaigns;
CREATE POLICY "Super admins can manage outreach campaigns"
  ON public.admin_outreach_campaigns FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- 7. admin_outreach_enrollments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_outreach_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.admin_outreach_campaigns(id) ON DELETE CASCADE,
  lead_type TEXT NOT NULL DEFAULT 'business',
  lead_id UUID NOT NULL,
  lead_name TEXT NOT NULL,
  lead_email TEXT DEFAULT NULL,
  lead_phone TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_step INT NOT NULL DEFAULT 0,
  next_action_at TIMESTAMPTZ DEFAULT NULL,
  last_action_at TIMESTAMPTZ DEFAULT NULL,
  response_text TEXT DEFAULT NULL,
  response_sentiment TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_outreach_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage outreach enrollments" ON public.admin_outreach_enrollments;
CREATE POLICY "Super admins can manage outreach enrollments"
  ON public.admin_outreach_enrollments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- 8. admin_outreach_actions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_outreach_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.admin_outreach_enrollments(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.admin_outreach_campaigns(id) ON DELETE CASCADE,
  step_order INT NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL DEFAULT 'email',
  message_sent TEXT DEFAULT NULL,
  subject_sent TEXT DEFAULT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  delivery_error TEXT DEFAULT NULL,
  external_message_id TEXT DEFAULT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_outreach_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage outreach actions" ON public.admin_outreach_actions;
CREATE POLICY "Super admins can manage outreach actions"
  ON public.admin_outreach_actions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- 9. ad campaigns table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_ad_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'google',
  industry TEXT DEFAULT NULL,
  location TEXT DEFAULT NULL,
  objective TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  headlines TEXT[] NOT NULL DEFAULT '{}',
  descriptions TEXT[] NOT NULL DEFAULT '{}',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  targeting JSONB NOT NULL DEFAULT '{}',
  cta TEXT DEFAULT NULL,
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage ad campaigns" ON public.admin_ad_campaigns;
CREATE POLICY "Super admins can manage ad campaigns"
  ON public.admin_ad_campaigns FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- ============================================================
-- Updated_at triggers for mutable tables
-- ============================================================
DROP TRIGGER IF EXISTS update_admin_growth_settings_updated_at ON public.admin_growth_settings;
CREATE TRIGGER update_admin_growth_settings_updated_at
  BEFORE UPDATE ON public.admin_growth_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_social_posts_updated_at ON public.admin_social_posts;
CREATE TRIGGER update_admin_social_posts_updated_at
  BEFORE UPDATE ON public.admin_social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_outreach_sequences_updated_at ON public.admin_outreach_sequences;
CREATE TRIGGER update_admin_outreach_sequences_updated_at
  BEFORE UPDATE ON public.admin_outreach_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_outreach_campaigns_updated_at ON public.admin_outreach_campaigns;
CREATE TRIGGER update_admin_outreach_campaigns_updated_at
  BEFORE UPDATE ON public.admin_outreach_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_outreach_enrollments_updated_at ON public.admin_outreach_enrollments;
CREATE TRIGGER update_admin_outreach_enrollments_updated_at
  BEFORE UPDATE ON public.admin_outreach_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_ad_campaigns_updated_at ON public.admin_ad_campaigns;
CREATE TRIGGER update_admin_ad_campaigns_updated_at
  BEFORE UPDATE ON public.admin_ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
